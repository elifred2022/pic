"use client";

import type { ReactNode } from "react";
import {
  formatHistoricoFecha,
  parseHistoricoEstado,
  type HistoricoEstadoEntry,
} from "@/lib/historico-estado-pedidos-productivos";

type ArticuloComparativa = {
  codint: string;
  cant: number;
  articulo: string;
  precioUnitario: number | null;
  descuentoPorcentaje: number;
  subtotal: number;
};

type ProveedorComparativa = {
  presupuesto_path?: string | null;
  nombreProveedor: string;
  articulos: ArticuloComparativa[];
  total: number;
};

type ArticuloPedido = {
  codint: string;
  articulo: string;
  descripcion: string;
  existencia: number;
  cant: number;
  provsug: string;
  codprovsug?: string;
  presentacion?: string;
  observacion: string;
};

export type PedidoMobile = {
  comparativa_prov: ProveedorComparativa[] | null;
  id: string;
  created_at: string;
  necesidad: string;
  categoria: string;
  solicita: string;
  nota_solicitante?: string | null;
  sector: string;
  controlado: string;
  supervisor: string;
  aprueba: string;
  nota_aprobador?: string;
  notas_aprobador?: string;
  nota_comprador?: string;
  comprador?: string | null;
  estado: string;
  historico_estado?: HistoricoEstadoEntry[] | null;
  observ: string;
  numero_oc: string | null;
  proveedor_seleccionado: string | null;
  usd: number;
  eur: number;
  ars: number;
  fecha_conf: string;
  fecha_prom: string;
  fecha_ent: string;
  rto: string | null;
  fac: string | null;
  articulos: ArticuloPedido[];
};

type Props = {
  pedidos: PedidoMobile[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onClearSelection: () => void;
  formatDate: (dateString: string | null) => string;
  renderValue: (value: unknown) => string;
  mobileBtnBase: string;
  onEdit: (pedido: PedidoMobile) => void;
  onComparativa: (pedido: PedidoMobile) => void;
  onDelete: (pedido: PedidoMobile) => void;
  canEdit?: boolean;
};

function estadoBadgeClass(estado: string): string {
  const base = "inline-block px-1.5 py-0 text-[10px] leading-tight font-semibold rounded";
  if (estado === "anulado") return `${base} bg-red-100 text-red-800`;
  if (estado === "aprobado" || estado === "confirmado") return `${base} bg-green-100 text-green-800`;
  if (estado === "entrego parcial" || estado === "entrego_parcial") {
    return `${base} bg-orange-50 text-orange-500`;
  }
  if (estado === "cotizado") return `${base} bg-yellow-100 text-yellow-800`;
  if (estado === "iniciado") return `${base} bg-orange-50 text-orange-500`;
  if (estado === "visto/recibido" || estado === "Visto/recibido") {
    return `${base} bg-orange-50 text-orange-500`;
  }
  if (estado === "stand by" || estado === "Presentar presencial") {
    return `${base} bg-orange-100 text-orange-800`;
  }
  if (estado === "cumplido") return `${base} bg-blue-50 text-blue-600`;
  return `${base} bg-gray-100 text-gray-600`;
}

function ResumenPedido({
  pedido,
  formatDate,
  renderValue,
}: {
  pedido: PedidoMobile;
  formatDate: (dateString: string | null) => string;
  renderValue: (value: unknown) => string;
}) {
  return (
    <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs">
      <div>
        <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">PIC</span>
        <p className="font-semibold text-slate-900 tabular-nums">#{pedido.id}</p>
      </div>
      <div>
        <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Estado</span>
        <p className="mt-0.5">
          <span className={estadoBadgeClass(pedido.estado)}>{renderValue(pedido.estado)}</span>
        </p>
        {parseHistoricoEstado(pedido.historico_estado).length > 0 ? (
          <div className="mt-0.5 flex flex-col gap-0.5">
            {parseHistoricoEstado(pedido.historico_estado).map((h, i) => (
              <span
                key={`${h.estado}-${h.fecha}-${i}`}
                className="text-[10px] leading-tight text-slate-500 tabular-nums"
              >
                {h.estado} · {formatHistoricoFecha(h.fecha)}
              </span>
            ))}
          </div>
        ) : null}
      </div>
      <div>
        <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">F. solicitud</span>
        <p className="font-medium text-slate-700 tabular-nums">{formatDate(pedido.created_at)}</p>
      </div>
      <div>
        <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Sector</span>
        <p className="font-medium text-slate-700 break-words">{renderValue(pedido.sector)}</p>
      </div>
      <div className="col-span-2">
        <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Solicitante</span>
        <p className="font-medium text-slate-800 break-words">{renderValue(pedido.solicita)}</p>
        {pedido.nota_solicitante?.trim() ? (
          <p className="text-[10px] text-blue-700 font-semibold mt-0.5 break-words">
            {pedido.nota_solicitante}
          </p>
        ) : null}
      </div>
    </div>
  );
}

function DetalleFila({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="flex justify-between gap-2 py-1.5 border-b border-gray-100 last:border-0 text-xs">
      <span className="text-slate-500 shrink-0">{label}</span>
      <span className="font-medium text-slate-800 text-right break-words">{children}</span>
    </div>
  );
}

export default function PedidosProductivosAdminMobileList({
  pedidos,
  selectedId,
  onSelect,
  onClearSelection,
  formatDate,
  renderValue,
  mobileBtnBase,
  onEdit,
  onComparativa,
  onDelete,
  canEdit = true,
}: Props) {
  if (pedidos.length === 0) {
    return (
      <p className="px-3 py-8 text-center text-slate-500 text-xs lg:hidden">
        No hay pedidos productivos registrados.
      </p>
    );
  }

  const selected = selectedId ? pedidos.find((p) => p.id === selectedId) : null;

  if (selected) {
    const p = selected;
    return (
      <article className="lg:hidden bg-slate-50/40">
        <div className="p-3 border-b border-gray-200 bg-white">
          <button
            type="button"
            onClick={onClearSelection}
            className="w-full min-h-[40px] mb-2 px-3 py-2 text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 rounded-lg touch-manipulation active:bg-blue-100"
          >
            ← Volver a la lista
          </button>
          <ResumenPedido pedido={p} formatDate={formatDate} renderValue={renderValue} />
        </div>
        <div className="px-3 py-3 space-y-2.5">
          <div className="bg-white rounded-lg p-3 border border-gray-200 shadow-sm">
            <DetalleFila label="Fecha necesidad">{formatDate(p.necesidad)}</DetalleFila>
            <DetalleFila label="Categoría">{renderValue(p.categoria)}</DetalleFila>
          </div>

          <div className="bg-white rounded-lg p-3 border border-gray-200 shadow-sm">
            <p className="text-[10px] font-semibold uppercase text-slate-500 mb-1.5">
              Artículos solicitados
            </p>
            {p.articulos && p.articulos.length > 0 ? (
              <div className="space-y-1.5">
                {p.articulos.map((art, index) => (
                  <div
                    key={index}
                    className="text-xs bg-slate-50 px-2 py-1.5 rounded border border-gray-100"
                  >
                    <div className="font-medium text-slate-800">{art.articulo}</div>
                    <p className="text-[10px] text-slate-500 truncate">
                      {renderValue(art.descripcion)}
                    </p>
                    <div className="text-[10px] text-slate-600 flex flex-wrap gap-x-2 mt-0.5">
                      <span>Cant: {art.cant}</span>
                      <span>Stock: {art.existencia ?? "-"}</span>
                      <span className="font-mono">{art.codint}</span>
                    </div>
                    {(art.presentacion?.trim() || art.provsug || art.codprovsug?.trim()) && (
                      <p className="text-[10px] text-slate-500 truncate mt-0.5">
                        {[
                          art.presentacion?.trim() || null,
                          art.provsug || null,
                          art.codprovsug?.trim() || null,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <span className="text-slate-400 text-xs">—</span>
            )}
          </div>

          <div className="bg-white rounded-lg p-3 border border-gray-200 shadow-sm">
            <DetalleFila label="Observ / mensaje">{renderValue(p.observ)}</DetalleFila>
            <DetalleFila label="Supervisado">
              <span>
                {p.controlado}
                {p.supervisor ? ` / ${p.supervisor}` : ""}
              </span>
            </DetalleFila>
            <DetalleFila label="Comprador">
              <span>
                {renderValue(p.comprador)}
                {p.nota_comprador?.trim() ? (
                  <span className="block text-[10px] text-blue-700 font-semibold mt-0.5">
                    {p.nota_comprador}
                  </span>
                ) : null}
              </span>
            </DetalleFila>
            <DetalleFila label="Aprueba">
              <span>
                {renderValue(p.aprueba)}
                {(p.notas_aprobador || p.nota_aprobador) && (
                  <span className="block text-[10px] text-red-600 mt-0.5">
                    {p.notas_aprobador || p.nota_aprobador}
                  </span>
                )}
              </span>
            </DetalleFila>
            <DetalleFila label="OC">
              <span className="text-orange-600">{renderValue(p.numero_oc)}</span>
            </DetalleFila>
            <DetalleFila label="Prov. selecc.">
              <span className="text-orange-600">{renderValue(p.proveedor_seleccionado)}</span>
            </DetalleFila>
            <DetalleFila label="Confirmado">{formatDate(p.fecha_conf)}</DetalleFila>
            <DetalleFila label="Promesa">{formatDate(p.fecha_prom)}</DetalleFila>
            <DetalleFila label="Entregó">{formatDate(p.fecha_ent)}</DetalleFila>
            <DetalleFila label="Fac">{renderValue(p.fac)}</DetalleFila>
            <DetalleFila label="Rto">{renderValue(p.rto)}</DetalleFila>
          </div>

          <div className="space-y-1.5 bg-white rounded-lg p-3 border border-gray-200 shadow-sm">
            <p className="text-[10px] font-semibold uppercase text-slate-500">Acciones</p>
            <div className="flex flex-col gap-1.5">
              {canEdit && (
                <button
                  type="button"
                  onClick={() => onEdit(p)}
                  className={`${mobileBtnBase} bg-blue-500 text-white hover:bg-blue-600`}
                >
                  Editar
                </button>
              )}
              <button
                type="button"
                onClick={() => onComparativa(p)}
                className={`${mobileBtnBase} bg-green-500 text-white hover:bg-green-600`}
              >
                Comparativa
              </button>
              {canEdit && (
                <button
                  type="button"
                  onClick={() => onDelete(p)}
                  className={`${mobileBtnBase} bg-red-500 text-white hover:bg-red-600`}
                >
                  Eliminar
                </button>
              )}
            </div>
          </div>
        </div>
      </article>
    );
  }

  return (
    <div className="lg:hidden divide-y-2 divide-slate-200">
      <p className="px-3 py-1.5 text-[10px] text-slate-500 bg-slate-50 border-b-2 border-slate-200">
        Tocá un pedido para ver el detalle
      </p>
      {pedidos.map((pedido, index) => (
        <button
          key={pedido.id}
          type="button"
          onClick={() => onSelect(pedido.id)}
          className={`w-full text-left px-3 py-2.5 active:bg-slate-50 touch-manipulation transition-colors ${
            index % 2 === 0 ? "bg-white" : "bg-slate-50/50"
          }`}
        >
          <ResumenPedido pedido={pedido} formatDate={formatDate} renderValue={renderValue} />
        </button>
      ))}
    </div>
  );
}
