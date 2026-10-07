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

type SolicitudesPorSectorChartProps = {
  grupos: Array<{
    divisa: DivisaIndicador;
    etiquetaGrupo?: string;
    sectores: SolicitudPorSector[];
  }>;
  tituloComparativa?: string;
};

export function SolicitudesPorSectorChart({
  grupos,
  tituloComparativa = "Solicitudes por sector",
}: SolicitudesPorSectorChartProps) {
  const totalSolicitudes = grupos.reduce(
    (sum, grupo) => sum + grupo.sectores.reduce((acc, s) => acc + s.solicitudes, 0),
    0
  );

  if (totalSolicitudes === 0) {
    return (
      <IndicadorVacio mensaje="No hay solicitudes con sector asignado en el rango seleccionado." />
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600">
        Cantidad de órdenes de compra por sector solicitante.
      </div>
      {grupos.map((grupo) => {
        const solicitudesGrupo = grupo.sectores.reduce((sum, s) => sum + s.solicitudes, 0);
        if (solicitudesGrupo === 0) return null;
        const etiqueta = grupo.etiquetaGrupo ?? DIVISA_LABELS[grupo.divisa];
        return (
          <IndicadorBarChart
            key={grupo.etiquetaGrupo ?? grupo.divisa}
            titulo={grupos.length > 1 ? `${tituloComparativa} — ${etiqueta}` : tituloComparativa}
            extra={`${solicitudesGrupo} ${solicitudesGrupo === 1 ? "solicitud" : "solicitudes"}`}
            orientacion="horizontal"
            color={COLOR_GRAFICO.teal}
            formatValor={(value) => String(value)}
            datos={grupo.sectores.map((item) => ({
              label: etiquetaSector(item.sector),
              valor: item.solicitudes,
              detalle: formatImporteIndicador(item.importeTotal, grupo.divisa),
            }))}
          />
        );
      })}
    </div>
  );
}
