"use client";

import {
  DIVISA_LABELS,
  formatImporteIndicador,
  type DivisaIndicador,
  type ImportePorProveedor,
} from "@/lib/indicadores-compras";
import {
  COLOR_GRAFICO,
  IndicadorBarChart,
  IndicadorVacio,
} from "@/components/indicadores/indicador-bar-chart";

type ImportePorProveedorChartProps = {
  grupos: Array<{
    divisa: DivisaIndicador;
    etiquetaGrupo?: string;
    proveedores: ImportePorProveedor[];
  }>;
  tituloComparativa?: string;
};

export function ImportePorProveedorChart({
  grupos,
  tituloComparativa = "Importe por proveedor",
}: ImportePorProveedorChartProps) {
  const totalImporte = grupos.reduce(
    (sum, grupo) => sum + grupo.proveedores.reduce((acc, p) => acc + p.importeTotal, 0),
    0
  );

  if (totalImporte === 0) {
    return (
      <IndicadorVacio mensaje="No hay importes con proveedor asignado en el rango seleccionado." />
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600">
        Importe confirmado total por proveedor.
      </div>
      {grupos.map((grupo) => {
        const importeGrupo = grupo.proveedores.reduce((sum, p) => sum + p.importeTotal, 0);
        if (importeGrupo === 0) return null;
        const etiqueta = grupo.etiquetaGrupo ?? DIVISA_LABELS[grupo.divisa];
        return (
          <IndicadorBarChart
            key={grupo.etiquetaGrupo ?? grupo.divisa}
            titulo={grupos.length > 1 ? `${tituloComparativa} — ${etiqueta}` : tituloComparativa}
            extra={`Total: ${formatImporteIndicador(importeGrupo, grupo.divisa)}`}
            orientacion="horizontal"
            color={COLOR_GRAFICO.teal}
            formatValor={(value) => formatImporteIndicador(value, grupo.divisa)}
            datos={grupo.proveedores.map((item) => ({
              label: item.proveedor,
              valor: item.importeTotal,
              detalle: `${item.ordenes} ${item.ordenes === 1 ? "orden" : "órdenes"}`,
            }))}
          />
        );
      })}
    </div>
  );
}
