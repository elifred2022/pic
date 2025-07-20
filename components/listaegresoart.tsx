"use client";

import React, { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";


type Egresoart = {
  id: string;
  created_at: string;
  codint: string;
  articulo: string;
  descripcion: string;
  retira: string;
  descontart: string;
  obra: string;
  sector: string;
  
  // Agregá más campos si los usás en el .map()
};

export default function ListEgresoArticulos() {
  const [search, setSearch] = useState("");
  const [egresoarts, setEgresoArts] = useState<Egresoart[]>([]);
  const [ocultarSector, setOcultarSector] = useState(false);
  
  
  
  const supabase = createClient(); 

  /* para que no desactive checkbox al reset pagia  Al montar, leé localStorage (solo se ejecuta en el navegador) */
      useEffect(() => {
       const savedOcultarSector = localStorage.getItem("ocultarSector");
       
     
       if (savedOcultarSector !== null) setOcultarSector(savedOcultarSector === "true");
       
     }, []);
     
     
       /* Cada vez que cambia, actualizá localStorage */
      useEffect(() => {
       localStorage.setItem("ocultarSector", String(ocultarSector));
     }, [ocultarSector]);

  // Cargar datos
  useEffect(() => {
    const fetchEgresoArt = async () => {
      const { data, error } = await supabase.from("egarticulos").select("*")
  
      if (error) console.error("Error cargando registros:", error);
      else setEgresoArts(data);
    };
    fetchEgresoArt();
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
const dateFields: (keyof Egresoart)[] = [
  "created_at",
  
];

//Filtro que también contempla las fechas
const filteredEgresoArt = egresoarts
  .filter((egresoart) => {
    const s = search.trim().toLowerCase();   // la búsqueda, ya normalizada
    if (!s) return true;                     // si el input está vacío, no filtra nada

    return Object.entries(egresoart).some(([key, value]) => {
      if (value === null || value === undefined) return false;

      // A) Comparar contra la versión texto “tal cual viene”
      if (String(value).toLowerCase().includes(s)) return true;

      // B) Si el campo es fecha, probar otras representaciones
      if (dateFields.includes(key as keyof Egresoart)) {
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
  .filter((egresoart) => {
  if (ocultarSector && egresoart.sector === "pvc") return false;
  
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
          <Link
              href="/auth/lista-articulos"
              className="inline-block px-4 py-2 mb-4 bg-white text-black font-semibold rounded-md shadow hover:bg-blue-700 transition-colors duration-200"
            >
              Volver a Articulos
            </Link>
        <h1 className="text-xl font-bold mb-4">Registro de egreso de Articulos</h1>

        <div className="flex flex-wrap gap-4 items-center">
            
            <input
            type="text"
            placeholder="Buscar registros..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="mb-4 px-4 py-2 border rounded w-full max-w-md"
          />
        </div>

       <div className="flex flex-wrap gap-4 items-center">
          <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={ocultarSector}
            onChange={() => setOcultarSector((v) => !v)}
            className="w-4 h-4"
          />
          Ocultar sector pvc
        </label>
    </div>

     
      <table className="min-w-full table-auto border border-gray-300 shadow-md rounded-md overflow-hidden">
        <thead className="bg-gray-100 text-gray-700">
          <tr className="bg-gray-100">

             <th  className={headerClass}>Id</th>
             <th  className={headerClass}>Fecha de registro</th>
            <th  className={headerClass}>Cod int</th>
            <th  className={headerClass}>Articulo</th>
            <th  className={headerClass}>Descripcion</th>
              <th  className={headerClass}>Cantidad retirada</th>
            <th  className={headerClass}>Retiro</th>
            <th  className={headerClass}>Sector</th>
            <th  className={headerClass}>obra</th>
            
       
           
            
          </tr>
        </thead>
        <tbody>
          {filteredEgresoArt.map((egresoart) => (
            <tr key={egresoart.id}>
              

                <td className={cellClass}>{egresoart.id}</td>
              <td className={cellClass}>{formatDate(egresoart.created_at) || "-"}</td>
                <td className={cellClass}>{renderValue(egresoart.codint)}</td>
                <td className={cellClass}>{egresoart.articulo}</td>
                <td className={cellClass}>{egresoart.descripcion}</td>
                <td className={cellClass}>{egresoart.descontart}</td>
                <td className={cellClass}>{egresoart.retira}</td>
                <td className={cellClass}>{egresoart.sector}</td>
                <td className={cellClass}>{egresoart.obra}</td>
                
               

            </tr>
          ))}
        </tbody>
      </table>

      
    </div>
  );
}