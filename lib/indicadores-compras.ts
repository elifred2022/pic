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
  tipo_pago?: string | null;
  condi_proceso?: string | null;
  sector?: string | null;
  cod_cta?: string | null;
  proveedor?: string | null;
  articulos?: ArticuloOrdenIndicador[] | null;
};

export type ArticuloOrdenIndicador = {
  articulo_nombre?: string | null;
  total?: number | null;
  divisa?: string | null;
};

export type ModalidadPago = "CTA_A" | "CTA_B" | "MERCADO_LIBRE";

export const MODALIDADES_PAGO: ModalidadPago[] = [
  "CTA_A",
  "CTA_B",
  "MERCADO_LIBRE",
];

export const MODALIDAD_PAGO_LABELS: Record<ModalidadPago, string> = {
  CTA_A: "Cta A",
  CTA_B: "Cta B",
  MERCADO_LIBRE: "Mercado libre",
};

export type ImportePorModalidadPago = {
  modalidad: ModalidadPago;
  importeTotal: number;
  ordenes: number;
  divisa: DivisaIndicador;
};

export type CondicionProceso = "BAJO_PROCESO" | "FUERA_PROCESO" | "URGENTE";

export const CONDICIONES_PROCESO: CondicionProceso[] = [
  "BAJO_PROCESO",
  "FUERA_PROCESO",
  "URGENTE",
];

export const CONDICION_PROCESO_LABELS: Record<CondicionProceso, string> = {
  BAJO_PROCESO: "Bajo proceso",
  FUERA_PROCESO: "Fuera de proceso",
  URGENTE: "Urgente",
};

export type ImportePorCondicionProceso = {
  condicion: CondicionProceso;
  importeTotal: number;
  ordenes: number;
  divisa: DivisaIndicador;
};

export type SolicitudPorSector = {
  sector: string;
  solicitudes: number;
  importeTotal: number;
  divisa: DivisaIndicador;
};

export type EstadoSolicitud =
  | "PENDIENTE"
  | "APROBADA"
  | "RECHAZADA"
  | "CUMPLIDA"
  | "ENTREGO_PARCIAL"
  | "ANULADO";

export const ESTADOS_SOLICITUD: EstadoSolicitud[] = [
  "PENDIENTE",
  "APROBADA",
  "ENTREGO_PARCIAL",
  "CUMPLIDA",
  "RECHAZADA",
  "ANULADO",
];

export const ESTADO_SOLICITUD_LABELS: Record<EstadoSolicitud, string> = {
  PENDIENTE: "Pendiente",
  APROBADA: "Aprobada",
  RECHAZADA: "Rechazada",
  CUMPLIDA: "Cumplida",
  ENTREGO_PARCIAL: "Entregó parcial",
  ANULADO: "Anulado",
};

export type SolicitudPorEstado = {
  estado: EstadoSolicitud;
  solicitudes: number;
  importeTotal: number;
  divisa: DivisaIndicador;
};

export type ImportePorArticuloOCc = {
  clave: string;
  importeTotal: number;
  lineas: number;
  divisa: DivisaIndicador;
};

export type ImportePorProveedor = {
  proveedor: string;
  importeTotal: number;
  ordenes: number;
  divisa: DivisaIndicador;
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

export function filtrarOrdenesPorFecha(
  ordenes: OrdenCompraIndicador[],
  fechaDesde: string,
  fechaHasta: string
): OrdenCompraIndicador[] {
  return ordenes.filter((orden) =>
    ordenEnRangoFechas(orden.fecha, fechaDesde, fechaHasta)
  );
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

export function normalizarModalidadPago(
  tipoPago?: string | null
): ModalidadPago | null {
  if (!tipoPago?.trim()) return null;

  const valor = tipoPago.trim().toUpperCase().replace(/\s+/g, " ");

  if (valor === "CTA A" || valor === "CTA-A") return "CTA_A";
  if (valor === "CTA B" || valor === "CTA-B") return "CTA_B";
  if (valor === "MERCADO LIBRE" || valor === "MERCADOLIBRE") {
    return "MERCADO_LIBRE";
  }

  return null;
}

export function crearImportesModalidadVacios(
  divisa: DivisaIndicador
): ImportePorModalidadPago[] {
  return MODALIDADES_PAGO.map((modalidad) => ({
    modalidad,
    importeTotal: 0,
    ordenes: 0,
    divisa,
  }));
}

export function calcularImportePorModalidadPago(
  ordenes: OrdenCompraIndicador[],
  divisa: DivisaIndicador
): ImportePorModalidadPago[] {
  const indicadores = crearImportesModalidadVacios(divisa);
  const porModalidad = new Map(
    indicadores.map((item) => [item.modalidad, item])
  );

  for (const orden of ordenes) {
    if (inferirDivisaOrden(orden) !== divisa) continue;

    const modalidad = normalizarModalidadPago(orden.tipo_pago);
    if (!modalidad) continue;

    const indicador = porModalidad.get(modalidad);
    if (!indicador) continue;

    indicador.ordenes += 1;
    indicador.importeTotal += Number(orden.total) || 0;
  }

  return indicadores;
}

export function calcularImportePorModalidadPagoPorDivisa(
  ordenes: OrdenCompraIndicador[]
): Record<DivisaIndicador, ImportePorModalidadPago[]> {
  return {
    USD: calcularImportePorModalidadPago(ordenes, "USD"),
    EUR: calcularImportePorModalidadPago(ordenes, "EUR"),
    ARS: calcularImportePorModalidadPago(ordenes, "ARS"),
  };
}

export function consolidarImporteModalidadEnArs(
  porDivisa: Record<DivisaIndicador, ImportePorModalidadPago[]>,
  tiposCambio: TiposCambioIndicador
): ImportePorModalidadPago[] {
  const consolidado = crearImportesModalidadVacios("ARS");

  for (const divisa of DIVISAS_INDICADOR) {
    for (const item of porDivisa[divisa]) {
      const destino = consolidado.find((c) => c.modalidad === item.modalidad);
      if (!destino) continue;

      destino.ordenes += item.ordenes;
      destino.importeTotal += convertirImporteAArs(
        item.importeTotal,
        divisa,
        tiposCambio
      );
    }
  }

  return consolidado;
}

export function normalizarCondicionProceso(
  condiProceso?: string | null
): CondicionProceso | null {
  if (!condiProceso?.trim()) return null;

  const valor = condiProceso.trim().toUpperCase().replace(/\s+/g, " ");

  if (valor === "BAJO PROCESO") return "BAJO_PROCESO";
  if (valor === "FUERA DE PROCESO" || valor === "FUERA PROCESO") {
    return "FUERA_PROCESO";
  }
  if (valor === "URGENTE") return "URGENTE";

  return null;
}

export function crearImportesCondicionProcesoVacios(
  divisa: DivisaIndicador
): ImportePorCondicionProceso[] {
  return CONDICIONES_PROCESO.map((condicion) => ({
    condicion,
    importeTotal: 0,
    ordenes: 0,
    divisa,
  }));
}

export function calcularImportePorCondicionProceso(
  ordenes: OrdenCompraIndicador[],
  divisa: DivisaIndicador
): ImportePorCondicionProceso[] {
  const indicadores = crearImportesCondicionProcesoVacios(divisa);
  const porCondicion = new Map(
    indicadores.map((item) => [item.condicion, item])
  );

  for (const orden of ordenes) {
    if (inferirDivisaOrden(orden) !== divisa) continue;

    const condicion = normalizarCondicionProceso(orden.condi_proceso);
    if (!condicion) continue;

    const indicador = porCondicion.get(condicion);
    if (!indicador) continue;

    indicador.ordenes += 1;
    indicador.importeTotal += Number(orden.total) || 0;
  }

  return indicadores;
}

export function calcularImportePorCondicionProcesoPorDivisa(
  ordenes: OrdenCompraIndicador[]
): Record<DivisaIndicador, ImportePorCondicionProceso[]> {
  return {
    USD: calcularImportePorCondicionProceso(ordenes, "USD"),
    EUR: calcularImportePorCondicionProceso(ordenes, "EUR"),
    ARS: calcularImportePorCondicionProceso(ordenes, "ARS"),
  };
}

export function consolidarImporteCondicionProcesoEnArs(
  porDivisa: Record<DivisaIndicador, ImportePorCondicionProceso[]>,
  tiposCambio: TiposCambioIndicador
): ImportePorCondicionProceso[] {
  const consolidado = crearImportesCondicionProcesoVacios("ARS");

  for (const divisa of DIVISAS_INDICADOR) {
    for (const item of porDivisa[divisa]) {
      const destino = consolidado.find((c) => c.condicion === item.condicion);
      if (!destino) continue;

      destino.ordenes += item.ordenes;
      destino.importeTotal += convertirImporteAArs(
        item.importeTotal,
        divisa,
        tiposCambio
      );
    }
  }

  return consolidado;
}

export function etiquetaSector(sector: string): string {
  return sector === "Administracion" ? "Administración" : sector;
}

export function normalizarSector(sector?: string | null): string | null {
  if (!sector?.trim()) return null;
  return sector.trim();
}

export function calcularSolicitudesPorSector(
  ordenes: OrdenCompraIndicador[],
  divisa: DivisaIndicador
): SolicitudPorSector[] {
  const porSector = new Map<string, SolicitudPorSector>();

  for (const orden of ordenes) {
    if (inferirDivisaOrden(orden) !== divisa) continue;

    const sector = normalizarSector(orden.sector);
    if (!sector) continue;

    const existente = porSector.get(sector);
    if (existente) {
      existente.solicitudes += 1;
      existente.importeTotal += Number(orden.total) || 0;
      continue;
    }

    porSector.set(sector, {
      sector,
      solicitudes: 1,
      importeTotal: Number(orden.total) || 0,
      divisa,
    });
  }

  return Array.from(porSector.values()).sort(
    (a, b) => b.solicitudes - a.solicitudes
  );
}

export function ordenarSectoresPorImporte(
  sectores: SolicitudPorSector[]
): SolicitudPorSector[] {
  return [...sectores].sort((a, b) => b.importeTotal - a.importeTotal);
}

export function calcularSolicitudesPorSectorPorDivisa(
  ordenes: OrdenCompraIndicador[]
): Record<DivisaIndicador, SolicitudPorSector[]> {
  return {
    USD: calcularSolicitudesPorSector(ordenes, "USD"),
    EUR: calcularSolicitudesPorSector(ordenes, "EUR"),
    ARS: calcularSolicitudesPorSector(ordenes, "ARS"),
  };
}

export function consolidarSolicitudesPorSectorEnArs(
  porDivisa: Record<DivisaIndicador, SolicitudPorSector[]>,
  tiposCambio: TiposCambioIndicador
): SolicitudPorSector[] {
  const porSector = new Map<string, SolicitudPorSector>();

  for (const divisa of DIVISAS_INDICADOR) {
    for (const item of porDivisa[divisa]) {
      const importeEnArs = convertirImporteAArs(
        item.importeTotal,
        divisa,
        tiposCambio
      );
      const existente = porSector.get(item.sector);

      if (existente) {
        existente.solicitudes += item.solicitudes;
        existente.importeTotal += importeEnArs;
        continue;
      }

      porSector.set(item.sector, {
        sector: item.sector,
        solicitudes: item.solicitudes,
        importeTotal: importeEnArs,
        divisa: "ARS",
      });
    }
  }

  return Array.from(porSector.values()).sort(
    (a, b) => b.solicitudes - a.solicitudes
  );
}

export function normalizarEstadoSolicitud(
  estado?: string | null
): EstadoSolicitud | null {
  if (!estado?.trim()) return null;

  const valor = estado.trim().toLowerCase().replace(/\s+/g, "_");

  if (valor === "pendiente") return "PENDIENTE";
  if (valor === "aprobada" || valor === "aprobado") return "APROBADA";
  if (valor === "rechazada" || valor === "rechazado") return "RECHAZADA";
  if (valor === "cumplida" || valor === "completada" || valor === "completado") {
    return "CUMPLIDA";
  }
  if (valor === "entrego_parcial" || valor === "entregó_parcial") {
    return "ENTREGO_PARCIAL";
  }
  if (valor === "anulado" || valor === "anulada") return "ANULADO";

  return null;
}

export function crearSolicitudesPorEstadoVacias(
  divisa: DivisaIndicador
): SolicitudPorEstado[] {
  return ESTADOS_SOLICITUD.map((estado) => ({
    estado,
    solicitudes: 0,
    importeTotal: 0,
    divisa,
  }));
}

export function calcularSolicitudesPorEstado(
  ordenes: OrdenCompraIndicador[],
  divisa: DivisaIndicador
): SolicitudPorEstado[] {
  const indicadores = crearSolicitudesPorEstadoVacias(divisa);
  const porEstado = new Map(indicadores.map((item) => [item.estado, item]));

  for (const orden of ordenes) {
    if (inferirDivisaOrden(orden) !== divisa) continue;

    const estado = normalizarEstadoSolicitud(orden.estado);
    if (!estado) continue;

    const indicador = porEstado.get(estado);
    if (!indicador) continue;

    indicador.solicitudes += 1;
    indicador.importeTotal += Number(orden.total) || 0;
  }

  return indicadores;
}

export function calcularSolicitudesPorEstadoPorDivisa(
  ordenes: OrdenCompraIndicador[]
): Record<DivisaIndicador, SolicitudPorEstado[]> {
  return {
    USD: calcularSolicitudesPorEstado(ordenes, "USD"),
    EUR: calcularSolicitudesPorEstado(ordenes, "EUR"),
    ARS: calcularSolicitudesPorEstado(ordenes, "ARS"),
  };
}

export function consolidarSolicitudesPorEstadoEnArs(
  porDivisa: Record<DivisaIndicador, SolicitudPorEstado[]>,
  tiposCambio: TiposCambioIndicador
): SolicitudPorEstado[] {
  const consolidado = crearSolicitudesPorEstadoVacias("ARS");

  for (const divisa of DIVISAS_INDICADOR) {
    for (const item of porDivisa[divisa]) {
      const destino = consolidado.find((c) => c.estado === item.estado);
      if (!destino) continue;

      destino.solicitudes += item.solicitudes;
      destino.importeTotal += convertirImporteAArs(
        item.importeTotal,
        divisa,
        tiposCambio
      );
    }
  }

  return consolidado;
}

const SIN_COD_CTA = "Sin código de cuenta";
const SIN_NOMBRE_ARTICULO = "Sin nombre";

type LineaArticuloIndicador = {
  articuloNombre: string;
  codCta: string;
  importe: number;
  divisa: DivisaIndicador;
};

export function normalizarCodCta(codCta?: string | null): string | null {
  if (!codCta?.trim()) return null;
  return codCta.trim();
}

function extraerLineasArticuloIndicador(
  orden: OrdenCompraIndicador
): LineaArticuloIndicador[] {
  const divisaOrden = inferirDivisaOrden(orden);
  const codCta = normalizarCodCta(orden.cod_cta) ?? SIN_COD_CTA;

  if (!orden.articulos?.length) {
    const importe = Number(orden.total) || 0;
    if (importe <= 0) return [];

    return [
      {
        articuloNombre: "Orden sin detalle de artículos",
        codCta,
        importe,
        divisa: divisaOrden,
      },
    ];
  }

  return orden.articulos.map((articulo) => ({
    articuloNombre: articulo.articulo_nombre?.trim() || SIN_NOMBRE_ARTICULO,
    codCta,
    importe: Number(articulo.total) || 0,
    divisa: normalizarDivisaExplicita(articulo.divisa) ?? divisaOrden,
  }));
}

function acumularImportePorClave(
  acumulado: Map<string, ImportePorArticuloOCc>,
  clave: string,
  importe: number,
  divisa: DivisaIndicador
) {
  const existente = acumulado.get(clave);
  if (existente) {
    existente.importeTotal += importe;
    existente.lineas += 1;
    return;
  }

  acumulado.set(clave, {
    clave,
    importeTotal: importe,
    lineas: 1,
    divisa,
  });
}

function ordenarImportePorArticuloOCc(
  items: ImportePorArticuloOCc[]
): ImportePorArticuloOCc[] {
  return [...items].sort((a, b) => b.importeTotal - a.importeTotal);
}

export function calcularImportePorCodCta(
  ordenes: OrdenCompraIndicador[],
  divisa: DivisaIndicador
): ImportePorArticuloOCc[] {
  const acumulado = new Map<string, ImportePorArticuloOCc>();

  for (const orden of ordenes) {
    for (const linea of extraerLineasArticuloIndicador(orden)) {
      if (linea.divisa !== divisa || linea.importe <= 0) continue;
      acumularImportePorClave(acumulado, linea.codCta, linea.importe, divisa);
    }
  }

  return ordenarImportePorArticuloOCc(Array.from(acumulado.values()));
}

export function calcularImportePorCodCtaPorDivisa(
  ordenes: OrdenCompraIndicador[]
): Record<DivisaIndicador, ImportePorArticuloOCc[]> {
  return {
    USD: calcularImportePorCodCta(ordenes, "USD"),
    EUR: calcularImportePorCodCta(ordenes, "EUR"),
    ARS: calcularImportePorCodCta(ordenes, "ARS"),
  };
}

function consolidarImportePorClaveEnArs(
  porDivisa: Record<DivisaIndicador, ImportePorArticuloOCc[]>,
  tiposCambio: TiposCambioIndicador
): ImportePorArticuloOCc[] {
  const acumulado = new Map<string, ImportePorArticuloOCc>();

  for (const divisa of DIVISAS_INDICADOR) {
    for (const item of porDivisa[divisa]) {
      const importeEnArs = convertirImporteAArs(
        item.importeTotal,
        divisa,
        tiposCambio
      );
      const existente = acumulado.get(item.clave);

      if (existente) {
        existente.importeTotal += importeEnArs;
        existente.lineas += item.lineas;
        continue;
      }

      acumulado.set(item.clave, {
        clave: item.clave,
        importeTotal: importeEnArs,
        lineas: item.lineas,
        divisa: "ARS",
      });
    }
  }

  return ordenarImportePorArticuloOCc(Array.from(acumulado.values()));
}

export function consolidarImportePorCodCtaEnArs(
  porDivisa: Record<DivisaIndicador, ImportePorArticuloOCc[]>,
  tiposCambio: TiposCambioIndicador
): ImportePorArticuloOCc[] {
  return consolidarImportePorClaveEnArs(porDivisa, tiposCambio);
}

export function normalizarProveedor(proveedor?: string | null): string | null {
  if (!proveedor?.trim()) return null;
  return proveedor.trim();
}

export function calcularImportePorProveedor(
  ordenes: OrdenCompraIndicador[],
  divisa: DivisaIndicador
): ImportePorProveedor[] {
  const porProveedor = new Map<string, ImportePorProveedor>();

  for (const orden of ordenes) {
    if (inferirDivisaOrden(orden) !== divisa) continue;

    const proveedor = normalizarProveedor(orden.proveedor);
    if (!proveedor) continue;

    const importe = Number(orden.total) || 0;
    const existente = porProveedor.get(proveedor);

    if (existente) {
      existente.ordenes += 1;
      existente.importeTotal += importe;
      continue;
    }

    porProveedor.set(proveedor, {
      proveedor,
      importeTotal: importe,
      ordenes: 1,
      divisa,
    });
  }

  return Array.from(porProveedor.values()).sort(
    (a, b) => b.importeTotal - a.importeTotal
  );
}

export function calcularImportePorProveedorPorDivisa(
  ordenes: OrdenCompraIndicador[]
): Record<DivisaIndicador, ImportePorProveedor[]> {
  return {
    USD: calcularImportePorProveedor(ordenes, "USD"),
    EUR: calcularImportePorProveedor(ordenes, "EUR"),
    ARS: calcularImportePorProveedor(ordenes, "ARS"),
  };
}

export function consolidarImportePorProveedorEnArs(
  porDivisa: Record<DivisaIndicador, ImportePorProveedor[]>,
  tiposCambio: TiposCambioIndicador
): ImportePorProveedor[] {
  const porProveedor = new Map<string, ImportePorProveedor>();

  for (const divisa of DIVISAS_INDICADOR) {
    for (const item of porDivisa[divisa]) {
      const importeEnArs = convertirImporteAArs(
        item.importeTotal,
        divisa,
        tiposCambio
      );
      const existente = porProveedor.get(item.proveedor);

      if (existente) {
        existente.ordenes += item.ordenes;
        existente.importeTotal += importeEnArs;
        continue;
      }

      porProveedor.set(item.proveedor, {
        proveedor: item.proveedor,
        importeTotal: importeEnArs,
        ordenes: item.ordenes,
        divisa: "ARS",
      });
    }
  }

  return Array.from(porProveedor.values()).sort(
    (a, b) => b.importeTotal - a.importeTotal
  );
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
