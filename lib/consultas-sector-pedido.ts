import { parsePicFromArticuloId } from "@/lib/pic-links";

export type PedidoSectorConsulta = {
  id?: number | string | null;
  sector?: string | null;
};

type OrdenConArticulosPic = {
  articulos?: { articulo_id?: string | null }[] | null;
};

function clavePedidoSector(tipo: "productivo" | "general", id: string): string {
  return `${tipo}:${id}`;
}

export function recopilarIdsPedidosDesdeOrdenes(ordenes: OrdenConArticulosPic[]): {
  productivoIds: string[];
  generalIds: string[];
} {
  const productivoIds = new Set<string>();
  const generalIds = new Set<string>();

  for (const orden of ordenes) {
    for (const item of orden.articulos ?? []) {
      const parsed = parsePicFromArticuloId(String(item.articulo_id ?? "").trim());
      if (!parsed.pedidoId) continue;
      if (parsed.tipo === "productivo") productivoIds.add(parsed.pedidoId);
      if (parsed.tipo === "general") generalIds.add(parsed.pedidoId);
    }
  }

  return {
    productivoIds: [...productivoIds],
    generalIds: [...generalIds],
  };
}

export function mapearSectoresPedidos(
  productivos: PedidoSectorConsulta[],
  generales: PedidoSectorConsulta[]
): Record<string, string> {
  const map: Record<string, string> = {};

  for (const pedido of productivos) {
    const id = String(pedido.id ?? "").trim();
    const sector = String(pedido.sector ?? "").trim();
    if (id && sector) map[clavePedidoSector("productivo", id)] = sector;
  }
  for (const pedido of generales) {
    const id = String(pedido.id ?? "").trim();
    const sector = String(pedido.sector ?? "").trim();
    if (id && sector) map[clavePedidoSector("general", id)] = sector;
  }

  return map;
}

export function sectorPedidoDesdeArticuloId(
  articuloId: string,
  sectorPorPedido: Record<string, string>
): string {
  const parsed = parsePicFromArticuloId(articuloId);
  if (
    (parsed.tipo !== "productivo" && parsed.tipo !== "general") ||
    !parsed.pedidoId
  ) {
    return "";
  }
  return sectorPorPedido[clavePedidoSector(parsed.tipo, parsed.pedidoId)] ?? "";
}
