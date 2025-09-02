"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

// Estilos para impresión A4
const printStyles = `
  @media print {
    @page {
      size: A4;
      margin: 1cm;
    }
    
    body {
      font-size: 12px !important;
      line-height: 1.3 !important;
    }
    
    .print-container {
      max-width: none !important;
      margin: 0 !important;
      padding: 0 !important;
    }
    
    .print-header {
      margin-bottom: 15px !important;
      border-bottom: 2px solid #000 !important;
      padding-bottom: 10px !important;
    }
    
    .print-section {
      margin-bottom: 10px !important;
      page-break-inside: avoid;
    }
    
    .print-grid {
      display: grid !important;
      grid-template-columns: 1fr 1fr !important;
      gap: 10px !important;
      margin-bottom: 10px !important;
    }
    
    .print-items {
      font-size: 11px !important;
    }
    
    .print-total {
      border-top: 2px solid #000 !important;
      padding-top: 10px !important;
      margin-top: 10px !important;
      font-weight: bold !important;
    }
    
    .print-hidden {
      display: none !important;
    }
  }
`;

interface OrdenCompra {
  id: number;
  noc: number;
  fecha: string;
  cuit: string;
  proveedor: string;
  direccion: string;
  telefono: string;
  email: string;
  estado: string;
  total: number;
  observaciones?: string;
  articulos: Array<{
    articulo_id: string;
    articulo_nombre: string;
    cantidad: number;
    precio_unitario: number;
    total: number;
  }>;
  lugar_entrega: string;
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

  const fetchOrden = useCallback(async (id: number) => {
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
  }, [supabase]);

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

  const handleImprimir = () => {
    try {
      // Pequeño delay para asegurar que el DOM esté listo
      setTimeout(() => {
        window.print();
      }, 100);
    } catch (error) {
      console.error("Error al imprimir:", error);
      // Fallback: abrir en nueva ventana
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(`
          <html>
            <head><title>Orden de Compra #${orden?.noc}</title></head>
            <body>
              <h1>Orden de Compra #${orden?.noc}</h1>
              <p>Use Ctrl+P para imprimir esta página</p>
            </body>
          </html>
        `);
        printWindow.document.close();
        printWindow.print();
      }
    }
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
    <>
      <style dangerouslySetInnerHTML={{ __html: printStyles }} />
      <div className="w-full max-w-6xl mx-auto p-6 print-container">
        {/* Encabezado de la empresa */}
        <div className="text-center mb-6 print-header">
          <h1 className="text-2xl font-bold text-gray-800 print:text-xl">
            Perfiles y Servicios SRL
          </h1>
        </div>
        
        <div className="flex justify-between items-center mb-6 print-header">
          <h2 className="text-3xl font-bold text-gray-900 print:text-2xl">
            📋 Orden de Compra #{orden.noc}
          </h2>
          <Button
            onClick={() => router.push("/auth/ordenes-compra")}
            variant="outline"
            className="print-hidden"
          >
            🔙 Volver a la Lista
          </Button>
        </div>

      <div className="grid gap-4 print:gap-2">

          {/* Información del Proveedor */}
          <Card className="print-section">
          <CardHeader className="print:py-2">
            <CardTitle className="text-xl print:text-lg">Proveedor</CardTitle>
          </CardHeader>
          <CardContent className="print:py-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 print:gap-2 print-grid">
              
              <div>
                <p className="text-sm text-gray-600 print:text-xs">Nombre</p>
                <p className="font-medium print:text-sm">{orden.proveedor}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 print:text-xs">CUIT</p>
                <p className="font-medium print:text-sm">{orden.cuit}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 print:text-xs">Dirección</p>
                <p className="font-medium print:text-sm">{orden.direccion}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 print:text-xs">Teléfono</p>
                <p className="font-medium print:text-sm">{orden.telefono}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 print:text-xs">Email</p>
                <p className="font-medium print:text-sm">{orden.email}</p>
              </div>
             
            </div>
          </CardContent>
        </Card>

        {/* Información Principal */}
        <Card className="print-section">
          <CardHeader className="print:py-2">
            <CardTitle className="text-xl print:text-lg">Información General</CardTitle>
          </CardHeader>
          <CardContent className="print:py-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 print:gap-2 print-grid">
              <div>
                <p className="text-sm text-gray-600 print:text-xs">Estado</p>
                <div className="mt-1 print:text-sm">{getEstadoBadge(orden.estado)}</div>
              </div>
              <div>
                <p className="text-sm text-gray-600 print:text-xs">Fecha de Creación</p>
                <p className="font-medium print:text-sm">
                  {new Date(orden.fecha).toLocaleDateString('es-AR', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600 print:text-xs">Total de la Orden</p>
                <p className="text-2xl font-bold text-green-600 print:text-lg">
                  ${orden.total?.toLocaleString('es-AR') || '0'}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600 print:text-xs">Observaciones</p>
                <p className="font-medium print:text-sm">
                  {orden.observaciones || "Sin observaciones"}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600 print:text-xs">Dirección de Entrega</p>
                <p className="font-medium print:text-sm">{orden.lugar_entrega}</p>
              </div>
              
              

            </div>
          </CardContent>
        </Card>

      

        {/* Artículos de la Orden */}
        <Card className="print-section">
          <CardHeader className="print:py-2">
            <CardTitle className="text-xl print:text-lg">Artículos de la Orden</CardTitle>
          </CardHeader>
          <CardContent className="print:py-2">
            {orden.articulos && orden.articulos.length > 0 ? (
              <div className="space-y-2 print:space-y-1">
                {orden.articulos.map((item, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg print:bg-white print:border print:border-gray-300 print:p-1">
                    <div className="flex-1">
                      <h4 className="font-medium print:text-sm">{item.articulo_nombre}</h4>
                    </div>
                    <div className="flex items-center gap-4 text-right print:gap-2">
                      <div>
                        <p className="text-sm text-gray-600 print:text-xs">Cant.</p>
                        <p className="font-medium print:text-sm">{item.cantidad}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600 print:text-xs">Precio</p>
                        <p className="font-medium print:text-sm">${item.precio_unitario?.toLocaleString('es-AR')}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600 print:text-xs">Total</p>
                        <p className="font-semibold text-lg print:text-sm">${item.total?.toLocaleString('es-AR')}</p>
                      </div>
                    </div>
                  </div>
                ))}
                <div className="print-total">
                  <div className="flex justify-end">
                    <div className="text-right">
                      <p className="text-lg font-bold print:text-base">
                        TOTAL: ${orden.total?.toLocaleString('es-AR') || '0'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500 print:py-2">
                No hay artículos en esta orden
              </div>
            )}
          </CardContent>
        </Card>

        {/* Acciones */}
        <div className="flex justify-center gap-4 print-hidden">
          <Button
            onClick={handleImprimir}
            className="px-8 bg-blue-600 hover:bg-blue-700"
          >
            🖨️ Imprimir
          </Button>
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
    </>
  );
}

