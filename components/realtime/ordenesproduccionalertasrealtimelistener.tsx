"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { canAccessOrdenesProduccion } from "@/lib/panol-access";
import { fetchUserRolByUuid } from "@/lib/user-rol";

const STORAGE_KEY = "ordenes_produccion_alertas_dismissed";

type OrdenProduccionPayload = {
  id: string;
  num_carpeta: string | null;
  obra: string | null;
  alertas: string | null;
};

type AlertToShow = {
  ordenId: string;
  obra: string;
  numCarpeta: string;
  alertas: string;
};

function getDismissedSet(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw) as string[];
    return new Set(Array.isArray(arr) ? arr : []);
  } catch {
    return new Set();
  }
}

function addDismissed(key: string) {
  if (typeof window === "undefined") return;
  try {
    const set = getDismissedSet();
    set.add(key);
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...set]));
  } catch {
    // ignore
  }
}

function makeDismissKey(ordenId: string, alertas: string): string {
  return `${ordenId}::${alertas}`;
}

export default function OrdenesProduccionAlertasRealtimeListener() {
  const [alertToShow, setAlertToShow] = useState<AlertToShow | null>(null);

  useEffect(() => {
    const supabase = createClient();
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let cancelled = false;

    const checkAndShow = async (payload: OrdenProduccionPayload) => {
      const { data } = await supabase.auth.getUser();
      const user = data?.user;
      const email = user?.email;
      const rol = user ? await fetchUserRolByUuid(supabase, user.id) : null;
      if (!email || !canAccessOrdenesProduccion(email, rol)) {
        return;
      }

      const alertas = (payload?.alertas ?? "").toString().trim();
      if (!alertas) {
        return;
      }

      const dismissKey = makeDismissKey(payload.id, alertas);
      if (getDismissedSet().has(dismissKey)) {
        return;
      }

      setAlertToShow({
        ordenId: payload.id,
        obra: (payload.obra ?? "").trim() || "—",
        numCarpeta: (payload.num_carpeta ?? "").toString().trim() || "—",
        alertas,
      });
    };

    const teardownChannel = () => {
      if (!channel) return;
      const activeChannel = channel;
      channel = null;
      void activeChannel.unsubscribe().finally(() => {
        supabase.removeChannel(activeChannel);
      });
    };

    const setup = async () => {
      teardownChannel();

      const { data } = await supabase.auth.getUser();
      if (cancelled) return;

      const user = data?.user;
      const email = user?.email;
      const rol = user ? await fetchUserRolByUuid(supabase, user.id) : null;
      if (!email || !canAccessOrdenesProduccion(email, rol)) {
        return;
      }

      channel = supabase
      .channel("ordenes-produccion-alertas")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "ordenes_produccion" },
        (payload) => {
          const newRow = payload.new as OrdenProduccionPayload;
          checkAndShow(newRow);
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "ordenes_produccion" },
        (payload) => {
          const newRow = payload.new as OrdenProduccionPayload;
          const oldRow = payload.old as OrdenProduccionPayload | undefined;
          const alertasNew = (newRow?.alertas ?? "").toString().trim();
          const alertasOld = (oldRow?.alertas ?? "").toString().trim();
          if (!alertasNew) return;
          if (alertasOld && alertasNew === alertasOld) return;
          checkAndShow(newRow);
        }
      )
      .subscribe();
    };

    void setup();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      // INITIAL_SESSION dispara al montar; setup() ya corre arriba.
      if (event === "INITIAL_SESSION") return;
      void setup();
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
      teardownChannel();
    };
  }, []);

  const handleClose = () => {
    if (!alertToShow) return;
    const dismissKey = makeDismissKey(alertToShow.ordenId, alertToShow.alertas);
    addDismissed(dismissKey);
    setAlertToShow(null);
    window.location.reload();
  };

  if (!alertToShow) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="alertas-title"
    >
      <div className="mx-4 max-w-md rounded-xl bg-white p-6 shadow-2xl">
        <h2 id="alertas-title" className="mb-4 text-lg font-bold text-gray-900">
          🚨 Nueva alerta en orden de producción
        </h2>
        <div className="space-y-2 text-gray-700">
          <p>
            <strong>Obra:</strong> {alertToShow.obra}
          </p>
          <p>
            <strong>Nº Carpeta:</strong> {alertToShow.numCarpeta}
          </p>
          <p>
            <strong>Alerta:</strong> {alertToShow.alertas}
          </p>
        </div>
        <div className="mt-6 flex justify-end">
          <button
            onClick={handleClose}
            className="rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
