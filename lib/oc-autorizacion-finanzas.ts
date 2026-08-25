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

function normalizeEstadoAutorizacion(value: unknown): string {
  return String(value ?? "").trim().toLowerCase();
}

function historicoIncluyeEstado(
  historicoEstado: unknown,
  estadoBuscado: string
): boolean {
  if (!Array.isArray(historicoEstado)) return false;
  return historicoEstado.some((item) => {
    if (!item || typeof item !== "object") return false;
    return (
      normalizeEstadoAutorizacion((item as { estado?: unknown }).estado) ===
      estadoBuscado
    );
  });
}

/** True si Finanzas ya autorizó la OC (estado actual o histórico). */
export function fueAutorizadaPorFinanzas(
  estado?: string | null,
  historicoEstado?: unknown
): boolean {
  return (
    normalizeEstadoAutorizacion(estado) === ESTADO_AUTORIZADA_POR_FINANZAS ||
    historicoIncluyeEstado(historicoEstado, ESTADO_AUTORIZADA_POR_FINANZAS)
  );
}

/**
 * True cuando corresponde la leyenda de autorización de finanzas.
 * Si Finanzas ya autorizó, no vuelve a mostrarse aunque cambie el estado.
 * Sin estado (alta de OC) usa el umbral de importe.
 */
export function necesitaAutorizacionFinanzas(
  total: number,
  divisa: unknown,
  estado?: string | null,
  historicoEstado?: unknown
): boolean {
  if (fueAutorizadaPorFinanzas(estado, historicoEstado)) return false;

  const estadoNorm = normalizeEstadoAutorizacion(estado);
  if (estadoNorm === ESTADO_NECESITA_AUTORIZACION_FINANZAS) return true;
  if (estadoNorm) return false;

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
