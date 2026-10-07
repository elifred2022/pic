"use client";

import {
  CLASIFICACION_COMPRA_LABELS,
  DIVISA_LABELS,
  formatImporteIndicador,
  type ClasificacionCompra,
  type DivisaIndicador,
  type ImportePorClasificacionCompra,
} from "@/lib/indicadores-compras";
import {
  COLOR_GRAFICO,
  IndicadorBarChart,
  IndicadorLeyenda,
  IndicadorVacio,
} from "@/components/indicadores/indicador-bar-chart";

const COLORES: Record<ClasificacionCompra, string> = {
  PRODUCTIVA: COLOR_GRAFICO.teal,
  NO_PRODUCTIVA: COLOR_GRAFICO.ink,
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
      <IndicadorVacio mensaje="No hay órdenes con clasificación de compra en el rango seleccionado." />
    );
  }

  return (
    <div className="space-y-6">
      <IndicadorLeyenda
        items={(Object.keys(CLASIFICACION_COMPRA_LABELS) as ClasificacionCompra[]).map(
          (clasificacion) => ({
            label: CLASIFICACION_COMPRA_LABELS[clasificacion],
            color: COLORES[clasificacion],
          })
        )}
      />
      {grupos.map((grupo) => {
        const ordenesGrupo = grupo.clasificaciones.reduce((sum, c) => sum + c.ordenes, 0);
        if (ordenesGrupo === 0) return null;
        const etiqueta = grupo.etiquetaGrupo ?? DIVISA_LABELS[grupo.divisa];
        return (
          <IndicadorBarChart
            key={grupo.etiquetaGrupo ?? grupo.divisa}
            titulo={grupos.length > 1 ? `${tituloComparativa} — ${etiqueta}` : tituloComparativa}
            extra={`${ordenesGrupo} ${ordenesGrupo === 1 ? "orden" : "órdenes"}`}
            orientacion="vertical"
            formatValor={(value) => formatImporteIndicador(value, grupo.divisa)}
            datos={grupo.clasificaciones.map((item) => ({
              label: CLASIFICACION_COMPRA_LABELS[item.clasificacion],
              valor: item.importeTotal,
              color: COLORES[item.clasificacion],
              detalle: `${item.ordenes} ${item.ordenes === 1 ? "orden" : "órdenes"}`,
            }))}
          />
        );
      })}
    </div>
  );
}
