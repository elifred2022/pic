"use client";

import {
  DIVISA_LABELS,
  ESTADO_SOLICITUD_LABELS,
  formatImporteIndicador,
  type DivisaIndicador,
  type EstadoSolicitud,
  type SolicitudPorEstado,
} from "@/lib/indicadores-compras";

const ESTADO_ESTILOS: Record<
  EstadoSolicitud,
  { barClassName: string; textClassName: string }
> = {
  PENDIENTE: {
    barClassName: "bg-gradient-to-t from-yellow-500 to-yellow-400",
    textClassName: "text-yellow-700",
  },
  APROBADA: {
    barClassName: "bg-gradient-to-t from-emerald-600 to-emerald-500",
    textClassName: "text-emerald-700",
  },
  RECHAZADA: {
    barClassName: "bg-gradient-to-t from-red-600 to-red-500",
    textClassName: "text-red-700",
  },
  CUMPLIDA: {
    barClassName: "bg-gradient-to-t from-blue-600 to-blue-500",
    textClassName: "text-blue-700",
  },
  ENTREGO_PARCIAL: {
    barClassName: "bg-gradient-to-t from-orange-500 to-orange-400",
    textClassName: "text-orange-700",
  },
  ANULADO: {
    barClassName: "bg-gradient-to-t from-rose-700 to-rose-600",
    textClassName: "text-rose-800",
  },
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
    (sum, grupo) =>
      sum + grupo.estados.reduce((acc, e) => acc + e.solicitudes, 0),
    0
  );

  if (totalSolicitudes === 0) {
    return (
      <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 px-6 py-12 text-center text-gray-500">
        No hay solicitudes en el rango seleccionado.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-4 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
        {(Object.keys(ESTADO_SOLICITUD_LABELS) as EstadoSolicitud[]).map(
          (estado) => (
            <div
              key={estado}
              className="flex items-center gap-2 text-sm text-gray-600"
            >
              <span
                className={`inline-block h-3 w-3 rounded-sm ${ESTADO_ESTILOS[estado].barClassName}`}
              />
              {ESTADO_SOLICITUD_LABELS[estado]}
            </div>
          )
        )}
      </div>

      {grupos.map((grupo) => {
        const solicitudesGrupo = grupo.estados.reduce(
          (sum, e) => sum + e.solicitudes,
          0
        );
        if (solicitudesGrupo === 0) return null;

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
                {solicitudesGrupo}{" "}
                {solicitudesGrupo === 1 ? "solicitud" : "solicitudes"}
              </span>
            </div>

            <EstadoGrupo divisa={grupo.divisa} estados={grupo.estados} />
          </div>
        );
      })}
    </div>
  );
}

type EstadoGrupoProps = {
  divisa: DivisaIndicador;
  estados: SolicitudPorEstado[];
};

function EstadoGrupo({ divisa, estados }: EstadoGrupoProps) {
  const chartHeightPx = 220;
  const maxGrupo = Math.max(...estados.map((e) => e.solicitudes), 1);

  return (
    <div className="flex min-w-[480px] items-end justify-center gap-2 sm:gap-3">
      {estados.map((item) => {
        const estilos = ESTADO_ESTILOS[item.estado];
        const barHeightPx = Math.max(
          (item.solicitudes / maxGrupo) * chartHeightPx,
          item.solicitudes > 0 ? 14 : 0
        );

        return (
          <div
            key={item.estado}
            className="flex min-w-0 flex-1 max-w-[88px] flex-col items-center"
          >
            <div
              className="flex w-full flex-col items-center justify-end"
              style={{ minHeight: chartHeightPx + 48 }}
            >
              <p
                className={`mb-1 w-full text-center text-[10px] font-semibold leading-tight sm:text-xs ${estilos.textClassName}`}
              >
                {item.solicitudes}
              </p>
              <div
                className={`w-full rounded-t-lg shadow-md transition-all duration-500 ${estilos.barClassName}`}
                style={{ height: `${barHeightPx}px` }}
                title={`${ESTADO_SOLICITUD_LABELS[item.estado]}: ${item.solicitudes} solicitud${item.solicitudes === 1 ? "" : "es"} — ${formatImporteIndicador(item.importeTotal, divisa)}`}
              />
            </div>
            <p className="mt-2 w-full text-center text-[9px] font-medium leading-tight text-gray-500 sm:text-[10px]">
              {ESTADO_SOLICITUD_LABELS[item.estado]}
            </p>
          </div>
        );
      })}
    </div>
  );
}
