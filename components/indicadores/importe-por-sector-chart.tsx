"use client";

import {
  DIVISA_LABELS,
  etiquetaSector,
  formatImporteIndicador,
  type DivisaIndicador,
  type SolicitudPorSector,
} from "@/lib/indicadores-compras";

const SECTOR_COLORES = [
  {
    barClassName: "bg-gradient-to-t from-blue-600 to-blue-500",
    textClassName: "text-blue-700",
  },
  {
    barClassName: "bg-gradient-to-t from-violet-600 to-violet-500",
    textClassName: "text-violet-700",
  },
  {
    barClassName: "bg-gradient-to-t from-cyan-600 to-cyan-500",
    textClassName: "text-cyan-700",
  },
  {
    barClassName: "bg-gradient-to-t from-indigo-600 to-indigo-500",
    textClassName: "text-indigo-700",
  },
  {
    barClassName: "bg-gradient-to-t from-teal-600 to-teal-500",
    textClassName: "text-teal-700",
  },
  {
    barClassName: "bg-gradient-to-t from-sky-600 to-sky-500",
    textClassName: "text-sky-700",
  },
  {
    barClassName: "bg-gradient-to-t from-purple-600 to-purple-500",
    textClassName: "text-purple-700",
  },
  {
    barClassName: "bg-gradient-to-t from-emerald-600 to-emerald-500",
    textClassName: "text-emerald-700",
  },
] as const;

type ImportePorSectorChartProps = {
  grupos: Array<{
    divisa: DivisaIndicador;
    etiquetaGrupo?: string;
    sectores: SolicitudPorSector[];
  }>;
  tituloComparativa?: string;
};

export function ImportePorSectorChart({
  grupos,
  tituloComparativa = "Importe por sector",
}: ImportePorSectorChartProps) {
  const totalImporte = grupos.reduce(
    (sum, grupo) =>
      sum + grupo.sectores.reduce((acc, s) => acc + s.importeTotal, 0),
    0
  );

  if (totalImporte === 0) {
    return (
      <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 px-6 py-12 text-center text-gray-500">
        No hay importes con sector asignado en el rango seleccionado.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600">
        Importe confirmado total por sector solicitante.
      </div>

      {grupos.map((grupo) => {
        const importeGrupo = grupo.sectores.reduce(
          (sum, s) => sum + s.importeTotal,
          0
        );
        if (importeGrupo === 0) return null;

        return (
          <div
            key={grupo.etiquetaGrupo ?? grupo.divisa}
            className="overflow-x-auto rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-6"
          >
            <div className="mb-4 flex items-center justify-between gap-4">
              <h3 className="text-sm font-semibold text-gray-700">
                {tituloComparativa}
                {grupos.length > 1 && (
                  <span className="ml-2 font-normal text-gray-500">
                    — {grupo.etiquetaGrupo ?? DIVISA_LABELS[grupo.divisa]}
                  </span>
                )}
              </h3>
              <span className="text-xs text-gray-500">
                Total: {formatImporteIndicador(importeGrupo, grupo.divisa)}
              </span>
            </div>

            <SectorGrupo divisa={grupo.divisa} sectores={grupo.sectores} />
          </div>
        );
      })}
    </div>
  );
}

type SectorGrupoProps = {
  divisa: DivisaIndicador;
  sectores: SolicitudPorSector[];
};

function SectorGrupo({ divisa, sectores }: SectorGrupoProps) {
  const chartHeightPx = 220;
  const maxGrupo = Math.max(...sectores.map((s) => s.importeTotal), 1);

  return (
    <div className="flex min-w-max items-end justify-start gap-3 px-1 sm:gap-4">
      {sectores.map((item, index) => {
        const estilos = SECTOR_COLORES[index % SECTOR_COLORES.length];
        const barHeightPx = Math.max(
          (item.importeTotal / maxGrupo) * chartHeightPx,
          item.importeTotal > 0 ? 14 : 0
        );

        return (
          <div
            key={item.sector}
            className="flex w-[72px] shrink-0 flex-col items-center sm:w-[84px]"
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
                title={`${etiquetaSector(item.sector)}: ${formatImporteIndicador(item.importeTotal, divisa)} — ${item.solicitudes} solicitud${item.solicitudes === 1 ? "" : "es"}`}
              />
            </div>
            <p
              className="mt-2 w-full text-center text-[9px] font-medium leading-tight text-gray-600 sm:text-[10px]"
              title={etiquetaSector(item.sector)}
            >
              {etiquetaSector(item.sector)}
            </p>
          </div>
        );
      })}
    </div>
  );
}
