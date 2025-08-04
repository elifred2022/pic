"use client";

import React, { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";


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
 
  fecha_conf: string;
  fecha_prom: string;
  fecha_ent: string;
  rto: number;
  fac: number;
  
  
  // Agregá más campos si los usás en el .map()
};

export default function ListPanolProductosGeneralesVer() {
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
        
      <h1 className="text-xl font-bold mb-4">Pedidos generales vista previa</h1>

      <table className="min-w-full table-auto border border-gray-300 shadow-md rounded-md overflow-hidden">
        <thead className="bg-gray-100 text-gray-700">
          <tr className="bg-gray-100">
           
             <th className={headerClass}>Estado</th>
            <th className={headerClass}>Nº PIC</th>
            <th className={headerClass}>Fecha sol</th>
            <th className={headerClass}>Fecha nec</th>
            <th className={headerClass}>Categoria</th>
            <th className={headerClass}>Solicita</th>
            <th className={headerClass}>Sector</th>
            <th className={headerClass}>Cod cta</th>
            <th className={headerClass}>Cod. int. artic.</th>
            <th className={headerClass}>Cant sol</th>
            <th className={headerClass}>Cant exist</th>
            <th className={headerClass}>Articulo</th>
            <th className={headerClass}>Descripcion/Observacion</th>
            <th className={headerClass}>Controlado/Revisado</th>
            <th className={headerClass}>Aprueba</th>
            <th className={headerClass}>OC</th>
            <th className={headerClass}>Proveedor Selec.</th>         
          </tr>
        </thead>
       <tbody>
  {filteredPedidos.map((pedido) => (
    <tr key={pedido.id}>
      
     
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
      <td className={cellClass}>{renderValue(pedido.id)}</td>
      <td className={cellClass}>{formatDate(pedido.created_at)}</td>
      <td className={cellClass}>{formatDate(pedido.necesidad)}</td>
      <td className={cellClass}>{renderValue(pedido.categoria)}</td>
      <td className={cellClass}>{renderValue(pedido.solicita)}</td>
      <td className={cellClass}>{renderValue(pedido.sector)}</td>
      <td className={cellClass}>{renderValue(pedido.cc)}</td>
      <td className={cellClass}>{renderValue(pedido.codint)}</td>
      <td className={cellClass}>{renderValue(pedido.cant)}</td>
      <td className={cellClass}>{renderValue(pedido.existencia)}</td>
      <td className={cellClass}>{renderValue(pedido.articulo)}</td>
      <td className={cellClass}>{renderValue(pedido.descripcion)}</td>
      <td className={cellClass}>
                <div className={cellClass}>
                  <span> {pedido.controlado} </span>
                  <span>{pedido.superviso}</span>
                </div>
              </td>

     
      <td className={cellClass}>{renderValue(pedido.aprueba)}</td>
      <td className={cellClass}>{renderValue(pedido.oc)}</td>
      <td className={cellClass}>{renderValue(pedido.proveedor_selec)|| "-"}</td>
      
    </tr>
  ))}
</tbody>

      </table>

    
    </div>
  );
}

