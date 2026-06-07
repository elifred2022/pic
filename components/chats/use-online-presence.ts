"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { UsuarioChat } from "./types";

type PresencePayload = {
  uuid: string;
  nombre: string;
  email: string;
  online_at: string;
};

export function useOnlinePresence(active: boolean) {
  const supabase = createClient();
  const [onlineUsers, setOnlineUsers] = useState<UsuarioChat[]>([]);
  const [currentUserUuid, setCurrentUserUuid] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!active) {
      setOnlineUsers([]);
      setCurrentUserUuid(null);
      setReady(false);
      return;
    }

    let channel: ReturnType<typeof supabase.channel> | undefined;
    let cancelled = false;

    const setup = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user || cancelled) return;

      const { data: profile } = await supabase
        .from("usuarios")
        .select("nombre, email")
        .eq("uuid", user.id)
        .maybeSingle();

      if (cancelled) return;

      setCurrentUserUuid(user.id);

      channel = supabase.channel("pic-online-users", {
        config: { presence: { key: user.id } },
      });

      const syncOnlineUsers = () => {
        if (!channel) return;
        const state = channel.presenceState<PresencePayload>();
        const map = new Map<string, UsuarioChat>();

        for (const presences of Object.values(state)) {
          for (const presence of presences) {
            if (presence.uuid === user.id) continue;
            map.set(presence.uuid, {
              uuid: presence.uuid,
              nombre: presence.nombre,
              email: presence.email,
            });
          }
        }

        setOnlineUsers(
          [...map.values()].sort((a, b) => a.nombre.localeCompare(b.nombre)),
        );
      };

      channel
        .on("presence", { event: "sync" }, syncOnlineUsers)
        .on("presence", { event: "join" }, syncOnlineUsers)
        .on("presence", { event: "leave" }, syncOnlineUsers)
        .subscribe(async (status) => {
          if (status !== "SUBSCRIBED" || !channel) return;

          await channel.track({
            uuid: user.id,
            nombre: profile?.nombre ?? user.email?.split("@")[0] ?? "Usuario",
            email: profile?.email ?? user.email ?? "",
            online_at: new Date().toISOString(),
          });

          syncOnlineUsers();
          setReady(true);
        });
    };

    setup();

    return () => {
      cancelled = true;
      if (channel) supabase.removeChannel(channel);
    };
  }, [active, supabase]);

  const onlineUuidSet = useMemo(
    () => new Set(onlineUsers.map((u) => u.uuid)),
    [onlineUsers],
  );

  return { onlineUsers, onlineUuidSet, currentUserUuid, ready };
}
