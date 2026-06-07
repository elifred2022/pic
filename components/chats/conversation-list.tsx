"use client";

import { useMemo, useState } from "react";
import { Search, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { UserStatusList } from "./user-status-list";
import type { ConversacionResumen, UsuarioChat } from "./types";

type ConversationListProps = {
  conversaciones: ConversacionResumen[];
  selectedId: string | null;
  loading: boolean;
  onSelect: (id: string) => void;
  onNewChat: () => void;
};

function formatFecha(fecha: string) {
  const d = new Date(fecha);
  const hoy = new Date();
  const ayer = new Date();
  ayer.setDate(hoy.getDate() - 1);

  if (d.toDateString() === hoy.toDateString()) {
    return d.toLocaleTimeString("es-AR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }
  if (d.toDateString() === ayer.toDateString()) return "Ayer";
  return d.toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit" });
}

export function ConversationList({
  conversaciones,
  selectedId,
  loading,
  onSelect,
  onNewChat,
}: ConversationListProps) {
  const [busqueda, setBusqueda] = useState("");

  const filtradas = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return conversaciones;
    return conversaciones.filter((c) => {
      const nombre = c.otro_usuario?.nombre?.toLowerCase() ?? "";
      const email = c.otro_usuario?.email?.toLowerCase() ?? "";
      const preview = c.ultimo_mensaje?.contenido?.toLowerCase() ?? "";
      return nombre.includes(q) || email.includes(q) || preview.includes(q);
    });
  }, [busqueda, conversaciones]);

  return (
    <div className="flex h-full flex-col border-r bg-card">
      <div className="border-b p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold">Mensajes</h2>
          <Button size="sm" onClick={onNewChat} className="gap-1">
            <UserPlus className="h-4 w-4" />
            Nuevo
          </Button>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar conversación..."
            className="pl-9"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading && (
          <p className="p-4 text-center text-sm text-muted-foreground">
            Cargando conversaciones...
          </p>
        )}

        {!loading && filtradas.length === 0 && (
          <p className="p-4 text-center text-sm text-muted-foreground">
            {busqueda
              ? "No hay resultados para tu búsqueda."
              : "No tenés conversaciones. Iniciá un chat nuevo."}
          </p>
        )}

        {filtradas.map((conv) => (
          <button
            key={conv.id}
            type="button"
            onClick={() => onSelect(conv.id)}
            className={cn(
              "flex w-full items-start gap-3 border-b px-4 py-3 text-left transition-colors hover:bg-accent/50",
              selectedId === conv.id && "bg-accent",
            )}
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-700">
              {(conv.otro_usuario?.nombre ?? "?").charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <p className="truncate font-semibold">
                  {conv.otro_usuario?.nombre ?? "Usuario"}
                </p>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {formatFecha(conv.updated_at)}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <p className="truncate text-sm text-muted-foreground">
                  {conv.ultimo_mensaje?.contenido ?? "Sin mensajes aún"}
                </p>
                {conv.no_leidos > 0 && (
                  <Badge className="shrink-0">{conv.no_leidos}</Badge>
                )}
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

type NewChatPanelProps = {
  usuarios: UsuarioChat[];
  onlineUuids: Set<string>;
  loading: boolean;
  onSelectUser: (usuario: UsuarioChat) => void;
  onCancel: () => void;
};

export function NewChatPanel({
  usuarios,
  onlineUuids,
  loading,
  onSelectUser,
  onCancel,
}: NewChatPanelProps) {
  return (
    <div className="flex h-full flex-col">
      <div className="border-b p-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-semibold">Nuevo chat</h3>
          <Button variant="outline" size="sm" onClick={onCancel}>
            Cancelar
          </Button>
        </div>
      </div>

      <UserStatusList
        usuarios={usuarios}
        onlineUuids={onlineUuids}
        loading={loading}
        onSelectUser={onSelectUser}
        searchPlaceholder="Buscar usuario..."
        showSearch
      />
    </div>
  );
}
