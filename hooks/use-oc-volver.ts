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

  /** OC vinculada a un pedido concreto (por Nº OC del pedido, no por ?oc= global en la URL). */
  const resolveOcParaPedido = useCallback(
    async (pedido: {
      id: string;
      numero_oc?: string | number | null;
    }): Promise<OcVolver | null> => {
      if (
        pedido.numero_oc != null &&
        pedido.numero_oc !== "" &&
        pedido.numero_oc !== "-"
      ) {
        const byNoc = await resolvePorNoc(pedido.numero_oc);
        if (byNoc) return byNoc;
      }

      const urlOc = searchParams.get("oc");
      const urlComparativa = searchParams.get("comparativa");
      if (urlOc && urlComparativa === String(pedido.id)) {
        return {
          id: urlOc,
          noc: searchParams.get("noc"),
        };
      }

      return null;
    },
    [searchParams, resolvePorNoc]
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

  return { ocVolver, ensureOcVolver, setOcVolver, resolveOcParaPedido };
}
