"use client";

import { useEffect, useState } from "react";

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
    cant: number;
    provsug: string;
  }[];
};

export default function ListaPedidosProductivosVista() {
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
    <div className="w-screen felx justifi-enter">  
       <h1 className="text-xl font-bold mb-4">Pedidos Productivos Vista Previa Arr</h1>
      
<input
        type="text"
        placeholder="Buscar pedido..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="mb-4 px-4 py-2 border rounded w-full max-w-md"
      />
      {/* Tabla de pedidos */}
      <table className="min-w-full table-auto border border-gray-300 shadow-md rounded-md overflow-hidden">
        <thead className="bg-gray-100 text-gray-700">
          <tr>
            <th className={headerClass}>Estado</th>
             <th className={headerClass}>Pic</th>
            <th className={headerClass}>Fecha sol</th>
            <th className={headerClass}>Fecha nec</th>
            <th className={headerClass}>Categoria</th>
            <th className={headerClass}>Solicitante</th>
            <th className={headerClass}>Sector</th>
            <th className={headerClass}>Articulo solicitado</th>
            <th className={headerClass}>Observ/Mensaje</th>
            <th className={headerClass}>OC</th>
            <th className={headerClass}>Prov. Selecc.</th>
            
          </tr>
        </thead>
        <tbody>
          {filteredPedidos.map((p) => (
            <tr key={p.id}>
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
                        <th className="border px-1 py-1 text-xs">Descripción</th>
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
                        <td className="border px-1 py-1 text-xs">{a.cant}</td>
                        <td className="border px-1 py-1 text-xs">{a.existencia}</td>
                        </tr>
                    ))}
                    </tbody>
                </table>
                </td>
                <td className={cellClass}>{p.observ || "-"}</td>
              <td className={cellClass}>{p.numero_oc || "-"}</td>
              <td className={cellClass}>{p.proveedor_seleccionado || "-"}</td>
                
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
