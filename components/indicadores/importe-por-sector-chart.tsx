"use client";

import {
  DIVISA_LABELS,
  etiquetaSector,
  formatImporteIndicador,
  type DivisaIndicador,
  type SolicitudPorSector,
} from "@/lib/indicadores-compras";
import {
  COLOR_GRAFICO,
  IndicadorBarChart,
  IndicadorVacio,
} from "@/components/indicadores/indicador-bar-chart";

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
    (sum, grupo) => sum + grupo.sectores.reduce((acc, s) => acc + s.importeTotal, 0),
    0
  );

  if (totalImporte === 0) {
    return (
      <IndicadorVacio mensaje="No hay importes con sector asignado en el rango seleccionado." />
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600">
        Importe confirmado total por sector solicitante.
      </div>
      {grupos.map((grupo) => {
        const importeGrupo = grupo.sectores.reduce((sum, s) => sum + s.importeTotal, 0);
        if (importeGrupo === 0) return null;
        const etiqueta = grupo.etiquetaGrupo ?? DIVISA_LABELS[grupo.divisa];
        return (
          <IndicadorBarChart
            key={grupo.etiquetaGrupo ?? grupo.divisa}
            titulo={grupos.length > 1 ? `${tituloComparativa} — ${etiqueta}` : tituloComparativa}
            extra={`Total: ${formatImporteIndicador(importeGrupo, grupo.divisa)}`}
            orientacion="horizontal"
            color={COLOR_GRAFICO.ink}
            formatValor={(value) => formatImporteIndicador(value, grupo.divisa)}
            datos={grupo.sectores.map((item) => ({
              label: etiquetaSector(item.sector),
              valor: item.importeTotal,
              detalle: `${item.solicitudes} ${item.solicitudes === 1 ? "solicitud" : "solicitudes"}`,
            }))}
          />
        );
      })}
    </div>
  );
}
