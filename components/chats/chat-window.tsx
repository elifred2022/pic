"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, Send } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { MessageBubble } from "./message-bubble";
import {
  getMensajes,
  markConversacionAsRead,
  sendMensaje,
} from "./chat-api";
import { setActiveChatConversationId } from "./chat-notification-state";
import type { ConversacionResumen, Mensaje } from "./types";

type ChatWindowProps = {
  conversacion: ConversacionResumen | null;
  currentUserUuid: string;
  onBack?: () => void;
  onMessageSent?: () => void;
};

export function ChatWindow({
  conversacion,
  currentUserUuid,
  onBack,
  onMessageSent,
}: ChatWindowProps) {
  const supabase = createClient();
  const [mensajes, setMensajes] = useState<Mensaje[]>([]);
  const [texto, setTexto] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const onMessageSentRef = useRef(onMessageSent);
  const notifyTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  const conversacionId = conversacion?.id ?? null;

  onMessageSentRef.current = onMessageSent;

  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  const notificarPadre = useCallback(() => {
    if (notifyTimerRef.current) clearTimeout(notifyTimerRef.current);
    notifyTimerRef.current = setTimeout(() => {
      onMessageSentRef.current?.();
    }, 400);
  }, []);

  useEffect(() => {
    setActiveChatConversationId(conversacionId);
    return () => setActiveChatConversationId(null);
  }, [conversacionId]);

  useEffect(() => {
    if (!conversacionId) {
      setMensajes([]);
      return;
    }

    let cancelled = false;

    const cargarInicial = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await getMensajes(supabase, conversacionId);
        if (cancelled) return;
        setMensajes(data);
        await markConversacionAsRead(
          supabase,
          conversacionId,
          currentUserUuid,
        );
        if (!cancelled) notificarPadre();
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Error al cargar mensajes",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    cargarInicial();

    return () => {
      cancelled = true;
    };
  }, [conversacionId, currentUserUuid, notificarPadre, supabase]);

  useEffect(() => {
    scrollToBottom();
  }, [mensajes, scrollToBottom]);

  useEffect(() => {
    if (!conversacionId) return;

    const channel = supabase
      .channel(`chat-mensajes:${conversacionId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "mensajes",
          filter: `conversacion_id=eq.${conversacionId}`,
        },
        (payload) => {
          const nuevo = payload.new as Mensaje;
          setMensajes((prev) => {
            if (prev.some((m) => m.id === nuevo.id)) return prev;
            return [...prev, nuevo];
          });

          if (nuevo.remitente_uuid !== currentUserUuid) {
            markConversacionAsRead(
              supabase,
              conversacionId,
              currentUserUuid,
            ).then(() => notificarPadre());
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversacionId, currentUserUuid, notificarPadre, supabase]);

  useEffect(() => {
    return () => {
      if (notifyTimerRef.current) clearTimeout(notifyTimerRef.current);
    };
  }, []);

  const handleEnviar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!conversacionId || !texto.trim() || sending) return;

    setSending(true);
    setError(null);
    try {
      const mensaje = await sendMensaje(
        supabase,
        conversacionId,
        currentUserUuid,
        texto,
      );
      setTexto("");
      setMensajes((prev) => {
        if (prev.some((m) => m.id === mensaje.id)) return prev;
        return [...prev, mensaje];
      });
      notificarPadre();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al enviar mensaje");
    } finally {
      setSending(false);
    }
  };

  if (!conversacion) {
    return (
      <div className="flex h-full flex-col items-center justify-center bg-muted/20 p-8 text-center">
        <p className="text-lg font-medium text-muted-foreground">
          Seleccioná una conversación
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          O iniciá un chat nuevo con otro usuario
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 border-b bg-card px-4 py-3">
        {onBack && (
          <Button variant="ghost" size="icon" onClick={onBack} className="md:hidden">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        )}
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-700">
          {(conversacion.otro_usuario?.nombre ?? "?").charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0">
          <p className="truncate font-semibold">
            {conversacion.otro_usuario?.nombre ?? "Usuario"}
          </p>
          <p className="truncate text-xs text-muted-foreground">
            {conversacion.otro_usuario?.email}
          </p>
        </div>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto bg-muted/10 p-4">
        {loading && mensajes.length === 0 && (
          <p className="text-center text-sm text-muted-foreground">
            Cargando mensajes...
          </p>
        )}

        {!loading && mensajes.length === 0 && (
          <p className="text-center text-sm text-muted-foreground">
            Todavía no hay mensajes. ¡Enviá el primero!
          </p>
        )}

        {mensajes.map((mensaje) => (
          <MessageBubble
            key={mensaje.id}
            mensaje={mensaje}
            esPropio={mensaje.remitente_uuid === currentUserUuid}
            nombreRemitente={
              mensaje.remitente_uuid !== currentUserUuid
                ? conversacion.otro_usuario?.nombre
                : undefined
            }
          />
        ))}
        <div ref={bottomRef} />
      </div>

      {error && (
        <p className="border-b bg-red-50 px-4 py-2 text-sm text-red-600">
          {error}
        </p>
      )}

      <form
        onSubmit={handleEnviar}
        className="flex items-end gap-2 border-t bg-card p-4"
      >
        <textarea
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder="Escribí un mensaje..."
          rows={2}
          className="min-h-[44px] flex-1 resize-none rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleEnviar(e);
            }
          }}
        />
        <Button
          type="submit"
          disabled={!texto.trim() || sending}
          className="shrink-0"
        >
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </div>
  );
}
