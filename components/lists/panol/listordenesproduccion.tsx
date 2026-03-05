"use client";

import React, { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { isPanolEmail } from "@/lib/panol-access";

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
  const [imagenFile, setImagenFile] = useState<File | null>(null);
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
    if (!isPanolEmail(user.email)) {
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
    setImagenFile(null);
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
    setImagenFile(null);
    setFormError("");
    setFormSuccess("");
    setShowModal(true);
  };

  const handleDelete = async (orden: OrdenProduccion) => {
    if (!confirm("¿Estás seguro de que deseas eliminar esta obra?")) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase
      .from("ordenes_produccion")
      .delete()
      .eq("id", orden.id)
      .eq("usuario_id", user.id);
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

    let urlImagen: string | null = editingOrden?.url_imagen ?? null;

    if (imagenFile) {
      const fileExt = imagenFile.name.split(".").pop() || "jpg";
      const filePath = `${user.id}/${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("ordenes")
        .upload(filePath, imagenFile, { upsert: false });

      if (uploadError) {
        setFormError(`Error al subir la imagen: ${uploadError.message}`);
        setSubmitting(false);
        return;
      }

      const { data: urlData } = supabase.storage
        .from("ordenes")
        .getPublicUrl(filePath);
      urlImagen = urlData.publicUrl;
    }

    if (editingOrden) {
      const { error: updateError } = await supabase
        .from("ordenes_produccion")
        .update({
          num_carpeta: formData.num_carpeta.trim(),
          obra: formData.obra.trim(),
          mes: formData.mes,
          semana: formData.semana,
          url_imagen: urlImagen,
        })
        .eq("id", editingOrden.id)
        .eq("usuario_id", user.id);

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
              setImagenFile(null);
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
                  <label htmlFor="imagen" className="block text-sm font-medium text-gray-700 mb-1">
                    Imagen {editingOrden && "(dejar vacío para mantener la actual)"}
                  </label>
                  <input
                    id="imagen"
                    type="file"
                    accept="image/*"
                    onChange={(e) => setImagenFile(e.target.files?.[0] ?? null)}
                    className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-200 focus:border-blue-500 file:mr-2 file:py-1 file:px-3 file:rounded file:border-0 file:bg-blue-100 file:text-blue-800"
                  />
                  {imagenFile && (
                    <p className="text-xs text-gray-500 mt-1">{imagenFile.name}</p>
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
                    {orden.url_imagen ? (
                      <a
                        href={orden.url_imagen}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-block px-3 py-2 bg-blue-500 text-white font-medium rounded-lg shadow-md hover:bg-blue-600 transition-all duration-200 text-sm"
                      >
                        Ver
                      </a>
                    ) : (
                      "-"
                    )}
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
