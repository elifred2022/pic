"use client";

import React, { useMemo } from "react";
import {
  agruparTotalesArticulosTerminados,
  listArticulosTerminados,
} from "@/lib/panol/estado-obra";

export type OrdenTotalArticulos = {
  id: string;
  estado_obra?: unknown;
};

type Props = {
  ordenes: OrdenTotalArticulos[];
  onClose: () => void;
};

export default function TotalArticulosTerminadosModal({ ordenes, onClose }: Props) {
  const { filas, total } = useMemo(() => {
    const items = ordenes.flatMap((orden) => listArticulosTerminados(orden.estado_obra));
    const agrupadas = agruparTotalesArticulosTerminados(items);
    const suma = agrupadas.reduce((acc, row) => acc + row.cantidad, 0);
    return { filas: agrupadas, total: suma };
  }, [ordenes]);

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
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm font-medium"
          >
            Cerrar
          </button>
        </div>

        <div className="overflow-y-auto p-4 flex-1">
          {filas.length === 0 ? (
            <p className="text-gray-500 text-center py-8">
              No hay artículos marcados como terminados en las órdenes actuales.
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
