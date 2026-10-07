"use client";

import {
  CONDICION_PROCESO_LABELS,
  DIVISA_LABELS,
  formatImporteIndicador,
  type CondicionProceso,
  type DivisaIndicador,
  type ImportePorCondicionProceso,
} from "@/lib/indicadores-compras";
import {
  COLOR_GRAFICO,
  IndicadorBarChart,
  IndicadorLeyenda,
  IndicadorVacio,
} from "@/components/indicadores/indicador-bar-chart";

const COLORES: Record<CondicionProceso, string> = {
  BAJO_PROCESO: COLOR_GRAFICO.gold,
  FUERA_PROCESO: COLOR_GRAFICO.teal,
  URGENTE: COLOR_GRAFICO.coral,
};

type ImporteCondicionProcesoChartProps = {
  grupos: Array<{
    divisa: DivisaIndicador;
    etiquetaGrupo?: string;
    condiciones: ImportePorCondicionProceso[];
  }>;
  tituloComparativa?: string;
};

export function ImporteCondicionProcesoChart({
  grupos,
  tituloComparativa = "Importe por condición de proceso",
}: ImporteCondicionProcesoChartProps) {
  const totalOrdenes = grupos.reduce(
    (sum, grupo) => sum + grupo.condiciones.reduce((acc, c) => acc + c.ordenes, 0),
    0
  );

  if (totalOrdenes === 0) {
    return (
      <IndicadorVacio mensaje="No hay órdenes con condición de proceso en el rango seleccionado." />
    );
  }

  return (
    <div className="space-y-6">
      <IndicadorLeyenda
        items={(Object.keys(CONDICION_PROCESO_LABELS) as CondicionProceso[]).map(
          (condicion) => ({
            label: CONDICION_PROCESO_LABELS[condicion],
            color: COLORES[condicion],
          })
        )}
      />
      {grupos.map((grupo) => {
        const ordenesGrupo = grupo.condiciones.reduce((sum, c) => sum + c.ordenes, 0);
        if (ordenesGrupo === 0) return null;
        const etiqueta = grupo.etiquetaGrupo ?? DIVISA_LABELS[grupo.divisa];
        const importeGrupo = grupo.condiciones.reduce((sum, c) => sum + c.importeTotal, 0);
        return (
          <IndicadorBarChart
            key={grupo.etiquetaGrupo ?? grupo.divisa}
            titulo={grupos.length > 1 ? `${tituloComparativa} — ${etiqueta}` : tituloComparativa}
            extra={`Total: ${formatImporteIndicador(importeGrupo, grupo.divisa)}`}
            orientacion="vertical"
            formatValor={(value) => formatImporteIndicador(value, grupo.divisa)}
            datos={grupo.condiciones.map((item) => ({
              label: CONDICION_PROCESO_LABELS[item.condicion],
              valor: item.importeTotal,
              color: COLORES[item.condicion],
              detalle: `${item.ordenes} ${item.ordenes === 1 ? "orden" : "órdenes"}`,
            }))}
          />
        );
      })}
    </div>
  );
}
