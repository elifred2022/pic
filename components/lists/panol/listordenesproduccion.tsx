"use client";

import React, { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import {
  canAccessOrdenesProduccion,
  canDeleteObservacionesObra,
  isAdminEmail,
  isAprobEmail,
  isPanolEmail,
  isProduccionEmail,
  isTabletEmail,
  isTabletOnlyUser,
} from "@/lib/panol-access";
import {
  areAllProcesosTerminadosParaTipologia,
  ESTADOS_OBRA_STRUCTURE,
  ESTADO_OBRA_PROCESOS,
  getArticulosTerminadosProgress,
  getCheckboxItemGroupsForTipologia,
  getCheckboxItemsForTipologia,
  getFechaGuardadaParaItem,
  getProcesosConItemsParaTipologia,
} from "@/lib/panol/estado-obra";
import { describeExcelImportFormat, parseEstadoObraExcelBuffer } from "@/lib/panol/estado-obra-excel-import";
import { inicialesDesdeNombre, MARCA_OPERADOR_LONGITUD } from "@/lib/utils";
import ProgresoProduccionModal, { type OrdenProgreso } from "@/components/panol/ProgresoProduccionModal";
import OrdenesProduccionMobileList from "@/components/lists/panol/OrdenesProduccionMobileList";
import JSZip from "jszip";
import * as XLSX from "xlsx";

const ESTADO_OBRA_KEY_SEP = "::";

// proceso -> item -> fecha (ISO string). Si está vacío = sin fecha (datos antiguos)
type EstadoObraData = Record<string, Record<string, string>>;

type TipologiaItem = {
  nombre: string; // tipologia (texto)
  estados: EstadoObraData;
  descripcion?: string | null; // texto
  marco?: number | null; // numerico
  hojas?: number | null; // numerico
  guias?: number | null; // guía aluminio (legacy: "Guías")
  guia_mosquitero?: number | null;
  mosq_comun?: number | null;
  mosq_riel?: number | null;
  mosquitero_fijo?: number | null;
  unidades_mq?: number | null;
  guia_emb?: number | null;
  umbral_pvc?: number | null;
  umbral_aluminio?: number | null;
  hojas_mosq?: number | null; // numerico (legacy; importación nueva usa unidades_mq)
  umbral?: number | null; // numerico (legacy umbral único)
  ancho?: number | null; // numerico
  alto?: number | null; // numerico
  columnas_extra?: Record<string, string | number | null>;
};

const TIPOLOGIA_NUM_METRIC_COLS: ReadonlyArray<{
  k: keyof Pick<
    TipologiaItem,
    | "marco"
    | "hojas"
    | "guias"
    | "guia_mosquitero"
    | "mosq_comun"
    | "mosq_riel"
    | "mosquitero_fijo"
    | "guia_emb"
    | "umbral_pvc"
    | "umbral_aluminio"
    | "unidades_mq"
  >;
  title: string;
  abbrev: string;
}> = [
  { k: "marco", title: "Marco", abbrev: "Mar" },
  { k: "hojas", title: "Hojas", abbrev: "Hoj" },
  { k: "guias", title: "Guía aluminio", abbrev: "G.Al" },
  { k: "guia_mosquitero", title: "Guía mosquitero", abbrev: "G.Mq" },
  { k: "mosq_comun", title: "Mosq. común", abbrev: "M.c" },
  { k: "mosq_riel", title: "Mosq. riel", abbrev: "M.r" },
  { k: "mosquitero_fijo", title: "Mosq. fijo", abbrev: "M.f" },
  { k: "guia_emb", title: "Guía emb.", abbrev: "G.e" },
  { k: "umbral_pvc", title: "Umbral PVC", abbrev: "U.P" },
  { k: "umbral_aluminio", title: "Umbral aluminio", abbrev: "U.Al" },
  { k: "unidades_mq", title: "Unid. mq", abbrev: "U.Mq" },
];

const TIPOLOGIA_DIMENSION_COLS: ReadonlyArray<{
  k: "ancho" | "alto";
  title: string;
  abbrev: string;
}> = [
  { k: "ancho", title: "Ancho", abbrev: "Anc" },
  { k: "alto", title: "Alto", abbrev: "Alt" },
];

function parseColumnasExtra(val: unknown): Record<string, string | number | null> | undefined {
  if (!val || typeof val !== "object" || Array.isArray(val)) return undefined;
  const result: Record<string, string | number | null> = {};
  for (const [k, v] of Object.entries(val as Record<string, unknown>)) {
    if (v === null || v === undefined) continue;
    const num = parseNumFromDb(v);
    result[k] = num != null ? num : String(v);
  }
  return Object.keys(result).length > 0 ? result : undefined;
}

const ESTADO_OBRA_MOSTRAR_LS_KEY = "estadoObraMostrarProcesos";
const PROCESOS_FILTRO_ESTADO_OBRA = [
  { key: "CORTE", label: "Corte" },
  { key: "MECANIZADO", label: "Mecanizado" },
  { key: "SOLDADURA", label: "Soldadura" },
  { key: "ARMADO", label: "Armado" },
  { key: "JUNQUILLOS", label: "Junquillos" },
] as const;

type MostrarProcesosEstadoObra = Record<(typeof PROCESOS_FILTRO_ESTADO_OBRA)[number]["key"], boolean>;

function defaultMostrarProcesosEstadoObra(): MostrarProcesosEstadoObra {
  return Object.fromEntries(
    PROCESOS_FILTRO_ESTADO_OBRA.map(({ key }) => [key, true])
  ) as MostrarProcesosEstadoObra;
}

type EstadoObraConTipologias = { tipologias: TipologiaItem[] };

function parseNumExcel(val: unknown): number | null {
  if (val === undefined || val === null) return null;
  const str = String(val).trim();
  if (str === "" || str === "-" || str === "—") return null;
  if (typeof val === "number") return Number.isNaN(val) ? null : val;
  const s = str.replace(/\s/g, "").replace(",", ".");
  const n = parseFloat(s);
  return Number.isNaN(n) ? null : n;
}

function parseNumFromDb(val: unknown): number | null {
  if (val === undefined || val === null) return null;
  if (typeof val === "number") return Number.isNaN(val) ? null : val;
  return parseNumExcel(val);
}

function toFechaString(val: unknown): string {
  if (typeof val === "string" && val.trim()) return val;
  if (typeof val === "number" && !Number.isNaN(val)) return new Date(val).toISOString();
  return "";
}

const PROCESOS_VALIDOS = new Set(Object.keys(ESTADOS_OBRA_STRUCTURE));

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

function formatFechaISO(iso: string): string {
  if (!iso || !iso.trim()) return "—";
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" });
  } catch {
    return iso;
  }
}

type EstadoObraParsed = EstadoObraConTipologias & { _backup?: TipologiaItem[] };

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
          columnas_extra: parseColumnasExtra(t.columnas_extra),
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
            columnas_extra: parseColumnasExtra(t.columnas_extra),
          }));
      }
      return result;
    }
    // Formato antiguo: objeto plano con CORTE, MECANIZADO, etc. → migrar a una tipología "General"
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

function formatEstadoObraSummary(data: EstadoObraConTipologias): string {
  const parts: string[] = [];
  for (const t of data.tipologias) {
    const subParts: string[] = [];
    for (const [proceso, items] of Object.entries(t.estados)) {
      const itemStrs = Object.entries(items)
        .map(([item, fecha]) => (fecha ? `${item} (${formatFechaISO(fecha)})` : item))
        .filter(Boolean);
      if (itemStrs.length > 0) subParts.push(`${proceso}: ${itemStrs.join(", ")}`);
    }
    if (subParts.length > 0) parts.push(`${t.nombre} (${subParts.join("; ")})`);
  }
  return parts.join(" | ");
}

type OrdenProduccion = {
  id: string;
  created_at: string;
  num_carpeta: string | null;
  obra: string | null;
  mes: string | null;
  semana: string | null;
  alertas: string | null;
  url_imagen: string | null;
  url_medicion?: string | null;
  usuario_id: string | null;
  estado_obra?: unknown;
  observaciones?: string | null;
  observaciones_iniciales?: string | null;
};

const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
];

const SEMANAS = ["1", "2", "3", "4", "5"];

type ImageItem = { url: string; name: string };

function filterImageFiles(files: File[]): File[] {
  return files.filter((f) => /^image\//.test(f.type));
}

function filterMedicionFiles(files: File[]): File[] {
  return files.filter((f) => {
    const ext = f.name.split(".").pop()?.toLowerCase() || "";
    return /^(jpg|jpeg|pdf)$/i.test(ext) || f.type === "application/pdf" || /^image\/(jpeg|jpg)$/i.test(f.type);
  });
}

function isAllowedUploadFile(file: File, tipo: "corte" | "medicion"): boolean {
  const fileExt = file.name.split(".").pop()?.toLowerCase() || "";
  if (tipo === "medicion") {
    return /^(jpg|jpeg|pdf)$/i.test(fileExt);
  }
  return /^(jpg|jpeg|png|gif|webp|bmp)$/i.test(fileExt);
}

async function uploadImageFolder(
  supabase: ReturnType<typeof createClient>,
  files: File[],
  userId: string,
  tipo: "corte" | "medicion"
): Promise<{ items: ImageItem[]; error: string | null }> {
  const bucket = tipo === "medicion" ? "mediciones" : "ordenes";
  const uploadedItems: ImageItem[] = [];
  const basePath = `${userId}/${Date.now()}`;

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const fileExt = file.name.split(".").pop()?.toLowerCase() || "jpg";
    if (!isAllowedUploadFile(file, tipo)) continue;

    const filePath = `${basePath}-${i}-${crypto.randomUUID().slice(0, 8)}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(filePath, file, { upsert: false });

    if (uploadError) {
      return { items: [], error: `Error al subir "${file.name}": ${uploadError.message}` };
    }

    const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(filePath);
    const fileName = (file as File & { webkitRelativePath?: string }).webkitRelativePath || file.name;
    uploadedItems.push({ url: urlData.publicUrl, name: fileName });
  }

  if (uploadedItems.length === 0) {
    const errorMsg = tipo === "medicion"
      ? "No se encontraron archivos PDF o JPG válidos."
      : "No se encontraron archivos de imagen válidos en la carpeta.";
    return { items: [], error: errorMsg };
  }

  return { items: uploadedItems, error: null };
}

function serializeImageItems(items: ImageItem[]): string {
  return JSON.stringify(items);
}

type ObservacionObraItem = {
  texto: string;
  iniciales: string;
  fecha: string;
};

function normalizarObservacionObraItem(val: unknown): ObservacionObraItem | null {
  if (!val || typeof val !== "object" || Array.isArray(val)) return null;
  const item = val as Record<string, unknown>;
  const texto = typeof item.texto === "string" ? item.texto.trim() : "";
  if (!texto) return null;
  const inicialesRaw =
    typeof item.iniciales === "string"
      ? item.iniciales
      : typeof item.i === "string"
        ? item.i
        : "";
  const fechaRaw =
    typeof item.fecha === "string" ? item.fecha : typeof item.f === "string" ? item.f : "";
  return {
    texto,
    iniciales: inicialesRaw.trim().slice(0, MARCA_OPERADOR_LONGITUD).toUpperCase(),
    fecha: fechaRaw,
  };
}

function parseObservacionesObraDesdeJson(raw: unknown): ObservacionObraItem[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map(normalizarObservacionObraItem)
    .filter((item): item is ObservacionObraItem => item !== null);
}

function getObservacionesInicialesLegacy(estadoObra: unknown, orden: OrdenProduccion): string {
  if (orden.observaciones_iniciales?.trim()) {
    return orden.observaciones_iniciales.trim().slice(0, MARCA_OPERADOR_LONGITUD).toUpperCase();
  }
  if (!estadoObra || typeof estadoObra !== "object" || Array.isArray(estadoObra)) return "";
  const ini = (estadoObra as Record<string, unknown>).observacionesIniciales;
  if (typeof ini !== "string" || !ini.trim()) return "";
  return ini.trim().slice(0, MARCA_OPERADOR_LONGITUD).toUpperCase();
}

function parseObservacionesObra(orden: OrdenProduccion): ObservacionObraItem[] {
  const estadoObra = orden.estado_obra;
  if (estadoObra && typeof estadoObra === "object" && !Array.isArray(estadoObra)) {
    const desdeEstado = parseObservacionesObraDesdeJson(
      (estadoObra as Record<string, unknown>).observacionesObra
    );
    if (desdeEstado.length > 0) return desdeEstado;
  }

  const columna = orden.observaciones?.trim() ?? "";
  if (columna) {
    try {
      const parsed = JSON.parse(columna) as unknown;
      const desdeJson = parseObservacionesObraDesdeJson(parsed);
      if (desdeJson.length > 0) return desdeJson;
    } catch {
      /* texto plano legacy */
    }
    return [
      {
        texto: columna,
        iniciales: getObservacionesInicialesLegacy(estadoObra, orden),
        fecha: "",
      },
    ];
  }

  return [];
}

function mergeEstadoObraObservacionesObra(
  estadoObra: unknown,
  items: ObservacionObraItem[]
): Record<string, unknown> {
  const base =
    estadoObra && typeof estadoObra === "object" && !Array.isArray(estadoObra)
      ? { ...(estadoObra as Record<string, unknown>) }
      : {};
  if (items.length > 0) {
    base.observacionesObra = items;
  } else {
    delete base.observacionesObra;
  }
  delete base.observacionesIniciales;
  return base;
}

function serializeObservacionesColumna(items: ObservacionObraItem[]): string | null {
  if (items.length === 0) return null;
  return JSON.stringify(items);
}

function parseObservacionesRegistroDesdeValor(val: unknown): ObservacionObraItem[] {
  if (typeof val === "string" && val.trim()) {
    return [{ texto: val.trim(), iniciales: "", fecha: "" }];
  }
  return parseObservacionesObraDesdeJson(val);
}

function confirmActivarCheckboxEstadoObra(): boolean {
  return window.confirm("¿ESTAS SEGURO CARNERO?");
}

function parseObservacionesRegistroMap(raw: unknown): Record<string, ObservacionObraItem[]> {
  const result: Record<string, ObservacionObraItem[]> = {};
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return result;
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    const items = parseObservacionesRegistroDesdeValor(v);
    if (items.length > 0) result[k] = items;
  }
  return result;
}

type EstadoObraCheckboxSession = {
  tipologias: TipologiaItem[];
  backupTipologias: TipologiaItem[];
  fechas: Record<string, string>;
  terminado: Record<string, boolean>;
  iniciales: Record<string, string>;
  inicialesPorItem: Record<string, string>;
  articuloTerminado: Record<string, boolean>;
  observaciones: Record<string, ObservacionObraItem[]>;
  articuloObservaciones: Record<string, ObservacionObraItem[]>;
};

function buildEstadoObraCheckboxState(rawEstado: unknown): EstadoObraCheckboxSession {
  const parsed = parseEstadoObra(rawEstado);
  const { tipologias, _backup } = parsed;
  const fechas: Record<string, string> = {};
  const terminado: Record<string, boolean> = {};
  const iniciales: Record<string, string> = {};
  const inicialesPorItem: Record<string, string> = {};
  const articuloTerminado: Record<string, boolean> = {};
  const rawTerminado =
    rawEstado && typeof rawEstado === "object" && "procesoTerminado" in rawEstado
      ? (rawEstado as Record<string, unknown>).procesoTerminado
      : null;
  if (rawTerminado && typeof rawTerminado === "object" && !Array.isArray(rawTerminado)) {
    for (const [k, v] of Object.entries(rawTerminado)) {
      if (v && typeof v === "object" && "terminado" in v) {
        terminado[k] = !!(v as Record<string, unknown>).terminado;
        const ini = (v as Record<string, unknown>).iniciales;
        if (typeof ini === "string" && ini.trim()) {
          iniciales[k] = ini.toUpperCase().slice(0, MARCA_OPERADOR_LONGITUD);
        }
      }
    }
  }
  const rawArticulo =
    rawEstado && typeof rawEstado === "object" && "articuloTerminado" in rawEstado
      ? (rawEstado as Record<string, unknown>).articuloTerminado
      : null;
  if (rawArticulo && typeof rawArticulo === "object" && !Array.isArray(rawArticulo)) {
    for (const [k, v] of Object.entries(rawArticulo)) {
      if (v && typeof v === "object" && "terminado" in v) {
        articuloTerminado[k] = !!(v as Record<string, unknown>).terminado;
      }
    }
  }
  const rawInicialesPorItem =
    rawEstado && typeof rawEstado === "object" && "inicialesPorItem" in rawEstado
      ? (rawEstado as Record<string, unknown>).inicialesPorItem
      : null;
  if (rawInicialesPorItem && typeof rawInicialesPorItem === "object" && !Array.isArray(rawInicialesPorItem)) {
    for (const [k, v] of Object.entries(rawInicialesPorItem)) {
      if (typeof v === "string" && v.trim()) {
        inicialesPorItem[k] = v.toUpperCase().slice(0, MARCA_OPERADOR_LONGITUD);
      }
    }
  }
  const rawObservaciones =
    rawEstado && typeof rawEstado === "object" && "observacionesPorProceso" in rawEstado
      ? (rawEstado as Record<string, unknown>).observacionesPorProceso
      : null;
  const observaciones = parseObservacionesRegistroMap(rawObservaciones);
  const rawArticuloObs =
    rawEstado && typeof rawEstado === "object" && "articuloObservaciones" in rawEstado
      ? (rawEstado as Record<string, unknown>).articuloObservaciones
      : null;
  const articuloObservaciones = parseObservacionesRegistroMap(rawArticuloObs);
  tipologias.forEach((t, idx) => {
    for (const proceso of ESTADO_OBRA_PROCESOS) {
      const items = getCheckboxItemsForTipologia(t, proceso);
      const itemData = t.estados[proceso];
      for (const item of items) {
        const fechaGuardada = getFechaGuardadaParaItem(itemData, item);
        if (fechaGuardada !== undefined) {
          const key = `${idx}${ESTADO_OBRA_KEY_SEP}${proceso}${ESTADO_OBRA_KEY_SEP}${item}`;
          fechas[key] = fechaGuardada;
        }
      }
    }
  });
  const backupTipologias = _backup ?? tipologias;
  return {
    tipologias,
    backupTipologias,
    fechas,
    terminado,
    iniciales,
    inicialesPorItem,
    articuloTerminado,
    observaciones,
    articuloObservaciones,
  };
}

function mergeEstadoObraCheckboxMaps(
  remote: Pick<
    EstadoObraCheckboxSession,
    "fechas" | "terminado" | "iniciales" | "inicialesPorItem" | "articuloTerminado"
  >,
  local: Pick<
    EstadoObraCheckboxSession,
    "fechas" | "terminado" | "iniciales" | "inicialesPorItem" | "articuloTerminado"
  >,
  removedKeys: ReadonlySet<string>
): Pick<
  EstadoObraCheckboxSession,
  "fechas" | "terminado" | "iniciales" | "inicialesPorItem" | "articuloTerminado"
> {
  const fechas = { ...remote.fechas, ...local.fechas };
  for (const k of removedKeys) {
    delete fechas[k];
  }
  return {
    fechas,
    terminado: { ...remote.terminado, ...local.terminado },
    iniciales: { ...remote.iniciales, ...local.iniciales },
    inicialesPorItem: { ...remote.inicialesPorItem, ...local.inicialesPorItem },
    articuloTerminado: { ...remote.articuloTerminado, ...local.articuloTerminado },
  };
}

function observacionObraFingerprint(key: string, item: ObservacionObraItem): string {
  return `${key}::${item.fecha}::${item.texto}::${item.iniciales}`;
}

function mergeEstadoObraObservacionMaps(
  remote: Record<string, ObservacionObraItem[]>,
  local: Record<string, ObservacionObraItem[]>,
  removedFingerprints: ReadonlySet<string>
): Record<string, ObservacionObraItem[]> {
  const merged: Record<string, ObservacionObraItem[]> = {};
  const allKeys = new Set([...Object.keys(remote), ...Object.keys(local)]);
  for (const key of allKeys) {
    const seen = new Set<string>();
    const items: ObservacionObraItem[] = [];
    for (const item of [...(remote[key] ?? []), ...(local[key] ?? [])]) {
      const fp = observacionObraFingerprint(key, item);
      if (removedFingerprints.has(fp)) continue;
      if (seen.has(fp)) continue;
      seen.add(fp);
      items.push(item);
    }
    if (items.length > 0) merged[key] = items;
  }
  return merged;
}

const ESTADO_OBRA_AUTOSAVE_MS = 450;

function mapTipologiaForEstadoObraRef(t: TipologiaItem): TipologiaItem {
  return {
    nombre: t.nombre,
    estados: Object.fromEntries(
      Object.entries(t.estados).map(([proceso, items]) => [proceso, { ...items }])
    ),
    descripcion: t.descripcion ?? null,
    marco: t.marco ?? null,
    hojas: t.hojas ?? null,
    guias: t.guias ?? null,
    guia_mosquitero: t.guia_mosquitero ?? null,
    mosq_comun: t.mosq_comun ?? null,
    mosq_riel: t.mosq_riel ?? null,
    mosquitero_fijo: t.mosquitero_fijo ?? null,
    unidades_mq: t.unidades_mq ?? null,
    guia_emb: t.guia_emb ?? null,
    umbral_pvc: t.umbral_pvc ?? null,
    umbral_aluminio: t.umbral_aluminio ?? null,
    hojas_mosq: t.hojas_mosq ?? null,
    umbral: t.umbral ?? null,
    ancho: t.ancho ?? null,
    alto: t.alto ?? null,
    columnas_extra: t.columnas_extra,
  };
}

function buildEstadoObraInicialRefPayload(session: EstadoObraCheckboxSession): {
  tipologias: TipologiaItem[];
  fechas: Record<string, string>;
} {
  const fechasParaRef: Record<string, string> = {};
  session.backupTipologias.forEach((t, idx) => {
    for (const proceso of ESTADO_OBRA_PROCESOS) {
      const items = getCheckboxItemsForTipologia(t, proceso);
      const itemData = t.estados[proceso];
      for (const item of items) {
        const fechaGuardada = getFechaGuardadaParaItem(itemData, item);
        if (fechaGuardada !== undefined) {
          const key = `${idx}${ESTADO_OBRA_KEY_SEP}${proceso}${ESTADO_OBRA_KEY_SEP}${item}`;
          fechasParaRef[key] = fechaGuardada;
        }
      }
    }
  });
  return {
    tipologias: session.backupTipologias.map(mapTipologiaForEstadoObraRef),
    fechas: { ...fechasParaRef },
  };
}

function crearObservacionRegistro(texto: string, iniciales: string): ObservacionObraItem {
  return {
    texto: texto.trim(),
    iniciales: iniciales.slice(0, MARCA_OPERADOR_LONGITUD).toUpperCase(),
    fecha: new Date().toISOString(),
  };
}

function ObservacionesAcumulativas({
  items,
  canEdit,
  canDelete,
  onAdd,
  onDelete,
  stopPropagationOnInteract = false,
  className = "mt-1.5",
}: {
  items: ObservacionObraItem[];
  canEdit: boolean;
  canDelete: boolean;
  onAdd: (texto: string) => void | Promise<void>;
  onDelete: (index: number) => void | Promise<void>;
  stopPropagationOnInteract?: boolean;
  className?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [deletingIndex, setDeletingIndex] = useState<number | null>(null);

  useEffect(() => {
    if (!editing) setDraft("");
  }, [editing]);

  const wrapClick = (e: React.MouseEvent) => {
    if (stopPropagationOnInteract) e.stopPropagation();
  };

  const handleSave = async () => {
    const texto = draft.trim();
    if (!texto) return;
    setSaving(true);
    try {
      await onAdd(texto);
      setDraft("");
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (index: number) => {
    if (!canDelete) return;
    if (!confirm("¿Eliminar esta observación?")) return;
    setDeletingIndex(index);
    try {
      await onDelete(index);
    } finally {
      setDeletingIndex(null);
    }
  };

  return (
    <div className={className}>
      {canEdit && !editing && (
        <button
          type="button"
          onClick={(e) => {
            wrapClick(e);
            setEditing(true);
          }}
          className="text-blue-600 hover:text-blue-800 hover:underline text-xs"
        >
          observacion
        </button>
      )}
      {editing && (
        <div className="mt-2 space-y-2" onClick={wrapClick}>
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={3}
            className="w-full min-w-[12rem] px-2 py-1.5 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Escribir observación..."
            autoFocus
          />
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void handleSave()}
              disabled={saving || !draft.trim()}
              className="px-2 py-1 text-xs font-medium bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? "Guardando..." : "Agregar"}
            </button>
            <button
              type="button"
              onClick={() => {
                setEditing(false);
                setDraft("");
              }}
              disabled={saving}
              className="px-2 py-1 text-xs font-medium border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
      {items.length > 0 ? (
        <div className={canEdit || editing ? "mt-1.5" : ""}>
          <span className="text-xs font-semibold text-gray-500">Observaciones:</span>
          <ul className="mt-1 space-y-2">
            {items.map((obs, idx) => (
              <li
                key={`${obs.fecha || "sin-fecha"}-${idx}-${obs.texto.slice(0, 24)}`}
                className="flex items-start gap-2 flex-wrap"
              >
                <p className="text-xs text-gray-700 whitespace-pre-wrap break-words min-w-0 flex-1">
                  {obs.texto}
                </p>
                <div className="flex items-center gap-1.5 shrink-0">
                  {obs.fecha ? (
                    <span className="text-[10px] text-gray-500 whitespace-nowrap" title={obs.fecha}>
                      {formatFechaISO(obs.fecha)}
                    </span>
                  ) : null}
                  {obs.iniciales ? (
                    <span
                      className="inline-flex min-w-[2.75rem] items-center justify-center px-1 py-0.5 text-xs font-semibold text-amber-800 bg-amber-50 border border-amber-200 rounded uppercase"
                      title="Observación por"
                    >
                      {obs.iniciales}
                    </span>
                  ) : null}
                  {canDelete ? (
                    <button
                      type="button"
                      onClick={(e) => {
                        wrapClick(e);
                        void handleDelete(idx);
                      }}
                      disabled={deletingIndex === idx}
                      className="text-red-500 hover:text-red-700 text-xs font-bold px-1 disabled:opacity-50"
                      title="Eliminar observación"
                    >
                      {deletingIndex === idx ? "…" : "✕"}
                    </button>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

function ObraConObservaciones({
  orden,
  canEdit,
  canDelete,
  onSave,
  onDelete,
  renderValue,
}: {
  orden: OrdenProduccion;
  canEdit: boolean;
  canDelete: boolean;
  onSave: (ordenId: string, observaciones: string) => Promise<void>;
  onDelete: (ordenId: string, index: number) => Promise<void>;
  renderValue: (value: unknown) => string;
}) {
  const observacionesLista = parseObservacionesObra(orden);

  return (
    <div className="text-left min-w-[8rem]">
      <div>{renderValue(orden.obra)}</div>
      <ObservacionesAcumulativas
        items={observacionesLista}
        canEdit={canEdit}
        canDelete={canDelete}
        stopPropagationOnInteract
        className="mt-1"
        onAdd={(texto) => onSave(orden.id, texto)}
        onDelete={(index) => onDelete(orden.id, index)}
      />
    </div>
  );
}

export default function ListOrdenesProduccion() {
  const [search, setSearch] = useState("");
  const [fechaDesde, setFechaDesde] = useState("");
  const [fechaHasta, setFechaHasta] = useState("");
  const [ordenes, setOrdenes] = useState<OrdenProduccion[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingOrden, setEditingOrden] = useState<OrdenProduccion | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState("");
  const [formData, setFormData] = useState({
    num_carpeta: "",
    obra: "",
    mes: "",
    semana: "",
    alertas: "",
  });
  const [imagenFiles, setImagenFiles] = useState<File[]>([]);
  const [medicionFiles, setMedicionFiles] = useState<File[]>([]);
  const [showArchivosModal, setShowArchivosModal] = useState(false);
  const [archivosModalItems, setArchivosModalItems] = useState<{ url: string; name: string }[]>([]);
  const [isReadOnly, setIsReadOnly] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userNombre, setUserNombre] = useState("");
  const [downloadingOrdenId, setDownloadingOrdenId] = useState<string | null>(null);
  const [deletingOrdenId, setDeletingOrdenId] = useState<string | null>(null);
  const [excelDownloadTipo, setExcelDownloadTipo] = useState<string>("");
  const [descargandoExcel, setDescargandoExcel] = useState(false);
  const [showEstadoObraModal, setShowEstadoObraModal] = useState(false);
  const [estadoObraModalSoloVista, setEstadoObraModalSoloVista] = useState(false);
  const [estadoObraOrden, setEstadoObraOrden] = useState<OrdenProduccion | null>(null);
  const [estadoObraTipologias, setEstadoObraTipologias] = useState<TipologiaItem[]>([]);
  const [estadoObraFechas, setEstadoObraFechas] = useState<Record<string, string>>({});
  const [estadoObraTerminado, setEstadoObraTerminado] = useState<Record<string, boolean>>({});
  const [estadoObraIniciales, setEstadoObraIniciales] = useState<Record<string, string>>({});
  const [estadoObraInicialesPorItem, setEstadoObraInicialesPorItem] = useState<Record<string, string>>({});
  const [estadoObraArticuloTerminado, setEstadoObraArticuloTerminado] = useState<Record<string, boolean>>({});
  const [estadoObraArticuloObservaciones, setEstadoObraArticuloObservaciones] = useState<
    Record<string, ObservacionObraItem[]>
  >({});
  const [estadoObraObservaciones, setEstadoObraObservaciones] = useState<
    Record<string, ObservacionObraItem[]>
  >({});
  const [nuevaTipologiaNombre, setNuevaTipologiaNombre] = useState("");
  const [mostrarAgregarTipologia, setMostrarAgregarTipologia] = useState(false);
  const [editingTipologiaIdx, setEditingTipologiaIdx] = useState<number | null>(null);
  const [estadoObraFiltroTip, setEstadoObraFiltroTip] = useState("");
  const [mostrarProcesosEstadoObra, setMostrarProcesosEstadoObra] = useState<MostrarProcesosEstadoObra>(
    defaultMostrarProcesosEstadoObra
  );
  const [updatingEstadoObra, setUpdatingEstadoObra] = useState(false);
  const [importandoEstadoObra, setImportandoEstadoObra] = useState(false);
  const [showProgresoModal, setShowProgresoModal] = useState(false);
  const [selectedMobileOrdenId, setSelectedMobileOrdenId] = useState<string | null>(null);
  const estadoObraFileInputRef = React.useRef<HTMLInputElement>(null);
  const estadoObraInicialRef = React.useRef<{ tipologias: TipologiaItem[]; fechas: Record<string, string> } | null>(null);
  const estadoObraTipologiasRef = React.useRef(estadoObraTipologias);
  const estadoObraFechasRef = React.useRef(estadoObraFechas);
  const estadoObraTerminadoRef = React.useRef(estadoObraTerminado);
  const estadoObraInicialesRef = React.useRef(estadoObraIniciales);
  const estadoObraInicialesPorItemRef = React.useRef(estadoObraInicialesPorItem);
  const estadoObraArticuloObservacionesRef = React.useRef(estadoObraArticuloObservaciones);
  const estadoObraObservacionesRef = React.useRef(estadoObraObservaciones);
  const estadoObraHydratingRef = React.useRef(false);
  const estadoObraAutoSaveReadyRef = React.useRef(false);
  const estadoObraSavingRef = React.useRef(false);
  const estadoObraSkipRemoteRef = React.useRef(false);
  const estadoObraRemovedKeysRef = React.useRef<Set<string>>(new Set());
  const estadoObraUserEditedRef = React.useRef(false);
  const estadoObraObservacionesRemovedRef = React.useRef<Set<string>>(new Set());
  const userInicialesRef = React.useRef("");
  const userIniciales = inicialesDesdeNombre(userNombre || userEmail?.split("@")[0] || "");
  userInicialesRef.current = userIniciales;
  estadoObraTipologiasRef.current = estadoObraTipologias;
  estadoObraFechasRef.current = estadoObraFechas;
  estadoObraTerminadoRef.current = estadoObraTerminado;
  estadoObraInicialesRef.current = estadoObraIniciales;
  estadoObraInicialesPorItemRef.current = estadoObraInicialesPorItem;
  estadoObraArticuloObservacionesRef.current = estadoObraArticuloObservaciones;
  estadoObraObservacionesRef.current = estadoObraObservaciones;
  const soloVista = isPanolEmail(userEmail) || isAprobEmail(userEmail);
  const estadoObraSoloVista = soloVista || estadoObraModalSoloVista;
  const isTabletUser = isTabletEmail(userEmail);
  const tabletSoloMarcar = isTabletOnlyUser(userEmail);
  const canEditCheckboxes = isProduccionEmail(userEmail) || isAdminEmail(userEmail) || isTabletUser;
  const canEditCheckboxesEnModal = canEditCheckboxes && !estadoObraSoloVista;
  const showEstadoObraActualizarButton = canEditCheckboxes && !isTabletUser;
  const showEstadoObraActualizarEnModal = showEstadoObraActualizarButton && !estadoObraSoloVista;
  const canEditFullModal = isProduccionEmail(userEmail) || isAdminEmail(userEmail);
  const canEditFullModalEnModal = canEditFullModal && !estadoObraSoloVista;
  const canEditObservaciones = canEditCheckboxes;
  const canEditObservacionesEnModal = canEditObservaciones && !estadoObraSoloVista;
  const canDeleteObservaciones = canDeleteObservacionesObra(userEmail);
  const showAccionesColumn = !isReadOnly || isAprobEmail(userEmail ?? "") || isTabletEmail(userEmail);
  const supabase = createClient();

  const fetchOrdenes = useCallback(async () => {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError) {
      console.error("Error obteniendo el usuario:", userError);
      setLoading(false);
      return;
    }

    if (!user) {
      console.warn("No hay usuario logueado");
      setLoading(false);
      return;
    }

    setIsReadOnly(isPanolEmail(user.email) || isAprobEmail(user.email) || isTabletEmail(user.email));
    setUserEmail(user.email ?? null);

    const { data: perfil } = await supabase
      .from("usuarios")
      .select("nombre")
      .eq("uuid", user.id)
      .single();
    setUserNombre(perfil?.nombre?.trim() ?? "");

    let query = supabase
      .from("ordenes_produccion")
      .select("*")
      .order("created_at", { ascending: false });
    if (!canAccessOrdenesProduccion(user.email)) {
      query = query.eq("usuario_id", user.id);
    }
    const { data, error } = await query;

    if (error) {
      console.error("Error cargando órdenes de producción:", error);
    } else {
      setOrdenes(data ?? []);
    }
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    fetchOrdenes();
  }, [fetchOrdenes]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(ESTADO_OBRA_MOSTRAR_LS_KEY);
      if (!saved) return;
      const parsed = JSON.parse(saved) as Partial<MostrarProcesosEstadoObra>;
      setMostrarProcesosEstadoObra((prev) => ({ ...prev, ...parsed }));
    } catch {
      /* ignorar JSON inválido */
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(ESTADO_OBRA_MOSTRAR_LS_KEY, JSON.stringify(mostrarProcesosEstadoObra));
  }, [mostrarProcesosEstadoObra]);

  const handleImagenFilesChange = (files: File[]) => {
    setImagenFiles(filterImageFiles(files));
  };

  const handleMedicionFilesChange = (files: File[]) => {
    setMedicionFiles(filterMedicionFiles(files));
  };

  const handleImagenesSueltasChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    handleImagenFilesChange(files);
    e.target.value = "";
  };

  const handleCarpetaOrdenCorteChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    handleImagenFilesChange(files);
    e.target.value = "";
  };

  const handleMedicionArchivosSueltosChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    handleMedicionFilesChange(files);
    e.target.value = "";
  };

  const handleCarpetaMedicionChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    handleMedicionFilesChange(files);
    e.target.value = "";
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingOrden(null);
    setFormData({ num_carpeta: "", obra: "", mes: "", semana: "", alertas: "" });
    setImagenFiles([]);
    setMedicionFiles([]);
    setFormError("");
    setFormSuccess("");
  };

  const persistObservacionesObra = async (
    ordenId: string,
    observacionesActualizadas: ObservacionObraItem[],
    errorMensaje: string
  ): Promise<boolean> => {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      alert("Debes estar logueado para modificar observaciones.");
      return false;
    }

    const ordenActual = ordenes.find((o) => o.id === ordenId);
    if (!ordenActual) return false;

    const estadoObraActualizado = mergeEstadoObraObservacionesObra(
      ordenActual.estado_obra,
      observacionesActualizadas
    );
    const observacionesColumna = serializeObservacionesColumna(observacionesActualizadas);

    let query = supabase
      .from("ordenes_produccion")
      .update({
        observaciones: observacionesColumna,
        estado_obra: estadoObraActualizado,
      })
      .eq("id", ordenId);
    if (!canAccessOrdenesProduccion(user.email)) {
      query = query.eq("usuario_id", user.id);
    }
    const { error } = await query;
    if (error) {
      alert(`${errorMensaje}: ${error.message}`);
      return false;
    }
    setOrdenes((prev) =>
      prev.map((o) =>
        o.id === ordenId
          ? {
              ...o,
              observaciones: observacionesColumna,
              estado_obra: estadoObraActualizado,
            }
          : o
      )
    );
    return true;
  };

  const handleSaveObservaciones = async (ordenId: string, observaciones: string) => {
    const texto = observaciones.trim();
    if (!texto) {
      alert("Escribe una observación para agregar.");
      return;
    }

    const ordenActual = ordenes.find((o) => o.id === ordenId);
    if (!ordenActual) return;

    const nuevaObservacion = crearObservacionRegistro(texto, userInicialesRef.current);
    const observacionesActualizadas = [...parseObservacionesObra(ordenActual), nuevaObservacion];
    await persistObservacionesObra(ordenId, observacionesActualizadas, "Error al guardar observación");
  };

  const handleDeleteObservacion = async (ordenId: string, index: number) => {
    if (!canDeleteObservacionesObra(userEmail)) return;

    const ordenActual = ordenes.find((o) => o.id === ordenId);
    if (!ordenActual) return;

    const lista = parseObservacionesObra(ordenActual);
    if (index < 0 || index >= lista.length) return;

    const observacionesActualizadas = lista.filter((_, i) => i !== index);
    await persistObservacionesObra(ordenId, observacionesActualizadas, "Error al eliminar observación");
  };

  const handleEdit = (orden: OrdenProduccion) => {
    setEditingOrden(orden);
    setFormData({
      num_carpeta: orden.num_carpeta ?? "",
      obra: orden.obra ?? "",
      mes: orden.mes ?? "",
      semana: orden.semana ?? "",
      alertas: orden.alertas ?? "",
    });
    setImagenFiles([]);
    setMedicionFiles([]);
    setFormError("");
    setFormSuccess("");
    setShowModal(true);
  };

  const applyEstadoObraCheckboxSession = useCallback(
    (session: EstadoObraCheckboxSession, options?: { resetRemovedKeys?: boolean; updateInicialRef?: boolean }) => {
      estadoObraHydratingRef.current = true;
      if (options?.resetRemovedKeys !== false) {
        estadoObraRemovedKeysRef.current = new Set();
      }
      setEstadoObraTipologias(session.tipologias);
      setEstadoObraFechas(session.fechas);
      setEstadoObraTerminado(session.terminado);
      setEstadoObraIniciales(session.iniciales);
      setEstadoObraInicialesPorItem(session.inicialesPorItem);
      setEstadoObraArticuloTerminado(session.articuloTerminado);
      setEstadoObraArticuloObservaciones(session.articuloObservaciones);
      setEstadoObraObservaciones(session.observaciones);
      if (options?.updateInicialRef !== false) {
        estadoObraInicialRef.current = buildEstadoObraInicialRefPayload(session);
      }
      queueMicrotask(() => {
        estadoObraHydratingRef.current = false;
      });
    },
    []
  );

  const closeEstadoObraModal = () => {
    setShowEstadoObraModal(false);
    setEstadoObraOrden(null);
    setEditingTipologiaIdx(null);
    setEstadoObraFiltroTip("");
    setEstadoObraModalSoloVista(false);
  };

  const handleOpenEstadoObra = async (
    orden: OrdenProduccion,
    options?: { soloVista?: boolean }
  ) => {
    estadoObraAutoSaveReadyRef.current = false;
    estadoObraUserEditedRef.current = false;
    estadoObraObservacionesRemovedRef.current = new Set();
    setEstadoObraModalSoloVista(options?.soloVista ?? false);
    setEstadoObraOrden(orden);
    setEstadoObraFiltroTip("");
    setShowEstadoObraModal(true);
    const { data: fresh } = await supabase
      .from("ordenes_produccion")
      .select("estado_obra")
      .eq("id", orden.id)
      .single();
    const session = buildEstadoObraCheckboxState(fresh?.estado_obra ?? orden.estado_obra);
    applyEstadoObraCheckboxSession(session);
    estadoObraAutoSaveReadyRef.current = true;
    setNuevaTipologiaNombre("");
    setMostrarAgregarTipologia(false);
  };

  const handleAgregarTipologia = () => {
    const nombre = nuevaTipologiaNombre.trim() || `Tipología ${estadoObraTipologias.length + 1}`;
    setEstadoObraTipologias((prev) => [...prev, { nombre, estados: {} }]);
    setNuevaTipologiaNombre("");
    setMostrarAgregarTipologia(false);
  };

  const handleImportEstadoObraExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setImportandoEstadoObra(true);
    try {
      const data = await file.arrayBuffer();
      const nuevas = parseEstadoObraExcelBuffer(data);
      setEstadoObraTipologias((prev) => [...prev, ...nuevas]);
      if (nuevas.length > 0) {
        alert(`Se agregaron ${nuevas.length} tipología(s) al proceso de producción. Haz clic en Actualizar para guardar.`);
      } else {
        alert(`No se encontraron filas con datos. ${describeExcelImportFormat()}`);
      }
    } catch (ex) {
      console.error("Error al importar:", ex);
      alert("Error al leer el archivo Excel. Verifica el formato del archivo.");
    } finally {
      setImportandoEstadoObra(false);
    }
  };

  const handleEliminarTodasTipologias = () => {
    if (!confirm("¿Estás seguro de que deseas eliminar todas las tipologías?")) return;
    setEditingTipologiaIdx(null);
    setEstadoObraTipologias([]);
    setEstadoObraFechas({});
    setEstadoObraTerminado({});
    setEstadoObraIniciales({});
    setEstadoObraArticuloTerminado({});
    setEstadoObraInicialesPorItem({});
    setEstadoObraArticuloObservaciones({});
    setEstadoObraObservaciones({});
    setNuevaTipologiaNombre("");
    setMostrarAgregarTipologia(false);
  };

  const handleEliminarTipologia = (idx: number) => {
    setEditingTipologiaIdx((prev) => {
      if (prev === null) return null;
      if (prev === idx) return null;
      if (prev > idx) return prev - 1;
      return prev;
    });
    setEstadoObraTipologias((prev) => prev.filter((_, i) => i !== idx));
    const sep = ESTADO_OBRA_KEY_SEP;
    setEstadoObraFechas((prev) => {
      const next: Record<string, string> = {};
      for (const [key, val] of Object.entries(prev)) {
        const parts = key.split(sep);
        const keyIdx = parseInt(parts[0], 10);
        if (keyIdx < idx) next[key] = val;
        else if (keyIdx > idx) next[`${keyIdx - 1}${sep}${parts.slice(1).join(sep)}`] = val;
      }
      return next;
    });
    setEstadoObraTerminado((prev) => {
      const next: Record<string, boolean> = {};
      for (const [key, val] of Object.entries(prev)) {
        const parts = key.split(sep);
        const keyIdx = parseInt(parts[0], 10);
        if (keyIdx < idx) next[key] = val;
        else if (keyIdx > idx) next[`${keyIdx - 1}${sep}${parts.slice(1).join(sep)}`] = val;
      }
      return next;
    });
    setEstadoObraIniciales((prev) => {
      const next: Record<string, string> = {};
      for (const [key, val] of Object.entries(prev)) {
        const parts = key.split(sep);
        const keyIdx = parseInt(parts[0], 10);
        if (keyIdx < idx) next[key] = val;
        else if (keyIdx > idx) next[`${keyIdx - 1}${sep}${parts.slice(1).join(sep)}`] = val;
      }
      return next;
    });
    setEstadoObraArticuloTerminado((prev) => {
      const next: Record<string, boolean> = {};
      for (const [key, val] of Object.entries(prev)) {
        const keyIdx = parseInt(key, 10);
        if (Number.isNaN(keyIdx)) continue;
        if (keyIdx < idx) next[key] = val;
        else if (keyIdx > idx) next[String(keyIdx - 1)] = val;
      }
      return next;
    });
    setEstadoObraInicialesPorItem((prev) => {
      const next: Record<string, string> = {};
      for (const [key, val] of Object.entries(prev)) {
        const parts = key.split(sep);
        const keyIdx = parseInt(parts[0], 10);
        if (Number.isNaN(keyIdx)) continue;
        if (keyIdx < idx) next[key] = val;
        else if (keyIdx > idx) next[`${keyIdx - 1}${sep}${parts.slice(1).join(sep)}`] = val as string;
      }
      return next;
    });
    setEstadoObraObservaciones((prev) => {
      const next: Record<string, ObservacionObraItem[]> = {};
      const sep = ESTADO_OBRA_KEY_SEP;
      for (const [key, val] of Object.entries(prev)) {
        const parts = key.split(sep);
        const keyIdx = parseInt(parts[0], 10);
        if (Number.isNaN(keyIdx)) continue;
        if (keyIdx < idx) next[key] = val;
        else if (keyIdx > idx) next[`${keyIdx - 1}${sep}${parts.slice(1).join(sep)}`] = val;
      }
      return next;
    });
    setEstadoObraArticuloObservaciones((prev) => {
      const next: Record<string, ObservacionObraItem[]> = {};
      for (const [key, val] of Object.entries(prev)) {
        const keyIdx = parseInt(key, 10);
        if (Number.isNaN(keyIdx)) continue;
        if (keyIdx < idx) next[key] = val;
        else if (keyIdx > idx) next[String(keyIdx - 1)] = val;
      }
      return next;
    });
  };

  const saveEstadoObraToSupabase = useCallback(async (closeModal = false, refreshList = true) => {
    if (!estadoObraOrden || estadoObraSavingRef.current) return;
    estadoObraSavingRef.current = true;
    setUpdatingEstadoObra(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      estadoObraSavingRef.current = false;
      setUpdatingEstadoObra(false);
      return;
    }
    const tipologiasActuales = estadoObraTipologiasRef.current;
    const fechasActuales = estadoObraFechasRef.current;
    const terminadoActual = estadoObraTerminadoRef.current;
    const inicialesActual = estadoObraInicialesRef.current;
    const inicialesPorItemActual = estadoObraInicialesPorItemRef.current;
    const articuloObservacionesActual = estadoObraArticuloObservacionesRef.current;
    const observacionesActual = estadoObraObservacionesRef.current;
    const { data: freshRow } = await supabase
      .from("ordenes_produccion")
      .select("estado_obra")
      .eq("id", estadoObraOrden.id)
      .single();
    const remoteSession = buildEstadoObraCheckboxState(freshRow?.estado_obra);
    const merged = mergeEstadoObraCheckboxMaps(
      remoteSession,
      {
        fechas: fechasActuales,
        terminado: terminadoActual,
        iniciales: inicialesActual,
        inicialesPorItem: inicialesPorItemActual,
        articuloTerminado: {},
      },
      estadoObraRemovedKeysRef.current
    );
    const fechasParaGuardar = merged.fechas;
    const terminadoParaGuardar = merged.terminado;
    const inicialesParaGuardar = merged.iniciales;
    const inicialesPorItemParaGuardar = merged.inicialesPorItem;
    const observacionesParaGuardar = mergeEstadoObraObservacionMaps(
      remoteSession.observaciones,
      observacionesActual,
      estadoObraObservacionesRemovedRef.current
    );
    const articuloObservacionesParaGuardar = mergeEstadoObraObservacionMaps(
      remoteSession.articuloObservaciones,
      articuloObservacionesActual,
      estadoObraObservacionesRemovedRef.current
    );
    const tipologias: TipologiaItem[] = tipologiasActuales.map((t, idx) => {
      const estados: EstadoObraData = {};
      for (const proceso of ESTADO_OBRA_PROCESOS) {
        const items = getCheckboxItemsForTipologia(t, proceso);
        const map: Record<string, string> = {};
        for (const item of items) {
          const key = `${idx}${ESTADO_OBRA_KEY_SEP}${proceso}${ESTADO_OBRA_KEY_SEP}${item}`;
          if (key in fechasParaGuardar) map[item] = fechasParaGuardar[key] ?? "";
        }
        if (Object.keys(map).length > 0) estados[proceso] = map;
      }
      return {
        nombre: t.nombre,
        estados,
        descripcion: t.descripcion ?? null,
        hojas: t.hojas ?? null,
        guias: t.guias ?? null,
        marco: t.marco ?? null,
        guia_mosquitero: t.guia_mosquitero ?? null,
        mosq_comun: t.mosq_comun ?? null,
        mosq_riel: t.mosq_riel ?? null,
        mosquitero_fijo: t.mosquitero_fijo ?? null,
        unidades_mq: t.unidades_mq ?? null,
        guia_emb: t.guia_emb ?? null,
        umbral_pvc: t.umbral_pvc ?? null,
        umbral_aluminio: t.umbral_aluminio ?? null,
        hojas_mosq: t.hojas_mosq ?? null,
        umbral: t.umbral ?? null,
        ancho: t.ancho ?? null,
        alto: t.alto ?? null,
        columnas_extra: t.columnas_extra,
      };
    });
    const backupTipologias = estadoObraInicialRef.current?.tipologias.map((t) => ({
      nombre: t.nombre,
      estados: t.estados,
      descripcion: t.descripcion ?? null,
      marco: t.marco ?? null,
      hojas: t.hojas ?? null,
      guias: t.guias ?? null,
      guia_mosquitero: t.guia_mosquitero ?? null,
      mosq_comun: t.mosq_comun ?? null,
      mosq_riel: t.mosq_riel ?? null,
      mosquitero_fijo: t.mosquitero_fijo ?? null,
      unidades_mq: t.unidades_mq ?? null,
      guia_emb: t.guia_emb ?? null,
      umbral_pvc: t.umbral_pvc ?? null,
      umbral_aluminio: t.umbral_aluminio ?? null,
      hojas_mosq: t.hojas_mosq ?? null,
      umbral: t.umbral ?? null,
      ancho: t.ancho ?? null,
      alto: t.alto ?? null,
      columnas_extra: t.columnas_extra,
    })) ?? tipologias;
    const procesoTerminado: Record<string, { terminado: boolean; iniciales: string }> = {};
    for (const [proceso] of Object.entries(ESTADOS_OBRA_STRUCTURE)) {
      tipologiasActuales.forEach((_, tipIdx) => {
        const key = `${tipIdx}${ESTADO_OBRA_KEY_SEP}${proceso}`;
        const term = terminadoParaGuardar[key];
        const ini = (inicialesParaGuardar[key] ?? "").slice(0, MARCA_OPERADOR_LONGITUD).toUpperCase();
        if (term || ini) {
          procesoTerminado[key] = { terminado: !!term, iniciales: ini };
        }
      });
    }
    const articuloTerminado: Record<string, { terminado: boolean; iniciales: string }> = {};
    tipologiasActuales.forEach((t, tipIdx) => {
      const key = String(tipIdx);
      if (areAllProcesosTerminadosParaTipologia(tipIdx, t, terminadoParaGuardar, ESTADO_OBRA_KEY_SEP)) {
        articuloTerminado[key] = { terminado: true, iniciales: "" };
      }
    });
    const observacionesPorProceso: Record<string, ObservacionObraItem[]> = {};
    for (const [key, val] of Object.entries(observacionesParaGuardar)) {
      if (Array.isArray(val) && val.length > 0) observacionesPorProceso[key] = val;
    }
    const articuloObservaciones: Record<string, ObservacionObraItem[]> = {};
    for (const [key, val] of Object.entries(articuloObservacionesParaGuardar)) {
      if (Array.isArray(val) && val.length > 0) articuloObservaciones[key] = val;
    }
    const inicialesPorItem: Record<string, string> = {};
    for (const [key, val] of Object.entries(inicialesPorItemParaGuardar)) {
      const s = typeof val === "string" ? val.slice(0, MARCA_OPERADOR_LONGITUD).toUpperCase().trim() : "";
      if (s) inicialesPorItem[key] = s;
    }
    const ordenParaPreservarObservaciones =
      ordenes.find((o) => o.id === estadoObraOrden.id) ?? estadoObraOrden;
    const observacionesObraPreservar = parseObservacionesObra(ordenParaPreservarObservaciones);
    const estadoObraPayload = {
      tipologias,
      _backup: backupTipologias,
      procesoTerminado,
      articuloTerminado,
      observacionesPorProceso,
      articuloObservaciones,
      inicialesPorItem,
      ...(observacionesObraPreservar.length > 0
        ? { observacionesObra: observacionesObraPreservar }
        : {}),
    };
    const baseQuery = supabase
      .from("ordenes_produccion")
      .update({ estado_obra: estadoObraPayload })
      .eq("id", estadoObraOrden.id);
    const finalQuery = canAccessOrdenesProduccion(user.email)
      ? baseQuery
      : baseQuery.eq("usuario_id", user.id);
    const { data, error } = await finalQuery.select("id, estado_obra").single();
    if (error) {
      alert(`Error al actualizar: ${error.message}`);
    } else if (!data) {
      alert("No se pudo actualizar. Verifica que tienes permisos para modificar esta obra.");
    } else {
      estadoObraRemovedKeysRef.current = new Set();
      estadoObraObservacionesRemovedRef.current = new Set();
      estadoObraUserEditedRef.current = false;
      estadoObraSkipRemoteRef.current = true;
      setTimeout(() => {
        estadoObraSkipRemoteRef.current = false;
      }, 800);
      if (refreshList) {
        await fetchOrdenes();
      } else {
        setOrdenes((prev) =>
          prev.map((o) => (o.id === estadoObraOrden.id ? { ...o, estado_obra: data.estado_obra } : o))
        );
      }
      if (closeModal) {
        setShowEstadoObraModal(false);
        setEstadoObraOrden(null);
        setEditingTipologiaIdx(null);
        setEstadoObraFiltroTip("");
        estadoObraAutoSaveReadyRef.current = false;
      }
    }
    estadoObraSavingRef.current = false;
    setUpdatingEstadoObra(false);
  }, [estadoObraOrden, supabase, fetchOrdenes, ordenes]);

  const handleUpdateEstadoObra = () => saveEstadoObraToSupabase(true, true);

  useEffect(() => {
    if (!showEstadoObraModal || !estadoObraOrden?.id) return;
    const ordenId = estadoObraOrden.id;
    let cancelled = false;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    const applyRemoteEstadoObra = (rawEstado: unknown) => {
      if (cancelled || estadoObraSavingRef.current || estadoObraSkipRemoteRef.current) return;
      const session = buildEstadoObraCheckboxState(rawEstado);
      estadoObraHydratingRef.current = true;
      estadoObraRemovedKeysRef.current = new Set();
      estadoObraObservacionesRemovedRef.current = new Set();
      setEstadoObraFechas(session.fechas);
      setEstadoObraTerminado(session.terminado);
      setEstadoObraIniciales(session.iniciales);
      setEstadoObraInicialesPorItem(session.inicialesPorItem);
      setEstadoObraArticuloTerminado(session.articuloTerminado);
      setEstadoObraObservaciones(session.observaciones);
      setEstadoObraArticuloObservaciones(session.articuloObservaciones);
      queueMicrotask(() => {
        estadoObraHydratingRef.current = false;
      });
    };

    const setup = async () => {
      const { data: authData } = await supabase.auth.getSession();
      if (cancelled) return;
      if (authData.session?.access_token) {
        await supabase.realtime.setAuth(authData.session.access_token);
      }
      if (channel) {
        await supabase.removeChannel(channel);
        channel = null;
      }
      channel = supabase
        .channel(`estado-obra-sync:${ordenId}`)
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "ordenes_produccion",
            filter: `id=eq.${ordenId}`,
          },
          (payload) => {
            const newRow = payload.new as { estado_obra?: unknown };
            if (newRow?.estado_obra !== undefined) {
              applyRemoteEstadoObra(newRow.estado_obra);
            }
          }
        )
        .subscribe();
    };

    void setup();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "INITIAL_SESSION") return;
      if (cancelled) return;
      if (session?.access_token) {
        await supabase.realtime.setAuth(session.access_token);
      }
      void setup();
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
      if (channel) {
        void supabase.removeChannel(channel);
      }
    };
  }, [showEstadoObraModal, estadoObraOrden?.id, supabase]);

  useEffect(() => {
    if (!showEstadoObraModal || !estadoObraOrden || !canEditCheckboxesEnModal) return;
    if (!estadoObraAutoSaveReadyRef.current || estadoObraHydratingRef.current) return;

    const timer = setTimeout(() => {
      if (
        estadoObraHydratingRef.current ||
        estadoObraSavingRef.current ||
        !estadoObraUserEditedRef.current
      ) {
        return;
      }
      void saveEstadoObraToSupabase(false, false);
    }, ESTADO_OBRA_AUTOSAVE_MS);

    return () => clearTimeout(timer);
  }, [
    estadoObraFechas,
    estadoObraTerminado,
    estadoObraIniciales,
    estadoObraInicialesPorItem,
    estadoObraObservaciones,
    estadoObraArticuloObservaciones,
    showEstadoObraModal,
    estadoObraOrden,
    canEditCheckboxesEnModal,
    saveEstadoObraToSupabase,
  ]);

  const handleDelete = async (orden: OrdenProduccion) => {
    if (!confirm("¿Estás seguro de que deseas eliminar esta obra?")) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    let query = supabase.from("ordenes_produccion").delete().eq("id", orden.id);
    if (!canAccessOrdenesProduccion(user.email)) {
      query = query.eq("usuario_id", user.id);
    }
    const { error } = await query;
    if (error) {
      alert(`Error al eliminar: ${error.message}`);
      return;
    }
    await fetchOrdenes();
  };

  const sanitizeFileName = (name: string): string => {
    return name.replace(/[<>:"/\\|?*]/g, "_").replace(/\s+/g, "_").trim() || "archivo";
  };

  const handleDownloadCarpeta = async (orden: OrdenProduccion) => {
    const items = parseImageItems(orden.url_imagen);
    if (items.length === 0) {
      alert("No hay archivos para descargar en esta obra.");
      return;
    }
    setDownloadingOrdenId(orden.id);
    try {
      const zip = new JSZip();
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const res = await fetch(item.url);
        if (!res.ok) continue;
        const blob = await res.blob();
        const baseName = item.name.split("/").pop() || `imagen_${i + 1}`;
        zip.file(baseName, blob);
      }
      const zipBlob = await zip.generateAsync({ type: "blob" });
      const obra = sanitizeFileName(orden.obra ?? "obra");
      const numCarpeta = sanitizeFileName(orden.num_carpeta ?? "");
      const zipName = numCarpeta ? `${obra}-${numCarpeta}.zip` : `${obra}.zip`;
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = zipName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Error al descargar carpeta:", err);
      alert("Error al descargar la carpeta. Intenta de nuevo.");
    } finally {
      setDownloadingOrdenId(null);
    }
  };

  const handleEliminarCarpeta = async (orden: OrdenProduccion) => {
    const numCarpeta = orden.num_carpeta ?? "(sin número)";
    const nombreObra = orden.obra ?? "(sin nombre)";
    const confirmado = window.confirm(
      `¿Está seguro de eliminar esta carpeta?\n\nNúmero de carpeta: ${numCarpeta}\nNombre de obra: ${nombreObra}`
    );
    if (!confirmado) return;
    setDeletingOrdenId(orden.id);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        alert("Debe iniciar sesión para realizar esta acción.");
        return;
      }
      let updateQuery = supabase
        .from("ordenes_produccion")
        .update({ url_imagen: null })
        .eq("id", orden.id);
      if (!canAccessOrdenesProduccion(user.email)) {
        updateQuery = updateQuery.eq("usuario_id", user.id);
      }
      const { error } = await updateQuery;
      if (error) {
        alert(`Error al eliminar la carpeta: ${error.message}`);
        return;
      }
      await fetchOrdenes();
    } finally {
      setDeletingOrdenId(null);
    }
  };

  const handleDownloadTerminados = () => {
    const rows: Array<{
      Carpeta: string; Obra: string; Mes: string; Semana: string; Fecha: string;
      Tipologia: string; Desc: string; Marco: string; Hojas: string; Guias: string; "Hojas Mosq": string; Umbral: string; Ancho: string; Alto: string;
    }> = [];
    for (const orden of filteredOrdenes) {
      const raw = orden.estado_obra;
      if (!raw || typeof raw !== "object") continue;
      const obj = raw as Record<string, unknown>;
      const articuloTerminado = obj.articuloTerminado;
      if (!articuloTerminado || typeof articuloTerminado !== "object" || Array.isArray(articuloTerminado)) continue;
      const tipologias = Array.isArray(obj.tipologias) ? obj.tipologias : [];
      const fecha = orden.created_at ? formatFechaISO(orden.created_at) : "—";
      for (const [key, val] of Object.entries(articuloTerminado)) {
        if (!val || typeof val !== "object") continue;
        const v = val as Record<string, unknown>;
        if (!v.terminado) continue;
        const tipIdx = parseInt(key, 10);
        if (Number.isNaN(tipIdx) || tipIdx < 0 || tipIdx >= tipologias.length) continue;
        const tipologia = tipologias[tipIdx] as Record<string, unknown> | undefined;
        const tipologiaNombre = tipologia && typeof tipologia === "object" && "nombre" in tipologia
          ? String(tipologia.nombre ?? "")
          : `Tipología ${tipIdx + 1}`;
        const desc = tipologia && typeof tipologia.descripcion !== "undefined" ? String(tipologia.descripcion ?? "") : "";
        const marco = tipologia && typeof tipologia.marco !== "undefined" && tipologia.marco != null ? String(tipologia.marco) : "";
        const hojas = tipologia && typeof tipologia.hojas !== "undefined" && tipologia.hojas != null ? String(tipologia.hojas) : "";
        const guias = tipologia && typeof tipologia.guias !== "undefined" && tipologia.guias != null ? String(tipologia.guias) : "";
        const hojasMosq = tipologia && typeof tipologia.hojas_mosq !== "undefined" && tipologia.hojas_mosq != null ? String(tipologia.hojas_mosq) : "";
        const umbral = tipologia && typeof tipologia.umbral !== "undefined" && tipologia.umbral != null ? String(tipologia.umbral) : "";
        const ancho = tipologia && typeof tipologia.ancho !== "undefined" && tipologia.ancho != null ? String(tipologia.ancho) : "";
        const alto = tipologia && typeof tipologia.alto !== "undefined" && tipologia.alto != null ? String(tipologia.alto) : "";
        rows.push({
          Carpeta: orden.num_carpeta ?? "",
          Obra: orden.obra ?? "",
          Mes: orden.mes ?? "",
          Semana: orden.semana ?? "",
          Fecha: fecha,
          Tipologia: tipologiaNombre,
          Desc: desc,
          Marco: marco,
          Hojas: hojas,
          Guias: guias,
          "Hojas Mosq": hojasMosq,
          Umbral: umbral,
          Ancho: ancho,
          Alto: alto,
        });
      }
    }
    if (rows.length === 0) {
      alert("No hay artículos marcados como terminados en las órdenes actuales (o en el filtro aplicado).");
      return;
    }
    setDescargandoExcel(true);
    try {
      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Artículos terminados");
      const buf = XLSX.write(wb, { type: "array", bookType: "xlsx" });
      const blob = new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `articulos-terminados-${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Error al descargar:", err);
      alert("Error al generar el archivo Excel.");
    } finally {
      setDescargandoExcel(false);
    }
  };

  const handleDownloadProcesosTerminados = () => {
    const rows: Array<{
      Carpeta: string; Obra: string; Mes: string; Semana: string; Fecha: string;
      Tipologia: string; Desc: string; Marco: string; Hojas: string; Guias: string; "Hojas Mosq": string; Umbral: string; Ancho: string; Alto: string;
      Proceso: string;
    }> = [];
    for (const orden of filteredOrdenes) {
      const raw = orden.estado_obra;
      if (!raw || typeof raw !== "object") continue;
      const obj = raw as Record<string, unknown>;
      const procesoTerminado = obj.procesoTerminado;
      if (!procesoTerminado || typeof procesoTerminado !== "object" || Array.isArray(procesoTerminado)) continue;
      const tipologias = Array.isArray(obj.tipologias) ? obj.tipologias : [];
      const fecha = orden.created_at ? formatFechaISO(orden.created_at) : "—";
      for (const [key, val] of Object.entries(procesoTerminado)) {
        if (!val || typeof val !== "object") continue;
        const v = val as Record<string, unknown>;
        if (!v.terminado) continue;
        const parts = String(key).split(ESTADO_OBRA_KEY_SEP);
        const tipIdx = parseInt(parts[0] ?? "0", 10);
        const proceso = parts[1] ?? "";
        const tipologia = tipologias[tipIdx] as Record<string, unknown> | undefined;
        const tipologiaNombre = tipologia && typeof tipologia === "object" && "nombre" in tipologia
          ? String(tipologia.nombre ?? "")
          : `Tipología ${tipIdx + 1}`;
        const desc = tipologia && typeof tipologia.descripcion !== "undefined" ? String(tipologia.descripcion ?? "") : "";
        const marco = tipologia && typeof tipologia.marco !== "undefined" && tipologia.marco != null ? String(tipologia.marco) : "";
        const hojas = tipologia && typeof tipologia.hojas !== "undefined" && tipologia.hojas != null ? String(tipologia.hojas) : "";
        const guias = tipologia && typeof tipologia.guias !== "undefined" && tipologia.guias != null ? String(tipologia.guias) : "";
        const hojasMosq = tipologia && typeof tipologia.hojas_mosq !== "undefined" && tipologia.hojas_mosq != null ? String(tipologia.hojas_mosq) : "";
        const umbral = tipologia && typeof tipologia.umbral !== "undefined" && tipologia.umbral != null ? String(tipologia.umbral) : "";
        const ancho = tipologia && typeof tipologia.ancho !== "undefined" && tipologia.ancho != null ? String(tipologia.ancho) : "";
        const alto = tipologia && typeof tipologia.alto !== "undefined" && tipologia.alto != null ? String(tipologia.alto) : "";
        rows.push({
          Carpeta: orden.num_carpeta ?? "",
          Obra: orden.obra ?? "",
          Mes: orden.mes ?? "",
          Semana: orden.semana ?? "",
          Fecha: fecha,
          Tipologia: tipologiaNombre,
          Desc: desc,
          Marco: marco,
          Hojas: hojas,
          Guias: guias,
          "Hojas Mosq": hojasMosq,
          Umbral: umbral,
          Ancho: ancho,
          Alto: alto,
          Proceso: proceso,
        });
      }
    }
    if (rows.length === 0) {
      alert("No hay procesos marcados como terminados en las órdenes actuales (o en el filtro aplicado).");
      return;
    }
    setDescargandoExcel(true);
    try {
      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Procesos terminados");
      const buf = XLSX.write(wb, { type: "array", bookType: "xlsx" });
      const blob = new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `procesos-terminados-${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Error al descargar:", err);
      alert("Error al generar el archivo Excel.");
    } finally {
      setDescargandoExcel(false);
    }
  };

  const handleDownloadEstadisticasIniciales = () => {
    const rows: Array<{
      Carpeta: string; Obra: string; Tipologia: string; Descripcion: string;
      Proceso: string; Item: string; Iniciales: string; Fecha: string;
    }> = [];
    for (const orden of filteredOrdenes) {
      const raw = orden.estado_obra;
      if (!raw || typeof raw !== "object") continue;
      const obj = raw as Record<string, unknown>;
      const inicialesPorItem = (obj.inicialesPorItem && typeof obj.inicialesPorItem === "object" && !Array.isArray(obj.inicialesPorItem))
        ? obj.inicialesPorItem as Record<string, string>
        : {};
      const tipologias = Array.isArray(obj.tipologias) ? obj.tipologias : [];
      for (const [key, ini] of Object.entries(inicialesPorItem)) {
        const val = typeof ini === "string" ? ini.trim().slice(0, MARCA_OPERADOR_LONGITUD).toUpperCase() : "";
        if (!val) continue;
        const parts = String(key).split(ESTADO_OBRA_KEY_SEP);
        if (parts.length < 3) continue;
        const tipIdx = parseInt(parts[0] ?? "0", 10);
        const proceso = parts[1] ?? "";
        const item = parts[2] ?? "";
        const tipologia = tipologias[tipIdx] as Record<string, unknown> | undefined;
        const tipologiaNombre = tipologia && typeof tipologia === "object" && "nombre" in tipologia
          ? String(tipologia.nombre ?? "")
          : `Tipología ${tipIdx + 1}`;
        const desc = tipologia && typeof tipologia.descripcion !== "undefined" ? String(tipologia.descripcion ?? "") : "";
        let fecha = "";
        if (tipologia && typeof tipologia === "object" && "estados" in tipologia) {
          const estados = tipologia.estados as Record<string, Record<string, string>> | undefined;
          const procesoData = estados?.[proceso];
          const fechaIso = procesoData?.[item];
          fecha = fechaIso ? formatFechaISO(fechaIso) : "";
        }
        rows.push({
          Carpeta: orden.num_carpeta ?? "",
          Obra: orden.obra ?? "",
          Tipologia: tipologiaNombre,
          Descripcion: desc,
          Proceso: proceso,
          Item: item,
          Iniciales: val,
          Fecha: fecha,
        });
      }
    }
    if (rows.length === 0) {
      alert("No hay procesos con iniciales en las órdenes actuales (o en el filtro aplicado).");
      return;
    }
    setDescargandoExcel(true);
    try {
      const wb = XLSX.utils.book_new();
      const conteoIniciales = new Map<string, number>();
      for (const row of rows) {
        const ini = row.Iniciales || "";
        if (ini) conteoIniciales.set(ini, (conteoIniciales.get(ini) ?? 0) + 1);
      }
      const resumenRows = Array.from(conteoIniciales.entries())
        .sort((a, b) => b[1] - a[1])
        .map(([Iniciales, Cantidad]) => ({ Iniciales, Cantidad }));
      const wsResumen = XLSX.utils.json_to_sheet(resumenRows);
      XLSX.utils.book_append_sheet(wb, wsResumen, "Resumen por iniciales");
      const ws = XLSX.utils.json_to_sheet(rows);
      XLSX.utils.book_append_sheet(wb, ws, "Detalle por proceso");
      const buf = XLSX.write(wb, { type: "array", bookType: "xlsx" });
      const blob = new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `procesos-terminados-operarios-${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Error al descargar:", err);
      alert("Error al generar el archivo Excel.");
    } finally {
      setDescargandoExcel(false);
    }
  };

  const handleDescargarExcelSeleccionado = () => {
    if (!excelDownloadTipo) {
      alert("Selecciona un tipo de descarga.");
      return;
    }
    if (excelDownloadTipo === "articulos") handleDownloadTerminados();
    else if (excelDownloadTipo === "procesos") handleDownloadProcesosTerminados();
    else if (excelDownloadTipo === "operarios") handleDownloadEstadisticasIniciales();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setFormError("");
    setFormSuccess("");

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      setFormError("Debes estar logueado para crear una obra.");
      setSubmitting(false);
      return;
    }

    if (!formData.num_carpeta.trim() || !formData.obra.trim() || !formData.mes || !formData.semana) {
      setFormError("Completa todos los campos obligatorios.");
      setSubmitting(false);
      return;
    }

    let urlImagen: string | null = editingOrden?.url_imagen ?? null;
    let urlMedicion: string | null = editingOrden?.url_medicion ?? null;

    if (imagenFiles.length > 0) {
      const { items, error } = await uploadImageFolder(supabase, imagenFiles, user.id, "corte");
      if (error) {
        setFormError(error);
        setSubmitting(false);
        return;
      }
      urlImagen = serializeImageItems(items);
    }

    if (medicionFiles.length > 0) {
      const { items, error } = await uploadImageFolder(supabase, medicionFiles, user.id, "medicion");
      if (error) {
        setFormError(error);
        setSubmitting(false);
        return;
      }
      urlMedicion = serializeImageItems(items);
    }

    if (editingOrden) {
      let updateQuery = supabase
        .from("ordenes_produccion")
        .update({
          num_carpeta: formData.num_carpeta.trim(),
          obra: formData.obra.trim(),
          mes: formData.mes,
          semana: formData.semana,
          alertas: formData.alertas.trim() || null,
          url_imagen: urlImagen,
          url_medicion: urlMedicion,
        })
        .eq("id", editingOrden.id);
      if (!canAccessOrdenesProduccion(user.email)) {
        updateQuery = updateQuery.eq("usuario_id", user.id);
      }
      const { error: updateError } = await updateQuery;

      if (updateError) {
        setFormError(`Error al actualizar: ${updateError.message}`);
        setSubmitting(false);
        return;
      }
      setFormSuccess("Obra actualizada correctamente.");
    } else {
      const { error: insertError } = await supabase
        .from("ordenes_produccion")
        .insert({
          num_carpeta: formData.num_carpeta.trim(),
          obra: formData.obra.trim(),
          mes: formData.mes,
          semana: formData.semana,
          alertas: formData.alertas.trim() || null,
          url_imagen: urlImagen,
          url_medicion: urlMedicion,
          usuario_id: user.id,
        });

      if (insertError) {
        setFormError(`Error al guardar: ${insertError.message}`);
        setSubmitting(false);
        return;
      }
      setFormSuccess("Obra creada correctamente.");
    }
    await fetchOrdenes();
    setSubmitting(false);
    setTimeout(handleCloseModal, 1500);
  };

  function formatDate(dateString: string | null): string {
    if (!dateString) return "-";
    const parts = dateString.split("T")[0].split("-");
    const year = parseInt(parts[0]);
    const month = parseInt(parts[1]) - 1;
    const day = parseInt(parts[2]);
    const date = new Date(year, month, day);
    return date.toLocaleDateString("es-AR");
  }

  function parseImageItems(urlImagen: string | null): { url: string; name: string }[] {
    if (!urlImagen || !urlImagen.trim()) return [];
    const trimmed = urlImagen.trim();
    if (trimmed.startsWith("[")) {
      try {
        const arr = JSON.parse(trimmed) as unknown;
        if (!Array.isArray(arr)) return [{ url: trimmed, name: "Imagen" }];
        return arr.map((item, i) => {
          if (typeof item === "object" && item !== null && "url" in item && "name" in item) {
            return { url: String((item as { url: unknown }).url), name: String((item as { name: unknown }).name) };
          }
          if (typeof item === "string") {
            const nameFromPath = item.split("/").pop()?.split("?")[0] || `Imagen ${i + 1}`;
            return { url: item, name: nameFromPath };
          }
          return { url: "", name: `Imagen ${i + 1}` };
        }).filter((x) => x.url);
      } catch {
        return [{ url: trimmed, name: trimmed.split("/").pop()?.split("?")[0] || "Imagen" }];
      }
    }
    const nameFromPath = trimmed.split("/").pop()?.split("?")[0] || "Imagen";
    return [{ url: trimmed, name: nameFromPath }];
  }

  function renderValue(value: unknown): string {
    if (
      value === null ||
      value === undefined ||
      (typeof value === "string" && value.trim() === "") ||
      value === ""
    ) {
      return "-";
    }
    return String(value);
  }

  const filteredOrdenes = ordenes.filter((orden) => {
    const s = search.trim().toLowerCase();
    if (s) {
      const matchSearch = Object.entries(orden).some(([key, value]) => {
        if (key === "usuario_id") return false;
        if (value === null || value === undefined) return false;
        return String(value).toLowerCase().includes(s);
      });
      if (!matchSearch) return false;
    }
    if (fechaDesde || fechaHasta) {
      const created = orden.created_at ? new Date(orden.created_at) : null;
      if (!created) return false;
      const fecha = created.toISOString().slice(0, 10);
      if (fechaDesde && fecha < fechaDesde) return false;
      if (fechaHasta && fecha > fechaHasta) return false;
    }
    return true;
  });

  const estadoObraTipologiasFiltradas = estadoObraTipologias
    .map((tipologia, idx) => ({ tipologia, idx }))
    .filter(({ tipologia }) => {
      const q = estadoObraFiltroTip.trim().toLowerCase();
      if (!q) return true;
      return (tipologia.nombre || "").toLowerCase().includes(q);
    });

  const renderFiltroTipologiaControls = () => (
    <div className="flex flex-wrap gap-x-3 gap-y-2 items-center">
      <input
        type="text"
        value={estadoObraFiltroTip}
        onChange={(e) => setEstadoObraFiltroTip(e.target.value)}
        placeholder="filt por tip"
        className="px-3 py-2 text-sm border border-gray-300 rounded-lg w-40 focus:outline-none focus:ring-2 focus:ring-amber-500"
      />
      {PROCESOS_FILTRO_ESTADO_OBRA.map(({ key, label }) => (
        <label key={key} className="flex items-center gap-1.5 text-sm cursor-pointer select-none">
          <input
            type="checkbox"
            checked={mostrarProcesosEstadoObra[key]}
            onChange={() =>
              setMostrarProcesosEstadoObra((prev) => ({ ...prev, [key]: !prev[key] }))
            }
            className="w-4 h-4 rounded border-gray-300 text-amber-600 focus:ring-amber-500"
          />
          <span className="text-gray-600 whitespace-nowrap" title={`Mostrar ${label}`}>
            {label}
          </span>
        </label>
      ))}
    </div>
  );

  const headerClass =
    "px-4 py-3 border-b border-blue-500 text-sm font-bold whitespace-nowrap text-center";
  const cellClass =
    "px-4 py-3 border-b border-gray-200 align-top text-sm text-center whitespace-pre-wrap break-words";

  const mobileBtnBase =
    "w-full min-h-[48px] px-4 py-3 text-base font-semibold rounded-xl shadow-sm transition active:scale-[0.98] touch-manipulation disabled:opacity-50 disabled:cursor-not-allowed";

  const selectMobileOrden = (id: string) => {
    setSelectedMobileOrdenId(id);
  };

  const renderArticulosProgress = (orden: OrdenProduccion) => {
    const { completed, total, percent } = getArticulosTerminadosProgress(orden.estado_obra);
    if (total === 0) return null;
    return (
      <div className="w-full rounded-lg bg-gray-50 p-3 border border-gray-100">
        <div className="flex justify-between text-xs text-gray-600 mb-1 font-medium">
          <span>Artículos terminados</span>
          <span>{percent}%</span>
        </div>
        <div className="h-2.5 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-emerald-500 transition-all duration-300 ease-out"
            style={{ width: `${percent}%` }}
          />
        </div>
        <span className="text-xs text-gray-500 mt-1 block">{completed}/{total}</span>
      </div>
    );
  };

  const renderOrdenImagenButtons = (orden: OrdenProduccion, mobile = false) => {
    const corteItems = parseImageItems(orden.url_imagen);
    const medicionItems = parseImageItems(orden.url_medicion ?? null);

    if (corteItems.length === 0 && medicionItems.length === 0) {
      return mobile ? (
        <span className="text-sm text-gray-400">Sin archivos</span>
      ) : (
        <span>-</span>
      );
    }

    const btn = mobile
      ? mobileBtnBase
      : "inline-block px-3 py-2 text-sm font-medium rounded-lg shadow-md transition-all duration-200";

    const openArchivosModal = (items: ImageItem[]) => {
      setArchivosModalItems(items);
      setShowArchivosModal(true);
    };

    return (
      <div className={mobile ? "flex flex-col gap-2" : "flex flex-col gap-2 items-center"}>
        {corteItems.length > 0 && (
          <>
            <button
              type="button"
              onClick={() => openArchivosModal(corteItems)}
              className={mobile ? `${btn} bg-blue-500 text-white hover:bg-blue-600` : `${btn} bg-blue-500 text-white hover:bg-blue-600`}
            >
              {mobile ? "Ver imágenes" : "Ver orden de corte"}
            </button>
            <button
              type="button"
              onClick={() => handleDownloadCarpeta(orden)}
              disabled={downloadingOrdenId === orden.id}
              className={mobile ? `${btn} bg-emerald-600 text-white hover:bg-emerald-700` : `${btn} bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {downloadingOrdenId === orden.id ? "⏳ Descargando..." : "📥 Descargar carpeta"}
            </button>
            {medicionItems.length > 0 && (
              <button
                type="button"
                onClick={() => openArchivosModal(medicionItems)}
                className={mobile ? `${btn} bg-blue-500 text-white hover:bg-blue-600` : `${btn} bg-blue-500 text-white hover:bg-blue-600`}
              >
                Ver medición
              </button>
            )}
            {!isTabletEmail(userEmail) && (
              <button
                type="button"
                onClick={() => handleEliminarCarpeta(orden)}
                disabled={deletingOrdenId === orden.id}
                className={mobile ? `${btn} bg-red-600 text-white hover:bg-red-700` : `${btn} bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {deletingOrdenId === orden.id ? "⏳ Eliminando..." : "🗑️ Eliminar carpeta"}
              </button>
            )}
          </>
        )}
        {corteItems.length === 0 && medicionItems.length > 0 && (
          <button
            type="button"
            onClick={() => openArchivosModal(medicionItems)}
            className={mobile ? `${btn} bg-blue-500 text-white hover:bg-blue-600` : `${btn} bg-blue-500 text-white hover:bg-blue-600`}
          >
            Ver medición
          </button>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <p className="text-gray-500">Cargando órdenes de producción...</p>
      </div>
    );
  }

  return (
    <div className="flex-1 w-full p-2 sm:p-4 bg-gray-50 min-h-screen">
      {/* Header con navegación */}
      <div className="bg-white rounded-lg shadow-md p-4 sm:p-6 mb-4 sm:mb-6">
        <div className="flex flex-col sm:flex-row flex-wrap gap-3 sm:gap-4 items-stretch sm:items-center justify-between mb-4">
          <Link
            href="/protected"
            className="inline-block px-4 sm:px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 transition-all duration-200 text-center touch-manipulation"
          >
            ← Home
          </Link>
          <h1 className="text-xl sm:text-3xl font-bold text-gray-800 text-center sm:text-left">🏭 Órdenes de Producción</h1>
        </div>
        <div className="flex flex-col sm:flex-row flex-wrap gap-3 sm:gap-4 items-stretch sm:items-center">
          {!isReadOnly && (
            <button
              type="button"
              onClick={() => {
                setEditingOrden(null);
                setFormData({ num_carpeta: "", obra: "", mes: "", semana: "", alertas: "" });
                setImagenFiles([]);
                setMedicionFiles([]);
                setFormError("");
                setFormSuccess("");
                setShowModal(true);
              }}
              className="w-full sm:w-auto inline-block px-6 py-3 bg-green-600 text-white font-semibold rounded-lg shadow-md hover:bg-green-700 transition-all duration-200 touch-manipulation min-h-[48px]"
            >
              ➕ Nueva obra
            </button>
          )}
          <input
            type="text"
            placeholder="🔍 Buscar por carpeta, obra, mes, semana..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="px-4 py-3 border-2 border-gray-300 rounded-lg w-full sm:max-w-md focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 transition-all duration-200 min-h-[48px]"
          />
          <div className="flex flex-wrap items-center gap-2">
            <label className="text-sm font-medium text-gray-600">Desde:</label>
            <input
              type="date"
              value={fechaDesde}
              onChange={(e) => setFechaDesde(e.target.value)}
              className="px-3 py-2 border-2 border-gray-300 rounded-lg text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
            />
            <label className="text-sm font-medium text-gray-600">Hasta:</label>
            <input
              type="date"
              value={fechaHasta}
              onChange={(e) => setFechaHasta(e.target.value)}
              className="px-3 py-2 border-2 border-gray-300 rounded-lg text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
            />
            {(fechaDesde || fechaHasta) && (
              <button
                type="button"
                onClick={() => { setFechaDesde(""); setFechaHasta(""); }}
                className="px-3 py-2 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Limpiar fechas
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={() => setShowProgresoModal(true)}
            className="w-full sm:w-auto px-4 py-3 bg-indigo-600 text-white font-semibold rounded-lg shadow-md hover:bg-indigo-700 transition-all duration-200 touch-manipulation min-h-[48px]"
            title="Ver barra de progreso de producción"
          >
            📊 Ver progreso de producción
          </button>
          {!isTabletEmail(userEmail) && (
            <div className="flex items-center gap-2">
              <select
                value={excelDownloadTipo}
                onChange={(e) => setExcelDownloadTipo(e.target.value)}
                className="px-4 py-3 border-2 border-gray-300 rounded-lg bg-white text-gray-700 font-medium focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 min-w-[280px]"
                title="Selecciona el tipo de descarga Excel"
              >
                <option value="">— Seleccionar descarga Excel —</option>
                <option value="articulos">Artículos terminados</option>
                <option value="procesos">Procesos terminados</option>
                <option value="operarios">Procesos terminados por operarios</option>
              </select>
              <button
                type="button"
                onClick={handleDescargarExcelSeleccionado}
                disabled={descargandoExcel || !excelDownloadTipo}
                className="px-4 py-3 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                title="Descargar el Excel seleccionado"
              >
                {descargandoExcel ? "⏳ Generando..." : "📥 Descargar"}
              </button>
            </div>
          )}
        </div>
      </div>

      {showProgresoModal && (
        <ProgresoProduccionModal
          ordenes={filteredOrdenes.map((o) => ({
            id: o.id,
            num_carpeta: o.num_carpeta,
            obra: o.obra,
            estado_obra: o.estado_obra,
            url_imagen: o.url_imagen,
            url_medicion: o.url_medicion,
          }))}
          onVerOrdenCorte={(orden) => {
            const items = parseImageItems(orden.url_imagen ?? null);
            if (items.length > 0) {
              setArchivosModalItems(items);
              setShowArchivosModal(true);
            }
          }}
          onVerMedicion={(orden) => {
            const items = parseImageItems(orden.url_medicion ?? null);
            if (items.length > 0) {
              setArchivosModalItems(items);
              setShowArchivosModal(true);
            }
          }}
          onVerEstadoObra={(orden: OrdenProgreso) => {
            const fullOrden = filteredOrdenes.find((o) => o.id === orden.id);
            if (fullOrden) void handleOpenEstadoObra(fullOrden, { soloVista: true });
          }}
          onClose={() => setShowProgresoModal(false)}
        />
      )}
      {showEstadoObraModal && estadoObraOrden && (
        <div
          className={`fixed inset-0 flex items-center justify-center bg-black/50 p-4 ${estadoObraModalSoloVista ? "z-[70]" : "z-[55]"}`}
          onClick={closeEstadoObraModal}
          role="presentation"
        >
          <div className="bg-white rounded-xl shadow-2xl max-w-5xl w-full max-h-[90vh] flex flex-col overflow-hidden p-6" onClick={(e) => e.stopPropagation()}>
            <div className="shrink-0 flex flex-wrap items-center justify-between gap-3 mb-4 pb-4 border-b border-gray-200">
              <h3 className="text-lg font-bold text-gray-800">
                Estado de obra: {estadoObraOrden.obra ?? estadoObraOrden.num_carpeta ?? "Obra"}
              </h3>
              <div className="flex items-center gap-2">
                {isTabletUser && updatingEstadoObra ? (
                  <span className="text-xs font-medium text-amber-600 animate-pulse">Guardando...</span>
                ) : null}
                {showEstadoObraActualizarEnModal && (
                <button
                  type="button"
                  onClick={handleUpdateEstadoObra}
                  disabled={updatingEstadoObra}
                  className="px-4 py-2 bg-amber-500 text-white font-semibold rounded-lg hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                >
                  {updatingEstadoObra ? "Actualizando..." : "Actualizar"}
                </button>
                )}
                <button
                  type="button"
                  onClick={closeEstadoObraModal}
                  disabled={updatingEstadoObra}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 text-sm"
                >
                  Cerrar
                </button>
              </div>
            </div>
            <p className="shrink-0 text-sm text-gray-500 mb-4">
              {estadoObraSoloVista ? "Vista de estados (solo visualización):" : tabletSoloMarcar ? "Marca los ítems y proceso terminado en cada etapa. Artículo terminado se activa al completar Armado y Junquillos. Solo producción/supervisores pueden desmarcar." : "Agrega tipologías y marca los ítems culminados por proceso en cada una:"}
            </p>
            {(canEditFullModalEnModal || estadoObraTipologias.length > 0) && (
              <div className="shrink-0 mb-4 pb-3 border-b border-gray-200 bg-white">
                {canEditFullModalEnModal && (
                  <div className="flex flex-wrap gap-2 items-center">
                    <button
                      type="button"
                      onClick={() => estadoObraFileInputRef.current?.click()}
                      disabled={importandoEstadoObra}
                      className="px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                    >
                      {importandoEstadoObra ? "Importando..." : "📤 Importar Excel"}
                    </button>
                    {estadoObraTipologias.length > 0 && (
                      <>
                        <button
                          type="button"
                          onClick={handleEliminarTodasTipologias}
                          disabled={updatingEstadoObra}
                          className="px-4 py-2 border border-red-300 text-red-600 font-semibold rounded-lg hover:bg-red-50 disabled:opacity-50 text-sm"
                          title="Eliminar todas las tipologías"
                        >
                          🗑️ Eliminar todas
                        </button>
                        {renderFiltroTipologiaControls()}
                      </>
                    )}
                    <input
                      ref={estadoObraFileInputRef}
                      type="file"
                      accept=".xlsx,.xls"
                      onChange={handleImportEstadoObraExcel}
                      className="hidden"
                    />
                  </div>
                )}
                {!canEditFullModalEnModal && estadoObraTipologias.length > 0 && renderFiltroTipologiaControls()}
              </div>
            )}
            <div className="flex-1 min-h-0 overflow-y-auto space-y-6 mb-4 pr-1">
              {estadoObraTipologiasFiltradas.length === 0 && estadoObraTipologias.length > 0 && estadoObraFiltroTip.trim() ? (
                <p className="text-sm text-gray-500 text-center py-4">No hay tipologías que coincidan con el filtro.</p>
              ) : null}
              {estadoObraTipologiasFiltradas.map(({ tipologia, idx }) => (
                <div key={idx} className="border-2 border-gray-200 rounded-lg p-4 bg-gray-50/50">
                  <div className="flex flex-col sm:flex-row sm:items-start gap-4 mb-3">
                    <div className="overflow-x-auto min-w-0 -mx-1 px-1">
                      <div className="grid gap-x-2 gap-y-2 w-full min-w-[980px] shrink-0" style={{ gridTemplateColumns: "minmax(56px, 1fr) minmax(72px, 1.25fr) repeat(12, minmax(34px, 0.68fr))" }}>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-gray-500 uppercase break-words leading-tight hyphens-auto" title="Tipología">Tip</p>
                        {editingTipologiaIdx === idx ? (
                          <input
                            type="text"
                            value={tipologia.nombre || ""}
                            onChange={(e) => {
                              setEstadoObraTipologias((prev) => {
                                const next = [...prev];
                                next[idx] = { ...next[idx], nombre: e.target.value };
                                return next;
                              });
                            }}
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded mt-0.5"
                            placeholder="Tipología"
                          />
                        ) : (
                          <p className="text-sm font-medium text-gray-800 truncate mt-0.5" title={tipologia.nombre}>{tipologia.nombre || "—"}</p>
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-gray-500 uppercase break-words leading-tight hyphens-auto" title="Descripción">Desc</p>
                        {editingTipologiaIdx === idx ? (
                          <input
                            type="text"
                            value={tipologia.descripcion ?? ""}
                            onChange={(e) => {
                              setEstadoObraTipologias((prev) => {
                                const next = [...prev];
                                next[idx] = { ...next[idx], descripcion: e.target.value || null };
                                return next;
                              });
                            }}
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded mt-0.5"
                            placeholder="Descripción"
                          />
                        ) : (
                          <p className="text-sm text-gray-700 truncate mt-0.5" title={tipologia.descripcion ?? ""}>{tipologia.descripcion || "—"}</p>
                        )}
                      </div>
                      {TIPOLOGIA_NUM_METRIC_COLS.map(({ k, title, abbrev }) => {
                        const inputVal = (() => {
                          if (k === "umbral_pvc") {
                            const v = tipologia.umbral_pvc ?? tipologia.umbral;
                            return v != null && !Number.isNaN(v) ? String(v) : "";
                          }
                          const v = tipologia[k];
                          return v != null && typeof v === "number" && !Number.isNaN(v) ? String(v) : "";
                        })();
                        const viewVal = inputVal || "—";
                        return (
                          <div key={k} className="min-w-0">
                            <p className="text-xs font-semibold text-gray-500 uppercase whitespace-nowrap" title={title}>{abbrev}</p>
                            {editingTipologiaIdx === idx ? (
                              <input
                                type="text"
                                value={inputVal}
                                onChange={(e) => {
                                  const v = parseNumExcel(e.target.value);
                                  setEstadoObraTipologias((prev) => {
                                    const next = [...prev];
                                    const cur = { ...next[idx] };
                                    if (k === "umbral_pvc") {
                                      cur.umbral_pvc = v;
                                      cur.umbral = null;
                                    } else {
                                      (cur as unknown as Record<string, number | null | undefined>)[k] = v;
                                    }
                                    next[idx] = cur;
                                    return next;
                                  });
                                }}
                                className="w-full px-1.5 py-1 text-sm border border-gray-300 rounded mt-0.5"
                                placeholder="—"
                              />
                            ) : (
                              <p className="text-sm text-gray-700 mt-0.5">{viewVal}</p>
                            )}
                          </div>
                        );
                      })}
                      {tipologia.columnas_extra &&
                        Object.entries(tipologia.columnas_extra).map(([colKey, colVal]) => (
                          <div key={colKey} className="min-w-0">
                            <p className="text-xs font-semibold text-gray-500 uppercase truncate" title={colKey}>
                              {colKey}
                            </p>
                            <p className="text-sm text-gray-700 mt-0.5">{colVal ?? "—"}</p>
                          </div>
                        ))}
                      {TIPOLOGIA_DIMENSION_COLS.map(({ k, title, abbrev }) => {
                        const v = tipologia[k];
                        const inputVal = v != null && typeof v === "number" && !Number.isNaN(v) ? String(v) : "";
                        const viewVal = inputVal || "—";
                        return (
                          <div key={k} className="min-w-0">
                            <p className="text-xs font-semibold text-gray-500 uppercase whitespace-nowrap" title={title}>{abbrev}</p>
                            {editingTipologiaIdx === idx ? (
                              <input
                                type="text"
                                value={inputVal}
                                onChange={(e) => {
                                  const num = parseNumExcel(e.target.value);
                                  setEstadoObraTipologias((prev) => {
                                    const next = [...prev];
                                    next[idx] = { ...next[idx], [k]: num };
                                    return next;
                                  });
                                }}
                                className="w-full px-1.5 py-1 text-sm border border-gray-300 rounded mt-0.5"
                                placeholder="—"
                              />
                            ) : (
                              <p className="text-sm text-gray-700 mt-0.5">{viewVal}</p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                    </div>
                    {canEditFullModalEnModal && (
                      <div className="flex flex-row sm:flex-col items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => setEditingTipologiaIdx(editingTipologiaIdx === idx ? null : idx)}
                          className="text-blue-600 hover:text-blue-800 text-sm px-2 py-1"
                          title="Editar características del artículo"
                        >
                          {editingTipologiaIdx === idx ? "✓ Listo" : "Editar"}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleEliminarTipologia(idx)}
                          className="text-red-500 hover:text-red-700 text-sm px-2 py-1"
                          title="Eliminar tipología"
                        >
                          ✕ Eliminar
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="space-y-3">
                    {(() => {
                      const articuloTerminadoParaTipologia = !!estadoObraArticuloTerminado[String(idx)];
                      const tabletBloqueadoPorArticulo = tabletSoloMarcar && articuloTerminadoParaTipologia;
                      const canEditParaTipologia = canEditCheckboxesEnModal && !tabletBloqueadoPorArticulo;
                      return (
                    <>
                    {getProcesosConItemsParaTipologia(tipologia)
                      .filter((proceso) => mostrarProcesosEstadoObra[proceso as keyof MostrarProcesosEstadoObra])
                      .map((proceso) => {
                      const items = getCheckboxItemsForTipologia(tipologia, proceso);
                      const itemGroups = getCheckboxItemGroupsForTipologia(tipologia, proceso);
                      return (
                      <div key={proceso} className="border border-gray-200 rounded p-2 bg-white">
                        <h5 className="font-medium text-gray-700 text-sm mb-1">{proceso}</h5>
                        <div className="flex flex-wrap gap-x-4 gap-y-3 items-start">
                          {itemGroups.map((group) => (
                            <div key={group.groupKey} className="flex flex-col min-w-[6.5rem] shrink-0">
                              {group.items.length > 1 ? (
                                <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1.5 px-0.5">
                                  {group.groupLabel}
                                </p>
                              ) : null}
                              <ul className="flex flex-col gap-2">
                                {group.items.map((item) => {
                            const key = `${idx}${ESTADO_OBRA_KEY_SEP}${proceso}${ESTADO_OBRA_KEY_SEP}${item}`;
                            const fecha = estadoObraFechas[key] ?? "";
                            const checked = key in estadoObraFechas;
                            return (
                              <li key={key} className="flex flex-col">
                                <div className="flex items-center gap-1.5">
                                  <label className={`flex items-center gap-1.5 ${canEditParaTipologia ? "cursor-pointer" : "cursor-not-allowed opacity-70"}`} title={estadoObraSoloVista ? "Solo visualización" : tabletBloqueadoPorArticulo ? "Artículo ya marcado como terminado por supervisor" : tabletSoloMarcar ? "Puedes marcar; solo producción/supervisores pueden desmarcar" : undefined}>
                                    <input
                                      type="checkbox"
                                      checked={checked}
                                      disabled={!canEditParaTipologia}
                                      onChange={(e) => {
                                        if (e.target.checked && !confirmActivarCheckboxEstadoObra()) return;
                                        estadoObraUserEditedRef.current = true;
                                        if (e.target.checked) {
                                          estadoObraRemovedKeysRef.current.delete(key);
                                          setEstadoObraFechas((prev) => ({
                                            ...prev,
                                            [key]: new Date().toISOString(),
                                          }));
                                          const ini = userInicialesRef.current;
                                          if (ini) {
                                            setEstadoObraInicialesPorItem((prev) => ({
                                              ...prev,
                                              [key]: ini,
                                            }));
                                          }
                                        } else {
                                          if (tabletSoloMarcar) return;
                                          estadoObraRemovedKeysRef.current.add(key);
                                          setEstadoObraFechas((prev) => {
                                            const next = { ...prev };
                                            delete next[key];
                                            return next;
                                          });
                                          setEstadoObraInicialesPorItem((prev) => {
                                            const next = { ...prev };
                                            delete next[key];
                                            return next;
                                          });
                                        }
                                      }}
                                      className="w-3.5 h-3.5 rounded border-gray-300 text-amber-600 focus:ring-amber-500 shrink-0"
                                    />
                                    <span className="text-xs whitespace-nowrap">{item}</span>
                                  </label>
                                  {checked && estadoObraInicialesPorItem[key] ? (
                                    <span
                                      className="inline-flex min-w-[2.75rem] items-center justify-center px-1 py-0.5 text-xs font-semibold text-amber-800 bg-amber-50 border border-amber-200 rounded uppercase shrink-0"
                                      title="Marcado por"
                                    >
                                      {estadoObraInicialesPorItem[key]}
                                    </span>
                                  ) : null}
                                </div>
                                <span
                                  className="text-xs text-gray-500 mt-0.5 ml-5 min-h-[1rem]"
                                  title={fecha}
                                >
                                  {checked ? formatFechaISO(fecha) : ""}
                                </span>
                              </li>
                            );
                                })}
                              </ul>
                            </div>
                          ))}
                        </div>
                        <div className="mt-2 pt-2 border-t border-gray-100 flex items-center gap-2">
                          {(() => {
                            const alMenosUnoMarcado = items.some((item) => {
                              const k = `${idx}${ESTADO_OBRA_KEY_SEP}${proceso}${ESTADO_OBRA_KEY_SEP}${item}`;
                              return k in estadoObraFechas;
                            });
                            const todosMarcados = items.length > 0 && items.every((item) => {
                              const k = `${idx}${ESTADO_OBRA_KEY_SEP}${proceso}${ESTADO_OBRA_KEY_SEP}${item}`;
                              return k in estadoObraFechas;
                            });
                            const terminadoDisabled = !canEditParaTipologia || !alMenosUnoMarcado;
                            const handleMarcarTodoCorte = (checked: boolean) => {
                              if (checked && !confirmActivarCheckboxEstadoObra()) return;
                              estadoObraUserEditedRef.current = true;
                              if (checked) {
                                const now = new Date().toISOString();
                                const ini = userInicialesRef.current;
                                setEstadoObraFechas((prev) => {
                                  const next = { ...prev };
                                  for (const item of items) {
                                    const k = `${idx}${ESTADO_OBRA_KEY_SEP}${proceso}${ESTADO_OBRA_KEY_SEP}${item}`;
                                    estadoObraRemovedKeysRef.current.delete(k);
                                    if (!(k in next)) next[k] = now;
                                  }
                                  return next;
                                });
                                if (ini) {
                                  setEstadoObraInicialesPorItem((prev) => {
                                    const next = { ...prev };
                                    for (const item of items) {
                                      const k = `${idx}${ESTADO_OBRA_KEY_SEP}${proceso}${ESTADO_OBRA_KEY_SEP}${item}`;
                                      if (!(k in next)) next[k] = ini;
                                    }
                                    return next;
                                  });
                                }
                              } else {
                                if (tabletSoloMarcar) return;
                                setEstadoObraFechas((prev) => {
                                  const next = { ...prev };
                                  for (const item of items) {
                                    const k = `${idx}${ESTADO_OBRA_KEY_SEP}${proceso}${ESTADO_OBRA_KEY_SEP}${item}`;
                                    estadoObraRemovedKeysRef.current.add(k);
                                    delete next[k];
                                  }
                                  return next;
                                });
                                setEstadoObraInicialesPorItem((prev) => {
                                  const next = { ...prev };
                                  for (const item of items) {
                                    const k = `${idx}${ESTADO_OBRA_KEY_SEP}${proceso}${ESTADO_OBRA_KEY_SEP}${item}`;
                                    delete next[k];
                                  }
                                  return next;
                                });
                              }
                            };
                            return (
                            <>
                          {proceso === "CORTE" && (
                            <label
                              className={`flex items-center gap-1.5 ${canEditParaTipologia ? "cursor-pointer" : "cursor-not-allowed opacity-70"}`}
                              title={estadoObraSoloVista ? "Solo visualización" : tabletBloqueadoPorArticulo ? "Artículo ya marcado como terminado por supervisor" : tabletSoloMarcar ? "Marca todos los ítems; solo producción/supervisores pueden desmarcar" : undefined}
                            >
                              <input
                                type="checkbox"
                                checked={todosMarcados}
                                disabled={!canEditParaTipologia || items.length === 0}
                                onChange={(e) => handleMarcarTodoCorte(e.target.checked)}
                                className="w-3.5 h-3.5 rounded border-gray-300 text-amber-600 focus:ring-amber-500"
                              />
                              <span className="text-xs font-medium">Marcar todo</span>
                            </label>
                          )}
                          <label className={`flex items-center gap-1.5 ${!terminadoDisabled ? "cursor-pointer" : "cursor-not-allowed opacity-70"}`} title={terminadoDisabled ? (estadoObraSoloVista ? "Solo visualización" : tabletBloqueadoPorArticulo ? "Artículo ya marcado como terminado por supervisor" : canEditParaTipologia ? "Marque al menos un paso del proceso primero" : undefined) : tabletSoloMarcar ? "Puedes marcar; solo producción/supervisores pueden desmarcar" : undefined}>
                            <input
                              type="checkbox"
                              checked={!!estadoObraTerminado[`${idx}${ESTADO_OBRA_KEY_SEP}${proceso}`]}
                              disabled={terminadoDisabled}
                              onChange={(e) => {
                                if (e.target.checked && !confirmActivarCheckboxEstadoObra()) return;
                                estadoObraUserEditedRef.current = true;
                                const key = `${idx}${ESTADO_OBRA_KEY_SEP}${proceso}`;
                                if (!e.target.checked && tabletSoloMarcar) return;
                                setEstadoObraTerminado((prev) => ({
                                  ...prev,
                                  [key]: e.target.checked,
                                }));
                                if (e.target.checked) {
                                  const ini = userInicialesRef.current;
                                  if (ini) {
                                    setEstadoObraIniciales((prev) => ({
                                      ...prev,
                                      [key]: ini,
                                    }));
                                  }
                                } else {
                                  setEstadoObraIniciales((prev) => {
                                    const next = { ...prev };
                                    delete next[key];
                                    return next;
                                  });
                                }
                              }}
                              className="w-3.5 h-3.5 rounded border-gray-300 text-green-600 focus:ring-green-500"
                            />
                            <span className="text-xs font-medium">Proceso terminado</span>
                          </label>
                          {estadoObraTerminado[`${idx}${ESTADO_OBRA_KEY_SEP}${proceso}`] &&
                          estadoObraIniciales[`${idx}${ESTADO_OBRA_KEY_SEP}${proceso}`] ? (
                            <span
                              className="inline-flex min-w-[2.75rem] items-center justify-center px-1.5 py-0.5 text-xs font-semibold text-green-800 bg-green-50 border border-green-200 rounded uppercase"
                              title="Marcado por"
                            >
                              {estadoObraIniciales[`${idx}${ESTADO_OBRA_KEY_SEP}${proceso}`]}
                            </span>
                          ) : null}
                            </>
                            );
                          })()}
                        </div>
                        {(() => {
                          const procesoObsKey = `${idx}${ESTADO_OBRA_KEY_SEP}${proceso}`;
                          const procesoObsItems = estadoObraObservaciones[procesoObsKey] ?? [];
                          return (
                            <ObservacionesAcumulativas
                              items={procesoObsItems}
                              canEdit={canEditParaTipologia && !estadoObraSoloVista}
                              canDelete={canDeleteObservaciones && !estadoObraSoloVista}
                              className="mt-2"
                              onAdd={(texto) => {
                                estadoObraUserEditedRef.current = true;
                                const nueva = crearObservacionRegistro(texto, userInicialesRef.current);
                                setEstadoObraObservaciones((prev) => ({
                                  ...prev,
                                  [procesoObsKey]: [...(prev[procesoObsKey] ?? []), nueva],
                                }));
                              }}
                              onDelete={(obsIndex) => {
                                estadoObraUserEditedRef.current = true;
                                setEstadoObraObservaciones((prev) => {
                                  const lista = prev[procesoObsKey] ?? [];
                                  const item = lista[obsIndex];
                                  if (item) {
                                    estadoObraObservacionesRemovedRef.current.add(
                                      observacionObraFingerprint(procesoObsKey, item)
                                    );
                                  }
                                  return {
                                    ...prev,
                                    [procesoObsKey]: lista.filter((_, i) => i !== obsIndex),
                                  };
                                });
                              }}
                            />
                          );
                        })()}
                      </div>
                    );
                    })}
                    </>
                    );
                    })()}
                  </div>
                  <div className="mt-3 pt-3 border-t-2 border-amber-200 bg-amber-50/50 rounded p-2">
                    {(() => {
                      const todosProcesosTerminados = areAllProcesosTerminadosParaTipologia(
                        idx,
                        tipologia,
                        estadoObraTerminado,
                        ESTADO_OBRA_KEY_SEP
                      );
                      const articuloKey = String(idx);
                      return (
                        <div>
                        <div className="flex items-center gap-2">
                          <label
                            className="flex items-center gap-1.5 cursor-default"
                            title={todosProcesosTerminados ? "Se activa automáticamente cuando Armado y Junquillos están terminados" : "Marque Armado y Junquillos como procesos terminados"}
                          >
                            <input
                              type="checkbox"
                              checked={todosProcesosTerminados}
                              readOnly
                              tabIndex={-1}
                              className="w-3.5 h-3.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 pointer-events-none"
                            />
                            <span className="text-xs font-semibold">Artículo terminado</span>
                          </label>
                        </div>
                        <ObservacionesAcumulativas
                          items={estadoObraArticuloObservaciones[articuloKey] ?? []}
                          canEdit={canEditObservacionesEnModal}
                          canDelete={canDeleteObservaciones && !estadoObraSoloVista}
                          className="mt-2"
                          onAdd={(texto) => {
                            estadoObraUserEditedRef.current = true;
                            const nueva = crearObservacionRegistro(texto, userInicialesRef.current);
                            setEstadoObraArticuloObservaciones((prev) => ({
                              ...prev,
                              [articuloKey]: [...(prev[articuloKey] ?? []), nueva],
                            }));
                          }}
                          onDelete={(obsIndex) => {
                            estadoObraUserEditedRef.current = true;
                            setEstadoObraArticuloObservaciones((prev) => {
                              const lista = prev[articuloKey] ?? [];
                              const item = lista[obsIndex];
                              if (item) {
                                estadoObraObservacionesRemovedRef.current.add(
                                  observacionObraFingerprint(articuloKey, item)
                                );
                              }
                              return {
                                ...prev,
                                [articuloKey]: lista.filter((_, i) => i !== obsIndex),
                              };
                            });
                          }}
                        />
                        </div>
                      );
                    })()}
                  </div>
                </div>
              ))}
              {canEditFullModalEnModal && (mostrarAgregarTipologia ? (
                <div className="border-2 border-dashed border-amber-400 rounded-lg p-3 bg-amber-50/50">
                  <input
                    type="text"
                    value={nuevaTipologiaNombre}
                    onChange={(e) => setNuevaTipologiaNombre(e.target.value)}
                    placeholder="Nombre de la tipología"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm mb-2"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleAgregarTipologia();
                      if (e.key === "Escape") setMostrarAgregarTipologia(false);
                    }}
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={handleAgregarTipologia}
                      className="px-3 py-1.5 bg-amber-500 text-white text-sm rounded-lg hover:bg-amber-600"
                    >
                      Agregar
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setMostrarAgregarTipologia(false);
                        setNuevaTipologiaNombre("");
                      }}
                      className="px-3 py-1.5 border border-gray-300 text-sm rounded-lg hover:bg-gray-50"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setMostrarAgregarTipologia(true)}
                  className="w-full py-3 border-2 border-dashed border-amber-400 text-amber-600 rounded-lg hover:bg-amber-50 font-medium"
                >
                  ➕ Agregar tipología
                </button>
              ))}
            </div>
            <div className="shrink-0 flex gap-3 pt-3 border-t border-gray-200 bg-white">
              {showEstadoObraActualizarEnModal && (
              <button
                type="button"
                onClick={handleUpdateEstadoObra}
                disabled={updatingEstadoObra}
                className="flex-1 px-4 py-2 bg-amber-500 text-white font-semibold rounded-lg hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {updatingEstadoObra ? "Actualizando..." : "Actualizar"}
              </button>
              )}
              <button
                type="button"
                onClick={closeEstadoObraModal}
                disabled={updatingEstadoObra}
                className={`px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 ${showEstadoObraActualizarEnModal ? "" : "flex-1"}`}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {showArchivosModal && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4"
          onClick={() => setShowArchivosModal(false)}
          role="presentation"
        >
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full max-h-[80vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="p-4 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-lg font-bold text-gray-800">Archivos</h3>
              <button
                type="button"
                onClick={() => setShowArchivosModal(false)}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                aria-label="Cerrar"
              >
                ✕
              </button>
            </div>
            <div className="p-4 overflow-y-auto flex-1">
              <ul className="space-y-2">
                {archivosModalItems.map((item, i) => (
                  <li key={i}>
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block px-3 py-2 rounded-lg hover:bg-blue-50 text-blue-600 hover:text-blue-800 font-medium transition-colors break-words"
                      title={item.name}
                    >
                      {item.name}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={handleCloseModal}
          role="presentation"
        >
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4">
                {editingOrden ? "Editar obra" : "Crear nueva obra"}
              </h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="num_carpeta" className="block text-sm font-medium text-gray-700 mb-1">
                    Número de carpeta *
                  </label>
                  <input
                    id="num_carpeta"
                    type="text"
                    value={formData.num_carpeta}
                    onChange={(e) => setFormData((p) => ({ ...p, num_carpeta: e.target.value }))}
                    className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-200 focus:border-blue-500"
                    placeholder="Ej: 001"
                  />
                </div>
                <div>
                  <label htmlFor="obra" className="block text-sm font-medium text-gray-700 mb-1">
                    Nombre de la obra *
                  </label>
                  <input
                    id="obra"
                    type="text"
                    value={formData.obra}
                    onChange={(e) => setFormData((p) => ({ ...p, obra: e.target.value }))}
                    className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-200 focus:border-blue-500"
                    placeholder="Nombre de la obra"
                  />
                </div>
                <div>
                  <label htmlFor="mes" className="block text-sm font-medium text-gray-700 mb-1">
                    Mes *
                  </label>
                  <select
                    id="mes"
                    value={formData.mes}
                    onChange={(e) => setFormData((p) => ({ ...p, mes: e.target.value }))}
                    className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-200 focus:border-blue-500"
                  >
                    <option value="">Seleccionar mes</option>
                    {MESES.map((m) => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="semana" className="block text-sm font-medium text-gray-700 mb-1">
                    Semana del mes *
                  </label>
                  <select
                    id="semana"
                    value={formData.semana}
                    onChange={(e) => setFormData((p) => ({ ...p, semana: e.target.value }))}
                    className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-200 focus:border-blue-500"
                  >
                    <option value="">Seleccionar semana</option>
                    {SEMANAS.map((s) => (
                      <option key={s} value={s}>Semana {s}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="alertas" className="block text-sm font-medium text-gray-700 mb-1">
                    Alertas
                  </label>
                  <input
                    id="alertas"
                    type="text"
                    value={formData.alertas}
                    onChange={(e) => setFormData((p) => ({ ...p, alertas: e.target.value }))}
                    className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-200 focus:border-blue-500"
                    placeholder="Texto de alertas"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Orden de corte (carpeta o varios archivos) {editingOrden && "(dejar vacío para mantener las actuales)"}
                  </label>
                  <div className="flex flex-wrap gap-2">
                    <label className="inline-flex items-center px-3 py-2 border-2 border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 file:mr-2 file:py-1 file:px-3 file:rounded file:border-0 file:bg-blue-100 file:text-blue-800">
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handleImagenesSueltasChange}
                        className="hidden"
                      />
                      📁 Seleccionar archivos
                    </label>
                    <label className="inline-flex items-center px-3 py-2 border-2 border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 file:mr-2 file:py-1 file:px-3 file:rounded file:border-0 file:bg-blue-100 file:text-blue-800">
                      <input
                        type="file"
                        accept="image/*"
                        {...({ webkitdirectory: "", directory: "" } as React.InputHTMLAttributes<HTMLInputElement>)}
                        onChange={handleCarpetaOrdenCorteChange}
                        className="hidden"
                      />
                      📂 Cargar carpeta orden de corte
                    </label>
                  </div>
                  {imagenFiles.length > 0 && (
                    <p className="text-xs text-gray-500 mt-1">
                      {imagenFiles.length} imagen{imagenFiles.length !== 1 ? "es" : ""} de corte seleccionada{imagenFiles.length !== 1 ? "s" : ""}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Medición (PDF o JPG) {editingOrden && "(dejar vacío para mantener las actuales)"}
                  </label>
                  <div className="flex flex-wrap gap-2">
                    <label className="inline-flex items-center px-3 py-2 border-2 border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 file:mr-2 file:py-1 file:px-3 file:rounded file:border-0 file:bg-purple-100 file:text-purple-800">
                      <input
                        type="file"
                        accept=".pdf,.jpg,.jpeg,application/pdf,image/jpeg"
                        multiple
                        onChange={handleMedicionArchivosSueltosChange}
                        className="hidden"
                      />
                      📁 Seleccionar archivos
                    </label>
                    <label className="inline-flex items-center px-3 py-2 border-2 border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 file:mr-2 file:py-1 file:px-3 file:rounded file:border-0 file:bg-purple-100 file:text-purple-800">
                      <input
                        type="file"
                        accept=".pdf,.jpg,.jpeg,application/pdf,image/jpeg"
                        {...({ webkitdirectory: "", directory: "" } as React.InputHTMLAttributes<HTMLInputElement>)}
                        onChange={handleCarpetaMedicionChange}
                        className="hidden"
                      />
                      📂 Cargar carpeta de medición
                    </label>
                  </div>
                  {medicionFiles.length > 0 && (
                    <p className="text-xs text-gray-500 mt-1">
                      {medicionFiles.length} archivo{medicionFiles.length !== 1 ? "s" : ""} de medición seleccionado{medicionFiles.length !== 1 ? "s" : ""}
                    </p>
                  )}
                </div>
                {formError && (
                  <p className="text-sm text-red-600">{formError}</p>
                )}
                {formSuccess && (
                  <p className="text-sm text-green-600">{formSuccess}</p>
                )}
                <div className="flex gap-3 pt-2">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 px-4 py-2 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {submitting ? "Guardando..." : editingOrden ? "Actualizar" : "Guardar"}
                  </button>
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    disabled={submitting}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <OrdenesProduccionMobileList
          ordenes={filteredOrdenes}
          selectedId={selectedMobileOrdenId}
          onSelect={selectMobileOrden}
          onClearSelection={() => setSelectedMobileOrdenId(null)}
          renderValue={renderValue}
          formatDate={formatDate}
          showAccionesColumn={showAccionesColumn}
          isTabletUser={isTabletEmail(userEmail)}
          mobileBtnBase={mobileBtnBase}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onOpenEstado={handleOpenEstadoObra}
          renderProgress={renderArticulosProgress}
          renderImagenButtons={(orden) => renderOrdenImagenButtons(orden, true)}
          estadoSummary={(orden) => formatEstadoObraSummary(parseEstadoObra(orden.estado_obra))}
          renderObraCell={(orden) => (
            <ObraConObservaciones
              orden={orden}
              canEdit={canEditObservaciones}
              canDelete={canDeleteObservaciones}
              onSave={handleSaveObservaciones}
              onDelete={handleDeleteObservacion}
              renderValue={renderValue}
            />
          )}
        />
        <div className="hidden lg:block overflow-x-auto">
          <table className="min-w-full table-auto border-collapse">
            <thead className="bg-gradient-to-r from-blue-600 to-blue-700 text-white">
            <tr>
              {showAccionesColumn && <th className={headerClass}>Acciones</th>}
              <th className={headerClass}>Fecha</th>
              <th className={headerClass}>Nº Carpeta</th>
              <th className={headerClass}>Obra</th>
              <th className={headerClass}>Mes</th>
              <th className={headerClass}>Semana</th>
              <th className={headerClass}>Alertas</th>
              <th className={headerClass}>Estado de obra</th>
              <th className={headerClass}>Imagen</th>
            </tr>
          </thead>
          <tbody>
            {filteredOrdenes.length === 0 ? (
              <tr>
                <td
                  colSpan={showAccionesColumn ? 9 : 8}
                  className="px-4 py-8 text-center text-gray-500"
                >
                  No hay órdenes de producción registradas.
                </td>
              </tr>
            ) : (
              filteredOrdenes.map((orden) => (
                <tr key={orden.id} className="hover:bg-gray-50 transition-colors duration-200">
                  {showAccionesColumn && (
                    <td className={cellClass}>
                      <div className="flex flex-col gap-2 items-center">
                        {!isTabletEmail(userEmail) && (
                          <>
                            <button
                              type="button"
                              onClick={() => handleEdit(orden)}
                              className="px-3 py-2 bg-blue-500 text-white font-medium rounded-lg shadow-md hover:bg-blue-600 transition-all duration-200 transform hover:scale-105 text-sm"
                            >
                              ✏️ Editar
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(orden)}
                              className="px-3 py-2 bg-red-500 text-white font-medium rounded-lg shadow-md hover:bg-red-600 transition-all duration-200 transform hover:scale-105 text-sm"
                            >
                              🗑️ Eliminar
                            </button>
                          </>
                        )}
                        {(() => {
                          const { completed, total, percent } = getArticulosTerminadosProgress(orden.estado_obra);
                          if (total === 0) return null;
                          return (
                            <div className="w-full min-w-[80px] mt-1">
                              <div className="flex justify-between text-xs text-gray-500 mb-0.5">
                                <span>Artículos terminados</span>
                                <span>{percent}%</span>
                              </div>
                              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-emerald-500 transition-all duration-300 ease-out"
                                  style={{ width: `${percent}%` }}
                                />
                              </div>
                              <span className="text-xs text-gray-400">{completed}/{total}</span>
                            </div>
                          );
                        })()}
                      </div>
                    </td>
                  )}
                  <td className={cellClass}>{formatDate(orden.created_at)}</td>
                  <td className={cellClass}>
                    {renderValue(orden.num_carpeta)}
                  </td>
                  <td className={cellClass}>
                    <ObraConObservaciones
                      orden={orden}
                      canEdit={canEditObservaciones}
                      canDelete={canDeleteObservaciones}
                      onSave={handleSaveObservaciones}
                      onDelete={handleDeleteObservacion}
                      renderValue={renderValue}
                    />
                  </td>
                  <td className={cellClass}>{renderValue(orden.mes)}</td>
                  <td className={cellClass}>{renderValue(orden.semana)}</td>
                  <td className={cellClass}>
                    {orden.alertas ? (
                      <span className="text-red-600 font-medium">{renderValue(orden.alertas)}</span>
                    ) : (
                      "-"
                    )}
                  </td>
                  <td className={cellClass}>
                    <button
                      type="button"
                      onClick={() => handleOpenEstadoObra(orden)}
                      className="inline-block px-3 py-2 bg-amber-500 text-white font-medium rounded-lg shadow-md hover:bg-amber-600 transition-all duration-200 text-sm"
                      title="Estado de obra"
                    >
                      📋 Estado
                    </button>
                    {(() => {
                      const data = parseEstadoObra(orden.estado_obra);
                      const summary = formatEstadoObraSummary(data);
                      return summary ? (
                        <span className="ml-1 text-xs text-gray-500 block mt-1" title={summary}>
                          {summary.length > 50 ? `${summary.slice(0, 47)}...` : summary}
                        </span>
                      ) : null;
                    })()}
                  </td>
                  <td className={cellClass}>
                    {renderOrdenImagenButtons(orden, false)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  );
}
