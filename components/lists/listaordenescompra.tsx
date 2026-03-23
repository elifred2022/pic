"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRouter } from "next/navigation";
import * as XLSX from "xlsx";

interface OrdenCompra {
  id: number;
  noc: number;
  fecha: string;
  cuit: string;
  proveedor: string;
  direccion: string;
  telefono: string;
  articulos: Array<{
    articulo_id: string;
    articulo_nombre: string;
    cantidad: number;
    precio_unitario: number;
    descuento: number;
    costunitcdesc: number;
    total: number;
  }>;
  estado: string;
  total: number;
  divisa?: string;
  importe_competencia?: number | null;
  ahorro?: number | null;
  observaciones?: string;
  condicion_pago?: string;
  condi_proceso?: string;
  tipo_pago?: string;
  cod_cta?: string;
  sector?: string;
  created_at?: string;
} 

export default function ListaOrdenesCompra() {
  const [ordenes, setOrdenes] = useState<OrdenCompra[]>([]);
  const [ordenesFiltradas, setOrdenesFiltradas] = useState<OrdenCompra[]>([]);
  const [filtroBusqueda, setFiltroBusqueda] = useState("");
  const [fechaDesde, setFechaDesde] = useState("");
  const [fechaHasta, setFechaHasta] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'ordenes' | 'otros'>('ordenes');
  
  // Estados para filtros de checkbox
  const [ocultarCumplidos, setOcultarCumplidos] = useState(false);
  const [ocultarPendientes, setOcultarPendientes] = useState(false);
  const [ocultarEntregoParcial, setOcultarEntregoParcial] = useState(false);
  const [hasMounted, setHasMounted] = useState(false);
  const [exportando, setExportando] = useState(false);
  
  const router = useRouter();
  const supabase = createClient();

  // Para que no desactive checkbox al reset página - Al montar, leé localStorage
  useEffect(() => {
    setHasMounted(true);
    
    const savedCumplidos = localStorage.getItem("ocultarCumplidosOrdenes");
    const savedPendientes = localStorage.getItem("ocultarPendientesOrdenes");
    const savedEntregoParcial = localStorage.getItem("ocultarEntregoParcialOrdenes");

    if (savedCumplidos !== null) setOcultarCumplidos(savedCumplidos === "true");
    if (savedPendientes !== null) setOcultarPendientes(savedPendientes === "true");
    if (savedEntregoParcial !== null) setOcultarEntregoParcial(savedEntregoParcial === "true");
  }, []);

  // Cada vez que cambia, actualizá localStorage
  useEffect(() => {
    if (hasMounted) {
      localStorage.setItem("ocultarCumplidosOrdenes", String(ocultarCumplidos));
    }
  }, [ocultarCumplidos, hasMounted]);

  useEffect(() => {
    if (hasMounted) {
      localStorage.setItem("ocultarPendientesOrdenes", String(ocultarPendientes));
    }
  }, [ocultarPendientes, hasMounted]);

  useEffect(() => {
    if (hasMounted) {
      localStorage.setItem("ocultarEntregoParcialOrdenes", String(ocultarEntregoParcial));
    }
  }, [ocultarEntregoParcial, hasMounted]);

  const fetchOrdenes = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("ordenes_compra")
        .select("*")
        .order("fecha", { ascending: false });

      if (error) throw error;
      setOrdenes(data || []);
    } catch (err) {
      console.error("Error fetching ordenes:", err);
      setError("Error al cargar las órdenes de compra");
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  // Función para filtrar órdenes por número, palabra, fecha y checkboxes
  const filtrarOrdenes = useCallback(() => {
    let ordenesFiltradas = [...ordenes];
    
    // Debug: mostrar estados y filtros
    console.log('Estados de las órdenes:', ordenes.map(o => o.estado));
    console.log('Filtros activos:', { ocultarCumplidos, ocultarPendientes, ocultarEntregoParcial });
    
    // Aplicar filtros de checkbox primero
    ordenesFiltradas = ordenesFiltradas.filter(orden => {
      console.log(`Evaluando orden ${orden.noc} con estado: "${orden.estado}"`);
      
      if (ocultarCumplidos && orden.estado === 'cumplida') {
        console.log('Ocultando cumplida');
        return false;
      }
      if (ocultarPendientes && orden.estado === 'pendiente') {
        console.log('Ocultando pendiente');
        return false;
      }
      if (ocultarEntregoParcial && orden.estado === 'entrego_parcial') {
        console.log('Ocultando entregó parcial');
        return false;
      }
      return true;
    });
    
    // Aplicar filtro por rango de fechas (desde - hasta)
    if (fechaDesde || fechaHasta) {
      ordenesFiltradas = ordenesFiltradas.filter(orden => {
        if (!orden.fecha) return false;
        const fechaOrden = new Date(orden.fecha);
        fechaOrden.setHours(0, 0, 0, 0);
        if (fechaDesde) {
          const desde = new Date(fechaDesde);
          desde.setHours(0, 0, 0, 0);
          if (fechaOrden < desde) return false;
        }
        if (fechaHasta) {
          const hasta = new Date(fechaHasta);
          hasta.setHours(23, 59, 59, 999);
          if (fechaOrden > hasta) return false;
        }
        return true;
      });
    }
    
    // Si no hay filtro de búsqueda, devolver las órdenes filtradas por checkbox y fecha
    if (!filtroBusqueda.trim()) {
      setOrdenesFiltradas(ordenesFiltradas);
      return;
    }

    const terminoBusqueda = filtroBusqueda.toLowerCase().trim();
    
    // Debug: mostrar estados disponibles
    if (terminoBusqueda === 'debug') {
      console.log('Estados disponibles:', ordenesFiltradas.map(o => o.estado));
      return;
    }
    
    // Aplicar filtro de búsqueda sobre las órdenes ya filtradas por checkbox
    ordenesFiltradas = ordenesFiltradas.filter(orden => {
      // Buscar por número de orden (NOC)
      if (orden.noc.toString().includes(terminoBusqueda)) {
        return true;
      }
      
      // Buscar por CUIT (convertir a string)
      if (orden.cuit.toString().includes(terminoBusqueda)) {
        return true;
      }
      
      // Buscar por nombre del proveedor
      if (orden.proveedor && orden.proveedor.toLowerCase().includes(terminoBusqueda)) {
        return true;
      }
      
      // Buscar por dirección
      if (orden.direccion && orden.direccion.toLowerCase().includes(terminoBusqueda)) {
        return true;
      }
      
      // Buscar por teléfono (convertir a string)
      if (orden.telefono && orden.telefono.toString().includes(terminoBusqueda)) {
        return true;
      }
      
      // Buscar por estado
      if (orden.estado) {
        const estadoLower = orden.estado.toLowerCase().trim();
        
        // Búsqueda directa en el estado
        if (estadoLower.includes(terminoBusqueda)) {
          return true;
        }
        
        // Búsqueda con mapeo de términos comunes
        const estadoMap: { [key: string]: string[] } = {
          'pendiente': ['pendiente', 'pending', 'p', 'pen'],
          'aprobada': ['aprobada', 'approved', 'a', 'apr'],
          'rechazada': ['rechazada', 'rejected', 'r', 'rech'],
          'cumplida': ['cumplida', 'completed', 'c', 'comp'],
          'entrego_parcial': ['entrego_parcial', 'entrego parcial', 'parcial', 'ep']
        };
        
        // Buscar si el término de búsqueda coincide con algún alias del estado actual
        for (const [estadoKey, terminos] of Object.entries(estadoMap)) {
          if (estadoLower === estadoKey) {
            if (terminos.some(termino => termino.includes(terminoBusqueda))) {
              return true;
            }
          }
        }
      }
      
      // Buscar por observaciones
      if (orden.observaciones && orden.observaciones.toLowerCase().includes(terminoBusqueda)) {
        return true;
      }
      
      // Buscar por fecha (formato DD/MM/YYYY o YYYY-MM-DD)
      if (orden.fecha) {
        const fechaFormateada = new Date(orden.fecha).toLocaleDateString('es-AR');
        if (fechaFormateada.includes(terminoBusqueda)) {
          return true;
        }
      }
      
      // Buscar por total
      if (orden.total && orden.total.toString().includes(terminoBusqueda)) {
        return true;
      }
      
      // Buscar en artículos de la orden
      if (orden.articulos && orden.articulos.some(articulo => 
        articulo.articulo_nombre && articulo.articulo_nombre.toLowerCase().includes(terminoBusqueda)
      )) {
        return true;
      }
      
      return false;
    });
    
    setOrdenesFiltradas(ordenesFiltradas);
  }, [filtroBusqueda, fechaDesde, fechaHasta, ordenes, ocultarCumplidos, ocultarPendientes, ocultarEntregoParcial]);

  useEffect(() => {
    if (activeTab === 'ordenes') {
      fetchOrdenes();
    }
  }, [activeTab, fetchOrdenes]);

  // Efecto para filtrar órdenes cuando cambia el filtro de búsqueda o los checkboxes
  useEffect(() => {
    filtrarOrdenes();
  }, [filtrarOrdenes]);

  const handleCrearOrden = () => {
    router.push("/auth/ordenes-compra/crear-orden");
  };

  const handleVerOrden = (id: number) => {
    router.push(`/auth/ordenes-compra/ver-orden/${id}`);
  };

  const handleEliminarOrden = async (id: number) => {
    if (!confirm("¿Estás seguro de que quieres eliminar esta orden de compra? Esta acción no se puede deshacer.")) {
      return;
    }

    try {
      setLoading(true);
      const { error } = await supabase
        .from("ordenes_compra")
        .delete()
        .eq("id", id);

      if (error) throw error;

      // Recargar la lista después de eliminar
      await fetchOrdenes();
    } catch (err) {
      console.error("Error eliminando orden:", err);
      setError("Error al eliminar la orden de compra");
    } finally {
      setLoading(false);
    }
  };

  const getEstadoBadge = (estado: string) => {
    const estados = {
      pendiente: { color: "bg-yellow-100 text-yellow-800", text: "Pendiente" },
      aprobada: { color: "bg-green-100 text-green-800", text: "Aprobada" },
      rechazada: { color: "bg-red-100 text-red-800", text: "Rechazada" },
      cumplida: { color: "bg-blue-100 text-blue-800", text: "Cumplida" },
      entrego_parcial: { color: "bg-orange-100 text-orange-800", text: "Entregó Parcial" }
    };
    
    const estadoInfo = estados[estado as keyof typeof estados] || estados.pendiente;
    return <Badge className={estadoInfo.color}>{estadoInfo.text}</Badge>;
  };

  const extractPIC = (articulos?: Array<{ articulo_id: string }>) => {
    if (!articulos?.length) return "-";
    const pics = new Set<string>();
    articulos.forEach((a) => {
      const id = a.articulo_id || "";
      if (id.startsWith("productivo-") || id.startsWith("general-")) {
        const match = id.match(/^(productivo|general)-(\d+)/);
        if (match) pics.add(`${match[1]}-${match[2]}`);
      } else if (id.startsWith("sin-pic-")) pics.add("Sin PIC");
    });
    return pics.size > 0 ? [...pics].join(", ") : "-";
  };

  const descargarExcel = useCallback(() => {
    try {
      setExportando(true);
      const ordenadasPorNoc = [...ordenesFiltradas].sort((a, b) => {
        const nocA = Number(a.noc) || 0;
        const nocB = Number(b.noc) || 0;
        return nocA - nocB;
      });
      const rows = ordenadasPorNoc.map((o) => ({
        estado: o.estado ?? "",
        noc: o.noc ?? "",
        pic: extractPIC(o.articulos),
        sector: o.sector ?? "",
        fecha: o.fecha
          ? new Date(o.fecha).toLocaleDateString("es-AR")
          : o.created_at
            ? new Date(o.created_at).toLocaleDateString("es-AR")
            : "",
        proveedor: o.proveedor ?? "",
        total: o.total ?? 0,
        condi_proceso: o.condi_proceso ?? "",
        cod_cta: o.cod_cta ?? "",
        importe_competencia: o.importe_competencia ?? "",
        ahorro: o.ahorro ?? "",
        tipo_pago: o.tipo_pago ?? "",
        divisa: o.divisa ?? "USD",
      }));
      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Órdenes de Compra");
      XLSX.writeFile(wb, `ordenes-compra-${new Date().toISOString().slice(0, 10)}.xlsx`);
    } catch (err) {
      console.error("Error al exportar Excel:", err);
    } finally {
      setExportando(false);
    }
  }, [ordenesFiltradas]);

  // Función para extraer solo el número del ID
  const extractIdNumber = (articuloId: string) => {
    // Si el ID tiene formato "productivo-123-articulo" o "general-456-articulo"
    // extraer solo el número del medio
    const match = articuloId.match(/(?:productivo|general)-(\d+)-/);
    if (match) {
      return match[1];
    }
    // Si no coincide con el patrón, devolver el ID original
    return articuloId;
  };

  const renderOrdenesTab = () => (
    <div className="w-full">
      <div className="flex justify-between items-center mb-6 flex-wrap gap-4">
        <h1 className="text-3xl font-bold text-gray-900">📋 Órdenes de Compra</h1>
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={() => router.push("/auth/rutaproductivos/lista-pedidosproductivosadmin")}
            variant="outline"
            className="border-orange-500 text-orange-600 hover:bg-orange-50"
          >
            🏭 Pedidos Productivos
          </Button>
          <Button
            onClick={() => router.push("/auth/list-adminpedidosgenerales")}
            variant="outline"
            className="border-purple-500 text-purple-600 hover:bg-purple-50"
          >
            📋 Pedidos Generales
          </Button>
          <Button
            onClick={descargarExcel}
            disabled={exportando || ordenesFiltradas.length === 0}
            variant="outline"
            className="border-green-500 text-green-700 hover:bg-green-50"
          >
            {exportando ? "⏳ Exportando..." : "📥 Descargar Excel"}
          </Button>
          <Button onClick={handleCrearOrden} className="bg-blue-600 hover:bg-blue-700">
            ➕ Crear Nueva Orden
          </Button>
        </div>
      </div>

      {/* Campo de búsqueda y filtro por fecha */}
      <div className="mb-6">
        <div className="flex flex-wrap gap-4 items-end">
          <div className="flex-1 min-w-[200px]">
            <Label htmlFor="filtro-busqueda" className="text-sm text-gray-600">
              🔍 Buscar por NOC, palabra o fecha
            </Label>
            <Input
              id="filtro-busqueda"
              type="text"
              value={filtroBusqueda}
              onChange={(e) => setFiltroBusqueda(e.target.value)}
              placeholder="Buscar por NOC, proveedor, CUIT, fecha, estado, artículos..."
              className="w-full"
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="fecha-desde" className="text-sm text-gray-600">Desde</Label>
            <Input
              id="fecha-desde"
              type="date"
              value={fechaDesde}
              onChange={(e) => setFechaDesde(e.target.value)}
              className="w-40"
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="fecha-hasta" className="text-sm text-gray-600">Hasta</Label>
            <Input
              id="fecha-hasta"
              type="date"
              value={fechaHasta}
              onChange={(e) => setFechaHasta(e.target.value)}
              className="w-40"
            />
          </div>
          {(fechaDesde || fechaHasta) && (
            <Button
              variant="outline"
              onClick={() => { setFechaDesde(""); setFechaHasta(""); }}
              className="border-gray-300 shrink-0"
            >
              Limpiar fechas
            </Button>
          )}
        </div>
        {(filtroBusqueda || fechaDesde || fechaHasta) && (
          <p className="text-sm text-gray-500 mt-1">
            Mostrando {ordenesFiltradas.length} de {ordenes.length} órdenes
          </p>
        )}
      </div>

      {/* Filtros de estado con checkboxes */}
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
            <span className="text-gray-700 font-medium">Ocultar cumplidas</span>
          </label>

          <label className="flex items-center gap-3 cursor-pointer hover:bg-gray-50 p-2 rounded-lg transition-colors duration-200">
            <input
              type="checkbox"
              checked={ocultarPendientes}
              onChange={() => setOcultarPendientes((v) => !v)}
              className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
            />
            <span className="text-gray-700 font-medium">Ocultar pendientes</span>
          </label>

          <label className="flex items-center gap-3 cursor-pointer hover:bg-gray-50 p-2 rounded-lg transition-colors duration-200">
            <input
              type="checkbox"
              checked={ocultarEntregoParcial}
              onChange={() => setOcultarEntregoParcial((v) => !v)}
              className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
            />
            <span className="text-gray-700 font-medium">Ocultar entregó parcial</span>
          </label>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="text-lg">Cargando órdenes de compra...</div>
        </div>
      ) : error ? (
        <div className="flex justify-center items-center h-64">
          <div className="text-red-600 text-lg">{error}</div>
        </div>
      ) : ordenesFiltradas.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-gray-500 text-lg">
              {filtroBusqueda 
                ? `No se encontraron órdenes que coincidan con "${filtroBusqueda}"`
                : "No hay órdenes de compra registradas"
              }
            </p>
            {!filtroBusqueda && (
              <Button onClick={handleCrearOrden} className="mt-4 bg-blue-600 hover:bg-blue-700">
                Crear la primera orden
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {ordenesFiltradas.map((orden) => (
            <Card key={orden.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg">
                      Orden #{orden.noc} - {orden.proveedor} 
                    </CardTitle>
                    <p className="text-sm text-gray-600 mt-1">
                      CUIT: {orden.cuit} | Fecha: {new Date(orden.fecha).toLocaleDateString('es-AR')}
                      <span className="ml-2">| {orden.divisa || 'USD'} ${orden.total?.toLocaleString('es-AR')}</span>
                      {orden.importe_competencia != null && orden.importe_competencia > 0 && (
                        <span className="ml-2">
                          | Imp. competencia: ${Number(orden.importe_competencia).toLocaleString('es-AR')}
                          {orden.ahorro != null && (
                            <> | Ahorro: <span className={(orden.ahorro ?? 0) >= 0 ? "text-green-600 font-semibold" : "text-red-600"}>
                              ${Number(orden.ahorro).toLocaleString('es-AR')}
                            </span></>
                          )}
                        </span>
                      )}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    {getEstadoBadge(orden.estado)}
                   
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm mb-4">
                  <div>
                    <span className="font-medium text-gray-700">Dirección:</span>
                    <p className="text-gray-600">{orden.direccion}</p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Teléfono:</span>
                    <p className="text-gray-600">{orden.telefono}</p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Observaciones:</span>
                    <p className="text-gray-600">{orden.observaciones || "Sin observaciones"}</p>
                  </div>
                </div>

                {/* Artículos de la Orden */}
                {orden.articulos && orden.articulos.length > 0 && (
                  <div className="mb-4">
                    <h4 className="text-sm font-semibold text-gray-700 mb-2">📦 Artículos de la Orden:</h4>
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {orden.articulos.map((item, index) => (
                        <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg text-sm">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs text-gray-500 bg-gray-200 px-2 py-1 rounded">
                                ID: {extractIdNumber(item.articulo_id)}
                              </span>
                            </div>
                            <h5 className="font-medium text-gray-800">{item.articulo_nombre}</h5>
                          </div>
                          <div className="flex items-center gap-4 text-right">
                            <div>
                              <p className="text-xs text-gray-600">Cant.</p>
                              <p className="font-medium">{item.cantidad}</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-600">Precio</p>
                              <p className="font-medium">${item.precio_unitario?.toLocaleString('es-AR')}</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-600">% Desc</p>
                              <p className="font-medium">{item.descuento}%</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-600">Precio c/ desc.</p>
                              <p className="font-medium">${item.costunitcdesc?.toLocaleString('es-AR')}</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-600">Total</p>
                              <p className="font-semibold text-green-600">${item.total?.toLocaleString('es-AR')}</p>
                            </div>  
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex justify-end mt-4 gap-2">
                  <Button 
                    onClick={() => handleVerOrden(orden.id)}
                    variant="outline"
                    className="border-blue-500 text-blue-600 hover:bg-blue-50"
                  >
                    👁️ Ver Detalles
                  </Button>
                  <Button 
                    onClick={() => handleEliminarOrden(orden.id)}
                    variant="outline"
                    className="border-red-500 text-red-600 hover:bg-red-50"
                    disabled={loading}
                  >
                    {loading ? "⏳..." : "🗑️ Eliminar"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );

  const renderOtrosTab = () => (
    <div className="w-full">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">🔧 Otros Módulos</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => router.push("/auth/lista-articulos")}>
          <CardContent className="p-6 text-center">
            <div className="text-4xl mb-4">📦</div>
            <h3 className="text-lg font-semibold">Artículos</h3>
            <p className="text-gray-600 text-sm">Gestionar inventario</p>
          </CardContent>
        </Card>
        
        <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => router.push("/auth/listaproveedores")}>
          <CardContent className="p-6 text-center">
            <div className="text-4xl mb-4">🏢</div>
            <h3 className="text-lg font-semibold">Proveedores</h3>
            <p className="text-gray-600 text-sm">Gestionar proveedores</p>
          </CardContent>
        </Card>
        
        <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => router.push("/auth/rutaproductivos/lista-pedidosproductivos")}>
          <CardContent className="p-6 text-center">
            <div className="text-4xl mb-4">📋</div>
            <h3 className="text-lg font-semibold">Pedidos Productivos</h3>
            <p className="text-gray-600 text-sm">Gestionar pedidos</p>
          </CardContent>
        </Card>
        
        <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => router.push("/auth/articulos-ordenes-compra")}>
          <CardContent className="p-6 text-center">
            <div className="text-4xl mb-4">📦</div>
            <h3 className="text-lg font-semibold">Artículos de Órdenes</h3>
            <p className="text-gray-600 text-sm">Ver artículos de órdenes de compra</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  // Mientras no esté montado, no renderizar nada
  if (!hasMounted) return null;

  return (
    <div className="w-full max-w-7xl mx-auto p-6">
      {/* Botón de Home */}
      <div className="mb-6">
        <Button 
          onClick={() => router.push("/protected")}
          variant="outline"
          className="border-gray-300 text-gray-700 hover:bg-gray-50"
        >
          🏠 Volver al Inicio
        </Button>
      </div>
      
      {/* Tabs de Navegación */}
      <div className="flex space-x-1 mb-6 bg-gray-100 p-1 rounded-lg">
        <button
          onClick={() => setActiveTab('ordenes')}
          className={`flex-1 py-2 px-4 rounded-md font-medium transition-colors ${
            activeTab === 'ordenes'
              ? 'bg-white text-blue-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          📋 Órdenes de Compra
        </button>
        <button
          onClick={() => setActiveTab('otros')}
          className={`flex-1 py-2 px-4 rounded-md font-medium transition-colors ${
            activeTab === 'otros'
              ? 'bg-white text-blue-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          🔧 Otros Módulos
        </button>
      </div>

      {/* Contenido de los Tabs */}
      {activeTab === 'ordenes' ? renderOrdenesTab() : renderOtrosTab()}
    </div>
  );
}

