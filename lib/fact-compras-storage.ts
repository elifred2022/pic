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

/** Aplana arrays JSON anidados (ej. [["600/factura.pdf"]] → ["600/factura.pdf"]). */
function flattenJsonScalars(values: unknown[]): unknown[] {
  const result: unknown[] = [];
  for (const value of values) {
    if (Array.isArray(value)) {
      result.push(...flattenJsonScalars(value));
    } else if (value !== null && value !== undefined) {
      result.push(value);
    }
  }
  return result;
}

function parseFcValue(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  if (Array.isArray(value)) {
    const flat = flattenJsonScalars(value);
    return flat.length > 0 ? parseFcValue(flat[0]) : null;
  }
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const parsed = parseInt(String(value), 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function parsePathValue(value: unknown): string | null {
  if (value === null || value === undefined) return null;

  if (Array.isArray(value)) {
    const flat = flattenJsonScalars(value);
    return flat.length > 0 ? parsePathValue(flat[0]) : null;
  }

  if (typeof value === "string") {
    let trimmed = value.trim();
    if (!trimmed) return null;

    if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
      try {
        const parsed = JSON.parse(trimmed);
        if (typeof parsed === "string") trimmed = parsed.trim();
      } catch {
        trimmed = trimmed.replace(/^"+|"+$/g, "");
      }
    }

    if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsePathValue(parsed[0]);
        }
      } catch {
        /* usar valor tal cual */
      }
    }

    return trimmed || null;
  }

  return null;
}

function coerceJsonArray(value: unknown): unknown[] {
  let items: unknown[] = [];

  if (Array.isArray(value)) {
    items = value;
  } else if (value === null || value === undefined || value === "") {
    return [];
  } else if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed || trimmed === "[]" || trimmed === "{}") return [];
    if (trimmed.startsWith("[")) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) items = parsed;
        else return [trimmed];
      } catch {
        return [trimmed];
      }
    } else {
      return [trimmed];
    }
  } else {
    items = [value];
  }

  return flattenJsonScalars(items);
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

/** Extrae ruta legacy cuando fact_path era TEXT simple (pre-JSONB). */
export function extractLegacyFactPath(fact_path: unknown): string | null {
  if (fact_path === null || fact_path === undefined) return null;

  if (Array.isArray(fact_path)) {
    const flat = flattenJsonScalars(fact_path);
    if (flat.length === 0) return null;
    return parsePathValue(flat[0]);
  }

  if (typeof fact_path === "string") {
    const trimmed = fact_path.trim();
    if (!trimmed || trimmed === "[]" || trimmed === "{}") return null;
    if (trimmed.startsWith("[")) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsePathValue(parsed[0]);
        }
      } catch {
        /* seguir */
      }
    }
    return parsePathValue(trimmed);
  }

  return null;
}

function parseFacturasLegacyRow(row: FacturasOrdenRow): FacturaOrdenItem[] {
  const path = extractLegacyFactPath(row.fact_path);
  const fc = parseFcValue(row.fc);

  if (!path && fc === null) return [];

  return [{ fc, path }];
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

  const fcValues = coerceJsonArray(row.fc);
  const pathValues = coerceJsonArray(row.fact_path);

  const total = Math.max(fcValues.length, pathValues.length);
  if (total === 0) {
    return parseFacturasLegacyRow(row);
  }

  const parsed = Array.from({ length: total }, (_, index) => ({
    fc: parseFcValue(fcValues[index]),
    path: parsePathValue(pathValues[index]),
  })).filter((item) => item.fc !== null || item.path !== null);

  if (parsed.length > 0) return parsed;

  return parseFacturasLegacyRow(row);
}

/** Persiste en columnas JSON fc y fact_path (arrays planos, sin anidar). */
export function serializeFacturasToDb(facturas: FacturaOrdenItem[]) {
  const cleaned = facturas.filter(isFacturaParCompleta);
  return {
    fc: cleaned.map((item) => item.fc),
    fact_path: cleaned.map((item) => parsePathValue(item.path) ?? item.path.trim()),
  };
}

export type OrdenCompraFacturasJson = {
  fc: number[];
  fact_path: string[];
};

export type FacturasOrdenRow = {
  fc?: unknown;
  fact_path?: unknown;
  rt?: unknown;
};

/** Arma el UPDATE para columnas JSON fc y fact_path (siempre arrays paralelos). */
export function buildFacturasUpdatePayload(
  _orden: FacturasOrdenRow,
  facturas: FacturaOrdenItem[]
): Record<string, unknown> {
  const facturasDb = serializeFacturasToDb(facturas);
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

/**
 * Arma fc/fact_path JSON desde el formulario de comparativa.
 * Si hay FC + imagen nuevos, agrega o actualiza ese par y conserva los demás.
 */
export function buildOcFacturaFormSavePayload(
  form: { fc: string; fact_path: string },
  ordenRow?: FacturasOrdenRow | null
) {
  const existentes = parseFacturasFromOrden(ordenRow ?? {}).filter(isFacturaParCompleta);
  const fc = parseOrdenCompraEntero(form.fc);
  const path = form.fact_path?.trim() || null;

  if (fc !== null && path) {
    const sinMismoFc = existentes.filter((item) => item.fc !== fc);
    return serializeFacturasToDb([...sinMismoFc, { fc, path }]);
  }

  return serializeFacturasToDb(existentes);
}

export function parseOrdenCompraEntero(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const n = parseInt(trimmed, 10);
  return Number.isFinite(n) ? n : null;
}

/** `rt` en ordenes_compra es JSONB array numérico. */
export function coerceRtArray(value: unknown): number[] {
  if (value === null || value === undefined || value === "") return [];

  if (Array.isArray(value)) {
    return value
      .map((item) => {
        if (typeof item === "number" && Number.isFinite(item)) return item;
        const n = Number(item);
        return Number.isFinite(n) ? n : null;
      })
      .filter((n): n is number => n !== null);
  }

  if (typeof value === "number" && Number.isFinite(value)) return [value];

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return [];
    if (trimmed.startsWith("[")) {
      try {
        return coerceRtArray(JSON.parse(trimmed));
      } catch {
        /* seguir */
      }
    }
    const n = Number(trimmed);
    return Number.isFinite(n) ? [n] : [];
  }

  return [];
}

export function appendRtToArray(existing: unknown, rt: number | null): number[] {
  const arr = coerceRtArray(existing);
  if (rt === null) return arr;
  return [...arr, rt];
}

export function buildRtUpdateValue(
  existing: unknown,
  rtInput: string
): number[] {
  const parsed = parseOrdenCompraEntero(rtInput);
  if (parsed === null) return coerceRtArray(existing);
  const existingArr = coerceRtArray(existing);
  if (existingArr.includes(parsed)) return existingArr;
  return [...existingArr, parsed];
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

/** Clave estable para mapas de URLs (ruta dentro del bucket). */
export function getFacturaPathKey(stored: string | null | undefined): string | null {
  return normalizeFactStoragePath(stored);
}

/** URL pública de respaldo (no requiere llamada async). */
export function getFacturaPublicUrl(stored: string | null | undefined): string | null {
  const objectPath = normalizeFactStoragePath(stored);
  if (!objectPath) return null;

  const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
  if (!baseUrl) return null;

  const bucket = getFactComprasBucket();
  return `${baseUrl}/storage/v1/object/public/${bucket}/${objectPath.split("/").map(encodeURIComponent).join("/")}`;
}

/** Carga URLs de visualización indexadas por ruta normalizada. */
export async function loadFacturaViewUrls(
  supabase: SupabaseClient,
  paths: string[]
): Promise<Record<string, string>> {
  const uniquePaths = [...new Set(paths.map((p) => p.trim()).filter(Boolean))];
  if (uniquePaths.length === 0) return {};

  const entries = await Promise.all(
    uniquePaths.map(async (path) => {
      const key = getFacturaPathKey(path) ?? path;
      try {
        const url = (await getFacturaViewUrl(supabase, path)) ?? getFacturaPublicUrl(path);
        return url ? ([key, url] as const) : null;
      } catch {
        const fallback = getFacturaPublicUrl(path);
        return fallback ? ([key, fallback] as const) : null;
      }
    })
  );

  return Object.fromEntries(
    entries.filter((entry): entry is [string, string] => entry !== null)
  );
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
