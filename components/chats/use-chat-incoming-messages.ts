"use client";

import { useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Mensaje } from "./types";

export function useChatIncomingMessages(
  userUuid: string | null,
  onMessage: (mensaje: Mensaje) => void,
) {
  const onMessageRef = useRef(onMessage);
  onMessageRef.current = onMessage;

  useEffect(() => {
    if (!userUuid) return;

    const supabase = createClient();
    let channel: ReturnType<typeof supabase.channel> | undefined;
    const mensajesVistos = new Set<string>();

    const setup = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.user) return;

      if (session.access_token) {
        await supabase.realtime.setAuth(session.access_token);
      }

      channel = supabase
        .channel(`pic-chat-messages:${userUuid}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "mensajes",
          },
          (payload) => {
            const mensaje = payload.new as Mensaje;

            if (mensaje.remitente_uuid === userUuid) return;
            if (mensajesVistos.has(mensaje.id)) return;
            mensajesVistos.add(mensaje.id);

            onMessageRef.current(mensaje);
          },
        )
        .subscribe();
    };

    setup();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.access_token) {
        await supabase.realtime.setAuth(session.access_token);
      }
    });

    return () => {
      subscription.unsubscribe();
      if (channel) supabase.removeChannel(channel);
    };
  }, [userUuid]);
}
