"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type PedidoObservacion = {
  id: string;
  numero_pic: string;
  observ: string;
  fecha: string;
  estado: string;
};

export default function ListaBiComponenteObservacion() {
  const supabase = createClient();
  const [pedidos, setPedidos] = useState<PedidoObservacion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchPedidos();
  }, [supabase]);

  const fetchPedidos = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("pic")
        .select("id, numero_pic, observ, fecha, estado")
        .not("observ", "is", null)
        .not("observ", "eq", "")
        .order("fecha", { ascending: false });

      if (error) {
        throw error;
      }

      setPedidos(data || []);
    } catch (err) {
      console.error("Error fetching pedidos:", err);
      setError("Error al cargar los pedidos");
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  const getEstadoColor = (estado: string) => {
    switch (estado.toLowerCase()) {
      case "pendiente":
        return "bg-yellow-100 text-yellow-800";
      case "aprobado":
        return "bg-green-100 text-green-800";
      case "rechazado":
        return "bg-red-100 text-red-800";
      case "en proceso":
        return "bg-blue-100 text-blue-800";
      case "completado":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="text-lg">Cargando pedidos...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center p-8">
        <div className="text-red-600 mb-4">{error}</div>
        <Button onClick={fetchPedidos} variant="outline">
          Reintentar
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Pedidos con Observación</h2>
        <div className="text-sm text-gray-600">
          Total: {pedidos.length} pedidos
        </div>
      </div>

      {pedidos.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-gray-500">
            No hay pedidos con observaciones registradas
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {pedidos.map((pedido) => (
            <Card key={pedido.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg">
                      PIC #{pedido.numero_pic || pedido.id.slice(-8)}
                    </CardTitle>
                    <div className="text-sm text-gray-600 mt-1">
                      {new Date(pedido.fecha).toLocaleDateString("es-ES")}
                    </div>
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-medium ${getEstadoColor(
                      pedido.estado
                    )}`}
                  >
                    {pedido.estado}
                  </span>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div>
                    <span className="font-medium text-gray-700">Observación:</span>
                    <div className="mt-2 p-3 bg-gray-50 rounded-lg">
                      <p className="text-gray-900 text-sm leading-relaxed">
                        {pedido.observ}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

