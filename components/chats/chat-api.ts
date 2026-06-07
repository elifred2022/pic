import { createClient } from "@/lib/supabase/client";
import type { ConversacionResumen, Mensaje, UsuarioChat } from "./types";

type SupabaseClient = ReturnType<typeof createClient>;

export async function getCurrentUserUuid(
  supabase: SupabaseClient,
): Promise<string | null> {
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

export async function listUsuarios(
  supabase: SupabaseClient,
  currentUserUuid: string,
): Promise<UsuarioChat[]> {
  const { data, error } = await supabase
    .from("usuarios")
    .select("uuid, nombre, email")
    .neq("uuid", currentUserUuid)
    .order("nombre", { ascending: true });

  if (error) throw error;
  return data ?? [];
}

export async function getOrCreateDirectConversation(
  supabase: SupabaseClient,
  _currentUserUuid: string,
  otherUserUuid: string,
): Promise<string> {
  const { data, error } = await supabase.rpc("crear_conversacion_directa", {
    otro_usuario_uuid: otherUserUuid,
  });

  if (error) throw error;
  if (!data) throw new Error("No se pudo crear la conversación");

  return data as string;
}

export async function listConversaciones(
  supabase: SupabaseClient,
  currentUserUuid: string,
): Promise<ConversacionResumen[]> {
  const { data: participaciones, error: partError } = await supabase
    .from("conversacion_participantes")
    .select("conversacion_id, last_read_at")
    .eq("usuario_uuid", currentUserUuid);

  if (partError) throw partError;
  if (!participaciones?.length) return [];

  const conversationIds = participaciones.map((p) => p.conversacion_id);

  const { data: conversacionesData, error: convError } = await supabase
    .from("conversaciones")
    .select("id, tipo, updated_at")
    .in("id", conversationIds);

  if (convError) throw convError;

  const conversacionesMap = new Map(
    (conversacionesData ?? []).map((c) => [c.id, c]),
  );

  const { data: todosParticipantes, error: todosError } = await supabase
    .from("conversacion_participantes")
    .select("conversacion_id, usuario_uuid")
    .in("conversacion_id", conversationIds);

  if (todosError) throw todosError;

  const otherUuids = new Set<string>();
  const otrosPorConversacion = new Map<string, string>();

  for (const p of todosParticipantes ?? []) {
    if (p.usuario_uuid !== currentUserUuid) {
      otrosPorConversacion.set(p.conversacion_id, p.usuario_uuid);
      otherUuids.add(p.usuario_uuid);
    }
  }

  const { data: usuarios, error: usuariosError } = await supabase
    .from("usuarios")
    .select("uuid, nombre, email")
    .in("uuid", [...otherUuids]);

  if (usuariosError) throw usuariosError;

  const usuariosMap = new Map(
    (usuarios ?? []).map((u) => [u.uuid, u as UsuarioChat]),
  );

  const { data: mensajes, error: mensajesError } = await supabase
    .from("mensajes")
    .select("*")
    .in("conversacion_id", conversationIds)
    .order("created_at", { ascending: false });

  if (mensajesError) throw mensajesError;

  const ultimoMensajePorConv = new Map<string, Mensaje>();
  for (const m of (mensajes ?? []) as Mensaje[]) {
    if (!ultimoMensajePorConv.has(m.conversacion_id)) {
      ultimoMensajePorConv.set(m.conversacion_id, m);
    }
  }

  const lastReadMap = new Map(
    participaciones.map((p) => [p.conversacion_id, p.last_read_at]),
  );

  const resumenes: ConversacionResumen[] = participaciones.map((p) => {
    const conv = conversacionesMap.get(p.conversacion_id) ?? null;

    const otroUuid = otrosPorConversacion.get(p.conversacion_id);
    const ultimoMensaje =
      ultimoMensajePorConv.get(p.conversacion_id) ?? null;
    const lastReadAt = lastReadMap.get(p.conversacion_id);

    let noLeidos = 0;
    if (ultimoMensaje && ultimoMensaje.remitente_uuid !== currentUserUuid) {
      if (!lastReadAt || ultimoMensaje.created_at > lastReadAt) {
        noLeidos = (mensajes ?? []).filter(
          (m) =>
            m.conversacion_id === p.conversacion_id &&
            m.remitente_uuid !== currentUserUuid &&
            (!lastReadAt || m.created_at > lastReadAt),
        ).length;
      }
    }

    return {
      id: conv?.id ?? p.conversacion_id,
      tipo: conv?.tipo ?? "directo",
      updated_at: conv?.updated_at ?? new Date().toISOString(),
      otro_usuario: otroUuid ? (usuariosMap.get(otroUuid) ?? null) : null,
      ultimo_mensaje: ultimoMensaje,
      no_leidos: noLeidos,
    };
  });

  return resumenes.sort(
    (a, b) =>
      new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime(),
  );
}

export async function getMensajes(
  supabase: SupabaseClient,
  conversacionId: string,
): Promise<Mensaje[]> {
  const { data, error } = await supabase
    .from("mensajes")
    .select("*")
    .eq("conversacion_id", conversacionId)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return (data ?? []) as Mensaje[];
}

export async function sendMensaje(
  supabase: SupabaseClient,
  conversacionId: string,
  remitenteUuid: string,
  contenido: string,
): Promise<Mensaje> {
  const texto = contenido.trim();
  if (!texto) throw new Error("El mensaje no puede estar vacío");

  const { data, error } = await supabase
    .from("mensajes")
    .insert({
      conversacion_id: conversacionId,
      remitente_uuid: remitenteUuid,
      contenido: texto,
    })
    .select("*")
    .single();

  if (error) throw error;
  return data as Mensaje;
}

export async function markConversacionAsRead(
  supabase: SupabaseClient,
  conversacionId: string,
  currentUserUuid: string,
): Promise<void> {
  const { error } = await supabase
    .from("conversacion_participantes")
    .update({ last_read_at: new Date().toISOString() })
    .eq("conversacion_id", conversacionId)
    .eq("usuario_uuid", currentUserUuid);

  if (error) throw error;
}
