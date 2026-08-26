/** Cotización de un artículo en la comparativa de proveedores. */
export type ArticuloComparativaPrecio = {
  codint?: string | null;
  articulo?: string | null;
  precioUnitario?: number | null;
  descuentoPorcentaje?: number | null;
  subtotal?: number | null;
};

/** Proveedor que participa (o no) en la comparativa. */
export type ProveedorComparativaPrecio = {
  nombreProveedor?: string | null;
  articulos?: ArticuloComparativaPrecio[] | null;
  total?: number | null;
};

export type RangoPrecioComparativa = "bajo" | "medio" | "alto" | null;

type EstadisticaRango = {
  min: number;
  max: number;
  count: number;
};

export type ResumenRangosComparativa = {
  statsPorArticulo: Map<string, EstadisticaRango>;
  statsTotal: EstadisticaRango | null;
};

const EPS = 1e-9;

export function claveArticuloComparativa(art: ArticuloComparativaPrecio): string {
  const cod = art.codint?.trim();
  if (cod) return `cod:${cod}`;
  return `art:${(art.articulo ?? "").trim().toLowerCase()}`;
}

function valorPositivo(n: number | null | undefined): number | null {
  if (n == null || !Number.isFinite(n) || n <= 0) return null;
  return n;
}

function sonIguales(a: number, b: number): boolean {
  return Math.abs(a - b) <= EPS;
}

/** Precio unitario neto (después de descuento). */
export function precioEfectivoComparativa(
  precioUnitario: number | null | undefined,
  descuentoPorcentaje: number | null | undefined
): number | null {
  const precio = valorPositivo(precioUnitario);
  if (precio == null) return null;
  const desc = Math.min(100, Math.max(0, descuentoPorcentaje ?? 0));
  return precio * (1 - desc / 100);
}

function valorComparadoArticulo(art: ArticuloComparativaPrecio): number | null {
  const subtotal = valorPositivo(art.subtotal);
  if (subtotal != null) return subtotal;
  return precioEfectivoComparativa(art.precioUnitario, art.descuentoPorcentaje);
}

function proveedorParticipa(prov: ProveedorComparativaPrecio): boolean {
  if (prov.nombreProveedor?.trim()) return true;
  return (prov.articulos ?? []).some(
    (art) =>
      valorPositivo(art.precioUnitario) != null || valorPositivo(art.subtotal) != null
  );
}

function statsDesdeValores(valores: number[]): EstadisticaRango | null {
  if (valores.length < 2) return null;
  return {
    min: Math.min(...valores),
    max: Math.max(...valores),
    count: valores.length,
  };
}

function rangoDesdeEstadistica(
  valor: number | null | undefined,
  stats: EstadisticaRango | null | undefined
): RangoPrecioComparativa {
  const v = valorPositivo(valor);
  if (v == null || !stats) return null;
  if (sonIguales(stats.min, stats.max)) return null;
  if (sonIguales(v, stats.min)) return "bajo";
  if (sonIguales(v, stats.max)) return "alto";
  if (stats.count >= 3) return "medio";
  return null;
}

function statsPorArticulo(
  proveedores: ProveedorComparativaPrecio[] | null | undefined
): Map<string, EstadisticaRango> {
  const valores = new Map<string, number[]>();
  for (const prov of proveedores ?? []) {
    if (!proveedorParticipa(prov)) continue;
    for (const art of prov.articulos ?? []) {
      const v = valorComparadoArticulo(art);
      if (v == null) continue;
      const key = claveArticuloComparativa(art);
      const list = valores.get(key) ?? [];
      list.push(v);
      valores.set(key, list);
    }
  }

  const stats = new Map<string, EstadisticaRango>();
  for (const [key, list] of valores) {
    const s = statsDesdeValores(list);
    if (s) stats.set(key, s);
  }
  return stats;
}

export function resumenRangosPreciosComparativa(
  proveedores: ProveedorComparativaPrecio[] | null | undefined
): ResumenRangosComparativa {
  const totals: number[] = [];
  for (const prov of proveedores ?? []) {
    if (!proveedorParticipa(prov)) continue;
    const t = valorPositivo(prov.total);
    if (t != null) totals.push(t);
  }

  return {
    statsPorArticulo: statsPorArticulo(proveedores),
    statsTotal: statsDesdeValores(totals),
  };
}

export function rangoPrecioArticulo(
  art: ArticuloComparativaPrecio,
  resumen: ResumenRangosComparativa
): RangoPrecioComparativa {
  return rangoDesdeEstadistica(
    valorComparadoArticulo(art),
    resumen.statsPorArticulo.get(claveArticuloComparativa(art))
  );
}

export function rangoTotalProveedor(
  total: number | null | undefined,
  resumen: ResumenRangosComparativa
): RangoPrecioComparativa {
  return rangoDesdeEstadistica(total, resumen.statsTotal);
}

export function claseTextoRangoPrecio(rango: RangoPrecioComparativa): string {
  if (rango === "bajo") return "text-green-600 font-bold";
  if (rango === "medio") return "text-orange-500 font-bold";
  if (rango === "alto") return "text-red-600 font-bold";
  return "";
}

export function claseInputRangoPrecio(rango: RangoPrecioComparativa): string {
  if (rango === "bajo") return "border-green-500 bg-green-50 text-green-700 font-bold";
  if (rango === "medio") return "border-orange-400 bg-orange-50 text-orange-600 font-bold";
  if (rango === "alto") return "border-red-500 bg-red-50 text-red-700 font-bold";
  return "border-gray-300";
}

export function claseCajaTotalRango(
  rango: RangoPrecioComparativa,
  fallback: string
): string {
  if (rango === "bajo") return "text-green-700 bg-green-50 border-green-300";
  if (rango === "medio") return "text-orange-700 bg-orange-50 border-orange-300";
  if (rango === "alto") return "text-red-700 bg-red-50 border-red-300";
  return fallback;
}

export function claseCssImpresionPrecio(rango: RangoPrecioComparativa): string {
  if (rango === "bajo") return "precio-rango-bajo";
  if (rango === "medio") return "precio-rango-medio";
  if (rango === "alto") return "precio-rango-alto";
  return "";
}

export function claseCssImpresionTotal(rango: RangoPrecioComparativa): string {
  if (rango === "bajo") return "total-rango-bajo";
  if (rango === "medio") return "total-rango-medio";
  if (rango === "alto") return "total-rango-alto";
  return "";
}
