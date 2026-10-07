"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  XAxis,
  YAxis,
} from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  type ChartConfig,
} from "@/components/ui/chart";

export const COLOR_GRAFICO = {
  coral: "hsl(0 74% 42%)",
  teal: "hsl(163 84% 28%)",
  ink: "hsl(221 78% 40%)",
  gold: "hsl(36 94% 38%)",
  amber: "hsl(24 92% 42%)",
} as const;

export type BarraIndicador = {
  label: string;
  valor: number;
  color?: string;
  detalle?: string;
};

const TAMANO_BLOQUE = 12;

function partir<T>(items: T[], size: number): T[][] {
  if (items.length <= size) return [items];
  const bloques: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    bloques.push(items.slice(index, index + size));
  }
  return bloques;
}

function acortar(label: string, max: number) {
  const texto = label.trim();
  return texto.length > max ? `${texto.slice(0, max - 1)}…` : texto;
}

export function IndicadorVacio({ mensaje }: { mensaje: string }) {
  return (
    <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 px-6 py-12 text-center text-gray-500">
      {mensaje}
    </div>
  );
}

export function IndicadorLeyenda({
  items,
}: {
  items: Array<{ label: string; color: string }>;
}) {
  return (
    <div className="flex flex-wrap gap-4 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
      {items.map((item) => (
        <div key={item.label} className="flex items-center gap-2 text-sm text-gray-600">
          <span
            className="inline-block h-2.5 w-2.5 rounded-sm"
            style={{ backgroundColor: item.color }}
          />
          {item.label}
        </div>
      ))}
    </div>
  );
}

type IndicadorBarChartProps = {
  titulo: string;
  extra?: string;
  datos: BarraIndicador[];
  formatValor: (value: number) => string;
  color?: string;
  orientacion?: "vertical" | "horizontal";
};

export function IndicadorBarChart({
  titulo,
  extra,
  datos,
  formatValor,
  color = COLOR_GRAFICO.teal,
  orientacion,
}: IndicadorBarChartProps) {
  const horizontal = orientacion ? orientacion === "horizontal" : datos.length > 8;
  const bloques = horizontal ? partir(datos, TAMANO_BLOQUE) : [datos];

  return (
    <>
      {bloques.map((bloque, index) => (
        <div
          key={`${titulo}-${index}`}
          className="overflow-x-auto rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-6"
        >
          <div className="mb-2 flex items-center justify-between gap-4">
            <h3 className="text-sm font-semibold text-gray-700">
              {titulo}
              {bloques.length > 1 ? ` (${index + 1}/${bloques.length})` : ""}
            </h3>
            {extra && index === 0 ? (
              <span className="text-xs text-gray-500">{extra}</span>
            ) : null}
          </div>
          <Barras
            datos={bloque}
            formatValor={formatValor}
            color={color}
            horizontal={horizontal}
          />
        </div>
      ))}
    </>
  );
}

function TooltipValor({
  active,
  payload,
  formatValor,
}: {
  active?: boolean;
  payload?: ReadonlyArray<{ payload?: BarraIndicador }>;
  formatValor: (value: number) => string;
}) {
  const fila = payload?.[0]?.payload;
  if (!active || !fila) return null;

  return (
    <div className="grid min-w-[8rem] gap-1 rounded-lg border border-border/50 bg-background px-2.5 py-1.5 text-xs shadow-xl">
      <span className="font-medium text-foreground">{fila.label}</span>
      <span className="font-mono font-medium tabular-nums text-foreground">
        {formatValor(fila.valor)}
      </span>
      {fila.detalle ? (
        <span className="text-muted-foreground">{fila.detalle}</span>
      ) : null}
    </div>
  );
}

function Barras({
  datos,
  formatValor,
  color,
  horizontal,
}: {
  datos: BarraIndicador[];
  formatValor: (value: number) => string;
  color: string;
  horizontal: boolean;
}) {
  const config = {
    valor: { label: "Valor", color },
  } satisfies ChartConfig;
  const height = horizontal ? Math.max(220, datos.length * 42 + 28) : 300;

  const tooltip = (
    <ChartTooltip
      content={(props) => (
        <TooltipValor
          active={props.active}
          payload={props.payload as ReadonlyArray<{ payload?: BarraIndicador }>}
          formatValor={formatValor}
        />
      )}
    />
  );

  const etiquetas = (
    <LabelList
      dataKey="valor"
      position={horizontal ? "right" : "top"}
      offset={8}
      formatter={(value: unknown) => formatValor(Number(value))}
      fill="#111827"
      fontSize={12}
      fontWeight={600}
    />
  );

  return (
    <ChartContainer
      config={config}
      className="aspect-auto w-full"
      style={{ height }}
      initialDimension={{ width: 720, height }}
    >
      {horizontal ? (
        <BarChart
          data={datos}
          layout="vertical"
          margin={{ top: 8, right: 132, left: 8, bottom: 8 }}
        >
          <CartesianGrid horizontal={false} />
          <XAxis type="number" hide />
          <YAxis
            type="category"
            dataKey="label"
            width={210}
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 12, fill: "#6b7280" }}
            tickFormatter={(value: string) => acortar(String(value), 32)}
          />
          {tooltip}
          <Bar dataKey="valor" radius={4} maxBarSize={22} isAnimationActive={false}>
            {datos.map((dato, index) => (
              <Cell key={`${dato.label}-${index}`} fill={dato.color ?? color} />
            ))}
            {etiquetas}
          </Bar>
        </BarChart>
      ) : (
        <BarChart data={datos} margin={{ top: 36, right: 16, left: 16, bottom: 8 }}>
          <CartesianGrid vertical={false} />
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={false}
            interval={0}
            tick={{ fontSize: 12, fill: "#6b7280" }}
            tickFormatter={(value: string) => acortar(String(value), 18)}
          />
          <YAxis hide />
          {tooltip}
          <Bar dataKey="valor" radius={6} maxBarSize={64} isAnimationActive={false}>
            {datos.map((dato, index) => (
              <Cell key={`${dato.label}-${index}`} fill={dato.color ?? color} />
            ))}
            {etiquetas}
          </Bar>
        </BarChart>
      )}
    </ChartContainer>
  );
}
