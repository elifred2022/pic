import type { SupabaseClient } from "@supabase/supabase-js";

export const FACT_COMPRAS_BUCKET = "fact_compras";

const SIGNED_URL_TTL_SEC = 60 * 60; // 1 hora

export function getFactComprasBucket(): string {
  return process.env.NEXT_PUBLIC_FACT_COMPRAS_BUCKET?.trim() || FACT_COMPRAS_BUCKET;
}

const STORAGE_RLS_HINT =
  "Faltan políticas en Storage. En Supabase → SQL Editor ejecute database/fact_compras_storage_policies.sql";

/** Mensaje legible desde errores de Supabase (Storage/PostgREST). */
export function getSupabaseErrorMessage(err: unknown): string {
  if (err && typeof err === "object") {
    const o = err as {
      message?: string;
      error?: string;
      statusCode?: string | number;
    };
    const status = String(o.statusCode ?? "");
    const isRls =
      status === "403" ||
      o.message?.includes("row-level security") ||
      o.error === "Unauthorized";

    if (isRls) {
      return `${o.message || o.error || "Sin permiso en Storage"}. ${STORAGE_RLS_HINT}`;
    }
    if (o.message?.trim()) return o.message;
    if (o.error?.trim()) return o.error;
    if (o.statusCode) return `Error ${o.statusCode}`;
  }
  if (err instanceof Error && err.message?.trim()) return err.message;
  if (typeof err === "string" && err.trim()) return err;
  return `Error desconocido. ${STORAGE_RLS_HINT}`;
}

export function getFacturaStoragePath(ordenId: number | string, extension: string) {
  const ext = extension.replace(/^\./, "").toLowerCase() || "jpg";
  return `${ordenId}/factura.${ext}`;
}

export function parseOrdenCompraEntero(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const n = parseInt(trimmed, 10);
  return Number.isFinite(n) ? n : null;
}

/** Sube imagen/PDF de factura y persiste fact_path en ordenes_compra. */
export async function uploadFacturaOrdenCompra(
  supabase: SupabaseClient,
  ordenId: number | string,
  file: File
): Promise<{ storagePath: string; viewUrl: string | null } | { error: string }> {
  const fileExt = file.name.split(".").pop()?.toLowerCase() || "jpg";
  if (!/^(jpg|jpeg|png|gif|webp|bmp|pdf)$/i.test(fileExt)) {
    return { error: "Formato no permitido. Use JPG, PNG, WEBP, GIF, BMP o PDF." };
  }

  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (sessionError || !sessionData.session) {
    return { error: "Debe iniciar sesión para subir la factura." };
  }

  const storagePath = getFacturaStoragePath(ordenId, fileExt);
  const contentType = file.type || `image/${fileExt === "jpg" ? "jpeg" : fileExt}`;

  const { error: uploadError } = await supabase.storage
    .from(getFactComprasBucket())
    .upload(storagePath, file, {
      upsert: true,
      contentType: fileExt === "pdf" ? "application/pdf" : contentType,
    });

  if (uploadError) {
    return { error: `No se pudo subir: ${getSupabaseErrorMessage(uploadError)}` };
  }

  const { error: updateError } = await supabase
    .from("ordenes_compra")
    .update({ fact_path: storagePath })
    .eq("id", ordenId);

  if (updateError) {
    return {
      error: `Archivo subido pero no se guardó en la orden: ${getSupabaseErrorMessage(updateError)}`,
    };
  }

  const viewUrl = await getFacturaViewUrl(supabase, storagePath);
  return { storagePath, viewUrl };
}

/** Convierte fact_path guardado (ruta u URL) al path dentro del bucket. */
export function normalizeFactStoragePath(stored: string | null | undefined): string | null {
  if (!stored?.trim()) return null;
  const s = stored.trim();

  if (/^https?:\/\//i.test(s)) {
    try {
      const match = s.match(/\/object\/(?:public|sign)\/[^/]+\/(.+?)(?:\?|$)/);
      if (match?.[1]) return decodeURIComponent(match[1]);
    } catch {
      /* ignore */
    }
    return null;
  }

  return s.replace(/^\/+/, "");
}

/**
 * URL para abrir la factura (signed URL; funciona con bucket privado o público).
 */
export async function getFacturaViewUrl(
  supabase: SupabaseClient,
  stored: string | null | undefined
): Promise<string | null> {
  if (!stored?.trim()) return null;

  const trimmed = stored.trim();
  const bucket = getFactComprasBucket();

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
