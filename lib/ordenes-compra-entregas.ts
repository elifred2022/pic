/** Helpers de entregas en órdenes de compra (formato eventos + legacy). */

import { coerceRtArray } from "@/lib/fact-compras-storage";

/** Normaliza articulo_id para comparar (evita fallos por espacios en el nombre embebido). */
export function normalizeArticuloId(value: unknown): string {
  return String(value ?? "").trim();
}

type EntregaItemCantidad = {
  articulo_id: string;
  cantidad_entregada: number;
};

type EntregaRegistro = {
  fc: number | null;
  rt: number | null;
  fecha_entrega: string | null;
  fact_path: string;
  items: EntregaItemCantidad[];
  anulado?: boolean;
};

function isEntregaRegistro(value: unknown): value is EntregaRegistro {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const record = value as Record<string, unknown>;
  return (
    Array.isArray(record.items) ||
    ("fact_path" in record && !("entregadas" in record))
  );
}

function parseEntregaRegistro(value: unknown): EntregaRegistro | null {
  if (!isEntregaRegistro(value)) return null;
  const record = value as Record<string, unknown>;
  const itemsRaw = Array.isArray(record.items) ? record.items : [];
  const items: EntregaItemCantidad[] = itemsRaw
    .map((item) => {
      if (!item || typeof item !== "object" || Array.isArray(item)) return null;
      const row = item as Record<string, unknown>;
      const articuloId = normalizeArticuloId(row.articulo_id);
      const cant = Number(row.cantidad_entregada ?? row.entregadas ?? 0);
      if (!articuloId || !Number.isFinite(cant) || cant <= 0) return null;
      return { articulo_id: articuloId, cantidad_entregada: cant };
    })
    .filter((item): item is EntregaItemCantidad => item !== null);

  const fechaRaw = record.fecha_entrega;
  const toEntero = (value: unknown): number | null => {
    if (value === null || value === undefined || value === "") return null;
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  };
  return {
    fc: toEntero(record.fc),
    rt: toEntero(record.rt),
    fecha_entrega:
      typeof fechaRaw === "string" && fechaRaw.trim() ? fechaRaw.trim() : null,
    fact_path: typeof record.fact_path === "string" ? record.fact_path : "",
    items,
    anulado: record.anulado === true,
  };
}

function parseEntregaLegacy(value: unknown): {
  entregadas: number | null;
  pendientes: number | null;
} {
  if (value === null || value === undefined) {
    return { entregadas: null, pendientes: null };
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return { entregadas: value, pendientes: null };
  }
  if (typeof value === "object" && !Array.isArray(value)) {
    const record = value as Record<string, unknown>;
    const toNum = (v: unknown): number | null => {
      if (v === null || v === undefined || v === "") return null;
      const n = typeof v === "number" ? v : Number(v);
      return Number.isFinite(n) ? n : null;
    };
    return {
      entregadas: toNum(
        record.entregadas ??
          record.cantidad_entregada ??
          record.cantidad_entregadas ??
          record.entregado
      ),
      pendientes: toNum(
        record.pendientes ??
          record.cantidad_pendiente ??
          record.cantidad_pendientes ??
          record.pendiente
      ),
    };
  }
  return { entregadas: null, pendientes: null };
}

function getEntregadasAgregadas(
  entregas: unknown,
  articuloId: string,
  index: number
): number {
  if (!Array.isArray(entregas) || entregas.length === 0) return 0;

  if (isEntregaRegistro(entregas[0])) {
    const idNorm = normalizeArticuloId(articuloId);
    let sum = 0;
    for (const raw of entregas) {
      const reg = parseEntregaRegistro(raw);
      if (!reg || reg.anulado) continue;
      let matched = false;
      for (const item of reg.items) {
        if (normalizeArticuloId(item.articulo_id) === idNorm) {
          sum += item.cantidad_entregada;
          matched = true;
        }
      }
      if (!matched && !idNorm && reg.items[index]) {
        sum += reg.items[index].cantidad_entregada;
      }
    }
    return sum;
  }

  return parseEntregaLegacy(entregas[index]).entregadas ?? 0;
}

export function getCantidadesEntregaArticulo(
  entregas: unknown,
  articuloId: string,
  index: number,
  cantidadOrden: number
): { entregadas: number; pendientes: number } {
  const cantidad = Number(cantidadOrden) || 0;
  const esFormatoEventos =
    Array.isArray(entregas) &&
    entregas.length > 0 &&
    isEntregaRegistro(entregas[0]);

  if (esFormatoEventos || !Array.isArray(entregas) || entregas.length === 0) {
    const entregadas = getEntregadasAgregadas(entregas, articuloId, index);
    return {
      entregadas,
      pendientes: Math.max(0, cantidad - entregadas),
    };
  }

  const legacy = parseEntregaLegacy(entregas[index]);
  const entregadas = legacy.entregadas ?? 0;
  return {
    entregadas,
    pendientes:
      legacy.pendientes !== null
        ? legacy.pendientes
        : Math.max(0, cantidad - entregadas),
  };
}

function mergeRemitosUnicos(...lists: number[][]): number[] {
  const seen = new Set<number>();
  const out: number[] = [];
  for (const list of lists) {
    for (const n of list) {
      if (!seen.has(n)) {
        seen.add(n);
        out.push(n);
      }
    }
  }
  return out;
}

/** Remitos de recepción (rt) de entregas que incluyen el artículo. */
export function getRemitosRecepcionArticulo(
  entregas: unknown,
  articuloId: string,
  index: number,
  ordenRt?: unknown
): number[] {
  const fromEntregas: number[] = [];

  if (Array.isArray(entregas) && entregas.length > 0 && isEntregaRegistro(entregas[0])) {
    const idNorm = normalizeArticuloId(articuloId);
    const seen = new Set<number>();
    for (const raw of entregas) {
      const reg = parseEntregaRegistro(raw);
      if (!reg || reg.anulado || reg.rt === null) continue;
      let matched = false;
      for (const item of reg.items) {
        if (normalizeArticuloId(item.articulo_id) === idNorm) {
          matched = true;
          break;
        }
      }
      if (!matched && !idNorm && reg.items[index]) {
        matched = true;
      }
      if (!matched || seen.has(reg.rt)) continue;
      seen.add(reg.rt);
      fromEntregas.push(reg.rt);
    }
  }

  if (fromEntregas.length > 0) return fromEntregas;
  return coerceRtArray(ordenRt);
}

export function formatRemitosRecepcion(remitos: number[]): string {
  return remitos.length > 0 ? remitos.join(", ") : "";
}

export function mergeRemitosRecepcion(
  actuales: number[],
  extra: number[]
): number[] {
  return mergeRemitosUnicos(actuales, extra);
}

/** Fechas de eventos de entrega (formato nuevo), únicas y ordenadas. */
export function getFechasEntregaEventos(entregas: unknown): string[] {
  if (!Array.isArray(entregas) || entregas.length === 0) return [];
  if (!isEntregaRegistro(entregas[0])) return [];

  const fechas: string[] = [];
  const seen = new Set<string>();
  for (const raw of entregas) {
    const reg = parseEntregaRegistro(raw);
    if (!reg || reg.anulado) continue;
    const f = reg.fecha_entrega?.trim();
    if (!f || seen.has(f)) continue;
    seen.add(f);
    fechas.push(f);
  }
  return fechas;
}

export function formatFechaExcel(value?: string | null): string {
  if (!value) return "";
  const trimmed = value.trim();
  if (!trimmed) return "";
  // YYYY-MM-DD → local sin desfase UTC
  if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
    const [y, m, d] = trimmed.slice(0, 10).split("-").map(Number);
    if (y && m && d) {
      return new Date(y, m - 1, d).toLocaleDateString("es-AR");
    }
  }
  const parsed = new Date(trimmed);
  return Number.isNaN(parsed.getTime())
    ? trimmed
    : parsed.toLocaleDateString("es-AR");
}
