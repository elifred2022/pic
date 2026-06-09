export const ESTADOS_OBRA_STRUCTURE: Record<string, readonly string[]> = {
  CORTE: ["Marco", "Marco Adicional", "Hojas", "Guia Mosquitero"],
  MECANIZADO: ["Marco", "Marco Adicional", "Hojas", "Guia Mosquitero"],
  SOLDADURA: ["Marco", "Hojas", "Guia Mosquitero"],
  ARMADO: ["Marco", "Marco Adicional", "Hojas", "Guia Mosquitero"],
  JUNQUILLOS: ["Marco", "Hoja", "Hoja Mq"],
} as const;

export const ESTADO_OBRA_PROCESOS = Object.keys(ESTADOS_OBRA_STRUCTURE);

/** Procesos que cuentan para marcar "Artículo terminado" (todos tienen "Proceso terminado"). */
export const ESTADO_OBRA_PROCESOS_PARA_ARTICULO_TERMINADO = ["ARMADO", "JUNQUILLOS"] as const;

export function procesoCuentaParaArticuloTerminado(proceso: string): boolean {
  return (ESTADO_OBRA_PROCESOS_PARA_ARTICULO_TERMINADO as readonly string[]).includes(proceso);
}

export type EstadoObraData = Record<string, Record<string, string>>;

export type TipologiaItem = {
  nombre: string;
  estados: EstadoObraData;
  descripcion?: string | null;
  marco?: number | null;
  hojas?: number | null;
  guias?: number | null;
  guia_mosquitero?: number | null;
  mosq_comun?: number | null;
  mosq_riel?: number | null;
  mosquitero_fijo?: number | null;
  unidades_mq?: number | null;
  guia_emb?: number | null;
  umbral_pvc?: number | null;
  umbral_aluminio?: number | null;
  hojas_mosq?: number | null;
  umbral?: number | null;
  ancho?: number | null;
  alto?: number | null;
};

/** Máximo de checkboxes por métrica (evita listas enormes por error de carga). */
const MAX_CHECKBOXES_POR_METRICA = 50;

/** Métricas del Excel que generan checkboxes por proceso (sin ancho/alto). */
export const TIPOLOGIA_CHECKBOX_METRICS: ReadonlyArray<{
  metricKey: keyof Pick<
    TipologiaItem,
    | "marco"
    | "hojas"
    | "guias"
    | "guia_mosquitero"
    | "mosq_comun"
    | "mosq_riel"
    | "mosquitero_fijo"
    | "unidades_mq"
    | "guia_emb"
    | "umbral_pvc"
    | "umbral_aluminio"
  >;
  /** Nombre base numerado: cantidad 2 → "Hoja 1", "Hoja 2". */
  numberedBase: string;
  legacyAliases: readonly string[];
}> = [
  { metricKey: "marco", numberedBase: "Marco", legacyAliases: ["Marco", "Marco Adicional"] },
  { metricKey: "hojas", numberedBase: "Hoja", legacyAliases: ["Hojas", "Hoja"] },
  { metricKey: "guias", numberedBase: "Guía aluminio", legacyAliases: ["Guías", "Guia aluminio"] },
  { metricKey: "guia_mosquitero", numberedBase: "Guía mosquitero", legacyAliases: ["Guia Mosquitero", "Guía Mosquitero"] },
  { metricKey: "mosq_comun", numberedBase: "Mosq. común", legacyAliases: [] },
  { metricKey: "mosq_riel", numberedBase: "Mosq. riel", legacyAliases: [] },
  { metricKey: "mosquitero_fijo", numberedBase: "Mosq. fijo", legacyAliases: ["Mosquitero fijo"] },
  { metricKey: "unidades_mq", numberedBase: "Unid. mq", legacyAliases: ["Hoja Mq", "Hojas Mosq"] },
  { metricKey: "guia_emb", numberedBase: "Guía emb.", legacyAliases: ["Guia emb"] },
  { metricKey: "umbral_pvc", numberedBase: "Umbral PVC", legacyAliases: ["Umbral", "Umbral pvc"] },
  { metricKey: "umbral_aluminio", numberedBase: "Umbral aluminio", legacyAliases: ["Umbral aluminio", "Umbral Aluminio"] },
];

/** Etiqueta de checkbox para un índice (1-based). Ej: ("Hoja", 2) → "Hoja 2". */
export function numberedItemLabel(base: string, index: number): string {
  return `${base} ${index}`;
}

type EstadoObraConTipologias = { tipologias: TipologiaItem[] };
type EstadoObraParsed = EstadoObraConTipologias & { _backup?: TipologiaItem[] };

const PROCESOS_VALIDOS = new Set(Object.keys(ESTADOS_OBRA_STRUCTURE));

export function hasMetricQty(val: number | null | undefined): boolean {
  return val != null && !Number.isNaN(val) && val > 0;
}

function metricQty(tipologia: TipologiaItem, metricKey: (typeof TIPOLOGIA_CHECKBOX_METRICS)[number]["metricKey"]): number | null {
  if (metricKey === "unidades_mq") {
    return tipologia.unidades_mq ?? tipologia.hojas_mosq ?? null;
  }
  if (metricKey === "umbral_pvc") {
    return tipologia.umbral_pvc ?? tipologia.umbral ?? null;
  }
  return tipologia[metricKey] ?? null;
}

function checkboxCountForQty(qty: number): number {
  if (!hasMetricQty(qty)) return 0;
  return Math.min(Math.max(1, Math.floor(qty)), MAX_CHECKBOXES_POR_METRICA);
}

/** True si la tipología trae cantidades del Excel (columnas numéricas con valor > 0). */
export function tipologiaHasImportedMetrics(tipologia: TipologiaItem): boolean {
  return TIPOLOGIA_CHECKBOX_METRICS.some((m) => hasMetricQty(metricQty(tipologia, m.metricKey)));
}

/** Ítems de checkbox para un proceso según métricas del Excel; si no hay métricas, estructura legacy por proceso. */
export function getCheckboxItemsForTipologia(tipologia: TipologiaItem, proceso: string): string[] {
  if (tipologiaHasImportedMetrics(tipologia)) {
    const items: string[] = [];
    for (const m of TIPOLOGIA_CHECKBOX_METRICS) {
      const qty = metricQty(tipologia, m.metricKey);
      if (qty == null || !hasMetricQty(qty)) continue;
      const count = checkboxCountForQty(qty);
      for (let i = 1; i <= count; i++) {
        items.push(numberedItemLabel(m.numberedBase, i));
      }
    }
    return items;
  }
  return [...(ESTADOS_OBRA_STRUCTURE[proceso] ?? [])];
}

export function getProcesosConItemsParaTipologia(tipologia: TipologiaItem): string[] {
  return ESTADO_OBRA_PROCESOS.filter((proceso) => getCheckboxItemsForTipologia(tipologia, proceso).length > 0);
}

export type CheckboxItemGroup = {
  groupKey: string;
  /** Título de columna (ej. "Hoja"). */
  groupLabel: string;
  items: string[];
};

/** Agrupa ítems similares para mostrarlos en columna (Hoja 1, Hoja 2, …). */
export function getCheckboxItemGroupsForTipologia(tipologia: TipologiaItem, proceso: string): CheckboxItemGroup[] {
  if (tipologiaHasImportedMetrics(tipologia)) {
    const groups: CheckboxItemGroup[] = [];
    for (const m of TIPOLOGIA_CHECKBOX_METRICS) {
      const qty = metricQty(tipologia, m.metricKey);
      if (qty == null || !hasMetricQty(qty)) continue;
      const count = checkboxCountForQty(qty);
      const items: string[] = [];
      for (let i = 1; i <= count; i++) {
        items.push(numberedItemLabel(m.numberedBase, i));
      }
      if (items.length > 0) {
        groups.push({ groupKey: m.metricKey, groupLabel: m.numberedBase, items });
      }
    }
    return groups;
  }
  const legacyItems = [...(ESTADOS_OBRA_STRUCTURE[proceso] ?? [])];
  return legacyItems.map((item) => ({ groupKey: item, groupLabel: item, items: [item] }));
}

function findMetricByNumberedLabel(itemLabel: string) {
  const match = itemLabel.match(/^(.+?)\s+(\d+)$/);
  if (!match) return { metric: undefined as (typeof TIPOLOGIA_CHECKBOX_METRICS)[number] | undefined, index: 0 };
  const base = match[1].trim();
  const index = parseInt(match[2], 10);
  const metric = TIPOLOGIA_CHECKBOX_METRICS.find((m) => m.numberedBase === base);
  return { metric, index: Number.isNaN(index) ? 0 : index };
}

export function getFechaGuardadaParaItem(
  itemData: Record<string, string> | undefined,
  itemLabel: string
): string | undefined {
  if (!itemData) return undefined;
  if (itemLabel in itemData) return itemData[itemLabel];

  const { metric, index } = findMetricByNumberedLabel(itemLabel);
  if (metric && index > 0) {
    const compact = `${metric.numberedBase}${index}`;
    if (compact in itemData) return itemData[compact];
    if (index === 1) {
      for (const alias of metric.legacyAliases) {
        if (alias in itemData) return itemData[alias];
      }
      if (metric.numberedBase in itemData) return itemData[metric.numberedBase];
    }
    if (index === 2 && metric.metricKey === "marco" && "Marco Adicional" in itemData) {
      return itemData["Marco Adicional"];
    }
  }

  const metricByAlias = TIPOLOGIA_CHECKBOX_METRICS.find(
    (m) => m.numberedBase === itemLabel || m.legacyAliases.includes(itemLabel)
  );
  if (metricByAlias) {
    for (const alias of metricByAlias.legacyAliases) {
      if (alias in itemData) return itemData[alias];
    }
  }
  return undefined;
}

export function areAllProcesosTerminadosParaTipologia(
  tipIdx: number,
  tipologia: TipologiaItem,
  terminado: Record<string, boolean>,
  keySep: string
): boolean {
  const procesos = getProcesosConItemsParaTipologia(tipologia).filter(procesoCuentaParaArticuloTerminado);
  if (procesos.length === 0) return false;
  return procesos.every((proceso) => !!terminado[`${tipIdx}${keySep}${proceso}`]);
}

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
          guia_mosquitero: parseNumFromDb(t.guia_mosquitero),
          mosq_comun: parseNumFromDb(t.mosq_comun),
          mosq_riel: parseNumFromDb(t.mosq_riel),
          mosquitero_fijo: parseNumFromDb(t.mosquitero_fijo),
          unidades_mq: parseNumFromDb(t.unidades_mq),
          guia_emb: parseNumFromDb(t.guia_emb),
          umbral_pvc: parseNumFromDb(t.umbral_pvc),
          umbral_aluminio: parseNumFromDb(t.umbral_aluminio),
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
            guia_mosquitero: parseNumFromDb(t.guia_mosquitero),
            mosq_comun: parseNumFromDb(t.mosq_comun),
            mosq_riel: parseNumFromDb(t.mosq_riel),
            mosquitero_fijo: parseNumFromDb(t.mosquitero_fijo),
            unidades_mq: parseNumFromDb(t.unidades_mq),
            guia_emb: parseNumFromDb(t.guia_emb),
            umbral_pvc: parseNumFromDb(t.umbral_pvc),
            umbral_aluminio: parseNumFromDb(t.umbral_aluminio),
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
