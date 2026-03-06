"use client";

import React, { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { canAccessOrdenesProduccion, isTabletEmail } from "@/lib/panol-access";
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
  ancho?: number | null;
  alto?: number | null;
  comentarios?: string | null;
};

type EstadoObraConTipologias = { tipologias: TipologiaItem[] };

function toFechaString(val: unknown): string {
  if (typeof val === "string" && val.trim()) return val;
  if (typeof val === "number" && !Number.isNaN(val)) return new Date(val).toISOString();
  return "";
}

function parseEstadoObraData(obj: Record<string, unknown>): EstadoObraData {
  const result: EstadoObraData = {};
  for (const [proceso, val] of Object.entries(obj)) {
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
      // Formato antiguo: array de strings → migrar a objeto con fecha vacía
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

function parseEstadoObra(val: unknown): EstadoObraConTipologias {
  if (val && typeof val === "object" && !Array.isArray(val)) {
    const obj = val as Record<string, unknown>;
    if (Array.isArray(obj.tipologias)) {
      const tipologias: TipologiaItem[] = obj.tipologias
        .filter((t): t is Record<string, unknown> => t && typeof t === "object")
        .map((t) => ({
          nombre: typeof t.nombre === "string" ? t.nombre : "Tipología",
          estados: parseEstadoObraData((t.estados as Record<string, unknown>) ?? {}),
          descripcion: typeof t.descripcion === "string" ? t.descripcion : null,
          ancho: typeof t.ancho === "number" ? t.ancho : null,
          alto: typeof t.alto === "number" ? t.alto : null,
          comentarios: typeof t.comentarios === "string" ? t.comentarios : null,
        }));
      return { tipologias };
    }
    // Formato antiguo: objeto plano con CORTE, MECANIZADO, etc. → migrar a una tipología "General"
    const estados = parseEstadoObraData(obj);
    if (Object.keys(estados).length > 0 || Object.keys(obj).some((k) => k !== "tipologias")) {
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
  const [downloadingOrdenId, setDownloadingOrdenId] = useState<string | null>(null);
  const [showEstadoObraModal, setShowEstadoObraModal] = useState(false);
  const [estadoObraOrden, setEstadoObraOrden] = useState<OrdenProduccion | null>(null);
  const [estadoObraTipologias, setEstadoObraTipologias] = useState<TipologiaItem[]>([]);
  const [estadoObraFechas, setEstadoObraFechas] = useState<Record<string, string>>({});
  const [nuevaTipologiaNombre, setNuevaTipologiaNombre] = useState("");
  const [mostrarAgregarTipologia, setMostrarAgregarTipologia] = useState(false);
  const [updatingEstadoObra, setUpdatingEstadoObra] = useState(false);
  const [importandoEstadoObra, setImportandoEstadoObra] = useState(false);
  const estadoObraFileInputRef = React.useRef<HTMLInputElement>(null);
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

    setIsReadOnly(isTabletEmail(user.email));

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
    const { tipologias } = parseEstadoObra(rawEstado);
    const fechas: Record<string, string> = {};
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
    setNuevaTipologiaNombre("");
    setMostrarAgregarTipologia(false);
  };

  const handleAgregarTipologia = () => {
    const nombre = nuevaTipologiaNombre.trim() || `Tipología ${estadoObraTipologias.length + 1}`;
    setEstadoObraTipologias((prev) => [...prev, { nombre, estados: {} }]);
    setNuevaTipologiaNombre("");
    setMostrarAgregarTipologia(false);
  };

  const getExcelVal = (row: Record<string, unknown>, keys: string[], colIdx?: number): unknown => {
    if (colIdx !== undefined && colIdx >= 0) {
      const val = row[String(colIdx)] ?? row["ABCDEFGHIJ"[colIdx]];
      if (val !== undefined && val !== null && String(val).trim() !== "") return val;
    }
    const norm = (s: string) => String(s).toLowerCase().trim().replace(/\s+/g, " ").replace(/[íìîï]/g, "i").replace(/[áàâä]/g, "a").replace(/[óòôö]/g, "o");
    for (const [excelKey, val] of Object.entries(row)) {
      const excelNorm = norm(excelKey);
      for (const k of keys) {
        if (!k) continue;
        const kn = norm(k);
        const match = excelNorm === kn || excelNorm.includes(kn) || kn.includes(excelNorm) ||
          (keys.some((x) => x.toLowerCase().includes("tipolog")) && excelNorm.includes("tipolog"));
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
      let rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(firstSheet, { defval: "", raw: false });
      if (rows.length > 0) {
        const firstRow = rows[0];
        const firstKeys = Object.keys(firstRow);
        const hasHeader = firstKeys.some((k) =>
          /tipolog|descripcion|ancho|alto|comentario/i.test(String(k))
        );
        if (!hasHeader) {
          rows = rows.map((r) => ({
            ...r,
            A: r["0"] ?? r["A"] ?? r[firstKeys[0]],
            B: r["1"] ?? r["B"] ?? r[firstKeys[1]],
            C: r["2"] ?? r["C"] ?? r[firstKeys[2]],
            D: r["3"] ?? r["D"] ?? r[firstKeys[3]],
            E: r["4"] ?? r["E"] ?? r[firstKeys[4]],
          }));
        }
      }
      const nuevas: TipologiaItem[] = [];
      const headerWords = ["tipologias", "tipologia", "descripcion", "ancho", "alto", "comentarios"];
      for (let ri = 0; ri < rows.length; ri++) {
        const row = rows[ri];
        let nombreRaw = getExcelVal(row, ["tipologias", "tipologia", "Tipologías", "Tipología", "A"]) ?? getExcelVal(row, [], 0);
        if (nombreRaw === undefined) {
          const firstCol = row[Object.keys(row)[0]] ?? row["0"] ?? row["A"];
          if (firstCol !== undefined && firstCol !== null && String(firstCol).trim()) nombreRaw = firstCol;
        }
        const nombre = String(nombreRaw ?? "").trim();
        if (!nombre) continue;
        if (ri === 0 && headerWords.includes(nombre.toLowerCase())) continue;
        const descripcionRaw = getExcelVal(row, ["descripcion", "Descripción", "B"]) ?? getExcelVal(row, [], 1);
        const descripcion = String(descripcionRaw ?? "").trim() || null;
        const anchoRaw = getExcelVal(row, ["ancho", "Ancho", "C"]) ?? getExcelVal(row, [], 2);
        const ancho = anchoRaw !== undefined && anchoRaw !== null && String(anchoRaw).trim() !== "" ? Number(anchoRaw) : null;
        const altoRaw = getExcelVal(row, ["alto", "Alto", "D"]) ?? getExcelVal(row, [], 3);
        const alto = altoRaw !== undefined && altoRaw !== null && String(altoRaw).trim() !== "" ? Number(altoRaw) : null;
        const comentariosRaw = getExcelVal(row, ["comentarios", "Comentarios", "E"]) ?? getExcelVal(row, [], 4);
        const comentarios = String(comentariosRaw ?? "").trim() || null;
        nuevas.push({ nombre, descripcion, ancho, alto, comentarios, estados: {} });
      }
      setEstadoObraTipologias((prev) => [...prev, ...nuevas]);
      if (nuevas.length > 0) {
        alert(`Se agregaron ${nuevas.length} tipología(s) al proceso de producción. Haz clic en Actualizar para guardar.`);
      } else {
        alert("No se encontraron filas con datos en la columna de tipología. Revisa que la primera fila tenga los encabezados y que haya al menos una fila con datos.");
      }
    } catch (ex) {
      console.error("Error al importar:", ex);
      alert("Error al leer el archivo Excel. Verifica el formato del archivo.");
    } finally {
      setImportandoEstadoObra(false);
    }
  };

  const handleEliminarTipologia = (idx: number) => {
    setEstadoObraTipologias((prev) => prev.filter((_, i) => i !== idx));
    setEstadoObraFechas((prev) => {
      const next: Record<string, string> = {};
      const sep = ESTADO_OBRA_KEY_SEP;
      for (const [key, val] of Object.entries(prev)) {
        const parts = key.split(sep);
        const keyIdx = parseInt(parts[0], 10);
        if (keyIdx < idx) next[key] = val;
        else if (keyIdx > idx) next[`${keyIdx - 1}${sep}${parts.slice(1).join(sep)}`] = val;
      }
      return next;
    });
  };

  const handleUpdateEstadoObra = async () => {
    if (!estadoObraOrden) return;
    setUpdatingEstadoObra(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setUpdatingEstadoObra(false);
      return;
    }
    const tipologias: TipologiaItem[] = estadoObraTipologias.map((t, idx) => {
      const estados: EstadoObraData = {};
      for (const [proceso, items] of Object.entries(ESTADOS_OBRA_STRUCTURE)) {
        const map: Record<string, string> = {};
        for (const item of items) {
          const key = `${idx}${ESTADO_OBRA_KEY_SEP}${proceso}${ESTADO_OBRA_KEY_SEP}${item}`;
          if (key in estadoObraFechas) map[item] = estadoObraFechas[key] ?? "";
        }
        if (Object.keys(map).length > 0) estados[proceso] = map;
      }
      return {
        nombre: t.nombre,
        estados,
        descripcion: t.descripcion ?? null,
        ancho: t.ancho ?? null,
        alto: t.alto ?? null,
        comentarios: t.comentarios ?? null,
      };
    });
    let updateQuery = supabase
      .from("ordenes_produccion")
      .update({ estado_obra: { tipologias } })
      .eq("id", estadoObraOrden.id);
    if (!canAccessOrdenesProduccion(user.email)) {
      updateQuery = updateQuery.eq("usuario_id", user.id);
    }
    const { error } = await updateQuery;
    if (error) {
      alert(`Error al actualizar: ${error.message}`);
    } else {
      await fetchOrdenes();
      setShowEstadoObraModal(false);
      setEstadoObraOrden(null);
    }
    setUpdatingEstadoObra(false);
  };

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
    if (!s) return true;
    return Object.entries(orden).some(([key, value]) => {
      if (key === "usuario_id") return false;
      if (value === null || value === undefined) return false;
      return String(value).toLowerCase().includes(s);
    });
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
                <button
                  type="button"
                  onClick={handleUpdateEstadoObra}
                  disabled={updatingEstadoObra}
                  className="px-4 py-2 bg-amber-500 text-white font-semibold rounded-lg hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                >
                  {updatingEstadoObra ? "Actualizando..." : "Actualizar"}
                </button>
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
              {isReadOnly ? "Marca los ítems culminados por proceso:" : "Agrega tipologías y marca los ítems culminados por proceso en cada una:"}
            </p>
            {!isReadOnly && (
              <div className="flex gap-2 mb-4">
                <button
                  type="button"
                  onClick={() => estadoObraFileInputRef.current?.click()}
                  disabled={importandoEstadoObra}
                  className="px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                >
                  {importandoEstadoObra ? "Importando..." : "📤 Importar Excel"}
                </button>
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
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h4 className="font-semibold text-gray-800 text-base">{tipologia.nombre}</h4>
                      {(tipologia.descripcion || tipologia.ancho != null || tipologia.alto != null || tipologia.comentarios) && (
                        <p className="text-xs text-gray-500 mt-0.5">
                          {[tipologia.descripcion, tipologia.ancho != null && `Ancho: ${tipologia.ancho}`, tipologia.alto != null && `Alto: ${tipologia.alto}`, tipologia.comentarios]
                            .filter(Boolean)
                            .join(" | ")}
                        </p>
                      )}
                    </div>
                    {!isReadOnly && (
                      <button
                        type="button"
                        onClick={() => handleEliminarTipologia(idx)}
                        className="text-red-500 hover:text-red-700 text-sm px-2 py-1"
                        title="Eliminar tipología"
                      >
                        ✕ Eliminar
                      </button>
                    )}
                  </div>
                  <div className="space-y-3">
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
                                <label className="flex items-center gap-1.5 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={checked}
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
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              {!isReadOnly && (mostrarAgregarTipologia ? (
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
              <button
                type="button"
                onClick={handleUpdateEstadoObra}
                disabled={updatingEstadoObra}
                className="flex-1 px-4 py-2 bg-amber-500 text-white font-semibold rounded-lg hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {updatingEstadoObra ? "Actualizando..." : "Actualizar"}
              </button>
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
