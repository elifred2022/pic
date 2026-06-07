"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, X } from "lucide-react";
import { ChatUsersIcon } from "./chat-users-icon";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { ChatWindow } from "./chat-window";
import { canUseChat } from "@/lib/panol-access";
import {
  getOrCreateDirectConversation,
  listConversaciones,
  listUsuarios,
} from "./chat-api";
import { useOnlinePresence } from "./use-online-presence";
import {
  dispatchChatIncomingMessage,
  getActiveChatConversationId,
} from "./chat-notification-state";
import { useChatIncomingMessages } from "./use-chat-incoming-messages";
import { ChatIncomingToast } from "./chat-incoming-toast";
import { UserStatusList } from "./user-status-list";
import type { ConversacionResumen, Mensaje, UsuarioChat } from "./types";

type AvisoRemitente = {
  conversacionId: string;
  remitenteUuid: string;
  nombre: string;
  contenido: string;
};

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
  const [userUuid, setUserUuid] = useState<string | null>(null);
  const [badgePulse, setBadgePulse] = useState(false);
  const [avisoRemitente, setAvisoRemitente] = useState<AvisoRemitente | null>(
    null,
  );

  const { onlineUuidSet, ready, presenceError } =
    useOnlinePresence(authenticated);

  useEffect(() => {
    const checkAuth = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const uuid = user?.id ?? null;
      const puedeChatear = canUseChat(user?.email);
      setUserUuid(puedeChatear ? uuid : null);
      setAuthenticated(!!uuid && puedeChatear);
    };

    checkAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const uuid = session?.user?.id ?? null;
      const puedeChatear = canUseChat(session?.user?.email);
      setUserUuid(puedeChatear ? uuid : null);
      setAuthenticated(!!session?.user && puedeChatear);
      if (!session?.user) {
        setOpen(false);
        setView("users");
        setConversacionActiva(null);
        setUsuarios([]);
        setConversaciones([]);
      }
    });

    return () => subscription.unsubscribe();
  }, [supabase]);

  const cargarConversaciones = useCallback(async () => {
    if (!userUuid) return;
    try {
      const data = await listConversaciones(supabase, userUuid);
      setConversaciones(data);
    } catch {
      // Silencioso: el badge se actualiza en el próximo intento
    }
  }, [userUuid, supabase]);

  const actualizarBadgeRef = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );

  const actualizarBadge = useCallback(() => {
    if (actualizarBadgeRef.current) clearTimeout(actualizarBadgeRef.current);
    actualizarBadgeRef.current = setTimeout(() => {
      cargarConversaciones();
    }, 500);
  }, [cargarConversaciones]);

  const cargarUsuarios = useCallback(async () => {
    if (!userUuid) return;
    setLoadingUsers(true);
    try {
      const data = await listUsuarios(supabase, userUuid);
      setUsuarios(data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Error al cargar usuarios",
      );
    } finally {
      setLoadingUsers(false);
    }
  }, [userUuid, supabase]);

  useEffect(() => {
    if (authenticated && userUuid) cargarConversaciones();
  }, [authenticated, userUuid, cargarConversaciones]);

  useEffect(() => {
    if (open && userUuid) {
      cargarConversaciones();
      cargarUsuarios();
    }
  }, [open, userUuid, cargarConversaciones, cargarUsuarios]);

  const handleMensajeEntrante = useCallback(
    async (mensaje: Mensaje) => {
      const conversacionId = mensaje.conversacion_id;
      const viendoChat = getActiveChatConversationId() === conversacionId;

      if (!viendoChat) {
        setConversaciones((prev) => {
          const existe = prev.some((c) => c.id === conversacionId);
          if (!existe) return prev;
          return prev.map((c) =>
            c.id === conversacionId
              ? { ...c, no_leidos: c.no_leidos + 1 }
              : c,
          );
        });
        setBadgePulse(true);
        window.setTimeout(() => setBadgePulse(false), 2500);

        const { data: remitente } = await supabase
          .from("usuarios")
          .select("nombre")
          .eq("uuid", mensaje.remitente_uuid)
          .maybeSingle();

        setAvisoRemitente({
          conversacionId,
          remitenteUuid: mensaje.remitente_uuid,
          nombre: remitente?.nombre ?? "Usuario",
          contenido: mensaje.contenido,
        });
      }

      if (!viendoChat) {
        actualizarBadge();
      }
      dispatchChatIncomingMessage(conversacionId);
    },
    [actualizarBadge, supabase],
  );

  useEffect(() => {
    return () => {
      if (actualizarBadgeRef.current) clearTimeout(actualizarBadgeRef.current);
    };
  }, []);

  useChatIncomingMessages(userUuid, handleMensajeEntrante);

  const totalNoLeidos = useMemo(
    () => conversaciones.reduce((acc, c) => acc + c.no_leidos, 0),
    [conversaciones],
  );

  const noLeidosPorUuid = useMemo(() => {
    const map = new Map<string, number>();
    for (const conv of conversaciones) {
      if (conv.otro_usuario && conv.no_leidos > 0) {
        map.set(conv.otro_usuario.uuid, conv.no_leidos);
      }
    }
    return map;
  }, [conversaciones]);

  const abrirChatDesdeAviso = useCallback(
    async (conversacionId: string) => {
      if (!userUuid) return;

      setOpen(true);
      setView("chat");
      setAvisoRemitente(null);

      let conv = conversaciones.find((c) => c.id === conversacionId) ?? null;
      if (!conv) {
        const data = await listConversaciones(supabase, userUuid);
        setConversaciones(data);
        conv = data.find((c) => c.id === conversacionId) ?? null;
      }

      if (conv) {
        setConversacionActiva(conv);
      }
    },
    [conversaciones, supabase, userUuid],
  );

  const onlineCount = useMemo(
    () => usuarios.filter((u) => onlineUuidSet.has(u.uuid)).length,
    [onlineUuidSet, usuarios],
  );

  const abrirChatConUsuario = async (usuario: UsuarioChat) => {
    if (!userUuid) return;
    setAvisoRemitente(null);
    setLoadingChat(true);
    setError(null);
    try {
      const conversacionId = await getOrCreateDirectConversation(
        supabase,
        userUuid,
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
        {avisoRemitente && getActiveChatConversationId() !== avisoRemitente.conversacionId && (
          <ChatIncomingToast
            nombre={avisoRemitente.nombre}
            contenido={avisoRemitente.contenido}
            onClose={() => setAvisoRemitente(null)}
            onClick={() => abrirChatDesdeAviso(avisoRemitente.conversacionId)}
          />
        )}

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
                      {presenceError
                        ? "Presencia no disponible"
                        : ready
                          ? `Tú en línea · ${onlineCount} contacto${onlineCount === 1 ? "" : "s"} en línea`
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
                noLeidosPorUuid={noLeidosPorUuid}
                loading={loadingUsers}
                disabled={loadingChat}
                onSelectUser={abrirChatConUsuario}
                showSearch
              />
            ) : (
              <div className="min-h-0 flex-1">
                <ChatWindow
                  conversacion={conversacionActiva}
                  currentUserUuid={userUuid ?? ""}
                  onMessageSent={actualizarBadge}
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
            totalNoLeidos > 0 && !open && "ring-2 ring-red-400 ring-offset-2",
          )}
          aria-label={
            totalNoLeidos > 0
              ? `Chats (${totalNoLeidos} mensaje${totalNoLeidos === 1 ? "" : "s"} sin leer)`
              : open
                ? "Cerrar chats"
                : "Abrir chats"
          }
        >
          {open ? (
            <X className="h-6 w-6" />
          ) : (
            <>
              <ChatUsersIcon className="h-6 w-6 shrink-0" />
              <span className="text-sm font-semibold">Chats</span>
            </>
          )}
          {totalNoLeidos > 0 && (
            <Badge
              className={cn(
                "absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-white bg-red-500 px-1 text-[10px] font-bold text-white hover:bg-red-500",
                badgePulse && "animate-bounce",
              )}
            >
              {totalNoLeidos > 99 ? "99+" : totalNoLeidos}
            </Badge>
          )}
        </button>
      </div>
    </>
  );
}
