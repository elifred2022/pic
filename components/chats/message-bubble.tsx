"use client";

import { Check, CheckCheck } from "lucide-react";
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

export function MessageBubble({
  mensaje,
  esPropio,
  nombreRemitente,
  leido = false,
}: MessageBubbleProps) {
  return (
    <div
      className={cn(
        "flex w-full",
        esPropio ? "justify-end" : "justify-start",
      )}
    >
      <div
        className={cn(
          "max-w-[75%] rounded-2xl px-4 py-2 shadow-sm",
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
        <p className="whitespace-pre-wrap break-words text-sm">
          {mensaje.contenido}
        </p>
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
