"use client";

import {
  DIVISA_LABELS,
  formatImporteIndicador,
  type AhorrosAlcanzadosIndicador,
  type DivisaIndicador,
} from "@/lib/indicadores-compras";
import {
  COLOR_GRAFICO,
  IndicadorBarChart,
  IndicadorLeyenda,
  IndicadorVacio,
} from "@/components/indicadores/indicador-bar-chart";

const METRICAS = [
  {
    key: "cotizado",
    label: "Más alto cotizado",
    shortLabel: "Cotizado",
    color: COLOR_GRAFICO.gold,
    getValue: (i: AhorrosAlcanzadosIndicador) => i.importeMasAltoCotizado,
  },
  {
    key: "confirmado",
    label: "Importe confirmado",
    shortLabel: "Confirmado",
    color: COLOR_GRAFICO.teal,
    getValue: (i: AhorrosAlcanzadosIndicador) => i.importeConfirmado,
  },
  {
    key: "ahorro",
    label: "Ahorro obtenido",
    shortLabel: "Ahorro",
    color: COLOR_GRAFICO.coral,
    getValue: (i: AhorrosAlcanzadosIndicador) => i.ahorroObtenido,
  },
] as const;

type AhorrosAlcanzadosChartProps = {
  indicadores: AhorrosAlcanzadosIndicador[];
  tituloComparativa?: string;
  etiquetasGrupo?: Partial<Record<DivisaIndicador, string>>;
};

export function AhorrosAlcanzadosChart({
  indicadores,
  tituloComparativa = "Comparativa por divisa",
  etiquetasGrupo,
}: AhorrosAlcanzadosChartProps) {
  const indicadoresConDatos = indicadores.filter((i) => i.ordenes > 0);
  const totalOrdenes = indicadores.reduce((sum, i) => sum + i.ordenes, 0);

  if (totalOrdenes === 0) {
    return <IndicadorVacio mensaje="No hay órdenes en el rango seleccionado." />;
  }

  return (
    <div className="space-y-6">
      <IndicadorLeyenda
        items={METRICAS.map((metrica) => ({
          label: metrica.label,
          color: metrica.color,
        }))}
      />
      {indicadoresConDatos.map((indicador) => {
        const etiqueta = etiquetasGrupo?.[indicador.divisa] ?? DIVISA_LABELS[indicador.divisa];
        return (
          <IndicadorBarChart
            key={indicador.divisa}
            titulo={
              indicadoresConDatos.length > 1
                ? `${tituloComparativa} — ${etiqueta}`
                : tituloComparativa
            }
            extra={`${indicador.ordenes} ${indicador.ordenes === 1 ? "orden" : "órdenes"}`}
            orientacion="vertical"
            formatValor={(value) => formatImporteIndicador(value, indicador.divisa)}
            datos={METRICAS.map((metrica) => ({
              label: metrica.shortLabel,
              valor: metrica.getValue(indicador),
              color: metrica.color,
            }))}
          />
        );
      })}
    </div>
  );
}
