"use client";

import type { ReactNode } from "react";

type OrdenProduccion = {
  id: string;
  created_at: string;
  num_carpeta: string | null;
  obra: string | null;
  mes: string | null;
  semana: string | null;
  alertas: string | null;
  url_imagen: string | null;
  url_medicion?: string | null;
  usuario_id: string | null;
  estado_obra?: unknown;
  observaciones?: string | null;
  observaciones_iniciales?: string | null;
};

type Props = {
  ordenes: OrdenProduccion[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onClearSelection: () => void;
  renderValue: (value: unknown) => string;
  formatDate: (dateString: string | null) => string;
  showAccionesColumn: boolean;
  isTabletUser: boolean;
  mobileBtnBase: string;
  onEdit: (orden: OrdenProduccion) => void;
  onDelete: (orden: OrdenProduccion) => void;
  onOpenEstado: (orden: OrdenProduccion) => void;
  renderProgress: (orden: OrdenProduccion) => ReactNode;
  renderImagenButtons: (orden: OrdenProduccion) => ReactNode;
  estadoSummary: (orden: OrdenProduccion) => string;
  renderObraCell: (orden: OrdenProduccion) => ReactNode;
};

function ResumenOrden({
  orden,
  renderValue,
  renderObraCell,
}: {
  orden: OrdenProduccion;
  renderValue: (value: unknown) => string;
  renderObraCell: (orden: OrdenProduccion) => ReactNode;
}) {
  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-3">
      <div>
        <span className="text-[10px] font-bold uppercase tracking-wide text-blue-600">Nº Carpeta</span>
        <p className="text-base font-bold text-gray-900 mt-0.5 break-words">{renderValue(orden.num_carpeta)}</p>
      </div>
      <div>
        <span className="text-[10px] font-bold uppercase tracking-wide text-blue-600">Mes</span>
        <p className="text-sm font-semibold text-gray-800 mt-0.5">{renderValue(orden.mes)}</p>
      </div>
      <div className="col-span-2">
        <span className="text-[10px] font-bold uppercase tracking-wide text-blue-600">Obra</span>
        <div className="mt-0.5">{renderObraCell(orden)}</div>
      </div>
      <div>
        <span className="text-[10px] font-bold uppercase tracking-wide text-blue-600">Semana</span>
        <p className="text-sm font-semibold text-gray-800 mt-0.5">
          {orden.semana ? `Semana ${orden.semana}` : "-"}
        </p>
      </div>
    </div>
  );
}

export default function OrdenesProduccionMobileList({
  ordenes,
  selectedId,
  onSelect,
  onClearSelection,
  renderValue,
  formatDate,
  showAccionesColumn,
  isTabletUser,
  mobileBtnBase,
  onEdit,
  onDelete,
  onOpenEstado,
  renderProgress,
  renderImagenButtons,
  estadoSummary,
  renderObraCell,
}: Props) {
  if (ordenes.length === 0) {
    return (
      <p className="px-4 py-10 text-center text-gray-500 text-sm lg:hidden">
        No hay órdenes de producción registradas.
      </p>
    );
  }

  const selected = selectedId ? ordenes.find((o) => o.id === selectedId) : null;

  if (selected) {
    const summary = estadoSummary(selected);
    return (
      <article className="lg:hidden bg-blue-50/30">
        <div className="p-4 border-b border-gray-200 bg-white">
          <button
            type="button"
            onClick={onClearSelection}
            className="w-full min-h-[44px] mb-3 px-4 py-2.5 text-sm font-semibold text-blue-700 bg-blue-50 border border-blue-200 rounded-xl touch-manipulation active:bg-blue-100"
          >
            ← Volver a la lista
          </button>
          <ResumenOrden orden={selected} renderValue={renderValue} renderObraCell={renderObraCell} />
        </div>
        <div className="px-4 py-4 space-y-4">
          <div className="grid grid-cols-1 gap-2 text-sm bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
            <div className="flex justify-between gap-2 py-2 border-b border-gray-100">
              <span className="text-gray-500 shrink-0">Fecha</span>
              <span className="font-medium text-gray-800 text-right">{formatDate(selected.created_at)}</span>
            </div>
            <div className="flex justify-between gap-2 py-2">
              <span className="text-gray-500 shrink-0">Alertas</span>
              <span
                className={`font-medium text-right break-words ${selected.alertas ? "text-red-600" : "text-gray-400"}`}
              >
                {selected.alertas ? renderValue(selected.alertas) : "-"}
              </span>
            </div>
          </div>
          <div className="space-y-2 bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
            <p className="text-xs font-bold uppercase text-gray-500">Estado de obra</p>
            <button
              type="button"
              onClick={() => onOpenEstado(selected)}
              className={`${mobileBtnBase} bg-amber-500 text-white hover:bg-amber-600`}
            >
              📋 Estado de obra
            </button>
            {summary ? (
              <p className="text-xs text-gray-500 px-1 break-words" title={summary}>
                {summary.length > 120 ? `${summary.slice(0, 117)}...` : summary}
              </p>
            ) : null}
          </div>
          <div className="space-y-2 bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
            <p className="text-xs font-bold uppercase text-gray-500">Imágenes</p>
            {renderImagenButtons(selected)}
          </div>
          {showAccionesColumn && (
            <div className="space-y-2 bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
              <p className="text-xs font-bold uppercase text-gray-500">Acciones</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {!isTabletUser && (
                  <>
                    <button
                      type="button"
                      onClick={() => onEdit(selected)}
                      className={`${mobileBtnBase} bg-blue-500 text-white hover:bg-blue-600`}
                    >
                      ✏️ Editar
                    </button>
                    <button
                      type="button"
                      onClick={() => onDelete(selected)}
                      className={`${mobileBtnBase} bg-red-500 text-white hover:bg-red-600`}
                    >
                      🗑️ Eliminar
                    </button>
                  </>
                )}
              </div>
              {renderProgress(selected)}
            </div>
          )}
        </div>
      </article>
    );
  }

  return (
    <div className="lg:hidden divide-y divide-gray-200">
      <p className="px-4 py-2 text-xs text-gray-500 bg-gray-50 border-b border-gray-100">
        Tocá una carpeta para ver el detalle
      </p>
      {ordenes.map((orden) => (
        <div
          key={orden.id}
          role="button"
          tabIndex={0}
          onClick={() => onSelect(orden.id)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              onSelect(orden.id);
            }
          }}
          className="w-full text-left p-4 bg-white active:bg-blue-50 touch-manipulation transition-colors cursor-pointer"
        >
          <ResumenOrden orden={orden} renderValue={renderValue} renderObraCell={renderObraCell} />
        </div>
      ))}
    </div>
  );
}
