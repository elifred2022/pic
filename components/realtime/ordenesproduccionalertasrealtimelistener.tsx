"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { canAccessOrdenesProduccion } from "@/lib/panol-access";

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
    console.log("[Alertas OP] Iniciando listener");
    const supabase = createClient();
    let channel: ReturnType<typeof supabase.channel> | null = null;

    const checkAndShow = async (payload: OrdenProduccionPayload) => {
      const { data } = await supabase.auth.getUser();
      const email = data?.user?.email;
      if (!email || !canAccessOrdenesProduccion(email)) {
        console.log("[Alertas OP] checkAndShow: sin acceso");
        return;
      }

      const alertas = (payload?.alertas ?? "").toString().trim();
      if (!alertas) {
        console.log("[Alertas OP] checkAndShow: alertas vacío");
        return;
      }

      const dismissKey = makeDismissKey(payload.id, alertas);
      if (getDismissedSet().has(dismissKey)) {
        console.log("[Alertas OP] checkAndShow: ya cerrada por usuario");
        return;
      }

      console.log("[Alertas OP] Mostrando alerta:", payload.obra, payload.num_carpeta);
      setAlertToShow({
        ordenId: payload.id,
        obra: (payload.obra ?? "").trim() || "—",
        numCarpeta: (payload.num_carpeta ?? "").toString().trim() || "—",
        alertas,
      });
    };

    const setup = async () => {
      const { data } = await supabase.auth.getUser();
      const email = data?.user?.email;
      console.log("[Alertas OP] Usuario:", email, "Tiene acceso:", !!email && canAccessOrdenesProduccion(email));
      if (!email || !canAccessOrdenesProduccion(email)) {
        console.log("[Alertas OP] No se suscribe: usuario sin acceso");
        return;
      }

      channel = supabase
      .channel("ordenes-produccion-alertas")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "ordenes_produccion" },
        (payload) => {
          console.log("[Alertas OP] INSERT recibido:", payload);
          const newRow = payload.new as OrdenProduccionPayload;
          checkAndShow(newRow);
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "ordenes_produccion" },
        (payload) => {
          console.log("[Alertas OP] UPDATE recibido:", payload);
          const newRow = payload.new as OrdenProduccionPayload;
          const oldRow = payload.old as OrdenProduccionPayload | undefined;
          const alertasNew = (newRow?.alertas ?? "").toString().trim();
          const alertasOld = (oldRow?.alertas ?? "").toString().trim();
          if (!alertasNew) return;
          if (alertasOld && alertasNew === alertasOld) return;
          checkAndShow(newRow);
        }
      )
      .subscribe((status) => console.log("[Alertas OP] Canal estado:", status));
    };

    setup();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      if (channel) {
        supabase.removeChannel(channel);
        channel = null;
      }
      setup();
    });

    return () => {
      subscription.unsubscribe();
      if (channel) supabase.removeChannel(channel);
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
