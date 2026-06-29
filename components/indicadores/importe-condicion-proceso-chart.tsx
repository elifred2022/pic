"use client";

import {
  CONDICION_PROCESO_LABELS,
  DIVISA_LABELS,
  formatImporteIndicador,
  type CondicionProceso,
  type DivisaIndicador,
  type ImportePorCondicionProceso,
} from "@/lib/indicadores-compras";

const CONDICION_ESTILOS: Record<
  CondicionProceso,
  { barClassName: string; textClassName: string }
> = {
  BAJO_PROCESO: {
    barClassName: "bg-gradient-to-t from-yellow-500 to-yellow-400",
    textClassName: "text-yellow-700",
  },
  FUERA_PROCESO: {
    barClassName: "bg-gradient-to-t from-emerald-600 to-emerald-500",
    textClassName: "text-emerald-700",
  },
  URGENTE: {
    barClassName: "bg-gradient-to-t from-red-600 to-red-500",
    textClassName: "text-red-700",
  },
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
    (sum, grupo) =>
      sum + grupo.condiciones.reduce((acc, c) => acc + c.ordenes, 0),
    0
  );

  if (totalOrdenes === 0) {
    return (
      <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 px-6 py-12 text-center text-gray-500">
        No hay órdenes con condición de proceso en el rango seleccionado.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-4 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
        {(Object.keys(CONDICION_PROCESO_LABELS) as CondicionProceso[]).map(
          (condicion) => (
            <div
              key={condicion}
              className="flex items-center gap-2 text-sm text-gray-600"
            >
              <span
                className={`inline-block h-3 w-3 rounded-sm ${CONDICION_ESTILOS[condicion].barClassName}`}
              />
              {CONDICION_PROCESO_LABELS[condicion]}
            </div>
          )
        )}
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

        <div className="flex min-w-[320px] items-end justify-center gap-6 sm:gap-10">
          {grupos.map((grupo) => (
            <CondicionGrupo
              key={grupo.etiquetaGrupo ?? grupo.divisa}
              divisa={grupo.divisa}
              etiquetaGrupo={grupo.etiquetaGrupo}
              condiciones={grupo.condiciones}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

type CondicionGrupoProps = {
  divisa: DivisaIndicador;
  etiquetaGrupo?: string;
  condiciones: ImportePorCondicionProceso[];
};

function CondicionGrupo({
  divisa,
  etiquetaGrupo,
  condiciones,
}: CondicionGrupoProps) {
  const chartHeightPx = 220;
  const maxGrupo = Math.max(...condiciones.map((c) => c.importeTotal), 1);
  const ordenesGrupo = condiciones.reduce((sum, c) => sum + c.ordenes, 0);

  return (
    <div className="flex min-w-[108px] flex-1 flex-col items-center sm:min-w-[140px]">
      <div className="flex w-full items-end justify-center gap-2 sm:gap-3">
        {condiciones.map((item) => {
          const estilos = CONDICION_ESTILOS[item.condicion];
          const barHeightPx = Math.max(
            (item.importeTotal / maxGrupo) * chartHeightPx,
            item.importeTotal > 0 ? 14 : 0
          );

          return (
            <div
              key={item.condicion}
              className="flex min-w-0 flex-1 max-w-[72px] flex-col items-center"
            >
              <div
                className="flex w-full flex-col items-center justify-end"
                style={{ minHeight: chartHeightPx + 48 }}
              >
                <p
                  className={`mb-1 w-full text-center text-[9px] font-semibold leading-tight sm:text-[10px] ${estilos.textClassName}`}
                >
                  {formatImporteIndicador(item.importeTotal, divisa)}
                </p>
                <div
                  className={`w-full rounded-t-lg shadow-md transition-all duration-500 ${estilos.barClassName}`}
                  style={{ height: `${barHeightPx}px` }}
                  title={`${CONDICION_PROCESO_LABELS[item.condicion]} (${DIVISA_LABELS[divisa]}): ${formatImporteIndicador(item.importeTotal, divisa)}`}
                />
              </div>
              <p className="mt-2 w-full text-center text-[10px] font-medium text-gray-500 sm:text-xs">
                {CONDICION_PROCESO_LABELS[item.condicion]}
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
          {ordenesGrupo} {ordenesGrupo === 1 ? "orden" : "órdenes"}
        </p>
      </div>
    </div>
  );
}
