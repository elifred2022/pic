export type DivisaIndicador = "USD" | "EUR" | "ARS";

export type FiltroDivisaIndicador = "todas" | DivisaIndicador;

export const DIVISAS_INDICADOR: DivisaIndicador[] = ["USD", "EUR", "ARS"];

export const DIVISA_LABELS: Record<DivisaIndicador, string> = {
  USD: "USD",
  EUR: "EUR",
  ARS: "ARS ($)",
};

export type OrdenCompraIndicador = {
  id: number;
  noc: number;
  fecha: string;
  estado: string;
  total: number | null;
  divisa?: string | null;
  importe_competencia?: number | null;
  ahorro?: number | null;
  articulos?: Array<{ divisa?: string | null }> | null;
};

export type AhorrosAlcanzadosIndicador = {
  divisa: DivisaIndicador;
  importeMasAltoCotizado: number;
  importeConfirmado: number;
  ahorroObtenido: number;
  ordenes: number;
};

export function normalizarDivisaExplicita(
  divisa?: string | null
): DivisaIndicador | null {
  if (!divisa?.trim()) return null;

  const valor = divisa.trim().toUpperCase();

  if (valor === "EUR") return "EUR";
  if (
    valor === "USD" ||
    valor === "U$S" ||
    valor === "US$" ||
    valor === "DOLAR" ||
    valor === "DOLARES" ||
    valor === "DÓLAR" ||
    valor === "DÓLARES"
  ) {
    return "USD";
  }
  if (
    valor === "ARS" ||
    valor === "$" ||
    valor === "PESO" ||
    valor === "PESOS" ||
    valor === "PESO ARGENTINO" ||
    valor === "PESOS ARS"
  ) {
    return "ARS";
  }

  return null;
}

/** @deprecated Usar inferirDivisaOrden para órdenes completas. */
export function normalizarDivisa(divisa?: string | null): DivisaIndicador {
  return normalizarDivisaExplicita(divisa) ?? "ARS";
}

export function inferirDivisaDesdeArticulos(
  articulos?: Array<{ divisa?: string | null }> | null
): DivisaIndicador | null {
  if (!articulos?.length) return null;

  const conteo: Record<DivisaIndicador, number> = {
    USD: 0,
    EUR: 0,
    ARS: 0,
  };

  for (const item of articulos) {
    const divisa = normalizarDivisaExplicita(item.divisa);
    if (divisa) conteo[divisa] += 1;
  }

  const divisaDominante = DIVISAS_INDICADOR.reduce((mejor, actual) =>
    conteo[actual] > conteo[mejor] ? actual : mejor
  );

  return conteo[divisaDominante] > 0 ? divisaDominante : null;
}

export function inferirDivisaOrden(orden: OrdenCompraIndicador): DivisaIndicador {
  const divisaArticulos = inferirDivisaDesdeArticulos(orden.articulos);
  const divisaCampo = normalizarDivisaExplicita(orden.divisa);

  if (divisaCampo && divisaArticulos && divisaCampo !== divisaArticulos) {
    return divisaArticulos;
  }

  let divisa = divisaArticulos ?? divisaCampo ?? "ARS";

  const total = Number(orden.total) || 0;
  const competencia = Number(orden.importe_competencia) || 0;
  const montoReferencia = Math.max(total, competencia);

  // Legacy: muchas OC en pesos quedaron con divisa USD por defecto en BD
  if (divisa === "USD" && !divisaArticulos && montoReferencia >= 1_000_000) {
    return "ARS";
  }

  return divisa;
}

export function crearAhorrosVacios(divisa: DivisaIndicador): AhorrosAlcanzadosIndicador {
  return {
    divisa,
    importeMasAltoCotizado: 0,
    importeConfirmado: 0,
    ahorroObtenido: 0,
    ordenes: 0,
  };
}

export function parseFechaOrdenLocal(fecha: string | null | undefined): Date | null {
  if (!fecha) return null;

  const soloFecha = fecha.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (soloFecha) {
    return new Date(
      Number(soloFecha[1]),
      Number(soloFecha[2]) - 1,
      Number(soloFecha[3])
    );
  }

  const fechaParseada = new Date(fecha);
  return isNaN(fechaParseada.getTime()) ? null : fechaParseada;
}

export function ordenEnRangoFechas(
  fecha: string | null | undefined,
  fechaDesde: string,
  fechaHasta: string
): boolean {
  const fechaOrden = parseFechaOrdenLocal(fecha);
  if (!fechaOrden) return false;

  fechaOrden.setHours(0, 0, 0, 0);

  if (fechaDesde) {
    const desde = parseFechaOrdenLocal(fechaDesde);
    if (!desde) return false;
    desde.setHours(0, 0, 0, 0);
    if (fechaOrden < desde) return false;
  }

  if (fechaHasta) {
    const hasta = parseFechaOrdenLocal(fechaHasta);
    if (!hasta) return false;
    hasta.setHours(23, 59, 59, 999);
    if (fechaOrden > hasta) return false;
  }

  return true;
}

export function filtrarOrdenesParaIndicadores(
  ordenes: OrdenCompraIndicador[],
  fechaDesde: string,
  fechaHasta: string
): OrdenCompraIndicador[] {
  return ordenes.filter((orden) => {
    if (orden.estado === "anulado") return false;
    return ordenEnRangoFechas(orden.fecha, fechaDesde, fechaHasta);
  });
}

export function calcularAhorroOrden(orden: OrdenCompraIndicador): number {
  const competencia = Number(orden.importe_competencia) || 0;
  if (competencia <= 0) return 0;

  const ahorroRegistrado = orden.ahorro != null ? Number(orden.ahorro) : NaN;
  if (Number.isFinite(ahorroRegistrado)) {
    return ahorroRegistrado;
  }

  const confirmado = Number(orden.total) || 0;
  return competencia - confirmado;
}

export function calcularAhorrosAlcanzados(
  ordenes: OrdenCompraIndicador[],
  divisa: DivisaIndicador
): AhorrosAlcanzadosIndicador {
  const indicador = crearAhorrosVacios(divisa);

  for (const orden of ordenes) {
    if (inferirDivisaOrden(orden) !== divisa) continue;

    const confirmado = Number(orden.total) || 0;
    const competencia = Number(orden.importe_competencia) || 0;

    indicador.ordenes += 1;
    indicador.importeConfirmado += confirmado;

    if (competencia > 0) {
      indicador.importeMasAltoCotizado += competencia;
      indicador.ahorroObtenido += calcularAhorroOrden(orden);
    }
  }

  return indicador;
}

export function calcularAhorrosAlcanzadosPorDivisa(
  ordenes: OrdenCompraIndicador[]
): Record<DivisaIndicador, AhorrosAlcanzadosIndicador> {
  return {
    USD: calcularAhorrosAlcanzados(ordenes, "USD"),
    EUR: calcularAhorrosAlcanzados(ordenes, "EUR"),
    ARS: calcularAhorrosAlcanzados(ordenes, "ARS"),
  };
}

export type TiposCambioIndicador = {
  usd: number;
  eur: number;
};

export function parseTipoCambio(valor: string): number | null {
  const normalizado = valor.replace(",", ".").trim();
  if (!normalizado) return null;

  const numero = parseFloat(normalizado);
  if (isNaN(numero) || numero <= 0) return null;

  return numero;
}

export function convertirImporteAArs(
  importe: number,
  divisa: DivisaIndicador,
  tiposCambio: TiposCambioIndicador
): number {
  if (divisa === "ARS") return importe;
  if (divisa === "USD") return importe * tiposCambio.usd;
  return importe * tiposCambio.eur;
}

export function consolidarAhorrosEnArs(
  porDivisa: Record<DivisaIndicador, AhorrosAlcanzadosIndicador>,
  tiposCambio: TiposCambioIndicador
): AhorrosAlcanzadosIndicador {
  const total = crearAhorrosVacios("ARS");

  for (const divisa of DIVISAS_INDICADOR) {
    const indicador = porDivisa[divisa];

    total.ordenes += indicador.ordenes;
    total.importeMasAltoCotizado += convertirImporteAArs(
      indicador.importeMasAltoCotizado,
      divisa,
      tiposCambio
    );
    total.importeConfirmado += convertirImporteAArs(
      indicador.importeConfirmado,
      divisa,
      tiposCambio
    );
  }

  total.ahorroObtenido =
    total.importeMasAltoCotizado - total.importeConfirmado;

  return total;
}

export function formatImporteIndicador(
  value: number,
  divisa: DivisaIndicador
): string {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: divisa,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function getRangoFechasPorDefecto(): { desde: string; hasta: string } {
  const hoy = new Date();
  const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);

  const toInputDate = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  return {
    desde: toInputDate(inicioMes),
    hasta: toInputDate(hoy),
  };
}
