import type { SupabaseClient } from "@supabase/supabase-js";

export async function fetchUserRolByUuid(
  supabase: SupabaseClient,
  uuid: string,
): Promise<string | null> {
  const { data } = await supabase
    .from("usuarios")
    .select("rol")
    .eq("uuid", uuid)
    .maybeSingle();

  return data?.rol ?? null;
}

export async function fetchCurrentUserRol(
  supabase: SupabaseClient,
): Promise<string | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;
  return fetchUserRolByUuid(supabase, user.id);
}

/** Nombre del usuario logueado (usuarios.nombre), o email si no hay nombre. */
export async function fetchCurrentUserNombre(
  supabase: SupabaseClient,
): Promise<string | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data } = await supabase
    .from("usuarios")
    .select("nombre")
    .eq("uuid", user.id)
    .maybeSingle();

  const nombre = data?.nombre?.trim();
  return nombre || user.email || null;
}
