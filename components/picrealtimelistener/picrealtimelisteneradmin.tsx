"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

type Pedido = {
  id: string;
  sector: string;
  cant: string;
  articulo: string;
  descripcion?: string;
  estado: string;
  uuid: string;
};

export default function PicRealtimeListenerAdmin() {
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel("admin-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "pic" },
        (payload) => {
          const pedido = payload.new as Pedido;
          console.log("🚨 Nuevo pedido en PIC:", pedido);
          setTimeout(() =>
            alert(
              `🚨 Nuevo pedido general: #${pedido.id}, sector: ${pedido.sector}, Cant: ${pedido.cant}, ${pedido.articulo}`
            ), 100);
        }
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "picstock" },
        (payload) => {
          const pedido = payload.new as Pedido;
          console.log("🚨 Nuevo pedido en PICSTORE:", pedido);
          setTimeout(() =>
            alert(
              `🚨 Nuevo pedido productivo: #${pedido.id}, sector: ${pedido.sector}, Cant: ${pedido.cant}, ${pedido.articulo}`
            ), 100);

          // Refrescar datos del admin sin recargar toda la app
          setTimeout(() => {
            router.refresh();
          }, 500);
        }
      )
      .subscribe((status) => console.log("📡 Estado canal admin:", status));

    return () => {
      supabase.removeChannel(channel);
    };
  }, [router]);

  return null;
}
