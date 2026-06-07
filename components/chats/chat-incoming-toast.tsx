"use client";

import { X } from "lucide-react";
import { cn } from "@/lib/utils";

type ChatIncomingToastProps = {
  nombre: string;
  contenido: string;
  onClose: () => void;
  onClick: () => void;
  className?: string;
};

function truncate(texto: string, max = 60) {
  const limpio = texto.trim();
  if (limpio.length <= max) return limpio;
  return `${limpio.slice(0, max)}...`;
}

export function ChatIncomingToast({
  nombre,
  contenido,
  onClose,
  onClick,
  className,
}: ChatIncomingToastProps) {
  return (
    <div
      className={cn(
        "relative animate-in slide-in-from-bottom-2 fade-in w-[min(92vw,320px)] rounded-xl border bg-card shadow-xl",
        className,
      )}
    >
      <button
        type="button"
        onClick={onClick}
        className="flex w-full items-start gap-3 p-3 pr-10 text-left transition-colors hover:bg-accent/40"
      >
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-700">
          {nombre.charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{nombre}</p>
          <p className="line-clamp-2 text-xs text-muted-foreground">
            {truncate(contenido)}
          </p>
        </div>
      </button>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        className="absolute right-2 top-2 rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
        aria-label="Cerrar aviso"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
