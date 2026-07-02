"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useCanEditAsAdmin } from "@/hooks/use-can-edit-as-admin";
import { rolOpcionesForm, SIN_ROL } from "@/lib/panol-access";

type Usuario = {
  id: number;
  nombre: string;
  email: string;
  rol: string | null;
};

const headerClass =
  "px-2 py-1 border text-xs font-semibold bg-gray-100 whitespace-nowrap";
const cellClass =
  "px-2 py-1 border align-top text-sm text-justify whitespace-pre-wrap break-words";

const getRolLabel = (rol: string | null) => {
  if (!rol || rol === SIN_ROL) return "Sin rol";
  const opcion = rolOpcionesForm.find((o) => o.value === rol);
  return opcion ? opcion.label : rol;
};

export default function ListUsuarios() {
  const { canEdit } = useCanEditAsAdmin();
  const [search, setSearch] = useState("");
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingUsuario, setEditingUsuario] = useState<Usuario | null>(null);
  const [formData, setFormData] = useState<Partial<Usuario>>({});
  const [saving, setSaving] = useState(false);
  const supabase = createClient();

  const fetchUsuarios = async () => {
    const { data, error } = await supabase
      .from("usuarios")
      .select("id, nombre, email, rol")
      .order("nombre", { ascending: true });

    if (error) console.error("Error cargando usuarios:", error);
    else setUsuarios(data ?? []);

    setLoading(false);
  };

  useEffect(() => {
    void fetchUsuarios();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredUsuarios = usuarios.filter((usuario) => {
    const s = search.trim().toLowerCase();
    if (!s) return true;

    return [usuario.id, usuario.nombre, usuario.email, usuario.rol].some(
      (value) =>
        value !== null &&
        value !== undefined &&
        String(value).toLowerCase().includes(s),
    );
  });

  const openEditModal = (usuario: Usuario) => {
    setEditingUsuario(usuario);
    setFormData({
      id: usuario.id,
      nombre: usuario.nombre,
      email: usuario.email,
      rol: usuario.rol ?? SIN_ROL,
    });
  };

  const handleSave = async () => {
    if (!editingUsuario) return;

    setSaving(true);
    const { error } = await supabase
      .from("usuarios")
      .update({
        nombre: formData.nombre,
        email: formData.email,
        rol: formData.rol,
      })
      .eq("id", editingUsuario.id);

    setSaving(false);

    if (error) {
      alert("Error al actualizar el usuario");
      console.error(error);
      return;
    }

    alert("Usuario actualizado correctamente");
    setEditingUsuario(null);
    setFormData({});
    await fetchUsuarios();
  };

  return (
    <div className="flex-1 w-full overflow-auto p-4">
      <Link
        href="/auth/modulo-compras"
        className="inline-block px-4 py-2 mb-4 bg-white text-black font-semibold rounded-md shadow hover:bg-blue-700 transition-colors duration-200"
      >
        Volver
      </Link>

      <h1 className="text-xl font-bold mb-4">Módulo Usuarios</h1>
      {!canEdit && (
        <p className="mb-4 text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
          Modo solo lectura: podés consultar usuarios pero no modificarlos.
        </p>
      )}

      <input
        type="text"
        placeholder="Buscar usuario..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="mb-4 px-4 py-2 border rounded w-full max-w-md"
      />

      {loading ? (
        <p className="text-gray-600">Cargando usuarios...</p>
      ) : (
        <table className="min-w-full table-auto border border-gray-300 shadow-md rounded-md overflow-hidden">
          <thead className="bg-gray-100 text-gray-700">
            <tr>
              {canEdit && <th className={headerClass}>Acción</th>}
              <th className={headerClass}>Id</th>
              <th className={headerClass}>Nombre</th>
              <th className={headerClass}>Email</th>
              <th className={headerClass}>Rol</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsuarios.length === 0 ? (
              <tr>
                <td colSpan={canEdit ? 5 : 4} className={`${cellClass} text-center text-gray-500`}>
                  No se encontraron usuarios.
                </td>
              </tr>
            ) : (
              filteredUsuarios.map((usuario) => (
                <tr key={usuario.id} className="hover:bg-gray-50">
                  {canEdit && (
                  <td className={cellClass}>
                    <button
                      type="button"
                      className="px-4 py-2 bg-white text-black font-semibold rounded-md shadow hover:bg-blue-700 transition-colors duration-200"
                      onClick={() => openEditModal(usuario)}
                    >
                      Editar
                    </button>
                  </td>
                  )}
                  <td className={cellClass}>{usuario.id}</td>
                  <td className={cellClass}>{usuario.nombre || "-"}</td>
                  <td className={cellClass}>{usuario.email || "-"}</td>
                  <td className={cellClass}>{getRolLabel(usuario.rol)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      )}

      {canEdit && editingUsuario && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
          <div className="bg-white p-6 rounded shadow-lg w-full max-w-md max-h-screen overflow-y-auto">
            <h2 className="text-black font-bold mb-4">
              Editar usuario #{editingUsuario.id}
            </h2>

            <label className="block mb-4">
              <p className="text-black">Id</p>
              <input
                className="w-full border p-2 rounded mt-1 bg-gray-100"
                type="text"
                value={formData.id ?? ""}
                readOnly
              />
            </label>

            <label className="block mb-4">
              <p className="text-black">Nombre</p>
              <input
                className="w-full border p-2 rounded mt-1"
                type="text"
                value={formData.nombre ?? ""}
                onChange={(e) =>
                  setFormData({ ...formData, nombre: e.target.value })
                }
              />
            </label>

            <label className="block mb-4">
              <p className="text-black">Email</p>
              <input
                className="w-full border p-2 rounded mt-1"
                type="email"
                value={formData.email ?? ""}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
              />
            </label>

            <label className="block mb-4">
              <p className="text-black">Rol</p>
              <select
                className="w-full border p-2 rounded mt-1"
                value={formData.rol ?? SIN_ROL}
                onChange={(e) =>
                  setFormData({ ...formData, rol: e.target.value })
                }
              >
                {rolOpcionesForm.map((opcion) => (
                  <option key={opcion.value} value={opcion.value}>
                    {opcion.label}
                  </option>
                ))}
              </select>
            </label>

            <div className="flex justify-end space-x-2">
              <button
                type="button"
                onClick={() => {
                  setEditingUsuario(null);
                  setFormData({});
                }}
                className="px-4 py-2 bg-gray-400 text-white rounded"
                disabled={saving}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSave}
                className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
                disabled={saving}
              >
                {saving ? "Guardando..." : "Guardar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
