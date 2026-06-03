import type { SupabaseClient } from "@supabase/supabase-js";
import {
  getSupabaseErrorMessage,
  normalizeFactStoragePath,
} from "@/lib/fact-compras-storage";

export const PRESUPUESTOS_BUCKET = "presupuestos";

const SIGNED_URL_TTL_SEC = 60 * 60;

const STORAGE_RLS_HINT =
  "Faltan políticas en Storage. En Supabase → SQL Editor ejecute database/presupuestos_storage_policies.sql";

export function getPresupuestosBucket(): string {
  return process.env.NEXT_PUBLIC_PRESUPUESTOS_BUCKET?.trim() || PRESUPUESTOS_BUCKET;
}

export function getPresupuestoStoragePath(
  pedidoId: string | number,
  provIndex: number,
  extension: string
): string {
  const ext = extension.replace(/^\./, "").toLowerCase() || "pdf";
  return `${pedidoId}/prov-${provIndex}/presupuesto.${ext}`;
}

/** Sube PDF/JPG del presupuesto de un proveedor en la comparativa. */
export async function uploadPresupuestoProveedor(
  supabase: SupabaseClient,
  pedidoId: string | number,
  provIndex: number,
  file: File
): Promise<{ storagePath: string; viewUrl: string | null } | { error: string }> {
  const fileExt = file.name.split(".").pop()?.toLowerCase() || "pdf";
  if (!/^(jpg|jpeg|pdf)$/i.test(fileExt)) {
    return { error: "Formato no permitido. Use JPG o PDF." };
  }

  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (sessionError || !sessionData.session) {
    return { error: "Debe iniciar sesión para adjuntar el presupuesto." };
  }

  const storagePath = getPresupuestoStoragePath(pedidoId, provIndex, fileExt);
  const contentType =
    fileExt === "pdf"
      ? "application/pdf"
      : file.type || `image/${fileExt === "jpg" ? "jpeg" : fileExt}`;

  const { error: uploadError } = await supabase.storage
    .from(getPresupuestosBucket())
    .upload(storagePath, file, {
      upsert: true,
      contentType,
    });

  if (uploadError) {
    const msg = getSupabaseErrorMessage(uploadError);
    return {
      error: msg.includes("row-level security") || msg.includes("403")
        ? `${msg}. ${STORAGE_RLS_HINT}`
        : `No se pudo subir: ${msg}`,
    };
  }

  const viewUrl = await getPresupuestoViewUrl(supabase, storagePath);
  return { storagePath, viewUrl };
}

/** Elimina el archivo del bucket (ignora error si ya no existe). */
export async function removePresupuestoFromStorage(
  supabase: SupabaseClient,
  storagePath: string
): Promise<{ error: string } | { ok: true }> {
  const objectPath = normalizeFactStoragePath(storagePath);
  if (!objectPath) return { ok: true };

  const { error } = await supabase.storage
    .from(getPresupuestosBucket())
    .remove([objectPath]);

  if (error) {
    return { error: `No se pudo eliminar el archivo: ${getSupabaseErrorMessage(error)}` };
  }
  return { ok: true };
}

export async function getPresupuestoViewUrl(
  supabase: SupabaseClient,
  stored: string | null | undefined
): Promise<string | null> {
  if (!stored?.trim()) return null;

  const trimmed = stored.trim();
  const bucket = getPresupuestosBucket();

  if (/^https?:\/\//i.test(trimmed) && !normalizeFactStoragePath(trimmed)) {
    return trimmed;
  }

  const objectPath = normalizeFactStoragePath(trimmed);
  if (!objectPath) return null;

  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(objectPath, SIGNED_URL_TTL_SEC);

  if (!error && data?.signedUrl) return data.signedUrl;

  const { data: pub } = supabase.storage.from(bucket).getPublicUrl(objectPath);
  return pub.publicUrl;
}
