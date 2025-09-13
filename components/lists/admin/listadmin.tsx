"use client";

import React, { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";

type ArticuloComparativa = {
  articulo: string;
  cant: number;
  precioUnitario: number | null;
  subtotal: number;
};

type ProveedorComparativa = {
  nombreProveedor: string;
  articulos: ArticuloComparativa[];
  total: number;
};

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
    link?: string;
  }>; // Array de artículos
  notas?: string;
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
  comparativa_prov?: ProveedorComparativa[] | null;
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
  const [comparativaForm, setComparativaForm] = useState<ProveedorComparativa[] | null>(null);
  const supabase = createClient();

  // ✅ Función para actualizar pedido
  const handleUpdatePedido = async () => {
    if (!editingPedido) return;
    
    // Preparar datos para actualizar, incluyendo la comparativa de proveedores
    const datosActualizar = {
      ...formData,
      comparativa_prov: comparativaForm ? comparativaForm.map(prov => ({
        nombreProveedor: prov.nombreProveedor,
        articulos: prov.articulos.map(art => ({
          articulo: art.articulo,
          cant: art.cant,
          precioUnitario: art.precioUnitario,
          subtotal: art.subtotal
        })),
        total: prov.total
      })) : null
    };
    
    const { error } = await supabase
      .from("pic")
      .update(datosActualizar)
      .eq("id", editingPedido.id);

    if (error) {
      alert("Error actualizando");
      console.error(error);
    } else {
      alert("Actualizado correctamente");
      setEditingPedido(null);
      setFormData({});
      setComparativaForm(null);
      const { data } = await supabase.from("pic").select("*");
      if (data) setPedidos(data);
    }
  };

  // Recalcular comparativa cuando se abre el modal de edición
  useEffect(() => {
    if (editingPedido && formData.articulos && formData.articulos.length > 0) {
      // Si ya existe comparativa en la base de datos, cargarla
      if (editingPedido.comparativa_prov && Array.isArray(editingPedido.comparativa_prov)) {
        setComparativaForm(editingPedido.comparativa_prov);
      } else if (!comparativaForm) {
        // Crear estructura inicial si no existe
        const articulosBase = formData.articulos.map(a => ({
          articulo: a.articulo,
          cant: a.cant,
          precioUnitario: null,
          subtotal: 0
        }));

        setComparativaForm([
          { nombreProveedor: '', articulos: JSON.parse(JSON.stringify(articulosBase)), total: 0 },
          { nombreProveedor: '', articulos: JSON.parse(JSON.stringify(articulosBase)), total: 0 },
          { nombreProveedor: '', articulos: JSON.parse(JSON.stringify(articulosBase)), total: 0 }
        ]);
      }
    }
  }, [editingPedido, formData.articulos, comparativaForm]);

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

  //Filtro que también contempla las fechas y busca dentro del array de artículos
  const filteredPedidos = pedidos
    .filter((pedido) => {
      const s = search.trim().toLowerCase();   // la búsqueda, ya normalizada
      if (!s) return true;                     // si el input está vacío, no filtra nada

      // Buscar en campos directos del pedido
      const foundInDirectFields = Object.entries(pedido).some(([key, value]) => {
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

      // Si ya encontró en campos directos, retornar true
      if (foundInDirectFields) return true;

      // Buscar dentro del array de artículos
      if (Array.isArray(pedido.articulos)) {
        const foundInArticles = pedido.articulos.some((articulo) => {
          return Object.values(articulo).some((value) => {
            if (value === null || value === undefined) return false;
            return String(value).toLowerCase().includes(s);
          });
        });
        return foundInArticles;
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
            margin: 10px;
            color: #333;
            font-size: 10px;
          }
          .header {
            text-align: center;
            border-bottom: 2px solid #059669;
            padding-bottom: 10px;
            margin-bottom: 15px;
          }
          .header h1 {
            color: #059669;
            margin: 0;
            font-size: 18px;
          }
          .header p {
            margin: 2px 0;
            color: #666;
            font-size: 10px;
          }
          .info-section {
            background: #f8fafc;
            padding: 10px;
            border-radius: 4px;
            border: 1px solid #e2e8f0;
            margin-bottom: 10px;
          }
          .info-section h3 {
            color: #047857;
            margin: 0 0 8px 0;
            border-bottom: 1px solid #10b981;
            padding-bottom: 5px;
            font-size: 12px;
          }
          .presupuestos-grid {
            display: grid;
            grid-template-columns: 1fr 1fr 1fr;
            gap: 10px;
            margin: 10px 0;
          }
          .presupuesto-card {
            background: #f0f9ff;
            border: 1px solid #0ea5e9;
            border-radius: 4px;
            padding: 8px;
            text-align: center;
          }
          .presupuesto-card h4 {
            color: #0369a1;
            margin: 0 0 5px 0;
            font-size: 10px;
          }
          .presupuesto-valor {
            font-size: 12px;
            font-weight: bold;
            color: #1e40af;
          }
          .articulos-table {
            width: 100%;
            border-collapse: collapse;
            margin: 10px 0;
            background: white;
            border-radius: 4px;
            overflow: hidden;
            box-shadow: 0 1px 2px rgba(0,0,0,0.1);
          }
          .articulos-table th {
            background: #f3f4f6;
            padding: 6px;
            text-align: left;
            font-weight: bold;
            color: #374151;
            border-bottom: 1px solid #e5e7eb;
            font-size: 9px;
          }
          .articulos-table td {
            padding: 6px;
            border-bottom: 1px solid #e5e7eb;
            font-size: 9px;
          }
          .articulos-table tr:hover {
            background: #f9fafb;
          }
          .footer {
            margin-top: 15px;
            padding-top: 10px;
            border-top: 1px solid #e5e7eb;
            text-align: center;
            color: #6b7280;
            font-size: 8px;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Pedido Interno de Compra</h1>
          <p><strong>Número de Pedido:</strong> ${verInfo.id}</p>
          <p><strong>Fecha de Creación:</strong> ${formatDate(verInfo.created_at)}</p>
        </div>
        
        <!-- Información del Pedido -->
        <div class="info-section">
          <h3>Información del Pedido</h3>
          <table class="articulos-table">
            <thead>
              <tr>
                <th>Campo</th>
                <th>Valor</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>Necesidad</strong></td>
                <td>${verInfo.necesidad || '-'}</td>
              </tr>
              <tr>
                <td><strong>Categoría</strong></td>
                <td>${verInfo.categoria || '-'}</td>
              </tr>
              <tr>
                <td><strong>Solicitante</strong></td>
                <td>${verInfo.solicita || '-'}</td>
              </tr>
              <tr>
                <td><strong>Sector</strong></td>
                <td>${verInfo.sector || '-'}</td>
              </tr>
              <tr>
                <td><strong>Estado</strong></td>
                <td>${verInfo.estado || '-'}</td>
              </tr>
              <tr>
                <td><strong>Aprobador</strong></td>
                <td>${verInfo.aprueba || '-'}</td>
              </tr>
              <tr>
                <td><strong>Orden de Compra</strong></td>
                <td>${verInfo.oc || '-'}</td>
              </tr>
              <tr>
                <td><strong>Total USD</strong></td>
                <td>$${verInfo.usd || 0}</td>
              </tr>
              <tr>
                <td><strong>Total EUR</strong></td>
                <td>€${verInfo.eur || 0}</td>
              </tr>
              <tr>
                <td><strong>Total ARS</strong></td>
                <td>$${verInfo.ars || 0}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Artículos del Pedido -->
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

        <!-- Sección de Presupuestos -->
        <div class="info-section">
          <h3>Presupuestos por Moneda</h3>
          <div class="presupuestos-grid">
            <div class="presupuesto-card">
              <h4>Presupuesto USD</h4>
              <div class="presupuesto-valor">$${verInfo.usd || 0}</div>
            </div>
            <div class="presupuesto-card">
              <h4>Presupuesto EUR</h4>
              <div class="presupuesto-valor">€${verInfo.eur || 0}</div>
            </div>
            <div class="presupuesto-card">
              <h4>Presupuesto ARS</h4>
              <div class="presupuesto-valor">$${verInfo.ars || 0}</div>
            </div>
          </div>
        </div>

        <!-- Comparativa de Proveedores -->
        ${verInfo.comparativa_prov && Array.isArray(verInfo.comparativa_prov) && verInfo.comparativa_prov.length > 0 ? `
        <div class="info-section">
          <h3>Comparativa de Proveedores</h3>
          <div class="presupuestos-grid">
            ${verInfo.comparativa_prov.map((prov, provIndex) => `
              <div class="presupuesto-card">
                <h4>${prov.nombreProveedor || 'Proveedor ' + (provIndex + 1)}</h4>
                ${prov.articulos && prov.articulos.length > 0 ? `
                  <div style="margin: 5px 0; font-size: 8px;">
                    ${prov.articulos.map(art => `
                      <div style="margin: 2px 0; padding: 2px; background: #f8fafc; border-radius: 2px;">
                        <strong>${art.articulo}</strong><br>
                        <span>Precio: $${(art.precioUnitario || 0).toLocaleString('es-AR')}</span><br>
                        <span>Subtotal: $${(art.subtotal || 0).toLocaleString('es-AR')}</span>
                      </div>
                    `).join('')}
                  </div>
                ` : ''}
                <div class="presupuesto-valor" style="margin-top: 5px;">
                  Total: $${(prov.total || 0).toLocaleString('es-AR')}
                </div>
              </div>
            `).join('')}
          </div>
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
                 <th className="px-4 py-3 border-b border-blue-500 text-sm font-bold whitespace-nowrap text-center bg-gradient-to-r from-blue-600 to-blue-700">Supervisado/Revisado</th>
                 <th className="px-4 py-3 border-b border-blue-500 text-sm font-bold whitespace-nowrap text-center bg-gradient-to-r from-blue-600 to-blue-700">Notas</th>
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
                        notas: pedido.notas,
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
                        notas: pedido.notas,
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
                          <th className="px-2 py-1 text-left text-gray-600 font-semibold">Link Ref</th>
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

                 <td className="px-4 py-3 border-b border-gray-200 align-top text-center">
                    <div className="flex flex-col gap-1">
                      <span className="text-sm font-medium text-gray-700">{renderValue(pedido.controlado)}</span>
                      <span className="text-sm text-gray-600">{pedido.superviso}</span>
                    </div>
                  </td>
               
                  <td className="px-4 py-3 border-b border-gray-200 align-top text-center text-red-600 text-xs max-w-32 break-words">{renderValue(pedido.notas)}</td>
              <td className="px-4 py-3 border-b border-gray-200 align-top text-center"> {renderValue(pedido.aprueba)}</td>
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
      

      {/* ✅ Modal de edición */}
      {editingPedido && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-screen overflow-y-auto">
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6 rounded-t-xl">
              <h2 className="text-2xl font-bold">✏️ Editar Pedido General #{editingPedido.id}</h2>
              <p className="text-blue-100 mt-2">Modifica los datos del pedido general</p>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center">
                    <span className="mr-2">🏭</span>
                    Información del Pedido
                  </h3>
                  <p className="text-gray-700 mb-2"><span className="font-medium">Sector:</span> {formData.sector}</p>
                  <p className="text-gray-700 mb-2"><span className="font-medium">Categoría:</span> {formData.categoria}</p>
                  <p className="text-gray-700 mb-2"><span className="font-medium">Solicitante:</span> {formData.solicita}</p>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center">
                    <span className="mr-2">📦</span>
                    Artículos Solicitados
                  </h3>
                  {formData.articulos && formData.articulos.length > 0 ? (
                    <div className="space-y-3">
                      {formData.articulos.map((art, index) => (
                        <div key={index} className="bg-white p-3 rounded border border-gray-200">
                          <div className="font-medium text-gray-800 text-sm mb-2">{art.articulo}</div>
                          <div className="grid grid-cols-2 gap-2 mb-2">
                            <div className="text-gray-600 text-xs">Cant. sol: {art.cant}</div>
                            <div className="text-gray-600 text-xs">Stock: {art.cant_exist}</div>
                          </div>
                          <div className="mb-2">
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              Descripción:
                            </label>
                            <input
                              type="text"
                              className="w-full px-2 py-1 border border-gray-300 rounded text-xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-200"
                              value={art.descripcion || ""}
                              onChange={(e) => {
                                const newArticulos = [...(formData.articulos || [])];
                                newArticulos[index] = { ...newArticulos[index], descripcion: e.target.value };
                                setFormData({ ...formData, articulos: newArticulos });
                              }}
                              placeholder="Descripción del artículo"
                            />
                          </div>
                          <div className="mb-2">
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              Observación:
                            </label>
                            <textarea
                              className="w-full px-2 py-1 border border-gray-300 rounded text-xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-200"
                              rows={2}
                              value={art.observacion || ""}
                              onChange={(e) => {
                                const newArticulos = [...(formData.articulos || [])];
                                newArticulos[index] = { ...newArticulos[index], observacion: e.target.value };
                                setFormData({ ...formData, articulos: newArticulos });
                              }}
                              placeholder="Observaciones del artículo"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              Link de Referencia:
                            </label>
                            <input
                              type="url"
                              className="w-full px-2 py-1 border border-gray-300 rounded text-xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-200"
                              value={art.link || ""}
                              onChange={(e) => {
                                const newArticulos = [...(formData.articulos || [])];
                                newArticulos[index] = { ...newArticulos[index], link: e.target.value };
                                setFormData({ ...formData, articulos: newArticulos });
                              }}
                              placeholder="https://ejemplo.com"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-sm">- Sin artículos -</p>
                  )}
                </div>
              </div>

                {/* Campos de edición del supervisor */}
                <div className="bg-white border border-gray-200 p-6 rounded-lg mb-6">
                      <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                        <span className="mr-2">⚙️</span>
                        Control del Supervisor
                      </h3>

                      <div>
                     <label className="block text-sm font-medium text-gray-700 mb-2">
                       Estado Actual: <span className="font-bold text-blue-600">{formData.controlado || 'No definido'}</span>
                     </label>
                     <select
                       className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg bg-white text-gray-800 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                       value={formData.controlado || ""}
                       onChange={(e) => setFormData({ ...formData, controlado: e.target.value })}
                     >
                       <option value="">Seleccionar controlado</option>
                       <option value="autoriza">🟢 Autoriza</option>
                       <option value="no autoriza">🔴 No autoriza</option>
                       <option value="stand by">🟠 Stand By</option>
                     </select>
                   </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Supervisor:
                      </label>
                      <input
                        className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg bg-white text-gray-800 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                        value={formData.superviso || ""}
                        onChange={(e) => setFormData({ ...formData, superviso: e.target.value })}
                      />
                    </div>
                    </div>

              {/* Campos de edición del estado */}
              <div className="bg-white border border-gray-200 p-6 rounded-lg mb-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                  <span className="mr-2">⚙️</span>
                  Cambiar Estado del Pedido
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Estado Actual: <span className="font-bold text-blue-600">{formData.estado || 'No definido'}</span>
                    </label>
                    <select
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg bg-white text-gray-800 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                      value={formData.estado || ""}
                      onChange={(e) => setFormData({ ...formData, estado: e.target.value })}
                    >
                      <option value="">Seleccionar nuevo estado</option>
                      <option value="iniciado">🟡 Iniciado</option>
                      <option value="visto/recibido">🟠 Visto/Recibido</option>
                      <option value="cotizado">🟡 Cotizado</option>
                      <option value="aprobado">🟢 Aprobado</option>
                      <option value="confirmado">🟢 Confirmado</option>
                      <option value="confirmado">🟢 Entrego parcial</option>
                      <option value="cumplido">⚪ Cumplido</option>
                      <option value="stand by">🟠 Stand By</option>
                      <option value="anulado">🔴 Anulado</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Agrar notas:
                    </label>
                    <textarea
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg bg-white text-gray-800 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                      rows={3}
                      placeholder="Agregar observaciones sobre el cambio de estado..."
                      value={formData.notas || ""}
                      onChange={(e) => setFormData({ ...formData, notas: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Proveedor Seleccionado:
                    </label>
                    <input
                      type="text"
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg bg-white text-gray-800 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                      placeholder="Nombre del proveedor seleccionado"
                      value={formData.proveedor_selec || ""}
                      onChange={(e) => setFormData({ ...formData, proveedor_selec: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Número de OC:
                    </label>
                    <input
                      type="text"
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg bg-white text-gray-800 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                      placeholder="Número de orden de compra"
                      value={formData.oc || ""}
                      onChange={(e) => setFormData({ ...formData, oc: Number(e.target.value) })}
                    />
                  </div>
                </div>
              </div>

              {/* Sección de Comparativa de Proveedores */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-800 flex items-center">
                    <span className="mr-2">📊</span>
                    Comparativa de Proveedores
                  </h3>
                  <button
                    onClick={() => {
                      if (formData.articulos && formData.articulos.length > 0 && comparativaForm) {
                        // Recalcular totales de proveedores
                        const nuevaComparativa = comparativaForm.map(prov => ({
                          ...prov,
                          articulos: prov.articulos.map(art => {
                            // Obtener la cantidad del artículo original del pedido
                            const articuloOriginal = formData.articulos!.find(a => a.articulo === art.articulo);
                            const cantidad = articuloOriginal?.cant || 0;
                            const subtotal = (art.precioUnitario ? art.precioUnitario * cantidad : 0);
                            
                            return {
                              ...art,
                              cant: cantidad, // Asegurar que tenga la cantidad correcta
                              subtotal: subtotal
                            };
                          }),
                          total: 0 // Se recalculará abajo
                        }));
                        
                        // Recalcular totales de proveedores
                        nuevaComparativa.forEach(prov => {
                          prov.total = prov.articulos.reduce((sum: number, art: ArticuloComparativa) => sum + (art.subtotal || 0), 0);
                        });
                        
                        setComparativaForm(nuevaComparativa);
                      }
                    }}
                    className="px-4 py-2 bg-blue-500 text-white text-sm rounded-lg hover:bg-blue-600 transition-colors"
                  >
                    🔄 Recalcular Totales
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {comparativaForm && comparativaForm.map((prov, provIndex) => (
                    <div key={provIndex} className="bg-white border border-gray-200 p-4 rounded-lg shadow-sm">
                      <label className="block mb-3 text-sm font-medium text-gray-700">
                        Proveedor {provIndex + 1}:
                      </label>
                      <input
                        type="text"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg mb-3 text-gray-800 bg-white focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                        placeholder="Nombre del proveedor"
                        value={prov.nombreProveedor}
                        onChange={(e) => {
                          if (comparativaForm) {
                            const newComparativa = [...comparativaForm];
                            newComparativa[provIndex].nombreProveedor = e.target.value;
                            setComparativaForm(newComparativa);
                          }
                        }}
                      />

                      <table className="w-full text-gray-700 text-sm">
                        <thead>
                          <tr className="border-b border-gray-200">
                            <th className="px-2 py-2 text-left font-medium">Artículo</th>
                            <th className="px-2 py-2 text-right font-medium">Precio Unit.</th>
                            <th className="px-2 py-2 text-right font-medium">Subtotal</th>
                          </tr>
                        </thead>
                        <tbody>
                          {prov.articulos.map((art, artIndex) => (
                            <tr key={artIndex} className="border-b border-gray-100">
                              <td className="px-2 py-2 text-sm">{art.articulo}</td>
                              <td className="px-2 py-2 text-right">
                                <input
                                  type="number"
                                  className="w-20 px-2 py-1 border border-gray-300 rounded text-right text-sm"
                                  value={art.precioUnitario || ''}
                                  onChange={(e) => {
                                    if (!comparativaForm) return;
                                    
                                    const newComparativa = [...comparativaForm];
                                    const newPrecio = parseFloat(e.target.value) || 0;
                                    
                                    // Obtener la cantidad del artículo original del pedido
                                    const articuloOriginal = formData.articulos?.find(a => a.articulo === art.articulo);
                                    const cantidad = articuloOriginal?.cant || 0;
                                    
                                    newComparativa[provIndex].articulos[artIndex].precioUnitario = newPrecio;
                                    newComparativa[provIndex].articulos[artIndex].subtotal = newPrecio * cantidad;
                                    
                                    // Recalcular total del proveedor
                                    newComparativa[provIndex].total = newComparativa[provIndex].articulos.reduce(
                                      (sum: number, articulo: ArticuloComparativa) => sum + (articulo.subtotal || 0), 0
                                    );

                                    setComparativaForm(newComparativa);
                                  }}
                                />
                              </td>
                              <td className="px-2 py-2 text-right text-sm font-medium">
                                ${(art.subtotal || 0).toFixed(0)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      <div className="mt-3 text-center font-bold text-gray-800 bg-gray-100 p-2 rounded border text-sm">
                        Total: ${(prov.total || 0).toFixed(0)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Campos adicionales para pedidos generales */}
              <div className="bg-white border border-gray-200 p-6 rounded-lg mb-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                  <span className="mr-2">💰</span>
                  Información Financiera
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Total USD:
                    </label>
                    <input
                      type="number"
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg bg-white text-gray-800 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                      placeholder="0.00"
                      value={formData.usd || ""}
                      onChange={(e) => setFormData({ ...formData, usd: Number(e.target.value) })}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Total EUR:
                    </label>
                    <input
                      type="number"
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg bg-white text-gray-800 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                      placeholder="0.00"
                      value={formData.eur || ""}
                      onChange={(e) => setFormData({ ...formData, eur: Number(e.target.value) })}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Total ARS:
                    </label>
                    <input
                      type="number"
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg bg-white text-gray-800 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                      placeholder="0.00"
                      value={formData.ars || ""}
                      onChange={(e) => setFormData({ ...formData, ars: Number(e.target.value) })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Fecha Confirmación:
                    </label>
                    <input
                      type="date"
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg bg-white text-gray-800 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                      value={formData.fecha_conf || ""}
                      onChange={(e) => setFormData({ ...formData, fecha_conf: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Fecha Prometida:
                    </label>
                    <input
                      type="date"
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg bg-white text-gray-800 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                      value={formData.fecha_prom || ""}
                      onChange={(e) => setFormData({ ...formData, fecha_prom: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Fecha de Entrega:
                    </label>
                    <input
                      type="date"
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg bg-white text-gray-800 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                      value={formData.fecha_ent || ""}
                      onChange={(e) => setFormData({ ...formData, fecha_ent: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Número de Factura:
                    </label>
                    <input
                      type="number"
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg bg-white text-gray-800 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                      placeholder="Número de factura"
                      value={formData.fac || ""}
                      onChange={(e) => setFormData({ ...formData, fac: parseFloat(e.target.value) || 0 })}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Número de RTO:
                    </label>
                    <input
                      type="number"
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg bg-white text-gray-800 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                      placeholder="Número de RTO"
                      value={formData.rto || ""}
                      onChange={(e) => setFormData({ ...formData, rto: parseFloat(e.target.value) || 0 })}
                    />
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
                          <th className="px-2 py-1 text-left text-gray-600 font-semibold">Link Web</th>
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
                  </div>
                </div>
              )}
                 <br/>
                 
                 {/* Comparativa de Proveedores */}
                 {verInfo.comparativa_prov && Array.isArray(verInfo.comparativa_prov) && verInfo.comparativa_prov.length > 0 && (
                   <div className="mb-6">
                     <h4 className="text-lg font-semibold text-gray-800 mb-4">📊 Comparativa de Proveedores</h4>
                     <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                       {verInfo.comparativa_prov.map((prov, provIndex) => (
                         <div key={provIndex} className="bg-gray-50 border border-gray-200 p-4 rounded-lg">
                           <h5 className="font-semibold text-gray-800 mb-3 text-center">
                             {prov.nombreProveedor || `Proveedor ${provIndex + 1}`}
                           </h5>
                           
                           {prov.articulos && prov.articulos.length > 0 && (
                             <table className="w-full text-sm">
                               <thead>
                                 <tr className="border-b border-gray-200">
                                   <th className="px-2 py-1 text-left text-gray-600 font-medium">Artículo</th>
                                   <th className="px-2 py-1 text-right text-gray-600 font-medium">Precio Unit.</th>
                                   <th className="px-2 py-1 text-right text-gray-600 font-medium">Subtotal</th>
                                 </tr>
                               </thead>
                               <tbody>
                                 {prov.articulos.map((art, artIndex) => (
                                   <tr key={artIndex} className="border-b border-gray-100 last:border-b-0">
                                     <td className="px-2 py-1 text-sm font-medium">{art.articulo}</td>
                                     <td className="px-2 py-1 text-right text-gray-700">
                                       ${(art.precioUnitario || 0).toLocaleString("es-AR")}
                                     </td>
                                     <td className="px-2 py-1 text-right font-medium text-gray-800">
                                       ${(art.subtotal || 0).toLocaleString("es-AR")}
                                     </td>
                                   </tr>
                                 ))}
                               </tbody>
                             </table>
                           )}
                           
                           <div className="mt-3 text-center font-bold text-gray-800 bg-white p-2 rounded border">
                             Total: ${(prov.total || 0).toLocaleString("es-AR")}
                           </div>
                         </div>
                       ))}
                     </div>
                   </div>
                 )}
                 
                 {/* Mostrar proveedores antiguos si no hay comparativa nueva */}
                 {(!verInfo.comparativa_prov || !Array.isArray(verInfo.comparativa_prov) || verInfo.comparativa_prov.length === 0) && (
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
                 )}
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
