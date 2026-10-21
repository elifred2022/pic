import type { SupabaseClient } from "@supabase/supabase-js";
import { parsePicFromArticuloId } from "@/lib/pic-links";
import { appendHistoricoEstado } from "@/lib/historico-estado-pedidos-productivos";

type PicAfectado = { tipo: "productivo" | "general"; pedidoId: string };

function picsDesdeArticulos(articuloIds: string[]): PicAfectado[] {
  const map = new Map<string, PicAfectado>();
  for (const articuloId of articuloIds) {
    const parsed = parsePicFromArticuloId(articuloId);
    if ((parsed.tipo !== "productivo" && parsed.tipo !== "general") || !parsed.pedidoId) {
      continue;
    }
    map.set(`${parsed.tipo}:${parsed.pedidoId}`, {
      tipo: parsed.tipo,
      pedidoId: parsed.pedidoId,
    });
  }
  return [...map.values()];
}

/** Pasa a confirmado los PIC vinculados a los artículos de una orden pendiente. */
export async function confirmarPicsAfectados(
  supabase: SupabaseClient,
  articuloIds: string[],
  nombreUsuario: string | null
) {
  const pics = picsDesdeArticulos(articuloIds);
  if (pics.length === 0) return;

  const productivos = pics
    .filter((pic) => pic.tipo === "productivo")
    .map((pic) => pic.pedidoId);
  const generales = pics
    .filter((pic) => pic.tipo === "general")
    .map((pic) => pic.pedidoId);

  const vacio = Promise.resolve({
    data: [] as { id: string | number; estado?: string | null; historico_estado?: unknown }[],
    error: null,
  });

  const [prodRes, genRes] = await Promise.all([
    productivos.length
      ? supabase
          .from("pedidos_productivos")
          .select("id, estado, historico_estado")
          .in("id", productivos)
      : vacio,
    generales.length
      ? supabase.from("pic").select("id, estado, historico_estado").in("id", generales)
      : vacio,
  ]);
  if (prodRes.error) throw prodRes.error;
  if (genRes.error) throw genRes.error;

  const actual = new Map<string, { estado: string; historico_estado: unknown }>();
  for (const row of prodRes.data ?? []) {
    actual.set(`productivo:${String(row.id)}`, {
      estado: String(row.estado ?? ""),
      historico_estado: row.historico_estado,
    });
  }
  for (const row of genRes.data ?? []) {
    actual.set(`general:${String(row.id)}`, {
      estado: String(row.estado ?? ""),
      historico_estado: row.historico_estado,
    });
  }

  await Promise.all(
    pics.map(async (pic) => {
      const row = actual.get(`${pic.tipo}:${pic.pedidoId}`);
      const estadoActual = row?.estado ?? "";
      if (estadoActual.trim().toLowerCase() === "confirmado") return;

      const historicoNuevo = appendHistoricoEstado(
        row?.historico_estado,
        estadoActual,
        "confirmado",
        nombreUsuario
      );
      const payload: Record<string, unknown> = { estado: "confirmado" };
      if (historicoNuevo) payload.historico_estado = historicoNuevo;

      const tabla = pic.tipo === "productivo" ? "pedidos_productivos" : "pic";
      const { error } = await supabase.from(tabla).update(payload).eq("id", pic.pedidoId);
      if (error) throw error;
    })
  );
}
