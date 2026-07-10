/** Helpers de entregas en órdenes de compra (formato eventos + legacy). */

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
      const articuloId = String(row.articulo_id ?? "").trim();
      const cant = Number(row.cantidad_entregada ?? row.entregadas ?? 0);
      if (!articuloId || !Number.isFinite(cant) || cant <= 0) return null;
      return { articulo_id: articuloId, cantidad_entregada: cant };
    })
    .filter((item): item is EntregaItemCantidad => item !== null);

  const fechaRaw = record.fecha_entrega;
  return {
    fc: null,
    rt: null,
    fecha_entrega:
      typeof fechaRaw === "string" && fechaRaw.trim() ? fechaRaw.trim() : null,
    fact_path: typeof record.fact_path === "string" ? record.fact_path : "",
    items,
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
    let sum = 0;
    for (const raw of entregas) {
      const reg = parseEntregaRegistro(raw);
      if (!reg) continue;
      const byId = reg.items.find((item) => item.articulo_id === articuloId);
      if (byId) {
        sum += byId.cantidad_entregada;
      } else if (!articuloId && reg.items[index]) {
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

/** Fechas de eventos de entrega (formato nuevo), únicas y ordenadas. */
export function getFechasEntregaEventos(entregas: unknown): string[] {
  if (!Array.isArray(entregas) || entregas.length === 0) return [];
  if (!isEntregaRegistro(entregas[0])) return [];

  const fechas: string[] = [];
  const seen = new Set<string>();
  for (const raw of entregas) {
    const reg = parseEntregaRegistro(raw);
    const f = reg?.fecha_entrega?.trim();
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
