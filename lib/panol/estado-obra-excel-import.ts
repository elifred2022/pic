import * as XLSX from "xlsx";
import type { TipologiaItem } from "@/lib/panol/estado-obra";
import { TIPOLOGIA_CHECKBOX_METRICS } from "@/lib/panol/estado-obra";

const EXCEL_COL_LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

type TipologiaScalarField = keyof Omit<TipologiaItem, "nombre" | "estados">;

type ExcelFieldDef = {
  field: "nombre" | "descripcion" | TipologiaScalarField;
  type: "text" | "number";
  /** Mayor = más específico; gana ante coincidencias ambiguas. */
  priority: number;
  patterns: readonly string[];
};

/** Orden por defecto cuando la planilla no trae encabezados (columna A = índice 0). */
const DEFAULT_POSITIONAL_FIELDS: readonly ExcelFieldDef["field"][] = [
  "nombre",
  "descripcion",
  "marco",
  "hojas",
  "guias",
  "guia_mosquitero",
  "mosq_comun",
  "mosq_riel",
  "mosquitero_fijo",
  "guia_emb",
  "umbral_pvc",
  "umbral_aluminio",
  "ancho",
  "alto",
  "unidades_mq",
];

const MOSQ_COMUN_PATTERNS = [
  "mosq comun",
  "mosq. comun",
  "mosquitero comun",
  "mosquitero común",
  "m.c",
  "m.c.",
] as const;

const MOSQ_RIEL_PATTERNS = ["mosq riel", "mosq. riel", "mosquitero riel", "m.r", "m.r."] as const;

const MOSQ_FIJO_PATTERNS = ["mosquitero fijo", "mosq fijo", "mosq. fijo", "m.f", "m.f."] as const;

const EXCEL_FIELD_DEFS: readonly ExcelFieldDef[] = [
  { field: "nombre", type: "text", priority: 100, patterns: ["tipologia", "tipologias", "tipología", "tipologías"] },
  { field: "descripcion", type: "text", priority: 95, patterns: ["descripcion", "descripción", "descripciones"] },
  { field: "umbral_aluminio", type: "number", priority: 92, patterns: ["umbral aluminio", "umbral alum", "u.al", "u al"] },
  { field: "umbral_pvc", type: "number", priority: 91, patterns: ["umbral pvc", "u.p", "u.p.", "u p"] },
  { field: "guia_mosquitero", type: "number", priority: 90, patterns: ["guia mosquitero", "guía mosquitero", "g.mq", "g mq"] },
  { field: "guia_emb", type: "number", priority: 90, patterns: ["guia emb", "guía emb", "guia emb.", "g.e", "g e"] },
  { field: "guias", type: "number", priority: 88, patterns: ["guia aluminio", "guía aluminio", "guias", "guías", "g.al", "g al"] },
  { field: "unidades_mq", type: "number", priority: 87, patterns: ["unidades mq", "unid mq", "unid. mq", "hoja mq", "hojas mosq", "hojas mq"] },
  { field: "mosquitero_fijo", type: "number", priority: 86, patterns: MOSQ_FIJO_PATTERNS },
  { field: "mosq_comun", type: "number", priority: 86, patterns: MOSQ_COMUN_PATTERNS },
  { field: "mosq_riel", type: "number", priority: 86, patterns: MOSQ_RIEL_PATTERNS },
  { field: "marco", type: "number", priority: 80, patterns: ["marco", "mar"] },
  { field: "hojas", type: "number", priority: 75, patterns: ["hojas", "hoj", "hoja"] },
  { field: "ancho", type: "number", priority: 70, patterns: ["ancho", "anc"] },
  { field: "alto", type: "number", priority: 70, patterns: ["alto", "alt"] },
  { field: "umbral_pvc", type: "number", priority: 50, patterns: ["umbral"] },
  { field: "hojas_mosq", type: "number", priority: 45, patterns: ["hojas mosquitero"] },
];

export function normExcelHeaderLabel(s: string): string {
  return String(s)
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[._]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function parseNumExcel(val: unknown): number | null {
  if (val === undefined || val === null) return null;
  const str = String(val).trim();
  if (str === "" || str === "-" || str === "—") return null;
  if (typeof val === "number") return Number.isNaN(val) ? null : val;
  const s = str.replace(/\s/g, "").replace(",", ".");
  const n = parseFloat(s);
  return Number.isNaN(n) ? null : n;
}

function headerLooksLikeField(header: string): boolean {
  const h = normExcelHeaderLabel(header);
  if (!h) return false;
  return EXCEL_FIELD_DEFS.some((def) =>
    def.patterns.some((p) => {
      const pn = normExcelHeaderLabel(p);
      return h === pn || h.includes(pn) || pn.includes(h);
    })
  );
}

function scoreHeaderMatch(header: string, def: ExcelFieldDef): number {
  const h = normExcelHeaderLabel(header);
  if (!h) return 0;
  let best = 0;
  for (const pattern of def.patterns) {
    const p = normExcelHeaderLabel(pattern);
    if (!p) continue;
    if (h === p) best = Math.max(best, def.priority + 50);
    else if (h.startsWith(p) || p.startsWith(h)) best = Math.max(best, def.priority + 30);
    else if (h.includes(p) || p.includes(h)) best = Math.max(best, def.priority + 10);
  }
  return best;
}

export type ExcelColumnMapping = {
  /** Índice de columna (0-based) → campo destino o clave en columnas_extra */
  byIndex: Map<number, { kind: "field"; field: ExcelFieldDef["field"] } | { kind: "extra"; key: string }>;
  headers: string[];
  usedHeaders: boolean;
};

export function buildExcelColumnMapping(headers: string[]): ExcelColumnMapping {
  const byIndex = new Map<number, { kind: "field"; field: ExcelFieldDef["field"] } | { kind: "extra"; key: string }>();
  const usedFields = new Set<ExcelFieldDef["field"]>();

  const indexed = headers.map((header, index) => ({ header: String(header ?? "").trim(), index }));
  const candidates = indexed
    .filter(({ header }) => header !== "")
    .map(({ header, index }) => {
      let bestDef: ExcelFieldDef | null = null;
      let bestScore = 0;
      for (const def of EXCEL_FIELD_DEFS) {
        const score = scoreHeaderMatch(header, def);
        if (score > bestScore) {
          bestScore = score;
          bestDef = def;
        }
      }
      return { header, index, bestDef, bestScore };
    })
    .filter((c) => c.bestDef && c.bestScore > 0)
    .sort((a, b) => b.bestScore - a.bestScore);

  for (const { header, index, bestDef } of candidates) {
    if (!bestDef || usedFields.has(bestDef.field)) continue;
    usedFields.add(bestDef.field);
    byIndex.set(index, { kind: "field", field: bestDef.field });
  }

  for (const { header, index } of indexed) {
    if (!header || byIndex.has(index)) continue;
    byIndex.set(index, { kind: "extra", key: header });
  }

  const usedHeaders = headers.some((h) => headerLooksLikeField(String(h ?? "")));

  return { byIndex, headers, usedHeaders };
}

function buildPositionalMapping(columnCount: number): ExcelColumnMapping {
  const byIndex = new Map<number, { kind: "field"; field: ExcelFieldDef["field"] } | { kind: "extra"; key: string }>();
  const headers: string[] = [];
  for (let i = 0; i < columnCount; i++) {
    const letter = EXCEL_COL_LETTERS[i] ?? String(i);
    headers.push(letter);
    const field = DEFAULT_POSITIONAL_FIELDS[i];
    if (field) {
      byIndex.set(i, { kind: "field", field });
    } else {
      byIndex.set(i, { kind: "extra", key: `Columna ${letter}` });
    }
  }
  return { byIndex, headers, usedHeaders: false };
}

function isHeaderDataRow(values: unknown[]): boolean {
  const first = String(values[0] ?? "").trim();
  if (!first) return false;
  const n = normExcelHeaderLabel(first);
  if (/^(tipolog(ias?|ia)?|descripciones?|marco|hojas|ancho|alto)$/.test(n)) return true;
  return headerLooksLikeField(first);
}

function cellValue(row: unknown[], index: number): unknown {
  if (index < 0 || index >= row.length) return undefined;
  const val = row[index];
  if (val === undefined || val === null) return undefined;
  if (typeof val === "string" && val.trim() === "") return undefined;
  return val;
}

function emptyTipologia(): TipologiaItem {
  return {
    nombre: "",
    estados: {},
    descripcion: null,
    marco: null,
    hojas: null,
    guias: null,
    guia_mosquitero: null,
    mosq_comun: null,
    mosq_riel: null,
    mosquitero_fijo: null,
    unidades_mq: null,
    guia_emb: null,
    umbral_pvc: null,
    umbral_aluminio: null,
    hojas_mosq: null,
    umbral: null,
    ancho: null,
    alto: null,
    columnas_extra: undefined,
  };
}

function applyMappedValue(item: TipologiaItem, field: ExcelFieldDef["field"], raw: unknown): void {
  if (field === "nombre") {
    item.nombre = String(raw ?? "").trim();
    return;
  }
  if (field === "descripcion") {
    item.descripcion = String(raw ?? "").trim() || null;
    return;
  }
  const num = parseNumExcel(raw);
  if (field === "hojas_mosq") {
    if (num != null) {
      item.hojas_mosq = num;
      if (item.unidades_mq == null) item.unidades_mq = num;
    }
    return;
  }
  if (field === "umbral_pvc") {
    item.umbral_pvc = num;
    if (num != null) item.umbral = null;
    return;
  }
  (item as Record<string, unknown>)[field] = num;
}

function applyExtraValue(item: TipologiaItem, key: string, raw: unknown): void {
  if (raw === undefined || raw === null || String(raw).trim() === "") return;
  if (!item.columnas_extra) item.columnas_extra = {};
  const num = parseNumExcel(raw);
  item.columnas_extra[key] = num != null ? num : String(raw).trim();
}

export function rowToTipologia(row: unknown[], mapping: ExcelColumnMapping): TipologiaItem | null {
  const item = emptyTipologia();

  for (const [colIdx, target] of mapping.byIndex) {
    const raw = cellValue(row, colIdx);
    if (raw === undefined) continue;
    if (target.kind === "field") {
      applyMappedValue(item, target.field, raw);
    } else {
      applyExtraValue(item, target.key, raw);
    }
  }

  if (!item.nombre.trim()) return null;
  if (isHeaderDataRow(row)) return null;

  if (item.columnas_extra && Object.keys(item.columnas_extra).length === 0) {
    item.columnas_extra = undefined;
  }

  return item;
}

export function sheetToTipologiaRows(sheet: XLSX.WorkSheet): TipologiaItem[] {
  const matrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    defval: "",
    raw: true,
  }) as unknown[][];

  if (matrix.length === 0) return [];

  let dataStart = 0;
  let mapping: ExcelColumnMapping;

  const firstRow = matrix[0] ?? [];
  const firstRowHeaders = firstRow.map((c) => String(c ?? "").trim());
  const hasHeaderRow = firstRowHeaders.some((h) => headerLooksLikeField(h));

  if (hasHeaderRow) {
    mapping = buildExcelColumnMapping(firstRowHeaders);
    dataStart = 1;
  } else {
    const maxCols = matrix.reduce((max, row) => Math.max(max, row.length), 0);
    mapping = buildPositionalMapping(maxCols);
  }

  const tipologias: TipologiaItem[] = [];
  for (let ri = dataStart; ri < matrix.length; ri++) {
    const row = matrix[ri] ?? [];
    const item = rowToTipologia(row, mapping);
    if (item) tipologias.push(item);
  }

  return tipologias;
}

export function parseEstadoObraExcelBuffer(buffer: ArrayBuffer): TipologiaItem[] {
  const wb = XLSX.read(buffer, { type: "array" });
  const firstSheet = wb.Sheets[wb.SheetNames[0]];
  if (!firstSheet) return [];
  return sheetToTipologiaRows(firstSheet);
}

export function describeExcelImportFormat(): string {
  const known = [
    "Tipología",
    "Descripción",
    ...TIPOLOGIA_CHECKBOX_METRICS.map((m) => m.numberedBase),
    "Ancho",
    "Alto",
  ];
  return `La planilla puede incluir encabezados con nombres similares a: ${known.join(", ")}. Las columnas adicionales con cantidades numéricas (ej. Tapas) también generan checkboxes automáticamente. El orden de las columnas no es obligatorio si hay encabezados.`;
}
