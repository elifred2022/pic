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
  articulos: Array<{
    articulo: string;
    descripcion?: string;
    cant: number;
    cant_exist?: number;
    observacion?: string;
    link?: string;
  }>; // Array de artículos
  descripcion: string;
   controlado: string;
  superviso: string;
  estado: string;
  aprueba: string;
  notas_aprobador?: string;
  nota_aprobador?: string;
  comprador?: string | null;
  notas_comprador?: string | null;
  nota_solicitante?: string | null;
  notas: string;
  oc: number;
  proveedor_selec: string;
 
  fecha_conf: string;
  fecha_prom: string;
  fecha_ent: string;
  rto: number;
  fac: number;
  
  
  // Agregá más campos si los usás en el .map()
};

type ListUsProps = {
  soloPedidosGenerales?: boolean;
};

export default function ListUs({ soloPedidosGenerales = false }: ListUsProps) {
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

  // Cargar datos
  useEffect(() => {
  const fetchPedidos = async () => {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError) {
      console.error("Error obteniendo el usuario:", userError);
      return;
    }

    if (!user) {
      console.warn("No hay usuario logueado");
      return;
    }

    const { data, error } = await supabase
      .from("pic")
      .select("*")
      .eq("uuid", user.id); // 👈 Filtra por usuario logueado

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

    // Buscar en campos principales del pedido
    const mainFieldsMatch = Object.entries(pedido).some(([key, value]) => {
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

    // Si ya encontró en campos principales, retornar true
    if (mainFieldsMatch) return true;

    // Buscar dentro del array de artículos
    if (pedido.articulos && Array.isArray(pedido.articulos)) {
      return pedido.articulos.some(articulo => {
        // Buscar en todos los campos del artículo
        return Object.values(articulo).some(value => {
          if (value === null || value === undefined) return false;
          return String(value).toLowerCase().includes(s);
        });
      });
    }

    return false;
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



  return (
    <div className="w-full p-4 bg-gray-50 min-h-screen">
      {/* Header con navegación */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex flex-wrap gap-4 items-center justify-between mb-4">
          {!soloPedidosGenerales && (
            <Link
              href="/protected"
              className="inline-block px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 transition-all duration-200 transform hover:scale-105"
            >
              ← Home
            </Link>
          )}

          <h1 className="text-3xl font-bold text-gray-800">📋 Pedidos de Compras No Productivas</h1>
        </div>
        
     <div className="flex flex-wrap gap-4 items-center">
       <Link
            href="/auth/crear-formus"
            className="inline-block px-6 py-3 bg-green-600 text-white font-semibold rounded-lg shadow-md hover:bg-green-700 transition-all duration-200 transform hover:scale-105"
      >
            ➕ Crear Nuevo Pedido
      </Link>
       
      <input
        type="text"
            placeholder="🔍 Buscar pedido..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
            className="px-4 py-3 border-2 border-gray-300 rounded-lg w-full max-w-md focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 transition-all duration-200"
      />
        </div>
     </div>

      {/* Filtros con mejor diseño */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6 w-full">
        <h3 className="text-lg font-semibold text-gray-700 mb-4">🎛️ Filtros de estado</h3>
        <div className="flex flex-wrap gap-6 items-center">
          <label className="flex items-center gap-3 cursor-pointer hover:bg-gray-50 p-2 rounded-lg transition-colors duration-200">
          <input
            type="checkbox"
            checked={ocultarCumplidos}
            onChange={() => setOcultarCumplidos((v) => !v)}
              className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
          />
            <span className="text-gray-700 font-medium">Ocultar cumplidos</span>
        </label>

          <label className="flex items-center gap-3 cursor-pointer hover:bg-gray-50 p-2 rounded-lg transition-colors duration-200">
            <input
              type="checkbox"
              checked={ocultarAprobados}
              onChange={() => setOcultarAprobados((v) => !v)}
              className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
            />
            <span className="text-gray-700 font-medium">Ocultar aprobados</span>
          </label>

          <label className="flex items-center gap-3 cursor-pointer hover:bg-gray-50 p-2 rounded-lg transition-colors duration-200">
            <input
              type="checkbox"
              checked={ocultarConfirmado}
              onChange={() => setOcultarConfirmado((v) => !v)}
              className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
            />
            <span className="text-gray-700 font-medium">Ocultar confirmados</span>
          </label>

          <label className="flex items-center gap-3 cursor-pointer hover:bg-gray-50 p-2 rounded-lg transition-colors duration-200">
                <input
                  type="checkbox"
                  checked={ocultarAnulados}
                  onChange={() => setOcultarAnulados((v) => !v)}
              className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                />
            <span className="text-gray-700 font-medium">Ocultar anulados</span>
              </label>

          <label className="flex items-center gap-3 cursor-pointer hover:bg-gray-50 p-2 rounded-lg transition-colors duration-200">
                <input
                  type="checkbox"
                  checked={ocultarStandBy}
                  onChange={() => setOcultarStandBy((v) => !v)}
              className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                />
            <span className="text-gray-700 font-medium">Ocultar stand-by</span>
              </label>
        </div>
      </div>

      {/* Tabla con scroll horizontal y encabezado congelado */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden w-full">
        <div className="overflow-x-auto max-h-[70vh] overflow-y-auto w-full">
          <table className="w-full table-auto border-collapse">
            <thead className="bg-gradient-to-r from-blue-600 to-blue-700 text-white sticky top-0 z-10">
              <tr>
                <th className="px-4 py-3 border-b border-blue-500 text-sm font-bold whitespace-nowrap text-left">Acciones</th>
                <th className="px-4 py-3 border-b border-blue-500 text-sm font-bold whitespace-nowrap text-center">Estado</th>
                <th className="px-4 py-3 border-b border-blue-500 text-sm font-bold whitespace-nowrap text-center">Nº PIC</th>
                <th className="px-4 py-3 border-b border-blue-500 text-sm font-bold whitespace-nowrap text-center">Fecha Sol</th>
                <th className="px-4 py-3 border-b border-blue-500 text-sm font-bold whitespace-nowrap text-center">Fecha Nec</th>
                <th className="px-4 py-3 border-b border-blue-500 text-sm font-bold whitespace-nowrap text-center">Categoría</th>
                <th className="px-4 py-3 border-b border-blue-500 text-sm font-bold whitespace-nowrap text-center">Solicita</th>
                <th className="px-4 py-3 border-b border-blue-500 text-sm font-bold whitespace-nowrap text-center">Sector</th>
                <th className="px-4 py-3 border-b border-blue-500 text-sm font-bold whitespace-nowrap text-center">Cod Cta</th>
                <th className="px-4 py-3 border-b border-blue-500 text-sm font-bold whitespace-nowrap text-center">Artículos Solicitados</th>
                <th className="px-4 py-3 border-b border-blue-500 text-sm font-bold whitespace-nowrap text-center">Notas</th>
                <th className="px-4 py-3 border-b border-blue-500 text-sm font-bold whitespace-nowrap text-center">Controlado/Revisado</th>
                <th className="px-4 py-3 border-b border-blue-500 text-sm font-bold whitespace-nowrap text-center">Comprador</th>
                <th className="px-4 py-3 border-b border-blue-500 text-sm font-bold whitespace-nowrap text-center">Aprueba</th>
                <th className="px-4 py-3 border-b border-blue-500 text-sm font-bold whitespace-nowrap text-center">OC</th>
                <th className="px-4 py-3 border-b border-blue-500 text-sm font-bold whitespace-nowrap text-center">Proveedor Selec.</th>
                <th className="px-4 py-3 border-b border-blue-500 text-sm font-bold whitespace-nowrap text-center">Fecha Confirm</th>
                <th className="px-4 py-3 border-b border-blue-500 text-sm font-bold whitespace-nowrap text-center">Fecha Prometida</th>
                <th className="px-4 py-3 border-b border-blue-500 text-sm font-bold whitespace-nowrap text-center">Fecha Entrega</th>
                <th className="px-4 py-3 border-b border-blue-500 text-sm font-bold whitespace-nowrap text-center">Rto</th>
                <th className="px-4 py-3 border-b border-blue-500 text-sm font-bold whitespace-nowrap text-center">Fact</th>
          </tr>
        </thead>
       <tbody>
  {filteredPedidos.map((pedido) => (
                <tr key={pedido.id} className="hover:bg-gray-50 transition-colors duration-200">
                  <td className="px-4 py-3 border-b border-gray-200 align-top">
                    <div className="flex flex-col gap-2">
          <button
                        className="px-3 py-2 bg-blue-500 text-white font-medium rounded-lg shadow-md hover:bg-blue-600 transition-all duration-200 transform hover:scale-105 text-sm"
            onClick={() => {
              setEditingPedido(pedido);
              setFormData({
                created_at: pedido.created_at,
                necesidad: pedido.necesidad,
                categoria: pedido.categoria,
                solicita: pedido.solicita,
                sector: pedido.sector,
                cc: pedido.cc,
                                                         articulos: pedido.articulos,
                descripcion: pedido.descripcion,
                 controlado: pedido.controlado,
                        superviso: pedido.superviso,
                estado: pedido.estado,
                oc: pedido.oc,
                proveedor_selec: pedido.proveedor_selec,
                fecha_conf: pedido.fecha_conf,
                fecha_prom: pedido.fecha_prom,
                fecha_ent: pedido.fecha_ent,
                rto: pedido.rto,
                fac: pedido.fac,
                nota_solicitante: pedido.nota_solicitante ?? "",
              });
            }}
          >
                        ✏️ Editar
          </button>
        </div>
      </td>
                  <td className="px-4 py-3 border-b border-gray-200 align-top text-center">
       <span
                    className={
                    pedido.estado === "anulado"
                          ? "px-3 py-2 bg-red-100 text-red-800 text-sm font-semibold rounded-full"
                        : pedido.estado === "aprobado"
                          ? "px-3 py-2 bg-green-100 text-green-800 text-sm font-semibold rounded-full"
                        : pedido.estado === "iniciado"
                          ? "px-3 py-2 bg-orange-50 text-orange-500 text-sm font-semibold rounded-full"
                        : pedido.estado === "cotizado"
                          ? "px-3 py-2 bg-yellow-100 text-yellow-800 text-sm font-semibold rounded-full"
                        : pedido.estado === "visto/recibido" || pedido.estado === "Visto/recibido"
                          ? "px-3 py-2 bg-orange-50 text-orange-500 text-sm font-semibold rounded-full"
                        : pedido.estado === "stand by"
                          ? "px-3 py-2 bg-orange-100 text-orange-800 text-sm font-semibold rounded-full"
                        : pedido.estado === "Presentar presencial"
                          ? "px-3 py-2 bg-orange-100 text-orange-800 text-sm font-semibold rounded-full"
                        : pedido.estado === "cumplido"
                          ? "px-3 py-2 bg-blue-50 text-blue-600 text-sm font-semibold rounded-full"
                          : pedido.estado === "confirmado" 
                          ? "px-3 py-2 bg-green-100 text-green-800 text-sm font-semibold rounded-full"
                          : "px-3 py-2 bg-gray-100 text-gray-600 text-sm font-medium rounded-full"
                    }
                >
                   {renderValue(pedido.estado)}
                </span>
      </td>
                  <td className="px-4 py-3 border-b border-gray-200 align-top text-center font-medium text-lg">{pedido.id}</td>
                  <td className="px-4 py-3 border-b border-gray-200 align-top text-center">{formatDate(pedido.created_at)}</td>
                  <td className="px-4 py-3 border-b border-gray-200 align-top text-center">{formatDate(pedido.necesidad)}</td>
                  <td className="px-4 py-3 border-b border-gray-200 align-top text-center">{pedido.categoria}</td>
                  <td className="px-4 py-3 border-b border-gray-200 align-top text-center">
                    <div className="flex flex-col items-center gap-1">
                      <span className="font-medium text-gray-800">{pedido.solicita}</span>
                      {pedido.nota_solicitante?.trim() ? (
                        <span className="text-xs text-blue-700 font-bold max-w-[220px] whitespace-pre-wrap break-words text-left">
                          {pedido.nota_solicitante}
                        </span>
                      ) : null}
                    </div>
                  </td>
                  <td className="px-4 py-3 border-b border-gray-200 align-top text-center">{pedido.sector}</td>
                  <td className="px-4 py-3 border-b border-gray-200 align-top text-center">{pedido.cc}</td>
                            <td className="px-4 py-3 border-b border-gray-200 align-top text-center">
                              <div className="bg-gray-50 rounded-lg p-3 max-w-xs">
                                                                 {Array.isArray(pedido.articulos) ? (
                                   <table className="w-full text-xs">
                                     <thead>
                                       <tr className="border-b border-gray-200">
                                         <th className="px-2 py-1 text-left text-gray-600 font-semibold">Artículo</th>
                                         <th className="px-2 py-1 text-left text-gray-600 font-semibold">Descripción</th>
                                         <th className="px-2 py-1 text-left text-gray-600 font-semibold">Cant.</th>
                                         <th className="px-2 py-1 text-left text-gray-600 font-semibold">Stock</th>
                                         <th className="px-2 py-1 text-left text-gray-600 font-semibold">Observ.</th>
                                         <th className="px-2 py-1 text-left text-gray-600 font-semibold">Link de Ref</th>
                                       </tr>
                                     </thead>
                                     <tbody>
                                       {pedido.articulos.map((a, idx: number) => (
                                         <tr key={idx} className="border-b border-gray-100 last:border-b-0">
                                           <td className="px-2 py-1 font-medium">{a.articulo}</td>
                                           <td className="px-2 py-1 text-gray-700">{a.descripcion}</td>
                                           <td className="px-2 py-1 text-center font-semibold">{a.cant}</td>
                                           <td className="px-2 py-1 text-center">{a.cant_exist}</td>
                                           <td className="px-2 py-1 text-gray-600">{a.observacion}</td>
                                           <td className="px-2 py-1">
                                             {a.link ? (
                                               <a
                                                 href={a.link}
                                                 target="_blank"
                                                 rel="noopener noreferrer"
                                                 className="text-blue-600 hover:text-blue-800 underline text-xs break-all"
                                               >
                                                 🌐 Ver
                                               </a>
                                             ) : (
                                               <span className="text-gray-400 text-xs">-</span>
                                             )}
                                           </td>
                                         </tr>
                                       ))}
                                     </tbody>
                                  </table>
                                ) : (
                                  <span className="text-sm text-gray-500">Sin artículos</span>
                                )}
                              </div>
                            </td>
                <td className="px-4 py-3 border-b border-gray-200 align-top text-center text-red-600">{renderValue(pedido.notas)}</td>
                  <td className="px-4 py-3 border-b border-gray-200 align-top text-center">
                    <div className="flex flex-col gap-1">
                      <span className="text-sm font-medium text-gray-700">{pedido.controlado}</span>
                      <span className="text-sm text-gray-600">{pedido.superviso}</span>
                </div>
              </td>
                  <td className="px-4 py-3 border-b border-gray-200 align-top text-center">
                    <div className="flex flex-col items-center gap-1">
                      <span className="font-medium text-gray-800">{renderValue(pedido.comprador)}</span>
                      {pedido.notas_comprador?.trim() ? (
                        <span className="text-xs text-blue-700 font-bold max-w-[220px] whitespace-pre-wrap break-words text-left">
                          {pedido.notas_comprador}
                        </span>
                      ) : null}
                    </div>
                  </td>
                  <td className="px-4 py-3 border-b border-gray-200 align-top text-center">
                    <div className="flex flex-col items-center gap-1">
                      <span>{renderValue(pedido.aprueba)}</span>
                      <span className="text-xs text-red-600 max-w-[180px] break-words">
                        {pedido.notas_aprobador || pedido.nota_aprobador || "-"}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 border-b border-gray-200 align-top text-center text-orange-600 font-medium text-lg">{pedido.oc}</td>
                  <td className="px-4 py-3 border-b border-gray-200 align-top text-center text-orange-600 font-medium text-lg">{renderValue(pedido.proveedor_selec) || "-"}</td>
                  <td className="px-4 py-3 border-b border-gray-200 align-top text-center">{formatDate(pedido.fecha_conf)}</td>
                  <td className="px-4 py-3 border-b border-gray-200 align-top text-center">{formatDate(pedido.fecha_prom)}</td>
                  <td className="px-4 py-3 border-b border-gray-200 align-top text-center">{formatDate(pedido.fecha_ent)}</td>
                  <td className="px-4 py-3 border-b border-gray-200 align-top text-center">{pedido.rto || ""}</td>
                  <td className="px-4 py-3 border-b border-gray-200 align-top text-center">{pedido.fac || ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de edición */}
      {editingPedido && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-screen overflow-y-auto">
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6 rounded-t-xl">
              <h2 className="text-2xl font-bold">✏️ Editar Pedido #{editingPedido.id}</h2>
              <p className="text-blue-100 mt-2">Modifica los datos del pedido</p>
            </div>
            <div className="p-6">
              {/* Información del pedido */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="text-lg font-semibold text-gray-800 mb-3">📋 Detalles del Pedido</h3>
                  <div className="space-y-2 text-sm">
                    <p><span className="font-medium">Estado:</span> {editingPedido.estado}</p>
                    <p><span className="font-medium">Cantidad total:</span> {editingPedido.cant}</p>
                                         <p><span className="font-medium">Artículos:</span> {Array.isArray(editingPedido.articulos) ? editingPedido.articulos.length : 0}</p>
                  </div>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="text-lg font-semibold text-gray-800 mb-3">📅 Fechas</h3>
                  <div className="space-y-2 text-sm">
                    <p><span className="font-medium">Fecha necesidad:</span> {formatDate(editingPedido.necesidad)}</p>
                    <p><span className="font-medium">Fecha confirmación:</span> {formatDate(editingPedido.fecha_conf)}</p>
                    <p><span className="font-medium">Fecha prometida:</span> {formatDate(editingPedido.fecha_prom)}</p>
                  </div>
                </div>
              </div>

                             {/* Mostrar artículos del pedido */}
               {Array.isArray(editingPedido.articulos) && editingPedido.articulos.length > 0 && (
                 <div className="mb-6">
                   <h3 className="text-lg font-semibold text-gray-800 mb-3">📦 Artículos del Pedido (Editable)</h3>
                   <div className="bg-gray-50 rounded-lg p-4">
                     <table className="w-full text-sm">
                       <thead>
                         <tr className="border-b border-gray-200">
                           <th className="px-2 py-1 text-left text-gray-600 font-semibold">Artículo</th>
                           <th className="px-2 py-1 text-left text-gray-600 font-semibold">Descripción</th>
                           <th className="px-2 py-1 text-left text-gray-600 font-semibold">Cantidad</th>
                           <th className="px-2 py-1 text-left text-gray-600 font-semibold">Observación</th>
                           <th className="px-2 py-1 text-left text-gray-600 font-semibold">Link de Ref</th>
                         </tr>
                       </thead>
                       <tbody>
                         {editingPedido.articulos.map((a, idx: number) => (
                           <tr key={idx} className="border-b border-gray-100 last:border-b-0">
                             <td className="px-2 py-1 font-medium">{a.articulo}</td>
                             <td className="px-2 py-1 text-gray-700">
                               <input
                                 type="text"
                                 className="w-full px-2 py-1 border border-gray-300 rounded text-xs bg-white"
                                 value={a.descripcion || ""}
                                 onChange={(e) => {
                                   const newArticulos = [...editingPedido.articulos];
                                   newArticulos[idx].descripcion = e.target.value;
                                   setEditingPedido({ ...editingPedido, articulos: newArticulos });
                                   setFormData({ ...formData, articulos: newArticulos });
                                 }}
                                 placeholder="Descripción del artículo"
                               />
                             </td>
                             <td className="px-2 py-1 text-center">{a.cant}</td>
                             <td className="px-2 py-1 text-gray-600">
                               <input
                                 type="text"
                                 className="w-full px-2 py-1 border border-gray-300 rounded text-xs bg-white"
                                 value={a.observacion || ""}
                                 onChange={(e) => {
                                   const newArticulos = [...editingPedido.articulos];
                                   newArticulos[idx].observacion = e.target.value;
                                   setEditingPedido({ ...editingPedido, articulos: newArticulos });
                                   setFormData({ ...formData, articulos: newArticulos });
                                 }}
                                 placeholder="Observación del artículo"
                               />
                             </td>
                             <td className="px-2 py-1">
                               <input
                                 type="url"
                                 className="w-full px-2 py-1 border border-gray-300 rounded text-xs bg-white"
                                 value={a.link || ""}
                                 onChange={(e) => {
                                   const newArticulos = [...editingPedido.articulos];
                                   newArticulos[idx].link = e.target.value;
                                   setEditingPedido({ ...editingPedido, articulos: newArticulos });
                                   setFormData({ ...formData, articulos: newArticulos });
                                 }}
                                 placeholder="https://ejemplo.com/articulo"
                               />
                               {a.link && (
                                 <div className="mt-1">
                                   <a
                                     href={a.link}
                                     target="_blank"
                                     rel="noopener noreferrer"
                                     className="text-blue-600 hover:text-blue-800 underline text-xs break-all"
                                   >
                                     🌐 Ver Link
                                   </a>
                                 </div>
                               )}
                             </td>
                           </tr>
                         ))}
                       </tbody>
                     </table>
                   </div>
                 </div>
               )}

              <hr className="my-6" />

              {/* Campos de edición */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nota del solicitante:
                  </label>
                  <textarea
                    rows={3}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg bg-white text-gray-800 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 resize-y min-h-[5rem]"
                    placeholder="Comentarios visibles para compras / aprobación…"
                    value={formData.nota_solicitante ?? ""}
                    onChange={(e) =>
                      setFormData({ ...formData, nota_solicitante: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Descripción/Observación:</label>
              <input
                type="text"
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg bg-white text-gray-800 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                    value={formData.descripcion ?? ""}
                onChange={(e) =>
                  setFormData({ ...formData, descripcion: e.target.value })
                }
              />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Fecha Entrega:</label>
              <input
                type="date"
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg bg-white text-gray-800 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                value={formData.fecha_ent ?? ""}
                onChange={(e) =>
                  setFormData({ ...formData, fecha_ent: e.target.value })
                }
              />
                </div>
            
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">RTO:</label>
              <input
                    type="number"
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg bg-white text-gray-800 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                    value={formData.rto ?? ""}
                onChange={(e) =>
                      setFormData({ ...formData, rto: Number(e.target.value) })
                    }
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">FAC:</label>
              <input
                    type="number"
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg bg-white text-gray-800 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                    value={formData.fac ?? ""}
                onChange={(e) =>
                      setFormData({ ...formData, fac: Number(e.target.value) })
                }
              />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Editar Artículos:</label>
                  <div className="bg-blue-50 p-3 rounded-lg">
                    <p className="text-sm text-blue-700 mb-2">
                      💡 Para editar los links de referencia, modifica los artículos en la tabla de arriba
                    </p>
                    <p className="text-xs text-blue-600">
                      Los cambios se guardarán automáticamente al hacer clic en &quot;Guardar Cambios&quot;
                    </p>
                  </div>
                </div>
              </div>
          
              {/* Botones de acción */}
              <div className="flex justify-end space-x-4 mt-6 pt-6 border-t border-gray-200">
              <button
                onClick={() => setEditingPedido(null)}
                  className="px-6 py-3 bg-gray-500 text-white font-medium rounded-lg hover:bg-gray-600 transition-all duration-200"
              >
                  ❌ Cancelar
              </button>
              <button
                onClick={async () => {
                  try {
                    const { error } = await supabase
                      .from("pic")
                      .update(formData)
                      .eq("id", editingPedido.id);

                    if (error) {
                      alert("Error actualizando: " + error.message);
                      console.error(error);
                    } else {
                      // Mensaje personalizado según los campos actualizados
                      let mensaje = "Pedido actualizado correctamente";
                      if (formData.descripcion) {
                        mensaje += `\n✅ Descripción actualizada`;
                      }
                      if (formData.fecha_ent) {
                        mensaje += `\n✅ Fecha de entrega actualizada`;
                      }
                      if (formData.rto || formData.fac) {
                        mensaje += `\n✅ Datos financieros actualizados`;
                      }
                      if (formData.articulos) {
                        mensaje += `\n✅ Artículos actualizados (incluyendo links de referencia)`;
                      }
                      
                      alert(mensaje);
                      setEditingPedido(null);
                      setFormData({});
                      
                      // Recargar la lista de pedidos
                      const { data } = await supabase.from("pic").select("*");
                      if (data) setPedidos(data);
                    }
                  } catch (err) {
                    alert("Error inesperado: " + (err as Error).message);
                    console.error(err);
                  }
                }}
                  className="px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-all duration-200"
              >
                  💾 Guardar Cambios
              </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

