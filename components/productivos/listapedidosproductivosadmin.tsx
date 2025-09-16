"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

type ArticuloComparativa = {
  codint: string;
  cant: number;
  articulo: string;
  precioUnitario: number | null;
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
  rto: string | null;
  fac: string | null;
  
  
  articulos: {
    codint: string;
    articulo: string;
    descripcion: string;
    existencia: number;
    cant: number;
    provsug: string;
    observacion: string;
  }[];
};

export default function ListaPedidosProductivosAdmin() {

  interface Articulo {
    codint: string;
    articulo: string;
    descripcion: string;
    existencia: number;
    cant: number;
    provsug: string;
    observacion: string;
  }

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
    const [fechaImpresion, setFechaImpresion] = useState("");
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
   
   // Establecer fecha de impresión para evitar errores de hidratación
   useEffect(() => {
     setFechaImpresion(new Date().toLocaleDateString('es-AR') + ' a las ' + new Date().toLocaleTimeString('es-AR'));
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
   
       // Recalcular comparativa cuando se abre el modal de edición
    useEffect(() => {
      if (editingPedido && formData.articulos && formData.articulos.length > 0) {
        // Solo recalcular si no hay comparativa o si es la primera vez que se abre
        if (!comparativaForm) {
          // Crear estructura inicial
          const articulosBase = formData.articulos.map(a => ({
            codint: a.codint,
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
      const s = search.trim().toLowerCase(); // normalizar búsqueda
      if (!s) return true;

      // Verificar propiedades del pedido
      const matchPedidoPropiedades = Object.entries(pedido).some(([key, value]) => {
        if (value === null || value === undefined) return false;
        if (String(value).toLowerCase().includes(s)) return true;
        if (dateFields.includes(key as keyof Pedido)) {
          const isoDate = String(value).split("T")[0];
          const niceDate = formatDate(value as string);
          return (
            isoDate.toLowerCase().includes(s) ||
            niceDate.toLowerCase().includes(s)
          );
        }
        return false;
      });

      // Verificar en los artículos
      const matchArticulos = pedido.articulos?.some((art: Articulo) =>
        ['codint', 'articulo', 'descripcion', 'provsug'].some((campo) => {
          const val = art[campo as keyof Articulo];
          return val && String(val).toLowerCase().includes(s);
        })
      ) ?? false;

      return matchPedidoPropiedades || matchArticulos;
    })
  .filter((pedido) => {
    // tus condiciones de ocultar
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
        supervisor: formData.supervisor,
        controlado: formData.controlado,
        fecha_conf: formData.fecha_conf,
        fecha_prom: formData.fecha_prom,
        fecha_ent: formData.fecha_ent,
        fac: formData.fac,
        rto: formData.rto
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

  // ✅ Función para imprimir comparativa
  const imprimirComparativa = () => {
    if (!comparativaPedido) return;
    
    const ventanaImpresion = window.open('', '_blank');
    if (!ventanaImpresion) return;

    const contenidoHTML = `
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Comparativa de Proveedores - Pedido ${comparativaPedido.id}</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            margin: 10px;
            color: #333;
            font-size: 10px;
          }
          .header {
            text-align: center;
            border-bottom: 2px solid #2563eb;
            padding-bottom: 10px;
            margin-bottom: 15px;
          }
          .header h1 {
            color: #2563eb;
            margin: 0;
            font-size: 18px;
          }
          .header p {
            margin: 2px 0;
            color: #666;
            font-size: 10px;
          }
          .info-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 15px;
            margin-bottom: 15px;
          }
          .info-section {
            background: #f8fafc;
            padding: 10px;
            border-radius: 4px;
            border: 1px solid #e2e8f0;
          }
          .info-section h3 {
            color: #1e40af;
            margin: 0 0 8px 0;
            border-bottom: 1px solid #3b82f6;
            padding-bottom: 5px;
            font-size: 12px;
          }
          .info-item {
            margin: 5px 0;
            display: flex;
            justify-content: space-between;
            font-size: 9px;
          }
          .info-label {
            font-weight: bold;
            color: #374151;
          }
          .articulos-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 10px;
            margin-bottom: 15px;
          }
          .proveedor-card {
            background: white;
            border: 1px solid #e5e7eb;
            border-radius: 4px;
            padding: 10px;
            box-shadow: 0 1px 2px rgba(0,0,0,0.1);
          }
          .proveedor-header {
            background: #f3f4f6;
            padding: 8px;
            border-radius: 4px;
            margin-bottom: 10px;
            text-align: center;
            border: 1px solid #d1d5db;
          }
          .proveedor-nombre {
            font-size: 12px;
            font-weight: bold;
            color: #1f2937;
            margin: 0;
          }
          .tabla-articulos {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 10px;
          }
          .tabla-articulos th {
            background: #f9fafb;
            padding: 6px 4px;
            text-align: left;
            border-bottom: 1px solid #e5e7eb;
            font-weight: bold;
            color: #374151;
            font-size: 9px;
          }
          .tabla-articulos td {
            padding: 6px 4px;
            border-bottom: 1px solid #f3f4f6;
            color: #6b7280;
            font-size: 9px;
          }
          .tabla-articulos th:last-child,
          .tabla-articulos td:last-child {
            text-align: right;
          }
          .total-proveedor {
            background: #fef3c7;
            padding: 8px;
            border-radius: 4px;
            text-align: center;
            border: 1px solid #f59e0b;
            font-weight: bold;
            color: #92400e;
            font-size: 10px;
          }
          .fecha-impresion {
            text-align: center;
            margin-top: 15px;
            padding-top: 10px;
            border-top: 1px solid #e5e7eb;
            color: #6b7280;
            font-size: 8px;
          }
          .cotizaciones-titulo {
            color: #1e40af;
            text-align: center;
            margin: 20px 0 15px 0;
            border-bottom: 1px solid #3b82f6;
            padding-bottom: 8px;
            font-size: 14px;
          }
          @media print {
            body { margin: 0; }
            .header { border-bottom-color: #000; }
            .info-section { background: #fff; border-color: #000; }
            .proveedor-card { border-color: #000; box-shadow: none; }
            .proveedor-header { background: #fff; border-color: #000; }
            .tabla-articulos th { background: #fff; border-color: #000; }
            .total-proveedor { background: #fff; border-color: #000; color: #000; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>📊 Comparativa de Proveedores</h1>
          <p><strong>Pedido Productivo:</strong> ${comparativaPedido.id}</p>
          <p><strong>Fecha de Impresión:</strong> ${fechaImpresion.split(' a las ')[0]}</p>
        </div>

        <div class="info-grid">
          <div class="info-section">
            <h3>📋 Detalles del Pedido</h3>
            <div class="info-item">
              <span class="info-label">Fecha Necesidad:</span>
              <span>${formatDate(comparativaPedido.necesidad)}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Sector:</span>
              <span>${comparativaPedido.sector || '-'}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Solicitante:</span>
              <span>${comparativaPedido.solicita || '-'}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Aprueba:</span>
              <span>${comparativaPedido.aprueba || '-'}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Estado:</span>
              <span>${comparativaPedido.estado || '-'}</span>
            </div>
          </div>

          <div class="info-section">
            <h3>📦 Artículos Solicitados</h3>
            ${comparativaPedido.articulos && comparativaPedido.articulos.length > 0 
              ? comparativaPedido.articulos.map(art => `
                <div class="info-item">
                  <span class="info-label">${art.articulo}</span>
                  <span>Cant: ${art.cant}</span>
                </div>
                <div class="info-item" style="margin-left: 15px; margin-bottom: 8px;">
                  <span style="font-family: monospace; background: #f3f4f6; padding: 1px 4px; border-radius: 2px; font-size: 8px;">
                    Código: ${art.codint}
                  </span>
                </div>
              `).join('')
              : '<p>Sin artículos</p>'
            }
          </div>
        </div>

        <h2 class="cotizaciones-titulo">
          💰 Cotizaciones de Proveedores
        </h2>

        <div class="articulos-grid">
          ${comparativaPedido.comparativa_prov && comparativaPedido.comparativa_prov.length > 0
            ? comparativaPedido.comparativa_prov.map(prov => `
              <div class="proveedor-card">
                <div class="proveedor-header">
                  <h3 class="proveedor-nombre">${prov.nombreProveedor || 'Proveedor sin nombre'}</h3>
                </div>
                
                <table class="tabla-articulos">
                  <thead>
                    <tr>
                      <th>Artículo</th>
                      <th>Cant.</th>
                      <th>Precio Unit.</th>
                      <th>Subtotal</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${prov.articulos.map(art => `
                      <tr>
                        <td title="${art.articulo}">${art.articulo}</td>
                        <td>${art.cant}</td>
                        <td>$${(art.precioUnitario || 0).toFixed(0)}</td>
                        <td>$${(art.subtotal || 0).toFixed(0)}</td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
                
                <div class="total-proveedor">
                  Total: $${(prov.total || 0).toFixed(0)}
                </div>
              </div>
            `).join('')
            : '<p style="text-align: center; color: #6b7280; grid-column: 1 / -1;">No hay cotizaciones de proveedores</p>'
          }
        </div>

        <div class="fecha-impresion">
          Impreso el ${fechaImpresion}
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
          
          <h1 className="text-3xl font-bold text-gray-800">⚙️ Pedidos Productivos Admin</h1>
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
                <th className="px-4 py-3 border-b border-blue-500 text-sm font-bold whitespace-nowrap text-left bg-gradient-to-r from-blue-600 to-blue-700">Acciones</th>
                <th className="px-4 py-3 border-b border-blue-500 text-sm font-bold whitespace-nowrap text-center bg-gradient-to-r from-blue-600 to-blue-700">Estado</th>
                <th className="px-4 py-3 border-b border-blue-500 text-sm font-bold whitespace-nowrap text-center bg-gradient-to-r from-blue-600 to-blue-700">PIC</th>
                <th className="px-4 py-3 border-b border-blue-500 text-sm font-bold whitespace-nowrap text-center bg-gradient-to-r from-blue-600 to-blue-700">Fecha Sol</th>
                <th className="px-4 py-3 border-b border-blue-500 text-sm font-bold whitespace-nowrap text-center bg-gradient-to-r from-blue-600 to-blue-700">Fecha Nec</th>
                <th className="px-4 py-3 border-b border-blue-500 text-sm font-bold whitespace-nowrap text-center bg-gradient-to-r from-blue-600 to-blue-700">Categoría</th>
                <th className="px-4 py-3 border-b border-blue-500 text-sm font-bold whitespace-nowrap text-center bg-gradient-to-r from-blue-600 to-blue-700">Solicitante</th>
                <th className="px-4 py-3 border-b border-blue-500 text-sm font-bold whitespace-nowrap text-center bg-gradient-to-r from-blue-600 to-blue-700">Sector</th>
                <th className="px-4 py-3 border-b border-blue-500 text-sm font-bold whitespace-nowrap text-center bg-gradient-to-r from-blue-600 to-blue-700">Artículo Solicitado</th>
                <th className="px-4 py-3 border-b border-blue-500 text-sm font-bold whitespace-nowrap text-center bg-gradient-to-r from-blue-600 to-blue-700">Observ/Mensaje</th>
                <th className="px-4 py-3 border-b border-blue-500 text-sm font-bold whitespace-nowrap text-center bg-gradient-to-r from-blue-600 to-blue-700">Supervisado</th>
                <th className="px-4 py-3 border-b border-blue-500 text-sm font-bold whitespace-nowrap text-center bg-gradient-to-r from-blue-600 to-blue-700">Aprueba</th>
                <th className="px-4 py-3 border-b border-blue-500 text-sm font-bold whitespace-nowrap text-center bg-gradient-to-r from-blue-600 to-blue-700">OC</th>
                <th className="px-4 py-3 border-b border-blue-500 text-sm font-bold whitespace-nowrap text-center bg-gradient-to-r from-blue-600 to-blue-700">Prov. Selecc.</th>
                <th className="px-4 py-3 border-b border-blue-500 text-sm font-bold whitespace-nowrap text-center bg-gradient-to-r from-blue-600 to-blue-700">Confirmado</th>
                <th className="px-4 py-3 border-b border-blue-500 text-sm font-bold whitespace-nowrap text-center bg-gradient-to-r from-blue-600 to-blue-700">Promesa</th>
                <th className="px-4 py-3 border-b border-blue-500 text-sm font-bold whitespace-nowrap text-center bg-gradient-to-r from-blue-600 to-blue-700">Entrego</th>
                <th className="px-4 py-3 border-b border-blue-500 text-sm font-bold whitespace-nowrap text-center bg-gradient-to-r from-blue-600 to-blue-700">Fac</th>
                <th className="px-4 py-3 border-b border-blue-500 text-sm font-bold whitespace-nowrap text-center bg-gradient-to-r from-blue-600 to-blue-700">Rto</th>
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
                                     setEditingPedido(p);
                                     setFormData(p);

                                     // Inicializa el estado de la comparativa
                                     if (p.comparativa_prov && p.comparativa_prov.length > 0) {
                                       // Asegurar que todos los artículos tengan la propiedad 'cant'
                                       const comparativaConCant = p.comparativa_prov.map(prov => ({
                                         ...prov,
                                         articulos: prov.articulos.map(art => ({
                                           ...art,
                                           cant: art.cant || p.articulos.find(a => a.codint === art.codint)?.cant || 0
                                         }))
                                       }));
                                       setComparativaForm(comparativaConCant);
                                     } else {
                                       // Si no hay datos, crea una estructura inicial para 3 proveedores
                                       const articulosBase = p.articulos.map(a => ({
                                           codint: a.codint,
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
                                   }}
                >
                        ✏️ Editar
                </button>
                 <button
                        className="px-3 py-2 bg-green-500 text-white font-medium rounded-lg shadow-md hover:bg-green-600 transition-all duration-200 transform hover:scale-105 text-sm"
                      onClick={() => {
                          setComparativaPedido(p);
                          setFormData(p); // Carga los datos al `formData` para poder editar el estado y el proveedor
                      }}
                  >
                        📊 Comparativa
                  </button>
                <button
                        className="px-3 py-2 bg-red-500 text-white font-medium rounded-lg shadow-md hover:bg-red-600 transition-all duration-200 transform hover:scale-105 text-sm"
                    onClick={async () => {
                      const confirm = window.confirm(
                        `¿Estás seguro de que querés eliminar el pedido ${p.id}?`
                      );
                      if (!confirm) return;

                      const { error } = await supabase.from("pedidos_productivos").delete().eq("id", p.id);
                      if (error) {
                        alert("Error al eliminar");
                        console.error(error);
                      } else {
                        alert("Pedido eliminado");
                        const { data } = await supabase.from("pedidos_productivos").select("*");
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
                  <td className="px-4 py-3 border-b border-gray-200 align-top text-center">{formatDate(p.created_at)}</td>
                  <td className="px-4 py-3 border-b border-gray-200 align-top text-center">{formatDate(p.necesidad)}</td>
                  <td className="px-4 py-3 border-b border-gray-200 align-top text-center">{p.categoria}</td>
                  <td className="px-4 py-3 border-b border-gray-200 align-top text-center">{p.solicita}</td>
                  <td className="px-4 py-3 border-b border-gray-200 align-top text-center">{p.sector}</td>
                  <td className="px-4 py-3 border-b border-gray-200 align-top text-center">
                    {p.articulos && p.articulos.length > 0 ? (
                      <div className="space-y-2">
                        {p.articulos.map((art, index) => (
                          <div key={index} className="text-sm bg-gray-50 p-3 rounded-lg border border-gray-200">
                            <div className="font-medium text-gray-800">{art.articulo}</div>
                            <div className="text-gray-600 text-xs font-mono bg-gray-100 px-2 py-1 rounded">Código: {art.codint}</div>
                            <div className="text-gray-600">Cant: {art.cant}</div>
                            <div className="text-gray-600">Prov: {art.provsug || '-'}</div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <span className="text-gray-400 text-sm">- Sin artículos -</span>
                    )}
                </td>
                  <td className="px-4 py-3 border-b border-gray-200 align-top text-center">
                    <div className="max-w-xs">
                      <span className="text-sm text-gray-700">{renderValue(p.observ)}</span>
                </div>
                </td>
                  <td className="px-4 py-3 border-b border-gray-200 align-top text-center">
                    <div className="flex flex-col gap-1">
                      <span className="text-sm font-medium text-gray-700">{p.controlado}</span>
                      <span className="text-sm text-gray-600">{p.supervisor}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 border-b border-gray-200 align-top text-center text-orange-600 font-medium text-lg">{renderValue(p.aprueba)}</td>
                  <td className="px-4 py-3 border-b border-gray-200 align-top text-center text-orange-600 font-medium text-lg">{renderValue(p.numero_oc)}</td>
                  <td className="px-4 py-3 border-b border-gray-200 align-top text-center text-orange-600 font-medium text-lg">{renderValue(p.proveedor_seleccionado)}</td>
                  <td className="px-4 py-3 border-b border-gray-200 align-top text-center">{formatDate(p.fecha_conf)}</td>
                  <td className="px-4 py-3 border-b border-gray-200 align-top text-center">{formatDate(p.fecha_prom)}</td>
                  <td className="px-4 py-3 border-b border-gray-200 align-top text-center">{formatDate(p.fecha_ent)}</td>
                  <td className="px-4 py-3 border-b border-gray-200 align-top text-center">{renderValue(p.fac)}</td>
                  <td className="px-4 py-3 border-b border-gray-200 align-top text-center">{renderValue(p.rto)}</td>
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
              <h2 className="text-2xl font-bold">✏️ Editar Pedido Productivo #{formData.id}</h2>
              <p className="text-blue-100 mt-2">Modifica los datos del pedido productivo</p>
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
                           <div className="font-medium text-gray-800 text-sm">{art.articulo}</div>
                           <div className="text-gray-600 text-xs font-mono bg-gray-100 px-2 py-1 rounded mb-2">Código: {art.codint}</div>
                           <div className="text-gray-600 text-xs">Cant. sol: {art.cant}</div>
                           <div className="text-gray-600 text-xs">Stock: {art.existencia}</div>
                           <div className="text-gray-600 text-xs">Observ: {art.observacion}</div>
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
                        value={formData.supervisor || ""}
                        onChange={(e) => setFormData({ ...formData, supervisor: e.target.value })}
                      />
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
                        if (comparativaForm && formData.articulos && formData.articulos.length > 0) {
                          const nuevaComparativa = comparativaForm.map(prov => ({
                            ...prov,
                                                         articulos: prov.articulos.map(art => {
                               // Obtener la cantidad del artículo original del pedido
                               const articuloOriginal = formData.articulos!.find(a => a.codint === art.codint);
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
                            prov.total = prov.articulos.reduce((sum, art) => sum + (art.subtotal || 0), 0);
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
                        {comparativaForm?.map((prov, provIndex) => (
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
                                const newComparativa = [...comparativaForm];
                                newComparativa[provIndex].nombreProveedor = e.target.value;
                                setComparativaForm(newComparativa);
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
                                           const articuloOriginal = formData.articulos?.find(a => a.codint === art.codint);
                                           const cantidad = articuloOriginal?.cant || 0;
                                           
                                           newComparativa[provIndex].articulos[artIndex].precioUnitario = newPrecio;
                                           newComparativa[provIndex].articulos[artIndex].subtotal = newPrecio * cantidad;
                                           
                                           // Recalcular total del proveedor
                                           newComparativa[provIndex].total = newComparativa[provIndex].articulos.reduce(
                                             (sum, articulo) => sum + (articulo.subtotal || 0), 0
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
                       Observaciones:
                     </label>
                     <textarea
                       className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg bg-white text-gray-800 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                       rows={3}
                       placeholder="Agregar observaciones sobre el cambio de estado..."
                       value={formData.observ || ""}
                       onChange={(e) => setFormData({ ...formData, observ: e.target.value })}
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
                        value={formData.proveedor_seleccionado || ""}
                        onChange={(e) => setFormData({ ...formData, proveedor_seleccionado: e.target.value })}
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
                        value={formData.numero_oc || ""}
                        onChange={(e) => setFormData({ ...formData, numero_oc: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Número de Factura:
                      </label>
                      <input
                        type="text"
                        className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg bg-white text-gray-800 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                        placeholder="Número de factura"
                        value={formData.fac || ""}
                        onChange={(e) => setFormData({ ...formData, fac: e.target.value })}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Número de RTO:
                      </label>
                      <input
                        type="text"
                        className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg bg-white text-gray-800 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                        placeholder="Número de RTO"
                        value={formData.rto || ""}
                        onChange={(e) => setFormData({ ...formData, rto: e.target.value })}
                      />
                    </div>
                  </div>
               </div>

               {/* Sección de Fechas */}
               <div className="bg-white border border-gray-200 p-6 rounded-lg mb-6">
                 <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                   <span className="mr-2">📅</span>
                   Fechas del Pedido
                 </h3>
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                   <div>
                     <label className="block text-sm font-medium text-gray-700 mb-2">
                       Fecha de Confirmado:
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
                       Fecha de Ingreso:
                     </label>
                     <input
                       type="date"
                       className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg bg-white text-gray-800 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                       value={formData.fecha_ent || ""}
                       onChange={(e) => setFormData({ ...formData, fecha_ent: e.target.value })}
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

      {/* ✅ Modal de comparativa */}
{comparativaPedido && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl max-h-screen overflow-y-auto">
            <div className="bg-gradient-to-r from-green-600 to-green-700 text-white p-6 rounded-t-xl">
              <h2 className="text-2xl font-bold">📊 Comparativa de Proveedores #{comparativaPedido.id}</h2>
              <p className="text-green-100 mt-2">Vista de comparativa y edición de estado</p>
            </div>
            <div className="p-6">
              {/* Información del pedido */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="text-lg font-semibold text-gray-800 mb-3">📋 Detalles del Pedido</h3>
                  <div className="space-y-2 text-sm">
                    <p><span className="font-medium">Fecha necesidad:</span> {formatDate(comparativaPedido.necesidad)}</p>
                    <p><span className="font-medium">Sector:</span> {comparativaPedido.sector}</p>
                    <p><span className="font-medium">Solicitante:</span> {comparativaPedido.solicita}</p>
                    <p><span className="font-medium">Aprueba:</span> {comparativaPedido.aprueba}</p>
                  </div>
                </div>

                                 <div className="bg-gray-50 p-4 rounded-lg">
                   <h3 className="text-lg font-semibold text-gray-800 mb-3">📦 Artículos</h3>
                   {comparativaPedido.articulos && comparativaPedido.articulos.length > 0 ? (
                     <div className="space-y-2">
                       {comparativaPedido.articulos.map((art, index) => (
                         <div key={index} className="bg-white p-3 rounded border border-gray-200">
                           <div className="font-medium text-gray-800 text-sm">{art.articulo}</div>
                           <div className="text-gray-600 text-xs font-mono bg-gray-100 px-2 py-1 rounded mb-2">Código: {art.codint}</div>
                           <div className="text-gray-600 text-xs">Cant: {art.cant}</div>
                           <div className="text-gray-600 text-xs">Desc: {art.descripcion}</div>
                           <div className="text-gray-600 text-xs">Observ: {art.observacion || '-'}</div>
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
                     <div key={provIndex} className="bg-gray-50 border border-gray-200 p-4 rounded-lg shadow-sm min-w-0">
                                             <label className="block mb-3 text-sm font-medium text-gray-700">Proveedor:</label>
                                 <input
                                     type="text"
                         className="w-full px-3 py-2 border border-gray-300 rounded-lg mb-3 text-gray-800 font-semibold bg-white text-center text-sm break-words"
                                     value={prov.nombreProveedor}
                         readOnly
                                 />

                                             <table className="w-full text-gray-700 text-sm">
                                     <thead>
                           <tr className="border-b border-gray-200">
                             <th className="px-2 py-2 text-left font-medium w-2/5">Artículo</th>
                             <th className="px-2 py-2 text-center font-medium w-1/6">Cant.</th>
                             <th className="px-2 py-2 text-center font-medium w-1/6">Stock</th>
                             <th className="px-2 py-2 text-center font-medium w-1/6">Precio</th>
                             <th className="px-2 py-2 text-center font-medium w-1/6">Subtotal</th>
                                         </tr>
                                     </thead>
                                     <tbody>
                                         {prov.articulos.map((art, artIndex) => (
                             <tr key={artIndex} className="border-b border-gray-100">
                               <td className="px-2 py-2 text-sm break-words" title={art.articulo}>
                                 <div className="max-w-full">
                                   {art.articulo}
                                 </div>
                               </td>
                               <td className="px-2 py-2 text-center text-sm">{art.cant}</td>
                               <td className="px-2 py-2 text-center text-sm">
                                 {(() => {
                                   const articuloOriginal = comparativaPedido.articulos.find(a => a.codint === art.codint);
                                   return articuloOriginal?.existencia || 0;
                                 })()}
                               </td>
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
                  onClick={imprimirComparativa}
                  className="px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-all duration-200"
                >
                  🖨️ Imprimir
                </button>
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
