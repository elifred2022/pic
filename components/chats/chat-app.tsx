"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChatUsersIcon } from "./chat-users-icon";
import { ConversationList, NewChatPanel } from "./conversation-list";
import { ChatWindow } from "./chat-window";
import {
  getOrCreateDirectConversation,
  listConversaciones,
  listUsuarios,
} from "./chat-api";
import { useOnlinePresence } from "./use-online-presence";
import { CHAT_INCOMING_MESSAGE_EVENT } from "./chat-notification-state";
import type { ConversacionResumen, UsuarioChat } from "./types";

export function ChatApp() {
  const supabase = createClient();
  const [currentUserUuid, setCurrentUserUuid] = useState<string | null>(null);
  const [conversaciones, setConversaciones] = useState<ConversacionResumen[]>(
    [],
  );
  const [usuarios, setUsuarios] = useState<UsuarioChat[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showNewChat, setShowNewChat] = useState(false);
  const [loadingConv, setLoadingConv] = useState(true);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mobileShowChat, setMobileShowChat] = useState(false);

  const { onlineUuidSet } = useOnlinePresence(!!currentUserUuid);

  const cargarConversaciones = useCallback(
    async (silent = false) => {
      if (!currentUserUuid) return;
      if (!silent) setLoadingConv(true);
      if (!silent) setError(null);
      try {
        const data = await listConversaciones(supabase, currentUserUuid);
        setConversaciones(data);
      } catch (err) {
        if (!silent) {
          setError(
            err instanceof Error ? err.message : "Error al cargar conversaciones",
          );
        }
      } finally {
        if (!silent) setLoadingConv(false);
      }
    },
    [currentUserUuid, supabase],
  );

  const actualizarListaRef = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );

  const actualizarListaSilenciosa = useCallback(() => {
    if (actualizarListaRef.current) clearTimeout(actualizarListaRef.current);
    actualizarListaRef.current = setTimeout(() => {
      cargarConversaciones(true);
    }, 500);
  }, [cargarConversaciones]);

  useEffect(() => {
    const init = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setError("Debés iniciar sesión para usar el chat.");
        setLoadingConv(false);
        return;
      }
      setCurrentUserUuid(user.id);
    };
    init();
  }, [supabase]);

  useEffect(() => {
    if (currentUserUuid) cargarConversaciones();
  }, [cargarConversaciones, currentUserUuid]);

  useEffect(() => {
    const onIncomingMessage = () => {
      actualizarListaSilenciosa();
    };

    window.addEventListener(CHAT_INCOMING_MESSAGE_EVENT, onIncomingMessage);
    return () => {
      window.removeEventListener(CHAT_INCOMING_MESSAGE_EVENT, onIncomingMessage);
      if (actualizarListaRef.current) clearTimeout(actualizarListaRef.current);
    };
  }, [actualizarListaSilenciosa]);

  useEffect(() => {
    if (!currentUserUuid || !showNewChat) return;

    const cargarUsuarios = async () => {
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
    };

    cargarUsuarios();
  }, [currentUserUuid, showNewChat, supabase]);

  const conversacionSeleccionada = useMemo(
    () => conversaciones.find((c) => c.id === selectedId) ?? null,
    [conversaciones, selectedId],
  );

  const handleSelectConversacion = (id: string) => {
    setSelectedId(id);
    setShowNewChat(false);
    setMobileShowChat(true);
  };

  const handleNewChat = () => {
    setShowNewChat(true);
    setSelectedId(null);
    setMobileShowChat(false);
  };

  const handleSelectUser = async (usuario: UsuarioChat) => {
    if (!currentUserUuid) return;
    setError(null);
    try {
      const conversacionId = await getOrCreateDirectConversation(
        supabase,
        currentUserUuid,
        usuario.uuid,
      );
      await cargarConversaciones();
      setSelectedId(conversacionId);
      setShowNewChat(false);
      setMobileShowChat(true);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Error al crear conversación",
      );
    }
  };

  if (!currentUserUuid && !loadingConv) {
    return (
      <Card className="p-8 text-center">
        <p className="text-red-600">{error ?? "Sesión no válida"}</p>
      </Card>
    );
  }

  return (
    <div className="w-full">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <ChatUsersIcon className="h-8 w-8 text-blue-600" />
          <div>
            <h1 className="text-2xl font-bold">Chat interno</h1>
            <p className="text-sm text-muted-foreground">
              Mensajes entre usuarios de PIC P&S
            </p>
          </div>
        </div>
        <Button asChild variant="outline" className="shrink-0">
          <Link href="/protected">← Volver a home</Link>
        </Button>
      </div>

      {error && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      <Card className="overflow-hidden">
        <div className="grid h-[min(72vh,720px)] grid-cols-1 md:grid-cols-[320px_1fr]">
          <div
            className={`h-full min-h-0 ${
              mobileShowChat ? "hidden md:block" : "block"
            }`}
          >
            {showNewChat ? (
              <NewChatPanel
                usuarios={usuarios}
                onlineUuids={onlineUuidSet}
                loading={loadingUsers}
                onSelectUser={handleSelectUser}
                onCancel={() => setShowNewChat(false)}
              />
            ) : (
              <ConversationList
                conversaciones={conversaciones}
                selectedId={selectedId}
                loading={loadingConv}
                onSelect={handleSelectConversacion}
                onNewChat={handleNewChat}
              />
            )}
          </div>

          <div
            className={`h-full min-h-0 ${
              mobileShowChat ? "block" : "hidden md:block"
            }`}
          >
            <ChatWindow
              conversacion={conversacionSeleccionada}
              currentUserUuid={currentUserUuid ?? ""}
              onBack={() => setMobileShowChat(false)}
              onMessageSent={actualizarListaSilenciosa}
            />
          </div>
        </div>
      </Card>
    </div>
  );
}
