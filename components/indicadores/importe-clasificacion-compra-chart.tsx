"use client";

import {
  CLASIFICACION_COMPRA_LABELS,
  DIVISA_LABELS,
  formatImporteIndicador,
  type ClasificacionCompra,
  type DivisaIndicador,
  type ImportePorClasificacionCompra,
} from "@/lib/indicadores-compras";

const CLASIFICACION_ESTILOS: Record<
  ClasificacionCompra,
  { barClassName: string; textClassName: string }
> = {
  PRODUCTIVA: {
    barClassName: "bg-gradient-to-t from-teal-600 to-teal-500",
    textClassName: "text-teal-700",
  },
  NO_PRODUCTIVA: {
    barClassName: "bg-gradient-to-t from-slate-500 to-slate-400",
    textClassName: "text-slate-700",
  },
};

type ImporteClasificacionCompraChartProps = {
  grupos: Array<{
    divisa: DivisaIndicador;
    etiquetaGrupo?: string;
    clasificaciones: ImportePorClasificacionCompra[];
  }>;
  tituloComparativa?: string;
};

export function ImporteClasificacionCompraChart({
  grupos,
  tituloComparativa = "Monto de compras productivas y no productivas",
}: ImporteClasificacionCompraChartProps) {
  const totalOrdenes = grupos.reduce(
    (sum, grupo) =>
      sum + grupo.clasificaciones.reduce((acc, c) => acc + c.ordenes, 0),
    0
  );

  if (totalOrdenes === 0) {
    return (
      <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 px-6 py-12 text-center text-gray-500">
        No hay órdenes con clasificación de compra en el rango seleccionado.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-4 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
        {(Object.keys(CLASIFICACION_COMPRA_LABELS) as ClasificacionCompra[]).map(
          (clasificacion) => (
            <div
              key={clasificacion}
              className="flex items-center gap-2 text-sm text-gray-600"
            >
              <span
                className={`inline-block h-3 w-3 rounded-sm ${CLASIFICACION_ESTILOS[clasificacion].barClassName}`}
              />
              {CLASIFICACION_COMPRA_LABELS[clasificacion]}
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

        <div className="flex min-w-[280px] items-end justify-center gap-6 sm:gap-10">
          {grupos.map((grupo) => (
            <ClasificacionGrupo
              key={grupo.etiquetaGrupo ?? grupo.divisa}
              divisa={grupo.divisa}
              etiquetaGrupo={grupo.etiquetaGrupo}
              clasificaciones={grupo.clasificaciones}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

type ClasificacionGrupoProps = {
  divisa: DivisaIndicador;
  etiquetaGrupo?: string;
  clasificaciones: ImportePorClasificacionCompra[];
};

function ClasificacionGrupo({
  divisa,
  etiquetaGrupo,
  clasificaciones,
}: ClasificacionGrupoProps) {
  const chartHeightPx = 220;
  const maxGrupo = Math.max(...clasificaciones.map((c) => c.importeTotal), 1);
  const ordenesGrupo = clasificaciones.reduce((sum, c) => sum + c.ordenes, 0);

  return (
    <div className="flex min-w-[108px] flex-1 flex-col items-center sm:min-w-[140px]">
      <div className="flex w-full items-end justify-center gap-2 sm:gap-3">
        {clasificaciones.map((item) => {
          const estilos = CLASIFICACION_ESTILOS[item.clasificacion];
          const barHeightPx = Math.max(
            (item.importeTotal / maxGrupo) * chartHeightPx,
            item.importeTotal > 0 ? 14 : 0
          );

          return (
            <div
              key={item.clasificacion}
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
                  title={`${CLASIFICACION_COMPRA_LABELS[item.clasificacion]} (${DIVISA_LABELS[divisa]}): ${formatImporteIndicador(item.importeTotal, divisa)}`}
                />
              </div>
              <p className="mt-2 w-full text-center text-[10px] font-medium text-gray-500 sm:text-xs">
                {CLASIFICACION_COMPRA_LABELS[item.clasificacion]}
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
