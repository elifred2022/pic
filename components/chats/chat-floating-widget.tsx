"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, X } from "lucide-react";
import { ChatUsersIcon } from "./chat-users-icon";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { ChatWindow } from "./chat-window";
import {
  getCurrentUserUuid,
  getOrCreateDirectConversation,
  listConversaciones,
  listUsuarios,
} from "./chat-api";
import { useOnlinePresence } from "./use-online-presence";
import { UserStatusList } from "./user-status-list";
import type { ConversacionResumen, UsuarioChat } from "./types";

type View = "users" | "chat";

export function ChatFloatingWidget() {
  const supabase = createClient();
  const [authenticated, setAuthenticated] = useState(false);
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<View>("users");
  const [conversacionActiva, setConversacionActiva] =
    useState<ConversacionResumen | null>(null);
  const [conversaciones, setConversaciones] = useState<ConversacionResumen[]>(
    [],
  );
  const [usuarios, setUsuarios] = useState<UsuarioChat[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [loadingChat, setLoadingChat] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { onlineUuidSet, currentUserUuid, ready } =
    useOnlinePresence(authenticated);

  useEffect(() => {
    const checkAuth = async () => {
      const uuid = await getCurrentUserUuid(supabase);
      setAuthenticated(!!uuid);
    };

    checkAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuthenticated(!!session?.user);
      if (!session?.user) {
        setOpen(false);
        setView("users");
        setConversacionActiva(null);
        setUsuarios([]);
      }
    });

    return () => subscription.unsubscribe();
  }, [supabase]);

  const cargarConversaciones = useCallback(async () => {
    if (!currentUserUuid) return;
    try {
      const data = await listConversaciones(supabase, currentUserUuid);
      setConversaciones(data);
    } catch {
      // Silencioso: el badge se actualiza en el próximo intento
    }
  }, [currentUserUuid, supabase]);

  const cargarUsuarios = useCallback(async () => {
    if (!currentUserUuid) return;
    setLoadingUsers(true);
    try {
      const data = await listUsuarios(supabase, currentUserUuid);
      setUsuarios(data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Error al cargar usuarios",
      );
    } finally {
      setLoadingUsers(false);
    }
  }, [currentUserUuid, supabase]);

  useEffect(() => {
    if (authenticated && currentUserUuid) cargarConversaciones();
  }, [authenticated, currentUserUuid, cargarConversaciones]);

  useEffect(() => {
    if (open && currentUserUuid) {
      cargarConversaciones();
      cargarUsuarios();
    }
  }, [open, currentUserUuid, cargarConversaciones, cargarUsuarios]);

  const totalNoLeidos = useMemo(
    () => conversaciones.reduce((acc, c) => acc + c.no_leidos, 0),
    [conversaciones],
  );

  const onlineCount = useMemo(
    () => usuarios.filter((u) => onlineUuidSet.has(u.uuid)).length,
    [onlineUuidSet, usuarios],
  );

  const abrirChatConUsuario = async (usuario: UsuarioChat) => {
    if (!currentUserUuid) return;
    setLoadingChat(true);
    setError(null);
    try {
      const conversacionId = await getOrCreateDirectConversation(
        supabase,
        currentUserUuid,
        usuario.uuid,
      );

      const resumen: ConversacionResumen = {
        id: conversacionId,
        tipo: "directo",
        updated_at: new Date().toISOString(),
        otro_usuario: usuario,
        ultimo_mensaje: null,
        no_leidos: 0,
      };

      setConversacionActiva(resumen);
      setView("chat");
      await cargarConversaciones();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "No se pudo abrir la conversación",
      );
    } finally {
      setLoadingChat(false);
    }
  };

  const cerrarPopup = () => {
    setOpen(false);
    setView("users");
    setConversacionActiva(null);
    setError(null);
  };

  const volverALista = () => {
    setView("users");
    setConversacionActiva(null);
    setError(null);
  };

  if (!authenticated) return null;

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-[998] bg-black/20 md:bg-transparent"
          onClick={cerrarPopup}
          aria-hidden
        />
      )}

      <div className="fixed bottom-5 right-5 z-[999] flex flex-col items-end gap-3">
        {open && (
          <div
            className="flex h-[min(70vh,520px)] w-[min(92vw,380px)] flex-col overflow-hidden rounded-2xl border bg-card shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b bg-blue-600 px-4 py-3 text-white">
              <div className="flex items-center gap-2">
                {view === "chat" && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-white hover:bg-blue-500 hover:text-white"
                    onClick={volverALista}
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                )}
                <div>
                  <p className="font-semibold leading-tight">
                    {view === "chat"
                      ? conversacionActiva?.otro_usuario?.nombre ?? "Chat"
                      : "Usuarios"}
                  </p>
                  {view === "users" && !loadingUsers && (
                    <p className="text-xs text-blue-100">
                      {ready
                        ? `${onlineCount} en línea · ${usuarios.length} total`
                        : "Conectando presencia..."}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Link
                  href="/auth/chats"
                  className="rounded-md px-2 py-1 text-xs text-blue-100 hover:bg-blue-500 hover:text-white"
                  onClick={cerrarPopup}
                >
                  Ver todo
                </Link>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-white hover:bg-blue-500 hover:text-white"
                  onClick={cerrarPopup}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {error && (
              <p className="border-b bg-red-50 px-4 py-2 text-xs text-red-600">
                {error}
              </p>
            )}

            {view === "users" ? (
              <UserStatusList
                usuarios={usuarios}
                onlineUuids={onlineUuidSet}
                loading={loadingUsers}
                disabled={loadingChat}
                onSelectUser={abrirChatConUsuario}
                showSearch
              />
            ) : (
              <div className="min-h-0 flex-1">
                <ChatWindow
                  conversacion={conversacionActiva}
                  currentUserUuid={currentUserUuid ?? ""}
                  onMessageSent={cargarConversaciones}
                />
              </div>
            )}
          </div>
        )}

        <button
          type="button"
          onClick={() => setOpen((prev) => !prev)}
          className={cn(
            "relative flex items-center justify-center gap-2 rounded-full bg-blue-600 text-white shadow-lg transition-all hover:scale-105 hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2",
            open ? "h-14 w-14" : "h-14 px-4",
          )}
          aria-label={open ? "Cerrar chats" : "Abrir chats"}
        >
          {open ? (
            <X className="h-6 w-6" />
          ) : (
            <>
              <ChatUsersIcon className="h-6 w-6 shrink-0" />
              <span className="text-sm font-semibold">Chats</span>
            </>
          )}
          {!open && totalNoLeidos > 0 && (
            <Badge className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[10px]">
              {totalNoLeidos > 99 ? "99+" : totalNoLeidos}
            </Badge>
          )}
        </button>
      </div>
    </>
  );
}
