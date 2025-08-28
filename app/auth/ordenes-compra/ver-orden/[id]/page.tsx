"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface OrdenCompra {
  id: number;
  fecha_creacion: string;
  cuit_proveedor: string;
  nombre_proveedor: string;
  direccion_proveedor: string;
  telefono_proveedor: string;
  email_proveedor: string;
  estado: string;
  total: number;
  observaciones?: string;
  items: any[];
}

export default function VerOrdenCompraPage() {
  const [orden, setOrden] = useState<OrdenCompra | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const params = useParams();
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    if (params.id) {
      fetchOrden(Number(params.id));
    }
  }, [params.id]);

  const fetchOrden = async (id: number) => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("ordenes_compra")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;
      setOrden(data);
    } catch (err) {
      console.error("Error fetching orden:", err);
      setError("Error al cargar la orden de compra");
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

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-lg">Cargando orden de compra...</div>
      </div>
    );
  }

  if (error || !orden) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-red-600 text-lg">{error || "Orden no encontrada"}</div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-6xl mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">
          📋 Orden de Compra #{orden.id}
        </h1>
        <Button
          onClick={() => router.push("/auth/ordenes-compra")}
          variant="outline"
        >
          🔙 Volver a la Lista
        </Button>
      </div>

      <div className="grid gap-6">
        {/* Información Principal */}
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Información General</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <p className="text-sm text-gray-600">Estado</p>
                <div className="mt-1">{getEstadoBadge(orden.estado)}</div>
              </div>
              <div>
                <p className="text-sm text-gray-600">Fecha de Creación</p>
                <p className="font-medium">
                  {new Date(orden.fecha_creacion).toLocaleDateString('es-AR', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Total de la Orden</p>
                <p className="text-2xl font-bold text-green-600">
                  ${orden.total?.toLocaleString('es-AR') || '0'}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Observaciones</p>
                <p className="font-medium">
                  {orden.observaciones || "Sin observaciones"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Información del Proveedor */}
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Información del Proveedor</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <p className="text-sm text-gray-600">CUIT</p>
                <p className="font-medium">{orden.cuit_proveedor}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Nombre</p>
                <p className="font-medium">{orden.nombre_proveedor}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Dirección</p>
                <p className="font-medium">{orden.direccion_proveedor}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Teléfono</p>
                <p className="font-medium">{orden.telefono_proveedor}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Email</p>
                <p className="font-medium">{orden.email_proveedor}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Artículos de la Orden */}
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Artículos de la Orden</CardTitle>
          </CardHeader>
          <CardContent>
            {orden.items && orden.items.length > 0 ? (
              <div className="space-y-4">
                {orden.items.map((item, index) => (
                  <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <h4 className="font-medium">{item.articulo_nombre}</h4>
                    </div>
                    <div className="flex items-center gap-6 text-right">
                      <div>
                        <p className="text-sm text-gray-600">Cantidad</p>
                        <p className="font-medium">{item.cantidad}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Precio Unit.</p>
                        <p className="font-medium">${item.precio_unitario?.toLocaleString('es-AR')}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Total</p>
                        <p className="font-semibold text-lg">${item.total?.toLocaleString('es-AR')}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                No hay artículos en esta orden
              </div>
            )}
          </CardContent>
        </Card>

        {/* Acciones */}
        <div className="flex justify-center gap-4">
          <Button
            onClick={() => router.push("/auth/ordenes-compra")}
            variant="outline"
            className="px-8"
          >
            🔙 Volver a la Lista
          </Button>
        </div>
      </div>
    </div>
  );
}

