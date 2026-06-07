"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { isChatContactEmail } from "@/lib/panol-access";
import type { UsuarioChat } from "./types";

const HEARTBEAT_MS = 20_000;
const ONLINE_WINDOW_MS = 2 * 60_000;

export function useOnlinePresence(active: boolean) {
  const [onlineUsers, setOnlineUsers] = useState<UsuarioChat[]>([]);
  const [currentUserUuid, setCurrentUserUuid] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [presenceError, setPresenceError] = useState<string | null>(null);

  useEffect(() => {
    if (!active) {
      setOnlineUsers([]);
      setCurrentUserUuid(null);
      setReady(false);
      setPresenceError(null);
      return;
    }

    const supabase = createClient();
    let cancelled = false;
    let intervalId: ReturnType<typeof setInterval> | undefined;

    const syncPresence = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.user || cancelled) return;

      if (session.access_token) {
        await supabase.realtime.setAuth(session.access_token);
      }

      const userId = session.user.id;
      setCurrentUserUuid(userId);

      const now = new Date().toISOString();
      const { error: heartbeatError } = await supabase
        .from("usuarios")
        .update({ last_seen_at: now })
        .eq("uuid", userId);

      if (cancelled) return;

      if (heartbeatError) {
        setPresenceError(heartbeatError.message);
        setReady(false);
        return;
      }

      const cutoff = new Date(Date.now() - ONLINE_WINDOW_MS).toISOString();
      const { data: onlineRows, error: fetchError } = await supabase
        .from("usuarios")
        .select("uuid, nombre, email")
        .neq("uuid", userId)
        .gte("last_seen_at", cutoff)
        .order("nombre", { ascending: true });

      if (cancelled) return;

      if (fetchError) {
        setPresenceError(fetchError.message);
        setReady(false);
        return;
      }

      setPresenceError(null);
      setOnlineUsers(
        (onlineRows ?? []).filter((u) => isChatContactEmail(u.email)),
      );
      setReady(true);
    };

    syncPresence();
    intervalId = setInterval(syncPresence, HEARTBEAT_MS);

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (cancelled) return;
      if (session?.access_token) {
        await supabase.realtime.setAuth(session.access_token);
      }
      if (session?.user) {
        syncPresence();
      }
    });

    return () => {
      cancelled = true;
      if (intervalId) clearInterval(intervalId);
      subscription.unsubscribe();
    };
  }, [active]);

  const onlineUuidSet = useMemo(() => {
    const set = new Set(onlineUsers.map((u) => u.uuid));
    if (ready && currentUserUuid) set.add(currentUserUuid);
    return set;
  }, [currentUserUuid, onlineUsers, ready]);

  return {
    onlineUsers,
    onlineUuidSet,
    currentUserUuid,
    ready,
    presenceError,
  };
}
