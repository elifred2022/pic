import { getCantidadesEntregaArticulo, formatFechaExcel } from "@/lib/ordenes-compra-entregas";
import {
  extractPicDisplayNumber,
  parsePicFromArticuloId,
} from "@/lib/pic-links";
import {
  convertirImporteAArs,
  inferirDivisaOrden,
  normalizarDivisaExplicita,
  ordenEnRangoFechas,
  type DivisaIndicador,
  type FiltroDivisaIndicador,
  type TiposCambioIndicador,
} from "@/lib/indicadores-compras";

export type ArticuloOrdenConsulta = {
  articulo_id?: string | null;
  articulo_nombre?: string | null;
  articulo_db_id?: string | null;
  codint?: string | null;
  cantidad?: number | null;
  precio_unitario?: number | null;
  descuento?: number | null;
  costunitcdesc?: number | null;
  total?: number | null;
  divisa?: string | null;
};

export type OrdenCompraConsulta = {
  id?: number | string | null;
  noc?: string | number | null;
  fecha?: string | null;
  estado?: string | null;
  total?: number | null;
  importe_competencia?: number | null;
  divisa?: string | null;
  cod_cta?: string | null;
  proveedor?: string | null;
  articulos?: ArticuloOrdenConsulta[] | null;
  entregas?: unknown;
};

export function filtrarOrdenesConsultaPorFecha(
  ordenes: OrdenCompraConsulta[],
  fechaDesde: string,
  fechaHasta: string
): OrdenCompraConsulta[] {
  if (!fechaDesde && !fechaHasta) return ordenes;
  return ordenes.filter((orden) =>
    ordenEnRangoFechas(orden.fecha, fechaDesde, fechaHasta)
  );
}

export type ArticuloCompradoResumen = {
  key: string;
  articulo: string;
  fechaOrden: string;
  fechaOrdenRaw: string;
  ordenId: string;
  noc: string;
  /** Número de PIC (pedido) asociado al ítem, si existe. */
  pic: string;
  proveedor: string;
  articuloId: string;
  codint: string;
  codCta: string;
  cantidadComprada: number;
  cantidadEntregada: number;
  cantidadPendiente: number;
  costoUnitario: number;
  total: number;
  divisa: DivisaIndicador;
};

function articuloKey(item: ArticuloOrdenConsulta): string {
  const dbId = String(item.articulo_db_id ?? "").trim();
  if (dbId) return `db:${dbId}`;

  const codint = String(item.codint ?? "").trim();
  if (codint) return `cod:${codint.toLowerCase()}`;

  const nombre = String(item.articulo_nombre ?? "").trim().toLowerCase();
  return `nombre:${nombre || "sin-nombre"}`;
}

function fechaOrdenKey(fecha?: string | null): string {
  const raw = String(fecha ?? "").trim();
  if (!raw) return "sin-fecha";
  return raw.slice(0, 10);
}

/** Misma lógica de divisa que indicadores: ítem → orden → inferencia. */
export function resolveDivisa(
  item: ArticuloOrdenConsulta,
  orden: OrdenCompraConsulta
): DivisaIndicador {
  const fromItem = normalizarDivisaExplicita(item.divisa);
  if (fromItem) return fromItem;

  return inferirDivisaOrden({
    id: Number(orden.id) || 0,
    noc: Number(orden.noc) || 0,
    fecha: String(orden.fecha ?? ""),
    estado: String(orden.estado ?? ""),
    total: orden.total ?? null,
    importe_competencia: orden.importe_competencia ?? null,
    divisa: orden.divisa,
    articulos: orden.articulos,
  });
}

export function filtrarArticulosPorDivisa(
  rows: ArticuloCompradoResumen[],
  filtroDivisa: FiltroDivisaIndicador
): ArticuloCompradoResumen[] {
  if (filtroDivisa === "todas") return rows;
  return rows.filter((row) => row.divisa === filtroDivisa);
}

function costoUnitarioLinea(item: ArticuloOrdenConsulta): number {
  const conDesc = Number(item.costunitcdesc);
  if (Number.isFinite(conDesc) && conDesc > 0) return conDesc;

  const precio = Number(item.precio_unitario) || 0;
  const descuento = Math.min(Math.max(Number(item.descuento) || 0, 0), 100);
  return precio * (1 - descuento / 100);
}

function totalLinea(item: ArticuloOrdenConsulta, cantidad: number): number {
  const total = Number(item.total);
  if (Number.isFinite(total) && total !== 0) return total;
  return costoUnitarioLinea(item) * cantidad;
}

function resolvePicDisplay(articuloId: string): string {
  const parsed = parsePicFromArticuloId(articuloId);
  if (parsed.tipo === "sin-pic") return "Sin PIC";
  if (parsed.tipo === "otro" || !parsed.pedidoId) return "—";
  return extractPicDisplayNumber(articuloId);
}

/** Agrupa ítems por artículo + fecha de orden y suma cantidades / importes. */
export function resumirArticulosComprados(
  ordenes: OrdenCompraConsulta[]
): ArticuloCompradoResumen[] {
  const map = new Map<string, ArticuloCompradoResumen>();

  for (const orden of ordenes) {
    const fechaRaw = fechaOrdenKey(orden.fecha);
    const fechaOrden = formatFechaExcel(orden.fecha) || "—";
    const noc = String(orden.noc ?? "").trim();
    const ordenId = String(orden.id ?? "").trim();
    const codCta = String(orden.cod_cta ?? "").trim();
    const proveedor = String(orden.proveedor ?? "").trim();
    const articulos = Array.isArray(orden.articulos) ? orden.articulos : [];
    articulos.forEach((item, index) => {
      const divisa = resolveDivisa(item, orden);
      const articuloId = String(item.articulo_id ?? "").trim();
      const pic = resolvePicDisplay(articuloId);
      const key = `${articuloKey(item)}|${fechaRaw}|${ordenId || noc || "sin-oc"}|${divisa}`;
      const cantidad = Number(item.cantidad) || 0;
      const { entregadas, pendientes } = getCantidadesEntregaArticulo(
        orden.entregas,
        articuloId,
        index,
        cantidad
      );
      const total = totalLinea(item, cantidad);

      const existing = map.get(key);
      if (existing) {
        existing.cantidadComprada += cantidad;
        existing.cantidadEntregada += entregadas;
        existing.cantidadPendiente += pendientes;
        existing.total += total;
        existing.costoUnitario =
          existing.cantidadComprada > 0
            ? existing.total / existing.cantidadComprada
            : 0;
        if (!existing.codint && item.codint) {
          existing.codint = String(item.codint).trim();
        }
        if (!existing.codCta && codCta) {
          existing.codCta = codCta;
        }
        if (!existing.proveedor && proveedor) {
          existing.proveedor = proveedor;
        }
        if (!existing.articuloId && articuloId) {
          existing.articuloId = articuloId;
        }
        if ((!existing.pic || existing.pic === "—") && pic !== "—") {
          existing.pic = pic;
        }
        if (
          (!existing.articulo || existing.articulo === "Sin nombre") &&
          item.articulo_nombre
        ) {
          existing.articulo = String(item.articulo_nombre).trim();
        }
        return;
      }

      map.set(key, {
        key,
        articulo: String(item.articulo_nombre ?? "").trim() || "Sin nombre",
        fechaOrden,
        fechaOrdenRaw: fechaRaw,
        ordenId,
        noc,
        pic,
        proveedor,
        articuloId,
        codint: String(item.codint ?? "").trim(),
        codCta,
        cantidadComprada: cantidad,
        cantidadEntregada: entregadas,
        cantidadPendiente: pendientes,
        costoUnitario:
          cantidad > 0 ? total / cantidad : costoUnitarioLinea(item),
        total,
        divisa,
      });
    });
  }

  return Array.from(map.values()).sort((a, b) => {
    const byFecha = b.fechaOrdenRaw.localeCompare(a.fechaOrdenRaw);
    if (byFecha !== 0) return byFecha;
    const byNoc = b.noc.localeCompare(a.noc, undefined, { numeric: true });
    if (byNoc !== 0) return byNoc;
    return a.articulo.localeCompare(b.articulo, "es", { sensitivity: "base" });
  });
}

/** Convierte costo unitario y total a ARS con el mismo criterio de indicadores. */
export function convertirArticulosCompradosAArs(
  rows: ArticuloCompradoResumen[],
  tiposCambio: TiposCambioIndicador
): ArticuloCompradoResumen[] {
  return rows.map((row) => {
    const total = convertirImporteAArs(row.total, row.divisa, tiposCambio);
    const costoUnitario = convertirImporteAArs(
      row.costoUnitario,
      row.divisa,
      tiposCambio
    );

    return {
      ...row,
      key: `${row.key}|ARS`,
      costoUnitario,
      total,
      divisa: "ARS",
    };
  });
}
