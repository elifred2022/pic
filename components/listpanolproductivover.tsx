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

export default function ListPanolProductivoVer() {
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
      .from("picstock")
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



  return (
    <div className="flex-1 w-full overflow-auto p-4">
       
      
      <h1 className="text-xl font-bold mb-4">Pedidos productivos vista prvia</h1>
      
     
      
      
       


      
      <table className="min-w-full table-auto border border-gray-300 shadow-md rounded-md overflow-hidden">
        <thead className="bg-gray-100 text-gray-700">
          <tr className="bg-gray-100">
             
             <th className="px-4 py-2 border">Estado</th>
            <th className="px-4 py-2 border">Nº PIC</th>
            <th className="px-4 py-2 border">Fecha sol</th>
            <th className="px-4 py-2 border">Fecha nec</th>
            <th className="px-4 py-2 border">Categoria</th>
            <th className="px-4 py-2 border">Solicita</th>
            <th className="px-4 py-2 border">Sector</th>
            <th className="px-4 py-2 border">Cod cta</th>
            <th className="px-4 py-2 border">Cod. int. artic.</th>
            <th className="px-4 py-2 border">Cant sol</th>
            <th className="px-4 py-2 border">Cant exist</th>
            <th className="px-4 py-2 border">Articulo</th>
            <th className="px-4 py-2 border">Descripcion/Observacion</th>
            <th className="px-4 py-2 border">Controlado/Revisado</th>
            
            <th className="px-4 py-2 border">Aprueba</th>
            <th className="px-4 py-2 border">OC</th>
            <th className="px-4 py-2 border">Proveedor Selec.</th>
            
           
           
            
          </tr>
        </thead>
       <tbody>
  {filteredPedidos.map((pedido) => (
    <tr key={pedido.id}>
     
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
                        : pedido.estado === "confirmado" ? "text-green-600 font-semibold" 
                        : "text-black"
                    }
                >
                   {renderValue(pedido.estado)}
                </span>
      </td>
      <td className="px-4 py-2 border">{renderValue(pedido.id)}</td>
      <td className="px-4 py-2 border">{formatDate(pedido.created_at)}</td>
      <td className="px-4 py-2 border">{formatDate(pedido.necesidad)}</td>
      <td className="px-4 py-2 border">{renderValue(pedido.categoria)}</td>
      <td className="px-4 py-2 border">{renderValue(pedido.solicita)}</td>
      <td className="px-4 py-2 border">{renderValue(pedido.sector)}</td>
      <td className="px-4 py-2 border">{renderValue(pedido.cc)}</td>
      <td className="px-4 py-2 border">{renderValue(pedido.codint)}</td>
      <td className="px-4 py-2 border">{renderValue(pedido.cant)}</td>
      <td className="px-4 py-2 border">{renderValue(pedido.existencia)}</td>
      <td className="px-4 py-2 border">{renderValue(pedido.articulo)}</td>
      <td className="px-4 py-2 border">{renderValue(pedido.descripcion)}</td>
      <td className="px-4 py-2 border">
                <div className="flex flex-col">
                  <span> {pedido.controlado} </span>
                  <span>{pedido.superviso}</span>
                </div>
              </td>

     
      <td className="px-4 py-2 border">{renderValue(pedido.aprueba)}</td>
      <td className="px-4 py-2 border">{renderValue(pedido.oc)}</td>
      <td className="px-4 py-2 border">{renderValue(pedido.proveedor_selec)|| "-"}</td>
      
    </tr>
  ))}
</tbody>

      </table>

    </div>
  );
}

