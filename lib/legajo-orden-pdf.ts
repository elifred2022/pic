import {
  PDFArray,
  PDFDocument,
  PDFName,
  PDFStream,
  StandardFonts,
  type PDFFont,
  type PDFPage,
} from "pdf-lib";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  getFactComprasBucket,
  getSupabaseErrorMessage,
  normalizeFactStoragePath,
  parseFacturasFromOrden,
} from "@/lib/fact-compras-storage";
import { getPresupuestosBucket } from "@/lib/presupuestos-storage";
import { parsePicFromArticuloId } from "@/lib/pic-links";

type LegajoArticulo = {
  articulo_id?: string;
  articulo_nombre: string;
  cantidad: number;
  precio_unitario: number;
  descuento?: number | null;
  total: number;
  descripcion?: string | null;
  presentacion?: string | null;
  codint?: string | null;
};

export type LegajoOrdenInput = {
  id: number;
  noc: number;
  fecha: string;
  cuit: string;
  proveedor: string;
  direccion: string;
  telefono: string;
  email?: string;
  estado: string;
  divisa?: string;
  observaciones?: string;
  condicion_pago?: string;
  tipo_pago?: string;
  lugar_entrega?: string;
  sector?: string;
  fc?: unknown;
  fact_path?: unknown;
  entregas?: unknown;
  articulos?: LegajoArticulo[];
  incluirImportes: boolean;
};

type ArchivoLegajo = {
  titulo: string;
  path: string;
  bucket: string;
};

type EntregaDoc = {
  fc: number | null;
  rt: number | null;
  path: string;
  anulado: boolean;
};

type PicLegajo = {
  tipo: "productivo" | "general";
  pedidoId: string;
  sector: string;
  solicita: string;
  estado: string;
  articulos: Array<{ nombre: string; cantidad: string; descripcion: string; codint: string }>;
  cotizaciones: ArchivoLegajo[];
};

const MARGEN = 40;

function textoPdf(valor: unknown): string {
  return String(valor ?? "")
    .replace(/\r\n/g, "\n")
    .replace(/[^\n\x20-\xff]/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .trim();
}

function fechaLegible(valor: string | null | undefined): string {
  if (!valor?.trim()) return "-";
  const fecha = valor.trim().slice(0, 10);
  const match = fecha.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return textoPdf(valor);
  return `${match[3]}/${match[2]}/${match[1]}`;
}

function importe(amount: number, divisa?: string): string {
  const n = Number.isFinite(amount) ? amount : 0;
  const moneda = textoPdf(divisa || "USD") || "USD";
  return `${moneda} ${n.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function clavePath(path: string): string {
  return normalizeFactStoragePath(path) ?? path.trim();
}

function entregasConDocumento(entregas: unknown): EntregaDoc[] {
  if (!Array.isArray(entregas)) return [];
  return entregas.flatMap((raw) => {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return [];
    const record = raw as Record<string, unknown>;
    if (!("fact_path" in record) && !Array.isArray(record.items)) return [];
    const path = typeof record.fact_path === "string" ? record.fact_path.trim() : "";
    if (!path) return [];
    const toN = (value: unknown): number | null => {
      if (value === null || value === undefined || value === "") return null;
      const n = Number(value);
      return Number.isFinite(n) ? n : null;
    };
    return [
      {
        fc: toN(record.fc),
        rt: toN(record.rt),
        path,
        anulado: record.anulado === true,
      },
    ];
  });
}

function armarFacturasYRemitos(orden: LegajoOrdenInput): {
  facturas: ArchivoLegajo[];
  remitos: ArchivoLegajo[];
} {
  const bucket = getFactComprasBucket();
  const facturasOrden = parseFacturasFromOrden(orden).filter((item) => item.path);
  const entregas = entregasConDocumento(orden.entregas).filter((item) => !item.anulado);
  const usados = new Set<string>();
  const facturas: ArchivoLegajo[] = [];
  const remitos: ArchivoLegajo[] = [];

  const push = (lista: ArchivoLegajo[], titulo: string, path: string) => {
    const clave = clavePath(path);
    if (!clave || usados.has(clave)) return;
    usados.add(clave);
    lista.push({ titulo, path, bucket });
  };

  for (const factura of facturasOrden) {
    if (!factura.path) continue;
    const clave = clavePath(factura.path);
    const entrega = entregas.find((item) => clavePath(item.path) === clave);
    const soloRemito =
      entrega != null &&
      entrega.fc == null &&
      entrega.rt != null &&
      (factura.fc == null || factura.fc === entrega.rt);
    if (soloRemito && entrega) {
      push(remitos, `Remito ${entrega.rt}`, factura.path);
      continue;
    }
    const titulo =
      factura.fc != null
        ? entrega?.rt != null
          ? `Factura ${factura.fc} — Remito ${entrega.rt}`
          : `Factura ${factura.fc}`
        : "Factura";
    push(facturas, titulo, factura.path);
  }

  for (const entrega of entregas) {
    if (entrega.rt != null && entrega.fc == null) {
      push(remitos, `Remito ${entrega.rt}`, entrega.path);
    } else if (entrega.fc != null) {
      const titulo =
        entrega.rt != null
          ? `Factura ${entrega.fc} — Remito ${entrega.rt}`
          : `Factura ${entrega.fc}`;
      push(facturas, titulo, entrega.path);
    } else {
      push(remitos, "Documento de recepción", entrega.path);
    }
  }

  return { facturas, remitos };
}

async function descargarArchivo(
  supabase: SupabaseClient,
  archivo: ArchivoLegajo
): Promise<Uint8Array> {
  const objectPath = normalizeFactStoragePath(archivo.path);
  if (!objectPath) throw new Error("Ruta de archivo inválida.");

  const { data, error } = await supabase.storage.from(archivo.bucket).download(objectPath);
  if (!error && data) {
    return new Uint8Array(await data.arrayBuffer());
  }

  const { data: signed, error: signedError } = await supabase.storage
    .from(archivo.bucket)
    .createSignedUrl(objectPath, 60 * 10);
  if (signedError || !signed?.signedUrl) {
    throw new Error(getSupabaseErrorMessage(error || signedError));
  }
  const response = await fetch(signed.signedUrl);
  if (!response.ok) {
    throw new Error(`No se pudo leer el archivo (HTTP ${response.status}).`);
  }
  return new Uint8Array(await response.arrayBuffer());
}

function tipoArchivo(bytes: Uint8Array): "pdf" | "jpg" | "png" | "webp" | "gif" | "bmp" | "otro" {
  if (bytes.length >= 4 && bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46) {
    return "pdf";
  }
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "jpg";
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47
  ) {
    return "png";
  }
  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return "webp";
  }
  if (bytes.length >= 3 && bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46) return "gif";
  if (bytes.length >= 2 && bytes[0] === 0x42 && bytes[1] === 0x4d) return "bmp";
  return "otro";
}

async function aPng(bytes: Uint8Array, mime: string): Promise<Uint8Array> {
  const blob = new Blob([bytes as BlobPart], { type: mime });
  const url = URL.createObjectURL(blob);
  try {
    const imagen = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("No se pudo leer la imagen."));
      img.src = url;
    });
    const canvas = document.createElement("canvas");
    canvas.width = imagen.naturalWidth || 1;
    canvas.height = imagen.naturalHeight || 1;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("No se pudo preparar la imagen.");
    ctx.drawImage(imagen, 0, 0);
    const png = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((result) => {
        if (result) resolve(result);
        else reject(new Error("No se pudo convertir la imagen."));
      }, "image/png");
    });
    return new Uint8Array(await png.arrayBuffer());
  } finally {
    URL.revokeObjectURL(url);
  }
}

function envolver(texto: string, font: PDFFont, size: number, ancho: number): string[] {
  const limpio = textoPdf(texto);
  if (!limpio) return [];
  const lineas: string[] = [];
  for (const parrafo of limpio.split("\n")) {
    const palabras = parrafo.split(/\s+/).filter(Boolean);
    if (palabras.length === 0) {
      lineas.push("");
      continue;
    }
    let actual = "";
    for (const palabra of palabras) {
      const candidata = actual ? `${actual} ${palabra}` : palabra;
      if (font.widthOfTextAtSize(candidata, size) <= ancho) {
        actual = candidata;
      } else {
        if (actual) lineas.push(actual);
        actual = palabra;
      }
    }
    if (actual) lineas.push(actual);
  }
  return lineas;
}

class Escritor {
  private y = 0;

  constructor(
    private doc: PDFDocument,
    private font: PDFFont,
    private bold: PDFFont,
    private page: PDFPage
  ) {
    this.y = page.getHeight() - MARGEN;
  }

  private nuevaPagina() {
    this.page = this.doc.addPage();
    this.y = this.page.getHeight() - MARGEN;
  }

  private asegurar(alto: number) {
    if (this.y - alto < MARGEN) this.nuevaPagina();
  }

  titulo(texto: string) {
    this.asegurar(28);
    this.page.drawText(textoPdf(texto) || "-", {
      x: MARGEN,
      y: this.y - 16,
      size: 16,
      font: this.bold,
    });
    this.y -= 28;
  }

  subtitulo(texto: string) {
    this.asegurar(20);
    this.page.drawText(textoPdf(texto) || "-", {
      x: MARGEN,
      y: this.y - 12,
      size: 12,
      font: this.bold,
    });
    this.y -= 20;
  }

  linea(texto: string, size = 10) {
    const ancho = this.page.getWidth() - MARGEN * 2;
    const lineas = envolver(texto, this.font, size, ancho);
    if (lineas.length === 0) return;
    for (const linea of lineas) {
      this.asegurar(size + 4);
      this.page.drawText(linea || " ", {
        x: MARGEN,
        y: this.y - size,
        size,
        font: this.font,
      });
      this.y -= size + 4;
    }
  }

  espacio(alto = 8) {
    this.y -= alto;
  }
}

/** Nombres cortos del PDF (ISO) que pdf-lib no reconoce. `/Fl` es FlateDecode. */
const FILTROS_ABREVIADOS: Record<string, string> = {
  "/Fl": "FlateDecode",
  "/A85": "ASCII85Decode",
  "/AHx": "ASCIIHexDecode",
  "/LZW": "LZWDecode",
  "/RL": "RunLengthDecode",
};

function expandirFiltrosAbreviados(pdf: PDFDocument) {
  const clave = PDFName.of("Filter");
  for (const [, obj] of pdf.context.enumerateIndirectObjects()) {
    if (!(obj instanceof PDFStream)) continue;
    const filtro = obj.dict.lookup(clave);
    if (filtro instanceof PDFName) {
      const completo = FILTROS_ABREVIADOS[filtro.asString()];
      if (completo) obj.dict.set(clave, PDFName.of(completo));
      continue;
    }
    if (filtro instanceof PDFArray) {
      for (let i = 0; i < filtro.size(); i++) {
        const item = filtro.lookup(i);
        if (!(item instanceof PDFName)) continue;
        const completo = FILTROS_ABREVIADOS[item.asString()];
        if (completo) filtro.set(i, PDFName.of(completo));
      }
    }
  }
}

/** Decodifica el PDF en un documento aparte. Si falla, el legajo principal no queda a medias. */
async function prepararPdf(bytes: Uint8Array): Promise<PDFDocument> {
  const origen = await PDFDocument.load(bytes, { ignoreEncryption: true });
  expandirFiltrosAbreviados(origen);
  if (origen.getPageCount() === 0) {
    throw new Error("El PDF no tiene páginas.");
  }
  const puente = await PDFDocument.create();
  const embebidas = await puente.embedPages(origen.getPages());
  for (const embebida of embebidas) {
    const pagina = puente.addPage([embebida.width, embebida.height]);
    pagina.drawPage(embebida, {
      x: 0,
      y: 0,
      width: embebida.width,
      height: embebida.height,
    });
  }
  const limpio = await puente.save({ updateFieldAppearances: false });
  return PDFDocument.load(limpio);
}

async function agregarArchivo(
  doc: PDFDocument,
  font: PDFFont,
  bold: PDFFont,
  archivo: ArchivoLegajo,
  bytes: Uint8Array
) {
  const tipo = tipoArchivo(bytes);
  if (tipo === "pdf") {
    const origen = await prepararPdf(bytes);
    const paginas = await doc.embedPages(origen.getPages());
    paginas.forEach((embebida, index) => {
      const ancho = embebida.width;
      const alto = embebida.height;
      const encabezado = index === 0 ? 22 : 0;
      const pagina = doc.addPage([ancho, alto + encabezado]);
      if (encabezado) {
        pagina.drawText(textoPdf(archivo.titulo).slice(0, 140), {
          x: 16,
          y: alto + 6,
          size: 11,
          font: bold,
        });
      }
      pagina.drawPage(embebida, { x: 0, y: 0, width: ancho, height: alto });
    });
    return;
  }

  let pngOJpg = bytes;
  let esJpg = tipo === "jpg";
  if (tipo === "png") esJpg = false;
  else if (tipo === "webp" || tipo === "gif" || tipo === "bmp") {
    const mime = tipo === "webp" ? "image/webp" : tipo === "gif" ? "image/gif" : "image/bmp";
    pngOJpg = await aPng(bytes, mime);
    esJpg = false;
  } else if (tipo === "otro") {
    throw new Error("Formato de archivo no reconocido.");
  }

  const imagen = esJpg ? await doc.embedJpg(pngOJpg) : await doc.embedPng(pngOJpg);
  const pagina = doc.addPage();
  const anchoUtil = pagina.getWidth() - MARGEN * 2;
  const altoUtil = pagina.getHeight() - MARGEN * 2 - 22;
  const escala = Math.min(anchoUtil / imagen.width, altoUtil / imagen.height, 1);
  const ancho = imagen.width * escala;
  const alto = imagen.height * escala;
  pagina.drawText(textoPdf(archivo.titulo).slice(0, 140), {
    x: MARGEN,
    y: pagina.getHeight() - MARGEN,
    size: 12,
    font: bold,
  });
  pagina.drawImage(imagen, {
    x: MARGEN,
    y: pagina.getHeight() - MARGEN - 18 - alto,
    width: ancho,
    height: alto,
  });
  void font;
}

function notaFallo(
  doc: PDFDocument,
  font: PDFFont,
  bold: PDFFont,
  titulo: string,
  detalle: string
) {
  const escritor = new Escritor(doc, font, bold, doc.addPage());
  escritor.titulo(titulo);
  escritor.linea("No se pudo incluir este documento en el legajo.");
  escritor.linea(detalle);
}

async function cargarPics(
  supabase: SupabaseClient,
  orden: LegajoOrdenInput
): Promise<PicLegajo[]> {
  const vistos = new Set<string>();
  const refs: Array<{ tipo: "productivo" | "general"; pedidoId: string }> = [];
  for (const articulo of orden.articulos ?? []) {
    const parsed = parsePicFromArticuloId(articulo.articulo_id ?? "");
    if ((parsed.tipo !== "productivo" && parsed.tipo !== "general") || !parsed.pedidoId) continue;
    const clave = `${parsed.tipo}:${parsed.pedidoId}`;
    if (vistos.has(clave)) continue;
    vistos.add(clave);
    refs.push({ tipo: parsed.tipo, pedidoId: parsed.pedidoId });
  }

  const bucket = getPresupuestosBucket();
  const pics: PicLegajo[] = [];
  for (const ref of refs) {
    const tabla = ref.tipo === "productivo" ? "pedidos_productivos" : "pic";
    const { data, error } = await supabase
      .from(tabla)
      .select("id, articulos, sector, solicita, estado, comparativa_prov")
      .eq("id", ref.pedidoId)
      .maybeSingle();
    if (error || !data) continue;

    const row = data as {
      articulos?: unknown;
      sector?: string | null;
      solicita?: string | null;
      estado?: string | null;
      comparativa_prov?: unknown;
    };
    const articulos = Array.isArray(row.articulos) ? row.articulos : [];
    const cotizaciones: ArchivoLegajo[] = [];
    const proveedores = Array.isArray(row.comparativa_prov) ? row.comparativa_prov : [];
    proveedores.forEach((prov, index) => {
      if (!prov || typeof prov !== "object") return;
      const item = prov as { nombreProveedor?: string; presupuesto_path?: string | null };
      const path = item.presupuesto_path?.trim();
      if (!path) return;
      const nombre = textoPdf(item.nombreProveedor) || `Proveedor ${index + 1}`;
      cotizaciones.push({
        titulo: `Cotización PIC ${ref.pedidoId} — ${nombre}`,
        path,
        bucket,
      });
    });

    pics.push({
      tipo: ref.tipo,
      pedidoId: ref.pedidoId,
      sector: textoPdf(row.sector) || "-",
      solicita: textoPdf(row.solicita) || "-",
      estado: textoPdf(row.estado) || "-",
      articulos: articulos.map((raw) => {
        const art = (raw ?? {}) as Record<string, unknown>;
        return {
          nombre: textoPdf(art.articulo) || "-",
          cantidad: textoPdf(art.cant) || "-",
          descripcion: textoPdf(art.descripcion),
          codint: textoPdf(art.codint),
        };
      }),
      cotizaciones,
    });
  }
  return pics;
}

function escribirOrden(escritor: Escritor, orden: LegajoOrdenInput) {
  escritor.titulo(`Orden de compra ${orden.noc}`);
  escritor.linea(`Fecha: ${fechaLegible(orden.fecha)}`);
  escritor.linea(`Estado: ${textoPdf(orden.estado) || "-"}`);
  escritor.linea(`Proveedor: ${textoPdf(orden.proveedor) || "-"}`);
  escritor.linea(`CUIT: ${textoPdf(orden.cuit) || "-"}`);
  escritor.linea(`Dirección: ${textoPdf(orden.direccion) || "-"}`);
  escritor.linea(`Teléfono: ${textoPdf(orden.telefono) || "-"}`);
  if (orden.email) escritor.linea(`Email: ${textoPdf(orden.email)}`);
  if (orden.sector) escritor.linea(`Sector: ${textoPdf(orden.sector)}`);
  if (orden.lugar_entrega) escritor.linea(`Lugar de entrega: ${textoPdf(orden.lugar_entrega)}`);
  if (orden.condicion_pago) escritor.linea(`Condición de pago: ${textoPdf(orden.condicion_pago)}`);
  if (orden.tipo_pago) escritor.linea(`Tipo de pago: ${textoPdf(orden.tipo_pago)}`);
  if (orden.observaciones) escritor.linea(`Observaciones: ${textoPdf(orden.observaciones)}`);
  escritor.espacio(10);
  escritor.subtitulo("Artículos");
  let total = 0;
  for (const art of orden.articulos ?? []) {
    const fila = Number(art.total);
    if (Number.isFinite(fila)) total += fila;
    const extra = [art.codint, art.descripcion, art.presentacion].filter(Boolean).join(" · ");
    const precio = orden.incluirImportes
      ? ` · ${importe(art.precio_unitario, orden.divisa)} · desc. ${art.descuento ?? 0}% · ${importe(art.total, orden.divisa)}`
      : "";
    escritor.linea(`${art.cantidad} × ${textoPdf(art.articulo_nombre) || "-"}${precio}`);
    if (extra) escritor.linea(extra, 9);
  }
  if (orden.incluirImportes) {
    escritor.espacio(6);
    escritor.linea(`Total: ${importe(total, orden.divisa)}`);
  }
}

function escribirPic(escritor: Escritor, pic: PicLegajo) {
  const origen = pic.tipo === "productivo" ? "Productivo" : "General";
  escritor.titulo(`PIC ${pic.pedidoId}`);
  escritor.linea(`Origen: ${origen}`);
  escritor.linea(`Estado: ${pic.estado}`);
  escritor.linea(`Sector: ${pic.sector}`);
  escritor.linea(`Solicita: ${pic.solicita}`);
  escritor.espacio(8);
  escritor.subtitulo("Artículos solicitados");
  if (pic.articulos.length === 0) {
    escritor.linea("Sin artículos.");
    return;
  }
  for (const art of pic.articulos) {
    escritor.linea(`${art.cantidad} × ${art.nombre}`);
    const extra = [art.codint ? `Cód. ${art.codint}` : "", art.descripcion].filter(Boolean).join(" · ");
    if (extra) escritor.linea(extra, 9);
  }
}

export async function descargarLegajoOrden(
  supabase: SupabaseClient,
  orden: LegajoOrdenInput
): Promise<void> {
  const { facturas, remitos } = armarFacturasYRemitos(orden);
  const pics = await cargarPics(supabase, orden);
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);

  const indice: string[] = [];
  if (facturas.length) indice.push(`Facturas: ${facturas.length}`);
  if (remitos.length) indice.push(`Remitos: ${remitos.length}`);
  indice.push(`Orden de compra ${orden.noc}`);
  for (const pic of pics) {
    indice.push(
      `PIC ${pic.pedidoId}${pic.cotizaciones.length ? ` · cotizaciones: ${pic.cotizaciones.length}` : ""}`
    );
  }

  const portada = new Escritor(doc, font, bold, doc.addPage());
  portada.titulo(`Legajo OC ${orden.noc}`);
  portada.linea(`Proveedor: ${textoPdf(orden.proveedor) || "-"}`);
  portada.linea(`Generado: ${new Date().toLocaleDateString("es-AR")}`);
  portada.espacio(8);
  portada.subtitulo("Contenido");
  for (const item of indice) portada.linea(`• ${item}`);
  if (facturas.length === 0) portada.linea("Sin factura adjunta.");
  if (remitos.length === 0) portada.linea("Sin remito adjunto.");
  if (pics.length === 0) portada.linea("Esta orden no tiene PIC vinculado.");

  const incluir = async (archivo: ArchivoLegajo) => {
    try {
      const bytes = await descargarArchivo(supabase, archivo);
      await agregarArchivo(doc, font, bold, archivo, bytes);
    } catch (err) {
      notaFallo(doc, font, bold, archivo.titulo, getSupabaseErrorMessage(err));
    }
  };

  for (const factura of facturas) await incluir(factura);
  for (const remito of remitos) await incluir(remito);

  escribirOrden(new Escritor(doc, font, bold, doc.addPage()), orden);

  for (const pic of pics) {
    escribirPic(new Escritor(doc, font, bold, doc.addPage()), pic);
    for (const cotizacion of pic.cotizaciones) await incluir(cotizacion);
  }

  const bytes = await doc.save();
  const blob = new Blob([bytes as BlobPart], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `legajo-oc-${orden.noc}.pdf`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
