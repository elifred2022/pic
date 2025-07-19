"use client";

import React, { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";


type Proveedor = {
  id: string;
  created_at: string;
  nombreprov: string;
  cuitprov: string;
  direccionprov: string;
  emailprov: string;
  telefonoprov: string;
  contactoprov: string;
  activoprov: string;

  
  
  // Agregá más campos si los usás en el .map()
};

export default function ListProveedores() {
  const [search, setSearch] = useState("");
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [editingProveedor, setEditingProveedor] = useState<Proveedor | null>(null);
  const [ocultarProvInactivo, setOcultarProvInactivo] = useState(false);
  
  const [formData, setFormData] = useState<Partial<Proveedor>>({});
  const supabase = createClient();

  /* para que no desactive checkbox al reset pagia  Al montar, leé localStorage (solo se ejecuta en el navegador) */
    useEffect(() => {
     const savedInactivo = localStorage.getItem("ocultarProvInactivo");
     
   
     if (savedInactivo !== null) setOcultarProvInactivo(savedInactivo === "true");
     
   }, []);
   
   
     /* Cada vez que cambia, actualizá localStorage */
    useEffect(() => {
     localStorage.setItem("ocultarProvInactivo", String(ocultarProvInactivo));
   }, [ocultarProvInactivo]);
   
 
   

  // Cargar datos
  useEffect(() => {
    const fetchProveedores = async () => {
      const { data, error } = await supabase.from("proveedor").select("*")
  
      if (error) console.error("Error cargando proveedores:", error);
      else setProveedores(data);
    };
    fetchProveedores();
  }, [supabase]);

  // funcion para formatear las fechas
 function formatDate(dateString: string | null): string {
  if (!dateString) return "-";

  // Evitar que el navegador aplique zona horaria
  const parts = dateString.split("T")[0].split("-");
  const year = parseInt(parts[0]);
  const month = parseInt(parts[1]) - 1; // meses en JS van de 0 a 11
  const day = parseInt(parts[2]);

  const date = new Date(year, month, day); // Esto crea la fecha en hora local
  return date.toLocaleDateString("es-AR");
}

//Campos de tabla que son fecha para funcion filtrar
const dateFields: (keyof Proveedor)[] = [
  "created_at",
  
];

//Filtro que también contempla las fechas
const filteredProveedores = proveedores
  .filter((proveedor) => {
    const s = search.trim().toLowerCase();   // la búsqueda, ya normalizada
    if (!s) return true;                     // si el input está vacío, no filtra nada

    return Object.entries(proveedor).some(([key, value]) => {
      if (value === null || value === undefined) return false;

      // A) Comparar contra la versión texto “tal cual viene”
      if (String(value).toLowerCase().includes(s)) return true;

      // B) Si el campo es fecha, probar otras representaciones
      if (dateFields.includes(key as keyof Proveedor)) {
        const isoDate = String(value).split("T")[0];          // YYYY-MM-DD
        const niceDate = formatDate(value as string);         // DD/MM/YYYY

        return (
          isoDate.toLowerCase().includes(s) ||
          niceDate.toLowerCase().includes(s)
        );
      }
      return false;
    });
  })
  .filter((proveedor) => {
  if (ocultarProvInactivo && proveedor.activoprov === "inactivo") return false;
  
  return true;
});

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

const headerClass =
  "px-2 py-1 border text-xs font-semibold bg-gray-100 whitespace-nowrap"; // ← evita saltos de línea
const cellClass =
  "px-2 py-1 border align-top text-sm text-justify whitespace-pre-wrap break-words";

  return (
    <div className="flex-1 w-full overflow-auto p-4">
        <Link
              href="/protected"
              className="inline-block px-4 py-2 mb-4 bg-white text-black font-semibold rounded-md shadow hover:bg-blue-700 transition-colors duration-200"
            >
              Ir a Pedidos
            </Link>

        <h1 className="text-xl font-bold mb-4">Modulo Proveedores</h1>


        <div className="flex flex-wrap gap-4 items-center">
             <Link
            href="/auth/crear-proveedor"
            className="inline-block px-4 py-2 mb-4 bg-white text-black font-semibold rounded-md shadow hover:bg-blue-700 transition-colors duration-200"
          >
            Crear nuevo proveedor
          </Link>
            <input
            type="text"
            placeholder="Buscar proveedor..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="mb-4 px-4 py-2 border rounded w-full max-w-md"
          />
        </div>

       <div className="flex flex-wrap gap-4 items-center">
          <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={ocultarProvInactivo}
            onChange={() => setOcultarProvInactivo((v) => !v)}
            className="w-4 h-4"
          />
          Ocultar prov. inactivos
        </label>

       
      </div>

     
      <table className="min-w-full table-auto border border-gray-300 shadow-md rounded-md overflow-hidden">
        <thead className="bg-gray-100 text-gray-700">
          <tr className="bg-gray-100">

           
            <th  className={headerClass}>Accion</th>
             <th  className={headerClass}>Id</th>
             <th  className={headerClass}>Fecha de alta</th>
            <th  className={headerClass}>Proveedor</th>
            <th  className={headerClass}>Cuit</th>
            <th  className={headerClass}>Direcc.</th>
            <th  className={headerClass}>email</th>
            <th  className={headerClass}>Telefono</th>
            <th  className={headerClass}>Contacto</th>
            <th  className={headerClass}>Situacion</th>
            
           
           
            
          </tr>
        </thead>
        <tbody>
          {filteredProveedores.map((proveedor) => (
            <tr key={proveedor.id}>
              <td className={cellClass}>
                <div className="flex gap-2">
                  <button
                    className="px-4 py-2 bg-white text-black font-semibold rounded-md shadow hover:bg-blue-700 transition-colors duration-200"
                    onClick={() => {
                      setEditingProveedor(proveedor);
                      setFormData({
                        created_at: proveedor.created_at,
                        id: proveedor.id,
                        nombreprov: proveedor.nombreprov,
                        cuitprov: proveedor.cuitprov,
                        direccionprov: proveedor.direccionprov,
                        emailprov: proveedor.emailprov,
                        telefonoprov: proveedor.telefonoprov,
                        contactoprov: proveedor.contactoprov,
                        activoprov: proveedor.activoprov,
                      });
                    }}
                  >
                    Edit
                  </button>

                  <button
                    className="px-4 py-2 bg-white text-red-700 font-semibold rounded-md shadow hover:bg-red-700 hover:text-black transition-colors duration-200"
                    onClick={async () => {
                      const confirm = window.confirm(
                        `¿Estás seguro de que querés eliminar el proveedor ${proveedor.id} ${proveedor.nombreprov} ?`
                      );
                      if (!confirm) return;

                      const { error } = await supabase.from("proveedor").delete().eq("id", proveedor.id);
                      if (error) {
                        alert("Error al eliminar");
                        console.error(error);
                      } else {
                        alert("Proveedor eliminado");
                        const { data } = await supabase.from("proveedor").select("*");
                        if (data) setProveedores(data);
                      }
                    }}
                  >
                    Elim
                  </button>

                  
                </div></td>

                <td className={cellClass}>{proveedor.id}</td>
              <td className={cellClass}>{formatDate(proveedor.created_at) || "-"}</td>
                <td className={cellClass}>{renderValue(proveedor.nombreprov)}</td>
             
               <td className={cellClass}>{proveedor.cuitprov}</td>
                <td className={cellClass}>{proveedor.direccionprov}</td>
                <td className={cellClass}>{proveedor.emailprov}</td>
                <td className={cellClass}>{proveedor.telefonoprov}</td>
                <td className={cellClass}>{proveedor.contactoprov}</td>
                <td className={cellClass}>{proveedor.activoprov}</td>

              
             
              
            
            </tr>
          ))}
        </tbody>
      </table>

      

      {/* MODAL */}
      {editingProveedor && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
          <div className="bg-white p-6 rounded shadow-lg w-full max-w-md max-h-screen overflow-y-auto">
            <h2 className="text-black font-bold mb-4">Aprobar pedido #{editingProveedor.id}</h2>
           
            
            
              <div className="mb-4 flex justify-between">
                <span className="text-black font-semibold">Proveedor: {editingProveedor.nombreprov}</span>
               
              </div>

                <label className="block mb-4">
                    <p className="text-black">Proveedor</p>
                        <input
                            className="w-full border p-2 rounded mt-1"
                            type="text"
                            value={formData.nombreprov ?? ""}
                            onChange={(e) =>
                            setFormData({ ...formData, nombreprov: e.target.value})
                            }
                        />
                        </label>

                <label className="block mb-4">
                    <p className="text-black">Direccion</p>
                        <input
                            className="w-full border p-2 rounded mt-1"
                            type="text"
                            value={formData.direccionprov ?? ""}
                            onChange={(e) =>
                            setFormData({ ...formData, direccionprov: e.target.value})
                            }
                        />
                </label>

                 <label className="block mb-4">
                    <p className="text-black">Situacion</p>
                        <input
                            className="w-full border p-2 rounded mt-1"
                            type="text"
                            value={formData.activoprov ?? ""}
                            onChange={(e) =>
                            setFormData({ ...formData, activoprov: e.target.value})
                            }
                        />
                </label>
           
          

                <div className="flex justify-end space-x-2">
                <button
                    onClick={() => setEditingProveedor(null)}
                    className="px-4 py-2 bg-gray-400 text-white rounded"
                >
                    Cancelar
                </button>
                <button
                    onClick={async () => {
                    const { error } = await supabase
                        .from("proveedor")
                        .update(formData)
                        .eq("id", editingProveedor.id);

                    if (error) {
                        alert("Error actualizando");
                        console.error(error);
                    } else {
                        alert("Actualizado correctamente");
                        setEditingProveedor(null);
                        setFormData({});
                        const { data } = await supabase.from("proveedor").select("*");
                        if (data) setProveedores(data);
                    }
                    }}
                    className="px-4 py-2 bg-blue-600 text-white rounded"
                >
                   Guardar
            </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}