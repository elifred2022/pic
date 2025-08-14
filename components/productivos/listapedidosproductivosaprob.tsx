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

const headerClass =
  "px-2 py-1 border text-xs font-semibold bg-gray-100 whitespace-nowrap"; // ← evita saltos de línea
const cellClass =
  "px-2 py-1 border align-top text-sm text-justify whitespace-pre-wrap break-words";


  return (
    <div className="w-screen felx justifi-enter">  
     
      {/* Botones superiores */}
      <div className="flex justify-between items-center mb-4">
        <Link
          href="/protected"
          className="inline-block px-4 py-2 mb-4 bg-white text-black font-semibold rounded-md shadow hover:bg-blue-700 transition-colors duration-200"
        >
          Home
        </Link>
      </div>

      <h1 className="text-xl font-bold mb-4">Pedidos Productivos</h1>

      <div className="flex flex-wrap gap-4 items-center">
        <Link
          href="/auth/rutaproductivos/crear-formpedidosproductivos"
          className="inline-block px-4 py-2 mb-4 bg-white text-black font-semibold rounded-md shadow hover:bg-blue-700 transition-colors duration-200"
        >
          Crear Pedido Productivo
        </Link>
        <input
          type="text"
          placeholder="Buscar pedido..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="mb-4 px-4 py-2 border rounded w-full max-w-md"
        />
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-4 items-center mb-4">
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
          Ocultar stand-by
        </label>
      </div>

      {/* Tabla de pedidos */}
      <table className="min-w-full table-auto border border-gray-300 shadow-md rounded-md overflow-hidden">
        <thead className="bg-gray-100 text-gray-700">
          <tr>
            <th className={headerClass}>Acc.</th>
            <th className={headerClass}>Estado</th>
             <th className={headerClass}>Pic</th>
            <th className={headerClass}>Fecha sol</th>
            <th className={headerClass}>Fecha nec</th>
            <th className={headerClass}>Categoria</th>
            <th className={headerClass}>Solicitante</th>
            <th className={headerClass}>Sector</th>
            <th className={headerClass}>Articulo solicitado</th>
            <th className={headerClass}>Observ/Mensaje</th>
             <th className={headerClass}>Supervisado</th>
            <th className={headerClass}>OC</th>
            <th className={headerClass}>Prov. Selecc.</th>
            <th className={headerClass}>Confirmado</th>
            <th className={headerClass}>Promesa</th>
            <th className={headerClass}>Entrego</th>
            <th className={headerClass}>Fac</th>
            <th className={headerClass}>Rto</th>
          </tr>
        </thead>
        <tbody>
          {filteredPedidos.map((p) => (
            <tr key={p.id}>
               <td className={cellClass}>
                <div className="flex gap-2">
                  
                 <button
                      className="px-4 py-2 bg-white text-black font-semibold rounded-md shadow hover:bg-blue-700 transition-colors duration-200"
                      onClick={() => {
                          setComparativaPedido(p);
                          setFormData(p); // Carga los datos al `formData` para poder editar el estado y el proveedor
                      }}
                  >
                      Comparativa
                  </button>
              
                   
                </div>
               
              </td>
              <td className={cellClass}>
                <span
                    className={
                    p.estado === "anulado"
                        ? "text-red-500 font-semibold"
                        : p.estado === "aprobado"
                        ? "text-green-600 font-semibold"
                        : p.estado === "cotizado"
                        ? "text-yellow-600 font-semibold"
                        : p.estado === "iniciado"
                        ? "text-yellow-600 font-semibold"
                        : p.estado === "visto/recibido"
                        ? "text-orange-500 font-semibold"
                        : p.estado === "stand by"
                        ? "text-orange-500 font-semibold"
                        : p.estado === "Presentar presencial"
                        ? "text-orange-500 font-semibold"
                        : p.estado === "cumplido"
                        ? "text-green-800 font-semibold"
                        : p.estado === "confirmado" ? "text-green-600 font-semibold" 
                        : "text-black"
                    }
                >
                   {renderValue(p.estado)}
                </span>
            </td>
            
              <td className={cellClass}>{p.id}</td>
              <td className={cellClass}>
                {new Date(p.created_at).toLocaleDateString()}
              </td>
              <td className={cellClass}>{new Date(p.necesidad).toLocaleDateString()}</td>
              <td className={cellClass}>{p.categoria}</td>
              <td className={cellClass}>{p.solicita}</td>
              <td className={cellClass}>{p.sector}</td>
              <td className={cellClass}>
                <table className="w-full border border-gray-300">
                    <thead>
                    <tr>
                        <th className="border px-1 py-1 text-xs">Cód. int.</th>
                        <th className="border px-1 py-1 text-xs">Artículo</th>
                        <th className="border px-1 py-1 text-xs">Descrip</th>
                        <th className="border px-1 py-1 text-xs">Observ</th>
                        <th className="border px-1 py-1 text-xs">Cant. sol.</th>
                        <th className="border px-1 py-1 text-xs">Stock</th>
                    </tr>
                    </thead>
                    <tbody>
                    {p.articulos?.map((a, idx) => (
                        <tr key={idx}>
                        <td className="border px-1 py-1 text-xs">{a.codint}</td>
                        <td className="border px-1 py-1 text-xs">{a.articulo}</td>
                        <td className="border px-1 py-1 text-xs">{a.descripcion}</td>
                        <td className="border px-1 py-1 text-xs">{a.observacion}</td>
                        <td className="border px-1 py-1 text-xs">{a.cant}</td>
                        <td className="border px-1 py-1 text-xs">{a.existencia}</td>
                        </tr>
                    ))}
                    </tbody>
                </table>
                </td>
                <td className={"px-2 py-1 border align-top text-orange-500 text-justify whitespace-pre-wrap break-words"}>{p.observ || "-"}</td>
               <td className={cellClass}>
                <div className="flex flex-col">
                  <span>{p.controlado}</span> 
                  <span>{p.supervisor || "-"}</span>
                </div>
               
                </td>
              <td className={cellClass}>{p.numero_oc || "-"}</td>
              <td className={cellClass}>{p.proveedor_seleccionado || "-"}</td>
                <td className={cellClass}>{formatDate(p.fecha_conf)}</td>
                <td className={cellClass}>{formatDate(p.fecha_prom)}</td>
                <td className={cellClass}>{formatDate(p.fecha_ent)}</td>
               <td className={cellClass}>{p.fac || "-"}</td>
               <td className={cellClass}>{p.rto || "-"}</td>
            </tr>
          ))}
        </tbody>
      </table>

  

      {/* ✅ Modal comparativa */}
      
  
{comparativaPedido && (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
        <div className="bg-white rounded shadow-lg p-6 w-full max-w-2xl max-h-screen overflow-y-auto">
            <h2 className="font-semibold mb-2 text-black">
                Comparativa de Proveedores - Pedido #{formData.id}
            </h2>
             <p>Sector: {formData.sector}</p>
              <p>Solicita: {formData.solicita}</p>
          <div className="text-black">
                  <p className="font-semibold">Artículos:</p>
                  {formData.articulos && formData.articulos.length > 0 ? (
                    <ul className="list-disc pl-5">
                      {formData.articulos.map((art, index) => (
                        <li className="felx" key={index}>
                        <p> {art.articulo}</p> <p> {art.observacion}</p> <p> Cant sol: {art.cant} </p> <p>Stock: {art.existencia}</p>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p>- Sin artículos -</p>
                  )}
                </div>
            
            {/* Sección de Comparativa de Proveedores (Solo lectura) */}
            <div className="mb-4">
                <h3 className="font-semibold mb-2 text-black">Cotizaciones</h3>
                <div className="overflow-x-auto">
                 
                    <div className="flex space-x-4">
                        {comparativaPedido.comparativa_prov?.map((prov, provIndex) => (
                            <div key={provIndex} className="min-w-[300px] border p-4 rounded-md shadow-sm">
                                <label className="block mb-2 text-sm font-medium text-black">Proveedor: </label>
                                <input
                                    type="text"
                                    className="border p-2 w-full mb-3 text-black font-semibold bg-gray-100"
                                    value={prov.nombreProveedor}
                                    readOnly // Campo de solo lectura
                                />

                                <table className="w-full text-black text-sm">
                                    <thead>
                                        <tr>
                                            <th className="px-1 text-left">Artículo</th>
                                            <th className="px-1 text-right">Cant.</th>
                                            <th className="px-1 text-right">Precio Unit.</th>
                                            <th className="px-1 text-right">Subtotal</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {prov.articulos.map((art, artIndex) => (
                                            <tr key={artIndex}>
                                                <td className="px-1">{art.articulo}</td>
                                                <td className="px-1 text-right">{art.cant}</td>
                                                <td className="px-1 text-right">
                                                    $ {art.precioUnitario.toFixed(2)}
                                                </td>
                                                <td className="px-1 text-right">
                                                    $ {art.subtotal.toFixed(2)}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                <div className="mt-2 text-right font-bold text-black">
                                    Total: $ {prov.total.toFixed(2)}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <hr className="my-4" />

            {/* Campos de edición */}
            <div className="flex flex-col gap-4">
                <label className="block text-sm font-medium text-black">Estado:Aprobar,</label>
                <select
                    className="border p-2 w-full bg-white text-black"
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

                <label className="block text-sm font-medium text-black">Proveedor Seleccionado:</label>
                <input
                    type="text"
                    className="border p-2 w-full bg-white text-black"
                    value={formData.proveedor_seleccionado || ""}
                    onChange={(e) => setFormData({ ...formData, proveedor_seleccionado: e.target.value })}
                />
            </div>

            <div className="flex justify-end gap-2 mt-4">
                <button
                    onClick={() => setComparativaPedido(null)}
                    className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
                >
                    Cerrar
                </button>
                <button
                    onClick={handleUpdatePedido}
                    className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
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
