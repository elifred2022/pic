"use client";

import {
  DIVISA_LABELS,
  formatImporteIndicador,
  MODALIDAD_PAGO_LABELS,
  type DivisaIndicador,
  type ImportePorModalidadPago,
  type ModalidadPago,
} from "@/lib/indicadores-compras";
import {
  COLOR_GRAFICO,
  IndicadorBarChart,
  IndicadorLeyenda,
  IndicadorVacio,
} from "@/components/indicadores/indicador-bar-chart";

const COLORES: Record<ModalidadPago, string> = {
  CTA_A: COLOR_GRAFICO.gold,
  CTA_B: COLOR_GRAFICO.teal,
  MERCADO_LIBRE: COLOR_GRAFICO.amber,
};

type ImporteModalidadPagoChartProps = {
  grupos: Array<{
    divisa: DivisaIndicador;
    etiquetaGrupo?: string;
    modalidades: ImportePorModalidadPago[];
  }>;
  tituloComparativa?: string;
};

export function ImporteModalidadPagoChart({
  grupos,
  tituloComparativa = "Importe por modalidad de pago",
}: ImporteModalidadPagoChartProps) {
  const totalOrdenes = grupos.reduce(
    (sum, grupo) => sum + grupo.modalidades.reduce((acc, m) => acc + m.ordenes, 0),
    0
  );

  if (totalOrdenes === 0) {
    return (
      <IndicadorVacio mensaje="No hay órdenes con modalidad de pago en el rango seleccionado." />
    );
  }

  return (
    <div className="space-y-6">
      <IndicadorLeyenda
        items={(Object.keys(MODALIDAD_PAGO_LABELS) as ModalidadPago[]).map((modalidad) => ({
          label: MODALIDAD_PAGO_LABELS[modalidad],
          color: COLORES[modalidad],
        }))}
      />
      {grupos.map((grupo) => {
        const ordenesGrupo = grupo.modalidades.reduce((sum, m) => sum + m.ordenes, 0);
        if (ordenesGrupo === 0) return null;
        const etiqueta = grupo.etiquetaGrupo ?? DIVISA_LABELS[grupo.divisa];
        const importeGrupo = grupo.modalidades.reduce((sum, m) => sum + m.importeTotal, 0);
        return (
          <IndicadorBarChart
            key={grupo.etiquetaGrupo ?? grupo.divisa}
            titulo={grupos.length > 1 ? `${tituloComparativa} — ${etiqueta}` : tituloComparativa}
            extra={`Total: ${formatImporteIndicador(importeGrupo, grupo.divisa)}`}
            orientacion="vertical"
            formatValor={(value) => formatImporteIndicador(value, grupo.divisa)}
            datos={grupo.modalidades.map((item) => ({
              label: MODALIDAD_PAGO_LABELS[item.modalidad],
              valor: item.importeTotal,
              color: COLORES[item.modalidad],
              detalle: `${item.ordenes} ${item.ordenes === 1 ? "orden" : "órdenes"}`,
            }))}
          />
        );
      })}
    </div>
  );
}
