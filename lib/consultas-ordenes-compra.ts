import {
  formatFechaExcel,
  getCantidadesEntregaArticulo,
  getFechasEntregaEventos,
} from "@/lib/ordenes-compra-entregas";
import { ordenEnRangoFechas } from "@/lib/indicadores-compras";

export type ArticuloOrdenConsultaOc = {
  articulo_id?: string | null;
  articulo_nombre?: string | null;
  cantidad?: number | null;
};

export type OrdenCompraConsultaOc = {
  id?: number | string | null;
  noc?: string | number | null;
  estado?: string | null;
  proveedor?: string | null;
  fecha?: string | null;
  fecha_prometida?: string | null;
  fecha_entrega?: string | null;
  articulos?: ArticuloOrdenConsultaOc[] | null;
  entregas?: unknown;
};

export type ConsultaOrdenCompraFila = {
  key: string;
  ordenId: string;
  noc: string;
  estado: string;
  proveedor: string;
  fechaCreacion: string;
  fechaCreacionRaw: string;
  fechaPrometida: string;
  fechaEntrega: string;
  articulo: string;
  cantidad: number;
  cantidadEntregada: number;
  cantidadPendiente: number;
};

function fechaCreacionRaw(orden: OrdenCompraConsultaOc): string {
  const fecha = String(orden.fecha ?? "").trim();
  if (fecha) return fecha.slice(0, 10);
  return "sin-fecha";
}

function formatFechaCreacion(orden: OrdenCompraConsultaOc): string {
  if (orden.fecha) return formatFechaExcel(orden.fecha) || "—";
  return "—";
}

function formatFechaEntrega(orden: OrdenCompraConsultaOc): string {
  const principal = formatFechaExcel(orden.fecha_entrega);
  if (principal) return principal;

  const eventos = getFechasEntregaEventos(orden.entregas)
    .map(formatFechaExcel)
    .filter(Boolean);
  return eventos.length > 0 ? eventos.join(", ") : "—";
}

export function filtrarOrdenesConsultaOcPorFecha(
  ordenes: OrdenCompraConsultaOc[],
  fechaDesde: string,
  fechaHasta: string
): OrdenCompraConsultaOc[] {
  if (!fechaDesde && !fechaHasta) return ordenes;
  return ordenes.filter((orden) =>
    ordenEnRangoFechas(orden.fecha, fechaDesde, fechaHasta)
  );
}

/** Una fila por artículo de cada orden de compra. */
export function aplanarConsultaOrdenesCompra(
  ordenes: OrdenCompraConsultaOc[]
): ConsultaOrdenCompraFila[] {
  const rows: ConsultaOrdenCompraFila[] = [];

  for (const orden of ordenes) {
    const ordenId = String(orden.id ?? "").trim();
    const noc = String(orden.noc ?? "").trim();
    const estado = String(orden.estado ?? "").trim();
    const proveedor = String(orden.proveedor ?? "").trim();
    const fechaCreacion = formatFechaCreacion(orden);
    const fechaRaw = fechaCreacionRaw(orden);
    const fechaPrometida = formatFechaExcel(orden.fecha_prometida) || "—";
    const fechaEntrega = formatFechaEntrega(orden);
    const articulos = Array.isArray(orden.articulos) ? orden.articulos : [];

    if (articulos.length === 0) {
      rows.push({
        key: `${ordenId || noc || "sin-oc"}|sin-articulo`,
        ordenId,
        noc,
        estado,
        proveedor,
        fechaCreacion,
        fechaCreacionRaw: fechaRaw,
        fechaPrometida,
        fechaEntrega,
        articulo: "—",
        cantidad: 0,
        cantidadEntregada: 0,
        cantidadPendiente: 0,
      });
      continue;
    }

    articulos.forEach((item, index) => {
      const cantidad = Number(item.cantidad) || 0;
      const { entregadas, pendientes } = getCantidadesEntregaArticulo(
        orden.entregas,
        String(item.articulo_id ?? "").trim(),
        index,
        cantidad
      );

      rows.push({
        key: `${ordenId || noc || "sin-oc"}|${index}|${item.articulo_id ?? item.articulo_nombre ?? index}`,
        ordenId,
        noc,
        estado,
        proveedor,
        fechaCreacion,
        fechaCreacionRaw: fechaRaw,
        fechaPrometida,
        fechaEntrega,
        articulo: String(item.articulo_nombre ?? "").trim() || "Sin nombre",
        cantidad,
        cantidadEntregada: entregadas,
        cantidadPendiente: pendientes,
      });
    });
  }

  return rows.sort((a, b) => {
    const byFecha = b.fechaCreacionRaw.localeCompare(a.fechaCreacionRaw);
    if (byFecha !== 0) return byFecha;
    const byNoc = b.noc.localeCompare(a.noc, undefined, { numeric: true });
    if (byNoc !== 0) return byNoc;
    return a.articulo.localeCompare(b.articulo, "es", { sensitivity: "base" });
  });
}
