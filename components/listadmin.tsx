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
  usd: number;
  eur: number;
  tc: number;
  ars: number;
  porcent: number;
  ars_desc: number;
  total_simp: number;
  fecha_conf: string;
  fecha_prom: string;
  fecha_ent: string;
  rto: number;
  fac: number;
  mod_pago: string;
  proceso: string;
  prov_uno: string;
  cost_prov_uno: number;
  prov_dos: string;
  cost_prov_dos: number;
  prov_tres: string;
  cost_prov_tres: number;
  // Agregá más campos si los usás en el .map()
};

export default function ListAdmin() {
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
  }, []);

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



  return (
    <div className="flex-1 w-full overflow-auto p-4">
      <h1 className="text-xl font-bold mb-4">Sus pedidos</h1>
      <Link
        href="/auth/crear-form"
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
            <th className="px-4 py-2 border">Prov. 1</th>
            <th className="px-4 py-2 border">Cost Prov 1</th>
            <th className="px-4 py-2 border">Prov. 2</th>
            <th className="px-4 py-2 border">Cost Prov 2</th>
            <th className="px-4 py-2 border">Prov. 3</th>
            <th className="px-4 py-2 border">Cost Porv. 3</th>
            <th className="px-4 py-2 border">OC</th>
            <th className="px-4 py-2 border">Proveedor Selec.</th>
            <th className="px-4 py-2 border">USD</th>
            <th className="px-4 py-2 border">EUR</th>
            <th className="px-4 py-2 border">T.C</th>
            <th className="px-4 py-2 border">ARS</th>
            <th className="px-4 py-2 border">% Desc</th>
            <th className="px-4 py-2 border">ARS Con desc</th>
            <th className="px-4 py-2 border">Total sin imp</th>
            <th className="px-4 py-2 border">Fecha confirm</th>
            <th className="px-4 py-2 border">Fecha prometida</th>
            <th className="px-4 py-2 border">Fecha entrega</th>
            <th className="px-4 py-2 border">Rto</th>
            <th className="px-4 py-2 border">Fact</th>
            <th className="px-4 py-2 border">MOD pago</th>
            <th className="px-4 py-2 border">Proceso</th>
           
            
          </tr>
        </thead>
        <tbody>
          {pedidos.map((pedido) => (
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
                        usd: pedido.usd,
                        eur: pedido.eur,
                        tc: pedido.tc,
                        ars: pedido.ars,
                        porcent: pedido.porcent,
                        ars_desc: pedido.ars_desc,
                        total_simp: pedido.total_simp,
                        fecha_conf: pedido.fecha_conf,
                        fecha_prom: pedido.fecha_prom,
                        fecha_ent: pedido.fecha_ent,
                        rto: pedido.rto,
                        fac: pedido.fac,
                        mod_pago: pedido.mod_pago,
                        proceso: pedido.proceso,
                        prov_uno: pedido.prov_uno,
                        cost_prov_uno: pedido.cost_prov_uno,
                        prov_dos: pedido.prov_dos,
                        cost_prov_dos: pedido.cost_prov_dos,
                        prov_tres: pedido.prov_tres,
                        cost_prov_tres: pedido.cost_prov_tres
                      });
                    }}
                  >
                    Edit
                  </button>

                  <button
                    className="px-4 py-2 bg-white text-red-700 font-semibold rounded-md shadow hover:bg-red-700 hover:text-black transition-colors duration-200"
                    onClick={async () => {
                      const confirm = window.confirm(
                        `¿Estás seguro de que querés eliminar el pedido ${pedido.id}?`
                      );
                      if (!confirm) return;

                      const { error } = await supabase.from("pic").delete().eq("id", pedido.id);
                      if (error) {
                        alert("Error al eliminar");
                        console.error(error);
                      } else {
                        alert("Pedido eliminado");
                        const { data } = await supabase.from("pic").select("*");
                        if (data) setPedidos(data);
                      }
                    }}
                  >
                    Elim
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
              <td className="px-4 py-2 border">{pedido.estado}</td>
              <td className="px-4 py-2 border">{pedido.prov_uno}</td>
              <td className="px-4 py-2 border">{pedido.cost_prov_uno}</td>
              <td className="px-4 py-2 border">{pedido.prov_dos}</td>
              <td className="px-4 py-2 border">{pedido.cost_prov_dos}</td>
              <td className="px-4 py-2 border">{pedido.prov_tres}</td>
              <td className="px-4 py-2 border">{pedido.cost_prov_tres}</td>
              <td className="px-4 py-2 border">{pedido.oc}</td>
              <td className="px-4 py-2 border">{pedido.proveedor_selec}</td>
              <td className="px-4 py-2 border">{pedido.usd}</td>
              <td className="px-4 py-2 border">{pedido.eur}</td>
              <td className="px-4 py-2 border">{pedido.tc}</td>
              <td className="px-4 py-2 border">{pedido.ars}</td>
              <td className="px-4 py-2 border">{pedido.porcent}</td>
              <td className="px-4 py-2 border">{pedido.ars_desc}</td>
              <td className="px-4 py-2 border">{pedido.total_simp}</td>
              <td className="px-4 py-2 border">{formatDate(pedido.fecha_conf)}</td>
              <td className="px-4 py-2 border">{formatDate(pedido.fecha_prom)}</td>
              <td className="px-4 py-2 border">{formatDate(pedido.fecha_ent)}</td>
              <td className="px-4 py-2 border">{pedido.rto}</td>
              <td className="px-4 py-2 border">{pedido.fac}</td>
              <td className="px-4 py-2 border">{pedido.mod_pago}</td>
              <td className="px-4 py-2 border">{pedido.proceso}</td>
              
            
            </tr>
          ))}
        </tbody>
      </table>

      {/* MODAL */}
      {editingPedido && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
          <div className="bg-white p-6 rounded shadow-lg w-full max-w-md max-h-screen overflow-y-auto">
            <h2 className="text-lg font-bold mb-4">Editar Pedido #{editingPedido.id}</h2>
            <label className="block mb-2">
              Necesidad
              <input
                className="w-full border p-2 rounded mt-1"
                type="date"
                value={formData.necesidad ?? ""}
                onChange={(e) =>
                  setFormData({ ...formData, necesidad: e.target.value })
                }
              />
            </label>

            <label className="block mb-4">
              Categoria
              <input
                className="w-full border p-2 rounded mt-1"
                type="text"
                value={formData.categoria ?? 0}
                onChange={(e) =>
                  setFormData({ ...formData, categoria: e.target.value })
                }
              />
            </label>

             <label className="block mb-4">
             Solicita
              <input
                className="w-full border p-2 rounded mt-1"
                type="text"
                value={formData.solicita ?? 0}
                onChange={(e) =>
                  setFormData({ ...formData, solicita: e.target.value })
                }
              />
            </label>
            <label className="block mb-4">
             Sector
              <input
                className="w-full border p-2 rounded mt-1"
                type="text"
                value={formData.sector ?? 0}
                onChange={(e) =>
                  setFormData({ ...formData, sector: e.target.value })
                }
              />
            </label>
             <label className="block mb-4">
             C.C.
              <input
                className="w-full border p-2 rounded mt-1"
                type="text"
                value={formData.cc ?? 0}
                onChange={(e) =>
                  setFormData({ ...formData, cc: Number(e.target.value) })
                }
              />
            </label>
            <label className="block mb-4">
             Cant.
              <input
                className="w-full border p-2 rounded mt-1"
                type="text"
                value={formData.cant ?? 0}
                onChange={(e) =>
                  setFormData({ ...formData, cant: Number(e.target.value) })
                }
              />
            </label>
            <label className="block mb-4">
            Cant_exist
              <input
                className="w-full border p-2 rounded mt-1"
                type="text"
                value={formData.cant_exist ?? 0}
                onChange={(e) =>
                  setFormData({ ...formData, cant_exist: Number(e.target.value) })
                }
              />
            </label>
            <label className="block mb-4">
            Articulo
              <input
                className="w-full border p-2 rounded mt-1"
                type="text"
                value={formData.articulo ?? 0}
                onChange={(e) =>
                  setFormData({ ...formData, articulo: e.target.value })
                }
              />
            </label>
             <label className="block mb-4">
            Descripcion
              <input
                className="w-full border p-2 rounded mt-1"
                type="text"
                value={formData.descripcion ?? 0}
                onChange={(e) =>
                  setFormData({ ...formData, descripcion: e.target.value })
                }
              />
            </label>
            <label className="block mb-4">
            Estado
              <input
                className="w-full border p-2 rounded mt-1"
                type="text"
                value={formData.estado ?? 0}
                onChange={(e) =>
                  setFormData({ ...formData, estado: e.target.value })
                }
              />
            </label>
             <label className="block mb-4">
            OC
              <input
                className="w-full border p-2 rounded mt-1"
                type="text"
                value={formData.oc ?? 0}
                onChange={(e) =>
                  setFormData({ ...formData, oc: Number(e.target.value)  })
                }
              />
            </label>
             <label className="block mb-4">
            Proveedor selecc
              <input
                className="w-full border p-2 rounded mt-1"
                type="text"
                value={formData.proveedor_selec ?? 0}
                onChange={(e) =>
                  setFormData({ ...formData, proveedor_selec: e.target.value})
                }
              />
            </label>
            <label className="block mb-4">
            Usd
              <input
                className="w-full border p-2 rounded mt-1"
                type="text"
                value={formData.usd ?? 0}
                onChange={(e) =>
                  setFormData({ ...formData, usd: Number(e.target.value)  })
                }
              />
            </label>
             <label className="block mb-4">
            Eur
              <input
                className="w-full border p-2 rounded mt-1"
                type="text"
                value={formData.eur ?? 0}
                onChange={(e) =>
                  setFormData({ ...formData, eur: Number(e.target.value)  })
                }
              />
            </label>
            <label className="block mb-4">
            T.C.
              <input
                className="w-full border p-2 rounded mt-1"
                type="text"
                value={formData.tc ?? 0}
                onChange={(e) =>
                  setFormData({ ...formData, tc: Number(e.target.value)  })
                }
              />
            </label>
             <label className="block mb-4">
            Ars
              <input
                className="w-full border p-2 rounded mt-1"
                type="text"
                value={formData.ars ?? 0}
                onChange={(e) =>
                  setFormData({ ...formData, ars: Number(e.target.value)  })
                }
              />
            </label>
             <label className="block mb-4">
            % desc
              <input
                className="w-full border p-2 rounded mt-1"
                type="text"
                value={formData.porcent ?? 0}
                onChange={(e) =>
                  setFormData({ ...formData, porcent: Number(e.target.value)  })
                }
              />
            </label>
             <label className="block mb-4">
            Ars con desc
              <input
                className="w-full border p-2 rounded mt-1"
                type="text"
                value={formData.ars_desc ?? 0}
                onChange={(e) =>
                  setFormData({ ...formData, ars_desc: Number(e.target.value)  })
                }
              />
            </label>
            <label className="block mb-4">
           Total sin imp
              <input
                className="w-full border p-2 rounded mt-1"
                type="text"
                value={formData.total_simp ?? 0}
                onChange={(e) =>
                  setFormData({ ...formData, total_simp: Number(e.target.value)  })
                }
              />
            </label>
            <label className="block mb-2">
              Fecha confirm
              <input
                className="w-full border p-2 rounded mt-1"
                type="date"
                value={formData.fecha_conf ?? ""}
                onChange={(e) =>
                  setFormData({ ...formData, fecha_conf: e.target.value })
                }
              />
            </label>
             <label className="block mb-2">
              Fecha promesa
              <input
                className="w-full border p-2 rounded mt-1"
                type="date"
                value={formData.fecha_prom ?? ""}
                onChange={(e) =>
                  setFormData({ ...formData, fecha_prom: e.target.value })
                }
              />
            </label>
             <label className="block mb-2">
              Fecha entrega
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
           Rto
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
           Fac
              <input
                className="w-full border p-2 rounded mt-1"
                type="text"
                value={formData.fac ?? 0}
                onChange={(e) =>
                  setFormData({ ...formData, fac: Number(e.target.value)  })
                }
              />
            </label>
            <label className="block mb-4">
            Mod de pago
              <input
                className="w-full border p-2 rounded mt-1"
                type="text"
                value={formData.mod_pago ?? 0}
                onChange={(e) =>
                  setFormData({ ...formData, mod_pago: e.target.value})
                }
              />
            </label>
             <label className="block mb-4">
            Proceso
              <input
                className="w-full border p-2 rounded mt-1"
                type="text"
                value={formData.proceso ?? 0}
                onChange={(e) =>
                  setFormData({ ...formData, proceso: e.target.value})
                }
              />
            </label>
             <label className="block mb-4">
            Prov. uno
              <input
                className="w-full border p-2 rounded mt-1"
                type="text"
                value={formData.prov_uno ?? 0}
                onChange={(e) =>
                  setFormData({ ...formData, prov_uno: e.target.value})
                }
              />
            </label>
             <label className="block mb-4">
           Cost prov 1
              <input
                className="w-full border p-2 rounded mt-1"
                type="text"
                value={formData.cost_prov_uno ?? 0}
                onChange={(e) =>
                  setFormData({ ...formData, cost_prov_uno: Number(e.target.value)  })
                }
              />
            </label>
             <label className="block mb-4">
            Prov. dos
              <input
                className="w-full border p-2 rounded mt-1"
                type="text"
                value={formData.prov_dos ?? 0}
                onChange={(e) =>
                  setFormData({ ...formData, prov_dos: e.target.value})
                }
              />
            </label>
             <label className="block mb-4">
           Cost prov 2
              <input
                className="w-full border p-2 rounded mt-1"
                type="text"
                value={formData.cost_prov_dos ?? 0}
                onChange={(e) =>
                  setFormData({ ...formData, cost_prov_dos: Number(e.target.value)  })
                }
              />
            </label>
            <label className="block mb-4">
            Prov. tres
              <input
                className="w-full border p-2 rounded mt-1"
                type="text"
                value={formData.prov_tres ?? 0}
                onChange={(e) =>
                  setFormData({ ...formData, prov_tres: e.target.value})
                }
              />
            </label>
             <label className="block mb-4">
           Cost prov 3
              <input
                className="w-full border p-2 rounded mt-1"
                type="text"
                value={formData.cost_prov_tres ?? 0}
                onChange={(e) =>
                  setFormData({ ...formData, cost_prov_tres: Number(e.target.value)  })
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




/*
"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

function ListAdmin() {

const [editingPedido, setEditingPedido] = useState<Pedido | null>(null);
const [formData, setFormData] = useState<Partial<Pedido>>({});


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
  usd: number;
  eur: number;
  tc: number;
  ars: number;
  porcent: number;
  ars_desc: number;
  total_simp: number;
  fecha_conf: string;
  fecha_prom: string;
  fecha_ent: string;
  rto: number;
  fac: number;
  mod_pago: string;
  proceso: string;
  prov_uno: string;
  cost_prov_uno: number;
  prov_dos: string;
  cost_prov_dos: number;
  prov_tres: string;
  cost_prov_tres: number;
  // Agregá más campos si los usás en el .map()
};
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const supabase = createClient();

  useEffect(() => {
    const fetchPedidos = async () => {
      const { data, error } = await supabase.from("pic").select("*");
      if (error) {
        console.error("Error al traer los pedidos:", error);
      } else {
        setPedidos(data);
      }
    };

    fetchPedidos();
  }, [supabase]);

 function formatDate(dateString: string | null): string {
  if (!dateString) return "-";
  const date = new Date(dateString);
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0"); // Los meses van de 0 a 11
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

  return (
    <div className="flex-1 w-full overflow-auto p-4">
      <Link
        href="/auth/crear-form"
        className="inline-block px-4 py-2 mb-4 bg-white text-black font-semibold rounded-md shadow hover:bg-blue-700 transition-colors duration-200"
      >
        Nuevo pedido
      </Link>

      <h1 className="text-xl font-semibold mb-4">Sus pedidos</h1>

      <table className="min-w-full table-auto border border-gray-300 shadow-md rounded-md overflow-hidden">
        <thead className="bg-gray-100 text-gray-700">
          <tr>
            <th className="px-4 py-2 border">Nº PIC</th>
            <th className="px-4 py-2 border">FECHA SOL</th>
            <th className="px-4 py-2 border">FECHA NECESIDAD</th>
            <th className="px-4 py-2 border">CATEGORIA</th>
            <th className="px-4 py-2 border">SOLICITA</th>
            <th className="px-4 py-2 border">SECTOR</th>
            <th className="px-4 py-2 border">COD CTA</th>
            <th className="px-4 py-2 border">CANT SOL</th>
            <th className="px-4 py-2 border">CANT EXIST</th>
            <th className="px-4 py-2 border">ARTICULO</th>
            <th className="px-4 py-2 border">DESCRIPCIÓN</th>
            <th className="px-4 py-2 border">ESTADO</th>
            <th className="px-4 py-2 border">PROV. 1</th>
            <th className="px-4 py-2 border">COSTO PROV 1</th>
            <th className="px-4 py-2 border">PROV. 2</th>
            <th className="px-4 py-2 border">COSTO PROV 2</th>
            <th className="px-4 py-2 border">PROV. 3</th>
            <th className="px-4 py-2 border">COSTO PROV. 3</th>
            <th className="px-4 py-2 border">OC</th>
            <th className="px-4 py-2 border">PROVEEDOR SELEC.</th>
            <th className="px-4 py-2 border">USD</th>
            <th className="px-4 py-2 border">EUR</th>
            <th className="px-4 py-2 border">T.C</th>
            <th className="px-4 py-2 border">ARS</th>
            <th className="px-4 py-2 border">% DESC</th>
            <th className="px-4 py-2 border">ARS CON DESC</th>
            <th className="px-4 py-2 border">TOTAL SIN IMP</th>
            <th className="px-4 py-2 border">FECHA CONFIRMADA</th>
            <th className="px-4 py-2 border">FECHA PROMETIDA</th>
            <th className="px-4 py-2 border">FECHA ENTREGADA</th>
            <th className="px-4 py-2 border">REMITO</th>
            <th className="px-4 py-2 border">FACTURA</th>
            <th className="px-4 py-2 border">MOD DE PAGO</th>
            <th className="px-4 py-2 border">PROCESO</th>
            <th className="px-4 py-2 border">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {pedidos.map((pedido) => (
            <tr key={pedido.id} className="cursor-pointer ">
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
              <td className="px-4 py-2 border">{pedido.estado}</td>
              <td className="px-4 py-2 border">{pedido.prov_uno}</td>
              <td className="px-4 py-2 border">{pedido.cost_prov_uno}</td>
              <td className="px-4 py-2 border">{pedido.prov_dos}</td>
              <td className="px-4 py-2 border">{pedido.cost_prov_dos}</td>
              <td className="px-4 py-2 border">{pedido.prov_tres}</td>
              <td className="px-4 py-2 border">{pedido.cost_prov_tres}</td>
              <td className="px-4 py-2 border">{pedido.oc}</td>
              <td className="px-4 py-2 border">{pedido.proveedor_selec}</td>
              <td className="px-4 py-2 border">{pedido.usd}</td>
              <td className="px-4 py-2 border">{pedido.eur}</td>
              <td className="px-4 py-2 border">{pedido.tc}</td>
              <td className="px-4 py-2 border">{pedido.ars}</td>
              <td className="px-4 py-2 border">{pedido.porcent}</td>
              <td className="px-4 py-2 border">{pedido.ars_desc}</td>
              <td className="px-4 py-2 border">{pedido.total_simp}</td>
              <td className="px-4 py-2 border">{formatDate(pedido.fecha_conf)}</td>
              <td className="px-4 py-2 border">{formatDate(pedido.fecha_prom)}</td>
              <td className="px-4 py-2 border">{formatDate(pedido.fecha_ent)}</td>
              <td className="px-4 py-2 border">{pedido.rto}</td>
              <td className="px-4 py-2 border">{pedido.fac}</td>
              <td className="px-4 py-2 border">{pedido.mod_pago}</td>
              <td className="px-4 py-2 border">{pedido.proceso}</td>
            
              
            <td className="px-4 py-2 border">
            <button
              onClick={() => {
                setEditingPedido(pedido);
                setFormData(pedido); // esto asegura que se carguen los valores al modal
              }}
              className="text-blue-600 hover:underline"
            >
              Editar
            </button>
          </td>

            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default ListAdmin; */
