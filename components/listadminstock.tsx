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
  codint: string;
  cant: number;
  existencia: number;
  articulo: string;
  descripcion: string;
  controlado: string;
  superviso: string;

  estado: string;
  aprueba: string;
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
  cost_prov_uno: string | number;
  subt_prov1: number;
  prov_dos: string;
  cost_prov_dos: string | number;
  subt_prov2: number;
  prov_tres: string;
  cost_prov_tres: string | number;
  subt_prov3: number;
  // Agregá más campos si los usás en el .map()
};


export default function ListAdminStock() {
  const [search, setSearch] = useState("");
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [editingPedido, setEditingPedido] = useState<Pedido | null>(null);
  const [ocultarCumplidos, setOcultarCumplidos] = useState(false);
  const [ocultarAprobados, setOcultarAprobados] = useState(false);
  const [ocultarAnulados, setOcultarAnulados] = useState(false);
  const [ocultarStandBy, setOcultarStandBy] = useState(false);
  const [ocultarConfirmado, setOcultarConfirmado] = useState(false);

  const [formData, setFormData] = useState<Partial<Pedido>>({});
  const supabase = createClient();

  /* para que no desactive checkbox al reset pagia  Al montar, leé localStorage (solo se ejecuta en el navegador) */
  useEffect(() => {
  const savedCumplidos = localStorage.getItem("ocultarCumplidos");
  const savedAprobados = localStorage.getItem("ocultarAprobados");
  const savedAnulados = localStorage.getItem("ocultarAnulados");
  const savedStandBy = localStorage.getItem("ocultarStandBy");
  const savedConfirmado = localStorage.getItem("ocultarConfirmado");

  if (savedCumplidos !== null) setOcultarCumplidos(savedCumplidos === "true");
  if (savedAprobados !== null) setOcultarAprobados(savedAprobados === "true");
  if (savedAnulados !== null) setOcultarAnulados(savedAnulados === "true");
  if (savedStandBy !== null) setOcultarStandBy(savedStandBy === "true");
  if (savedConfirmado !== null) setOcultarConfirmado(savedConfirmado === "true");
}, []);


  /* Cada vez que cambia, actualizá localStorage */
 useEffect(() => {
  localStorage.setItem("ocultarCumplidos", String(ocultarCumplidos));
}, [ocultarCumplidos]);

useEffect(() => {
  localStorage.setItem("ocultarAprobados", String(ocultarAprobados));
}, [ocultarAprobados]);

useEffect(() => {
  localStorage.setItem("ocultarAnulados", String(ocultarAnulados));
}, [ocultarAnulados]);

useEffect(() => {
  localStorage.setItem("ocultarStandBy", String(ocultarStandBy));
}, [ocultarStandBy]);

useEffect(() => {
  localStorage.setItem("ocultarConfirmado", String(ocultarConfirmado));
}, [ocultarConfirmado]);


  // Cargar datos tabla pic
  useEffect(() => {
    const fetchPedidos = async () => {
      const { data, error } = await supabase.from("picstock").select("*")
  
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

//Campos de tabla que son fecha para funcion filtrar
const dateFields: (keyof Pedido)[] = [
  "created_at",
  "necesidad",
  "fecha_conf",
  "fecha_prom",
  "fecha_ent",
];

//Filtro que también contempla las fechas
const filteredPedidos = pedidos
  .filter((pedido) => {
    const s = search.trim().toLowerCase();   // la búsqueda, ya normalizada
    if (!s) return true;                     // si el input está vacío, no filtra nada

    return Object.entries(pedido).some(([key, value]) => {
      if (value === null || value === undefined) return false;

      // A) Comparar contra la versión texto “tal cual viene”
      if (String(value).toLowerCase().includes(s)) return true;

      // B) Si el campo es fecha, probar otras representaciones
      if (dateFields.includes(key as keyof Pedido)) {
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
 .filter((pedido) => {
  if (ocultarCumplidos && pedido.estado === "cumplido") return false;
  if (ocultarAprobados && pedido.estado === "aprobado") return false;
  if (ocultarAnulados && pedido.estado === "anulado") return false;
  if (ocultarStandBy && pedido.estado === "stand by") return false;
  if (ocultarConfirmado && pedido.estado === "confirmado") return false;
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
        <div className="flex flex-wrap gap-4 items-center" >
             <Link
              href="/protected"
              className="inline-block px-4 py-2 mb-4 bg-white text-black font-semibold rounded-md shadow hover:bg-blue-700 transition-colors duration-200"
            >
              Home
            </Link>
           
        </div>
      
        <h1 className="text-xl font-bold mb-4">Pedidos productivos</h1>
        <div className="flex flex-wrap gap-4 items-center">
          
          <Link
            href="/auth/crear-formstock"
            className="inline-block px-4 py-2 mb-4 bg-white text-black font-semibold rounded-md shadow hover:bg-blue-700 transition-colors duration-200"
          >
            Crear nuevo pedido productivo
          </Link>
          
          <input
            type="text"
            placeholder="Buscar pedido..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="mb-4 px-4 py-2 border rounded w-full max-w-md"
          />
        </div>

      <div className="flex flex-wrap gap-4 items-center">
          <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={ocultarCumplidos}
            onChange={() => setOcultarCumplidos((v) => !v)}
            className="w-4 h-4"
          />
          Ocultar cumplidos
        </label>

        <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={ocultarAprobados}
              onChange={() => setOcultarAprobados((v) => !v)}
              className="w-4 h-4"
            />
            Ocultar aprobados
          </label>

           <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={ocultarConfirmado}
              onChange={() => setOcultarConfirmado((v) => !v)}
              className="w-4 h-4"
            />
            Ocultar confirmados
          </label>

              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={ocultarAnulados}
                  onChange={() => setOcultarAnulados((v) => !v)}
                  className="w-4 h-4"
                />
                Ocultar anulados
              </label>

              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={ocultarStandBy}
                  onChange={() => setOcultarStandBy((v) => !v)}
                  className="w-4 h-4"
                />
                Ocultar stand by
              </label>
      </div>

      <table className="min-w-full table-auto border border-gray-300 shadow-md rounded-md overflow-hidden">
         <thead className="bg-gray-100 text-gray-700">
          <tr className="bg-gray-100">
            <th  className={headerClass}>Acciones</th>
             <th  className={headerClass}>Estado</th>
            <th  className={headerClass}>Nº PIC</th>
            <th  className={headerClass}>Fecha sol</th>
            <th  className={headerClass}>Fecha nec</th>
            <th  className={headerClass}>Categoria</th>
            <th  className={headerClass}>Solicita</th>
            <th  className={headerClass}>Sector</th>
            <th  className={headerClass}>Cod cta</th>
            <th  className={headerClass}>Cod. Int. Artic.</th>
            <th  className={headerClass}>Cant sol</th>
            <th  className={headerClass}>Existencia</th>
            <th  className={headerClass}>Articulo</th>
            <th  className={headerClass}>Descripcion/Observacion</th>
            <th  className={headerClass}>Controlado/Revisado</th>
            <th  className={headerClass}>Prov. 1</th>
            <th  className={headerClass}>Prov. 2</th>
            <th  className={headerClass}>Prov. 3</th>
           
            <th  className={headerClass}>Aprueba</th>
            <th  className={headerClass}>OC</th>
            <th  className={headerClass}>Proveedor Selec.</th>
            <th  className={headerClass}>USD</th>
            <th  className={headerClass}>EUR</th>
            <th  className={headerClass}>T.C</th>
            <th  className={headerClass}>ARS unit</th>
            <th  className={headerClass}>% Desc</th>
            <th  className={headerClass}>ARS Con desc</th>
            <th  className={headerClass}>Total sin imp</th>
            <th  className={headerClass}>Fecha confirm</th>
            <th  className={headerClass}>Fecha prometida</th>
            <th  className={headerClass}>Fecha entrega</th>
            <th  className={headerClass}>Rto</th>
            <th  className={headerClass}>Fact</th>
            <th  className={headerClass}>MOD pago</th>
            <th  className={headerClass}>Proceso</th>
           
            
          </tr>
        </thead>
          
        <tbody>
          {filteredPedidos.map((pedido) => (
            <tr key={pedido.id}>
              <td className={cellClass}>
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
                        codint: pedido.codint,
                        cant: pedido.cant,
                        existencia: pedido.existencia,
                        articulo: pedido.articulo,
                        descripcion: pedido.descripcion,
                        controlado: pedido.controlado,
                        superviso: pedido.superviso,
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
                        subt_prov1: pedido.subt_prov1,
                        prov_dos: pedido.prov_dos,
                        cost_prov_dos: pedido.cost_prov_dos,
                        subt_prov2: pedido.subt_prov2,
                        prov_tres: pedido.prov_tres,
                        cost_prov_tres: pedido.cost_prov_tres,
                        subt_prov3: pedido.subt_prov3,
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

                      const { error } = await supabase.from("picstock").delete().eq("id", pedido.id);
                      if (error) {
                        alert("Error al eliminar");
                        console.error(error);
                      } else {
                        alert("Pedido eliminado");
                        const { data } = await supabase.from("picstock").select("*");
                        if (data) setPedidos(data);
                      }
                    }}
                  >
                    Elim
                  </button>
                </div></td>
             
               <td className={cellClass}>
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
                        : pedido.estado === "confirmado" ? "text-green-600 font-semibold" 
                        : "text-black"
                    }
                >
                   {renderValue(pedido.estado)}
                </span>
            </td>
             <td className={cellClass}>{pedido.id}</td>
              <td className={cellClass}>{formatDate(pedido.created_at) || "-"}</td>
              <td className={cellClass}>{formatDate(pedido.necesidad)}</td>
              <td className={cellClass}>{pedido.categoria}</td>
              <td className={cellClass}>{pedido.solicita}</td>
              <td className={cellClass}>{pedido.sector}</td>
              <td className={cellClass}>{pedido.cc}</td>
              <td className={cellClass}>{pedido.codint}</td>
              <td className={cellClass}>{pedido.cant}</td>
              <td className={cellClass}>{pedido.existencia}</td>
              <td className={cellClass}>{pedido.articulo}</td>
              <td className={cellClass}>{pedido.descripcion}</td>

               <td className={cellClass}>
                <div className="flex flex-col">
                  <span> {pedido.controlado} </span>
                  <span>{pedido.superviso}</span>
                </div>
              </td>
             
               <td className={cellClass}>
                <div className="flex flex-col">
                    <span>{pedido.prov_uno}</span>
                    <span>c/u ${Number(pedido.cost_prov_uno).toLocaleString("es-AR")}</span>
                    <span>subt ${Number(pedido.subt_prov1).toLocaleString("es-AR")}</span>
                </div>
                </td>
              
                  <td className={cellClass}>
                      <div className="flex flex-col">
                          <span>{pedido.prov_dos}</span>
                          <span>c/u ${Number(pedido.cost_prov_dos).toLocaleString("es-AR")}</span>
                          <span>subt ${Number(pedido.subt_prov2).toLocaleString("es-AR")}</span>
                      </div>
                  </td>
                  
                  <td className={cellClass}>
                      <div className="flex flex-col">
                          <span>{pedido.prov_tres}</span>
                          <span>c/u ${Number(pedido.cost_prov_tres).toLocaleString("es-AR")}</span>
                          <span>subt ${Number(pedido.subt_prov3).toLocaleString("es-AR")}</span>
                      </div>
                  </td>

               
              
            
              <td className={cellClass}>{renderValue(pedido.aprueba)}</td>
              <td className={cellClass}>{pedido.oc}</td>
              <td className={cellClass}>{renderValue(pedido.proveedor_selec)}</td>
              <td className={cellClass}>{pedido.usd}</td>
              <td className={cellClass}>{pedido.eur}</td>
              <td className={cellClass}>{pedido.tc}</td>
              <td className={cellClass}>$ {Number(pedido.ars).toLocaleString("es-AR")}</td>
              <td className={cellClass}>{pedido.porcent}</td>
              <td className={cellClass}>{pedido.ars_desc}</td>
              <td className={cellClass}>$ {Number(pedido.total_simp).toLocaleString("es-AR")}</td>
              <td className={cellClass}>{formatDate(pedido.fecha_conf)}</td>
              <td className={cellClass}>{formatDate(pedido.fecha_prom)}</td>
              <td className={cellClass}>{formatDate(pedido.fecha_ent)}</td>
              <td className={cellClass}>{pedido.rto}</td>
              <td className={cellClass}>{pedido.fac}</td>
              <td className={cellClass}>{pedido.mod_pago}</td>
              <td className={cellClass}>{pedido.proceso}</td>
              
            
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
              <p className="text-black">Necesidad</p>
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
              <p className="text-black">Categoria</p>
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
             <p className="text-black">Solicita</p>
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
              <p className="text-black">Sector</p>
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
              <p className="text-black">C.C.</p>
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
              <p className="text-black">Cod. Int. Artic.</p>
              <input
                className="w-full border p-2 rounded mt-1"
                type="text"
                value={formData.codint ?? 0}
                onChange={(e) =>
                  setFormData({ ...formData, codint: e.target.value })
                }
              />
            </label>
            <label className="block mb-4">
             <p className="text-black">Cant.</p>
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
             <p className="text-black">Articulo</p>
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

              <label className="block mb-4">
              <p className="text-black">Controlado</p>
              <select
                className="w-full border p-2 rounded mt-1"
                value={formData.controlado ?? ""}
                onChange={(e) =>
                  setFormData({ ...formData, controlado: e.target.value })
                }
              >
                <option value="">Seleccionar</option>
                <option value="Autorizado" className="bg-yellow-300 text-black">
                  Autorizado
                </option>
                <option value="Denegado" className="bg-green-400 text-white">
                  Denegado
                </option>
                
              </select>
            </label>

            <label className="block mb-4">
              <p className="text-black">Supervisor</p>
              <select
                className="w-full border p-2 rounded mt-1"
                value={formData.superviso ?? ""}
                onChange={(e) =>
                  setFormData({ ...formData, superviso: e.target.value })
                }
              >
                <option value="">Superviso;</option>
                <option value="por; Victor B." className="bg-yellow-300 text-black">
                  Victor B.
                </option>
                <option value="por; Jose" className="bg-green-400 text-white">
                  Jose
                </option>
                
              </select>
            </label>

            <label className="block mb-4">
            <p className="text-black">Prov uno</p>
              <input
                className="w-full border p-2 rounded mt-1"
                type="text"
                value={formData.prov_uno ?? ""}
                onChange={(e) =>
                  setFormData({ ...formData, prov_uno: e.target.value})
                }
              />
            </label>
             <label className="block mb-4">
            <p className="text-black">Cost prov uno</p>
             <input
                     type="text"
                      name="cost_prov_uno"
                      value={formData.cost_prov_uno ?? ""}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (/^\d*\.?\d*$/.test(val) || val === "") {
                          setFormData({
                            ...formData,
                            cost_prov_uno: val,
                          });
                        }
                      }}
                     
                      />
            </label>
           

             <label className="block mb-4">
               <p className="text-black">Prov dos</p>
              <input
                className="w-full border p-2 rounded mt-1"
                type="text"
                value={formData.prov_dos ?? ""}
                onChange={(e) =>
                  setFormData({ ...formData, prov_dos: e.target.value})
                }
              />
            </label>
             <label className="block mb-4">
            <p className="text-black">Cost prov dos</p>
              <input
                     type="text"
                      name="cost_prov_dos"
                      value={formData.cost_prov_dos ?? ""}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (/^\d*\.?\d*$/.test(val) || val === "") {
                          setFormData({
                            ...formData,
                            cost_prov_dos: val,
                          });
                        }
                      }}
                     
                      />
            </label>
            

            <label className="block mb-4">
             <p className="text-black">Prov tres</p>
              <input
                className="w-full border p-2 rounded mt-1"
                type="text"
                value={formData.prov_tres ?? ""}
                onChange={(e) =>
                  setFormData({ ...formData, prov_tres: e.target.value})
                }
              />
            </label>
             <label className="block mb-4">
               <p className="text-black">Cost prov tres</p>
             <input
                     type="text"
                      name="cost_prov_tres"
                      value={formData.cost_prov_tres ?? ""}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (/^\d*\.?\d*$/.test(val) || val === "") {
                          setFormData({
                            ...formData,
                            cost_prov_tres: val,
                          });
                        }
                      }}
                     
                      />
            </label>
             


           <label className="block mb-4">
              <p className="text-black">Estado</p>
              <select
                className="w-full border p-2 rounded mt-1"
                value={formData.estado ?? ""}
                onChange={(e) =>
                  setFormData({ ...formData, estado: e.target.value })
                }
              >
                <option value="">Seleccionar estado</option>
                <option value="cotizado" className="bg-yellow-300 text-black">
                  Cotizado
                </option>
                <option value="aprobado" className="bg-green-400 text-white">
                  Aprobado
                </option>
                 <option value="confirmado" className="bg-green-400 text-white">
                  Confirmado
                </option>
                <option value="stand by" className="bg-orange-300 text-black">
                  Stand By
                </option>
                <option value="anulado" className="bg-red-500 text-white">
                  Anulado
                </option>
                <option value="cumplido" className="bg-green-600 text-white">
                  Cumplido
                </option>
              </select>
                  </label>

            <label className="block mb-4">
              <p className="text-black">Aprueba</p>
              <select
                className="w-full border p-2 rounded mt-1"
                value={formData.aprueba ?? ""}
                onChange={(e) =>
                  setFormData({ ...formData, aprueba: e.target.value })
                }
              >
                <option value="">Selec. responsable de area</option>
                <option value="Juan S." >
                  Juan S.
                </option>
                <option value="Julio A." >
                  Julio A.
                </option>
                <option value="Luciana L." >
                  Luciana L.
                </option>
                <option value="Eduardo S." >
                  Eduardo S.
                </option>
                <option value="Pedro S.">
                  Pedro S.
                </option>
                <option value="Sofia S." >
                  Sofia S.
                </option>
                <option value=" Carolina S." >
                  Carolina S.
                </option>
              </select>
                  </label>

             <label className="block mb-4">
               <p className="text-black">OC</p>
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
                 <p className="text-black">Proveedor selecc</p>
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
             <p className="text-black">Usd</p>
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
             <p className="text-black">Eur</p>
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
            <p className="text-black">TC</p>
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
             <p className="text-black">Ars</p>
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
             <p className="text-black">% desc</p>
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
               <p className="text-black">Ars con desc</p>
              <input
                className="w-full border p-2 rounded mt-1"
                type="text"
                value={formData.ars_desc ?? 0}
                onChange={(e) =>
                  setFormData({ ...formData, ars_desc: Number(e.target.value)  })
                }
              />
            </label>
            
            <label className="block mb-2">
               <p className="text-black">Fecha confirm</p>
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
              <p className="text-black">Fecha prom</p>
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
                 <p className="text-black">Rto</p>
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
               <p className="text-black">Fac</p>
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
              <p className="text-black">Mod de pago</p>
              <select
                className="w-full border p-2 rounded mt-1"
                value={formData.mod_pago ?? ""}
                onChange={(e) =>
                  setFormData({ ...formData, mod_pago: e.target.value })
                }
              >
                <option value="">Mod de pago</option>
                <option value="Cta A" className="bg-yellow-300 text-black">
                  Cta A
                </option>
                <option value="Cta B" className="bg-green-400 text-white">
                  Cta B
                </option>
                <option value="Mercado libre" className="bg-orange-300 text-black">
                  Mercado libre
                </option>
               
              </select>
                  </label>

              <label className="block mb-4">
              <p className="text-black">Proceso</p>
              <select
                className="w-full border p-2 rounded mt-1"
                value={formData.proceso ?? ""}
                onChange={(e) =>
                  setFormData({ ...formData, proceso: e.target.value })
                }
              >
                <option value="">Proceso</option>
                <option value="Bajo proceso" className="bg-yellow-300 text-black">
                  Bajo Proceso
                </option>
                <option value="Fuera de proceso" className="bg-green-400 text-white">
                  Fuera de proceso
                </option>
               </select>
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
                    /* Normalizá los números que vas a usar */
                    const cantNum        = Number(formData.cant ?? editingPedido.cant ?? 0);
                    const costProvUnoNum = Number(
                      formData.cost_prov_uno ?? editingPedido.cost_prov_uno ?? 0
                    );
                    const costProvDosNum = Number(
                      formData.cost_prov_dos ?? editingPedido.cost_prov_dos ?? 0
                    );
                    const costProvTresNum = Number(
                      formData.cost_prov_tres ?? editingPedido.cost_prov_tres ?? 0
                    );

                    const costProvSelecNum = Number(
                      formData.ars ?? editingPedido.ars ?? 0
                    );

                    /* Calculá el subtotal (o poné null si algo falta) */
                    const subtProv1 =
                      cantNum && costProvUnoNum ? cantNum * costProvUnoNum : null;
                    
                    const subtProv2 =
                      cantNum && costProvDosNum ? cantNum * costProvDosNum : null;

                    const subtProv3 =
                      cantNum && costProvTresNum ? cantNum * costProvTresNum : null;

                     const subtProvSelec =
                      cantNum && costProvSelecNum ? cantNum * costProvSelecNum : null;

                    /* Armá el objeto de actualización */
                    const updateData = {
                      ...formData,          // ➜ todo lo que ya cambiaste en el modal
                      subt_prov1: subtProv1, // ➜ sobrescribe/añade el subtotal
                      subt_prov2: subtProv2,
                      subt_prov3: subtProv3,
                      total_simp: subtProvSelec,
                    };

                    /* 4️⃣ Enviá a Supabase */
                    const { error } = await supabase
                      .from("picstock")
                      .update(updateData)
                      .eq("id", editingPedido.id);

                    if (error) {
                      alert("Error actualizando");
                      console.error(error);
                    } else {
                      alert("Actualizado correctamente");
                      setEditingPedido(null);
                      setFormData({});
                      const { data } = await supabase.from("picstock").select("*");
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
