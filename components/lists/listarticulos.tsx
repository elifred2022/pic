"use client";

import React, { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";


type Articulo = {
  id: string;
  created_at: string;
  updated_at: string;
  ultimo_prov: string;
  codint: string;
  cc: string;
  articulo: string;
  descripcion: string;
  costunit: string;
  descuento: string;
  costunitcdesc: string;
  divisa: string;
  existencia: string;
  provsug: string;
  codprovsug: string;
  familia: string;
  situacion: string;
  
  
  // Agregá más campos si los usás en el .map()
};

export default function ListArticulos() {
  const [search, setSearch] = useState("");
  const [articulos, setArticulos] = useState<Articulo[]>([]);
  const [updatedDesde, setUpdatedDesde] = useState("");
  const [updatedHasta, setUpdatedHasta] = useState("");
  const [editingArticulo, setEditingArticulo] = useState<Articulo | null>(null);
  const [ingresarArticulo, setIngresarArticulo] = useState<Articulo | null>(null);
  const [descontarArticulo, setDescontarArticulo] = useState<Articulo | null>(null);
  const [ocultarArticuloInactivo, setOcultarArticuloInactivo] = useState(false);

    //variables ingreso y egreso articulos
    const [ingresart, setIngresArt] = useState("");
    const [descontart, setDescontArt] = useState(""); // este es cantretiro en registro de egreso
    const [retira, setRetira] = useState("");
    const [obra, setObra] = useState("");
    const [sector, setSector] = useState("");
    const [nombreprov, setNombreprov] = useState("");
    const [rto, setRto] = useState("");
    const [fac, setFac] = useState("");
    const [fecha_ent, setFecha_ent] = useState("");
    const [observacion, setObservacion] = useState("");
    
      
  
  const [formData, setFormData] = useState<Partial<Articulo>>({});
  const supabase = createClient();

  const parseNumero = (valor?: string) => {
    if (!valor) return 0;
    const normalizado = valor.replace(",", ".");
    const numero = parseFloat(normalizado);
    return Number.isNaN(numero) ? 0 : numero;
  };

  /* para que no desactive checkbox al reset pagia  Al montar, leé localStorage (solo se ejecuta en el navegador) */
    useEffect(() => {
     const savedInactivo = localStorage.getItem("ocultarArticuloInactivo");
     
   
     if (savedInactivo !== null) setOcultarArticuloInactivo(savedInactivo === "true");
     
   }, []);
   
   
     /* Cada vez que cambia, actualizá localStorage */
    useEffect(() => {
     localStorage.setItem("ocultarArticuloInactivo", String(ocultarArticuloInactivo));
   }, [ocultarArticuloInactivo]);
   
 
   

  // Cargar datos
  useEffect(() => {
    const fetchArticulos = async () => {
      const { data, error } = await supabase.from("articulos").select("*");
      if (error) console.error("Error cargando articulos:", error);
      else setArticulos(data);
    };
    fetchArticulos();
  }, [supabase]);

  const fetchArticulosPorUpdatedAt = async () => {
    let query = supabase.from("articulos").select("*");

    if (updatedDesde) {
      query = query.gte("updated_at", `${updatedDesde}T00:00:00`);
    }
    if (updatedHasta) {
      query = query.lte("updated_at", `${updatedHasta}T23:59:59.999`);
    }

    const { data, error } = await query;
    if (error) {
      console.error("Error filtrando por updated_at:", error);
      return;
    }
    setArticulos(data || []);
  };

  const limpiarFiltroUpdatedAt = async () => {
    setUpdatedDesde("");
    setUpdatedHasta("");
    const { data, error } = await supabase.from("articulos").select("*");
    if (error) {
      console.error("Error cargando articulos:", error);
      return;
    }
    setArticulos(data || []);
  };

  const handleImprimirReporte = () => {
    try {
      setTimeout(() => {
        window.print();
      }, 100);
    } catch (error) {
      console.error("Error al imprimir:", error);
    }
  };

  const handleExportarExcel = () => {
    const headers = [
      "Articulo",
      "Cod int",
      "Cost. unit.",
      "% Desc",
      "Cost. unit. c/ desc.",
      "Divisa",
      "Fecha de actualizacion",
      "Ultimo proveedor",
    ];

    const rows = filteredArticulos.map((articulo) => [
      articulo.articulo ?? "",
      articulo.codint ?? "",
      articulo.costunit ?? "",
      articulo.descuento ?? "",
      parseNumero(String(articulo.costunitcdesc ?? "")).toFixed(2),
      articulo.divisa ?? "",
      formatDate(articulo.updated_at) || "",
      articulo.ultimo_prov ?? "",
    ]);

    const escapeCsv = (value: string) => `"${value.replace(/"/g, '""')}"`;
    const csv = [
      headers.map(escapeCsv).join(","),
      ...rows.map((row) => row.map((cell) => escapeCsv(String(cell))).join(",")),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "reporte_articulos.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

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
const dateFields: (keyof Articulo)[] = [
  "created_at",
  
];

//Filtro que también contempla las fechas
const filteredArticulos = articulos
  .filter((articulo) => {
    const s = search.trim().toLowerCase();   // la búsqueda, ya normalizada
    if (!s) return true;                     // si el input está vacío, no filtra nada

    return Object.entries(articulo).some(([key, value]) => {
      if (value === null || value === undefined) return false;

      // A) Comparar contra la versión texto “tal cual viene”
      if (String(value).toLowerCase().includes(s)) return true;

      // B) Si el campo es fecha, probar otras representaciones
      if (dateFields.includes(key as keyof Articulo)) {
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
  .filter((articulo) => {
  if (ocultarArticuloInactivo && articulo.situacion === "inactivo") return false;
  
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
    <div className="flex-2 w-full overflow-auto p-2">
        <style>{`
          @media print {
            .print-hidden {
              display: none !important;
            }
            table thead th,
            table tbody td {
              display: none !important;
            }
            .print-report {
              display: table-cell !important;
            }
            table {
              font-size: 10px !important;
            }
            th.print-report,
            td.print-report {
              padding: 2px 4px !important;
              white-space: nowrap !important;
            }
            th.print-report.wrap,
            td.print-report.wrap {
              white-space: normal !important;
            }
          }
        `}</style>
        <div className="flex flex-wrap gap-4 items-center" >
             <Link
              href="/protected"
              className="inline-block px-4 py-2 mb-4 bg-white text-black font-semibold rounded-md shadow hover:bg-blue-700 transition-colors duration-200"
            >
              Home
            </Link>
           
        </div>
           
    <h1 className="text-xl font-bold mb-4">Modulo Articulos</h1>

        <div className="flex flex-wrap gap-4 items-center print-hidden">
             <Link
            href="/auth/crear-formarticulo"
            className="inline-block px-4 py-2 mb-4 bg-white text-black font-semibold rounded-md shadow hover:bg-blue-700 transition-colors duration-200"
          >
            Crear nuevo articulo
          </Link>
            <input
            type="text"
            placeholder="Buscar articulo..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="mb-4 px-4 py-2 border rounded w-full max-w-md"
          />
          <div className="flex flex-wrap gap-2 items-end">
            <div className="flex flex-col">
              <label className="text-xs text-gray-600">Updated desde</label>
              <input
                type="date"
                value={updatedDesde}
                onChange={(e) => setUpdatedDesde(e.target.value)}
                className="px-2 py-1 border rounded"
              />
            </div>
            <div className="flex flex-col">
              <label className="text-xs text-gray-600">Updated hasta</label>
              <input
                type="date"
                value={updatedHasta}
                onChange={(e) => setUpdatedHasta(e.target.value)}
                className="px-2 py-1 border rounded"
              />
            </div>
            <button
              type="button"
              onClick={fetchArticulosPorUpdatedAt}
              className="px-3 py-2 bg-blue-600 text-white rounded"
            >
              Filtrar
            </button>
            <button
              type="button"
              onClick={limpiarFiltroUpdatedAt}
              className="px-3 py-2 bg-gray-200 text-black rounded"
            >
              Limpiar
            </button>
            <button
              type="button"
              onClick={handleImprimirReporte}
              className="px-3 py-2 bg-green-600 text-white rounded"
            >
              Imprimir reporte
            </button>
            <button
              type="button"
              onClick={handleExportarExcel}
              className="px-3 py-2 bg-emerald-600 text-white rounded"
            >
              Exportar Excel
            </button>
          </div>

           <Link
              href="/auth/list-egresoart"
              className="inline-block px-4 py-2 mb-4 bg-white text-black font-semibold rounded-md shadow hover:bg-blue-700 transition-colors duration-200"
            >
              Registros de Egresos
            </Link>

             <Link
              href="/auth/list-ingresoart"
              className="inline-block px-4 py-2 mb-4 bg-white text-black font-semibold rounded-md shadow hover:bg-blue-700 transition-colors duration-200"
            >
              Registros de ingresos
            </Link>
        </div>

       <div className="flex flex-wrap gap-4 items-center">
          <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={ocultarArticuloInactivo}
            onChange={() => setOcultarArticuloInactivo((v) => !v)}
            className="w-4 h-4"
          />
          Ocultar articulos inactivos
        </label>
    </div>

     
      <table className="min-w-full table-auto border border-gray-300 shadow-md rounded-md overflow-hidden">
        <thead className="bg-gray-100 text-gray-700">
          <tr className="bg-gray-100">
            <th  className={headerClass}>Accion</th>
            <th  className={headerClass}>Id</th>
             <th  className={headerClass}>Fecha de alta</th>
            <th className={`${headerClass} print-report`}>Articulo</th>
            <th  className={headerClass}>Descripcion</th>
            <th className={`${headerClass} print-report`}>Cod int</th>
            <th className={`${headerClass} print-report`}>Cost. unit.</th>
            <th className={`${headerClass} print-report`}>% Desc</th>
            <th className={`${headerClass} print-report`}>Cost. unit. c/ desc.</th>
            <th className={`${headerClass} print-report`}>Divisa</th>
            <th className={`${headerClass} print-report`}>Fecha de actualizacion</th>
            <th className={`${headerClass} print-report wrap`}>Ultimo proveedor</th>
            <th  className={headerClass}>Cod cta</th>
            

           
             
          
            
            
            <th  className={headerClass}>Exsitencia</th>
            <th  className={headerClass}>Prov. sug.</th>
            <th  className={headerClass}>Cod. prov. sug.</th>
            <th  className={headerClass}>Familia</th>
            <th  className={headerClass}>Situacion</th>
       
           
            
          </tr>
        </thead>
        <tbody>
          {filteredArticulos.map((articulo) => (
            <tr key={articulo.id}>
               <td className={cellClass}>
                <div className="flex gap-2">
                    
                  <button
                    className="px-4 py-2 bg-white text-black font-semibold rounded-md shadow hover:bg-blue-700 transition-colors duration-200"
                    onClick={() => {
                        setIngresArt(""); // limpiar antes de abrir
                        setIngresarArticulo(articulo);
                        setFormData({
                        created_at: articulo.created_at,
                        updated_at: articulo.updated_at,
                        ultimo_prov: articulo.ultimo_prov,
                        id: articulo.id,
                        codint: articulo.codint,
                        articulo: articulo.articulo,
                        descripcion: articulo.descripcion,
                        existencia: articulo.existencia,
                        provsug: articulo.provsug,
                        codprovsug: articulo.codprovsug,
                        familia: articulo.familia,
                        situacion: articulo.situacion,
                        cc: articulo.cc,
                        costunit: articulo.costunit,
                        descuento: articulo.descuento,
                        costunitcdesc: articulo.costunitcdesc,
                        divisa: articulo.divisa,

                      });
                    }}
                  >
                    Ingreso
                  </button>

                  
                  <button
                    className="px-4 py-2 bg-white text-black font-semibold rounded-md shadow hover:bg-blue-700 transition-colors duration-200"
                    onClick={() => {
                      setDescontArt(""); // limpiar antes de abrir
                      setDescontarArticulo(articulo);
                      setFormData({
                        created_at: articulo.created_at,
                        updated_at: articulo.updated_at,
                        ultimo_prov: articulo.ultimo_prov,
                        id: articulo.id,
                        codint: articulo.codint,
                        articulo: articulo.articulo,
                        descripcion: articulo.descripcion,
                        existencia: articulo.existencia,
                        provsug: articulo.provsug,
                        codprovsug: articulo.codprovsug,
                        familia: articulo.familia,
                        situacion: articulo.situacion,
                        cc: articulo.cc,
                        costunit: articulo.costunit,
                        descuento: articulo.descuento,
                        costunitcdesc: articulo.costunitcdesc,
                        divisa: articulo.divisa,
                      });
                    }}
                  >
                    Egreso
                  </button>

                  <button
                    className="px-4 py-2 bg-white text-black font-semibold rounded-md shadow hover:bg-blue-700 transition-colors duration-200"
                    onClick={() => {
                      setEditingArticulo(articulo);
                      setFormData({
                        created_at: articulo.created_at,
                        updated_at: articulo.updated_at,
                        ultimo_prov: articulo.ultimo_prov,
                        id: articulo.id,
                        codint: articulo.codint,
                        articulo: articulo.articulo,
                        descripcion: articulo.descripcion,
                        existencia: articulo.existencia,
                        provsug: articulo.provsug,
                        codprovsug: articulo.codprovsug,
                        familia: articulo.familia,
                        situacion: articulo.situacion,
                        cc: articulo.cc,
                        costunit: articulo.costunit,
                        descuento: articulo.descuento,
                        costunitcdesc: articulo.costunitcdesc,
                        divisa: articulo.divisa,
                      });
                    }}
                  >
                    Edit
                  </button>


                  <button
                    className="px-4 py-2 bg-white text-red-700 font-semibold rounded-md shadow hover:bg-red-700 hover:text-black transition-colors duration-200"
                    onClick={async () => {
                      const confirm = window.confirm(
                        `¿Estás seguro de que querés eliminar el articulo ${articulo.id} ${articulo.articulo} ?`
                      );
                      if (!confirm) return;

                      const { error } = await supabase.from("articulos").delete().eq("id", articulo.id);
                      if (error) {
                        alert("Error al eliminar");
                        console.error(error);
                      } else {
                        alert("articulo eliminado");
                        const { data } = await supabase.from("articulos").select("*");
                        if (data) setArticulos(data);
                      }
                    }}
                  >
                    Elim
                  </button>

                  
                </div></td>
                <td className={cellClass}>{articulo.id}</td>
                <td className={cellClass}>{formatDate(articulo.created_at) || "-"}</td>
                <td className={`${cellClass} print-report`}>{articulo.articulo}</td>
                <td className={cellClass}>{articulo.descripcion}</td>
                <td className={`${cellClass} print-report`}>{articulo.codint}</td>
                <td className={`${cellClass} print-report`}>{articulo.costunit}</td>
                <td className={`${cellClass} print-report`}>{articulo.descuento}</td>
                <td className={`${cellClass} print-report`}>
                  {parseNumero(String(articulo.costunitcdesc ?? "")).toFixed(2)}
                </td>
                <td className={`${cellClass} print-report`}>{articulo.divisa}</td>
                <td className={`${cellClass} print-report`}>{formatDate(articulo.updated_at) || "-"}</td>
                <td className={`${cellClass} print-report wrap`}>{articulo.ultimo_prov}</td>
                <td className={cellClass}>{renderValue(articulo.cc)}</td>
                <td className={cellClass}>{articulo.existencia}</td>
                <td className={cellClass}>{articulo.provsug}</td>
                <td className={cellClass}>{articulo.codprovsug}</td>
                <td className={cellClass}>{articulo.familia}</td>
                <td className={cellClass}>{articulo.situacion}</td>

            </tr>
          ))}
        </tbody>
      </table>

      

      {/* MODAL */}
      {editingArticulo && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
          <div className="bg-white p-6 rounded shadow-lg w-full max-w-md max-h-screen overflow-y-auto">
            <h2 className="text-black font-bold mb-4">Editar articulo #{editingArticulo.id}</h2>
           
            
            
              <div className="mb-4 flex justify-between">
                <span className="text-black font-semibold">Articulo: {editingArticulo.articulo}</span>
               
              </div>

              <label className="block mb-4">
                    <p className="text-black">Cod. Cta.</p>
                        <input
                            className="w-full border p-2 rounded mt-1"
                            type="text"
                            value={formData.cc ?? ""}
                            onChange={(e) =>
                            setFormData({ ...formData, cc: e.target.value})
                            }
                        />
                </label>
                       
                       

                <label className="block mb-4">
                    <p className="text-black">Articulo</p>
                        <input
                            className="w-full border p-2 rounded mt-1"
                            type="text"
                            value={formData.articulo ?? ""}
                            onChange={(e) =>
                            setFormData({ ...formData, articulo: e.target.value})
                            }
                        />
                </label>
                <label className="block mb-4">
                    <p className="text-black">Ultimo proveedor</p>
                        <input
                            className="w-full border p-2 rounded mt-1"
                            type="text"
                            value={formData.ultimo_prov ?? ""}
                            onChange={(e) =>
                            setFormData({ ...formData, ultimo_prov: e.target.value})
                            }
                        />
                </label>

                <label className="block mb-4">
                    <p className="text-black">Descripcion</p>
                        <input
                            className="w-full border p-2 rounded mt-1"
                            type="text"
                            value={formData.descripcion ?? ""}
                            onChange={(e) =>
                            setFormData({ ...formData, descripcion: e.target.value})
                            }
                        />
                </label>

                 <label className="block mb-4">
                    <p className="text-black">Cost. unit.</p>
                        <input
                            className="w-full border p-2 rounded mt-1"
                            type="numeric"
                         
                            value={formData.costunit ?? ""}
                            onChange={(e) =>
                            setFormData({ ...formData, costunit: e.target.value})
                            }
                        />
                </label>
                <label className="block mb-4">
                    <p className="text-black">% Desc</p>
                        <input
                            className="w-full border p-2 rounded mt-1"
                            type="numeric"
                            value={formData.descuento ?? ""}
                            onChange={(e) => {
                              const descuento = e.target.value;
                              const costunit = parseNumero(formData.costunit?.toString());
                              const porcentaje = parseNumero(descuento);
                              const costunitcdesc =
                                costunit && descuento !== ""
                                  ? (costunit - (costunit * porcentaje) / 100).toFixed(2)
                                  : "";
                              setFormData({
                                ...formData,
                                descuento,
                                costunitcdesc,
                              });
                            }}
                        />
                </label>

                <label className="block mb-4">
                    <p className="text-black">Cost. unit. c/ desc.</p>
                        <input
                            className="w-full border p-2 rounded mt-1"
                            type="numeric"
                            value={formData.costunitcdesc ?? ""}
                            onChange={(e) =>
                            setFormData({ ...formData, costunitcdesc: e.target.value})
                            }
                        />
                </label>

                   <label className="block mb-4">
                    <p className="text-black">Divisa</p>
                    <select
                      className="w-full border p-2 rounded mt-1"
                      value={formData.divisa ?? ""}
                      onChange={(e) =>
                        setFormData({ ...formData, divisa: e.target.value })
                      }
                    >
                      <option value="">Seleccionar divisa</option>
                      <option value="Ars" className="bg-yellow-300 text-black">
                        Ars
                      </option>
                      <option value="Usd" className="bg-green-400 text-white">
                        Usd
                      </option>
                       <option value="Eur" className="bg-green-400 text-white">
                        Eur
                      </option>
                    </select>
                  </label>

                 <label className="block mb-4">
                    <p className="text-black">Existencia</p>
                        <input
                            className="w-full border p-2 rounded mt-1"
                            type="text"
                            value={formData.existencia ?? ""}
                            onChange={(e) =>
                            setFormData({ ...formData, existencia: e.target.value})
                            }
                        />
                </label>

                <label className="block mb-4">
                    <p className="text-black">Prov sugerido</p>
                        <input
                            className="w-full border p-2 rounded mt-1"
                            type="text"
                            value={formData.provsug ?? ""}
                            onChange={(e) =>
                            setFormData({ ...formData, provsug: e.target.value})
                            }
                        />
                </label>

                <label className="block mb-4">
                    <p className="text-black">Cod. prov. sug.</p>
                        <input
                            className="w-full border p-2 rounded mt-1"
                            type="text"
                            value={formData.codprovsug ?? ""}
                            onChange={(e) =>
                            setFormData({ ...formData, codprovsug: e.target.value})
                            }
                        />
                </label>
                
                <label className="block mb-4">
                    <p className="text-black">Familia</p>
                        <input
                            className="w-full border p-2 rounded mt-1"
                            type="text"
                            value={formData.familia ?? ""}
                            onChange={(e) =>
                            setFormData({ ...formData, familia: e.target.value})
                            }
                        />
                </label>

               <label className="block mb-4">
                    <p className="text-black">Situacion</p>
                    <select
                      className="w-full border p-2 rounded mt-1"
                      value={formData.situacion ?? ""}
                      onChange={(e) =>
                        setFormData({ ...formData, situacion: e.target.value })
                      }
                    >
                      <option value="">Seleccionar situacion</option>
                      <option value="activo" className="bg-yellow-300 text-black">
                        Activo
                      </option>
                      <option value="inactivo" className="bg-green-400 text-white">
                        Inactivo
                      </option>
                      
                    </select>
                  </label>
            
                <div className="flex justify-end space-x-2">
                <button
                    onClick={() => setEditingArticulo(null)}
                    className="px-4 py-2 bg-gray-400 text-white rounded"
                >
                    Cancelar
                </button>
                <button
  onClick={async () => {
    if (
      formData.costunit === undefined ||
      formData.costunit === null ||
      formData.costunit.toString().trim() === ""
    ) {
      alert("El campo 'Cost. unit.' no puede estar vacío. Si no tiene valor, usá 0.");
      return;
    }

    const { error } = await supabase
      .from("articulos")
      .update({
        ...formData,
        updated_at: new Date().toISOString(),
      })
      .eq("id", editingArticulo.id);

    if (error) {
      alert("Error actualizando");
      console.error(error);
    } else {
      alert("Actualizado correctamente");
      setEditingArticulo(null);
      setFormData({});
      const { data } = await supabase.from("articulos").select("*");
      if (data) setArticulos(data);
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
        
       {ingresarArticulo && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
          <div className="bg-white p-6 rounded shadow-lg w-full max-w-md max-h-screen overflow-y-auto">
            <h2 className="text-black font-bold mb-4">Ingresar articulo #{ingresarArticulo.id}</h2>

              <div className="mb-6 grid grid-cols-2 gap-2 sm:grid-cols-2 md:grid-cols-2">
                <div>
                  <span className="block text-sm font-semibold text-gray-700">Código:</span>
                  <span className="text-black">{ingresarArticulo.codint}</span>
                </div>
                <div>
                  <span className="block text-sm font-semibold text-gray-700">Artículo:</span>
                  <span className="text-black">{ingresarArticulo.articulo}</span>
                </div>
                <div className="col-span-2">
                  <span className="block text-sm font-semibold text-gray-700">Descripción:</span>
                  <span className="text-black">{ingresarArticulo.descripcion}</span>
                </div>
                <div>
                  <span className="block text-sm font-semibold text-gray-700">Stock actual:</span>
                  <span className="text-black">{ingresarArticulo.existencia}</span>
                </div>
              </div>

                 <label className="block mb-4">
                    <p className="text-black">Cant. a ingresar</p>
                        <input
                            className="w-full border p-2 rounded mt-1"
                            type="text"
                            inputMode="numeric"
                            value={ingresart}
                            onChange={(e) => {
                            const value = e.target.value;
                            if (/^\d*$/.test(value)) setIngresArt(value);
                            }}
                            
                        />
                    </label>

                  <label className="block">
                        <p className="text-black mb-1">Proveedor</p>
                        <input
                        className="w-full p-2 rounded border focus:outline-none focus:ring-2 focus:ring-blue-500"
                        type="text"
                        required
                        value={nombreprov}
                        onChange={(e) => setNombreprov(e.target.value)}
                        />
                    </label>
                          
                 <label className="block mb-4">
                  <p className="text-black">Fac.</p>
                        <input
                            className="w-full border p-2 rounded mt-1"
                            type="text"
                            inputMode="numeric"
                            value={fac}
                            onChange={(e) => {
                            const value = e.target.value;
                            if (/^\d*$/.test(value)) setFac(value);
                            }}
                            
                        />
                    </label>

                   <label className="block mb-4">
                  <p className="text-black">Rto.</p>
                        <input
                            className="w-full border p-2 rounded mt-1"
                            type="text"
                            inputMode="numeric"
                            value={rto}
                            onChange={(e) => {
                            const value = e.target.value;
                            if (/^\d*$/.test(value)) setRto(value);
                            }}
                            
                        />
                    </label>

                  <label className="block">
                        <p className="text-black mb-1">Fecha recibido</p>
                        <input
                        className="w-full p-2 rounded border focus:outline-none focus:ring-2 focus:ring-blue-500"
                        type="date"
                        required
                        value={fecha_ent}
                        onChange={(e) => setFecha_ent(e.target.value)}
                        />
                    </label>

                      <label className="block">
                      <p className="text-black">Con observacion</p>
                    <select
                      className="w-full border p-2 rounded mt-1"
                      value={observacion}
                      onChange={(e) =>
                        setObservacion(e.target.value)
                      }
                    >
                      <option value="">Observado?</option>
                      <option value="si" className="bg-yellow-300 text-black">
                        Si
                      </option>
                      <option value="no" className="bg-green-400 text-white">
                        No
                      </option>
                      
                    </select>
                       
                    </label>

                    


                <div className="flex justify-end space-x-2 mt-6">
                <button
                    onClick={() => setIngresarArticulo(null)}
                    className="px-4 py-2 bg-gray-400 text-white rounded"
                >
                    Cancelar
                </button>
               <button
                onClick={async () => {
                    const cantExist = Number(ingresarArticulo.existencia ?? 0);
                    const cantIngreso = Number(ingresart ?? 0);

                    if (cantIngreso <= 0) {
                      alert("La cantidad a ingresar debe ser mayor a 0");
                      return;
                    }

                    if (nombreprov.trim() === "") {
                      alert("El campo Proveedor no puede estar vacío");
                      return;
                    }

                    if (fac.trim() === "") {
                      alert("El campo Factura (Fac.) no puede estar vacío");
                      return;
                    }

                    if (rto.trim() === "") {
                      alert("El campo Remito (Rto.) no puede estar vacío");
                      return;
                    }

                    if (fecha_ent.trim() === "") {
                      alert("Falta fecha de ingreso");
                      return;
                    }

                    if (observacion.trim() === "") {
                      alert("Fue observado si o no?");
                      return;
                    }

                   
                    const nuevaExistencia = cantExist + cantIngreso;

                    // 1. Actualizar existencia
                    const { error: updateError } = await supabase
                    .from("articulos")
                    .update({ existencia: nuevaExistencia })
                    .eq("id", ingresarArticulo.id);

                    if (updateError) {
                    alert("Error al actualizar el stock");
                    console.error(updateError);
                    return;
                    }

                    // 2. Insertar en ingarticulos
                    const { error: insertError } = await supabase.from("ingarticulos").insert({
                    codint: ingresarArticulo.codint,
                    articulo: ingresarArticulo.articulo,
                    descripcion: ingresarArticulo.descripcion,
                    ingresart: cantIngreso,
                    nombreprov,
                    rto,
                    fac,
                    fecha_ent,
                    observacion,

                    });

                    if (insertError) {
                    alert("Stock actualizado, pero error al guardar el ingreso.");
                    console.error(insertError);
                    } else {
                    alert("Ingreso registrado correctamente");
                    }

                    setIngresarArticulo(null);
                    setFormData({});
                    setNombreprov("");
                    setFac("");
                    setRto("");
                    setIngresArt("");
                    setFecha_ent("");
                    setObservacion("");

                    const { data } = await supabase.from("articulos").select("*");
                    if (data) setArticulos(data);
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded"
                >
                Guardar
                </button>

            </div>
          </div>
        </div>
      )} 
       {descontarArticulo && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
          <div className="bg-white p-6 rounded shadow-lg w-full max-w-md max-h-screen overflow-y-auto">
            <h2 className="text-black font-bold mb-4">Salida de articulo #{descontarArticulo.id}</h2>
            
             <div className="mb-6 grid grid-cols-2 gap-2 sm:grid-cols-2 md:grid-cols-2">
                <div>
                  <span className="block text-sm font-semibold text-gray-700">Código:</span>
                  <span className="text-black">{descontarArticulo.codint}</span>
                </div>
                <div>
                  <span className="block text-sm font-semibold text-gray-700">Artículo:</span>
                  <span className="text-black">{descontarArticulo.articulo}</span>
                </div>
                <div className="col-span-2">
                  <span className="block text-sm font-semibold text-gray-700">Descripción:</span>
                  <span className="text-black">{descontarArticulo.descripcion}</span>
                </div>
                <div>
                  <span className="block text-sm font-semibold text-gray-700">Stock actual:</span>
                  <span className="text-black">{descontarArticulo.existencia}</span>
                </div>
              </div>


              <div className="grid gap-4">
                    <label className="block">
                        <p className="text-black mb-1">Cant. a descontar</p>
                        <input
                        className="w-full p-2 rounded border focus:outline-none focus:ring-2 focus:ring-blue-500"
                        type="text"
                        inputMode="numeric"
                        value={descontart}
                        onChange={(e) => {
                            const value = e.target.value;
                            if (/^\d*$/.test(value)) setDescontArt(value);
                        }}
                        />
                    </label>

                    <label className="block">
                        <p className="text-black mb-1">Retira</p>
                        <input
                        className="w-full p-2 rounded border focus:outline-none focus:ring-2 focus:ring-blue-500"
                        type="text"
                        required
                        value={retira}
                        onChange={(e) => setRetira(e.target.value)}
                        />
                    </label>

                    <label className="block">
                        <p className="text-black mb-1">Sector</p>
                        <input
                        className="w-full p-2 rounded border focus:outline-none focus:ring-2 focus:ring-blue-500"
                        type="text"
                        required
                        value={sector}
                        onChange={(e) => setSector(e.target.value)}
                        />
                    </label>

                    <label className="block">
                        <p className="text-black mb-1">Obra</p>
                        <input
                        className="w-full p-2 rounded border focus:outline-none focus:ring-2 focus:ring-blue-500"
                        type="text"
                        required
                        value={obra}
                        onChange={(e) => setObra(e.target.value)}
                        />
                    </label>
                </div>
             

                <div className="flex justify-end space-x-2 mt-6">
                <button
                    onClick={() => setDescontarArticulo(null)}
                    className="px-4 py-2 bg-gray-400 text-white rounded"
                >
                    Cancelar
                </button>
               <button
                onClick={async () => {
                    const cantExist = Number(descontarArticulo.existencia ?? 0);
                    const cantEgreso = Number(descontart ?? 0);

                     if (cantEgreso <= 0) {
                    alert("La cantidad a descontar debe ser mayor a 0");
                    return;
                    }

                     if (cantEgreso > cantExist) {
                    alert("No hay suficiente stock para realizar el egreso");
                    return;
                    }

                     if (retira.trim() === "") {
                      alert("El campo Retira no puede estar vacío");
                      return;
                    }

                     if (sector.trim() === "") {
                      alert("El campo Sector no puede estar vacío");
                      return;
                    }

                    if (obra.trim() === "") {
                      alert("El campo Obra no puede estar vacío");
                      return;
                    }


                   

                    const nuevaExistencia = cantExist - cantEgreso;

                    // 1. Actualizar existencia
                    const { error: updateError } = await supabase
                    .from("articulos")
                    .update({ existencia: nuevaExistencia })
                    .eq("id", descontarArticulo.id);

                    if (updateError) {
                    alert("Error al actualizar el stock");
                    console.error(updateError);
                    return;
                    }

                    // 2. Insertar en egarticulos
                    const { error: insertError } = await supabase.from("egarticulos").insert({
                    codint: descontarArticulo.codint,
                    articulo: descontarArticulo.articulo,
                    descripcion: descontarArticulo.descripcion,
                    descontart: cantEgreso,
                    retira,
                    sector,
                    obra,
                    });

                    if (insertError) {
                    alert("Stock actualizado, pero error al guardar el egreso.");
                    console.error(insertError);
                    } else {
                    alert("Egreso registrado correctamente");
                    }

                    setDescontarArticulo(null);
                    setFormData({});
                    setRetira("");
                    setObra("");
                    setSector("");
                    setDescontArt("");

                    const { data } = await supabase.from("articulos").select("*");
                    if (data) setArticulos(data);
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