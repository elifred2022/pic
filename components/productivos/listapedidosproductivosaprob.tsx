"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

type ArticuloComparativa = {
  codint: string;
  cant: number;
  articulo: string;
  precioUnitario: number;
  subtotal: number;
};

type ProveedorComparativa = {
  nombreProveedor: string;
  articulos: ArticuloComparativa[];
  total: number;
};

type Pedido = {
  comparativa_prov: ProveedorComparativa[] | null;
  id: string;
  created_at: string;
  necesidad: string;
  categoria: string;
  solicita: string;
  sector: string;
  controlado: string;
  supervisor: string;
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
    observacion: string;
    existencia: number;
    cant: number;
    provsug: string;
  }[];
};

export default function ListaPedidosProductivosAprob() {
   const [search, setSearch] = useState("");
    const [pedidos, setPedidos] = useState<Pedido[]>([]);
    const [editingPedido, setEditingPedido] = useState<Pedido | null>(null); //modal edicion
    const [ocultarCumplidos, setOcultarCumplidos] = useState(false);
    const [ocultarAprobados, setOcultarAprobados] = useState(false);
    const [ocultarAnulados, setOcultarAnulados] = useState(false);
    const [ocultarStandBy, setOcultarStandBy] = useState(false);
    const [ocultarConfirmado, setOcultarConfirmado] = useState(false);
    const [comparativaPedido, setComparativaPedido] = useState<Pedido | null>(null); //modal comparativa
    

    const [comparativaForm, setComparativaForm] = useState<ProveedorComparativa[] | null>(null);
  
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
        .from("pedidos_productivos")
        .select("*")
        //.eq("uuid", user.id); // 👈 Filtra por usuario logueado
  
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

  // ✅ Función para actualizar pedido
 // ✅ Función para actualizar pedido
const handleUpdatePedido = async () => {
    // Si no hay modal abierto, no hace nada
    if (!editingPedido && !comparativaPedido) return;

    // Define qué pedido se va a actualizar
    const pedidoToUpdate = editingPedido || comparativaPedido;
    if (!pedidoToUpdate) return;
    
    // Objeto con los datos que se van a actualizar
    const dataToUpdate: Partial<Pedido> = {
        estado: formData.estado,
        observ: formData.observ,
        numero_oc: formData.numero_oc,
        proveedor_seleccionado: formData.proveedor_seleccionado,
    };

    // Solo actualiza la comparativa si estamos en el modal de edición completa
    // donde el usuario tiene la capacidad de cambiar los precios.
    if (editingPedido) {
        dataToUpdate.comparativa_prov = comparativaForm; 
    }

    const { error } = await supabase
        .from("pedidos_productivos")
        .update(dataToUpdate)
        .eq("id", pedidoToUpdate.id);

    if (error) {
        console.error("Error actualizando pedido:", error);
        return;
    }

    // Actualiza la lista en memoria sin sobreescribir la comparativa si no es necesario
    setPedidos((prev) =>
        prev.map((p) =>
            p.id === pedidoToUpdate.id ? { ...p, ...dataToUpdate } as Pedido : p
        )
    );

    // Cierra los modales y resetea el estado
    setEditingPedido(null);
    setComparativaPedido(null);
    setComparativaForm(null);
};

// Estilos para la tabla (comentados por ahora)
// const headerClass = "px-2 py-1 border text-xs font-semibold bg-gray-100 whitespace-nowrap";
// const cellClass = "px-2 py-1 border align-top text-sm text-justify whitespace-pre-wrap break-words";


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
          
          <h1 className="text-3xl font-bold text-gray-800">📋 Pedidos Productivos Aprobación</h1>
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
            <span className="text-gray-700 font-medium">Ocultar stand by</span>
          </label>
        </div>
      </div>

      {/* Tabla con scroll horizontal y encabezado congelado */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="overflow-x-auto max-h-[70vh] overflow-y-auto">
          <table className="min-w-full table-auto border-collapse">
            <thead className="bg-gradient-to-r from-blue-600 to-blue-700 text-white sticky top-0 z-10">
              <tr>
                <th className="px-4 py-3 border-b border-blue-500 text-sm font-bold whitespace-nowrap text-left">Acciones</th>
                <th className="px-4 py-3 border-b border-blue-500 text-sm font-bold whitespace-nowrap text-center">Estado</th>
                <th className="px-4 py-3 border-b border-blue-500 text-sm font-bold whitespace-nowrap text-center">PIC</th>
                <th className="px-4 py-3 border-b border-blue-500 text-sm font-bold whitespace-nowrap text-center">Fecha Sol</th>
                <th className="px-4 py-3 border-b border-blue-500 text-sm font-bold whitespace-nowrap text-center">Fecha Nec</th>
                <th className="px-4 py-3 border-b border-blue-500 text-sm font-bold whitespace-nowrap text-center">Categoría</th>
                <th className="px-4 py-3 border-b border-blue-500 text-sm font-bold whitespace-nowrap text-center">Solicitante</th>
                <th className="px-4 py-3 border-b border-blue-500 text-sm font-bold whitespace-nowrap text-center">Sector</th>
                <th className="px-4 py-3 border-b border-blue-500 text-sm font-bold whitespace-nowrap text-center">Artículo Solicitado</th>
                <th className="px-4 py-3 border-b border-blue-500 text-sm font-bold whitespace-nowrap text-center">Observ/Mensaje</th>
                <th className="px-4 py-3 border-b border-blue-500 text-sm font-bold whitespace-nowrap text-center">Supervisado</th>
                <th className="px-4 py-3 border-b border-blue-500 text-sm font-bold whitespace-nowrap text-center">Aprueba</th>
                <th className="px-4 py-3 border-b border-blue-500 text-sm font-bold whitespace-nowrap text-center">OC</th>
                <th className="px-4 py-3 border-b border-blue-500 text-sm font-bold whitespace-nowrap text-center">Prov. Selecc.</th>
                <th className="px-4 py-3 border-b border-blue-500 text-sm font-bold whitespace-nowrap text-center">Confirmado</th>
                <th className="px-4 py-3 border-b border-blue-500 text-sm font-bold whitespace-nowrap text-center">Promesa</th>
                <th className="px-4 py-3 border-b border-blue-500 text-sm font-bold whitespace-nowrap text-center">Entrego</th>
                <th className="px-4 py-3 border-b border-blue-500 text-sm font-bold whitespace-nowrap text-center">Fac</th>
                <th className="px-4 py-3 border-b border-blue-500 text-sm font-bold whitespace-nowrap text-center">Rto</th>
              </tr>
            </thead>
                         <tbody>
               {filteredPedidos.map((p) => (
                 <tr key={p.id} className="hover:bg-gray-50 transition-colors duration-200">
                    <td className="px-4 py-3 border-b border-gray-200 align-top">
                     <div className="flex flex-col gap-2">
                      <button
                           className="px-3 py-2 bg-blue-500 text-white font-medium rounded-lg shadow-md hover:bg-blue-600 transition-all duration-200 transform hover:scale-105 text-sm"
                           onClick={() => {
                               setComparativaPedido(p);
                               setFormData(p);
                           }}
                       >
                           📊 Comparativa
                       </button>
                     </div>
                   </td>
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
                             ? "px-3 py-2 bg-yellow-100 text-yellow-800 text-sm font-semibold rounded-full"
                             : p.estado === "visto/recibido"
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
                   <td className="px-4 py-3 border-b border-gray-200 align-top text-center">{new Date(p.created_at).toLocaleDateString()}</td>
                   <td className="px-4 py-3 border-b border-gray-200 align-top text-center">{new Date(p.necesidad).toLocaleDateString()}</td>
                   <td className="px-4 py-3 border-b border-gray-200 align-top text-center">{p.categoria}</td>
                   <td className="px-4 py-3 border-b border-gray-200 align-top text-center">{p.solicita}</td>
                   <td className="px-4 py-3 border-b border-gray-200 align-top text-center">{p.sector}</td>
                   <td className="px-4 py-3 border-b border-gray-200 align-top text-center">
                     {p.articulos && p.articulos.length > 0 ? (
                       <div className="space-y-2">
                         {p.articulos.map((a, idx) => (
                           <div key={idx} className="text-sm bg-gray-50 p-3 rounded-lg border border-gray-200">
                             <div className="font-medium text-gray-800">{a.articulo}</div>
                             <div className="text-gray-600 text-xs font-mono bg-gray-100 px-2 py-1 rounded">Código: {a.codint}</div>
                             <div className="text-gray-600 text-xs">Cant: {a.cant}</div>
                             <div className="text-gray-600 text-xs">Stock: {a.existencia}</div>
                           </div>
                         ))}
                       </div>
                     ) : (
                       <span className="text-gray-400 text-sm">- Sin artículos -</span>
                     )}
                   </td>
                   <td className="px-4 py-3 border-b border-gray-200 align-top text-center">
                     <div className="max-w-xs">
                       <span className="text-sm text-gray-700">{p.observ || "-"}</span>
                     </div>
                   </td>
                   <td className="px-4 py-3 border-b border-gray-200 align-top text-center">
                     <div className="flex flex-col gap-1">
                       <span className="text-sm font-medium text-gray-700">{p.controlado}</span>
                       <span className="text-sm text-gray-600">{p.supervisor || "-"}</span>
                     </div>
                   </td>
                   <td className="px-4 py-3 border-b border-gray-200 align-top text-center text-orange-600 font-medium text-lg">{renderValue(p.aprueba)}</td>
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

  

      {/* ✅ Modal comparativa */}
      
  
      {/* Modal de comparativa */}
      {comparativaPedido && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl max-h-screen overflow-y-auto">
            <div className="bg-gradient-to-r from-green-600 to-green-700 text-white p-6 rounded-t-xl">
              <h2 className="text-2xl font-bold">📊 Comparativa de Proveedores #{formData.id}</h2>
              <p className="text-green-100 mt-2">Vista de comparativa y edición de estado</p>
            </div>
            <div className="p-6">
              {/* Información del pedido */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="text-lg font-semibold text-gray-800 mb-3">📋 Detalles del Pedido</h3>
                  <div className="space-y-2 text-sm">
                    <p><span className="font-medium">Sector:</span> {formData.sector}</p>
                    <p><span className="font-medium">Solicitante:</span> {formData.solicita}</p>
                  </div>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="text-lg font-semibold text-gray-800 mb-3">📦 Artículos</h3>
                  {formData.articulos && formData.articulos.length > 0 ? (
                    <div className="space-y-2">
                      {formData.articulos.map((art, index) => (
                        <div key={index} className="bg-white p-3 rounded border border-gray-200">
                          <div className="font-medium text-gray-800 text-sm">{art.articulo}</div>
                          <div className="text-gray-600 text-xs font-mono bg-gray-100 px-2 py-1 rounded mb-2">Código: {art.codint}</div>
                          <div className="text-gray-600 text-xs">Cant: {art.cant}</div>
                          <div className="text-gray-600 text-xs">Stock: {art.existencia}</div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-sm">- Sin artículos -</p>
                  )}
                </div>
              </div>
              
              {/* Sección de Comparativa de Proveedores (Solo lectura) */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                  <span className="mr-2">💰</span>
                  Cotizaciones de Proveedores
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {comparativaPedido.comparativa_prov?.map((prov, provIndex) => (
                    <div key={provIndex} className="bg-gray-50 border border-gray-200 p-4 rounded-lg shadow-sm">
                      <label className="block mb-3 text-sm font-medium text-gray-700">Proveedor:</label>
                      <input
                        type="text"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg mb-3 text-gray-800 font-semibold bg-white text-center text-sm"
                        value={prov.nombreProveedor}
                        readOnly
                      />

                      <table className="w-full text-gray-700 text-sm">
                        <thead>
                          <tr className="border-b border-gray-200">
                            <th className="px-2 py-2 text-left font-medium">Artículo</th>
                            <th className="px-2 py-2 text-center font-medium">Cant.</th>
                            <th className="px-2 py-2 text-center font-medium">Precio</th>
                            <th className="px-2 py-2 text-center font-medium">Subtotal</th>
                          </tr>
                        </thead>
                        <tbody>
                          {prov.articulos.map((art, artIndex) => (
                            <tr key={artIndex} className="border-b border-gray-100">
                              <td className="px-2 py-2 text-sm truncate" title={art.articulo}>
                                {art.articulo}
                              </td>
                              <td className="px-2 py-2 text-center text-sm">{art.cant}</td>
                              <td className="px-2 py-2 text-center text-sm">
                                ${(art.precioUnitario || 0).toFixed(0)}
                              </td>
                              <td className="px-2 py-2 text-center text-sm">
                                ${(art.subtotal || 0).toFixed(0)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      <div className="mt-3 text-center font-bold text-gray-800 bg-white p-3 rounded border text-sm">
                        Total: ${(prov.total || 0).toFixed(0)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <hr className="my-6" />

              {/* Campos de edición */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Estado:</label>
                  <select
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg bg-white text-gray-800 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                    value={formData.estado || ""}
                    onChange={(e) => setFormData({ ...formData, estado: e.target.value })}
                  >
                    <option value="iniciado">Iniciado</option>
                    <option value="visto/recibido">Visto/Recibido</option>
                    <option value="aprobado">Aprobado</option>
                    <option value="cotizado">Cotizado</option>
                    <option value="confirmado">Confirmado</option>
                    <option value="cumplido">Cumplido</option>
                    <option value="anulado">Anulado</option>
                    <option value="stand by">Stand By</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Proveedor Seleccionado:</label>
                  <input
                    type="text"
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg bg-white text-gray-800 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                    value={formData.proveedor_seleccionado || ""}
                    onChange={(e) => setFormData({ ...formData, proveedor_seleccionado: e.target.value })}
                  />
                </div>
              </div>

              {/* Botones de acción */}
              <div className="flex justify-end space-x-4 mt-6 pt-6 border-t border-gray-200">
                <button
                  onClick={() => setComparativaPedido(null)}
                  className="px-6 py-3 bg-gray-500 text-white font-medium rounded-lg hover:bg-gray-600 transition-all duration-200"
                >
                  ❌ Cerrar
                </button>
                <button
                  onClick={handleUpdatePedido}
                  className="px-6 py-3 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition-all duration-200"
                >
                  💾 Guardar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      
    </div>
  );

  
}
