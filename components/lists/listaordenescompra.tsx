"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useRouter } from "next/navigation";

interface OrdenCompra {
  id: number;
  fecha_creacion?: string;
  fecha?: string;
  cuit: string;
  proveedor: string;
  direccion: string;
  telefono: string;
  estado: string;
  total: number;
  observaciones?: string;
  articulos?: Array<{
    articulo_id: string;
    articulo_nombre: string;
    cantidad: number;
    precio_unitario: number;
    total: number;
  }>;
}

export default function ListaOrdenesCompra() {
  const [ordenes, setOrdenes] = useState<OrdenCompra[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'ordenes' | 'otros'>('ordenes');
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    if (activeTab === 'ordenes') {
      fetchOrdenes();
    }
  }, [activeTab]);

  const fetchOrdenes = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("ordenes_compra")
        .select("*")
        .order("fecha_creacion", { ascending: false });

      if (error) throw error;
      console.log("🔍 Datos obtenidos:", data); // Debug para verificar que incluye artículos
      if (data && data.length > 0) {
        console.log("📋 Ejemplo de orden:", data[0]); // Debug estructura completa
        console.log("🎯 Artículos en primera orden:", data[0].articulos); // Debug específico artículos
      }
      setOrdenes(data || []);
    } catch (err) {
      console.error("Error fetching ordenes:", err);
      setError("Error al cargar las órdenes de compra");
    } finally {
      setLoading(false);
    }
  }, [supabase]);

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
      completada: { color: "bg-blue-100 text-blue-800", text: "Completada" }
    };
    
    const estadoInfo = estados[estado as keyof typeof estados] || estados.pendiente;
    return <Badge className={estadoInfo.color}>{estadoInfo.text}</Badge>;
  };

  const renderOrdenesTab = () => (
    <div className="w-full">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">📋 Órdenes de Compra</h1>
        <Button onClick={handleCrearOrden} className="bg-blue-600 hover:bg-blue-700">
          ➕ Crear Nueva Orden
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="text-lg">Cargando órdenes de compra...</div>
        </div>
      ) : error ? (
        <div className="flex justify-center items-center h-64">
          <div className="text-red-600 text-lg">{error}</div>
        </div>
      ) : ordenes.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-gray-500 text-lg">No hay órdenes de compra registradas</p>
            <Button onClick={handleCrearOrden} className="mt-4 bg-blue-600 hover:bg-blue-700">
              Crear la primera orden
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {ordenes.map((orden) => (
            <Card key={orden.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg">
                      Orden #{orden.id} - {orden.proveedor}
                    </CardTitle>
                    <p className="text-sm text-gray-600 mt-1">
                      CUIT: {orden.cuit} | Fecha: {new Date(orden.fecha_creacion || orden.fecha || '').toLocaleDateString('es-AR')}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    {getEstadoBadge(orden.estado)}
                    <span className="text-lg font-semibold text-green-600">
                      ${orden.total?.toLocaleString('es-AR') || '0'}
                    </span>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
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
                  <div>
                    <span className="font-medium text-gray-700">Artículos:</span>
                    <div className="text-gray-600">
                      {orden.articulos && orden.articulos.length > 0 ? (
                        <div className="space-y-1">
                          {orden.articulos.slice(0, 3).map((articulo, index) => (
                            <p key={index} className="text-xs">
                              • {articulo.articulo_nombre} (x{articulo.cantidad})
                            </p>
                          ))}
                          {orden.articulos.length > 3 && (
                            <p className="text-xs text-blue-600 font-medium">
                              +{orden.articulos.length - 3} más...
                            </p>
                          )}
                        </div>
                      ) : (
                        <div>
                          <p className="text-xs">Sin artículos</p>
                          <p className="text-xs text-red-500 mt-1">
                            Debug: {orden.articulos ? `Array vacío (${orden.articulos.length})` : 'Campo undefined'}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
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
      </div>
    </div>
  );

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

