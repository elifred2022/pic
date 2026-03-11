const ESTADOS_OBRA_STRUCTURE: Record<string, readonly string[]> = {
  CORTE: ["Marco", "Marco Adicional", "Hojas", "Guia Mosquitero"],
  MECANIZADO: ["Marco", "Marco Adicional", "Hojas", "Guia Mosquitero"],
  SOLDADURA: ["Marco", "Hojas", "Guia Mosquitero"],
  ARMADO: ["Marco", "Marco Adicional", "Hojas", "Guia Mosquitero"],
  JUNQUILLOS: ["Marco", "Hoja", "Hoja Mq"],
} as const;

type EstadoObraData = Record<string, Record<string, string>>;

type TipologiaItem = {
  nombre: string;
  estados: EstadoObraData;
  descripcion?: string | null;
  marco?: number | null;
  hojas?: number | null;
  guias?: number | null;
  hojas_mosq?: number | null;
  umbral?: number | null;
  ancho?: number | null;
  alto?: number | null;
};

type EstadoObraConTipologias = { tipologias: TipologiaItem[] };
type EstadoObraParsed = EstadoObraConTipologias & { _backup?: TipologiaItem[] };

const PROCESOS_VALIDOS = new Set(Object.keys(ESTADOS_OBRA_STRUCTURE));

function parseNumFromDb(val: unknown): number | null {
  if (val === undefined || val === null) return null;
  if (typeof val === "number") return Number.isNaN(val) ? null : val;
  const str = String(val).trim();
  if (str === "" || str === "-" || str === "—") return null;
  const s = str.replace(/\s/g, "").replace(",", ".");
  const n = parseFloat(s);
  return Number.isNaN(n) ? null : n;
}

function toFechaString(val: unknown): string {
  if (typeof val === "string" && val.trim()) return val;
  if (typeof val === "number" && !Number.isNaN(val)) return new Date(val).toISOString();
  return "";
}

function parseEstadoObraData(obj: Record<string, unknown>): EstadoObraData {
  const result: EstadoObraData = {};
  for (const [proceso, val] of Object.entries(obj)) {
    if (!PROCESOS_VALIDOS.has(proceso)) continue;
    if (val && typeof val === "object" && !Array.isArray(val)) {
      const items = val as Record<string, unknown>;
      const map: Record<string, string> = {};
      for (const [item, fecha] of Object.entries(items)) {
        if (typeof item === "string") {
          const fechaStr = toFechaString(fecha);
          map[item] = fechaStr;
        }
      }
      if (Object.keys(map).length > 0) result[proceso] = map;
    } else if (Array.isArray(val)) {
      const map: Record<string, string> = {};
      for (const v of val) {
        if (typeof v === "string") map[v] = "";
      }
      if (Object.keys(map).length > 0) result[proceso] = map;
    }
  }
  return result;
}

function parseEstadoObra(val: unknown): EstadoObraParsed {
  if (val && typeof val === "object" && !Array.isArray(val)) {
    const obj = val as Record<string, unknown>;
    if (Array.isArray(obj.tipologias)) {
      const tipologias: TipologiaItem[] = obj.tipologias
        .filter((t): t is Record<string, unknown> => t && typeof t === "object")
        .map((t) => ({
          nombre: typeof t.nombre === "string" ? t.nombre : "Tipología",
          estados: parseEstadoObraData((t.estados as Record<string, unknown>) ?? {}),
          descripcion: typeof t.descripcion === "string" ? t.descripcion : null,
          marco: parseNumFromDb(t.marco),
          hojas: parseNumFromDb(t.hojas),
          guias: parseNumFromDb(t.guias),
          hojas_mosq: parseNumFromDb(t.hojas_mosq ?? t.hoja_mosq),
          umbral: parseNumFromDb(t.umbral),
          ancho: parseNumFromDb(t.ancho),
          alto: parseNumFromDb(t.alto),
        }));
      const result: EstadoObraParsed = { tipologias };
      if (Array.isArray(obj._backup)) {
        result._backup = (obj._backup as Record<string, unknown>[])
          .filter((t): t is Record<string, unknown> => t && typeof t === "object")
          .map((t) => ({
            nombre: typeof t.nombre === "string" ? t.nombre : "Tipología",
            estados: parseEstadoObraData((t.estados as Record<string, unknown>) ?? {}),
            descripcion: typeof t.descripcion === "string" ? t.descripcion : null,
            marco: parseNumFromDb(t.marco),
            hojas: parseNumFromDb(t.hojas),
            guias: parseNumFromDb(t.guias),
            hojas_mosq: parseNumFromDb(t.hojas_mosq ?? t.hoja_mosq),
            umbral: parseNumFromDb(t.umbral),
            ancho: parseNumFromDb(t.ancho),
            alto: parseNumFromDb(t.alto),
          }));
      }
      return result;
    }
    const estados = parseEstadoObraData(obj);
    if (Object.keys(estados).length > 0 || Object.keys(obj).some((k) => k !== "tipologias" && k !== "_backup")) {
      return { tipologias: [{ nombre: "General", estados }] };
    }
  }
  if (typeof val === "string") {
    try {
      const parsed = JSON.parse(val) as unknown;
      if (parsed && typeof parsed === "object") return parseEstadoObra(parsed);
    } catch {
      // ignore
    }
  }
  return { tipologias: [] };
}

export function getArticulosTerminadosProgress(estadoObra: unknown): { completed: number; total: number; percent: number } {
  const parsed = parseEstadoObra(estadoObra);
  const total = parsed.tipologias.length;
  if (total === 0) return { completed: 0, total: 0, percent: 0 };
  const raw = estadoObra && typeof estadoObra === "object" ? (estadoObra as Record<string, unknown>) : null;
  const articuloTerminado = raw?.articuloTerminado;
  if (!articuloTerminado || typeof articuloTerminado !== "object" || Array.isArray(articuloTerminado)) {
    return { completed: 0, total, percent: 0 };
  }
  let completed = 0;
  for (const [, v] of Object.entries(articuloTerminado)) {
    if (v && typeof v === "object" && "terminado" in v && (v as Record<string, unknown>).terminado) {
      completed++;
    }
  }
  const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
  return { completed, total, percent };
}
