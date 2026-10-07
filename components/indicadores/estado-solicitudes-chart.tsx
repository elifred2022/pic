"use client";

import {
  DIVISA_LABELS,
  ESTADO_SOLICITUD_LABELS,
  formatImporteIndicador,
  type DivisaIndicador,
  type EstadoSolicitud,
  type SolicitudPorEstado,
} from "@/lib/indicadores-compras";
import {
  COLOR_GRAFICO,
  IndicadorBarChart,
  IndicadorLeyenda,
  IndicadorVacio,
} from "@/components/indicadores/indicador-bar-chart";

const COLORES: Record<EstadoSolicitud, string> = {
  PENDIENTE: COLOR_GRAFICO.gold,
  APROBADA: COLOR_GRAFICO.teal,
  RECHAZADA: COLOR_GRAFICO.coral,
  CUMPLIDA: COLOR_GRAFICO.ink,
  ENTREGO_PARCIAL: COLOR_GRAFICO.amber,
  ANULADO: "hsl(347 77% 40%)",
};

type EstadoSolicitudesChartProps = {
  grupos: Array<{
    divisa: DivisaIndicador;
    etiquetaGrupo?: string;
    estados: SolicitudPorEstado[];
  }>;
  tituloComparativa?: string;
};

export function EstadoSolicitudesChart({
  grupos,
  tituloComparativa = "Estado de solicitudes",
}: EstadoSolicitudesChartProps) {
  const totalSolicitudes = grupos.reduce(
    (sum, grupo) => sum + grupo.estados.reduce((acc, e) => acc + e.solicitudes, 0),
    0
  );

  if (totalSolicitudes === 0) {
    return <IndicadorVacio mensaje="No hay solicitudes en el rango seleccionado." />;
  }

  return (
    <div className="space-y-6">
      <IndicadorLeyenda
        items={(Object.keys(ESTADO_SOLICITUD_LABELS) as EstadoSolicitud[]).map((estado) => ({
          label: ESTADO_SOLICITUD_LABELS[estado],
          color: COLORES[estado],
        }))}
      />
      {grupos.map((grupo) => {
        const solicitudesGrupo = grupo.estados.reduce((sum, e) => sum + e.solicitudes, 0);
        if (solicitudesGrupo === 0) return null;
        const etiqueta = grupo.etiquetaGrupo ?? DIVISA_LABELS[grupo.divisa];
        return (
          <IndicadorBarChart
            key={grupo.etiquetaGrupo ?? grupo.divisa}
            titulo={grupos.length > 1 ? `${tituloComparativa} — ${etiqueta}` : tituloComparativa}
            extra={`${solicitudesGrupo} ${solicitudesGrupo === 1 ? "solicitud" : "solicitudes"}`}
            orientacion="horizontal"
            formatValor={(value) => String(value)}
            datos={grupo.estados.map((item) => ({
              label: ESTADO_SOLICITUD_LABELS[item.estado],
              valor: item.solicitudes,
              color: COLORES[item.estado],
              detalle: formatImporteIndicador(item.importeTotal, grupo.divisa),
            }))}
          />
        );
      })}
    </div>
  );
}
