"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

type PedidoProductivo = {
  id: string;
  sector: string;
  estado: string;
  solicita: string;
};

export default function PedidosProductivosRealtimeListener() {
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();

    let channel: ReturnType<typeof supabase.channel>;

    const listenRealtime = async () => {
      const { data: userData } = await supabase.auth.getUser();
      const currentUser = userData?.user;

      if (!currentUser) return;

      const { data: userProfile, error: profileError } = await supabase
        .from("usuarios")
        .select("nombre")
        .eq("uuid", currentUser.id)
        .single();

      if (profileError || !userProfile?.nombre) return;

      const nombreUsuario = userProfile.nombre;

      channel = supabase
        .channel(`realtime:pedidos_productivos:${currentUser.id}`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "pedidos_productivos" },
          (payload) => {
            const newItem = payload.new as PedidoProductivo;
            const oldItem = payload.old as PedidoProductivo;

            const ownerName = newItem?.solicita || oldItem?.solicita;
            if (!ownerName || ownerName !== nombreUsuario) return;

            const id = newItem?.id || oldItem?.id;
            const sector = newItem?.sector || oldItem?.sector || "—";
            const estadoNuevo = newItem?.estado || "";
            const estadoAnterior = oldItem?.estado || "";
            const evento = payload.eventType;

            if (evento === "INSERT") {
              alert(`✅ Se creó tu PIC productivo #${id} del sector ${sector}.`);
            } else if (evento === "UPDATE") {
              if (estadoNuevo === estadoAnterior) return;
              alert(
                `🔔 Tu PIC productivo #${id} del sector ${sector} cambió de estado: ${estadoAnterior || "—"} → ${estadoNuevo || "—"}.`
              );
            } else if (evento === "DELETE") {
              alert(`🗑️ Tu PIC productivo #${id} del sector ${sector} fue eliminado.`);
            }

            setTimeout(() => {
              window.location.reload();
            }, 500);
          }
        )
        .subscribe();
    };

    listenRealtime();

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, [router]);

  return null;
}
