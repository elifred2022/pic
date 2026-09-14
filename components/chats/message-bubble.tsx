"use client";

import { useEffect, useState } from "react";
import { Check, CheckCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { getChatImagenViewUrl } from "@/lib/chat-storage";
import { cn } from "@/lib/utils";
import type { Mensaje } from "./types";

type MessageBubbleProps = {
  mensaje: Mensaje;
  esPropio: boolean;
  nombreRemitente?: string;
  leido?: boolean;
};

function formatHora(fecha: string) {
  return new Date(fecha).toLocaleTimeString("es-AR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function ChatImagen({ path }: { path: string }) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();
    void getChatImagenViewUrl(supabase, path).then((next) => {
      if (!cancelled) setUrl(next);
    });
    return () => {
      cancelled = true;
    };
  }, [path]);

  if (!url) {
    return (
      <div className="mb-1 h-36 w-44 animate-pulse rounded-lg bg-black/10" />
    );
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className="mb-1 block overflow-hidden rounded-lg"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={url}
        alt="Foto"
        className="max-h-56 w-full max-w-[220px] object-cover"
      />
    </a>
  );
}

export function MessageBubble({
  mensaje,
  esPropio,
  nombreRemitente,
  leido = false,
}: MessageBubbleProps) {
  const texto = mensaje.contenido?.trim() ?? "";
  const imagenPath = mensaje.imagen_path?.trim() || "";

  return (
    <div
      className={cn(
        "flex w-full",
        esPropio ? "justify-end" : "justify-start",
      )}
    >
      <div
        className={cn(
          "max-w-[75%] rounded-2xl px-3 py-2 shadow-sm",
          esPropio
            ? "rounded-br-md bg-blue-600 text-white"
            : "rounded-bl-md bg-muted text-foreground",
        )}
      >
        {!esPropio && nombreRemitente && (
          <p className="mb-1 text-xs font-semibold text-blue-700">
            {nombreRemitente}
          </p>
        )}
        {imagenPath ? <ChatImagen path={imagenPath} /> : null}
        {texto ? (
          <p className="whitespace-pre-wrap break-words text-sm">{texto}</p>
        ) : null}
        <div
          className={cn(
            "mt-1 flex items-center justify-end gap-1",
            esPropio ? "text-blue-100" : "text-muted-foreground",
          )}
        >
          <span className="text-[10px]">{formatHora(mensaje.created_at)}</span>
          {esPropio &&
            (leido ? (
              <CheckCheck
                className="h-3.5 w-3.5 shrink-0"
                aria-label="Leído"
              />
            ) : (
              <Check className="h-3.5 w-3.5 shrink-0" aria-label="Enviado" />
            ))}
        </div>
      </div>
    </div>
  );
}
