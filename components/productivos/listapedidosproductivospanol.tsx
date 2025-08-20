"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

type Pedido = {
  id: string;
  created_at: string;
  necesidad: string;
  categoria: string;
  solicita: string;
  sector: string;
  controlado: string;
  superviso: string;
  aprueba: string;
  estado: string;
  observ: string;
  numero_oc: string | null;
  proveedor_seleccionado: string | null;
  fecha_conf: string;
  fecha_prom: string;
  fecha_ent: string;
  rto: number;
  fac: number;
  articulos: {
    codint: string;
    articulo: string;
    descripcion: string;
    existencia: number;
    observacion: string;
    cant: number;
    provsug: string;
  }[];
};

export default function ListaPedidosProductivos() {
   const [search, setSearch] = useState("");
    const [pedidos, setPedidos] = useState<Pedido[]>([]);
    
    
    const [ocultarCumplidos, setOcultarCumplidos] = useState(false);
    const [ocultarAprobados, setOcultarAprobados] = useState(false);
    const [ocultarAnulados, setOcultarAnulados] = useState(false);
    const [ocultarStandBy, setOcultarStandBy] = useState(false);
    const [ocultarConfirmado, setOcultarConfirmado] = useState(false);
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
        .from("pedidos_productivos")
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

const headerClass =
  "px-2 py-1 border text-xs font-semibold bg-gray-100 whitespace-nowrap"; // ← evita saltos de línea
const cellClass =
  "px-2 py-1 border align-top text-sm text-justify whitespace-pre-wrap break-words";


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
          
          <h1 className="text-3xl font-bold text-gray-800">🏭 Pedidos Productivos</h1>
        </div>
        
        <div className="flex flex-wrap gap-4 items-center">
          <Link
            href="/auth/rutaproductivos/crear-formpedidosproductivos"
            className="inline-block px-6 py-3 bg-green-600 text-white font-semibold rounded-lg shadow-md hover:bg-green-700 transition-all duration-200 transform hover:scale-105"
          >
            ➕ Crear Pedido Productivo
          </Link>
          
          <input
            type="text"
            placeholder="🔍 Buscar pedido productivo..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="px-4 py-3 border-2 border-gray-300 rounded-lg w-full max-w-md focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 transition-all duration-200"
          />
        </div>
      </div>

      {/* Filtros con mejor diseño */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
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
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="overflow-x-auto max-h-[70vh] overflow-y-auto">
          <table className="min-w-full table-auto border-collapse">
            <thead className="bg-gradient-to-r from-blue-600 to-blue-700 text-white sticky top-0 z-10">
              <tr>
                <th className="px-4 py-3 border-b border-blue-500 text-sm font-bold whitespace-nowrap text-center">Estado</th>
                <th className="px-4 py-3 border-b border-blue-500 text-sm font-bold whitespace-nowrap text-center">Nº PIC</th>
                <th className="px-4 py-3 border-b border-blue-500 text-sm font-bold whitespace-nowrap text-center">Fecha Sol</th>
                <th className="px-4 py-3 border-b border-blue-500 text-sm font-bold whitespace-nowrap text-center">Fecha Nec</th>
                <th className="px-4 py-3 border-b border-blue-500 text-sm font-bold whitespace-nowrap text-center">Categoría</th>
                <th className="px-4 py-3 border-b border-blue-500 text-sm font-bold whitespace-nowrap text-center">Solicitante</th>
                <th className="px-4 py-3 border-b border-blue-500 text-sm font-bold whitespace-nowrap text-center">Sector</th>
                <th className="px-4 py-3 border-b border-blue-500 text-sm font-bold whitespace-nowrap text-center">Artículos Solicitados</th>
                <th className="px-4 py-3 border-b border-blue-500 text-sm font-bold whitespace-nowrap text-center">Observaciones</th>
                <th className="px-4 py-3 border-b border-blue-500 text-sm font-bold whitespace-nowrap text-center">OC</th>
                <th className="px-4 py-3 border-b border-blue-500 text-sm font-bold whitespace-nowrap text-center">Proveedor Seleccionado</th>
                <th className="px-4 py-3 border-b border-blue-500 text-sm font-bold whitespace-nowrap text-center">Fecha Confirmación</th>
                <th className="px-4 py-3 border-b border-blue-500 text-sm font-bold whitespace-nowrap text-center">Fecha Prometida</th>
                <th className="px-4 py-3 border-b border-blue-500 text-sm font-bold whitespace-nowrap text-center">Fecha Entrega</th>
                <th className="px-4 py-3 border-b border-blue-500 text-sm font-bold whitespace-nowrap text-center">FAC</th>
                <th className="px-4 py-3 border-b border-blue-500 text-sm font-bold whitespace-nowrap text-center">RTO</th>
              </tr>
            </thead>
            <tbody>
              {filteredPedidos.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50 transition-colors duration-200">
                  <td className="px-4 py-3 border-b border-gray-200 align-top text-center">
                    <span
                      className={
                        p.estado === "anulado"
                          ? "px-3 py-2 bg-red-100 text-red-800 text-sm font-semibold rounded-full"
                          : p.estado === "aprobado"
                          ? "px-3 py-2 bg-green-100 text-green-800 text-sm font-semibold rounded-full"
                          : p.estado === "cotizado"
                          ? "px-3 py-2 bg-yellow-100 text-yellow-800 text-sm font-semibold rounded-full"
                          : p.estado === "iniciado"
                          ? "px-3 py-2 bg-orange-100 text-orange-800 text-sm font-semibold rounded-full"
                          : p.estado === "stand by"
                          ? "px-3 py-2 bg-orange-100 text-orange-800 text-sm font-semibold rounded-full"
                          : p.estado === "Presentar presencial"
                          ? "px-3 py-2 bg-orange-100 text-orange-800 text-sm font-semibold rounded-full"
                          : p.estado === "cumplido"
                          ? "px-3 py-2 bg-gray-100 text-gray-800 text-sm font-semibold rounded-full"
                          : p.estado === "confirmado" 
                          ? "px-3 py-2 bg-green-100 text-green-800 text-sm font-semibold rounded-full"
                          : "px-3 py-2 bg-gray-100 text-gray-600 text-sm font-medium rounded-full"
                      }
                    >
                      {renderValue(p.estado)}
                    </span>
                  </td>
                  <td className="px-4 py-3 border-b border-gray-200 align-top text-center font-medium text-lg">{p.id}</td>
                  <td className="px-4 py-3 border-b border-gray-200 align-top text-center">{formatDate(p.created_at)}</td>
                  <td className="px-4 py-3 border-b border-gray-200 align-top text-center">{formatDate(p.necesidad)}</td>
                  <td className="px-4 py-3 border-b border-gray-200 align-top text-center">{p.categoria}</td>
                  <td className="px-4 py-3 border-b border-gray-200 align-top text-center">{p.solicita}</td>
                  <td className="px-4 py-3 border-b border-gray-200 align-top text-center">{p.sector}</td>
                  <td className="px-4 py-3 border-b border-gray-200 align-top text-center">
                    <div className="bg-gray-50 rounded-lg p-3 max-w-xs">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b border-gray-200">
                            <th className="px-2 py-1 text-left text-gray-600 font-semibold">Cód. Int.</th>
                            <th className="px-2 py-1 text-left text-gray-600 font-semibold">Artículo</th>
                            <th className="px-2 py-1 text-left text-gray-600 font-semibold">Descripción</th>
                            <th className="px-2 py-1 text-left text-gray-600 font-semibold">Cant.</th>
                            <th className="px-2 py-1 text-left text-gray-600 font-semibold">Stock</th>
                            <th className="px-2 py-1 text-left text-gray-600 font-semibold">Observ.</th>
                          </tr>
                        </thead>
                        <tbody>
                          {p.articulos?.map((a, idx) => (
                            <tr key={idx} className="border-b border-gray-100 last:border-b-0">
                              <td className="px-2 py-1 font-mono text-blue-600">{a.codint}</td>
                              <td className="px-2 py-1 font-medium">{a.articulo}</td>
                              <td className="px-2 py-1 text-gray-700">{a.descripcion}</td>
                              <td className="px-2 py-1 text-center font-semibold">{a.cant}</td>
                              <td className="px-2 py-1 text-center">{a.existencia}</td>
                              <td className="px-2 py-1 text-gray-600">{a.observacion}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </td>
                  <td className="px-4 py-3 border-b border-gray-200 align-top text-center">
                    <div className="max-w-xs">
                      <span className="text-sm text-gray-700 bg-orange-50 px-2 py-1 rounded">{p.observ || "-"}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 border-b border-gray-200 align-top text-center text-orange-600 font-medium text-lg">{p.numero_oc || "-"}</td>
                  <td className="px-4 py-3 border-b border-gray-200 align-top text-center text-orange-600 font-medium text-lg">{p.proveedor_seleccionado || "-"}</td>
                  <td className="px-4 py-3 border-b border-gray-200 align-top text-center">{formatDate(p.fecha_conf)}</td>
                  <td className="px-4 py-3 border-b border-gray-200 align-top text-center">{formatDate(p.fecha_prom)}</td>
                  <td className="px-4 py-3 border-b border-gray-200 align-top text-center">{formatDate(p.fecha_ent)}</td>
                  <td className="px-4 py-3 border-b border-gray-200 align-top text-center">{p.fac || "-"}</td>
                  <td className="px-4 py-3 border-b border-gray-200 align-top text-center">{p.rto || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
