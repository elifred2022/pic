"use client";

import React, { useMemo, useState } from "react";
import {
  agruparTotalesArticulosTerminados,
  listArticulosTerminados,
} from "@/lib/panol/estado-obra";

export type OrdenTotalArticulos = {
  id: string;
  created_at?: string;
  estado_obra?: unknown;
};

type Props = {
  ordenes: OrdenTotalArticulos[];
  fechaDesdeInicial?: string;
  fechaHastaInicial?: string;
  onClose: () => void;
};

function fechaOrdenYYYYMMDD(createdAt?: string): string | null {
  if (!createdAt) return null;
  const created = new Date(createdAt);
  if (Number.isNaN(created.getTime())) return null;
  return created.toISOString().slice(0, 10);
}

function ordenEnRangoFecha(
  createdAt: string | undefined,
  fechaDesde: string,
  fechaHasta: string
): boolean {
  if (!fechaDesde && !fechaHasta) return true;
  const fecha = fechaOrdenYYYYMMDD(createdAt);
  if (!fecha) return false;
  if (fechaDesde && fecha < fechaDesde) return false;
  if (fechaHasta && fecha > fechaHasta) return false;
  return true;
}

export default function TotalArticulosTerminadosModal({
  ordenes,
  fechaDesdeInicial = "",
  fechaHastaInicial = "",
  onClose,
}: Props) {
  const [fechaDesde, setFechaDesde] = useState(fechaDesdeInicial);
  const [fechaHasta, setFechaHasta] = useState(fechaHastaInicial);

  const { filas, total } = useMemo(() => {
    const items = ordenes
      .filter((orden) => ordenEnRangoFecha(orden.created_at, fechaDesde, fechaHasta))
      .flatMap((orden) => listArticulosTerminados(orden.estado_obra));
    const agrupadas = agruparTotalesArticulosTerminados(items);
    const suma = agrupadas.reduce((acc, row) => acc + row.cantidad, 0);
    return { filas: agrupadas, total: suma };
  }, [ordenes, fechaDesde, fechaHasta]);

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="bg-white shadow-2xl w-full h-full overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-wrap items-center justify-between gap-3 p-4 border-b border-gray-200 bg-white shrink-0">
          <div>
            <h2 className="text-xl font-bold text-gray-800">Total artículos terminados</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              {total === 1 ? "1 artículo terminado" : `${total} artículos terminados`}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <label className="text-sm font-medium text-gray-600" htmlFor="total-articulos-fecha-desde">
              Desde:
            </label>
            <input
              id="total-articulos-fecha-desde"
              type="date"
              value={fechaDesde}
              onChange={(e) => setFechaDesde(e.target.value)}
              className="px-3 py-2 border-2 border-gray-300 rounded-lg text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
            />
            <label className="text-sm font-medium text-gray-600" htmlFor="total-articulos-fecha-hasta">
              Hasta:
            </label>
            <input
              id="total-articulos-fecha-hasta"
              type="date"
              value={fechaHasta}
              onChange={(e) => setFechaHasta(e.target.value)}
              className="px-3 py-2 border-2 border-gray-300 rounded-lg text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
            />
            {(fechaDesde || fechaHasta) && (
              <button
                type="button"
                onClick={() => {
                  setFechaDesde("");
                  setFechaHasta("");
                }}
                className="px-3 py-2 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Limpiar fechas
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm font-medium"
            >
              Cerrar
            </button>
          </div>
        </div>

        <div className="overflow-y-auto p-4 flex-1">
          {filas.length === 0 ? (
            <p className="text-gray-500 text-center py-8">
              No hay artículos marcados como terminados
              {fechaDesde || fechaHasta ? " en el rango de fechas seleccionado" : ""}.
            </p>
          ) : (
            <div className="overflow-x-auto border border-gray-200 rounded-lg">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50 sticky top-0">
                  <tr className="text-left text-gray-600">
                    <th className="px-4 py-3 font-semibold">Tip</th>
                    <th className="px-4 py-3 font-semibold">Descripción</th>
                    <th className="px-4 py-3 font-semibold text-right w-28">Cantidad</th>
                  </tr>
                </thead>
                <tbody>
                  {filas.map((fila) => (
                    <tr
                      key={`${fila.tip}::${fila.descripcion}`}
                      className="border-t border-gray-100 hover:bg-gray-50"
                    >
                      <td className="px-4 py-2.5 font-medium text-gray-800">{fila.tip}</td>
                      <td className="px-4 py-2.5 text-gray-700">{fila.descripcion}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-gray-800">{fila.cantidad}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-gray-300 bg-emerald-50">
                    <td className="px-4 py-3 font-bold text-gray-800" colSpan={2}>
                      Total
                    </td>
                    <td className="px-4 py-3 font-bold text-right tabular-nums text-gray-800">{total}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
