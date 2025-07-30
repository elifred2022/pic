"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

type Pic = {
  id: string;
  articulo: string;
  estado: string;
  uuid: string; // Columna que almacena el auth.uid()
};

export default function PicRealtimeListener() {
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();

    let channel: ReturnType<typeof supabase.channel>;

    const listenRealtime = async () => {
      // Obtener usuario autenticado
      const { data: userData } = await supabase.auth.getUser();
      const currentUser = userData?.user;

      if (!currentUser) return; // No hay usuario, salir

      channel = supabase
        .channel("realtime:pic")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "pic" },
          (payload) => {
            const newItem = payload.new as Pic;
            const oldItem = payload.old as Pic;

            const ownerId = newItem?.uuid || oldItem?.uuid;

            if (ownerId === currentUser.id) {
              const id = newItem?.id || oldItem?.id;
              const articulo = newItem?.articulo || oldItem?.articulo;
              const estado = newItem?.estado || oldItem?.estado;
              const evento = payload.eventType;

              if (evento === "INSERT") {
                alert(`✅ Se creó tu pedido: "${id}" "${articulo}"`);
              } else if (evento === "UPDATE") {
                alert(`✏️ Tu pedido "${id}" "${articulo}" fue modificado "${estado || ""}"`);
              } else if (evento === "DELETE") {
                alert(`🗑️ Tu pedido "${id}" "${articulo}" fue eliminado.`);
              }

              //  Aquí va el setTimeout
              // Refrescar después de mostrar el mensaje
            setTimeout(() => {
              window.location.reload();
            }, 500); // Espera 0.5s para que el usuario vea el mensaje
            }
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
