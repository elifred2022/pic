"use client";

import React, { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";

type Pedido = {
  id: string;
  created_at: string;
  necesidad: string;
  categoria: string;
  solicita: string;
  sector: string;
  cc: number;
  cant: number;
  cant_exist: number;
  articulo: string;
  descripcion: string;
  estado: string;
  oc: number;
  proveedor_selec: string;
 
  fecha_conf: string;
  fecha_prom: string;
  fecha_ent: string;
  rto: number;
  fac: number;
  
  
  // Agregá más campos si los usás en el .map()
};

export default function ListUs() {
  const [search, setSearch] = useState("");
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [editingPedido, setEditingPedido] = useState<Pedido | null>(null);
  const [formData, setFormData] = useState<Partial<Pedido>>({});
  const supabase = createClient();

  // Cargar datos
  useEffect(() => {
    const fetchPedidos = async () => {
      const { data, error } = await supabase.from("pic").select("*")
  
      if (error) console.error("Error cargando pedidos:", error);
      else setPedidos(data);
    };
    fetchPedidos();
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

const filteredPedidos = pedidos.filter((pedido) =>
  Object.values(pedido).some((val) =>
    String(val).toLowerCase().includes(search.toLowerCase())
  )
);




  return (
    <div className="flex-1 w-full overflow-auto p-4">
      <input
  type="text"
  placeholder="Buscar..."
  value={search}
  onChange={(e) => setSearch(e.target.value)}
  className="mb-4 px-4 py-2 border rounded w-full max-w-md"
/>

      <h1 className="text-xl font-bold mb-4">Sus pedidos</h1>
      <Link
        href="/auth/crear-formus"
        className="inline-block px-4 py-2 mb-4 bg-white text-black font-semibold rounded-md shadow hover:bg-blue-700 transition-colors duration-200"
      >
        Nuevo pedido
      </Link>
      <table className="min-w-full table-auto border border-gray-300 shadow-md rounded-md overflow-hidden">
        <thead className="bg-gray-100 text-gray-700">
          <tr className="bg-gray-100">
             <th className="px-4 py-2 border">Acciones</th>
            <th className="px-4 py-2 border">Nº PIC</th>
            <th className="px-4 py-2 border">Fecha sol</th>
            <th className="px-4 py-2 border">Fecha nec</th>
            <th className="px-4 py-2 border">Categoria</th>
            <th className="px-4 py-2 border">Solicita</th>
            <th className="px-4 py-2 border">Sector</th>
            <th className="px-4 py-2 border">Cod cta</th>
            <th className="px-4 py-2 border">Cant sol</th>
            <th className="px-4 py-2 border">Cant exist</th>
            <th className="px-4 py-2 border">Articulo</th>
            <th className="px-4 py-2 border">Descripcion</th>
            <th className="px-4 py-2 border">Estado</th>
            <th className="px-4 py-2 border">OC</th>
            <th className="px-4 py-2 border">Proveedor Selec.</th>
            <th className="px-4 py-2 border">Fecha confirm</th>
            <th className="px-4 py-2 border">Fecha prometida</th>
            <th className="px-4 py-2 border">Fecha entrega</th>
            <th className="px-4 py-2 border">Rto</th>
            <th className="px-4 py-2 border">Fact</th>
           
           
            
          </tr>
        </thead>
        <tbody>
          {filteredPedidos.map((pedido) => (
            <tr key={pedido.id}>
              <td className="border px-4 py-2">
                <div className="flex gap-2">
                  <button
                    className="px-4 py-2 bg-white text-black font-semibold rounded-md shadow hover:bg-blue-700 transition-colors duration-200"
                    onClick={() => {
                      setEditingPedido(pedido);
                      setFormData({
                        created_at: pedido.created_at,
                        necesidad: pedido.necesidad,
                        categoria: pedido.categoria,
                        solicita: pedido.solicita,
                        sector: pedido.sector,
                        cc: pedido.cc,
                        cant: pedido.cant,
                        cant_exist: pedido.cant_exist,
                        articulo: pedido.articulo,
                        descripcion: pedido.descripcion,
                        estado: pedido.estado,
                        oc: pedido.oc,
                        proveedor_selec: pedido.proveedor_selec,
                       
                        fecha_conf: pedido.fecha_conf,
                        fecha_prom: pedido.fecha_prom,
                        fecha_ent: pedido.fecha_ent,
                        rto: pedido.rto,
                        fac: pedido.fac,
                       
                      });
                    }}
                  >
                    Edit
                  </button>

                  
                </div></td>
              <td className="px-4 py-2 border">{pedido.id}</td>
              <td className="px-4 py-2 border">{formatDate(pedido.created_at) || "-"}</td>
              <td className="px-4 py-2 border">{formatDate(pedido.necesidad)}</td>
              <td className="px-4 py-2 border">{pedido.categoria}</td>
              <td className="px-4 py-2 border">{pedido.solicita}</td>
              <td className="px-4 py-2 border">{pedido.sector}</td>
              <td className="px-4 py-2 border">{pedido.cc}</td>
              <td className="px-4 py-2 border">{pedido.cant}</td>
              <td className="px-4 py-2 border">{pedido.cant_exist}</td>
              <td className="px-4 py-2 border">{pedido.articulo}</td>
              <td className="px-4 py-2 border">{pedido.descripcion}</td>
              
              <td className="px-4 py-2 border">
                <span
                    className={
                    pedido.estado === "anulado"
                        ? "text-red-500 font-semibold"
                        : pedido.estado === "aprobado"
                        ? "text-green-600 font-semibold"
                        : pedido.estado === "cotizado"
                        ? "text-yellow-600 font-semibold"
                        : pedido.estado === "stand by"
                        ? "text-orange-500 font-semibold"
                        : pedido.estado === "Presentar presencial"
                        ? "text-orange-500 font-semibold"
                        : pedido.estado === "cumplido"
                        ? "text-green-800 font-semibold"
                        : "text-black"
                    }
                >
                    {pedido.estado || ""}
                </span>
            </td>
              
              
              <td className="px-4 py-2 border">{pedido.oc || ""}</td>
              <td className="px-4 py-2 border">{pedido.proveedor_selec || ""}</td>
             
              <td className="px-4 py-2 border">{formatDate(pedido.fecha_conf)}</td>
              <td className="px-4 py-2 border">{formatDate(pedido.fecha_prom)}</td>
              <td className="px-4 py-2 border">{formatDate(pedido.fecha_ent)}</td>
              <td className="px-4 py-2 border">{pedido.rto || ""}</td>
              <td className="px-4 py-2 border">{pedido.fac || ""}</td>
             
              
            
            </tr>
          ))}
        </tbody>
      </table>

      {/* MODAL */}
      {editingPedido && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
          <div className="bg-white p-6 rounded shadow-lg w-full max-w-md max-h-screen overflow-y-auto">
            <h2 className="text-lg font-bold mb-4">Editar Pedido #{editingPedido.id}</h2>
            
             <label className="block mb-4">
            <p className="text-black">Descripcion</p>
              <input
                className="w-full border p-2 rounded mt-1"
                type="text"
                value={formData.descripcion ?? 0}
                onChange={(e) =>
                  setFormData({ ...formData, descripcion: e.target.value })
                }
              />
            </label>
            <label className="block mb-2">
               <p className="text-black">Fecha entrega</p>
              <input
                className="w-full border p-2 rounded mt-1"
                type="date"
                value={formData.fecha_ent ?? ""}
                onChange={(e) =>
                  setFormData({ ...formData, fecha_ent: e.target.value })
                }
              />
            </label>
            
             <label className="block mb-4">
           <p className="text-black">Rto.</p>
              <input
                className="w-full border p-2 rounded mt-1"
                type="text"
                value={formData.rto ?? 0}
                onChange={(e) =>
                  setFormData({ ...formData, rto: Number(e.target.value)  })
                }
              />
            </label>
             <label className="block mb-4">
            <p className="text-black">Fac.</p>
              <input
                className="w-full border p-2 rounded mt-1"
                type="text"
                value={formData.fac ?? 0}
                onChange={(e) =>
                  setFormData({ ...formData, fac: Number(e.target.value)  })
                }
              />
            </label>
          
                      

            <div className="flex justify-end space-x-2">
              <button
                onClick={() => setEditingPedido(null)}
                className="px-4 py-2 bg-gray-400 text-white rounded"
              >
                Cancelar
              </button>
              <button
                onClick={async () => {
                  const { error } = await supabase
                    .from("pic")
                    .update(formData)
                    .eq("id", editingPedido.id);

                  if (error) {
                    alert("Error actualizando");
                    console.error(error);
                  } else {
                    alert("Actualizado correctamente");
                    setEditingPedido(null);
                    setFormData({});
                    const { data } = await supabase.from("pic").select("*");
                    if (data) setPedidos(data);
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

