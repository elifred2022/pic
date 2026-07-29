export type HistoricoEstadoEntry = {
  estado: string;
  fecha: string; // YYYY-MM-DD
};

function fechaHoyLocal(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function parseHistoricoEstado(value: unknown): HistoricoEstadoEntry[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter(
      (item): item is HistoricoEstadoEntry =>
        !!item &&
        typeof item === "object" &&
        typeof (item as HistoricoEstadoEntry).estado === "string" &&
        typeof (item as HistoricoEstadoEntry).fecha === "string"
    )
    .map((item) => ({
      estado: String(item.estado),
      fecha: String(item.fecha).split("T")[0],
    }));
}

/** Appends a new estado change only when it differs from the last recorded / current estado. */
export function appendHistoricoEstado(
  historicoActual: unknown,
  estadoAnterior: string | null | undefined,
  estadoNuevo: string | null | undefined
): HistoricoEstadoEntry[] | null {
  const nuevo = (estadoNuevo ?? "").trim();
  if (!nuevo) return null;

  const anterior = (estadoAnterior ?? "").trim();
  if (nuevo === anterior) return null;

  const historico = parseHistoricoEstado(historicoActual);
  const ultimo = historico[historico.length - 1];
  if (ultimo?.estado === nuevo) return null;

  return [...historico, { estado: nuevo, fecha: fechaHoyLocal() }];
}

export function formatHistoricoFecha(fecha: string): string {
  const parts = fecha.split("T")[0].split("-");
  if (parts.length !== 3) return fecha;
  const year = Number(parts[0]);
  const month = Number(parts[1]) - 1;
  const day = Number(parts[2]);
  if (!year || Number.isNaN(month) || !day) return fecha;
  return new Date(year, month, day).toLocaleDateString("es-AR");
}
