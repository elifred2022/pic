export type PicTipo = "productivo" | "general" | "sin-pic" | "otro";

export type PicParsed = {
  tipo: PicTipo;
  pedidoId: string | null;
  pic: string;
};

export function parsePicFromArticuloId(articuloId: string): PicParsed {
  const id = articuloId || "";
  if (id.startsWith("sin-pic-")) {
    return { tipo: "sin-pic", pedidoId: null, pic: "Sin PIC" };
  }
  const match = id.match(/^(productivo|general)-([^-]+)-/);
  if (!match) {
    return { tipo: "otro", pedidoId: null, pic: "-" };
  }
  const tipo = match[1] as "productivo" | "general";
  const pedidoId = match[2];
  return { tipo, pedidoId, pic: `${tipo}-${pedidoId}` };
}

export function extractPicDisplayNumber(articuloId: string): string {
  const match = articuloId.match(/(?:productivo|general)-(\d+)-/);
  if (match) return match[1];
  return articuloId;
}

export type ComparativaLinkOptions = {
  ordenCompraId?: number | string;
  ordenCompraNoc?: number | string;
};

export function getVerOrdenCompraUrl(ordenCompraId: number | string): string {
  return `/auth/ordenes-compra/ver-orden/${ordenCompraId}`;
}

export function getComparativaPedidoUrl(
  articuloId: string,
  options?: ComparativaLinkOptions
): string | null {
  const parsed = parsePicFromArticuloId(articuloId);
  if (!parsed.pedidoId) return null;

  const ocParams = new URLSearchParams();
  if (options?.ordenCompraId != null) {
    ocParams.set("oc", String(options.ordenCompraId));
  }
  if (options?.ordenCompraNoc != null) {
    ocParams.set("noc", String(options.ordenCompraNoc));
  }
  const ocQuery = ocParams.toString();
  const ocSuffix = ocQuery ? `&${ocQuery}` : "";

  if (parsed.tipo === "productivo") {
    return `/auth/rutaproductivos/lista-pedidosproductivosadmin?comparativa=${parsed.pedidoId}${ocSuffix}`;
  }
  if (parsed.tipo === "general") {
    return `/auth/list-adminpedidosgenerales?comparativa=${parsed.pedidoId}${ocSuffix}`;
  }
  return null;
}
