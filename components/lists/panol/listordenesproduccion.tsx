"use client";

import React, { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { canAccessOrdenesProduccion, isAdminEmail, isAprobEmail, isPanolEmail, isProduccionEmail, isTabletEmail } from "@/lib/panol-access";
import JSZip from "jszip";
import * as XLSX from "xlsx";

const ESTADO_OBRA_KEY_SEP = "::";

const ESTADOS_OBRA_STRUCTURE: Record<string, readonly string[]> = {
  CORTE: ["Marco", "Marco Adicional", "Hojas", "Guia Mosquitero"],
  MECANIZADO: ["Marco", "Marco Adicional", "Hojas", "Guia Mosquitero"],
  SOLDADURA: ["Marco", "Hojas", "Guia Mosquitero"],
  ARMADO: ["Marco", "Marco Adicional", "Hojas", "Guia Mosquitero"],
  JUNQUILLOS: ["Marco", "Hoja", "Hoja Mq"],
} as const;

// proceso -> item -> fecha (ISO string). Si está vacío = sin fecha (datos antiguos)
type EstadoObraData = Record<string, Record<string, string>>;

type TipologiaItem = {
  nombre: string;
  estados: EstadoObraData;
  descripcion?: string | null;
  hojas?: number | null;
  guias?: number | null;
  mosq?: string | null;
  umbral?: string | null;
  ancho?: number | null;
  alto?: number | null;
};

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
          hojas: parseNumFromDb(t.hojas),
          guias: parseNumFromDb(t.guias),
          mosq: typeof t.mosq === "string" ? t.mosq.trim() || null : null,
          umbral: typeof t.umbral === "string" ? t.umbral.trim() || null : null,
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
            hojas: parseNumFromDb(t.hojas),
            guias: parseNumFromDb(t.guias),
            mosq: typeof t.mosq === "string" ? t.mosq.trim() || null : null,
            umbral: typeof t.umbral === "string" ? t.umbral.trim() || null : null,
            ancho: parseNumFromDb(t.ancho),
            alto: parseNumFromDb(t.alto),
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
  url_imagen: string | null;
  usuario_id: string | null;
  estado_obra?: unknown;
};

const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
];

const SEMANAS = ["1", "2", "3", "4", "5"];

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
  });
  const [imagenFiles, setImagenFiles] = useState<File[]>([]);
  const [showArchivosModal, setShowArchivosModal] = useState(false);
  const [archivosModalItems, setArchivosModalItems] = useState<{ url: string; name: string }[]>([]);
  const [isReadOnly, setIsReadOnly] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [downloadingOrdenId, setDownloadingOrdenId] = useState<string | null>(null);
  const [descargandoTerminados, setDescargandoTerminados] = useState(false);
  const [descargandoProcesosTerminados, setDescargandoProcesosTerminados] = useState(false);
  const [showEstadoObraModal, setShowEstadoObraModal] = useState(false);
  const [estadoObraOrden, setEstadoObraOrden] = useState<OrdenProduccion | null>(null);
  const [estadoObraTipologias, setEstadoObraTipologias] = useState<TipologiaItem[]>([]);
  const [estadoObraFechas, setEstadoObraFechas] = useState<Record<string, string>>({});
  const [estadoObraTerminado, setEstadoObraTerminado] = useState<Record<string, boolean>>({});
  const [estadoObraIniciales, setEstadoObraIniciales] = useState<Record<string, string>>({});
  const [estadoObraArticuloTerminado, setEstadoObraArticuloTerminado] = useState<Record<string, boolean>>({});
  const [estadoObraArticuloIniciales, setEstadoObraArticuloIniciales] = useState<Record<string, string>>({});
  const [nuevaTipologiaNombre, setNuevaTipologiaNombre] = useState("");
  const [mostrarAgregarTipologia, setMostrarAgregarTipologia] = useState(false);
  const [updatingEstadoObra, setUpdatingEstadoObra] = useState(false);
  const [importandoEstadoObra, setImportandoEstadoObra] = useState(false);
  const estadoObraFileInputRef = React.useRef<HTMLInputElement>(null);
  const estadoObraInicialRef = React.useRef<{ tipologias: TipologiaItem[]; fechas: Record<string, string> } | null>(null);
  const estadoObraTipologiasRef = React.useRef(estadoObraTipologias);
  const estadoObraFechasRef = React.useRef(estadoObraFechas);
  const estadoObraTerminadoRef = React.useRef(estadoObraTerminado);
  const estadoObraInicialesRef = React.useRef(estadoObraIniciales);
  const estadoObraArticuloTerminadoRef = React.useRef(estadoObraArticuloTerminado);
  const estadoObraArticuloInicialesRef = React.useRef(estadoObraArticuloIniciales);
  estadoObraTipologiasRef.current = estadoObraTipologias;
  estadoObraFechasRef.current = estadoObraFechas;
  estadoObraTerminadoRef.current = estadoObraTerminado;
  estadoObraInicialesRef.current = estadoObraIniciales;
  estadoObraArticuloTerminadoRef.current = estadoObraArticuloTerminado;
  estadoObraArticuloInicialesRef.current = estadoObraArticuloIniciales;
  const soloVista = isPanolEmail(userEmail) || isAprobEmail(userEmail);
  const canEditCheckboxes = isProduccionEmail(userEmail) || isAdminEmail(userEmail) || isTabletEmail(userEmail);
  const canEditArticuloTerminado = isProduccionEmail(userEmail) || isAdminEmail(userEmail);
  const canEditFullModal = isProduccionEmail(userEmail) || isAdminEmail(userEmail);
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

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingOrden(null);
    setFormData({ num_carpeta: "", obra: "", mes: "", semana: "" });
    setImagenFiles([]);
    setFormError("");
    setFormSuccess("");
  };

  const handleEdit = (orden: OrdenProduccion) => {
    setEditingOrden(orden);
    setFormData({
      num_carpeta: orden.num_carpeta ?? "",
      obra: orden.obra ?? "",
      mes: orden.mes ?? "",
      semana: orden.semana ?? "",
    });
    setImagenFiles([]);
    setFormError("");
    setFormSuccess("");
    setShowModal(true);
  };

  const handleOpenEstadoObra = async (orden: OrdenProduccion) => {
    setEstadoObraOrden(orden);
    setShowEstadoObraModal(true);
    // Obtener datos frescos de la DB para asegurar que estado_obra esté actualizado
    const { data: fresh } = await supabase
      .from("ordenes_produccion")
      .select("estado_obra")
      .eq("id", orden.id)
      .single();
    const rawEstado = fresh?.estado_obra ?? orden.estado_obra;
    const parsed = parseEstadoObra(rawEstado);
    const { tipologias, _backup } = parsed;
    const fechas: Record<string, string> = {};
    const terminado: Record<string, boolean> = {};
    const iniciales: Record<string, string> = {};
    const articuloTerminado: Record<string, boolean> = {};
    const articuloIniciales: Record<string, string> = {};
    const rawTerminado = rawEstado && typeof rawEstado === "object" && "procesoTerminado" in rawEstado
      ? (rawEstado as Record<string, unknown>).procesoTerminado
      : null;
    if (rawTerminado && typeof rawTerminado === "object" && !Array.isArray(rawTerminado)) {
      for (const [k, v] of Object.entries(rawTerminado)) {
        if (v && typeof v === "object" && "terminado" in v) {
          terminado[k] = !!(v as Record<string, unknown>).terminado;
          const ini = (v as Record<string, unknown>).iniciales;
          if (typeof ini === "string" && ini.length <= 2) iniciales[k] = ini.toUpperCase().slice(0, 2);
        }
      }
    }
    const rawArticulo = rawEstado && typeof rawEstado === "object" && "articuloTerminado" in rawEstado
      ? (rawEstado as Record<string, unknown>).articuloTerminado
      : null;
    if (rawArticulo && typeof rawArticulo === "object" && !Array.isArray(rawArticulo)) {
      for (const [k, v] of Object.entries(rawArticulo)) {
        if (v && typeof v === "object" && "terminado" in v) {
          articuloTerminado[k] = !!(v as Record<string, unknown>).terminado;
          const ini = (v as Record<string, unknown>).iniciales;
          if (typeof ini === "string" && ini.length <= 2) articuloIniciales[k] = ini.toUpperCase().slice(0, 2);
        }
      }
    }
    tipologias.forEach((t, idx) => {
      for (const [proceso, items] of Object.entries(ESTADOS_OBRA_STRUCTURE)) {
        const itemData = t.estados[proceso];
        for (const item of items) {
          if (itemData && item in itemData) {
            const key = `${idx}${ESTADO_OBRA_KEY_SEP}${proceso}${ESTADO_OBRA_KEY_SEP}${item}`;
            fechas[key] = itemData[item] ?? "";
          }
        }
      }
    });
    setEstadoObraTipologias(tipologias);
    setEstadoObraFechas(fechas);
    setEstadoObraTerminado(terminado);
    setEstadoObraIniciales(iniciales);
    setEstadoObraArticuloTerminado(articuloTerminado);
    setEstadoObraArticuloIniciales(articuloIniciales);
    const tipologiasParaRef = _backup !== undefined ? _backup : tipologias;
    const fechasParaRef: Record<string, string> = {};
    tipologiasParaRef.forEach((t, idx) => {
      for (const [proceso, items] of Object.entries(ESTADOS_OBRA_STRUCTURE)) {
        const itemData = t.estados[proceso];
        for (const item of items) {
          if (itemData && item in itemData) {
            const key = `${idx}${ESTADO_OBRA_KEY_SEP}${proceso}${ESTADO_OBRA_KEY_SEP}${item}`;
            fechasParaRef[key] = itemData[item] ?? "";
          }
        }
      }
    });
    estadoObraInicialRef.current = {
      tipologias: tipologiasParaRef.map((t) => ({
        nombre: t.nombre,
        estados: Object.fromEntries(
          Object.entries(t.estados).map(([proceso, items]) => [proceso, { ...items }])
        ),
        descripcion: t.descripcion ?? null,
        hojas: t.hojas ?? null,
        guias: t.guias ?? null,
        mosq: t.mosq ?? null,
        umbral: t.umbral ?? null,
        ancho: t.ancho ?? null,
        alto: t.alto ?? null,
      })),
      fechas: { ...fechasParaRef },
    };
    setNuevaTipologiaNombre("");
    setMostrarAgregarTipologia(false);
  };

  const handleAgregarTipologia = () => {
    const nombre = nuevaTipologiaNombre.trim() || `Tipología ${estadoObraTipologias.length + 1}`;
    setEstadoObraTipologias((prev) => [...prev, { nombre, estados: {} }]);
    setNuevaTipologiaNombre("");
    setMostrarAgregarTipologia(false);
  };

  const getExcelVal = (row: Record<string, unknown>, keys: string[], colIdx?: number, firstKeys?: string[]): unknown => {
    if (colIdx !== undefined && colIdx >= 0) {
      const colKeys: string[] = [String(colIdx), "ABCDEFGHIJ"[colIdx]];
      if (firstKeys?.[colIdx]) colKeys.push(firstKeys[colIdx]);
      for (const k of colKeys) {
        const val = row[k];
        if (val !== undefined && val !== null && String(val).trim() !== "") return val;
      }
    }
    const norm = (s: string) => String(s).toLowerCase().trim().replace(/\s+/g, " ").replace(/[íìîï]/g, "i").replace(/[áàâä]/g, "a").replace(/[óòôö]/g, "o");
    for (const [excelKey, val] of Object.entries(row)) {
      const excelNorm = norm(excelKey);
      for (const k of keys) {
        if (!k) continue;
        const kn = norm(k);
        const match = excelNorm === kn || excelNorm.includes(kn) || kn.includes(excelNorm) ||
          (keys.some((x) => x.toLowerCase().includes("tipolog")) && excelNorm.includes("tipolog")) ||
          (keys.some((x) => /umbral/i.test(x)) && /umbral/i.test(excelNorm));
        if (match && val !== undefined && val !== null && String(val).trim() !== "") return val;
      }
    }
    return undefined;
  };

  const handleImportEstadoObraExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setImportandoEstadoObra(true);
    try {
      const data = await file.arrayBuffer();
      const wb = XLSX.read(data, { type: "array" });
      const firstSheet = wb.Sheets[wb.SheetNames[0]];
      let rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(firstSheet, { defval: "", raw: true });
      const headerWords = ["tipologia", "tipología", "descripcion", "descripción", "hojas", "guias", "guías", "mosq", "umbral", "ancho", "alto"];
      let firstKeys: string[] = [];
      if (rows.length > 0) {
        firstKeys = Object.keys(rows[0]);
        const hasHeader = firstKeys.some((k) =>
          /tipolog|descripcion|hojas|guias|mosq|umbral|ancho|alto/i.test(String(k))
        );
        if (!hasHeader) {
          rows = rows.map((r) => ({
            ...r,
            A: r["0"] ?? r["A"] ?? r[firstKeys[0]],
            B: r["1"] ?? r["B"] ?? r[firstKeys[1]],
            C: r["2"] ?? r["C"] ?? r[firstKeys[2]],
            D: r["3"] ?? r["D"] ?? r[firstKeys[3]],
            E: r["4"] ?? r["E"] ?? r[firstKeys[4]],
            F: r["5"] ?? r["F"] ?? r[firstKeys[5]],
            G: r["6"] ?? r["G"] ?? r[firstKeys[6]],
            H: r["7"] ?? r["H"] ?? r[firstKeys[7]],
          }));
        }
      }
      const nuevas: TipologiaItem[] = [];
      for (let ri = 0; ri < rows.length; ri++) {
        const row = rows[ri];
        let nombreRaw = getExcelVal(row, ["tipologia", "tipología", "Tipología", "A"], 0, firstKeys) ?? getExcelVal(row, [], 0, firstKeys);
        if (nombreRaw === undefined) {
          const firstCol = row[firstKeys[0]] ?? row["0"] ?? row["A"];
          if (firstCol !== undefined && firstCol !== null && String(firstCol).trim()) nombreRaw = firstCol;
        }
        const nombre = String(nombreRaw ?? "").trim();
        if (!nombre) continue;
        if (ri === 0 && headerWords.includes(nombre.toLowerCase())) continue;
        const descripcionRaw = getExcelVal(row, ["descripcion", "Descripción", "B"], 1, firstKeys) ?? getExcelVal(row, [], 1, firstKeys);
        const descripcion = String(descripcionRaw ?? "").trim() || null;
        const hojasRaw = getExcelVal(row, ["hojas", "Hojas", "C"], 2, firstKeys) ?? getExcelVal(row, [], 2, firstKeys);
        const hojas = parseNumExcel(hojasRaw);
        const guiasRaw = getExcelVal(row, ["guias", "guías", "Guías", "D"], 3, firstKeys) ?? getExcelVal(row, [], 3, firstKeys);
        const guias = parseNumExcel(guiasRaw);
        const mosqRaw = getExcelVal(row, ["mosq", "Mosq", "E"], 4, firstKeys) ?? getExcelVal(row, [], 4, firstKeys);
        const mosq = mosqRaw !== undefined && mosqRaw !== null ? String(mosqRaw).trim() || null : null;
        const umbralRaw = getExcelVal(row, ["umbral", "Umbral", "UMBRAL", "F"], 5, firstKeys)
          ?? (() => {
            const uk = firstKeys?.find((k) => /umbral/i.test(String(k)));
            return uk ? row[uk] : undefined;
          })()
          ?? getExcelVal(row, [], 5, firstKeys);
        const umbral = umbralRaw !== undefined && umbralRaw !== null ? String(umbralRaw).trim() || null : null;
        const anchoRaw = getExcelVal(row, ["ancho", "Ancho", "G"], 6, firstKeys) ?? getExcelVal(row, [], 6, firstKeys);
        const ancho = parseNumExcel(anchoRaw);
        const altoRaw = getExcelVal(row, ["alto", "Alto", "H"], 7, firstKeys) ?? getExcelVal(row, [], 7, firstKeys);
        const alto = parseNumExcel(altoRaw);
        nuevas.push({ nombre, descripcion, hojas, guias, mosq, umbral, ancho, alto, estados: {} });
      }
      setEstadoObraTipologias((prev) => [...prev, ...nuevas]);
      if (nuevas.length > 0) {
        alert(`Se agregaron ${nuevas.length} tipología(s) al proceso de producción. Haz clic en Actualizar para guardar.`);
      } else {
        alert("No se encontraron filas con datos. El Excel debe tener encabezados: Tipología, Descripción, Hojas, Guías, Mosq, Umbral, Ancho, Alto");
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
    setEstadoObraTipologias([]);
    setEstadoObraFechas({});
    setEstadoObraTerminado({});
    setEstadoObraIniciales({});
    setEstadoObraArticuloTerminado({});
    setEstadoObraArticuloIniciales({});
    setNuevaTipologiaNombre("");
    setMostrarAgregarTipologia(false);
  };

  const handleEliminarTipologia = (idx: number) => {
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
    setEstadoObraArticuloIniciales((prev) => {
      const next: Record<string, string> = {};
      for (const [key, val] of Object.entries(prev)) {
        const keyIdx = parseInt(key, 10);
        if (Number.isNaN(keyIdx)) continue;
        if (keyIdx < idx) next[key] = val;
        else if (keyIdx > idx) next[String(keyIdx - 1)] = val;
      }
      return next;
    });
  };

  const saveEstadoObraToSupabase = useCallback(async (closeModal = false) => {
    if (!estadoObraOrden) return;
    setUpdatingEstadoObra(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setUpdatingEstadoObra(false);
      return;
    }
    const tipologiasActuales = estadoObraTipologiasRef.current;
    const fechasActuales = estadoObraFechasRef.current;
    const terminadoActual = estadoObraTerminadoRef.current;
    const inicialesActual = estadoObraInicialesRef.current;
    const articuloTerminadoActual = estadoObraArticuloTerminadoRef.current;
    const articuloInicialesActual = estadoObraArticuloInicialesRef.current;
    const tipologias: TipologiaItem[] = tipologiasActuales.map((t, idx) => {
      const estados: EstadoObraData = {};
      for (const [proceso, items] of Object.entries(ESTADOS_OBRA_STRUCTURE)) {
        const map: Record<string, string> = {};
        for (const item of items) {
          const key = `${idx}${ESTADO_OBRA_KEY_SEP}${proceso}${ESTADO_OBRA_KEY_SEP}${item}`;
          if (key in fechasActuales) map[item] = fechasActuales[key] ?? "";
        }
        if (Object.keys(map).length > 0) estados[proceso] = map;
      }
      return {
        nombre: t.nombre,
        estados,
        descripcion: t.descripcion ?? null,
        hojas: t.hojas ?? null,
        guias: t.guias ?? null,
        mosq: t.mosq ?? null,
        umbral: t.umbral ?? null,
        ancho: t.ancho ?? null,
        alto: t.alto ?? null,
      };
    });
    const backupTipologias = estadoObraInicialRef.current?.tipologias.map((t) => ({
      nombre: t.nombre,
      estados: t.estados,
      descripcion: t.descripcion ?? null,
      hojas: t.hojas ?? null,
      guias: t.guias ?? null,
      mosq: t.mosq ?? null,
      umbral: t.umbral ?? null,
      ancho: t.ancho ?? null,
      alto: t.alto ?? null,
    })) ?? tipologias;
    const procesoTerminado: Record<string, { terminado: boolean; iniciales: string }> = {};
    for (const [proceso] of Object.entries(ESTADOS_OBRA_STRUCTURE)) {
      tipologiasActuales.forEach((_, tipIdx) => {
        const key = `${tipIdx}${ESTADO_OBRA_KEY_SEP}${proceso}`;
        const term = terminadoActual[key];
        const ini = (inicialesActual[key] ?? "").slice(0, 2).toUpperCase();
        if (term || ini) {
          procesoTerminado[key] = { terminado: !!term, iniciales: ini };
        }
      });
    }
    const articuloTerminado: Record<string, { terminado: boolean; iniciales: string }> = {};
    tipologiasActuales.forEach((_, tipIdx) => {
      const key = String(tipIdx);
      const term = articuloTerminadoActual[key];
      const ini = (articuloInicialesActual[key] ?? "").slice(0, 2).toUpperCase();
      if (term || ini) {
        articuloTerminado[key] = { terminado: !!term, iniciales: ini };
      }
    });
    const estadoObraPayload = { tipologias, _backup: backupTipologias, procesoTerminado, articuloTerminado };
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
      await fetchOrdenes();
      if (closeModal) {
        setShowEstadoObraModal(false);
        setEstadoObraOrden(null);
      }
    }
    setUpdatingEstadoObra(false);
  }, [estadoObraOrden, supabase]);

  const handleUpdateEstadoObra = () => saveEstadoObraToSupabase(true);

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

  const handleDownloadTerminados = () => {
    const rows: Array<{
      Carpeta: string; Obra: string; Mes: string; Semana: string; Fecha: string;
      Tipologia: string; Desc: string; Hojas: string; Guias: string; Mosq: string; Umbral: string; Ancho: string; Alto: string;
      Iniciales: string;
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
        const hojas = tipologia && typeof tipologia.hojas !== "undefined" && tipologia.hojas != null ? String(tipologia.hojas) : "";
        const guias = tipologia && typeof tipologia.guias !== "undefined" && tipologia.guias != null ? String(tipologia.guias) : "";
        const mosq = tipologia && typeof tipologia.mosq === "string" ? tipologia.mosq : "";
        const umbral = tipologia && typeof tipologia.umbral === "string" ? tipologia.umbral : "";
        const ancho = tipologia && typeof tipologia.ancho !== "undefined" && tipologia.ancho != null ? String(tipologia.ancho) : "";
        const alto = tipologia && typeof tipologia.alto !== "undefined" && tipologia.alto != null ? String(tipologia.alto) : "";
        const iniciales = typeof v.iniciales === "string" ? v.iniciales.slice(0, 2).toUpperCase() : "";
        rows.push({
          Carpeta: orden.num_carpeta ?? "",
          Obra: orden.obra ?? "",
          Mes: orden.mes ?? "",
          Semana: orden.semana ?? "",
          Fecha: fecha,
          Tipologia: tipologiaNombre,
          Desc: desc,
          Hojas: hojas,
          Guias: guias,
          Mosq: mosq,
          Umbral: umbral,
          Ancho: ancho,
          Alto: alto,
          Iniciales: iniciales,
        });
      }
    }
    if (rows.length === 0) {
      alert("No hay artículos marcados como terminados en las órdenes actuales (o en el filtro aplicado).");
      return;
    }
    setDescargandoTerminados(true);
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
      setDescargandoTerminados(false);
    }
  };

  const handleDownloadProcesosTerminados = () => {
    const rows: Array<{
      Carpeta: string; Obra: string; Mes: string; Semana: string; Fecha: string;
      Tipologia: string; Desc: string; Hojas: string; Guias: string; Mosq: string; Umbral: string; Ancho: string; Alto: string;
      Proceso: string; Iniciales: string;
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
        const hojas = tipologia && typeof tipologia.hojas !== "undefined" && tipologia.hojas != null ? String(tipologia.hojas) : "";
        const guias = tipologia && typeof tipologia.guias !== "undefined" && tipologia.guias != null ? String(tipologia.guias) : "";
        const mosq = tipologia && typeof tipologia.mosq === "string" ? tipologia.mosq : "";
        const umbral = tipologia && typeof tipologia.umbral === "string" ? tipologia.umbral : "";
        const ancho = tipologia && typeof tipologia.ancho !== "undefined" && tipologia.ancho != null ? String(tipologia.ancho) : "";
        const alto = tipologia && typeof tipologia.alto !== "undefined" && tipologia.alto != null ? String(tipologia.alto) : "";
        const iniciales = typeof v.iniciales === "string" ? v.iniciales.slice(0, 2).toUpperCase() : "";
        rows.push({
          Carpeta: orden.num_carpeta ?? "",
          Obra: orden.obra ?? "",
          Mes: orden.mes ?? "",
          Semana: orden.semana ?? "",
          Fecha: fecha,
          Tipologia: tipologiaNombre,
          Desc: desc,
          Hojas: hojas,
          Guias: guias,
          Mosq: mosq,
          Umbral: umbral,
          Ancho: ancho,
          Alto: alto,
          Proceso: proceso,
          Iniciales: iniciales,
        });
      }
    }
    if (rows.length === 0) {
      alert("No hay procesos marcados como terminados en las órdenes actuales (o en el filtro aplicado).");
      return;
    }
    setDescargandoProcesosTerminados(true);
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
      setDescargandoProcesosTerminados(false);
    }
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

    if (imagenFiles.length > 0) {
      const uploadedItems: { url: string; name: string }[] = [];
      const basePath = `${user.id}/${Date.now()}`;

      for (let i = 0; i < imagenFiles.length; i++) {
        const file = imagenFiles[i];
        const fileExt = file.name.split(".").pop()?.toLowerCase() || "jpg";
        const isImage = /^(jpg|jpeg|png|gif|webp|bmp)$/i.test(fileExt);
        if (!isImage) continue;

        const filePath = `${basePath}-${i}-${crypto.randomUUID().slice(0, 8)}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from("ordenes")
          .upload(filePath, file, { upsert: false });

        if (uploadError) {
          setFormError(`Error al subir "${file.name}": ${uploadError.message}`);
          setSubmitting(false);
          return;
        }

        const { data: urlData } = supabase.storage
          .from("ordenes")
          .getPublicUrl(filePath);
        const fileName = (file as File & { webkitRelativePath?: string }).webkitRelativePath || file.name;
        uploadedItems.push({ url: urlData.publicUrl, name: fileName });
      }

      if (uploadedItems.length === 0) {
        setFormError("No se encontraron archivos de imagen válidos en la carpeta.");
        setSubmitting(false);
        return;
      }

      urlImagen = uploadedItems.length === 1
        ? JSON.stringify([{ url: uploadedItems[0].url, name: uploadedItems[0].name }])
        : JSON.stringify(uploadedItems);
    }

    if (editingOrden) {
      let updateQuery = supabase
        .from("ordenes_produccion")
        .update({
          num_carpeta: formData.num_carpeta.trim(),
          obra: formData.obra.trim(),
          mes: formData.mes,
          semana: formData.semana,
          url_imagen: urlImagen,
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
          url_imagen: urlImagen,
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

  const headerClass =
    "px-4 py-3 border-b border-blue-500 text-sm font-bold whitespace-nowrap text-center";
  const cellClass =
    "px-4 py-3 border-b border-gray-200 align-top text-sm text-center whitespace-pre-wrap break-words";

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <p className="text-gray-500">Cargando órdenes de producción...</p>
      </div>
    );
  }

  return (
    <div className="flex-1 w-full p-4 bg-gray-50 min-h-screen">
      {/* Header con navegación */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex flex-wrap gap-4 items-center justify-between mb-4">
          <Link
            href="/protected"
            className="inline-block px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 transition-all duration-200 transform hover:scale-105"
          >
            ← Home
          </Link>
          <h1 className="text-3xl font-bold text-gray-800">🏭 Órdenes de Producción</h1>
        </div>
        <div className="flex flex-wrap gap-4 items-center">
          {!isReadOnly && (
            <button
              type="button"
              onClick={() => {
                setEditingOrden(null);
                setFormData({ num_carpeta: "", obra: "", mes: "", semana: "" });
                setImagenFiles([]);
                setFormError("");
                setFormSuccess("");
                setShowModal(true);
              }}
              className="inline-block px-6 py-3 bg-green-600 text-white font-semibold rounded-lg shadow-md hover:bg-green-700 transition-all duration-200 transform hover:scale-105"
            >
              ➕ Nueva obra
            </button>
          )}
          <input
            type="text"
            placeholder="🔍 Buscar por carpeta, obra, mes, semana..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="px-4 py-3 border-2 border-gray-300 rounded-lg w-full max-w-md focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 transition-all duration-200"
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
          {!isTabletEmail(userEmail) && (
            <>
          <button
            type="button"
            onClick={handleDownloadTerminados}
            disabled={descargandoTerminados}
            className="px-4 py-3 bg-amber-500 text-white font-semibold rounded-lg shadow-md hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
            title="Descargar Excel con todos los artículos marcados como terminados"
          >
            {descargandoTerminados ? "⏳ Generando..." : "📥 Descargar artículos terminados"}
          </button>
          <button
            type="button"
            onClick={handleDownloadProcesosTerminados}
            disabled={descargandoProcesosTerminados}
            className="px-4 py-3 bg-green-600 text-white font-semibold rounded-lg shadow-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
            title="Descargar Excel con todos los procesos marcados como terminados"
          >
            {descargandoProcesosTerminados ? "⏳ Generando..." : "📥 Descargar procesos terminados"}
          </button>
            </>
          )}
        </div>
      </div>

      {showEstadoObraModal && estadoObraOrden && (
        <div
          className="fixed inset-0 z-[55] flex items-center justify-center bg-black/50 p-4"
          onClick={() => { setShowEstadoObraModal(false); setEstadoObraOrden(null); }}
          role="presentation"
        >
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4 pb-4 border-b border-gray-200 sticky top-0 bg-white z-10 -mt-1 pt-1">
              <h3 className="text-lg font-bold text-gray-800">
                Estado de obra: {estadoObraOrden.obra ?? estadoObraOrden.num_carpeta ?? "Obra"}
              </h3>
              <div className="flex gap-2">
                {canEditCheckboxes && (
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
                  onClick={() => { setShowEstadoObraModal(false); setEstadoObraOrden(null); }}
                  disabled={updatingEstadoObra}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 text-sm"
                >
                  Cerrar
                </button>
              </div>
            </div>
            <p className="text-sm text-gray-500 mb-4">
              {soloVista ? "Vista de estados (solo visualización):" : isTabletEmail(userEmail) ? "Marca los ítems y proceso terminado con tus iniciales (artículo terminado no disponible):" : "Agrega tipologías y marca los ítems culminados por proceso en cada una:"}
            </p>
            {canEditFullModal && (
              <div className="flex flex-wrap gap-2 mb-4">
                <button
                  type="button"
                  onClick={() => estadoObraFileInputRef.current?.click()}
                  disabled={importandoEstadoObra}
                  className="px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                >
                  {importandoEstadoObra ? "Importando..." : "📤 Importar Excel"}
                </button>
                {estadoObraTipologias.length > 0 && (
                  <button
                    type="button"
                    onClick={handleEliminarTodasTipologias}
                    disabled={updatingEstadoObra}
                    className="px-4 py-2 border border-red-300 text-red-600 font-semibold rounded-lg hover:bg-red-50 disabled:opacity-50 text-sm"
                    title="Eliminar todas las tipologías"
                  >
                    🗑️ Eliminar todas
                  </button>
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
            <div className="space-y-6 mb-6">
              {estadoObraTipologias.map((tipologia, idx) => (
                <div key={idx} className="border-2 border-gray-200 rounded-lg p-4 bg-gray-50/50">
                  <div className="flex items-start justify-between gap-4 mb-3 overflow-x-auto">
                    <div className="grid gap-x-4 gap-y-2 w-full min-w-[600px] shrink-0" style={{ gridTemplateColumns: "minmax(70px, 1fr) minmax(90px, 1.5fr) minmax(45px, 0.7fr) minmax(45px, 0.7fr) minmax(45px, 0.7fr) minmax(45px, 0.7fr) minmax(45px, 0.7fr) minmax(45px, 0.7fr)" }}>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-gray-500 uppercase break-words leading-tight hyphens-auto" title="Tipología">Tip</p>
                        <p className="text-sm font-medium text-gray-800 truncate mt-0.5" title={tipologia.nombre}>{tipologia.nombre || "—"}</p>
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-gray-500 uppercase break-words leading-tight hyphens-auto" title="Descripción">Desc</p>
                        <p className="text-sm text-gray-700 truncate mt-0.5" title={tipologia.descripcion ?? ""}>{tipologia.descripcion || "—"}</p>
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-gray-500 uppercase whitespace-nowrap">Hojas</p>
                        <p className="text-sm text-gray-700 mt-0.5">{tipologia.hojas != null && !Number.isNaN(tipologia.hojas) ? String(tipologia.hojas) : "—"}</p>
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-gray-500 uppercase whitespace-nowrap">Guías</p>
                        <p className="text-sm text-gray-700 mt-0.5">{tipologia.guias != null && !Number.isNaN(tipologia.guias) ? String(tipologia.guias) : "—"}</p>
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-gray-500 uppercase whitespace-nowrap">Mosq</p>
                        <p className="text-sm text-gray-700 truncate mt-0.5" title={tipologia.mosq ?? ""}>{tipologia.mosq || "—"}</p>
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-gray-500 uppercase whitespace-nowrap">Umbral</p>
                        <p className="text-sm text-gray-700 truncate mt-0.5" title={tipologia.umbral ?? ""}>{tipologia.umbral || "—"}</p>
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-gray-500 uppercase whitespace-nowrap">Ancho</p>
                        <p className="text-sm text-gray-700 mt-0.5">{tipologia.ancho != null && !Number.isNaN(tipologia.ancho) ? String(tipologia.ancho) : "—"}</p>
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-gray-500 uppercase whitespace-nowrap">Alto</p>
                        <p className="text-sm text-gray-700 mt-0.5">{tipologia.alto != null && !Number.isNaN(tipologia.alto) ? String(tipologia.alto) : "—"}</p>
                      </div>
                    </div>
                    {canEditFullModal && (
                      <button
                        type="button"
                        onClick={() => handleEliminarTipologia(idx)}
                        className="text-red-500 hover:text-red-700 text-sm px-2 py-1 shrink-0"
                        title="Eliminar tipología"
                      >
                        ✕ Eliminar
                      </button>
                    )}
                  </div>
                  <div className="space-y-3">
                    {(() => {
                      const articuloTerminadoParaTipologia = !!estadoObraArticuloTerminado[String(idx)];
                      const tabletBloqueadoPorArticulo = isTabletEmail(userEmail) && articuloTerminadoParaTipologia;
                      const canEditParaTipologia = canEditCheckboxes && !tabletBloqueadoPorArticulo;
                      return (
                    <>
                    {Object.entries(ESTADOS_OBRA_STRUCTURE).map(([proceso, items]) => (
                      <div key={proceso} className="border border-gray-200 rounded p-2 bg-white">
                        <h5 className="font-medium text-gray-700 text-sm mb-1">{proceso}</h5>
                        <ul className="flex flex-wrap gap-x-6 gap-y-3">
                          {items.map((item) => {
                            const key = `${idx}${ESTADO_OBRA_KEY_SEP}${proceso}${ESTADO_OBRA_KEY_SEP}${item}`;
                            const fecha = estadoObraFechas[key] ?? "";
                            const checked = key in estadoObraFechas;
                            return (
                              <li key={key} className="flex flex-col">
                                <label className={`flex items-center gap-1.5 ${canEditParaTipologia ? "cursor-pointer" : "cursor-not-allowed opacity-70"}`} title={soloVista ? "Solo visualización" : tabletBloqueadoPorArticulo ? "Artículo ya marcado como terminado por supervisor" : undefined}>
                                  <input
                                    type="checkbox"
                                    checked={checked}
                                    disabled={!canEditParaTipologia}
                                    onChange={(e) => {
                                      if (e.target.checked) {
                                        setEstadoObraFechas((prev) => ({
                                          ...prev,
                                          [key]: new Date().toISOString(),
                                        }));
                                      } else {
                                        setEstadoObraFechas((prev) => {
                                          const next = { ...prev };
                                          delete next[key];
                                          return next;
                                        });
                                      }
                                    }}
                                    className="w-3.5 h-3.5 rounded border-gray-300 text-amber-600 focus:ring-amber-500"
                                  />
                                  <span className="text-xs">{item}</span>
                                </label>
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
                        <div className="mt-2 pt-2 border-t border-gray-100 flex items-center gap-2">
                          {(() => {
                            const itemsProceso = ESTADOS_OBRA_STRUCTURE[proceso];
                            const alMenosUnoMarcado = itemsProceso.some((item) => {
                              const k = `${idx}${ESTADO_OBRA_KEY_SEP}${proceso}${ESTADO_OBRA_KEY_SEP}${item}`;
                              return k in estadoObraFechas;
                            });
                            const terminadoDisabled = !canEditParaTipologia || !alMenosUnoMarcado;
                            return (
                            <>
                          <label className={`flex items-center gap-1.5 ${!terminadoDisabled ? "cursor-pointer" : "cursor-not-allowed opacity-70"}`} title={terminadoDisabled ? (soloVista ? "Solo visualización" : tabletBloqueadoPorArticulo ? "Artículo ya marcado como terminado por supervisor" : canEditParaTipologia ? "Marque al menos un paso del proceso primero" : undefined) : undefined}>
                            <input
                              type="checkbox"
                              checked={!!estadoObraTerminado[`${idx}${ESTADO_OBRA_KEY_SEP}${proceso}`]}
                              disabled={terminadoDisabled}
                              onChange={(e) => {
                                const key = `${idx}${ESTADO_OBRA_KEY_SEP}${proceso}`;
                                setEstadoObraTerminado((prev) => ({
                                  ...prev,
                                  [key]: e.target.checked,
                                }));
                                if (!e.target.checked) {
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
                          {estadoObraTerminado[`${idx}${ESTADO_OBRA_KEY_SEP}${proceso}`] && (
                            <input
                              type="text"
                              maxLength={2}
                              disabled={!canEditParaTipologia}
                              value={estadoObraIniciales[`${idx}${ESTADO_OBRA_KEY_SEP}${proceso}`] ?? ""}
                              onChange={(e) => {
                                const val = e.target.value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ]/g, "").toUpperCase().slice(0, 2);
                                setEstadoObraIniciales((prev) => ({
                                  ...prev,
                                  [`${idx}${ESTADO_OBRA_KEY_SEP}${proceso}`]: val,
                                }));
                              }}
                              placeholder="Iniciales"
                              className="w-10 px-1.5 py-0.5 text-xs border border-gray-300 rounded text-center uppercase"
                              title="Iniciales del operador (2 caracteres)"
                            />
                          )}
                            </>
                            );
                          })()}
                        </div>
                      </div>
                    ))}
                    </>
                    );
                    })()}
                  </div>
                  <div className="mt-3 pt-3 border-t-2 border-amber-200 bg-amber-50/50 rounded p-2">
                    {(() => {
                      const todosProcesosTerminados = Object.keys(ESTADOS_OBRA_STRUCTURE).every((proceso) =>
                        !!estadoObraTerminado[`${idx}${ESTADO_OBRA_KEY_SEP}${proceso}`]
                      );
                      const articuloDisabled = !canEditArticuloTerminado || !todosProcesosTerminados;
                      const articuloKey = String(idx);
                      return (
                        <div className="flex items-center gap-2">
                          <label
                            className={`flex items-center gap-1.5 ${!articuloDisabled ? "cursor-pointer" : "cursor-not-allowed opacity-70"}`}
                            title={articuloDisabled ? (soloVista ? "Solo visualización" : canEditArticuloTerminado ? "Marque todos los procesos como terminados primero" : "Los usuarios tablet no pueden marcar artículo terminado") : undefined}
                          >
                            <input
                              type="checkbox"
                              checked={!!estadoObraArticuloTerminado[articuloKey]}
                              disabled={articuloDisabled}
                              onChange={(e) => {
                                setEstadoObraArticuloTerminado((prev) => ({
                                  ...prev,
                                  [articuloKey]: e.target.checked,
                                }));
                                if (!e.target.checked) {
                                  setEstadoObraArticuloIniciales((prev) => {
                                    const next = { ...prev };
                                    delete next[articuloKey];
                                    return next;
                                  });
                                }
                              }}
                              className="w-3.5 h-3.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                            <span className="text-xs font-semibold">Artículo terminado</span>
                          </label>
                          {estadoObraArticuloTerminado[articuloKey] && (
                            <input
                              type="text"
                              maxLength={2}
                              disabled={!canEditArticuloTerminado}
                              value={estadoObraArticuloIniciales[articuloKey] ?? ""}
                              onChange={(e) => {
                                const val = e.target.value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ]/g, "").toUpperCase().slice(0, 2);
                                setEstadoObraArticuloIniciales((prev) => ({
                                  ...prev,
                                  [articuloKey]: val,
                                }));
                              }}
                              placeholder="Iniciales"
                              className="w-10 px-1.5 py-0.5 text-xs border border-gray-300 rounded text-center uppercase"
                              title="Iniciales del operador (2 caracteres)"
                            />
                          )}
                        </div>
                      );
                    })()}
                  </div>
                </div>
              ))}
              {canEditFullModal && (mostrarAgregarTipologia ? (
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
            <div className="flex gap-3">
              {canEditCheckboxes && (
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
                onClick={() => {
                  setShowEstadoObraModal(false);
                  setEstadoObraOrden(null);
                }}
                disabled={updatingEstadoObra}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {showArchivosModal && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4"
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Imágenes (carpeta o varios archivos) {editingOrden && "(dejar vacío para mantener las actuales)"}
                  </label>
                  <div className="flex flex-wrap gap-2">
                    <label className="inline-flex items-center px-3 py-2 border-2 border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 file:mr-2 file:py-1 file:px-3 file:rounded file:border-0 file:bg-blue-100 file:text-blue-800">
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={(e) => {
                          const files = e.target.files ? Array.from(e.target.files) : [];
                          const imageFiles = files.filter((f) => /^image\//.test(f.type));
                          setImagenFiles(imageFiles);
                          e.target.value = "";
                        }}
                        className="hidden"
                      />
                      📁 Seleccionar archivos
                    </label>
                    <label className="inline-flex items-center px-3 py-2 border-2 border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 file:mr-2 file:py-1 file:px-3 file:rounded file:border-0 file:bg-blue-100 file:text-blue-800">
                      <input
                        type="file"
                        accept="image/*"
                        {...({ webkitdirectory: "", directory: "" } as React.InputHTMLAttributes<HTMLInputElement>)}
                        onChange={(e) => {
                          const files = e.target.files ? Array.from(e.target.files) : [];
                          const imageFiles = files.filter((f) => /^image\//.test(f.type));
                          setImagenFiles(imageFiles);
                          e.target.value = "";
                        }}
                        className="hidden"
                      />
                      📂 Cargar carpeta completa
                    </label>
                  </div>
                  {imagenFiles.length > 0 && (
                    <p className="text-xs text-gray-500 mt-1">
                      {imagenFiles.length} imagen{imagenFiles.length !== 1 ? "es" : ""} seleccionada{imagenFiles.length !== 1 ? "s" : ""}
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
        <div className="overflow-x-auto">
          <table className="min-w-full table-auto border-collapse">
            <thead className="bg-gradient-to-r from-blue-600 to-blue-700 text-white">
            <tr>
              {!isReadOnly && <th className={headerClass}>Acciones</th>}
              <th className={headerClass}>Fecha</th>
              <th className={headerClass}>Nº Carpeta</th>
              <th className={headerClass}>Obra</th>
              <th className={headerClass}>Mes</th>
              <th className={headerClass}>Semana</th>
              <th className={headerClass}>Estado de obra</th>
              <th className={headerClass}>Imagen</th>
            </tr>
          </thead>
          <tbody>
            {filteredOrdenes.length === 0 ? (
              <tr>
                <td
                  colSpan={isReadOnly ? 7 : 8}
                  className="px-4 py-8 text-center text-gray-500"
                >
                  No hay órdenes de producción registradas.
                </td>
              </tr>
            ) : (
              filteredOrdenes.map((orden) => (
                <tr key={orden.id} className="hover:bg-gray-50 transition-colors duration-200">
                  {!isReadOnly && (
                    <td className={cellClass}>
                      <div className="flex flex-col gap-2 items-center">
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
                      </div>
                    </td>
                  )}
                  <td className={cellClass}>{formatDate(orden.created_at)}</td>
                  <td className={cellClass}>
                    {renderValue(orden.num_carpeta)}
                  </td>
                  <td className={cellClass}>{renderValue(orden.obra)}</td>
                  <td className={cellClass}>{renderValue(orden.mes)}</td>
                  <td className={cellClass}>{renderValue(orden.semana)}</td>
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
                    {(() => {
                      const items = parseImageItems(orden.url_imagen);
                      if (items.length === 0) return "-";
                      return (
                        <div className="flex flex-col gap-2 items-center">
                          <button
                            type="button"
                            onClick={() => {
                              setArchivosModalItems(items);
                              setShowArchivosModal(true);
                            }}
                            className="inline-block px-3 py-2 bg-blue-500 text-white font-medium rounded-lg shadow-md hover:bg-blue-600 transition-all duration-200 text-sm"
                          >
                            Ver
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDownloadCarpeta(orden)}
                            disabled={downloadingOrdenId === orden.id}
                            className="inline-block px-3 py-2 bg-emerald-600 text-white font-medium rounded-lg shadow-md hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 text-sm"
                          >
                            {downloadingOrdenId === orden.id ? "⏳ Descargando..." : "📥 Descargar carpeta"}
                          </button>
                        </div>
                      );
                    })()}
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
