"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent } from "react";
import Link from "next/link";
import { ArrowLeft, X } from "lucide-react";
import { ChatUsersIcon } from "./chat-users-icon";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { ChatWindow } from "./chat-window";
import {
  findConversacionConUsuario,
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

const CHAT_BUBBLE_POS_KEY = "pic-chat-bubble-pos";
const CHAT_BUBBLE_DEFAULT_POS = { right: 20, bottom: 20 };
const CHAT_BUBBLE_DRAG_THRESHOLD = 8;
const CHAT_BUBBLE_MARGIN = 8;

type ChatBubblePos = { right: number; bottom: number };

function readChatBubblePos(): ChatBubblePos {
  if (typeof window === "undefined") return CHAT_BUBBLE_DEFAULT_POS;
  try {
    const raw = localStorage.getItem(CHAT_BUBBLE_POS_KEY);
    if (!raw) return CHAT_BUBBLE_DEFAULT_POS;
    const parsed = JSON.parse(raw) as { right?: unknown; bottom?: unknown };
    if (typeof parsed.right === "number" && typeof parsed.bottom === "number") {
      return { right: parsed.right, bottom: parsed.bottom };
    }
  } catch {
    // ignore
  }
  return CHAT_BUBBLE_DEFAULT_POS;
}

function persistChatBubblePos(pos: ChatBubblePos) {
  try {
    localStorage.setItem(CHAT_BUBBLE_POS_KEY, JSON.stringify(pos));
  } catch {
    // ignore
  }
}

function clampChatBubblePos(
  pos: ChatBubblePos,
  size: { width: number; height: number }
): ChatBubblePos {
  if (typeof window === "undefined") return pos;
  const maxRight = Math.max(
    CHAT_BUBBLE_MARGIN,
    window.innerWidth - size.width - CHAT_BUBBLE_MARGIN
  );
  const maxBottom = Math.max(
    CHAT_BUBBLE_MARGIN,
    window.innerHeight - size.height - CHAT_BUBBLE_MARGIN
  );
  return {
    right: Math.min(Math.max(pos.right, CHAT_BUBBLE_MARGIN), maxRight),
    bottom: Math.min(Math.max(pos.bottom, CHAT_BUBBLE_MARGIN), maxBottom),
  };
}

export function ChatFloatingWidget() {
  const supabase = createClient();
  const [authChecked, setAuthChecked] = useState(false);
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
  const [bubblePos, setBubblePos] = useState<ChatBubblePos>(CHAT_BUBBLE_DEFAULT_POS);
  const [draggingBubble, setDraggingBubble] = useState(false);
  const bubbleButtonRef = useRef<HTMLButtonElement>(null);
  const bubbleDragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    startRight: number;
    startBottom: number;
    moved: boolean;
  } | null>(null);
  const bubblePosRef = useRef(bubblePos);
  bubblePosRef.current = bubblePos;

  const { onlineUuidSet, ready, presenceError } =
    useOnlinePresence(authenticated);

  useEffect(() => {
    const checkAuth = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const uuid = user?.id ?? null;
      setUserUuid(uuid);
      setAuthenticated(!!uuid);
      setAuthChecked(true);
    };

    checkAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const uuid = session?.user?.id ?? null;
      setUserUuid(uuid);
      setAuthenticated(!!session?.user);
      setAuthChecked(true);
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
    if (!authenticated || !userUuid) return;
    cargarConversaciones();
    cargarUsuarios();
  }, [authenticated, userUuid, cargarConversaciones, cargarUsuarios]);

  const handleMensajeEntrante = useCallback(
    async (mensaje: Mensaje) => {
      const conversacionId = mensaje.conversacion_id;
      const viendoChat = getActiveChatConversationId() === conversacionId;

      if (!viendoChat) {
        setBadgePulse(true);
        window.setTimeout(() => setBadgePulse(false), 2500);

        const { data: remitente } = await supabase
          .from("usuarios")
          .select("nombre, email")
          .eq("uuid", mensaje.remitente_uuid)
          .maybeSingle();

        setAvisoRemitente({
          conversacionId,
          remitenteUuid: mensaje.remitente_uuid,
          nombre: remitente?.nombre ?? "Usuario",
          contenido: mensaje.contenido,
        });
      }

      await cargarConversaciones();
      dispatchChatIncomingMessage(conversacionId);
    },
    [cargarConversaciones, supabase],
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
      if (conv.no_leidos <= 0) continue;
      const uuid =
        conv.otro_usuario?.uuid ??
        (conv.ultimo_mensaje?.remitente_uuid !== userUuid
          ? conv.ultimo_mensaje?.remitente_uuid
          : null);
      if (uuid) map.set(uuid, conv.no_leidos);
    }
    return map;
  }, [conversaciones, userUuid]);

  const ultimoMensajePorUuid = useMemo(() => {
    const map = new Map<string, string>();
    for (const conv of conversaciones) {
      if (!conv.ultimo_mensaje) continue;
      const uuid =
        conv.otro_usuario?.uuid ??
        (conv.ultimo_mensaje.remitente_uuid !== userUuid
          ? conv.ultimo_mensaje.remitente_uuid
          : null);
      if (uuid) map.set(uuid, conv.ultimo_mensaje.contenido);
    }
    return map;
  }, [conversaciones, userUuid]);

  const usuariosVisibles = useMemo(() => {
    const porUuid = new Map(usuarios.map((u) => [u.uuid, u]));

    for (const conv of conversaciones) {
      const uuid =
        conv.otro_usuario?.uuid ??
        (conv.ultimo_mensaje?.remitente_uuid !== userUuid
          ? conv.ultimo_mensaje?.remitente_uuid
          : null);
      if (!uuid || porUuid.has(uuid)) continue;

      porUuid.set(
        uuid,
        conv.otro_usuario ?? {
          uuid,
          nombre: "Usuario",
          email: "",
        },
      );
    }

    return [...porUuid.values()].sort((a, b) =>
      a.nombre.localeCompare(b.nombre, "es"),
    );
  }, [conversaciones, userUuid, usuarios]);

  const abrirConversacion = useCallback((conv: ConversacionResumen) => {
    setConversacionActiva(conv);
    setView("chat");
    setAvisoRemitente(null);
    setError(null);
  }, []);

  const abrirChatDesdeAviso = useCallback(
    async (aviso: AvisoRemitente) => {
      if (!userUuid) return;

      setOpen(true);
      setAvisoRemitente(null);

      let conv =
        conversaciones.find((c) => c.id === aviso.conversacionId) ?? null;
      if (!conv) {
        const data = await listConversaciones(supabase, userUuid);
        setConversaciones(data);
        conv = data.find((c) => c.id === aviso.conversacionId) ?? null;
      }

      if (!conv) {
        conv = {
          id: aviso.conversacionId,
          tipo: "directo",
          updated_at: new Date().toISOString(),
          otro_usuario: {
            uuid: aviso.remitenteUuid,
            nombre: aviso.nombre,
            email: "",
          },
          ultimo_mensaje: null,
          no_leidos: 0,
        };
      }

      abrirConversacion(conv);
    },
    [abrirConversacion, conversaciones, supabase, userUuid],
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
      const existente = findConversacionConUsuario(conversaciones, usuario.uuid);

      if (existente) {
        abrirConversacion(existente);
        return;
      }

      const conversacionId = await getOrCreateDirectConversation(
        supabase,
        userUuid,
        usuario.uuid,
      );

      const data = await listConversaciones(supabase, userUuid);
      setConversaciones(data);

      const conv =
        data.find((c) => c.id === conversacionId) ??
        findConversacionConUsuario(data, usuario.uuid) ?? {
          id: conversacionId,
          tipo: "directo",
          updated_at: new Date().toISOString(),
          otro_usuario: usuario,
          ultimo_mensaje: null,
          no_leidos: 0,
        };

      abrirConversacion(conv);
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

  const getBubbleSize = useCallback(() => {
    const el = bubbleButtonRef.current;
    if (el) {
      const rect = el.getBoundingClientRect();
      return { width: rect.width, height: rect.height };
    }
    return { width: 56, height: 56 };
  }, []);

  const clampCurrentBubblePos = useCallback(
    (pos: ChatBubblePos) => clampChatBubblePos(pos, getBubbleSize()),
    [getBubbleSize]
  );

  useEffect(() => {
    setBubblePos(clampChatBubblePos(readChatBubblePos(), { width: 120, height: 56 }));
  }, []);

  useEffect(() => {
    const onResize = () => {
      setBubblePos((prev) => clampCurrentBubblePos(prev));
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [clampCurrentBubblePos]);

  const handleBubblePointerDown = (e: PointerEvent<HTMLButtonElement>) => {
    if (e.button !== 0) return;
    bubbleDragRef.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      startRight: bubblePosRef.current.right,
      startBottom: bubblePosRef.current.bottom,
      moved: false,
    };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handleBubblePointerMove = (e: PointerEvent<HTMLButtonElement>) => {
    const drag = bubbleDragRef.current;
    if (!drag || drag.pointerId !== e.pointerId) return;
    const dx = e.clientX - drag.startX;
    const dy = e.clientY - drag.startY;
    if (!drag.moved && Math.hypot(dx, dy) < CHAT_BUBBLE_DRAG_THRESHOLD) return;
    drag.moved = true;
    setDraggingBubble(true);
    const next = clampCurrentBubblePos({
      right: drag.startRight - dx,
      bottom: drag.startBottom - dy,
    });
    setBubblePos(next);
  };

  const handleBubblePointerUp = (e: PointerEvent<HTMLButtonElement>) => {
    const drag = bubbleDragRef.current;
    if (!drag || drag.pointerId !== e.pointerId) return;
    bubbleDragRef.current = null;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // already released
    }
    if (drag.moved) {
      persistChatBubblePos(clampCurrentBubblePos(bubblePosRef.current));
      setDraggingBubble(false);
      return;
    }
    setDraggingBubble(false);
    setOpen((prev) => !prev);
  };

  if (!authChecked || !authenticated) return null;

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-[998] bg-black/20 md:bg-transparent"
          onClick={cerrarPopup}
          aria-hidden
        />
      )}

      <div
        className="fixed z-[999] flex flex-col items-end gap-3"
        style={{ right: bubblePos.right, bottom: bubblePos.bottom }}
      >
        {avisoRemitente && getActiveChatConversationId() !== avisoRemitente.conversacionId && (
          <ChatIncomingToast
            nombre={avisoRemitente.nombre}
            contenido={avisoRemitente.contenido}
            onClose={() => setAvisoRemitente(null)}
            onClick={() => abrirChatDesdeAviso(avisoRemitente)}
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
                usuarios={usuariosVisibles}
                onlineUuids={onlineUuidSet}
                noLeidosPorUuid={noLeidosPorUuid}
                ultimoMensajePorUuid={ultimoMensajePorUuid}
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
          ref={bubbleButtonRef}
          type="button"
          onPointerDown={handleBubblePointerDown}
          onPointerMove={handleBubblePointerMove}
          onPointerUp={handleBubblePointerUp}
          onPointerCancel={handleBubblePointerUp}
          className={cn(
            "relative flex items-center justify-center gap-2 rounded-full bg-blue-600 text-white shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2",
            "touch-none select-none",
            draggingBubble ? "cursor-grabbing" : "cursor-grab hover:bg-blue-700",
            !draggingBubble && "transition-all hover:scale-105",
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
          title="Arrastrá para mover la burbuja"
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
