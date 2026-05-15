import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const MARCA_OPERADOR_LONGITUD = 4;

/** Primeras letras del nombre para identificar quién marcó (p. ej. "Gonzalo" → "GONZ"). */
export function inicialesDesdeNombre(nombre: string): string {
  const letras = nombre.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ]/gi, "");
  return letras.slice(0, MARCA_OPERADOR_LONGITUD).toUpperCase();
}

// This check can be removed, it is just for tutorial purposes
export const hasEnvVars =
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
