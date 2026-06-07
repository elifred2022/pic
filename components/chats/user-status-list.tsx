"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { UsuarioChat } from "./types";

type UserStatusListProps = {
  usuarios: UsuarioChat[];
  onlineUuids: Set<string>;
  loading?: boolean;
  onSelectUser: (usuario: UsuarioChat) => void;
  disabled?: boolean;
  searchPlaceholder?: string;
  showSearch?: boolean;
};

function sortUsuarios(
  usuarios: UsuarioChat[],
  onlineUuids: Set<string>,
): UsuarioChat[] {
  return [...usuarios].sort((a, b) => {
    const aOnline = onlineUuids.has(a.uuid) ? 0 : 1;
    const bOnline = onlineUuids.has(b.uuid) ? 0 : 1;
    if (aOnline !== bOnline) return aOnline - bOnline;
    return a.nombre.localeCompare(b.nombre, "es");
  });
}

export function UserStatusList({
  usuarios,
  onlineUuids,
  loading = false,
  onSelectUser,
  disabled = false,
  searchPlaceholder = "Buscar usuario...",
  showSearch = true,
}: UserStatusListProps) {
  const [busqueda, setBusqueda] = useState("");

  const filtrados = useMemo(() => {
    const ordenados = sortUsuarios(usuarios, onlineUuids);
    const q = busqueda.trim().toLowerCase();
    if (!q) return ordenados;
    return ordenados.filter(
      (u) =>
        u.nombre.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q),
    );
  }, [busqueda, onlineUuids, usuarios]);

  const onlineCount = useMemo(
    () => usuarios.filter((u) => onlineUuids.has(u.uuid)).length,
    [onlineUuids, usuarios],
  );

  return (
    <div className="flex h-full flex-col">
      {showSearch && (
        <div className="border-b p-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder={searchPlaceholder}
              className="pl-9"
            />
          </div>
          {!loading && usuarios.length > 0 && (
            <p className="mt-2 text-xs text-muted-foreground">
              {onlineCount} en línea · {usuarios.length - onlineCount}{" "}
              desconectado{usuarios.length - onlineCount === 1 ? "" : "s"}
            </p>
          )}
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        {loading && (
          <p className="p-4 text-center text-sm text-muted-foreground">
            Cargando usuarios...
          </p>
        )}

        {!loading && filtrados.length === 0 && (
          <p className="p-4 text-center text-sm text-muted-foreground">
            {busqueda
              ? "No se encontraron usuarios."
              : "No hay usuarios disponibles."}
          </p>
        )}

        {filtrados.map((usuario) => {
          const enLinea = onlineUuids.has(usuario.uuid);
          return (
            <button
              key={usuario.uuid}
              type="button"
              disabled={disabled}
              onClick={() => onSelectUser(usuario)}
              className="flex w-full items-center gap-3 border-b px-4 py-3 text-left transition-colors hover:bg-accent/50 disabled:opacity-50"
            >
              <div className="relative shrink-0">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-700">
                  {usuario.nombre.charAt(0).toUpperCase()}
                </div>
                <span
                  className={cn(
                    "absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-card",
                    enLinea ? "bg-green-500" : "bg-red-500",
                  )}
                  title={enLinea ? "En línea" : "Desconectado"}
                />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{usuario.nombre}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {usuario.email}
                </p>
              </div>
              <span
                className={cn(
                  "shrink-0 text-xs font-medium",
                  enLinea ? "text-green-600" : "text-red-500",
                )}
              >
                {enLinea ? "En línea" : "Desconectado"}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function buildOnlineUuidSet(onlineUsers: UsuarioChat[]): Set<string> {
  return new Set(onlineUsers.map((u) => u.uuid));
}
