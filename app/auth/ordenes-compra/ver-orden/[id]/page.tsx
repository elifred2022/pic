"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  extractPicDisplayNumber,
  getComparativaPedidoUrl,
  parsePicFromArticuloId,
} from "@/lib/pic-links";
import {
  getFactComprasBucket,
  getFacturaStoragePathUnique,
  getFacturaViewUrl,
  getSupabaseErrorMessage,
  buildFacturasUpdatePayload,
  findFacturasIncompletas,
  getFacturaPathKey,
  getFacturaPublicUrl,
  loadFacturaViewUrls,
  parseFacturasFromOrden,
  type FacturaOrdenItem,
} from "@/lib/fact-compras-storage";
import { canCargarEntregaOrdenes, canEditAsAdmin, canViewImportesOrdenesCompra, isAprobEmail } from "@/lib/panol-access";
import { fetchUserRolByUuid } from "@/lib/user-rol";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// Estilos para impresión A4 — layout compacto para aprovechar toda la hoja
const printStyles = `
  @media print {
    @page {
      size: A4 portrait;
      margin: 6mm 8mm;
    }

    html, body {
      width: 100% !important;
      height: auto !important;
      margin: 0 !important;
      padding: 0 !important;
      font-size: 9px !important;
      line-height: 1.2 !important;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    .print-container {
      max-width: none !important;
      width: 100% !important;
      margin: 0 !important;
      padding: 0 !important;
    }

    .print-header {
      margin-bottom: 4px !important;
      padding-bottom: 4px !important;
      border-bottom: 1.5px solid #000 !important;
      page-break-inside: avoid;
      page-break-after: avoid;
    }

    .print-header h1,
    .print-header h2 {
      margin: 0 !important;
      line-height: 1.15 !important;
    }

    .print-header-company {
      text-align: center !important;
      font-size: 9px !important;
      font-weight: 600 !important;
      color: #333 !important;
      margin-bottom: 2px !important;
    }

    .print-header-title {
      text-align: center !important;
      font-size: 20px !important;
      font-weight: 800 !important;
      letter-spacing: 0.02em !important;
      margin: 2px 0 4px !important;
      line-height: 1.1 !important;
    }

    .print-header-total {
      text-align: center !important;
      font-size: 12px !important;
      font-weight: 700 !important;
      margin-bottom: 4px !important;
    }

    .print-header-meta {
      display: flex !important;
      flex-wrap: wrap !important;
      justify-content: center !important;
      gap: 2px 14px !important;
      margin-top: 3px !important;
      font-size: 9.5px !important;
    }

    .print-header-meta span {
      white-space: nowrap;
    }

    .print-info-top {
      display: grid !important;
      grid-template-columns: 1fr 1fr !important;
      gap: 4px !important;
      margin-bottom: 4px !important;
      page-break-inside: avoid;
      page-break-after: avoid;
    }

    .print-section {
      margin-bottom: 0 !important;
      box-shadow: none !important;
      border: 1px solid #999 !important;
      border-radius: 0 !important;
      page-break-inside: avoid;
    }

    .print-section-items {
      page-break-inside: auto !important;
      margin-top: 4px !important;
    }

    .print-section-header {
      padding: 2px 6px !important;
      border-bottom: 1px solid #ccc !important;
      background: #f0f0f0 !important;
    }

    .print-section-header [class*="CardTitle"],
    .print-section-title {
      font-size: 9px !important;
      font-weight: 700 !important;
      text-transform: uppercase;
      letter-spacing: 0.02em;
    }

    .print-section-body {
      padding: 3px 6px !important;
    }

    .print-info-grid {
      display: flex !important;
      flex-wrap: wrap !important;
      gap: 1px 10px !important;
      align-items: baseline !important;
    }

    .print-field {
      display: block;
    }

    .print-field-label {
      display: block;
    }

    .print-field-value {
      display: block;
    }

    .print-field {
      display: inline !important;
      line-height: 1.25 !important;
    }

    .print-field-label {
      display: inline !important;
      font-weight: 600 !important;
      color: #333 !important;
      font-size: 8px !important;
    }

    .print-field-label::after {
      content: ": ";
    }

    .print-field-value {
      display: inline !important;
      font-size: 8.5px !important;
    }

    .print-field-block {
      display: block !important;
      width: 100% !important;
      margin-top: 2px !important;
    }

    .print-field-block .print-field-value {
      display: inline !important;
    }

    .print-info-top .print-section-header [class*="CardTitle"],
    .print-info-top .print-section-title {
      font-size: 10.5px !important;
    }

    .print-info-top .print-field-label {
      font-size: 9.5px !important;
    }

    .print-info-top .print-field-value {
      font-size: 10.5px !important;
    }

    .print-info-top .print-field-value.text-3xl {
      font-size: 14px !important;
    }

    .print-section-items .print-section-header [class*="CardTitle"],
    .print-section-items .print-section-title {
      font-size: 10.5px !important;
    }

    .print-estado-badge {
      display: none !important;
    }

    .print-estado-text {
      display: inline !important;
      font-weight: 600 !important;
    }

    .print-table {
      border-collapse: collapse !important;
      width: 100% !important;
      font-size: 10.5px !important;
      table-layout: fixed !important;
    }

    .print-table thead {
      display: table-header-group;
    }

    .print-table tfoot {
      display: table-footer-group;
    }

    .print-table th,
    .print-table td {
      border: 0.5px solid #666 !important;
      padding: 1px 3px !important;
      vertical-align: top !important;
      word-wrap: break-word !important;
      overflow-wrap: anywhere !important;
    }

    .print-table th {
      background-color: #e8e8e8 !important;
      font-weight: 700 !important;
      font-size: 9.5px !important;
      padding: 2px 3px !important;
    }

    .print-table tbody tr {
      page-break-inside: avoid;
    }

    .print-table tfoot td {
      background-color: #e0e0e0 !important;
      font-weight: 700 !important;
      font-size: 10.5px !important;
      padding: 2px 4px !important;
    }

    .print-table tfoot td:last-child {
      font-size: 12px !important;
    }

    .print-articulo-cell .print-articulo-extra {
      font-size: 9.5px !important;
      line-height: 1.15 !important;
      color: #444 !important;
    }

    .print-articulo-cell .print-articulo-nombre {
      font-size: 10.5px !important;
      font-weight: 600 !important;
      line-height: 1.15 !important;
    }

    .print-hidden {
      display: none !important;
    }

    .print-title-or {
      display: none !important;
    }

    .print-sin-importes .print-header-total,
    .print-sin-importes .print-col-importe,
    .print-sin-importes .print-field-importe,
    .print-sin-importes .print-table tfoot {
      display: none !important;
    }

    .print-sin-importes .print-title-oc {
      display: none !important;
    }

    .print-sin-importes .print-title-or {
      display: block !important;
    }

    .print-sin-importes .print-col-articulo {
      width: 72% !important;
    }

    .print-sin-importes .print-col-pic {
      width: 10% !important;
    }

    .print-sin-importes .print-col-cant {
      width: 18% !important;
    }

    .print-or-codint {
      display: none !important;
    }

    .print-sin-importes .print-or-codint {
      display: block !important;
    }

    /* Ocultar widget de chat flotante al imprimir */
    body > div.fixed {
      display: none !important;
    }
  }

  /* Pantalla: ocultar importes (perfil pañol / recepción) */
  .vista-sin-importes .print-header-total,
  .vista-sin-importes .print-col-importe,
  .vista-sin-importes .print-field-importe,
  .vista-sin-importes .print-table tfoot {
    display: none !important;
  }
`;

type ArticuloOrdenItem = {
  articulo_id: string;
  articulo_nombre: string;
  cantidad: number;
  precio_unitario: number;
  descuento?: number;
  divisa?: "USD" | "EUR" | "ARS";
  costunitcdesc?: number;
  total: number;
  codint?: string | null;
  descripcion?: string | null;
  presentacion?: string | null;
  codprovsug?: string | null;
};

/** Entrada legacy de la columna JSON `entregas` (array paralelo a `articulos`). */
type EntregaOrdenItem = {
  entregadas: number | null;
  pendientes: number | null;
};

/** Ítem de cantidad dentro de un registro de entrega (factura/remito). */
type EntregaItemCantidad = {
  articulo_id: string;
  cantidad_entregada: number;
};

/** Registro de entrega del proveedor, vinculado a un documento en fact_path. */
type EntregaRegistro = {
  fc: number | null;
  rt: number | null;
  fecha_entrega: string | null;
  fact_path: string;
  items: EntregaItemCantidad[];
};

function parseEntregaItem(value: unknown): EntregaOrdenItem {
  if (value === null || value === undefined) {
    return { entregadas: null, pendientes: null };
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return { entregadas: value, pendientes: null };
  }

  if (typeof value === "object" && !Array.isArray(value)) {
    const record = value as Record<string, unknown>;
    const entregadasRaw =
      record.entregadas ??
      record.cantidad_entregada ??
      record.cantidad_entregadas ??
      record.entregado;
    const pendientesRaw =
      record.pendientes ??
      record.cantidad_pendiente ??
      record.cantidad_pendientes ??
      record.pendiente;

    const toNum = (v: unknown): number | null => {
      if (v === null || v === undefined || v === "") return null;
      const n = typeof v === "number" ? v : Number(v);
      return Number.isFinite(n) ? n : null;
    };

    return {
      entregadas: toNum(entregadasRaw),
      pendientes: toNum(pendientesRaw),
    };
  }

  return { entregadas: null, pendientes: null };
}

function isEntregaRegistro(value: unknown): value is EntregaRegistro {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const record = value as Record<string, unknown>;
  return Array.isArray(record.items) || ("fact_path" in record && !("entregadas" in record));
}

function parseEntregaRegistro(value: unknown): EntregaRegistro | null {
  if (!isEntregaRegistro(value)) return null;
  const record = value as Record<string, unknown>;
  const itemsRaw = Array.isArray(record.items) ? record.items : [];
  const items: EntregaItemCantidad[] = itemsRaw
    .map((item) => {
      if (!item || typeof item !== "object" || Array.isArray(item)) return null;
      const row = item as Record<string, unknown>;
      const articuloId = String(row.articulo_id ?? "").trim();
      const cant = Number(row.cantidad_entregada ?? row.entregadas ?? 0);
      if (!articuloId || !Number.isFinite(cant) || cant <= 0) return null;
      return { articulo_id: articuloId, cantidad_entregada: cant };
    })
    .filter((item): item is EntregaItemCantidad => item !== null);

  const fcRaw = record.fc;
  const rtRaw = record.rt;
  const fc =
    fcRaw === null || fcRaw === undefined || fcRaw === ""
      ? null
      : Number.isFinite(Number(fcRaw))
        ? Number(fcRaw)
        : null;
  const rt =
    rtRaw === null || rtRaw === undefined || rtRaw === ""
      ? null
      : Number.isFinite(Number(rtRaw))
        ? Number(rtRaw)
        : null;

  return {
    fc,
    rt,
    fecha_entrega:
      typeof record.fecha_entrega === "string" && record.fecha_entrega.trim()
        ? record.fecha_entrega.trim()
        : null,
    fact_path: typeof record.fact_path === "string" ? record.fact_path : "",
    items,
  };
}

function normalizeEntregasToRegistros(entregas: unknown): EntregaRegistro[] {
  if (!Array.isArray(entregas) || entregas.length === 0) return [];
  if (isEntregaRegistro(entregas[0])) {
    return entregas
      .map(parseEntregaRegistro)
      .filter((reg): reg is EntregaRegistro => reg !== null);
  }
  return [];
}

/** Convierte entregas (eventos o legacy) a registros, sin perder cantidades ya cargadas. */
function toEntregaRegistrosPreserving(
  entregas: unknown,
  articulos: ArticuloOrdenItem[]
): EntregaRegistro[] {
  if (!Array.isArray(entregas) || entregas.length === 0) return [];

  if (isEntregaRegistro(entregas[0])) {
    return normalizeEntregasToRegistros(entregas);
  }

  const legacyItems: EntregaItemCantidad[] = articulos
    .map((art, idx) => {
      const ent = parseEntregaItem(entregas[idx]);
      const cant = ent.entregadas ?? 0;
      if (cant <= 0 || !art.articulo_id) return null;
      return {
        articulo_id: art.articulo_id,
        cantidad_entregada: cant,
      };
    })
    .filter((item): item is EntregaItemCantidad => item !== null);

  if (legacyItems.length === 0) return [];

  return [
    {
      fc: null,
      rt: null,
      fecha_entrega: null,
      fact_path: "",
      items: legacyItems,
    },
  ];
}

function getEntregadasAgregadas(
  entregas: unknown,
  articuloId: string,
  index: number
): number {
  if (!Array.isArray(entregas) || entregas.length === 0) return 0;

  if (isEntregaRegistro(entregas[0])) {
    let sum = 0;
    for (const raw of entregas) {
      const reg = parseEntregaRegistro(raw);
      if (!reg) continue;
      const byId = reg.items.find((item) => item.articulo_id === articuloId);
      if (byId) {
        sum += byId.cantidad_entregada;
      } else if (!articuloId && reg.items[index]) {
        sum += reg.items[index].cantidad_entregada;
      }
    }
    return sum;
  }

  return parseEntregaItem(entregas[index]).entregadas ?? 0;
}

function getEntregaForArticulo(
  entregas: unknown,
  index: number,
  articulo?: ArticuloOrdenItem
): EntregaOrdenItem {
  const cantidad = Number(articulo?.cantidad) || 0;
  const esFormatoEventos =
    Array.isArray(entregas) && entregas.length > 0 && isEntregaRegistro(entregas[0]);

  if (esFormatoEventos || !Array.isArray(entregas) || entregas.length === 0) {
    const entregadas = getEntregadasAgregadas(
      entregas,
      articulo?.articulo_id ?? "",
      index
    );
    return {
      entregadas,
      pendientes: Math.max(0, cantidad - entregadas),
    };
  }

  const legacy = parseEntregaItem(entregas[index]);
  const entregadas = legacy.entregadas ?? 0;
  return {
    entregadas,
    pendientes:
      legacy.pendientes !== null
        ? legacy.pendientes
        : Math.max(0, cantidad - entregadas),
  };
}

function formatCantidadEntrega(value: number | null): string {
  if (value === null) return "—";
  return value.toLocaleString("es-AR");
}

/** `rt` en ordenes_compra es JSONB array numérico (constraint ordenes_compra_rt_numeric_array_chk). */
function coerceRtArray(value: unknown): number[] {
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

function appendRtToArray(existing: unknown, rt: number | null): number[] {
  const arr = coerceRtArray(existing);
  if (rt === null) return arr;
  return [...arr, rt];
}

function formatRtDisplay(rt: unknown): string | null {
  const arr = coerceRtArray(rt);
  if (arr.length === 0) return null;
  return arr.join(", ");
}

type AbonadoOrden = {
  abonado: boolean;
  fecha: string | null;
};

function parseAbonadoOrden(value: unknown): AbonadoOrden {
  if (value === null || value === undefined || value === "") {
    return { abonado: false, fecha: null };
  }

  // Legacy: solo fecha como string/date
  if (typeof value === "string") {
    const fecha = value.trim().split("T")[0] || null;
    return { abonado: Boolean(fecha), fecha };
  }

  if (typeof value === "object" && !Array.isArray(value)) {
    const record = value as Record<string, unknown>;
    const fechaRaw = record.fecha ?? record.fecha_abonado;
    const fecha =
      typeof fechaRaw === "string" && fechaRaw.trim()
        ? fechaRaw.trim().split("T")[0]
        : null;
    const checked =
      typeof record.abonado === "boolean"
        ? record.abonado
        : Boolean(fecha);
    return { abonado: checked, fecha: checked ? fecha : null };
  }

  return { abonado: false, fecha: null };
}

function serializeAbonadoOrden(checked: boolean, fecha: string | null): AbonadoOrden {
  const fechaNorm = fecha?.trim() ? fecha.trim().split("T")[0] : null;
  if (!checked) {
    return { abonado: false, fecha: null };
  }
  return { abonado: true, fecha: fechaNorm };
}

/** Estado según entregas: pendiente | entrego_parcial | cumplida */
function computeEstadoDesdeEntregas(
  articulos: ArticuloOrdenItem[],
  entregas: unknown
): "pendiente" | "entrego_parcial" | "cumplida" {
  if (!articulos.length) return "pendiente";

  let totalEntregadas = 0;
  let totalPendientes = 0;

  articulos.forEach((art, index) => {
    const cantidad = Number(art.cantidad) || 0;
    const entregadas = getEntregadasAgregadas(
      entregas,
      art.articulo_id ?? "",
      index
    );
    totalEntregadas += entregadas;
    totalPendientes += Math.max(0, cantidad - entregadas);
  });

  if (totalEntregadas <= 0) return "pendiente";
  if (totalPendientes <= 0) return "cumplida";
  return "entrego_parcial";
}

type DivisaOrden = "USD" | "EUR" | "ARS";

function normalizeDivisa(value: unknown): DivisaOrden {
  const v = String(value ?? "").trim().toUpperCase();
  if (v === "EUR" || v.includes("EUR") || v === "€") return "EUR";
  if (v === "ARS" || v.includes("ARS") || v === "PESO" || v === "$AR") return "ARS";
  if (v === "USD" || v.includes("USD") || v === "U$S" || v === "US$") return "USD";
  return "USD";
}

function formatImporte(amount: number | null | undefined, divisa?: unknown): string {
  const n = typeof amount === "number" && Number.isFinite(amount) ? amount : 0;
  return `${normalizeDivisa(divisa)} ${n.toLocaleString("es-AR")}`;
}

/**
 * Arma `entregas` al editar artículos.
 * Si ya hay registros de entrega (eventos), los conserva filtrando ítems.
 * Si es formato legacy, recalcula entregadas/pendientes.
 */
function buildEntregasFromArticulos(
  articulos: ArticuloOrdenItem[],
  articulosPrevios: ArticuloOrdenItem[] | undefined,
  entregasPrevias: unknown
): EntregaRegistro[] | { entregadas: number; pendientes: number }[] {
  const prevArray = Array.isArray(entregasPrevias) ? entregasPrevias : [];

  if (prevArray.length > 0 && isEntregaRegistro(prevArray[0])) {
    const ids = new Set(articulos.map((art) => art.articulo_id).filter(Boolean));
    return normalizeEntregasToRegistros(prevArray).map((reg) => ({
      ...reg,
      items: reg.items.filter((item) => ids.has(item.articulo_id)),
    }));
  }

  const entregadasPorArticuloId = new Map<string, number>();

  (articulosPrevios ?? []).forEach((art, index) => {
    if (!art.articulo_id) return;
    const prev = parseEntregaItem(prevArray[index]);
    if (prev.entregadas !== null) {
      entregadasPorArticuloId.set(art.articulo_id, prev.entregadas);
    }
  });

  return articulos.map((articulo, index) => {
    const porId = articulo.articulo_id
      ? entregadasPorArticuloId.get(articulo.articulo_id)
      : undefined;
    const porIndice = parseEntregaItem(prevArray[index]).entregadas;
    const entregadasPrev = porId ?? porIndice ?? 0;

    const cantidad = Number(articulo.cantidad) || 0;
    const entregadas = Math.min(Math.max(0, entregadasPrev), cantidad);
    const pendientes = Math.max(0, cantidad - entregadas);

    return { entregadas, pendientes };
  });
}

interface OrdenCompra {
  id: number;
  noc: number;
  fecha: string;
  cuit: string;
  proveedor: string;
  direccion: string;
  telefono: string;
  email: string;
  estado: string;
  total: number;
  divisa?: string;
  importe_competencia?: number | null;
  ahorro?: number | null;
  observaciones?: string;
  condicion_pago?: string;
  tipo_pago?: string;
  articulos: ArticuloOrdenItem[];
  /** Registros de entrega [{ fc, rt, fecha_entrega, fact_path, items }] o legacy paralelo. */
  entregas?: unknown;
  lugar_entrega: string;
  cod_cta?: string;
  sector?: string;
  fc?: unknown;
  /** JSONB array de remitos, ej. [1001, 1002] */
  rt?: unknown;
  fecha_entrega?: string | null;
  /** Fecha acordada / prometida de entrega */
  fecha_prometida?: string | null;
  /** JSON: { abonado: boolean, fecha: string | null } */
  abonado?: unknown;
  fact_path?: unknown;
}

interface Proveedor {
  id: number;
  cuitprov: number;
  nombreprov: string;
  direccionprov: string;
  telefonoprov: number;
  emailprov: string;
}

export default function VerOrdenCompraPage() {
  const [orden, setOrden] = useState<OrdenCompra | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editData, setEditData] = useState({
    noc: '',
    proveedor: '',
    cuit: '',
    direccion: '',
    telefono: '',
    email: '',
    estado: '',
    observaciones: '',
    condicion_pago: '',
    tipo_pago: '',
    lugar_entrega: '',
    cod_cta: '',
    sector: '',
    fecha_entrega: '',
    fecha_prometida: '',
    divisa: 'USD',
    articulos: [] as ArticuloOrdenItem[]
  });
  const [editFacturas, setEditFacturas] = useState<FacturaOrdenItem[]>([]);
  const [nuevaFacturaFc, setNuevaFacturaFc] = useState('');
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [proveedoresFiltrados, setProveedoresFiltrados] = useState<Proveedor[]>([]);
  const [busquedaProveedor, setBusquedaProveedor] = useState('');
  const [saving, setSaving] = useState(false);
  const [facturaUploading, setFacturaUploading] = useState(false);
  const [facturaUploadError, setFacturaUploadError] = useState<string | null>(null);
  const [facturaViewUrls, setFacturaViewUrls] = useState<Record<string, string>>({});
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userRol, setUserRol] = useState<string | null>(null);
  const [accessLoaded, setAccessLoaded] = useState(false);
  const [printSinImportes, setPrintSinImportes] = useState(false);
  const [showArticuloModal, setShowArticuloModal] = useState(false);
  const [nuevoArticulo, setNuevoArticulo] = useState({
    articulo_nombre: '',
    cantidad: 1,
    precio_unitario: 0,
    descuento: 0
  });
  const [showEntregaModal, setShowEntregaModal] = useState(false);
  const [entregaForm, setEntregaForm] = useState({
    fc: "",
    rt: "",
    fecha_entrega: "",
  });
  const [entregaCantidades, setEntregaCantidades] = useState<Record<string, string>>({});
  const [entregaFile, setEntregaFile] = useState<File | null>(null);
  const [entregaSaving, setEntregaSaving] = useState(false);
  const [entregaError, setEntregaError] = useState<string | null>(null);
  const [showVerEntregasModal, setShowVerEntregasModal] = useState(false);
  const [verEntregasLoading, setVerEntregasLoading] = useState(false);
  const [abonadoChecked, setAbonadoChecked] = useState(false);
  const [fechaAbonadoInput, setFechaAbonadoInput] = useState("");
  const [abonadoSaving, setAbonadoSaving] = useState(false);
  const [abonadoError, setAbonadoError] = useState<string | null>(null);
  const params = useParams();
  const router = useRouter();
  const supabase = createClient();
  const canEdit = canEditAsAdmin(userEmail, userRol);
  const canCargarEntrega = canCargarEntregaOrdenes(userEmail, userRol);
  const canViewImportes =
    accessLoaded && canViewImportesOrdenesCompra(userEmail, userRol);

  const enriquecerArticulosOrden = useCallback(
    async (articulos: ArticuloOrdenItem[]): Promise<ArticuloOrdenItem[]> => {
      if (articulos.length === 0) return articulos;

      const codints = [
        ...new Set(articulos.map((a) => a.codint).filter(Boolean)),
      ] as string[];
      const nombres = [
        ...new Set(
          articulos.map((a) => a.articulo_nombre?.trim()).filter(Boolean)
        ),
      ] as string[];

      const codProvPorCodint = new Map<string, string>();
      const codProvPorNombre = new Map<string, string>();
      const codintPorNombre = new Map<string, string>();
      const descPorCodint = new Map<string, string>();
      const descPorNombre = new Map<string, string>();
      const presPorCodint = new Map<string, string>();
      const presPorNombre = new Map<string, string>();

      if (codints.length > 0) {
        const { data } = await supabase
          .from("articulos")
          .select("codint, articulo, codprovsug, descripcion, presentacion")
          .in("codint", codints);
        (data ?? []).forEach((row) => {
          codProvPorCodint.set(row.codint, row.codprovsug ?? "");
          if (row.descripcion) descPorCodint.set(row.codint, row.descripcion);
          if (row.presentacion) presPorCodint.set(row.codint, row.presentacion);
        });
      }

      if (nombres.length > 0) {
        const { data } = await supabase
          .from("articulos")
          .select("codint, articulo, codprovsug, descripcion, presentacion")
          .in("articulo", nombres);
        (data ?? []).forEach((row) => {
          codProvPorNombre.set(row.articulo, row.codprovsug ?? "");
          if (row.codint) codintPorNombre.set(row.articulo, row.codint);
          if (row.descripcion) descPorNombre.set(row.articulo, row.descripcion);
          if (row.presentacion) presPorNombre.set(row.articulo, row.presentacion);
        });
      }

      return articulos.map((art) => {
        const codint =
          art.codint?.trim() ||
          codintPorNombre.get(art.articulo_nombre) ||
          null;
        const descripcion =
          art.descripcion?.trim() ||
          (codint ? descPorCodint.get(codint) : undefined) ||
          descPorNombre.get(art.articulo_nombre) ||
          null;
        const presentacion =
          art.presentacion?.trim() ||
          (codint ? presPorCodint.get(codint) : undefined) ||
          presPorNombre.get(art.articulo_nombre) ||
          null;
        const codprovsug =
          art.codprovsug?.trim() ||
          (codint ? codProvPorCodint.get(codint) : undefined) ||
          codProvPorNombre.get(art.articulo_nombre) ||
          null;

        return { ...art, codint, descripcion, presentacion, codprovsug };
      });
    },
    [supabase]
  );

  const fetchOrden = useCallback(async (id: number) => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("ordenes_compra")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;

      const articulosEnriquecidos = await enriquecerArticulosOrden(
        (data.articulos as ArticuloOrdenItem[]) || []
      );
      setOrden({
        ...data,
        divisa: normalizeDivisa(data.divisa),
        articulos: articulosEnriquecidos,
      });
      const abonadoParsed = parseAbonadoOrden(data.abonado);
      setAbonadoChecked(abonadoParsed.abonado);
      setFechaAbonadoInput(abonadoParsed.fecha ?? "");
      setAbonadoError(null);
    } catch (err) {
      console.error("Error fetching orden:", err);
      setError("Error al cargar la orden de compra");
    } finally {
      setLoading(false);
    }
  }, [supabase, enriquecerArticulosOrden]);

  const fetchProveedores = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("proveedor")
        .select("*");

      if (error) throw error;
      setProveedores(data || []);
    } catch (err) {
      console.error("Error fetching proveedores:", err);
    }
  }, [supabase]);

  const filtrarProveedores = useCallback(() => {
    if (!busquedaProveedor.trim()) {
      setProveedoresFiltrados(proveedores);
      return;
    }

    const terminoBusqueda = busquedaProveedor.toLowerCase().trim();
    
    const proveedoresFiltrados = proveedores.filter(proveedor => 
      proveedor.cuitprov.toString().includes(terminoBusqueda) ||
      proveedor.nombreprov.toLowerCase().includes(terminoBusqueda)
    );
    
    setProveedoresFiltrados(proveedoresFiltrados);
  }, [busquedaProveedor, proveedores]);

  useEffect(() => {
    if (params.id) {
      fetchOrden(Number(params.id));
    }
    fetchProveedores();
    void supabase.auth.getUser().then(async ({ data }) => {
      const user = data.user;
      setUserEmail(user?.email ?? null);
      if (user) {
        const rol = await fetchUserRolByUuid(supabase, user.id);
        setUserRol(rol);
      }
      setAccessLoaded(true);
    });
  }, [params.id, fetchOrden, fetchProveedores, supabase]);

  // Efecto para filtrar proveedores cuando cambia la búsqueda
  useEffect(() => {
    filtrarProveedores();
  }, [filtrarProveedores]);

  useEffect(() => {
    const resetPrintMode = () => setPrintSinImportes(false);
    window.addEventListener("afterprint", resetPrintMode);
    return () => window.removeEventListener("afterprint", resetPrintMode);
  }, []);

  useEffect(() => {
    if (!orden) {
      setFacturaViewUrls({});
      return;
    }
    const facturas = parseFacturasFromOrden(orden);
    const paths = facturas
      .map((item) => item.path)
      .filter((path): path is string => Boolean(path));
    if (paths.length === 0) {
      setFacturaViewUrls({});
      return;
    }
    let cancelled = false;
    void loadFacturaViewUrls(supabase, paths).then((urls) => {
      if (!cancelled) setFacturaViewUrls(urls);
    });
    return () => {
      cancelled = true;
    };
  }, [orden, supabase]);

  // Sincronizar divisa de la orden con todos los artículos cuando cambia
  useEffect(() => {
    if (showEditModal && editData.articulos.length > 0) {
      const divisaOrden = normalizeDivisa(editData.divisa);
      const tieneOtroDivisa = editData.articulos.some(a => normalizeDivisa(a.divisa) !== divisaOrden);
      if (tieneOtroDivisa) {
        setEditData(prev => ({
          ...prev,
          divisa: divisaOrden,
          articulos: prev.articulos.map(a => ({
            ...a,
            divisa: divisaOrden
          }))
        }));
      }
    }
  }, [editData.divisa, showEditModal]);

  const ESTADOS_ORDEN = {
    pendiente: { color: "bg-yellow-100 text-yellow-800", text: "Pendiente" },
    aprobada: { color: "bg-green-100 text-green-800", text: "Aprobada" },
    rechazada: { color: "bg-red-100 text-red-800", text: "Rechazada" },
    cumplida: { color: "bg-blue-100 text-blue-800", text: "Cumplida" },
    entrego_parcial: { color: "bg-orange-100 text-orange-800", text: "Entregó Parcial" },
    anulado: { color: "bg-red-100 text-red-800", text: "Anulado" },
  } as const;

  const getEstadoText = (estado: string) =>
    ESTADOS_ORDEN[estado as keyof typeof ESTADOS_ORDEN]?.text ?? ESTADOS_ORDEN.pendiente.text;

  const getEstadoBadge = (estado: string) => {
    const estadoInfo = ESTADOS_ORDEN[estado as keyof typeof ESTADOS_ORDEN] || ESTADOS_ORDEN.pendiente;
    return (
      <>
        <Badge className={`${estadoInfo.color} print-estado-badge`}>{estadoInfo.text}</Badge>
        <span className="hidden print-estado-text">{estadoInfo.text}</span>
      </>
    );
  };

  const formatFechaOrden = (fecha: string, compact = false) => {
    const d = new Date(fecha);
    if (compact) {
      return d.toLocaleDateString("es-AR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    }
    return d.toLocaleDateString("es-AR", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatDateLocal = (dateStr: string | null | undefined) => {
    if (!dateStr) return '';
    const parts = dateStr.split('T')[0].split('-');
    if (parts.length !== 3) return '';
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    if (Number.isNaN(year) || Number.isNaN(month) || Number.isNaN(day)) return '';
    return new Date(year, month, day).toLocaleDateString('es-AR');
  };

  const formatDateForInput = (dateStr: string | null | undefined) => {
    if (!dateStr) return '';
    return dateStr.split('T')[0];
  };

  const persistFechaAbonado = async (checked: boolean, fecha: string | null) => {
    if (!orden) return;
    setAbonadoSaving(true);
    setAbonadoError(null);
    try {
      const payload = serializeAbonadoOrden(checked, fecha);
      const { error: updateError } = await supabase
        .from("ordenes_compra")
        .update({ abonado: payload })
        .eq("id", orden.id);

      if (updateError) {
        setAbonadoError(getSupabaseErrorMessage(updateError));
        return;
      }

      setOrden((prev) =>
        prev ? { ...prev, abonado: payload } : prev
      );
    } catch (err) {
      console.error("Error guardando abonado:", err);
      setAbonadoError(getSupabaseErrorMessage(err));
    } finally {
      setAbonadoSaving(false);
    }
  };

  const handleToggleAbonado = async (checked: boolean) => {
    setAbonadoChecked(checked);
    setAbonadoError(null);
    if (!checked) {
      setFechaAbonadoInput("");
      await persistFechaAbonado(false, null);
      return;
    }
    // Al activar, si ya hay fecha la guarda; si no, espera a que elijan una
    if (fechaAbonadoInput) {
      await persistFechaAbonado(true, fechaAbonadoInput);
    }
  };

  const handleFechaAbonadoChange = async (value: string) => {
    setFechaAbonadoInput(value);
    setAbonadoError(null);
    if (!value) return;
    setAbonadoChecked(true);
    await persistFechaAbonado(true, value);
  };

  const calcularPrecioConDescuento = (precio: number, descuento?: number) => {
    const descuentoNormalizado = Math.min(Math.max(descuento ?? 0, 0), 100);
    return precio - (precio * descuentoNormalizado) / 100;
  };

  const getRowTotal = (item: ArticuloOrdenItem) => {
    const precioConDescuento = calcularPrecioConDescuento(
      item.precio_unitario,
      item.descuento
    );
    return typeof item.total === "number" && !Number.isNaN(item.total)
      ? item.total
      : item.cantidad * precioConDescuento;
  };

  const handleOpenEntregaModal = () => {
    if (!orden) return;
    const cantidades: Record<string, string> = {};
    (orden.articulos || []).forEach((art) => {
      cantidades[art.articulo_id] = "";
    });
    setEntregaForm({ fc: "", rt: "", fecha_entrega: "" });
    setEntregaCantidades(cantidades);
    setEntregaFile(null);
    setEntregaError(null);
    setShowEntregaModal(true);
  };

  const handleCloseEntregaModal = () => {
    setShowEntregaModal(false);
    setEntregaForm({ fc: "", rt: "", fecha_entrega: "" });
    setEntregaCantidades({});
    setEntregaFile(null);
    setEntregaError(null);
  };

  const handleOpenVerEntregasModal = async () => {
    if (!orden) return;
    setShowVerEntregasModal(true);
    setVerEntregasLoading(true);
    try {
      const registros = toEntregaRegistrosPreserving(
        orden.entregas,
        orden.articulos || []
      );
      const paths = registros
        .map((reg) => reg.fact_path)
        .filter((path): path is string => Boolean(path?.trim()));
      if (paths.length > 0) {
        const urls = await loadFacturaViewUrls(supabase, paths);
        setFacturaViewUrls((prev) => ({ ...prev, ...urls }));
      }
    } catch (err) {
      console.error("Error cargando URLs de entregas:", err);
    } finally {
      setVerEntregasLoading(false);
    }
  };

  const handleGuardarEntrega = async () => {
    if (!orden) return;

    setEntregaError(null);

    const fcTrim = entregaForm.fc.trim();
    const rtTrim = entregaForm.rt.trim();
    const fecha = entregaForm.fecha_entrega.trim();

    let fcNumero: number | null = null;
    if (fcTrim) {
      fcNumero = parseInt(fcTrim, 10);
      if (!Number.isFinite(fcNumero)) {
        setEntregaError("La factura debe ser un número válido.");
        return;
      }
    }

    let rtNumero: number | null = null;
    if (rtTrim) {
      rtNumero = parseInt(rtTrim, 10);
      if (!Number.isFinite(rtNumero)) {
        setEntregaError("El remito debe ser un número válido.");
        return;
      }
    }

    if (fcNumero === null && rtNumero === null) {
      setEntregaError(
        "Debe cargar al menos un documento de recepción: número de factura o número de remito."
      );
      return;
    }

    if (!fecha) {
      setEntregaError("Ingrese la fecha de entrega.");
      return;
    }

    if (!entregaFile) {
      setEntregaError("Adjunte el documento escaneado (PDF, JPG o PNG).");
      return;
    }

    const fileExt = entregaFile.name.split(".").pop()?.toLowerCase() || "";
    if (!/^(pdf|jpg|jpeg|png)$/i.test(fileExt)) {
      setEntregaError("Formato no permitido. Use PDF, JPG o PNG.");
      return;
    }

    const items: EntregaItemCantidad[] = [];
    for (const art of orden.articulos || []) {
      const raw = (entregaCantidades[art.articulo_id] ?? "").trim();
      if (!raw) continue;
      const cant = Number(raw);
      if (!Number.isFinite(cant) || cant < 0) {
        setEntregaError(`Cantidad inválida para "${art.articulo_nombre}".`);
        return;
      }
      if (cant === 0) continue;

      const yaEntregadas = getEntregadasAgregadas(
        orden.entregas,
        art.articulo_id,
        (orden.articulos || []).findIndex((a) => a.articulo_id === art.articulo_id)
      );
      const pendiente = Math.max(0, (Number(art.cantidad) || 0) - yaEntregadas);
      if (cant > pendiente) {
        setEntregaError(
          `"${art.articulo_nombre}": no puede entregar ${cant}. Pendiente: ${pendiente}.`
        );
        return;
      }

      items.push({
        articulo_id: art.articulo_id,
        cantidad_entregada: cant,
      });
    }

    if (items.length === 0) {
      setEntregaError("Indique al menos una cantidad entregada mayor a 0.");
      return;
    }

    setEntregaSaving(true);
    try {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !sessionData.session) {
        setEntregaError("Debe iniciar sesión para cargar la entrega.");
        return;
      }

      // Leer data actual de la DB para no pisar entregas/facturas/remitos previos
      const { data: ordenDb, error: fetchError } = await supabase
        .from("ordenes_compra")
        .select("fc, fact_path, rt, fecha_entrega, entregas, articulos")
        .eq("id", orden.id)
        .single();

      if (fetchError) {
        setEntregaError(
          `No se pudo leer la orden actual: ${getSupabaseErrorMessage(fetchError)}`
        );
        return;
      }

      const articulosBase =
        (orden.articulos?.length ? orden.articulos : (ordenDb.articulos as ArticuloOrdenItem[])) ||
        [];
      const entregasPrevias = toEntregaRegistrosPreserving(
        ordenDb.entregas ?? orden.entregas,
        articulosBase
      );

      const storagePath = getFacturaStoragePathUnique(orden.id, fileExt);
      const contentType =
        fileExt === "pdf"
          ? "application/pdf"
          : entregaFile.type || `image/${fileExt === "jpg" ? "jpeg" : fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from(getFactComprasBucket())
        .upload(storagePath, entregaFile, {
          upsert: false,
          contentType,
        });

      if (uploadError) {
        setEntregaError(`No se pudo subir el documento: ${getSupabaseErrorMessage(uploadError)}`);
        return;
      }

      const facturasExistentes = parseFacturasFromOrden({
        fc: ordenDb.fc ?? orden.fc,
        fact_path: ordenDb.fact_path ?? orden.fact_path,
      }).filter((f) => f.fc !== null && f.path) as { fc: number; path: string }[];

      // Acumular: no reemplazar facturas previas (aunque sea el mismo FC)
      const facturasMerged =
        fcNumero !== null
          ? [...facturasExistentes, { fc: fcNumero, path: storagePath }]
          : facturasExistentes;
      const facturasPayload = buildFacturasUpdatePayload(orden, facturasMerged);

      const nuevoRegistro: EntregaRegistro = {
        fc: fcNumero,
        rt: rtNumero,
        fecha_entrega: fecha,
        fact_path: storagePath,
        items,
      };

      const entregasFinal: EntregaRegistro[] = [...entregasPrevias, nuevoRegistro];
      const rtArray = appendRtToArray(ordenDb.rt ?? orden.rt, rtNumero);
      const estadoEntrega = computeEstadoDesdeEntregas(articulosBase, entregasFinal);

      const updatePayload = {
        fc: facturasPayload.fc,
        fact_path: facturasPayload.fact_path,
        rt: rtArray,
        fecha_entrega: fecha,
        entregas: entregasFinal,
        estado: estadoEntrega,
      };

      const { error: updateError } = await supabase
        .from("ordenes_compra")
        .update(updatePayload)
        .eq("id", orden.id);

      if (updateError) {
        setEntregaError(
          `El documento se subió, pero no se guardó la entrega: ${getSupabaseErrorMessage(updateError)}`
        );
        return;
      }

      const pathKey = getFacturaPathKey(storagePath) ?? storagePath;
      const viewUrl =
        (await getFacturaViewUrl(supabase, storagePath)) ??
        getFacturaPublicUrl(storagePath);
      if (viewUrl) {
        setFacturaViewUrls((prev) => ({ ...prev, [pathKey]: viewUrl }));
      }

      setOrden((prev) =>
        prev
          ? {
              ...prev,
              fc: facturasPayload.fc,
              fact_path: facturasPayload.fact_path,
              rt: rtArray,
              fecha_entrega: fecha,
              entregas: entregasFinal,
              estado: estadoEntrega,
            }
          : prev
      );

      handleCloseEntregaModal();
    } catch (err) {
      console.error("Error guardando entrega:", err);
      setEntregaError(getSupabaseErrorMessage(err));
    } finally {
      setEntregaSaving(false);
    }
  };

  const handleOpenEditModal = () => {
    if (orden) {
      setEditData({
        noc: orden.noc.toString(),
        proveedor: orden.proveedor,
        cuit: orden.cuit,
        direccion: orden.direccion,
        telefono: orden.telefono,
        email: orden.email || '',
        estado: orden.estado,
        observaciones: orden.observaciones || '',
        condicion_pago: orden.condicion_pago || '',
        tipo_pago: orden.tipo_pago || '',
        lugar_entrega: orden.lugar_entrega,
        cod_cta: orden.cod_cta || '',
        sector: orden.sector || '',
        fecha_entrega: formatDateForInput(orden.fecha_entrega),
        fecha_prometida: formatDateForInput(orden.fecha_prometida),
        divisa: normalizeDivisa(orden.divisa),
        articulos: (orden.articulos || []).map((item) => ({
          ...item,
          divisa: normalizeDivisa(orden.divisa),
          costunitcdesc:
            item.costunitcdesc ??
            calcularPrecioConDescuento(item.precio_unitario, item.descuento),
        }))
      });
      setEditFacturas(parseFacturasFromOrden(orden));
      setNuevaFacturaFc('');
      setBusquedaProveedor('');
      setShowEditModal(true);
    }
  };

  const handleCloseEditModal = () => {
    setShowEditModal(false);
    setEditData({ 
      noc: '', 
      proveedor: '', 
      cuit: '', 
      direccion: '', 
      telefono: '', 
      email: '',
      estado: '',
      observaciones: '',
      condicion_pago: '',
      tipo_pago: '',
      lugar_entrega: '',
      cod_cta: '',
      sector: '',
      fecha_entrega: '',
      fecha_prometida: '',
      divisa: 'USD',
      articulos: []
    });
    setEditFacturas([]);
    setNuevaFacturaFc('');
    setBusquedaProveedor('');
    setFacturaUploadError(null);
  };

  const persistirFacturas = async (facturas: FacturaOrdenItem[]) => {
    if (!orden) return { error: new Error("Orden no disponible") };

    const incompletas = findFacturasIncompletas(facturas);
    if (incompletas.length > 0) {
      return {
        error: new Error(
          "Cada factura debe tener número FC e imagen. Complete o quite las facturas incompletas."
        ),
      };
    }

    const updatePayload = buildFacturasUpdatePayload(orden, facturas);
    const { error: updateError } = await supabase
      .from("ordenes_compra")
      .update(updatePayload)
      .eq("id", orden.id);

    if (updateError) {
      console.error("DB update facturas error:", updateError, "payload:", updatePayload);
      return { error: updateError };
    }

    const savedPayload = updatePayload;

    const facturasGuardadas = parseFacturasFromOrden({
      fc: savedPayload.fc,
      fact_path: savedPayload.fact_path,
    });
    setEditFacturas(facturasGuardadas);
    setOrden((prev) =>
      prev
        ? {
            ...prev,
            fc: savedPayload.fc,
            fact_path: savedPayload.fact_path,
          }
        : prev
    );
    return { error: null };
  };

  const handleSubirImagenFactura = async (file: File) => {
    if (!orden) return;

    if (!nuevaFacturaFc.trim()) {
      setFacturaUploadError("Debe ingresar el número de factura (FC) antes de subir la imagen.");
      return;
    }

    const fcNumero = parseInt(nuevaFacturaFc.trim(), 10);
    if (!Number.isFinite(fcNumero)) {
      setFacturaUploadError("Ingrese un número de factura válido.");
      return;
    }

    const fcDuplicado = editFacturas.some((item) => item.fc === fcNumero);
    if (fcDuplicado) {
      setFacturaUploadError(`Ya existe una factura con el FC ${fcNumero}.`);
      return;
    }

    const fileExt = file.name.split(".").pop()?.toLowerCase() || "jpg";
    if (!/^(jpg|jpeg|png|gif|webp|bmp|pdf)$/i.test(fileExt)) {
      setFacturaUploadError("Formato no permitido. Use JPG, PNG, WEBP, GIF, BMP o PDF.");
      return;
    }

    setFacturaUploading(true);
    setFacturaUploadError(null);

    try {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !sessionData.session) {
        setFacturaUploadError("Debe iniciar sesión para subir la factura.");
        return;
      }

      const storagePath = getFacturaStoragePathUnique(orden.id, fileExt);
      const contentType = file.type || `image/${fileExt === "jpg" ? "jpeg" : fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from(getFactComprasBucket())
        .upload(storagePath, file, {
          upsert: false,
          contentType: fileExt === "pdf" ? "application/pdf" : contentType,
        });

      if (uploadError) {
        console.error("Storage upload error:", uploadError);
        setFacturaUploadError(
          `No se pudo subir al storage: ${getSupabaseErrorMessage(uploadError)}`
        );
        return;
      }

      const facturasActualizadas: FacturaOrdenItem[] = [
        ...editFacturas,
        { fc: fcNumero, path: storagePath },
      ];
      const { error: persistError } = await persistirFacturas(facturasActualizadas);
      if (persistError) {
        console.error("DB update facturas error:", persistError);
        setFacturaUploadError(
          `La imagen se subió, pero no se guardó en la orden: ${getSupabaseErrorMessage(persistError)}.`
        );
        return;
      }

      const pathKey = getFacturaPathKey(storagePath) ?? storagePath;
      const viewUrl =
        (await getFacturaViewUrl(supabase, storagePath)) ??
        getFacturaPublicUrl(storagePath);
      if (viewUrl) {
        setFacturaViewUrls((prev) => ({ ...prev, [pathKey]: viewUrl }));
      }
      setNuevaFacturaFc("");
    } catch (err) {
      console.error("Error subiendo imagen de factura:", err);
      setFacturaUploadError(getSupabaseErrorMessage(err));
    } finally {
      setFacturaUploading(false);
    }
  };

  const handleQuitarFactura = async (index: number) => {
    const facturasActualizadas = editFacturas.filter((_, i) => i !== index);
    setFacturaUploadError(null);
    const { error } = await persistirFacturas(facturasActualizadas);
    if (error) {
      setFacturaUploadError(
        `No se pudo quitar la factura: ${getSupabaseErrorMessage(error)}`
      );
    }
  };

  const handleActualizarFcFactura = (index: number, value: string) => {
    setEditFacturas((prev) =>
      prev.map((item, i) => {
        if (i !== index) return item;
        const fc = value.trim() ? parseInt(value.trim(), 10) : null;
        return {
          ...item,
          fc: fc !== null && Number.isFinite(fc) ? fc : null,
        };
      })
    );
  };

  const handleSeleccionarProveedor = (proveedor: Proveedor) => {
    setEditData({
      ...editData,
      proveedor: proveedor.nombreprov,
      cuit: proveedor.cuitprov.toString(),
      direccion: proveedor.direccionprov,
      telefono: proveedor.telefonoprov.toString(),
      email: proveedor.emailprov
    });
    setBusquedaProveedor(proveedor.nombreprov);
  };

  const actualizarArticulosSupabase = async (
    articulos: typeof editData.articulos,
    proveedor: string
  ) => {
    let updateUsuario: string | null = null;
    try {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (!userError && userData.user) {
        const { data: perfil, error: perfilError } = await supabase
          .from("usuarios")
          .select("nombre")
          .eq("uuid", userData.user.id)
          .single();
        if (!perfilError && perfil?.nombre) {
          updateUsuario = perfil.nombre;
        } else {
          updateUsuario = userData.user.email || null;
        }
      }
    } catch (err) {
      console.error("Error obteniendo usuario para update_usuario:", err);
    }

    const resultados = await Promise.all(
      articulos.map(async (item) => {
        const nombreArticulo = item.articulo_nombre?.trim();
        if (!nombreArticulo) {
          return { error: null };
        }
        const payload = {
          costunit: item.precio_unitario,
          descuento: item.descuento ?? 0,
          costunitcdesc: calcularPrecioConDescuento(
            item.precio_unitario,
            item.descuento ?? 0
          ),
          divisa: normalizeDivisa(item.divisa),
          ultimo_prov: proveedor || null,
          update_usuario: updateUsuario,
          updated_at: new Date().toISOString(),
        };
        const { data: exactMatch, error: exactError } = await supabase
          .from("articulos")
          .select("id")
          .or(`codint.eq.${nombreArticulo},articulo.eq.${nombreArticulo}`)
          .limit(1)
          .maybeSingle();

        if (exactError) {
          return { error: exactError };
        }

        if (exactMatch?.id) {
          const { error: updateError } = await supabase
            .from("articulos")
            .update(payload)
            .eq("id", exactMatch.id);
          if (updateError) {
            return { error: updateError };
          }
          return { error: null };
        }

        const { data: ilikeMatch, error: ilikeError } = await supabase
          .from("articulos")
          .select("id")
          .ilike("articulo", nombreArticulo)
          .limit(1)
          .maybeSingle();

        if (ilikeError) {
          return { error: ilikeError };
        }

        if (ilikeMatch?.id) {
          const { error: updateError } = await supabase
            .from("articulos")
            .update(payload)
            .eq("id", ilikeMatch.id);
          if (updateError) {
            return { error: updateError };
          }
        }

        return { error: null };
      })
    );

    const errorActualizacion = resultados.find((res) => res.error)?.error;
    if (errorActualizacion) {
      throw errorActualizacion;
    }
  };

  const handleSaveEdit = async () => {
    if (!orden) return;

    try {
      setSaving(true);

      const incompletas = findFacturasIncompletas(editFacturas);
      if (incompletas.length > 0) {
        setFacturaUploadError(
          "Cada factura debe tener número FC e imagen. Complete o quite las facturas incompletas."
        );
        return;
      }

      const divisaOrden = normalizeDivisa(editData.divisa);
      const articulosActualizados = editData.articulos.map((item) => ({
        ...item,
        divisa: divisaOrden,
        costunitcdesc: calcularPrecioConDescuento(item.precio_unitario, item.descuento),
        total: getRowTotal(item),
      }));
      const totalOrden = articulosActualizados.reduce((sum, item) => sum + item.total, 0);

      const facturasPayload = buildFacturasUpdatePayload(orden, editFacturas);
      const entregas = buildEntregasFromArticulos(
        articulosActualizados,
        orden.articulos,
        orden.entregas
      );
      const payload = {
        divisa: divisaOrden,
        noc: parseInt(editData.noc),
        proveedor: editData.proveedor,
        cuit: editData.cuit,
        direccion: editData.direccion,
        telefono: editData.telefono,
        estado: editData.estado,
        observaciones: editData.observaciones,
        condicion_pago: editData.condicion_pago,
        tipo_pago: editData.tipo_pago || null,
        lugar_entrega: editData.lugar_entrega,
        cod_cta: editData.cod_cta || null,
        sector: editData.sector || null,
        fc: facturasPayload.fc,
        rt: coerceRtArray(orden.rt),
        fecha_entrega: editData.fecha_entrega || null,
        fecha_prometida: editData.fecha_prometida || null,
        fact_path: facturasPayload.fact_path,
        articulos: articulosActualizados,
        entregas,
        total: totalOrden,
      };

      const { data: datosActualizados, error } = await supabase
        .from("ordenes_compra")
        .update(payload)
        .eq("id", orden.id)
        .select("id, divisa, total")
        .single();

      if (error) {
        console.error("Error actualizando ordenes_compra:", error);
        throw error;
      }

      // Update explícito de divisa (asegura que se persista si el payload principal lo ignora)
      await supabase
        .from("ordenes_compra")
        .update({ divisa: divisaOrden })
        .eq("id", orden.id);

      try {
        await actualizarArticulosSupabase(articulosActualizados, editData.proveedor);
      } catch (updateError) {
        console.error("Error actualizando artículos:", updateError);
        setError("Orden actualizada, pero no se pudieron actualizar los artículos");
        return;
      }

      // Actualizar el estado local (usar divisa de la respuesta si vino)
      setOrden({
        ...orden,
        noc: parseInt(editData.noc),
        proveedor: editData.proveedor,
        cuit: editData.cuit,
        direccion: editData.direccion,
        telefono: editData.telefono,
        estado: editData.estado,
        observaciones: editData.observaciones,
        condicion_pago: editData.condicion_pago,
        tipo_pago: editData.tipo_pago || undefined,
        lugar_entrega: editData.lugar_entrega,
        cod_cta: editData.cod_cta || undefined,
        sector: editData.sector || undefined,
        fc: facturasPayload.fc,
        rt: coerceRtArray(orden.rt),
        fecha_entrega: editData.fecha_entrega || null,
        fecha_prometida: editData.fecha_prometida || null,
        fact_path: facturasPayload.fact_path,
        articulos: articulosActualizados,
        entregas,
        total: totalOrden,
        divisa: datosActualizados?.divisa ?? divisaOrden
      });

      setShowEditModal(false);
    } catch (err) {
      console.error("Error actualizando orden:", err);
      setError("Error al actualizar la orden");
    } finally {
      setSaving(false);
    }
  };

  // Funciones para manejar artículos
  const handleAgregarArticulo = () => {
    if (!nuevoArticulo.articulo_nombre.trim()) return;
    
    const precioConDescuento = calcularPrecioConDescuento(
      nuevoArticulo.precio_unitario,
      nuevoArticulo.descuento
    );
    const divisaArt = normalizeDivisa(editData.divisa);
    const articulo = {
      articulo_id: `temp-${Date.now()}`,
      articulo_nombre: nuevoArticulo.articulo_nombre,
      cantidad: nuevoArticulo.cantidad,
      precio_unitario: nuevoArticulo.precio_unitario,
      descuento: nuevoArticulo.descuento,
      divisa: divisaArt,
      costunitcdesc: precioConDescuento,
      total: nuevoArticulo.cantidad * precioConDescuento
    };
    
    setEditData({
      ...editData,
      articulos: [...editData.articulos, articulo]
    });
    
    setNuevoArticulo({
      articulo_nombre: '',
      cantidad: 1,
      precio_unitario: 0,
      descuento: 0
    });
    setShowArticuloModal(false);
  };

  const handleEliminarArticulo = (index: number) => {
    setEditData({
      ...editData,
      articulos: editData.articulos.filter((_, i) => i !== index)
    });
  };

  const handleEditarArticulo = (index: number, campo: string, valor: string | number) => {
    const articulosActualizados = [...editData.articulos];
    const valorNumero = typeof valor === "string" ? parseFloat(valor) || 0 : valor;
    articulosActualizados[index] = {
      ...articulosActualizados[index],
      [campo]: valor,
      total: campo === 'cantidad' || campo === 'precio_unitario' || campo === 'descuento'
        ? (() => {
            const cantidad = campo === 'cantidad' ? (valorNumero as number) : articulosActualizados[index].cantidad;
            const precio = campo === 'precio_unitario' ? (valorNumero as number) : articulosActualizados[index].precio_unitario;
            const descuento = campo === 'descuento' ? (valorNumero as number) : (articulosActualizados[index].descuento ?? 0);
            const precioConDescuento = calcularPrecioConDescuento(precio, descuento);
            return cantidad * precioConDescuento;
          })()
        : articulosActualizados[index].total
    };
    if (campo === "cantidad" || campo === "precio_unitario" || campo === "descuento") {
      const precio = articulosActualizados[index].precio_unitario;
      const descuento = articulosActualizados[index].descuento ?? 0;
      articulosActualizados[index].costunitcdesc = calcularPrecioConDescuento(precio, descuento);
    }
    
    setEditData({
      ...editData,
      articulos: articulosActualizados
    });
  };

  const handleImprimir = (sinImportes = false) => {
    try {
      setPrintSinImportes(sinImportes);
      setTimeout(() => {
        window.print();
      }, 150);
    } catch (error) {
      console.error("Error al imprimir:", error);
      setPrintSinImportes(false);
      const titulo = sinImportes ? "Orden de Recepción" : "Orden de Compra";
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(`
          <html>
            <head><title>${titulo} #${orden?.noc}</title></head>
            <body>
              <h1>${titulo} #${orden?.noc}</h1>
              <p>Use Ctrl+P para imprimir esta página</p>
            </body>
          </html>
        `);
        printWindow.document.close();
        printWindow.print();
      }
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-lg">Cargando orden de compra...</div>
      </div>
    );
  }

  if (error || !orden) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-red-600 text-lg">{error || "Orden no encontrada"}</div>
      </div>
    );
  }

  const totalOrdenCalculado = orden.articulos?.reduce(
    (sum, item) => sum + getRowTotal(item),
    0
  ) || 0;
  const facturasOrden = parseFacturasFromOrden(orden);
  const fcImpresion = facturasOrden
    .map((item) => item.fc)
    .filter((fc): fc is number => fc !== null)
    .join(", ");

  const resolveFacturaHref = (path: string | null | undefined) => {
    if (!path) return null;
    const key = getFacturaPathKey(path) ?? path.trim();
    return facturaViewUrls[key] ?? getFacturaPublicUrl(path);
  };

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: printStyles }} />
      <div className={`w-full max-w-6xl mx-auto p-6 print-container${printSinImportes ? " print-sin-importes" : ""}${!canViewImportes ? " vista-sin-importes" : ""}`}>
        {/* Encabezado compacto en impresión */}
        <div className="mb-6 print-header">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-800 print-header-company">
              Perfiles y Servicios SRL
            </h1>
            <h2 className="hidden print:block print-header-title print-title-oc text-gray-900">
              Orden de Compra #{orden.noc}
            </h2>
            <h2 className="hidden print-header-title print-title-or text-gray-900">
              Orden de Recepción #{orden.noc}
            </h2>
            <p className="hidden print-header-total print:block text-gray-800">
              Total: {formatImporte(totalOrdenCalculado, orden.divisa)}
            </p>
          </div>
          <div className="hidden print-header-meta print:flex print:justify-center">
            <span><strong>Estado:</strong> {getEstadoText(orden.estado)}</span>
            <span><strong>Fecha:</strong> {formatFechaOrden(orden.fecha, true)}</span>
            {orden.condicion_pago && (
              <span><strong>Pago:</strong> {orden.condicion_pago}</span>
            )}
            {orden.fecha_entrega && (
              <span><strong>Entrega:</strong> {formatDateLocal(orden.fecha_entrega)}</span>
            )}
            {orden.cod_cta && <span><strong>Cta:</strong> {orden.cod_cta}</span>}
            {orden.sector && <span><strong>Sector:</strong> {orden.sector}</span>}
            {fcImpresion && <span><strong>FC:</strong> {fcImpresion}</span>}
            {formatRtDisplay(orden.rt) && (
              <span><strong>RT:</strong> {formatRtDisplay(orden.rt)}</span>
            )}
          </div>
        </div>

        <div className="mb-6 print:hidden flex flex-row flex-wrap items-center justify-between gap-3">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 shrink-0">
            📋 Orden de Compra #{orden.noc}
          </h2>
          <div
            className="flex flex-row flex-nowrap items-center gap-2 overflow-x-auto"
            style={{ display: "flex", flexDirection: "row", flexWrap: "nowrap" }}
          >
            <Button
              onClick={handleOpenVerEntregasModal}
              variant="outline"
              size="sm"
              className="shrink-0 whitespace-nowrap border-teal-500 text-teal-700 hover:bg-teal-50"
            >
              👁️ Ver entregas
            </Button>
            {canCargarEntrega && (
              <Button
                onClick={handleOpenEntregaModal}
                variant="outline"
                size="sm"
                className="shrink-0 whitespace-nowrap border-emerald-500 text-emerald-700 hover:bg-emerald-50"
              >
                📦 Cargar entrega
              </Button>
            )}
            {canEdit && (
              <Button
                onClick={handleOpenEditModal}
                variant="outline"
                size="sm"
                className="shrink-0 whitespace-nowrap border-blue-500 text-blue-600 hover:bg-blue-50"
              >
                ✏️ Editar
              </Button>
            )}
            <Button
              onClick={() => router.push("/auth/rutaproductivos/lista-pedidosproductivosadmin")}
              variant="outline"
              size="sm"
              className="shrink-0 whitespace-nowrap border-orange-500 text-orange-600 hover:bg-orange-50"
            >
              🏭 Pedidos Productivos
            </Button>
            <Button
              onClick={() => router.push("/auth/list-adminpedidosgenerales")}
              variant="outline"
              size="sm"
              className="shrink-0 whitespace-nowrap border-purple-500 text-purple-600 hover:bg-purple-50"
            >
              📋 Pedidos Generales
            </Button>
            <Button
              onClick={() => router.push("/auth/ordenes-compra")}
              variant="outline"
              size="sm"
              className="shrink-0 whitespace-nowrap"
            >
              🔙 Volver a la Lista
            </Button>
          </div>
        </div>

      <div className="grid gap-4 print:gap-1">
        <div className="print-info-top grid gap-4">
          {/* Información del Proveedor */}
          <Card className="print-section">
            <CardHeader className="print-section-header print:py-2">
              <CardTitle className="text-2xl print:text-[10px]">Proveedor</CardTitle>
            </CardHeader>
            <CardContent className="print-section-body print:py-2">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 print-info-grid">
                <div className="print-field">
                  <p className="text-base text-gray-600 print-field-label">Nombre</p>
                  <p className="text-base font-medium print-field-value">{orden.proveedor}</p>
                </div>
                <div className="print-field">
                  <p className="text-base text-gray-600 print-field-label">CUIT</p>
                  <p className="text-base font-medium print-field-value">{orden.cuit}</p>
                </div>
                <div className="print-field">
                  <p className="text-base text-gray-600 print-field-label">Teléfono</p>
                  <p className="text-base font-medium print-field-value">{orden.telefono}</p>
                </div>
                <div className="print-field">
                  <p className="text-base text-gray-600 print-field-label">Email</p>
                  <p className="text-base font-medium print-field-value">{orden.email}</p>
                </div>
                <div className="print-field print-field-block md:col-span-2">
                  <p className="text-base text-gray-600 print-field-label">Dirección</p>
                  <p className="text-base font-medium print-field-value">{orden.direccion}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Información Principal */}
          <Card className="print-section">
            <CardHeader className="print-section-header print:py-2">
              <CardTitle className="text-2xl print:text-[10px]">Información General</CardTitle>
            </CardHeader>
            <CardContent className="print-section-body print:py-2">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 print-info-grid">
                <div className="print-field print:hidden">
                  <p className="text-base text-gray-600 print-field-label">Estado</p>
                  <div className="mt-1">{getEstadoBadge(orden.estado)}</div>
                </div>
                <div className="print-field print:hidden space-y-3">
                  <div>
                    <p className="text-base text-gray-600 print-field-label">Fecha de Creación</p>
                    <p className="text-base font-medium print-field-value">
                      {formatFechaOrden(orden.fecha)}
                    </p>
                  </div>
                  <div>
                    <p className="text-base text-gray-600 print-field-label">Fecha acordada de entrega</p>
                    <p className="text-base font-medium print-field-value">
                      {orden.fecha_prometida
                        ? formatDateLocal(orden.fecha_prometida)
                        : "No especificada"}
                    </p>
                  </div>
                </div>
                <div className="print-field print-field-importe print:hidden">
                  <p className="text-base text-gray-600 print-field-label">Total de la Orden</p>
                  <p className="text-3xl font-bold text-green-600 print-field-value whitespace-nowrap">
                    {formatImporte(totalOrdenCalculado, orden.divisa)}
                  </p>
                </div>
                <div className="print-field print:hidden md:col-span-2">
                  <p className="text-base text-gray-600 print-field-label">Condición de Pago</p>
                  <div className="flex flex-wrap items-center gap-3 mt-1">
                    <p className="text-base font-medium print-field-value">
                      {orden.condicion_pago || "No especificada"}
                    </p>
                    <label className="inline-flex items-center gap-2 text-sm text-gray-700 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={abonadoChecked}
                        disabled={!canEdit || abonadoSaving}
                        onChange={(e) => handleToggleAbonado(e.target.checked)}
                        className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                      />
                      Abonado
                    </label>
                    {abonadoChecked && (
                      <div className="flex items-center gap-2">
                        <Label htmlFor="fecha-abonado" className="text-sm text-gray-600 whitespace-nowrap">
                          Fecha abonado
                        </Label>
                        <Input
                          id="fecha-abonado"
                          type="date"
                          value={fechaAbonadoInput}
                          disabled={!canEdit || abonadoSaving}
                          onChange={(e) => handleFechaAbonadoChange(e.target.value)}
                          className="w-40 h-9"
                        />
                      </div>
                    )}
                  </div>
                  {abonadoError && (
                    <p className="text-sm text-red-600 mt-1">{abonadoError}</p>
                  )}
                </div>
                <div className="print-field print-field-block">
                  <p className="text-base text-gray-600 print-field-label">Dirección de Entrega</p>
                  <p className="text-base font-medium print-field-value">{orden.lugar_entrega}</p>
                </div>
                <div className={`print-field print-field-block md:col-span-2${!orden.observaciones?.trim() ? " print:hidden" : ""}`}>
                  <p className="text-base text-gray-600 print-field-label">Observaciones</p>
                  <p className="text-base font-medium print-field-value">
                    {orden.observaciones?.trim() || "Sin observaciones"}
                  </p>
                </div>
                {orden.cod_cta && (
                  <div className="print-field print:hidden">
                    <p className="text-base text-gray-600 print-field-label">Código de Cuenta</p>
                    <p className="text-base font-medium print-field-value">{orden.cod_cta}</p>
                  </div>
                )}
                {orden.sector && (
                  <div className="print-field print:hidden">
                    <p className="text-base text-gray-600 print-field-label">Sector</p>
                    <p className="text-base font-medium print-field-value">{orden.sector}</p>
                  </div>
                )}
                {facturasOrden.length > 0 && (
                  <div className="print-field print:hidden">
                    <p className="text-base text-gray-600 print-field-label">Facturas (FC)</p>
                    <ul className="space-y-1">
                      {facturasOrden.map((factura, index) => {
                        const viewUrl = resolveFacturaHref(factura.path);
                        const label =
                          factura.fc != null
                            ? `FC ${factura.fc}`
                            : `Factura ${index + 1}`;
                        return (
                          <li key={`${factura.path ?? "sin-path"}-${index}`} className="flex flex-wrap items-center gap-2">
                            <span className="text-base font-medium print-field-value">{label}</span>
                            {viewUrl ? (
                              <a
                                href={viewUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm font-medium text-blue-600 hover:text-blue-800 underline"
                                title="Ver imagen de la factura"
                              >
                                Ver factura
                              </a>
                            ) : factura.path ? (
                              <span className="text-sm text-gray-500">Imagen adjunta</span>
                            ) : null}
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}
                {formatRtDisplay(orden.rt) && (
                  <div className="print-field print:hidden">
                    <p className="text-base text-gray-600 print-field-label">Remitos (RT)</p>
                    <p className="text-base font-medium print-field-value">{formatRtDisplay(orden.rt)}</p>
                  </div>
                )}
                {orden.fecha_entrega && (
                  <div className="print-field print:hidden">
                    <p className="text-base text-gray-600 print-field-label">Fecha de Entrega</p>
                    <p className="text-base font-medium print-field-value">
                      {formatDateLocal(orden.fecha_entrega)}
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

      

        {/* Artículos de la Orden */}
        <Card className="print-section print-section-items">
          <CardHeader className="print-section-header print:py-2">
            <CardTitle className="text-2xl print:text-[10px]">Artículos de la Orden</CardTitle>
          </CardHeader>
          <CardContent className="print-section-body print:py-2 print:px-0">
            {orden.articulos && orden.articulos.length > 0 ? (
              <div className="overflow-x-auto print:overflow-visible">
                <table className="w-full border-collapse border border-gray-300 text-sm print:border-gray-500 print-table print:text-[10.5px]">
                  <thead className="bg-gray-100 print:bg-gray-200">
                    <tr>
                      <th className="border border-gray-300 px-2 py-1.5 text-left text-xs font-semibold text-gray-700 print:px-1 print:py-0.5 print:text-[9.5px] print-col-pic w-[6%]">
                        PIC
                      </th>
                      <th className="border border-gray-300 px-2 py-1.5 text-left text-xs font-semibold text-gray-700 print:px-1 print:py-0.5 print:text-[9.5px] print-col-articulo min-w-[140px] print:min-w-0 print:w-[32%]">
                        Artículo
                      </th>
                      <th className="border border-gray-300 px-2 py-1.5 text-center text-xs font-semibold text-gray-700 print:px-1 print:py-0.5 print:text-[9.5px] print-col-cant w-[6%]">
                        Cant.
                      </th>
                      <th className="border border-gray-300 px-2 py-1.5 text-right text-xs font-semibold text-gray-700 print:px-1 print:py-0.5 print:text-[9.5px] print-col-importe w-[9%]">
                        P. Unit.
                      </th>
                      <th className="border border-gray-300 px-2 py-1.5 text-right text-xs font-semibold text-gray-700 print:px-1 print:py-0.5 print:text-[9.5px] print-col-importe w-[6%]">
                        Desc. %
                      </th>
                      <th className="border border-gray-300 px-2 py-1.5 text-right text-xs font-semibold text-gray-700 print:px-1 print:py-0.5 print:text-[9.5px] print-col-importe w-[9%]">
                        P. c/ desc.
                      </th>
                      <th className="border border-gray-300 px-2 py-1.5 text-right text-xs font-semibold text-gray-700 print:px-1 print:py-0.5 print:text-[9.5px] print-col-importe w-[9%]">
                        Total
                      </th>
                      <th className="border border-gray-300 px-1.5 py-1.5 text-center text-xs font-semibold text-gray-700 leading-tight print:hidden w-[8%]">
                        Entregadas
                      </th>
                      <th className="border border-gray-300 px-1.5 py-1.5 text-center text-xs font-semibold text-gray-700 leading-tight print:hidden w-[8%]">
                        Pendientes
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {orden.articulos.map((item, index) => (
                      (() => {
                        const precioConDescuento = calcularPrecioConDescuento(
                          item.precio_unitario,
                          item.descuento
                        );
                        const totalFila = getRowTotal(item);
                        const entrega = getEntregaForArticulo(orden.entregas, index, item);
                        return (
                      <tr key={index} className="hover:bg-gray-50 print:hover:bg-white">
                        <td className="border border-gray-300 px-2 py-1.5 text-gray-600 print:px-2 print:py-1 print:text-[10.5px]">
                          {(() => {
                            const comparativaUrl = getComparativaPedidoUrl(item.articulo_id, {
                              ordenCompraId: orden.id,
                              ordenCompraNoc: orden.noc,
                              audience: isAprobEmail(userEmail, userRol) ? "aprob" : "admin",
                            });
                            const picLabel = extractPicDisplayNumber(item.articulo_id);
                            const parsed = parsePicFromArticuloId(item.articulo_id);

                            if (comparativaUrl) {
                              return (
                                <Link
                                  href={comparativaUrl}
                                  className="text-blue-600 hover:text-blue-800 underline font-medium print:text-gray-600 print:no-underline"
                                  title={`Ver comparativa del pedido ${parsed.pic}`}
                                >
                                  {picLabel}
                                </Link>
                              );
                            }

                            if (parsed.tipo === "sin-pic") {
                              return <span className="text-gray-500">Sin PIC</span>;
                            }

                            return picLabel;
                          })()}
                        </td>
                        <td className="border border-gray-300 px-2 py-1.5 print:px-1 print:py-0.5 print:text-[10.5px] align-top print-articulo-cell">
                          <div className="flex flex-col gap-0.5 print:gap-0">
                            <span className="font-medium text-gray-900 print-articulo-nombre">{item.articulo_nombre}</span>
                            {item.descripcion?.trim() && (
                              <span className="text-xs text-gray-600 leading-snug print-articulo-extra">
                                <span className="text-gray-500 print:hidden">Descripción: </span>
                                <span className="hidden print:inline">Desc: </span>
                                {item.descripcion}
                              </span>
                            )}
                            {item.presentacion?.trim() && (
                              <span className="text-xs font-bold text-red-600 leading-snug print-articulo-extra">
                                <span className="print:hidden">Presentacion: </span>
                                <span className="hidden print:inline">Pres: </span>
                                {item.presentacion}
                              </span>
                            )}
                            {item.codprovsug?.trim() && (
                              <span className="text-xs text-gray-600 leading-snug print-articulo-extra">
                                <span className="text-gray-500 print:hidden">Cod. prov. sug.: </span>
                                <span className="hidden print:inline">Cód: </span>
                                {item.codprovsug}
                              </span>
                            )}
                            {item.codint?.trim() && (
                              <span className="text-xs text-gray-600 leading-snug print-articulo-extra print-or-codint">
                                Cod. Int.: {item.codint}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="border border-gray-300 px-2 py-1.5 text-center text-gray-700 print:px-2 print:py-1 print:text-[10.5px]">
                          {item.cantidad}
                        </td>
                        <td className="border border-gray-300 px-1.5 py-1.5 text-right text-gray-700 whitespace-nowrap print:px-2 print:py-1 print:text-[10.5px] print-col-importe">
                          {formatImporte(item.precio_unitario, orden.divisa)}
                        </td>
                        <td className="border border-gray-300 px-1.5 py-1.5 text-right text-gray-700 whitespace-nowrap print:px-2 print:py-1 print:text-[10.5px] print-col-importe">
                          {(item.descuento ?? 0).toLocaleString('es-AR')}
                        </td>
                        <td className="border border-gray-300 px-1.5 py-1.5 text-right text-gray-700 whitespace-nowrap print:px-2 print:py-1 print:text-[10.5px] print-col-importe">
                          {formatImporte(precioConDescuento, orden.divisa)}
                        </td>
                        <td className="border border-gray-300 px-1.5 py-1.5 text-right font-semibold text-gray-900 whitespace-nowrap print:px-2 print:py-1 print:text-[10.5px] print-col-importe">
                          {formatImporte(totalFila, orden.divisa)}
                        </td>
                        <td className="border border-gray-300 px-1.5 py-1.5 text-center text-gray-700 print:hidden">
                          {formatCantidadEntrega(entrega.entregadas)}
                        </td>
                        <td className="border border-gray-300 px-1.5 py-1.5 text-center text-gray-700 print:hidden">
                          {formatCantidadEntrega(entrega.pendientes)}
                        </td>
                      </tr>
                        );
                      })()
                    ))}
                  </tbody>
                  <tfoot className="bg-gray-50 print:bg-gray-100 print-col-importe">
                    <tr>
                      <td colSpan={6} className="border border-gray-300 px-2 py-1.5 text-right text-xs font-semibold text-gray-700 print:px-2 print:py-1 print:text-[10.5px]">
                        TOTAL:
                      </td>
                      <td className="border border-gray-300 px-1.5 py-1.5 text-right text-base font-bold text-gray-900 whitespace-nowrap print:px-2 print:py-1 print:text-[12px]">
                        {formatImporte(totalOrdenCalculado, orden.divisa)}
                      </td>
                      <td className="border border-gray-300 print:hidden" />
                      <td className="border border-gray-300 print:hidden" />
                    </tr>
                  </tfoot>
                </table>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500 print:py-2">
                No hay artículos en esta orden
              </div>
            )}
          </CardContent>
        </Card>

        {/* Acciones impresión */}
        <div className="flex justify-center gap-4 print-hidden">
          {canViewImportes && (
            <Button
              onClick={() => handleImprimir(false)}
              className="px-8 bg-blue-600 hover:bg-blue-700"
            >
              🖨️ Imprimir OC
            </Button>
          )}
          <Button
            onClick={() => handleImprimir(true)}
            className="px-8 bg-emerald-600 hover:bg-emerald-700"
          >
            🖨️ Imprimir OR
          </Button>
        </div>
      </div>
      </div>

      {/* Modal de Edición */}
      {canEdit && showEditModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-4xl mx-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">✏️ Editar Orden de Compra</h3>
            
            <div className="space-y-6">
              {/* Información Básica */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-semibold text-gray-800 mb-3">📋 Información Básica</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="edit-noc">Número de Orden (NOC)</Label>
                    <Input
                      id="edit-noc"
                      type="number"
                      value={editData.noc}
                      onChange={(e) => setEditData({ ...editData, noc: e.target.value })}
                      placeholder="Ingrese el número de orden"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="edit-estado">Estado</Label>
                    <select
                      id="edit-estado"
                      value={editData.estado || ''}
                      onChange={(e) => setEditData({ ...editData, estado: e.target.value })}
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="pendiente">Pendiente</option>
                      <option value="aprobada">Aprobada</option>
                      <option value="rechazada">Rechazada</option>
                      <option value="cumplida">Cumplida</option>
                      <option value="entrego_parcial">Entregó Parcial</option>
                      <option value="anulado">Anulado</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Información del Proveedor */}
              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-semibold text-blue-800 mb-3">🏢 Información del Proveedor</h4>
                
                <div className="mb-4">
                  <Label htmlFor="edit-proveedor">Buscar Proveedor</Label>
                  <Input
                    id="edit-proveedor"
                    type="text"
                    value={busquedaProveedor}
                    onChange={(e) => setBusquedaProveedor(e.target.value)}
                    placeholder="Buscar por CUIT o nombre del proveedor"
                  />
                  
                  {/* Lista de proveedores filtrados */}
                  {busquedaProveedor && proveedoresFiltrados.length > 0 && (
                    <div className="mt-2 max-h-40 overflow-y-auto border border-gray-200 rounded-md">
                      {proveedoresFiltrados.map((proveedor) => (
                        <div
                          key={proveedor.id}
                          className="p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                          onClick={() => handleSeleccionarProveedor(proveedor)}
                        >
                          <div className="font-medium">{proveedor.nombreprov}</div>
                          <div className="text-sm text-gray-600">
                            CUIT: {proveedor.cuitprov} | {proveedor.direccionprov}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {busquedaProveedor && proveedoresFiltrados.length === 0 && (
                    <div className="mt-2 p-3 text-sm text-gray-500 bg-gray-50 rounded-md">
                      No se encontraron proveedores
                    </div>
                  )}
                </div>

                {/* Información del proveedor seleccionado */}
                {editData.proveedor && (
                  <div className="bg-white p-4 rounded-lg border border-blue-200">
                    <h5 className="font-semibold text-blue-800 mb-2">✅ Proveedor Seleccionado</h5>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                      <div><strong>Nombre:</strong> {editData.proveedor}</div>
                      <div><strong>CUIT:</strong> {editData.cuit}</div>
                      <div><strong>Dirección:</strong> {editData.direccion}</div>
                      <div><strong>Teléfono:</strong> {editData.telefono}</div>
                      <div><strong>Email:</strong> {editData.email}</div>
                    </div>
                  </div>
                )}
              </div>

              {/* Información General */}
              <div className="bg-green-50 p-4 rounded-lg">
                <h4 className="font-semibold text-green-800 mb-3">ℹ️ Información General</h4>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="edit-lugar-entrega">Lugar de Entrega</Label>
                    <select
                      id="edit-lugar-entrega"
                      value={editData.lugar_entrega || ''}
                      onChange={(e) => setEditData({ ...editData, lugar_entrega: e.target.value })}
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">Seleccione el lugar de entrega</option>
                      <option value="Gascon 74 Boulogne horario 8 a 16 hrs">
                        Gascon 74 Boulogne horario 8 a 16 hrs
                      </option>
                      <option value="Parque industrial ruta 6, lote 26, Los Cardales">
                        Parque industrial ruta 6, lote 26, Los Cardales
                      </option>
                    </select>
                  </div>

                  <div>
                    <Label htmlFor="edit-fecha-prometida">Fecha acordada de entrega</Label>
                    <Input
                      id="edit-fecha-prometida"
                      type="date"
                      value={editData.fecha_prometida}
                      onChange={(e) =>
                        setEditData({ ...editData, fecha_prometida: e.target.value })
                      }
                    />
                  </div>

                  <div className="space-y-4">
                    <div>
                      <Label>Facturas cargadas</Label>
                      {editFacturas.length === 0 ? (
                        <p className="text-sm text-gray-500 mt-1">No hay facturas cargadas.</p>
                      ) : (
                        <ul className="mt-2 space-y-2">
                          {editFacturas.map((factura, index) => {
                            const viewUrl = resolveFacturaHref(factura.path);
                            return (
                              <li
                                key={`${factura.path ?? "sin-path"}-${index}`}
                                className="flex flex-wrap items-center gap-2 rounded-md border border-gray-200 bg-white p-2"
                              >
                                <div className="w-36">
                                  <Label htmlFor={`edit-fc-${index}`} className="sr-only">
                                    Nº de factura
                                  </Label>
                                  <Input
                                    id={`edit-fc-${index}`}
                                    type="number"
                                    value={factura.fc ?? ""}
                                    onChange={(e) => handleActualizarFcFactura(index, e.target.value)}
                                    placeholder="Nº FC"
                                    min="0"
                                  />
                                </div>
                                {viewUrl ? (
                                  <a
                                    href={viewUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-sm text-blue-600 underline"
                                  >
                                    Ver factura
                                  </a>
                                ) : factura.path ? (
                                  <span className="text-sm text-gray-600">Imagen adjunta</span>
                                ) : (
                                  <span className="text-sm text-gray-500">Sin imagen</span>
                                )}
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  className="ml-auto text-red-600 border-red-300 hover:bg-red-50"
                                  disabled={facturaUploading || saving}
                                  onClick={() => void handleQuitarFactura(index)}
                                >
                                  Quitar
                                </Button>
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </div>

                    <div className="rounded-md border border-dashed border-gray-300 p-3">
                      <p className="text-sm font-medium text-gray-700 mb-2">Agregar factura</p>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <Label htmlFor="edit-nueva-fc">Nº de factura (FC) *</Label>
                          <Input
                            id="edit-nueva-fc"
                            type="number"
                            value={nuevaFacturaFc}
                            onChange={(e) => setNuevaFacturaFc(e.target.value)}
                            placeholder="Ej: 12345"
                            min="0"
                            required
                          />
                        </div>
                        <div className="md:col-span-2">
                          <Label htmlFor="edit-factura-imagen">Imagen / PDF de factura</Label>
                          <Input
                            id="edit-factura-imagen"
                            type="file"
                            accept="image/jpeg,image/png,image/webp,image/gif,image/bmp,application/pdf"
                            disabled={facturaUploading || saving}
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) void handleSubirImagenFactura(file);
                              e.target.value = "";
                            }}
                            className="cursor-pointer"
                          />
                          <p className="text-xs text-gray-500 mt-1">
                            Ingrese el FC y luego el archivo. Cada factura requiere número e imagen/PDF.
                          </p>
                          {facturaUploading && (
                            <p className="text-sm text-blue-600 mt-1">Subiendo imagen...</p>
                          )}
                          {facturaUploadError && (
                            <p className="text-sm text-red-600 mt-1">{facturaUploadError}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="edit-fecha-entrega">Fecha de Entrega</Label>
                      <Input
                        id="edit-fecha-entrega"
                        type="date"
                        value={editData.fecha_entrega}
                        onChange={(e) => setEditData({ ...editData, fecha_entrega: e.target.value })}
                      />
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="edit-observaciones">Observaciones</Label>
                    <textarea
                      id="edit-observaciones"
                      value={editData.observaciones}
                      onChange={(e) => setEditData({ ...editData, observaciones: e.target.value })}
                      placeholder="Observaciones adicionales..."
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      rows={3}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="edit-divisa">Divisa</Label>
                    <select
                      id="edit-divisa"
                      name="divisa"
                      value={normalizeDivisa(editData.divisa)}
                      onChange={(e) => {
                        const val = normalizeDivisa(e.target.value);
                        setEditData(prev => ({ ...prev, divisa: val }));
                      }}
                      className="w-full p-2 border border-gray-300 rounded-md"
                    >
                      <option value="USD">USD</option>
                      <option value="EUR">EUR</option>
                      <option value="ARS">ARS</option>
                    </select>
                  </div>

                  <div>
                    <Label htmlFor="edit-condicion-pago">Condición de Pago</Label>
                    <select
                      id="edit-condicion-pago"
                      value={editData.condicion_pago || ''}
                      onChange={(e) => setEditData({ ...editData, condicion_pago: e.target.value })}
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">Seleccione la condición de pago</option>
                      <option value="CC 30/60/90 DIAS FF">CC 30/60/90 DIAS FF</option>
                      <option value="CC 60 DIAS FF">CC 60 DIAS FF</option>
                      <option value="CC 45 DIAS FF">CC 45 DIAS FF</option>
                      <option value="CC 30 DIAS FF">CC 30 DIAS FF</option>
                      <option value="CC 20 DIAS FF">CC 20 DIAS FF</option>
                      <option value="CC 15 DIAS FF">CC 15 DIAS FF</option>
                      <option value="CC 7 DIAS FF">CC 7 DIAS FF</option>
                      <option value="ECHEQ 30 DIAS FF">ECHEQ 30 DIAS FF</option>
                      <option value="ECHEQ 20 DIAS FF">ECHEQ 20 DIAS FF</option>
                      <option value="ECHEQ 15 DIAS FF">ECHEQ 15 DIAS FF</option>
                      <option value="PAGO ANTICIPADO">PAGO ANTICIPADO</option>
                      <option value="PAGO CONTRA ENTREGA">PAGO CONTRA ENTREGA</option>
                    </select>
                  </div>

                  <div>
                    <Label htmlFor="edit-tipo-pago">Tipo de Pago</Label>
                    <select
                      id="edit-tipo-pago"
                      value={editData.tipo_pago || ''}
                      onChange={(e) => setEditData({ ...editData, tipo_pago: e.target.value })}
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">Seleccione tipo de pago</option>
                      <option value="CTA A">CTA A</option>
                      <option value="CTA B">CTA B</option>
                      <option value="MERCADO LIBRE">MERCADO LIBRE</option>
                    </select>
                  </div>

                  <div>
                    <Label htmlFor="edit-cod-cta">Código de Cuenta</Label>
                    <select
                      id="edit-cod-cta"
                      value={editData.cod_cta || ''}
                      onChange={(e) => setEditData({ ...editData, cod_cta: e.target.value })}
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">Seleccione código de cuenta</option>
                      <option value="1111 MAQ VIDRIERIA">1111 MAQ VIDRIERIA</option>
                      <option value="1115 MAQ HERR GENERAL">1115 MAQ HERR GENERAL</option>
                      <option value="1401 MATERIA PRIMA PVC">1401 MATERIA PRIMA PVC</option>
                      <option value="1402 MATERIA PRIMA ALUMINIO">1402 MATERIA PRIMA ALUMINIO</option>
                      <option value="1403 MATERIA PRIMA VIDRIO">1403 MATERIA PRIMA VIDRIO</option>
                      <option value="1404 HERRAJES PANOL CARDALES">1404 HERRAJES PANOL CARDALES</option>
                      <option value="1408 SILICONA SELLADORES ESPUMA CARDALES">1408 SILICONA SELLADORES ESPUMA CARDALES</option>
                      <option value="1412 TORNILLERIA CARDALES">1412 TORNILLERIA CARDALES</option>
                      <option value="1413 TELA MOSQUITERO">1413 TELA MOSQUITERO</option>
                      <option value="1414 BURLETE">1414 BURLETE</option>
                      <option value="1415 FELPAS Y CORDON">1415 FELPAS Y CORDON</option>
                      <option value="1416 INSUMOS DVH">1416 INSUMOS DVH</option>
                      <option value="1509 ALMUERZOS VIANDAS">1509 ALMUERZOS VIANDAS</option>
                      <option value="1511 CAPACITACION DE PERSONAL">1511 CAPACITACION DE PERSONAL</option>
                      <option value="1512 INDUMENTARIA OPERARIOS">1512 INDUMENTARIA OPERARIOS</option>
                      <option value="1514 EPP">1514 EPP</option>
                      <option value="1527 ALCOHOL ISOP">1527 ALCOHOL ISOP</option>
                      <option value="1528 FERRET INSUMOS CARDALES">1528 FERRET INSUMOS CARDALES</option>
                      <option value="1529 EMBALAJE">1529 EMBALAJE</option>
                      <option value="1530 LUBRICANTE MAQUINAS">1530 LUBRICANTE MAQUINAS</option>
                      <option value="1540 MANTENIMIENTO PVC">1540 MANTENIMIENTO PVC</option>
                      <option value="1541 MANT MAQ VIDRIO">1541 MANT MAQ VIDRIO</option>
                      <option value="1545 MANTENIM MAQ GENERAL">1545 MANTENIM MAQ GENERAL</option>
                      <option value="1548 MANT RODADOS Y FLOTA">1548 MANT RODADOS Y FLOTA</option>
                      <option value="1549 MANTENIMIENTO INMUEBLE">1549 MANTENIMIENTO INMUEBLE</option>
                      <option value="1604 BOTIQUIN PRIM AUX">1604 BOTIQUIN PRIM AUX</option>
                      <option value="1604 FARMACIA CARDALES">1604 FARMACIA CARDALES</option>
                      <option value="1606 LIBRERÍA CARDALES">1606 LIBRERÍA CARDALES</option>
                      <option value="1625 HONO SEG E HIG">1625 HONO SEG E HIG</option>
                      <option value="1705 INV ESCOBAR">1705 INV ESCOBAR</option>
                      <option value="1706 INV EQUIP DE PRODUCCION">1706 INV EQUIP DE PRODUCCION</option>
                      <option value="1708 INV MOBILIARIO CARDALES">1708 INV MOBILIARIO CARDALES</option>
                      <option value="1709 INV EQUI COMPUT">1709 INV EQUI COMPUT</option>
                      <option value="2114 MAQ EQUIP Y HERRAM REPARACIONES">2114 MAQ EQUIP Y HERRAM REPARACIONES</option>
                      <option value="2404 HERRAJES GASCON">2404 HERRAJES GASCON</option>
                      <option value="2408 SILICONA SELLADORES ESPUMA GASCON">2408 SILICONA SELLADORES ESPUMA GASCON</option>
                      <option value="2412 TORNILLERIA GASCON">2412 TORNILLERIA GASCON</option>
                      <option value="2414 BURLETE GASCON">2414 BURLETE GASCON</option>
                      <option value="2415 FELPA Y CORDON GASCON">2415 FELPA Y CORDON GASCON</option>
                      <option value="2528 FERRET INSUMOS GASCON">2528 FERRET INSUMOS GASCON</option>
                    </select>
                  </div>

                  <div>
                    <Label htmlFor="edit-sector">Sector</Label>
                    <Input
                      id="edit-sector"
                      type="text"
                      value={editData.sector || ''}
                      onChange={(e) => setEditData({ ...editData, sector: e.target.value })}
                      placeholder="Ej: Compra directa, Ventas..."
                      className="w-full"
                    />
                  </div>
                </div>
              </div>

              {/* Artículos de la Orden */}
              <div className="bg-purple-50 p-4 rounded-lg">
                <div className="flex justify-between items-center mb-3">
                  <h4 className="font-semibold text-purple-800">📦 Artículos de la Orden</h4>
                  <Button
                    onClick={() => setShowArticuloModal(true)}
                    className="bg-purple-600 hover:bg-purple-700 text-sm"
                  >
                    ➕ Agregar Artículo
                  </Button>
                </div>

                <div className="bg-gray-100 print:bg-gray-200">
                  <div className="grid grid-cols-1 md:grid-cols-7 gap-2 items-center">
                    <div className="md:col-span-2 border border-gray-300 px-3 py-2 text-left text-sm font-semibold text-gray-700 print:px-2 print:py-1 print:text-xs">
                      Artículo
                    </div>
                    <div className="border border-gray-300 px-3 py-2 text-center text-sm font-semibold text-gray-700 print:px-2 print:py-1 print:text-xs">
                      Cantidad
                    </div>
                    <div className="border border-gray-300 px-3 py-2 text-right text-sm font-semibold text-gray-700 print:px-2 print:py-1 print:text-xs">
                      Costo unit.
                    </div>
                    <div className="border border-gray-300 px-3 py-2 text-right text-sm font-semibold text-gray-700 print:px-2 print:py-1 print:text-xs">
                      Descuento %
                    </div>
                    <div className="border border-gray-300 px-3 py-2 text-right text-sm font-semibold text-gray-700 print:px-2 print:py-1 print:text-xs">
                      Costo unit. c/ desc.
                    </div>
                    <div className="border border-gray-300 px-3 py-2 text-right text-sm font-semibold text-gray-700 print:px-2 print:py-1 print:text-xs">
                      Total
                    </div>
                  </div>
                </div>
                
                {editData.articulos.length > 0 ? (
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {editData.articulos.map((articulo, index) => (
                      <div key={index} className="bg-white p-3 rounded-lg border border-purple-200">
                        <div className="grid grid-cols-1 md:grid-cols-7 gap-2 items-start">
                          <div className="md:col-span-2 space-y-2">
                            <Input
                              value={articulo.articulo_nombre}
                              onChange={(e) => handleEditarArticulo(index, 'articulo_nombre', e.target.value)}
                              placeholder="Nombre del artículo"
                              className="text-sm"
                            />
                            <div className="flex flex-col gap-1 text-xs text-gray-600 pl-0.5">
                              <p className="leading-snug">
                                <span className="text-gray-500">Descripción: </span>
                                {articulo.descripcion?.trim() ? articulo.descripcion : "-"}
                              </p>
                              <p className="leading-snug font-bold text-red-600">
                                <span className="text-gray-500 font-normal">Presentacion: </span>
                                {articulo.presentacion?.trim() ? articulo.presentacion : "-"}
                              </p>
                              <p className="leading-snug">
                                <span className="text-gray-500">Cod. prov. sug.: </span>
                                {articulo.codprovsug?.trim() ? articulo.codprovsug : "-"}
                              </p>
                            </div>
                          </div>
                          <div>
                            <Input
                              type="number"
                              value={articulo.cantidad}
                              onChange={(e) => handleEditarArticulo(index, 'cantidad', parseInt(e.target.value) || 0)}
                              placeholder="Cantidad"
                              className="text-sm"
                              min="1"
                            />
                          </div>
                          <div>
                            <Input
                              type="number"
                              value={articulo.precio_unitario}
                              onChange={(e) => handleEditarArticulo(index, 'precio_unitario', parseFloat(e.target.value) || 0)}
                              placeholder="Precio unit."
                              className="text-sm"
                              min="0"
                              step="0.01"
                            />
                          </div>
                          <div>
                            <Input
                              type="number"
                              value={articulo.descuento ?? 0}
                              onChange={(e) => handleEditarArticulo(index, 'descuento', parseFloat(e.target.value) || 0)}
                              placeholder="Desc. %"
                              className="text-sm"
                              min="0"
                              max="100"
                              step="0.01"
                            />
                          </div>
                          <div className="text-sm text-right whitespace-nowrap self-center">
                            {formatImporte(calcularPrecioConDescuento(articulo.precio_unitario, articulo.descuento), editData.divisa)}
                          </div>
                          <div className="flex items-center justify-between gap-1 self-center">
                            <span className="font-semibold text-sm whitespace-nowrap">
                              {formatImporte(getRowTotal(articulo), editData.divisa)}
                            </span>
                            <Button
                              onClick={() => handleEliminarArticulo(index)}
                              variant="outline"
                              size="sm"
                              className="text-red-600 border-red-300 hover:bg-red-50 ml-2 shrink-0"
                            >
                              ❌
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                    
                    {/* Total de la orden */}
                    <div className="bg-purple-100 p-3 rounded-lg border-2 border-purple-300">
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-lg">Total de la Orden:</span>
                        <span className="font-bold text-xl text-purple-800 whitespace-nowrap">
                          {formatImporte(
                            editData.articulos.reduce((sum, item) => sum + getRowTotal(item), 0),
                            editData.divisa
                          )}
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <p>No hay artículos en esta orden</p>
                    <Button
                      onClick={() => setShowArticuloModal(true)}
                      className="mt-2 bg-purple-600 hover:bg-purple-700"
                    >
                      Agregar el primer artículo
                    </Button>
                  </div>
                )}
              </div>
            </div>
            
            <div className="flex justify-end gap-3 mt-6">
              <Button
                onClick={handleCloseEditModal}
                variant="outline"
                disabled={saving}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleSaveEdit}
                disabled={saving}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {saving ? "Guardando..." : "Guardar Cambios"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal para Agregar Artículo */}
      {showArticuloModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold mb-4">➕ Agregar Nuevo Artículo</h3>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="nuevo-articulo-nombre">Nombre del Artículo</Label>
                <Input
                  id="nuevo-articulo-nombre"
                  type="text"
                  value={nuevoArticulo.articulo_nombre}
                  onChange={(e) => setNuevoArticulo({ ...nuevoArticulo, articulo_nombre: e.target.value })}
                  placeholder="Ingrese el nombre del artículo"
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="nuevo-articulo-cantidad">Cantidad</Label>
                  <Input
                    id="nuevo-articulo-cantidad"
                    type="number"
                    value={nuevoArticulo.cantidad}
                    onChange={(e) => setNuevoArticulo({ ...nuevoArticulo, cantidad: parseInt(e.target.value) || 1 })}
                    min="1"
                  />
                </div>
                
                <div>
                  <Label htmlFor="nuevo-articulo-precio">Precio Unitario</Label>
                  <Input
                    id="nuevo-articulo-precio"
                    type="number"
                    value={nuevoArticulo.precio_unitario}
                    onChange={(e) => setNuevoArticulo({ ...nuevoArticulo, precio_unitario: parseFloat(e.target.value) || 0 })}
                    min="0"
                    step="0.01"
                  />
                </div>
                <div>
                  <Label htmlFor="nuevo-articulo-descuento">Descuento %</Label>
                  <Input
                    id="nuevo-articulo-descuento"
                    type="number"
                    value={nuevoArticulo.descuento}
                    onChange={(e) => setNuevoArticulo({ ...nuevoArticulo, descuento: parseFloat(e.target.value) || 0 })}
                    min="0"
                    max="100"
                    step="0.01"
                  />
                </div>
              </div>
              
              <div className="bg-gray-50 p-3 rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="font-medium">Total:</span>
                  <span className="font-bold text-lg whitespace-nowrap">
                    {formatImporte(
                      nuevoArticulo.cantidad * calcularPrecioConDescuento(nuevoArticulo.precio_unitario, nuevoArticulo.descuento),
                      editData.divisa
                    )}
                  </span>
                </div>
              </div>
            </div>
            
            <div className="flex justify-end gap-3 mt-6">
              <Button
                onClick={() => {
                  setShowArticuloModal(false);
                  setNuevoArticulo({
                    articulo_nombre: '',
                    cantidad: 1,
                    precio_unitario: 0,
                    descuento: 0
                  });
                }}
                variant="outline"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleAgregarArticulo}
                disabled={!nuevoArticulo.articulo_nombre.trim()}
                className="bg-purple-600 hover:bg-purple-700"
              >
                Agregar Artículo
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Cargar entrega */}
      {showEntregaModal && orden && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-3xl mx-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">📦 Cargar entrega del proveedor</h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div>
                <Label htmlFor="entrega-fc">Factura</Label>
                <Input
                  id="entrega-fc"
                  type="number"
                  value={entregaForm.fc}
                  onChange={(e) =>
                    setEntregaForm((prev) => ({ ...prev, fc: e.target.value }))
                  }
                  placeholder="Nº factura"
                  min="0"
                />
              </div>
              <div>
                <Label htmlFor="entrega-rt">Remito</Label>
                <Input
                  id="entrega-rt"
                  type="number"
                  value={entregaForm.rt}
                  onChange={(e) =>
                    setEntregaForm((prev) => ({ ...prev, rt: e.target.value }))
                  }
                  placeholder="Nº remito"
                  min="0"
                />
              </div>
              <div>
                <Label htmlFor="entrega-fecha">Fecha de entrega *</Label>
                <Input
                  id="entrega-fecha"
                  type="date"
                  value={entregaForm.fecha_entrega}
                  onChange={(e) =>
                    setEntregaForm((prev) => ({
                      ...prev,
                      fecha_entrega: e.target.value,
                    }))
                  }
                />
              </div>
            </div>
            <p className="text-xs text-gray-500 -mt-2 mb-4">
              Debe indicar al menos factura o remito (documento de recepción).
            </p>

            <div className="mb-4">
              <Label htmlFor="entrega-archivo">Documento adjunto (PDF, JPG, PNG) *</Label>
              <Input
                id="entrega-archivo"
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
                onChange={(e) => {
                  const file = e.target.files?.[0] ?? null;
                  setEntregaFile(file);
                  setEntregaError(null);
                }}
                className="mt-1"
              />
              {entregaFile && (
                <p className="text-sm text-gray-600 mt-1">
                  Archivo: {entregaFile.name}
                </p>
              )}
            </div>

            {(() => {
              const prevEntregas = toEntregaRegistrosPreserving(
                orden.entregas,
                orden.articulos || []
              );
              if (prevEntregas.length === 0) return null;
              return (
                <div className="border rounded-lg overflow-hidden mb-4 bg-emerald-50/50">
                  <div className="bg-emerald-100 px-3 py-2 text-sm font-semibold text-emerald-900">
                    Entregas ya cargadas ({prevEntregas.length}) — se conservan al guardar
                  </div>
                  <ul className="divide-y max-h-36 overflow-y-auto text-sm">
                    {prevEntregas.map((reg, idx) => {
                      const totalCant = reg.items.reduce(
                        (sum, item) => sum + item.cantidad_entregada,
                        0
                      );
                      return (
                        <li key={`${reg.fact_path}-${idx}`} className="px-3 py-2 text-gray-700">
                          <span className="font-medium">#{idx + 1}</span>
                          {reg.fc != null && <> · FC {reg.fc}</>}
                          {reg.rt != null && <> · RT {reg.rt}</>}
                          {reg.fecha_entrega && <> · {reg.fecha_entrega}</>}
                          <> · {reg.items.length} art. · cant. {totalCant}</>
                          {reg.fact_path ? (
                            <span className="text-xs text-gray-500 block truncate">
                              Doc: {reg.fact_path}
                            </span>
                          ) : null}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              );
            })()}

            <div className="border rounded-lg overflow-hidden mb-4">
              <div className="bg-gray-100 px-3 py-2 text-sm font-semibold text-gray-700">
                Artículos de la orden — cantidad entregada en esta entrega
              </div>
              <div className="divide-y max-h-64 overflow-y-auto">
                {(orden.articulos || []).map((art, index) => {
                  const entrega = getEntregaForArticulo(orden.entregas, index, art);
                  const pendiente = entrega.pendientes ?? Math.max(0, art.cantidad - (entrega.entregadas ?? 0));
                  return (
                    <div
                      key={art.articulo_id || index}
                      className="grid grid-cols-1 md:grid-cols-12 gap-2 items-center px-3 py-2 text-sm"
                    >
                      <div className="md:col-span-6">
                        <p className="font-medium text-gray-900">{art.articulo_nombre}</p>
                        <p className="text-xs text-gray-500">
                          Pedido: {art.cantidad} · Entregadas: {formatCantidadEntrega(entrega.entregadas)} · Pendientes: {formatCantidadEntrega(pendiente)}
                        </p>
                      </div>
                      <div className="md:col-span-3">
                        <Label className="text-xs text-gray-500">Cant. entregada</Label>
                        <Input
                          type="number"
                          min="0"
                          max={pendiente}
                          step="1"
                          value={entregaCantidades[art.articulo_id] ?? ""}
                          onChange={(e) =>
                            setEntregaCantidades((prev) => ({
                              ...prev,
                              [art.articulo_id]: e.target.value,
                            }))
                          }
                          placeholder="0"
                          className="h-9"
                        />
                      </div>
                      <div className="md:col-span-3 text-xs text-gray-500">
                        Máx. esta entrega: {pendiente}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {entregaError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                {entregaError}
              </div>
            )}

            <div className="flex justify-end gap-3">
              <Button
                onClick={handleCloseEntregaModal}
                variant="outline"
                disabled={entregaSaving}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleGuardarEntrega}
                disabled={entregaSaving}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                {entregaSaving ? "Guardando..." : "Guardar entrega"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Ver entregas */}
      {showVerEntregasModal && orden && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-3xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between gap-3 mb-4">
              <h3 className="text-lg font-semibold">👁️ Entregas cargadas</h3>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowVerEntregasModal(false)}
              >
                Cerrar
              </Button>
            </div>

            {verEntregasLoading && (
              <p className="text-sm text-gray-500 mb-3">Cargando documentos...</p>
            )}

            {(() => {
              const registros = toEntregaRegistrosPreserving(
                orden.entregas,
                orden.articulos || []
              );
              const nombrePorId = new Map(
                (orden.articulos || []).map((art) => [
                  art.articulo_id,
                  art.articulo_nombre,
                ])
              );

              if (registros.length === 0) {
                return (
                  <div className="text-center py-10 text-gray-500">
                    No hay entregas cargadas en esta orden.
                  </div>
                );
              }

              return (
                <div className="space-y-4">
                  {registros.map((reg, idx) => {
                    const viewUrl = resolveFacturaHref(reg.fact_path);
                    const totalCant = reg.items.reduce(
                      (sum, item) => sum + item.cantidad_entregada,
                      0
                    );
                    return (
                      <div
                        key={`${reg.fact_path || "sin-doc"}-${idx}`}
                        className="border border-teal-200 rounded-lg overflow-hidden"
                      >
                        <div className="bg-teal-50 px-4 py-3 flex flex-wrap items-center justify-between gap-2">
                          <div className="text-sm text-gray-800">
                            <span className="font-semibold">Entrega #{idx + 1}</span>
                            {reg.fc != null && (
                              <span className="ml-2">FC: {reg.fc}</span>
                            )}
                            {reg.rt != null && (
                              <span className="ml-2">RT: {reg.rt}</span>
                            )}
                            {reg.fecha_entrega && (
                              <span className="ml-2">
                                Fecha: {formatDateLocal(reg.fecha_entrega)}
                              </span>
                            )}
                            <span className="ml-2 text-gray-500">
                              · {reg.items.length} art. · cant. {totalCant}
                            </span>
                          </div>
                          {viewUrl ? (
                            <a
                              href={viewUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm font-medium text-teal-700 hover:text-teal-900 underline"
                            >
                              Ver documento
                            </a>
                          ) : reg.fact_path ? (
                            <span className="text-xs text-gray-500">
                              Documento sin URL
                            </span>
                          ) : (
                            <span className="text-xs text-gray-400">
                              Sin documento adjunto
                            </span>
                          )}
                        </div>
                        <div className="px-4 py-2">
                          {reg.items.length === 0 ? (
                            <p className="text-sm text-gray-500 py-2">
                              Sin cantidades registradas.
                            </p>
                          ) : (
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="text-left text-gray-500 border-b">
                                  <th className="py-1.5 font-medium">Artículo</th>
                                  <th className="py-1.5 font-medium text-right w-28">
                                    Cant. entregada
                                  </th>
                                </tr>
                              </thead>
                              <tbody>
                                {reg.items.map((item, itemIdx) => (
                                  <tr
                                    key={`${item.articulo_id}-${itemIdx}`}
                                    className="border-b border-gray-100 last:border-0"
                                  >
                                    <td className="py-1.5 text-gray-800">
                                      {nombrePorId.get(item.articulo_id) ||
                                        item.articulo_id}
                                    </td>
                                    <td className="py-1.5 text-right font-medium">
                                      {item.cantidad_entregada.toLocaleString("es-AR")}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>
        </div>
      )}
    </>
  );
}
