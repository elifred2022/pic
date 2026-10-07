"use client";

import {
  DIVISA_LABELS,
  formatImporteIndicador,
  type DivisaIndicador,
  type ImportePorArticuloOCc,
} from "@/lib/indicadores-compras";
import {
  COLOR_GRAFICO,
  IndicadorBarChart,
  IndicadorVacio,
} from "@/components/indicadores/indicador-bar-chart";

type ImporteArticuloCcSeccion = {
  tituloSeccion: string;
  descripcion?: string;
  grupos: Array<{
    divisa: DivisaIndicador;
    etiquetaGrupo?: string;
    items: ImportePorArticuloOCc[];
  }>;
  tituloComparativa?: string;
  mensajeVacio?: string;
};

type ImporteArticuloCcChartProps = {
  secciones: ImporteArticuloCcSeccion[];
};

export function ImporteArticuloCcChart({ secciones }: ImporteArticuloCcChartProps) {
  const totalImporte = secciones.reduce(
    (sum, seccion) =>
      sum +
      seccion.grupos.reduce(
        (accGrupo, grupo) =>
          accGrupo + grupo.items.reduce((acc, item) => acc + item.importeTotal, 0),
        0
      ),
    0
  );

  if (totalImporte === 0) {
    return (
      <IndicadorVacio mensaje="No hay importes con código de cuenta en el rango seleccionado." />
    );
  }

  return (
    <div className="space-y-8">
      {secciones.map((seccion) => (
        <SeccionImporte key={seccion.tituloSeccion} seccion={seccion} />
      ))}
    </div>
  );
}

function SeccionImporte({ seccion }: { seccion: ImporteArticuloCcSeccion }) {
  const totalSeccion = seccion.grupos.reduce(
    (sum, grupo) => sum + grupo.items.reduce((acc, item) => acc + item.importeTotal, 0),
    0
  );

  if (totalSeccion === 0) {
    return (
      <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 px-6 py-8 text-center text-gray-500">
        {seccion.mensajeVacio ??
          `No hay importes para ${seccion.tituloSeccion.toLowerCase()}.`}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
        <h4 className="text-sm font-semibold text-gray-800">{seccion.tituloSeccion}</h4>
        {seccion.descripcion ? (
          <p className="mt-1 text-sm text-gray-600">{seccion.descripcion}</p>
        ) : null}
      </div>
      {seccion.grupos.map((grupo) => {
        const importeGrupo = grupo.items.reduce((sum, item) => sum + item.importeTotal, 0);
        if (importeGrupo === 0) return null;
        const etiqueta = grupo.etiquetaGrupo ?? DIVISA_LABELS[grupo.divisa];
        const titulo = seccion.tituloComparativa ?? seccion.tituloSeccion;
        return (
          <IndicadorBarChart
            key={`${seccion.tituloSeccion}-${grupo.etiquetaGrupo ?? grupo.divisa}`}
            titulo={seccion.grupos.length > 1 ? `${titulo} — ${etiqueta}` : titulo}
            extra={`Total: ${formatImporteIndicador(importeGrupo, grupo.divisa)}`}
            orientacion="horizontal"
            color={COLOR_GRAFICO.ink}
            formatValor={(value) => formatImporteIndicador(value, grupo.divisa)}
            datos={grupo.items.map((item) => ({
              label: item.clave,
              valor: item.importeTotal,
              detalle: `${item.lineas} ${item.lineas === 1 ? "línea" : "líneas"}`,
            }))}
          />
        );
      })}
    </div>
  );
}
