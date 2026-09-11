"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

type PedidoBasico = {
  id: string;
  sector?: string;
};

export default function PicRealtimeListenerAdmin() {
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel("admin-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "picstock" },
        (payload) => {
          const pedido = payload.new as PedidoBasico;
          console.log("🚨 Nuevo pedido en PICSTOCK:", pedido);
          setTimeout(
            () =>
              alert(
                `🚨 Nuevo pedido productivo: PIC #${pedido.id} del sector ${pedido.sector || "—"} creado.`
              ),
            100
          );

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
