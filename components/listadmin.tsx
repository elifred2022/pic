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

  articulos: Array<{
    articulo: string;
    descripcion?: string;
    cant: number;
    cant_exist?: number;
    observacion?: string;
  }>; // Array de artículos
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

export default function ListAdmin() {
  const [search, setSearch] = useState("");
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [editingPedido, setEditingPedido] = useState<Pedido | null>(null);
  const [verInfo, setVerInfo] = useState<Pedido | null>(null);
  const [ocultarCumplidos, setOcultarCumplidos] = useState(false);
  const [ocultarAprobados, setOcultarAprobados] = useState(false);
  const [ocultarAnulados, setOcultarAnulados] = useState(false);
  const [ocultarStandBy, setOcultarStandBy] = useState(false);
  const [ocultarConfirmado, setOcultarConfirmado] = useState(false);

  const [formData, setFormData] = useState<Partial<Pedido>>({});
  const supabase = createClient();

  // función para formatear las fechas
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

        // A) Comparar contra la versión texto "tal cual viene"
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

  // Estilos para la tabla (comentados por ahora)
  // const headerClass = "px-2 py-1 border text-xs font-semibold bg-gray-100 whitespace-nowrap";
  // const cellClass = "px-2 py-1 border align-top text-sm text-justify whitespace-pre-wrap break-words";

  // ✅ Función para imprimir información del pedido
  const imprimirInfoPedido = () => {
    if (!verInfo) return;
    
    const ventanaImpresion = window.open('', '_blank');
    if (!ventanaImpresion) return;

    const contenidoHTML = `
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Pedido Interno de Compra - ${verInfo.id}</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            margin: 20px;
            color: #333;
          }
          .header {
            text-align: center;
            border-bottom: 3px solid #059669;
            padding-bottom: 20px;
            margin-bottom: 30px;
          }
          .header h1 {
            color: #059669;
            margin: 0;
            font-size: 28px;
          }
          .header p {
            margin: 5px 0;
            color: #666;
          }
          .info-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 30px;
            margin-bottom: 30px;
          }
          .info-section {
            background: #f8fafc;
            padding: 20px;
            border-radius: 8px;
            border: 1px solid #e2e8f0;
          }
          .info-section h3 {
            color: #047857;
            margin-top: 0;
            border-bottom: 2px solid #10b981;
            padding-bottom: 10px;
          }
          .info-item {
            margin: 10px 0;
            display: flex;
            justify-content: space-between;
            padding: 8px 0;
            border-bottom: 1px solid #e2e8f0;
          }
          .info-label {
            font-weight: bold;
            color: #374151;
          }
          .info-value {
            color: #1f2937;
          }
          .articulos-table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
            background: white;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
          }
          .articulos-table th {
            background: #f3f4f6;
            padding: 12px;
            text-align: left;
            font-weight: bold;
            color: #374151;
            border-bottom: 2px solid #e5e7eb;
          }
          .articulos-table td {
            padding: 12px;
            border-bottom: 1px solid #e5e7eb;
          }
          .articulos-table tr:hover {
            background: #f9fafb;
          }
          .footer {
            margin-top: 30px;
            padding-top: 20px;
            border-top: 2px solid #e5e7eb;
            text-align: center;
            color: #6b7280;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Pedido Interno de Compra</h1>
          <p><strong>ID:</strong> ${verInfo.id}</p>
          <p><strong>Fecha de Creación:</strong> ${formatDate(verInfo.created_at)}</p>
        </div>
        
        <div class="info-grid">
          <div class="info-section">
            <h3>Información del Pedido</h3>
            <div class="info-item">
              <span class="info-label">Necesidad:</span>
              <span class="info-value">${verInfo.necesidad || '-'}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Categoría:</span>
              <span class="info-value">${verInfo.categoria || '-'}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Solicitante:</span>
              <span class="info-value">${verInfo.solicita || '-'}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Sector:</span>
              <span class="info-value">${verInfo.sector || '-'}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Estado:</span>
              <span class="info-value">${verInfo.estado || '-'}</span>
            </div>
          </div>
          
          <div class="info-section">
            <h3>Detalles Financieros</h3>
            <div class="info-item">
              <span class="info-label">Orden de Compra:</span>
              <span class="info-value">${verInfo.oc || '-'}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Total USD:</span>
              <span class="info-value">$${verInfo.usd || 0}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Total EUR:</span>
              <span class="info-value">€${verInfo.eur || 0}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Total ARS:</span>
              <span class="info-value">$${verInfo.ars || 0}</span>
            </div>
          </div>
        </div>
        
        ${Array.isArray(verInfo.articulos) && verInfo.articulos.length > 0 ? `
        <div class="info-section">
          <h3>Artículos del Pedido</h3>
          <table class="articulos-table">
            <thead>
              <tr>
                <th>Artículo</th>
                <th>Descripción</th>
                <th>Cantidad</th>
                <th>Stock</th>
                <th>Observación</th>
              </tr>
            </thead>
            <tbody>
              ${verInfo.articulos.map((a) => `
                <tr>
                  <td>${a.articulo || '-'}</td>
                  <td>${a.descripcion || '-'}</td>
                  <td>${a.cant || 0}</td>
                  <td>${a.cant_exist || 0}</td>
                  <td>${a.observacion || '-'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
        ` : ''}
        
        <div class="footer">
          <p>Documento generado el ${new Date().toLocaleDateString('es-AR')} a las ${new Date().toLocaleTimeString('es-AR')}</p>
        </div>
      </body>
      </html>
    `;

    ventanaImpresion.document.write(contenidoHTML);
    ventanaImpresion.document.close();
    
    // Esperar a que se cargue el contenido antes de imprimir
    ventanaImpresion.onload = () => {
      ventanaImpresion.print();
      ventanaImpresion.close();
    };
  };

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
      const { data, error } = await supabase.from("pic").select("*")
  
      if (error) console.error("Error cargando pedidos:", error);
      else setPedidos(data);
    };

    fetchPedidos();
  }, [supabase]);

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
           
          <h1 className="text-3xl font-bold text-gray-800">Pedidos Generales</h1>
        </div>
      
        <div className="flex flex-wrap gap-4 items-center">
          <Link
            href="/auth/crear-formus"
            className="inline-block px-6 py-3 bg-green-600 text-white font-semibold rounded-lg shadow-md hover:bg-green-700 transition-all duration-200 transform hover:scale-105"
          >
            ➕ Crear nuevo pedido general
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
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h3 className="text-lg font-semibold text-gray-700 mb-4">Filtros de estado</h3>
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
                 <th className="px-4 py-3 border-b border-blue-500 text-sm font-bold whitespace-nowrap text-left bg-gradient-to-r from-blue-600 to-blue-700">Acciones</th>
                 <th className="px-4 py-3 border-b border-blue-500 text-sm font-bold whitespace-nowrap text-center bg-gradient-to-r from-blue-600 to-blue-700">Estado</th>
                 <th className="px-4 py-3 border-b border-blue-500 text-sm font-bold whitespace-nowrap text-center bg-gradient-to-r from-blue-600 to-blue-700">Nº PIC</th>
                 <th className="px-4 py-3 border-b border-blue-500 text-sm font-bold whitespace-nowrap text-center bg-gradient-to-r from-blue-600 to-blue-700">Fecha sol</th>
                 <th className="px-4 py-3 border-b border-blue-500 text-sm font-bold whitespace-nowrap text-center bg-gradient-to-r from-blue-600 to-blue-700">Fecha nec</th>
                 <th className="px-4 py-3 border-b border-blue-500 text-sm font-bold whitespace-nowrap text-center bg-gradient-to-r from-blue-600 to-blue-700">Categoria</th>
                 <th className="px-4 py-3 border-b border-blue-500 text-sm font-bold whitespace-nowrap text-center bg-gradient-to-r from-blue-600 to-blue-700">Solicita</th>
                 <th className="px-4 py-3 border-b border-blue-500 text-sm font-bold whitespace-nowrap text-center bg-gradient-to-r from-blue-600 to-blue-700">Sector</th>
                 <th className="px-4 py-3 border-b border-blue-500 text-sm font-bold whitespace-nowrap text-center bg-gradient-to-r from-blue-600 to-blue-700">Artículos Solicitados</th>

                  
                  <th className="px-4 py-3 border-b border-blue-500 text-sm font-bold whitespace-nowrap text-center bg-gradient-to-r from-blue-600 to-blue-700">Aprueba</th>
                 <th className="px-4 py-3 border-b border-blue-500 text-sm font-bold whitespace-nowrap text-center bg-gradient-to-r from-blue-600 to-blue-700">OC</th>
                 <th className="px-4 py-3 border-b border-blue-500 text-sm font-bold whitespace-nowrap text-center bg-gradient-to-r from-blue-600 to-blue-700">Proveedor Selec.</th>
                 <th className="px-4 py-3 border-b border-blue-500 text-sm font-bold whitespace-nowrap text-center bg-gradient-to-r from-blue-600 to-blue-700">USD</th>
                 <th className="px-4 py-3 border-b border-blue-500 text-sm font-bold whitespace-nowrap text-center bg-gradient-to-r from-blue-600 to-blue-700">EUR</th>
                 <th className="px-4 py-3 border-b border-blue-500 text-sm font-bold whitespace-nowrap text-center bg-gradient-to-r from-blue-600 to-blue-700">T.C</th>
                 <th className="px-4 py-3 border-b border-blue-500 text-sm font-bold whitespace-nowrap text-center bg-gradient-to-r from-blue-600 to-blue-700">ARS unit</th>
                 <th className="px-4 py-3 border-b border-blue-500 text-sm font-bold whitespace-nowrap text-center bg-gradient-to-r from-blue-600 to-blue-700">% Desc</th>
                 <th className="px-4 py-3 border-b border-blue-500 text-sm font-bold whitespace-nowrap text-center bg-gradient-to-r from-blue-600 to-blue-700">ARS Con desc</th>
                 <th className="px-4 py-3 border-b border-blue-500 text-sm font-bold whitespace-nowrap text-center bg-gradient-to-r from-blue-600 to-blue-700">Total sin imp</th>
                 <th className="px-4 py-3 border-b border-blue-500 text-sm font-bold whitespace-nowrap text-center bg-gradient-to-r from-blue-600 to-blue-700">Fecha confirm</th>
                 <th className="px-4 py-3 border-b border-blue-500 text-sm font-bold whitespace-nowrap text-center bg-gradient-to-r from-blue-600 to-blue-700">Fecha prometida</th>
                 <th className="px-4 py-3 border-b border-blue-500 text-sm font-bold whitespace-nowrap text-center bg-gradient-to-r from-blue-600 to-blue-700">Fecha entrega</th>
                 <th className="px-4 py-3 border-b border-blue-500 text-sm font-bold whitespace-nowrap text-center bg-gradient-to-r from-blue-600 to-blue-700">Rto</th>
                 <th className="px-4 py-3 border-b border-blue-500 text-sm font-bold whitespace-nowrap text-center bg-gradient-to-r from-blue-600 to-blue-700">Fact</th>
                 <th className="px-4 py-3 border-b border-blue-500 text-sm font-bold whitespace-nowrap text-center bg-gradient-to-r from-blue-600 to-blue-700">MOD pago</th>
                 <th className="px-4 py-3 border-b border-blue-500 text-sm font-bold whitespace-nowrap text-center bg-gradient-to-r from-blue-600 to-blue-700">Proceso</th>
          </tr>
        </thead>
          
        <tbody>
          {filteredPedidos.map((pedido) => (
            <tr key={pedido.id}>
              <td className="px-4 py-3 border-b border-gray-200 align-top">
                <div className="flex flex-col gap-2">
                   <button
                    className="px-3 py-2 bg-blue-500 text-white font-medium rounded-lg shadow-md hover:bg-blue-600 transition-all duration-200 transform hover:scale-105 text-xs"
                    onClick={() => {
                      setVerInfo(pedido);
                      setFormData({
                        created_at: pedido.created_at,
                        necesidad: pedido.necesidad,
                        categoria: pedido.categoria,
                        solicita: pedido.solicita,
                        sector: pedido.sector,
                        articulos: pedido.articulos,
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
                    📋 Info
                  </button>
                  <button
                    className="px-3 py-2 bg-green-500 text-white font-medium rounded-lg shadow-md hover:bg-green-600 transition-all duration-200 transform hover:scale-105 text-xs"
                    onClick={() => {
                      setEditingPedido(pedido);
                      setFormData({
                        created_at: pedido.created_at,
                        necesidad: pedido.necesidad,
                        categoria: pedido.categoria,
                        solicita: pedido.solicita,
                        sector: pedido.sector,
                        articulos: pedido.articulos,
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
                    ✏️ Edit
                  </button>

                  <button
                    className="px-3 py-2 bg-red-500 text-white font-medium rounded-lg shadow-md hover:bg-red-600 transition-all duration-200 transform hover:scale-105 text-xs"
                    onClick={async () => {
                      const confirm = window.confirm(
                        `¿Estás seguro de que querés eliminar el pedido ${pedido.id}?`
                      );
                      if (!confirm) return;

                      const { error } = await supabase.from("pic").delete().eq("id", pedido.id);
                      if (error) {
                        alert("Error al eliminar");
                        console.error(error);
                      } else {
                        alert("Pedido eliminado");
                        const { data } = await supabase.from("pic").select("*");
                        if (data) setPedidos(data);
                      }
                    }}
                  >
                    🗑️ Elim
                  </button>
                </div>
              </td>
             
                              <td className="px-4 py-3 border-b border-gray-200 align-top text-center">
                <span
                    className={
                    pedido.estado === "anulado"
                         ? "px-2 py-1 bg-red-100 text-red-800 text-xs font-semibold rounded-full"
                        : pedido.estado === "aprobado"
                         ? "px-2 py-1 bg-green-100 text-green-800 text-xs font-semibold rounded-full"
                        : pedido.estado === "cotizado"
                         ? "px-2 py-1 bg-yellow-100 text-yellow-800 text-xs font-semibold rounded-full"
                        : pedido.estado === "stand by"
                         ? "px-2 py-1 bg-orange-100 text-orange-800 text-xs font-semibold rounded-full"
                        : pedido.estado === "Visto/recibido"
                         ? "px-2 py-1 bg-orange-100 text-orange-800 text-xs font-semibold rounded-full"
                        : pedido.estado === "Presentar presencial"
                         ? "px-2 py-1 bg-orange-100 text-orange-800 text-xs font-semibold rounded-full"
                        : pedido.estado === "cumplido"
                         ? "px-2 py-1 bg-gray-100 text-gray-800 text-xs font-semibold rounded-full"
                         : pedido.estado === "confirmado" 
                         ? "px-2 py-1 bg-green-100 text-green-800 text-xs font-semibold rounded-full"
                         : "px-2 py-1 bg-gray-100 text-gray-600 text-xs font-medium rounded-full"
                    }
                >
                   {renderValue(pedido.estado)}
                </span>
            </td>
             <td className="px-4 py-3 border-b border-gray-200 align-top text-center">{pedido.id}</td>
              <td className="px-4 py-3 border-b border-gray-200 align-top text-center">{formatDate(pedido.created_at) || "-"}</td>
              <td className="px-4 py-3 border-b border-gray-200 align-top text-center">{formatDate(pedido.necesidad)}</td>
              <td className="px-4 py-3 border-b border-gray-200 align-top text-center">{pedido.categoria}</td>
              <td className="px-4 py-3 border-b border-gray-200 align-top text-center">{pedido.solicita}</td>
              <td className="px-4 py-3 border-b border-gray-200 align-top text-center">{pedido.sector}</td>
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
                        </tr>
                      </thead>
                      <tbody>
                        {pedido.articulos.map((a, idx: number) => (
                          <tr key={idx} className="border-b border-gray-100 last:border-b-0">
                            <td className="px-2 py-1 font-medium">{a.articulo}</td>
                             <td className="px-2 py-1 text-gray-700">
                               {a.descripcion && a.descripcion.length > 30 
                                 ? `${a.descripcion.substring(0, 30)}...` 
                                 : a.descripcion || "-"}
                             </td>
                             <td className="px-2 py-1 text-center font-semibold">{Number(a.cant) || 0}</td>
                             <td className="px-2 py-1 text-center">{Number(a.cant_exist) || 0}</td>
                             <td className="px-2 py-1 text-gray-600 max-w-20 break-words">
                               {a.observacion && a.observacion.length > 20 
                                 ? `${a.observacion.substring(0, 20)}...` 
                                 : a.observacion || "-"}
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

                
               
             
               <td className="px-4 py-3 border-b border-gray-200 align-top text-center">{renderValue(pedido.aprueba)}</td>
              <td className="px-4 py-3 border-b border-gray-200 align-top text-center text-orange-600 font-medium">{pedido.oc}</td>
              <td className="px-4 py-3 border-b border-gray-200 align-top text-center text-orange-600 font-medium">{renderValue(pedido.proveedor_selec)}</td>
              <td className="px-4 py-3 border-b border-gray-200 align-top text-center">{pedido.usd}</td>
              <td className="px-4 py-3 border-b border-gray-200 align-top text-center">{pedido.eur}</td>
              <td className="px-4 py-3 border-b border-gray-200 align-top text-center">{pedido.tc}</td>
              <td className="px-4 py-3 border-b border-gray-200 align-top text-center font-medium">$ {Number(pedido.ars).toLocaleString("es-AR")}</td>
              <td className="px-4 py-3 border-b border-gray-200 align-top text-center">{pedido.porcent}</td>
              <td className="px-4 py-3 border-b border-gray-200 align-top text-center">{pedido.ars_desc}</td>
              <td className="px-4 py-3 border-b border-gray-200 align-top text-center font-bold text-green-700">$ {Number(pedido.total_simp).toLocaleString("es-AR")}</td>
              <td className="px-4 py-3 border-b border-gray-200 align-top text-center">{formatDate(pedido.fecha_conf)}</td>
              <td className="px-4 py-3 border-b border-gray-200 align-top text-center">{formatDate(pedido.fecha_prom)}</td>
              <td className="px-4 py-3 border-b border-gray-200 align-top text-center">{formatDate(pedido.fecha_ent)}</td>
              <td className="px-4 py-3 border-b border-gray-200 align-top text-center">{pedido.rto}</td>
              <td className="px-4 py-3 border-b border-gray-200 align-top text-center">{pedido.fac}</td>
              <td className="px-4 py-3 border-b border-gray-200 align-top text-center">{pedido.mod_pago}</td>
              <td className="px-4 py-3 border-b border-gray-200 align-top text-center">{pedido.proceso}</td>
              
            
            </tr>
          ))}
        </tbody>
      </table>
        </div>
      </div>
      

      {/* MODAL */}
      {editingPedido && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-screen overflow-y-auto">
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6 rounded-t-xl">
              <h2 className="text-2xl font-bold">✏️ Editar Pedido #{editingPedido.id}</h2>
              <p className="text-blue-100 mt-2">Modifica los datos del pedido</p>
            </div>
            <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <label className="block">
                <p className="text-gray-700 font-medium mb-2">📅 Fecha Necesidad</p>
              <input
                type="date"
                value={formData.necesidad ?? ""}
                onChange={(e) =>
                  setFormData({ ...formData, necesidad: e.target.value })
                }
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 transition-all duration-200"
              />
            </label>

            <label className="block mb-4">
              <p className="text-black">Categoria</p>
              <input
                
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
                
                type="text"
                value={formData.sector ?? 0}
                onChange={(e) =>
                  setFormData({ ...formData, sector: e.target.value })
                }
              />
            </label>

             <label className="block mb-4">
             <p className="text-black">Descripcion</p>
              <input
                
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
                
                type="text"
                value={formData.prov_uno ?? 0}
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
                
                value={formData.estado ?? ""}
                onChange={(e) =>
                  setFormData({ ...formData, estado: e.target.value })
                }
              >
                <option value="">Seleccionar estado</option>
                 <option value="Visto/recibido" className="bg-yellow-300 text-black">
                  Visto/recibido
                </option>
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
            </div>
            
            <div className="flex justify-end space-x-4 mt-6 pt-6 border-t border-gray-200">
              <button
                onClick={() => setEditingPedido(null)}
                className="px-6 py-3 bg-gray-500 text-white font-medium rounded-lg hover:bg-gray-600 transition-all duration-200"
              >
                ❌ Cancelar
              </button>
             <button
                  onClick={async () => {
                    /* Normalizá los números que vas a usar */
                    const cantNum        = 0; // Campo eliminado
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
                      .from("pic")
                      .update(updateData)
                      .eq("id", editingPedido.id);

                    if (error) {
                      alert("Error actualizando");
                      console.error(error);
                    } else {
                      alert("Actualizado correctamente");
                      setEditingPedido(null);
                      setFormData({});
                      const { data } = await supabase.from("pic").select("*");
                      if (data) setPedidos(data);
                    }
                  }}
                  className="px-6 py-3 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition-all duration-200"
                >
                  💾 Guardar
                </button>
            </div>
            </div>
          </div>
        </div>
      )}
      {/* MODAL VER INFO */}
      {verInfo && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-screen overflow-y-auto">
            <div className="bg-gradient-to-r from-green-600 to-green-700 text-white p-6 rounded-t-xl">
              <h2 className="text-2xl font-bold">📋 Pedido interno de compra #{verInfo.id}</h2>
              <p className="text-green-100 mt-2">Información detallada del pedido</p>
            </div>
            <div className="p-6">
           <div className="flex-col gap-2">
                <span className="text-black font-semibold">Fecha necesidad: {verInfo.necesidad}</span>
                 <br/>
                <span className="text-black font-semibold">Sector: {verInfo.sector}</span>
                  <br/>
                <span className="text-black font-semibold">Solicita: {verInfo.solicita}</span>
                <br/>
                <span className="text-black font-semibold">Aprueba: {verInfo.aprueba}</span>
              </div>
              {/* Mostrar lista de artículos */}
              {Array.isArray(verInfo.articulos) && verInfo.articulos.length > 0 && (
                <div className="mt-4">
                  <h4 className="text-lg font-semibold text-gray-800 mb-3">📦 Artículos del Pedido</h4>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-200">
                          <th className="px-2 py-1 text-left text-gray-600 font-semibold">Artículo</th>
                          <th className="px-2 py-1 text-left text-gray-600 font-semibold">Descripción</th>
                          <th className="px-2 py-1 text-left text-gray-600 font-semibold">Cantidad</th>
                          <th className="px-2 py-1 text-left text-gray-600 font-semibold">Stock</th>
                          <th className="px-2 py-1 text-left text-gray-600 font-semibold">Observación</th>
                        </tr>
                      </thead>
                      <tbody>
                        {verInfo.articulos.map((a, idx: number) => (
                          <tr key={idx} className="border-b border-gray-100 last:border-b-0">
                            <td className="px-2 py-1 font-medium">{a.articulo}</td>
                            <td className="px-2 py-1 text-gray-700 max-w-xs">
                              <div className="break-words">
                                {a.descripcion || "-"}
                              </div>
                            </td>
                            <td className="px-2 py-1 text-center">{Number(a.cant) || 0}</td>
                            <td className="px-2 py-1 text-center">{Number(a.cant_exist) || 0}</td>
                            <td className="px-2 py-1 text-gray-600">{a.observacion || "-"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
                 <br/>
                  <div className="mb-4 flex gap-4">
                          <div className="flex-col gap-2">
                            <span className="text-black">Proveedor 1: </span>
                             <br/>
                            <span className="text-black"> {verInfo.prov_uno}</span>
                               <br/>
                            <span className="text-black">c/u ${Number(verInfo.cost_prov_uno).toLocaleString("es-AR")}</span>
                            <br/>
                            <span className="text-black">subt. ${Number(verInfo.subt_prov1).toLocaleString("es-AR")}</span>
                            
                          </div>
                          
                          <div>
                            <span className="text-black">Proveedor 2:</span>
                            <br/>
                            <span className="text-black">{verInfo.prov_dos}</span>
                               <br/>
                            <span className="text-black">c/u ${Number(verInfo.cost_prov_dos).toLocaleString("es-AR")}</span>
                            <br/>
                            <span className="text-black">subt. ${Number(verInfo.subt_prov2).toLocaleString("es-AR")}</span>
                          </div>

                          <div>
                             <span className="text-black">Proveedor 3:</span>
                            <br/>
                            <span className="text-black">{verInfo.prov_tres}</span>
                               <br/>
                            <span className="text-black">c/u ${Number(verInfo.cost_prov_tres).toLocaleString("es-AR")}</span>
                              <br/>
                            <span className="text-black">subt. ${Number(verInfo.subt_prov3).toLocaleString("es-AR")}</span>
                          </div>
                      
                     
                       </div>
                        <div className="flex justify-end space-x-4 mt-6 pt-6 border-t border-gray-200">
                        <button
                          onClick={imprimirInfoPedido}
                          className="px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-all duration-200"
                        >
                          🖨️ Imprimir
                        </button>
                        <button
                          onClick={() => setVerInfo(null)}
                          className="px-6 py-3 bg-gray-500 text-white font-medium rounded-lg hover:bg-gray-600 transition-all duration-200"
                        >
                          🔒 Cerrar
                        </button>
                        </div>
            </div>
          </div>
        </div>
        
      )}
    </div>
  );
}
