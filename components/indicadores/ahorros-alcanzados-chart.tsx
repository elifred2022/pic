"use client";

import {
  DIVISA_LABELS,
  formatImporteIndicador,
  type AhorrosAlcanzadosIndicador,
  type DivisaIndicador,
} from "@/lib/indicadores-compras";

const METRICAS = [
  {
    key: "cotizado",
    label: "Más alto cotizado",
    shortLabel: "Cotizado",
    getValue: (i: AhorrosAlcanzadosIndicador) => i.importeMasAltoCotizado,
    barClassName: "bg-gradient-to-t from-amber-500 to-amber-400",
    textClassName: "text-amber-700",
  },
  {
    key: "confirmado",
    label: "Importe confirmado",
    shortLabel: "Confirmado",
    getValue: (i: AhorrosAlcanzadosIndicador) => i.importeConfirmado,
    barClassName: "bg-gradient-to-t from-blue-600 to-blue-500",
    textClassName: "text-blue-700",
  },
  {
    key: "ahorro",
    label: "Ahorro obtenido",
    shortLabel: "Ahorro",
    getValue: (i: AhorrosAlcanzadosIndicador) => i.ahorroObtenido,
    barClassName: "bg-gradient-to-t from-emerald-600 to-emerald-500",
    textClassName: "text-emerald-700",
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
    return (
      <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 px-6 py-12 text-center text-gray-500">
        No hay órdenes en el rango seleccionado.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-4 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
        {METRICAS.map((metrica) => (
          <div key={metrica.key} className="flex items-center gap-2 text-sm text-gray-600">
            <span
              className={`inline-block h-3 w-3 rounded-sm ${metrica.barClassName}`}
            />
            {metrica.label}
          </div>
        ))}
      </div>

      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-6">
        <div className="mb-4 flex items-center justify-between gap-4">
          <h3 className="text-sm font-semibold text-gray-700">
            {tituloComparativa}
          </h3>
          <span className="text-xs text-gray-500">
            {totalOrdenes} {totalOrdenes === 1 ? "orden" : "órdenes"}
          </span>
        </div>

        <div className="flex min-w-[360px] items-end justify-center gap-6 sm:gap-10">
          {indicadoresConDatos.map((indicador) => {
            const valores = METRICAS.map((m) => ({
              ...m,
              value: m.getValue(indicador),
            }));
            const maxGrupo = Math.max(...valores.map((v) => v.value), 1);

            return (
              <DivisaGroup
                key={indicador.divisa}
                divisa={indicador.divisa}
                etiquetaGrupo={etiquetasGrupo?.[indicador.divisa]}
                ordenes={indicador.ordenes}
                valores={valores}
                maxGrupo={maxGrupo}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}

type DivisaGroupProps = {
  divisa: DivisaIndicador;
  etiquetaGrupo?: string;
  ordenes: number;
  maxGrupo: number;
  valores: Array<{
    key: string;
    shortLabel: string;
    value: number;
    barClassName: string;
    textClassName: string;
  }>;
};

function DivisaGroup({ divisa, etiquetaGrupo, ordenes, valores, maxGrupo }: DivisaGroupProps) {
  const chartHeightPx = 220;

  return (
    <div className="flex min-w-[108px] flex-1 flex-col items-center sm:min-w-[140px]">
      <div className="flex w-full items-end justify-center gap-2 sm:gap-3">
        {valores.map((bar) => {
          const barHeightPx = Math.max(
            (bar.value / maxGrupo) * chartHeightPx,
            bar.value > 0 ? 14 : 0
          );

          return (
            <div
              key={bar.key}
              className="flex min-w-0 flex-1 max-w-[72px] flex-col items-center"
            >
              <div
                className="flex w-full flex-col items-center justify-end"
                style={{ minHeight: chartHeightPx + 48 }}
              >
                <p
                  className={`mb-1 w-full text-center text-[9px] font-semibold leading-tight sm:text-[10px] ${bar.textClassName}`}
                >
                  {formatImporteIndicador(bar.value, divisa)}
                </p>
                <div
                  className={`w-full rounded-t-lg shadow-md transition-all duration-500 ${bar.barClassName}`}
                  style={{ height: `${barHeightPx}px` }}
                  title={`${bar.shortLabel} (${DIVISA_LABELS[divisa]}): ${formatImporteIndicador(bar.value, divisa)}`}
                />
              </div>
              <p className="mt-2 w-full text-center text-[10px] font-medium text-gray-500 sm:text-xs">
                {bar.shortLabel}
              </p>
            </div>
          );
        })}
      </div>

      <div className="mt-4 w-full border-t border-gray-200 pt-3 text-center">
        <p className="text-sm font-bold text-gray-800">
          {etiquetaGrupo ?? DIVISA_LABELS[divisa]}
        </p>
        <p className="text-xs text-gray-500">
          {ordenes} {ordenes === 1 ? "orden" : "órdenes"}
        </p>
      </div>
    </div>
  );
}
