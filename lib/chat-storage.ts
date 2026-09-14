import type { SupabaseClient } from "@supabase/supabase-js";

export const CHAT_BUCKET = "chat";
export const CHAT_IMAGEN_ACCEPT = "image/jpeg,image/jpg,image/png,image/webp";
export const CHAT_IMAGEN_MAX_BYTES = 8 * 1024 * 1024;

const CHAT_IMAGEN_EXT = /^(jpg|jpeg|png|webp)$/i;
const SIGNED_URL_TTL_SEC = 60 * 60;
const STORAGE_RLS_HINT =
  "Faltan políticas en Storage. En Supabase → SQL Editor ejecute database/chat_imagenes.sql";

export function getChatBucket(): string {
  return process.env.NEXT_PUBLIC_CHAT_BUCKET?.trim() || CHAT_BUCKET;
}

export function validateChatImagenFile(file: File): string | null {
  const fileExt = file.name.split(".").pop()?.toLowerCase() || "";
  const typeOk = /image\/(jpeg|jpg|png|webp)/i.test(file.type || "");
  if (!CHAT_IMAGEN_EXT.test(fileExt) && !typeOk) {
    return "Formato no permitido. Usá JPG, PNG o WEBP.";
  }
  if (file.size > CHAT_IMAGEN_MAX_BYTES) {
    return "La foto supera 8 MB.";
  }
  return null;
}

function storagePath(
  conversacionId: string,
  userUuid: string,
  extension: string,
): string {
  const ext = extension.replace(/^\./, "").toLowerCase() || "jpg";
  const unique = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  return `${conversacionId}/${userUuid}/${unique}.${ext}`;
}

export async function uploadChatImagen(
  supabase: SupabaseClient,
  conversacionId: string,
  userUuid: string,
  file: File,
): Promise<{ storagePath: string } | { error: string }> {
  const invalid = validateChatImagenFile(file);
  if (invalid) return { error: invalid };

  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) {
    return { error: "Debe iniciar sesión para adjuntar fotos." };
  }

  const fileExt = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const path = storagePath(conversacionId, userUuid, fileExt);
  const contentType =
    file.type || `image/${fileExt === "jpg" ? "jpeg" : fileExt}`;

  const { error } = await supabase.storage.from(getChatBucket()).upload(path, file, {
    upsert: false,
    contentType,
  });

  if (error) {
    const msg = error.message || "No se pudo subir la foto";
    if (msg.includes("row-level security") || msg.includes("Bucket") || msg.includes("403")) {
      return { error: `${msg}. ${STORAGE_RLS_HINT}` };
    }
    return { error: `No se pudo subir: ${msg}` };
  }

  return { storagePath: path };
}

export async function getChatImagenViewUrl(
  supabase: SupabaseClient,
  objectPath: string | null | undefined,
): Promise<string | null> {
  const trimmed = String(objectPath ?? "").trim();
  if (!trimmed) return null;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;

  const bucket = getChatBucket();
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(trimmed, SIGNED_URL_TTL_SEC);

  if (!error && data?.signedUrl) return data.signedUrl;

  const { data: pub } = supabase.storage.from(bucket).getPublicUrl(trimmed);
  return pub.publicUrl || null;
}
