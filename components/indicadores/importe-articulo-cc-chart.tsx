"use client";

import {
  DIVISA_LABELS,
  formatImporteIndicador,
  type DivisaIndicador,
  type ImportePorArticuloOCc,
} from "@/lib/indicadores-compras";

const ITEM_COLORES = [
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
      <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 px-6 py-12 text-center text-gray-500">
        No hay importes con código de cuenta en el rango seleccionado.
      </div>
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
    (sum, grupo) =>
      sum + grupo.items.reduce((acc, item) => acc + item.importeTotal, 0),
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
        {seccion.descripcion && (
          <p className="mt-1 text-sm text-gray-600">{seccion.descripcion}</p>
        )}
      </div>

      {seccion.grupos.map((grupo) => {
        const importeGrupo = grupo.items.reduce(
          (sum, item) => sum + item.importeTotal,
          0
        );
        if (importeGrupo === 0) return null;

        return (
          <div
            key={`${seccion.tituloSeccion}-${grupo.etiquetaGrupo ?? grupo.divisa}`}
            className="overflow-x-auto rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-6"
          >
            <div className="mb-4 flex items-center justify-between gap-4">
              <h3 className="text-sm font-semibold text-gray-700">
                {seccion.tituloComparativa ?? seccion.tituloSeccion}
                {seccion.grupos.length > 1 && (
                  <span className="ml-2 font-normal text-gray-500">
                    — {grupo.etiquetaGrupo ?? DIVISA_LABELS[grupo.divisa]}
                  </span>
                )}
              </h3>
              <span className="text-xs text-gray-500">
                Total: {formatImporteIndicador(importeGrupo, grupo.divisa)}
              </span>
            </div>

            <ItemsGrupo divisa={grupo.divisa} items={grupo.items} />
          </div>
        );
      })}
    </div>
  );
}

type ItemsGrupoProps = {
  divisa: DivisaIndicador;
  items: ImportePorArticuloOCc[];
};

function ItemsGrupo({ divisa, items }: ItemsGrupoProps) {
  const chartHeightPx = 220;
  const maxGrupo = Math.max(...items.map((item) => item.importeTotal), 1);

  return (
    <div className="flex min-w-max items-end justify-start gap-3 px-1 sm:gap-4">
      {items.map((item, index) => {
        const estilos = ITEM_COLORES[index % ITEM_COLORES.length];
        const barHeightPx = Math.max(
          (item.importeTotal / maxGrupo) * chartHeightPx,
          item.importeTotal > 0 ? 14 : 0
        );

        return (
          <div
            key={item.clave}
            className="flex w-[88px] shrink-0 flex-col items-center sm:w-[100px]"
          >
            <div
              className="flex w-full flex-col items-center justify-end"
              style={{ minHeight: chartHeightPx + 48 }}
            >
              <p
                className={`mb-1 w-full text-center text-[8px] font-semibold leading-tight sm:text-[9px] ${estilos.textClassName}`}
              >
                {formatImporteIndicador(item.importeTotal, divisa)}
              </p>
              <div
                className={`w-full rounded-t-lg shadow-md transition-all duration-500 ${estilos.barClassName}`}
                style={{ height: `${barHeightPx}px` }}
                title={`${item.clave}: ${formatImporteIndicador(item.importeTotal, divisa)} — ${item.lineas} línea${item.lineas === 1 ? "" : "s"}`}
              />
            </div>
            <p
              className="mt-2 line-clamp-3 w-full text-center text-[8px] font-medium leading-tight text-gray-600 sm:text-[9px]"
              title={item.clave}
            >
              {item.clave}
            </p>
          </div>
        );
      })}
    </div>
  );
}
