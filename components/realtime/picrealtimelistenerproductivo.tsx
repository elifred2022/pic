"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

type Picstock = {
  id: string;
  articulo: string;
  descripcion: string;
  estado: string;
  uuid: string; // Columna que almacena el auth.uid()
};

export default function PicRealtimeListenerStock() {
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();

    let channel: ReturnType<typeof supabase.channel>;

    const listenRealtime = async () => {
      // Obtener usuario autenticado
      const { data: userData } = await supabase.auth.getUser();
      const currentUser = userData?.user;

      if (!currentUser) return; // Si no hay usuario logueado, salir.

      // Suscribirse a cambios en la tabla PIC
      channel = supabase
        .channel(`realtime:picstock:${currentUser.id}`) // Nombre único por usuario
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "picstock" },
          (payload) => {
            const newItem = payload.new as Picstock;
            const oldItem = payload.old as Picstock;

            // Determinar dueño del pedido
            const ownerId = newItem?.uuid || oldItem?.uuid;
            if (ownerId !== currentUser.id) return; // Ignorar si no le pertenece

            const id = newItem?.id || oldItem?.id;
            const articulo = newItem?.articulo || oldItem?.articulo;
            const estado = newItem?.estado || oldItem?.estado;
            const descripcion = newItem?.descripcion || oldItem?.descripcion;
            const evento = payload.eventType;

            // Mostrar alertas según el tipo de evento
            if (evento === "INSERT") {
              alert(`✅ Se creó tu pedido: "${id}" "${articulo}"`);
            } else if (evento === "UPDATE") {
              alert(`✏️ Tu pedido "${id}" "${articulo}" fue modificado (${estado || ""}), Nota: (${descripcion || ""})`);
            } else if (evento === "DELETE") {
              alert(`🗑️ Tu pedido "${id}" "${articulo}" fue eliminado.`);
            }

             // Refrescar después de mostrar el mensaje
            setTimeout(() => {
              window.location.reload();
            }, 500); // Espera 0.5s para que el usuario vea el mensaje
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
