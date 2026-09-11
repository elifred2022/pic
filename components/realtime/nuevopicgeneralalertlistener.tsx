"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { fetchUserRolByUuid } from "@/lib/user-rol";
import {
  isAdminEmail,
  isAprobEmail,
  isPanolEmail,
} from "@/lib/panol-access";

export const NUEVO_PIC_GENERAL_EVENT = "pic:nuevo-pedido-general";

type PedidoGeneralRow = {
  id?: string | number;
  sector?: string | null;
  solicita?: string | null;
  estado?: string | null;
};

function textoCampo(value: unknown, fallback = "—"): string {
  const texto = String(value ?? "").trim();
  return texto || fallback;
}

function normalizarEstado(value: unknown): string {
  return String(value ?? "").trim().toLowerCase();
}

function idPedido(value: unknown): string {
  return String(value ?? "").trim();
}

let ultimoAviso = "";
let ultimoAvisoAt = 0;

function mostrarAlert(mensaje: string) {
  const now = Date.now();
  if (mensaje === ultimoAviso && now - ultimoAvisoAt < 2000) return;
  ultimoAviso = mensaje;
  ultimoAvisoAt = now;
  window.alert(mensaje);
}

export default function NuevoPicGeneralAlertListener() {
  useEffect(() => {
    const supabase = createClient();
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let cancelled = false;
    const estadoPorId = new Map<string, string>();

    const removeChannel = () => {
      if (!channel) return;
      const active = channel;
      channel = null;
      void active.unsubscribe().finally(() => {
        supabase.removeChannel(active);
      });
    };

    const avisar = (pedido: PedidoGeneralRow, mensaje: string) => {
      window.dispatchEvent(
        new CustomEvent(NUEVO_PIC_GENERAL_EVENT, { detail: pedido })
      );
      setTimeout(() => {
        mostrarAlert(mensaje);
      }, 100);
    };

    const setup = async () => {
      removeChannel();
      estadoPorId.clear();

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (cancelled || !user) return;

      const rol = await fetchUserRolByUuid(supabase, user.id);
      if (cancelled) return;

      const email = user.email ?? null;
      if (
        !isAdminEmail(email, rol) &&
        !isAprobEmail(email, rol) &&
        !isPanolEmail(email, rol)
      ) {
        return;
      }

      const { data: pedidos } = await supabase.from("pic").select("id, estado");
      if (cancelled) return;

      for (const pedido of pedidos ?? []) {
        const id = idPedido(pedido.id);
        if (id) estadoPorId.set(id, textoCampo(pedido.estado, ""));
      }

      channel = supabase
        .channel(`nuevo-pic-general-alert:${user.id}`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "pic" },
          (payload) => {
            const pedido = (payload.new ?? {}) as PedidoGeneralRow;
            const anterior = (payload.old ?? {}) as PedidoGeneralRow;
            const id = idPedido(pedido.id ?? anterior.id);
            const sector = textoCampo(pedido.sector ?? anterior.sector);
            const solicitante = textoCampo(pedido.solicita ?? anterior.solicita);

            if (payload.eventType === "INSERT") {
              if (id) estadoPorId.set(id, textoCampo(pedido.estado, ""));
              avisar(
                pedido,
                `Nuevo PIC #${textoCampo(pedido.id)}\nSector: ${sector}\nSolicitante: ${solicitante}`
              );
              return;
            }

            if (payload.eventType !== "UPDATE" || !id) return;

            const estadoNuevo = textoCampo(pedido.estado, "");
            if (!estadoNuevo) return;

            const estadoAnterior =
              textoCampo(anterior.estado, "") || estadoPorId.get(id) || "";
            estadoPorId.set(id, estadoNuevo);

            if (
              !estadoAnterior ||
              normalizarEstado(estadoAnterior) === normalizarEstado(estadoNuevo)
            ) {
              return;
            }

            avisar(
              pedido,
              `PIC #${id}\nSector: ${sector}\nSolicitante: ${solicitante}\nCambió de ${estadoAnterior} a ${estadoNuevo}`
            );
          }
        )
        .subscribe();
    };

    void setup();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "INITIAL_SESSION") return;
      void setup();
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
      removeChannel();
    };
  }, []);

  return null;
}
