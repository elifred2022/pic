"use client";

import React, { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import * as XLSX from "xlsx";

type Tipologia = {
  id: string;
  tipologia: string | null;
  descripcion: string | null;
  cant_hoja: number | null;
  ancho: number | null;
  alto: number | null;
  comentarios: string | null;
  created_at: string | null;
};

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

type ListTipologiasProps = {
  onClose: () => void;
};

const initialFormData = {
  tipologia: "",
  descripcion: "",
  cant_hoja: "",
  ancho: "",
  alto: "",
  comentarios: "",
};

export default function ListTipologias({ onClose }: ListTipologiasProps) {
  const [tipologias, setTipologias] = useState<Tipologia[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState(initialFormData);
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const supabase = createClient();

  const fetchTipologias = useCallback(async () => {
    const { data, error } = await supabase
      .from("tipologia")
      .select("*")
      .order("tipologia", { ascending: true });

    if (error) {
      console.error("Error cargando tipologías:", error);
    } else {
      setTipologias(data ?? []);
    }
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    fetchTipologias();
  }, [fetchTipologias]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setFormError("");
    setFormSuccess("");
    if (!formData.tipologia.trim()) {
      setFormError("Tipología es obligatorio.");
      setSubmitting(false);
      return;
    }
    const payload = {
      tipologia: formData.tipologia.trim(),
      descripcion: formData.descripcion.trim() || null,
      cant_hoja: formData.cant_hoja ? parseInt(formData.cant_hoja, 10) : null,
      ancho: formData.ancho ? parseFloat(formData.ancho) : null,
      alto: formData.alto ? parseFloat(formData.alto) : null,
      comentarios: formData.comentarios.trim() || null,
    };
    const { error } = await supabase.from("tipologia").insert(payload);
    if (error) {
      setFormError(`Error al guardar: ${error.message}`);
      setSubmitting(false);
      return;
    }
    setFormSuccess("Tipología creada correctamente.");
    setFormData(initialFormData);
    await fetchTipologias();
    setSubmitting(false);
    setTimeout(() => {
      setShowForm(false);
      setFormSuccess("");
    }, 1500);
  };

  const handleExportExcel = () => {
    setExporting(true);
    try {
      const rows = tipologias.map((t) => ({
        tipologias: t.tipologia ?? "",
        descripcion: t.descripcion ?? "",
        ancho: t.ancho ?? "",
        alto: t.alto ?? "",
        comentarios: t.comentarios ?? "",
      }));
      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Tipologías");
      XLSX.writeFile(wb, `tipologias_${new Date().toISOString().slice(0, 10)}.xlsx`);
    } catch (err) {
      console.error("Error al exportar:", err);
      alert("Error al exportar el archivo Excel.");
    } finally {
      setExporting(false);
    }
  };

  const filtered = tipologias.filter((t) => {
    const s = search.trim().toLowerCase();
    if (!s) return true;
    return (
      renderValue(t.tipologia).toLowerCase().includes(s) ||
      renderValue(t.descripcion).toLowerCase().includes(s) ||
      renderValue(t.comentarios).toLowerCase().includes(s)
    );
  });

  const headerClass =
    "px-4 py-3 border-b border-blue-500 text-sm font-bold whitespace-nowrap text-center";
  const cellClass =
    "px-4 py-3 border-b border-gray-200 align-top text-sm text-center whitespace-pre-wrap break-words";

  return (
    <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[85vh] overflow-hidden flex flex-col">
      <div className="p-4 border-b border-gray-200 flex flex-wrap gap-4 items-center justify-between">
        <h2 className="text-xl font-bold text-gray-800">📋 Tipologías</h2>
        <div className="flex gap-2 items-center flex-wrap">
          <button
            type="button"
            onClick={() => {
              setShowForm(true);
              setFormData(initialFormData);
              setFormError("");
              setFormSuccess("");
            }}
            className="px-4 py-2 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700"
          >
            ➕ Nueva tipología
          </button>
          <button
            type="button"
            onClick={handleExportExcel}
            disabled={exporting || tipologias.length === 0}
            className="px-4 py-2 bg-emerald-600 text-white font-semibold rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {exporting ? "Exportando..." : "📥 Exportar Excel"}
          </button>
          <input
            type="text"
            placeholder="Buscar..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm w-48"
          />
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Cerrar
          </button>
        </div>
      </div>

      {showForm && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4"
          onClick={() => { setShowForm(false); setFormData(initialFormData); setFormError(""); setFormSuccess(""); }}
          role="presentation"
        >
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-gray-800 mb-4">Crear tipología</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="tipologia" className="block text-sm font-medium text-gray-700 mb-1">
                  Tipología *
                </label>
                <input
                  id="tipologia"
                  type="text"
                  value={formData.tipologia}
                  onChange={(e) => setFormData((p) => ({ ...p, tipologia: e.target.value }))}
                  className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-200 focus:border-blue-500"
                  placeholder="Nombre de la tipología"
                />
              </div>
              <div>
                <label htmlFor="descripcion" className="block text-sm font-medium text-gray-700 mb-1">
                  Descripción
                </label>
                <textarea
                  id="descripcion"
                  value={formData.descripcion}
                  onChange={(e) => setFormData((p) => ({ ...p, descripcion: e.target.value }))}
                  className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-200 focus:border-blue-500"
                  placeholder="Descripción"
                  rows={2}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="cant_hoja" className="block text-sm font-medium text-gray-700 mb-1">
                    Cant. Hojas
                  </label>
                  <input
                    id="cant_hoja"
                    type="number"
                    min={0}
                    value={formData.cant_hoja}
                    onChange={(e) => setFormData((p) => ({ ...p, cant_hoja: e.target.value }))}
                    className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-200 focus:border-blue-500"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label htmlFor="ancho" className="block text-sm font-medium text-gray-700 mb-1">
                    Ancho
                  </label>
                  <input
                    id="ancho"
                    type="number"
                    step="0.01"
                    min={0}
                    value={formData.ancho}
                    onChange={(e) => setFormData((p) => ({ ...p, ancho: e.target.value }))}
                    className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-200 focus:border-blue-500"
                    placeholder="0"
                  />
                </div>
              </div>
              <div>
                <label htmlFor="alto" className="block text-sm font-medium text-gray-700 mb-1">
                  Alto
                </label>
                <input
                  id="alto"
                  type="number"
                  step="0.01"
                  min={0}
                  value={formData.alto}
                  onChange={(e) => setFormData((p) => ({ ...p, alto: e.target.value }))}
                  className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-200 focus:border-blue-500"
                  placeholder="0"
                />
              </div>
              <div>
                <label htmlFor="comentarios" className="block text-sm font-medium text-gray-700 mb-1">
                  Comentarios
                </label>
                <textarea
                  id="comentarios"
                  value={formData.comentarios}
                  onChange={(e) => setFormData((p) => ({ ...p, comentarios: e.target.value }))}
                  className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-200 focus:border-blue-500"
                  placeholder="Comentarios"
                  rows={2}
                />
              </div>
              {formError && <p className="text-sm text-red-600">{formError}</p>}
              {formSuccess && <p className="text-sm text-green-600">{formSuccess}</p>}
              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 px-4 py-2 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? "Guardando..." : "Guardar"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setFormData(initialFormData);
                    setFormError("");
                    setFormSuccess("");
                  }}
                  disabled={submitting}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="overflow-auto flex-1">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Cargando tipologías...</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No hay tipologías registradas. Ejecuta la migración create_tipologia.sql en Supabase.
          </div>
        ) : (
          <table className="min-w-full table-auto border-collapse">
            <thead className="bg-gradient-to-r from-blue-600 to-blue-700 text-white sticky top-0">
              <tr>
                <th className={headerClass}>Tipología</th>
                <th className={headerClass}>Descripción</th>
                <th className={headerClass}>Cant. Hojas</th>
                <th className={headerClass}>Ancho</th>
                <th className={headerClass}>Alto</th>
                <th className={headerClass}>Comentarios</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((t) => (
                <tr key={t.id} className="hover:bg-gray-50">
                  <td className={cellClass}>{renderValue(t.tipologia)}</td>
                  <td className={cellClass}>{renderValue(t.descripcion)}</td>
                  <td className={cellClass}>{renderValue(t.cant_hoja)}</td>
                  <td className={cellClass}>{renderValue(t.ancho)}</td>
                  <td className={cellClass}>{renderValue(t.alto)}</td>
                  <td className={cellClass}>{renderValue(t.comentarios)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
