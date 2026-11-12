"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { getPresupuestoViewUrl } from "@/lib/presupuestos-storage";

type Props = {
  path?: string | null;
  size?: "compact" | "card";
};

function esPdf(path: string) {
  return /\.pdf$/i.test(path.split("?")[0] ?? path);
}

export function DocumentoPedidoLink({ path, size = "card" }: Props) {
  const supabase = useMemo(() => createClient(), []);
  const stored = path?.trim() || "";
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!stored) {
      setUrl(null);
      return;
    }

    let cancelled = false;
    void getPresupuestoViewUrl(supabase, stored).then((next) => {
      if (!cancelled) setUrl(next);
    });

    return () => {
      cancelled = true;
    };
  }, [stored, supabase]);

  if (!stored) return null;

  const pdf = esPdf(stored);
  const marco = size === "compact" ? "h-16 w-12" : "h-40 w-32";
  const imagen = size === "compact" ? "h-16 w-16" : "max-h-40 max-w-[16rem]";

  if (!url) {
    return (
      <span className={`inline-flex ${marco} items-center justify-center rounded border border-gray-200 bg-gray-50 text-[10px] text-gray-500`}>
        Cargando
      </span>
    );
  }

  const vista = pdf
    ? `${url}#toolbar=0&navpanes=0&scrollbar=0&view=FitH`
    : url;

  return (
    <button
      type="button"
      title="Abrir documento"
      aria-label="Abrir documento"
      onClick={() => window.open(url, "_blank", "noopener,noreferrer")}
      className="inline-block overflow-hidden rounded border border-gray-200 bg-white p-0 hover:border-blue-500"
    >
      {pdf ? (
        <span className={`relative block ${marco} overflow-hidden`}>
          <iframe
            src={vista}
            title="Vista previa del documento"
            className="pointer-events-none h-full w-full"
            tabIndex={-1}
          />
          <span className="pointer-events-none absolute inset-x-0 bottom-0 bg-white/85 text-center text-[10px] font-medium text-gray-700">
            PDF
          </span>
        </span>
      ) : (
        <img
          src={url}
          alt="Documento cargado"
          className={`${imagen} object-cover`}
        />
      )}
    </button>
  );
}
