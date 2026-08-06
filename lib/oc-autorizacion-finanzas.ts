export const LIMITE_AUTORIZACION_FINANZAS = {
  USD: 2000,
  EUR: 2000,
  ARS: 3_500_000,
} as const;

export type DivisaAutorizacionFinanzas = keyof typeof LIMITE_AUTORIZACION_FINANZAS;

export const ESTADO_NECESITA_AUTORIZACION_FINANZAS =
  "necesita_autorizacion_de_finanzas";

export const ESTADO_AUTORIZADA_POR_FINANZAS = "autorizada_por_finanzas";

export const LABEL_ESTADO_NECESITA_AUTORIZACION_FINANZAS =
  "Necesita autorizacion de finanzas";

export const LEYENDA_AUTORIZACION_FINANZAS =
  "OC Necesita Autorizacion de finanzas";

export function normalizeDivisaAutorizacion(
  value: unknown
): DivisaAutorizacionFinanzas {
  const v = String(value ?? "").trim().toUpperCase();
  if (v === "EUR" || v.includes("EUR") || v === "€") return "EUR";
  if (v === "ARS" || v.includes("ARS") || v === "PESO" || v === "$AR") return "ARS";
  return "USD";
}

/** True cuando el total supera el umbral y aún no está autorizada por finanzas. */
export function necesitaAutorizacionFinanzas(
  total: number,
  divisa: unknown,
  estado?: string | null
): boolean {
  const estadoNorm = (estado ?? "").trim().toLowerCase();
  if (estadoNorm === ESTADO_AUTORIZADA_POR_FINANZAS) return false;
  if (estadoNorm === ESTADO_NECESITA_AUTORIZACION_FINANZAS) return true;

  const key = normalizeDivisaAutorizacion(divisa);
  return Number.isFinite(total) && total > LIMITE_AUTORIZACION_FINANZAS[key];
}

/** Estado inicial según umbral de autorización de finanzas. */
export function estadoInicialOrdenCompra(
  total: number,
  divisa: unknown
): string {
  return necesitaAutorizacionFinanzas(total, divisa)
    ? ESTADO_NECESITA_AUTORIZACION_FINANZAS
    : "pendiente";
}
