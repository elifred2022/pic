"use client";

import React from "react";
import { getArticulosTerminadosProgress } from "@/lib/panol/estado-obra";

export type OrdenProgreso = {
  id: string;
  num_carpeta: string | null;
  obra: string | null;
  estado_obra?: unknown;
  url_imagen?: string | null;
  url_medicion?: string | null;
};

type Props = {
  ordenes: OrdenProgreso[];
  onClose: () => void;
  onVerOrdenCorte?: (orden: OrdenProgreso) => void;
  onVerMedicion?: (orden: OrdenProgreso) => void;
  onVerEstadoObra?: (orden: OrdenProgreso) => void;
};

function tieneArchivos(url: string | null | undefined): boolean {
  return !!url?.trim();
}

export default function ProgresoProduccionModal({
  ordenes,
  onClose,
  onVerOrdenCorte,
  onVerMedicion,
  onVerEstadoObra,
}: Props) {
  const ordenesOrdenadas = [...ordenes].sort((a, b) => {
    const { percent: percentA } = getArticulosTerminadosProgress(a.estado_obra);
    const { percent: percentB } = getArticulosTerminadosProgress(b.estado_obra);
    return percentB - percentA; // más completas primero
  });

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
        <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-white shrink-0">
          <h2 className="text-xl font-bold text-gray-800">
            📊 Barra de progreso de producción
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm font-medium"
          >
            Cerrar
          </button>
        </div>

        <div className="overflow-y-auto p-4 flex-1">
          {ordenes.length === 0 ? (
            <p className="text-gray-500 text-center py-8">
              No hay órdenes para mostrar.
            </p>
          ) : (
            <div className="space-y-4">
              {ordenesOrdenadas.map((orden) => {
                const { completed, total, percent } = getArticulosTerminadosProgress(orden.estado_obra);
                return (
                  <div
                    key={orden.id}
                    className="border border-gray-200 rounded-lg p-4 bg-gray-50/50 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <span className="font-semibold text-gray-800">
                        {orden.num_carpeta ?? "—"}
                      </span>
                      <span className="text-gray-500">•</span>
                      <span className="text-gray-700">{orden.obra ?? "—"}</span>
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between text-sm text-gray-600">
                        <span>Progreso</span>
                        <span>
                          {total > 0 ? `${percent}% (${completed}/${total})` : "Sin tipologías"}
                        </span>
                      </div>
                      {total > 0 ? (
                        <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-emerald-500 transition-all duration-300 ease-out"
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                      ) : (
                        <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                          <div className="h-full bg-gray-300 w-0" />
                        </div>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2 mt-3">
                      {onVerEstadoObra && (
                        <button
                          type="button"
                          onClick={() => onVerEstadoObra(orden)}
                          className="px-3 py-1.5 text-sm font-medium rounded-lg bg-amber-500 text-white hover:bg-amber-600 transition-colors"
                        >
                          Ver estado de obra
                        </button>
                      )}
                      {tieneArchivos(orden.url_imagen) && onVerOrdenCorte && (
                        <button
                          type="button"
                          onClick={() => onVerOrdenCorte(orden)}
                          className="px-3 py-1.5 text-sm font-medium rounded-lg bg-blue-500 text-white hover:bg-blue-600 transition-colors"
                        >
                          Ver orden de corte
                        </button>
                      )}
                      {tieneArchivos(orden.url_medicion) && onVerMedicion && (
                        <button
                          type="button"
                          onClick={() => onVerMedicion(orden)}
                          className="px-3 py-1.5 text-sm font-medium rounded-lg bg-blue-500 text-white hover:bg-blue-600 transition-colors"
                        >
                          Ver medición
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
