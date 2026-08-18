"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  getPresupuestoViewUrl,
  parseArticuloImagenes,
} from "@/lib/presupuestos-storage";

type Props = {
  paths?: unknown;
  className?: string;
};

export function ArticuloImagenesThumbs({ paths, className }: Props) {
  const supabase = useMemo(() => createClient(), []);
  const parsed = useMemo(() => parseArticuloImagenes(paths), [paths]);
  const [urls, setUrls] = useState<string[]>([]);

  useEffect(() => {
    if (parsed.length === 0) {
      setUrls([]);
      return;
    }

    let cancelled = false;

    const cargar = async () => {
      const next = await Promise.all(
        parsed.map((path) => getPresupuestoViewUrl(supabase, path))
      );
      if (!cancelled) {
        setUrls(next.map((url) => url || ""));
      }
    };

    void cargar();
    return () => {
      cancelled = true;
    };
  }, [parsed, supabase]);

  if (parsed.length === 0) return null;

  return (
    <div className={`mt-1 flex flex-wrap gap-1 ${className ?? ""}`}>
      {parsed.map((path, index) => {
        const url = urls[index];
        if (!url) {
          return (
            <span
              key={path}
              className="inline-flex h-10 w-10 items-center justify-center rounded border border-gray-200 bg-gray-50 text-[10px] text-gray-500"
            >
              📷
            </span>
          );
        }
        return (
          <a
            key={path}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            title="Ver imagen adjunta"
            className="block"
          >
            <img
              src={url}
              alt={`Imagen ${index + 1}`}
              className="h-10 w-10 rounded border border-gray-200 object-cover"
            />
          </a>
        );
      })}
    </div>
  );
}
