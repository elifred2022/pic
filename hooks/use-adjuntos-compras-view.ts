"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { getFacturaViewUrl, parseFacturasFromOrden } from "@/lib/fact-compras-storage";
import { getPresupuestoViewUrl } from "@/lib/presupuestos-storage";

type ProveedorConPresupuesto = {
  presupuesto_path?: string | null;
};

export function useComparativaPresupuestoUrls(
  comparativaProv: ProveedorConPresupuesto[] | null | undefined
) {
  const supabase = createClient();
  const [urls, setUrls] = useState<Record<number, string | null>>({});

  const pathsKey =
    comparativaProv?.map((p) => p.presupuesto_path ?? "").join("|") ?? "";

  useEffect(() => {
    if (!comparativaProv?.length) {
      setUrls({});
      return;
    }

    let cancelled = false;

    const cargar = async () => {
      const next: Record<number, string | null> = {};
      await Promise.all(
        comparativaProv.map(async (prov, i) => {
          if (prov.presupuesto_path) {
            next[i] = await getPresupuestoViewUrl(supabase, prov.presupuesto_path);
          }
        })
      );
      if (!cancelled) setUrls(next);
    };

    void cargar();
    return () => {
      cancelled = true;
    };
  }, [pathsKey, supabase]);

  return urls;
}

export function useOcFacturaAdjunto(ocId: string | null | undefined) {
  const supabase = createClient();
  const [facturaViewUrl, setFacturaViewUrl] = useState<string | null>(null);
  const [facturaFc, setFacturaFc] = useState("");

  useEffect(() => {
    if (!ocId) {
      setFacturaViewUrl(null);
      setFacturaFc("");
      return;
    }

    let cancelled = false;

    const cargar = async () => {
      const { data, error } = await supabase
        .from("ordenes_compra")
        .select("fc, fact_path")
        .eq("id", ocId)
        .maybeSingle();

      if (cancelled || error || !data) {
        if (!cancelled) {
          setFacturaViewUrl(null);
          setFacturaFc("");
        }
        return;
      }

      const facturas = parseFacturasFromOrden(data);
      const primera = facturas[0];
      setFacturaFc(primera?.fc != null ? String(primera.fc) : "");

      if (primera?.path) {
        const url = await getFacturaViewUrl(supabase, primera.path);
        if (!cancelled) setFacturaViewUrl(url);
      } else if (!cancelled) {
        setFacturaViewUrl(null);
      }
    };

    void cargar();
    return () => {
      cancelled = true;
    };
  }, [ocId, supabase]);

  return { facturaViewUrl, facturaFc };
}
