"use client";

import React, { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { canAccessOrdenesProduccion } from "@/lib/panol-access";

type OrdenProduccion = {
  id: string;
  created_at: string;
  num_carpeta: string | null;
  obra: string | null;
  mes: string | null;
  semana: string | null;
  url_imagen: string | null;
  usuario_id: string | null;
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

    const numCarpeta = formData.num_carpeta.trim();
    const existeDuplicado = ordenes.some(
      (o) =>
        o.num_carpeta?.trim().toLowerCase() === numCarpeta.toLowerCase() &&
        o.id !== editingOrden?.id
    );
    if (existeDuplicado) {
      setFormError(`El número de carpeta "${numCarpeta}" ya existe. Usa un número único.`);
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
          num_carpeta: numCarpeta,
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
          num_carpeta: numCarpeta,
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
          <input
            type="text"
            placeholder="🔍 Buscar por carpeta, obra, mes, semana..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="px-4 py-3 border-2 border-gray-300 rounded-lg w-full max-w-md focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 transition-all duration-200"
          />
        </div>
      </div>

      {showArchivosModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full max-h-[80vh] overflow-hidden flex flex-col">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4">
                {editingOrden ? "Editar obra" : "Crear nueva obra"}
              </h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="num_carpeta" className="block text-sm font-medium text-gray-700 mb-1">
                    Número de carpeta * (único)
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
              <th className={headerClass}>Acciones</th>
              <th className={headerClass}>Fecha</th>
              <th className={headerClass}>Nº Carpeta</th>
              <th className={headerClass}>Obra</th>
              <th className={headerClass}>Mes</th>
              <th className={headerClass}>Semana</th>
              <th className={headerClass}>Imagen</th>
            </tr>
          </thead>
          <tbody>
            {filteredOrdenes.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  className="px-4 py-8 text-center text-gray-500"
                >
                  No hay órdenes de producción registradas.
                </td>
              </tr>
            ) : (
              filteredOrdenes.map((orden) => (
                <tr key={orden.id} className="hover:bg-gray-50 transition-colors duration-200">
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
                  <td className={cellClass}>{formatDate(orden.created_at)}</td>
                  <td className={cellClass}>
                    {renderValue(orden.num_carpeta)}
                  </td>
                  <td className={cellClass}>{renderValue(orden.obra)}</td>
                  <td className={cellClass}>{renderValue(orden.mes)}</td>
                  <td className={cellClass}>{renderValue(orden.semana)}</td>
                  <td className={cellClass}>
                    {(() => {
                      const items = parseImageItems(orden.url_imagen);
                      if (items.length === 0) return "-";
                      return (
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
