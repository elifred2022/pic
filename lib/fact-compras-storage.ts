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
      details?: string;
      hint?: string;
      code?: string;
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
    const parts = [o.message, o.details, o.hint, o.code ? `código ${o.code}` : null].filter(
      (part): part is string => Boolean(part?.trim())
    );
    if (parts.length > 0) return parts.join(" — ");
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

export function getFacturaStoragePathUnique(ordenId: number | string, extension: string) {
  const ext = extension.replace(/^\./, "").toLowerCase() || "jpg";
  return `${ordenId}/factura-${Date.now()}.${ext}`;
}

export type FacturaOrdenItem = {
  fc: number | null;
  path: string | null;
};

function parseFcValue(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const parsed = parseInt(String(value), 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function parsePathValue(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed || null;
}

export type FacturasStorageFormat = "parallel" | "by-fc-object";

/**
 * fc y fact_path en ordenes_compra son columnas JSON.
 * Formato principal: arrays paralelos alineados por índice.
 *   fc:        [12345, 67890]
 *   fact_path: ["42/factura-1.pdf", "42/factura-2.pdf"]
 */
export function detectFacturasStorageFormat(row: {
  fc?: unknown;
  fact_path?: unknown;
}): FacturasStorageFormat {
  if (
    row.fact_path !== null &&
    row.fact_path !== undefined &&
    typeof row.fact_path === "object" &&
    !Array.isArray(row.fact_path)
  ) {
    return "by-fc-object";
  }
  return "parallel";
}

function isFacturaParCompleta(
  item: FacturaOrdenItem
): item is { fc: number; path: string } {
  return (
    item.fc !== null &&
    Number.isFinite(item.fc) &&
    typeof item.path === "string" &&
    item.path.trim() !== ""
  );
}

/** Facturas con solo FC o solo imagen (no cumplen el CHECK de Supabase). */
export function findFacturasIncompletas(facturas: FacturaOrdenItem[]): FacturaOrdenItem[] {
  return facturas.filter((item) => !isFacturaParCompleta(item));
}

/** Lee facturas desde fc/fact_path JSON (arrays paralelos, objeto por FC o legacy TEXT). */
export function parseFacturasFromOrden(row: {
  fc?: unknown;
  fact_path?: unknown;
  facturas?: unknown;
}): FacturaOrdenItem[] {
  if (Array.isArray(row.facturas) && row.facturas.length > 0) {
    return row.facturas
      .map((item) => {
        if (!item || typeof item !== "object" || Array.isArray(item)) {
          return { fc: null, path: null };
        }
        const record = item as { fc?: unknown; path?: unknown; fact_path?: unknown };
        const path = record.path ?? record.fact_path;
        return {
          fc: parseFcValue(record.fc),
          path: parsePathValue(path),
        };
      })
      .filter((item) => item.fc !== null || item.path !== null);
  }

  if (detectFacturasStorageFormat(row) === "by-fc-object") {
    const pathMap = row.fact_path as Record<string, unknown>;
    const fcValues = Array.isArray(row.fc)
      ? row.fc
      : row.fc !== null && row.fc !== undefined && row.fc !== ""
        ? [row.fc]
        : Object.keys(pathMap);

    return fcValues
      .map((fcValue) => {
        const fc = parseFcValue(fcValue);
        const key = fc !== null ? String(fc) : String(fcValue);
        return {
          fc,
          path: parsePathValue(pathMap[key]),
        };
      })
      .filter((item) => item.fc !== null || item.path !== null);
  }

  const fcValues = Array.isArray(row.fc)
    ? row.fc
    : row.fc !== null && row.fc !== undefined && row.fc !== ""
      ? [row.fc]
      : [];
  const pathValues = Array.isArray(row.fact_path)
    ? row.fact_path
    : typeof row.fact_path === "string" && row.fact_path.trim()
      ? [row.fact_path.trim()]
      : [];

  const total = Math.max(fcValues.length, pathValues.length);
  if (total === 0) return [];

  return Array.from({ length: total }, (_, index) => ({
    fc: parseFcValue(fcValues[index]),
    path: parsePathValue(pathValues[index]),
  })).filter((item) => item.fc !== null || item.path !== null);
}

/** Persiste en columnas JSON fc y fact_path (arrays paralelos por defecto). */
export function serializeFacturasToDb(
  facturas: FacturaOrdenItem[],
  format: FacturasStorageFormat = "parallel"
) {
  const cleaned = facturas.filter(isFacturaParCompleta);

  if (cleaned.length === 0) {
    return format === "by-fc-object"
      ? { fc: [] as number[], fact_path: {} as Record<string, string> }
      : { fc: [] as number[], fact_path: [] as string[] };
  }

  if (format === "by-fc-object") {
    const fact_path: Record<string, string> = {};
    for (const item of cleaned) {
      fact_path[String(item.fc)] = item.path.trim();
    }
    return {
      fc: cleaned.map((item) => item.fc),
      fact_path,
    };
  }

  return {
    fc: cleaned.map((item) => item.fc),
    fact_path: cleaned.map((item) => item.path.trim()),
  };
}

export type OrdenCompraFacturasJson = {
  fc: number[];
  fact_path: string[] | Record<string, string>;
};

export type FacturasOrdenRow = {
  fc?: unknown;
  fact_path?: unknown;
};

/** Arma el UPDATE para columnas JSON fc y fact_path. */
export function buildFacturasUpdatePayload(
  orden: FacturasOrdenRow,
  facturas: FacturaOrdenItem[],
  format?: FacturasStorageFormat
): Record<string, unknown> {
  const resolvedFormat = format ?? detectFacturasStorageFormat(orden);
  const facturasDb = serializeFacturasToDb(facturas, resolvedFormat);
  return {
    fc: facturasDb.fc,
    fact_path: facturasDb.fact_path,
  };
}

export function isFacturasCheckConstraintError(err: unknown): boolean {
  const message = getSupabaseErrorMessage(err).toLowerCase();
  return (
    message.includes("ordenes_compra_fact_path_by_fc_chk") ||
    message.includes("check constraint")
  );
}

/** El CHECK de Supabase solo admite arrays JSON paralelos en fc y fact_path. */
export function getFacturasFormatsToTry(_orden: FacturasOrdenRow): FacturasStorageFormat[] {
  return ["parallel"];
}

/** Arma fc/fact_path JSON desde el formulario simple de comparativa (un solo par FC + imagen). */
export function buildOcFacturaFormSavePayload(form: { fc: string; fact_path: string }) {
  const fc = parseOrdenCompraEntero(form.fc);
  const path = form.fact_path?.trim() || null;
  return serializeFacturasToDb(
    fc !== null && path ? [{ fc, path }] : [],
    "parallel"
  );
}

export function parseOrdenCompraEntero(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const n = parseInt(trimmed, 10);
  return Number.isFinite(n) ? n : null;
}

export function formatDateInputValue(dateStr: string | null | undefined): string {
  if (!dateStr) return "";
  return dateStr.split("T")[0];
}

export function emptyOcFacturaForm() {
  return { fc: "", rt: "", fact_path: "", fecha_entrega: "" };
}

/** Sube imagen/PDF de factura al bucket (no persiste en ordenes_compra; use buildOcFacturaFormSavePayload al guardar). */
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
