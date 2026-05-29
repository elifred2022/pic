"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export type OcVolver = {
  id: string;
  noc: string | null;
};

export function useOcVolver() {
  const searchParams = useSearchParams();
  const supabase = createClient();
  const [ocVolver, setOcVolver] = useState<OcVolver | null>(null);

  useEffect(() => {
    const oc = searchParams.get("oc");
    if (!oc) return;
    setOcVolver({
      id: oc,
      noc: searchParams.get("noc"),
    });
  }, [searchParams]);

  const resolvePorNoc = useCallback(
    async (noc: string | number | null | undefined): Promise<OcVolver | null> => {
      if (noc == null || noc === "" || noc === "-") return null;

      const nocNum = Number(noc);
      const query = supabase.from("ordenes_compra").select("id, noc");

      const { data, error } = Number.isFinite(nocNum)
        ? await query.eq("noc", nocNum).maybeSingle()
        : await query.eq("noc", noc).maybeSingle();

      if (error || !data?.id) return null;

      return {
        id: String(data.id),
        noc: data.noc != null ? String(data.noc) : null,
      };
    },
    [supabase]
  );

  const ensureOcVolver = useCallback(
    async (nocPedido?: string | number | null) => {
      const oc = searchParams.get("oc");
      if (oc) {
        setOcVolver({
          id: oc,
          noc: searchParams.get("noc"),
        });
        return;
      }

      if (nocPedido != null && nocPedido !== "" && nocPedido !== "-") {
        const resolved = await resolvePorNoc(nocPedido);
        if (resolved) setOcVolver(resolved);
      }
    },
    [searchParams, resolvePorNoc]
  );

  return { ocVolver, ensureOcVolver, setOcVolver };
}
