"use client";

import type { ReactNode } from "react";

type ArticuloComparativa = {
  codint: string;
  cant: number;
  articulo: string;
  precioUnitario: number | null;
  descuentoPorcentaje: number;
  subtotal: number;
};

type ProveedorComparativa = {
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
};

function estadoBadgeClass(estado: string): string {
  const base = "inline-block px-2.5 py-1 text-xs font-semibold rounded-full";
  if (estado === "anulado") return `${base} bg-red-100 text-red-800`;
  if (estado === "aprobado" || estado === "confirmado") return `${base} bg-green-100 text-green-800`;
  if (estado === "cotizado" || estado === "iniciado") return `${base} bg-yellow-100 text-yellow-800`;
  if (estado === "visto/recibido" || estado === "stand by" || estado === "Presentar presencial") {
    return `${base} bg-orange-100 text-orange-800`;
  }
  if (estado === "cumplido") return `${base} bg-gray-100 text-gray-800`;
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
    <div className="grid grid-cols-2 gap-x-4 gap-y-3">
      <div>
        <span className="text-[10px] font-bold uppercase tracking-wide text-blue-600">PIC</span>
        <p className="text-base font-bold text-gray-900 mt-0.5">#{pedido.id}</p>
      </div>
      <div>
        <span className="text-[10px] font-bold uppercase tracking-wide text-blue-600">Estado</span>
        <p className="mt-1">
          <span className={estadoBadgeClass(pedido.estado)}>{renderValue(pedido.estado)}</span>
        </p>
      </div>
      <div>
        <span className="text-[10px] font-bold uppercase tracking-wide text-blue-600">Fecha solicitud</span>
        <p className="text-sm font-semibold text-gray-800 mt-0.5">{formatDate(pedido.created_at)}</p>
      </div>
      <div>
        <span className="text-[10px] font-bold uppercase tracking-wide text-blue-600">Sector</span>
        <p className="text-sm font-semibold text-gray-800 mt-0.5 break-words">{renderValue(pedido.sector)}</p>
      </div>
      <div className="col-span-2">
        <span className="text-[10px] font-bold uppercase tracking-wide text-blue-600">Solicitante</span>
        <p className="text-sm font-medium text-gray-800 mt-0.5 break-words">{renderValue(pedido.solicita)}</p>
        {pedido.nota_solicitante?.trim() ? (
          <p className="text-xs text-blue-700 font-bold mt-1 break-words">{pedido.nota_solicitante}</p>
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
    <div className="flex justify-between gap-2 py-2 border-b border-gray-100 last:border-0">
      <span className="text-gray-500 shrink-0 text-sm">{label}</span>
      <span className="font-medium text-gray-800 text-right text-sm break-words">{children}</span>
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
}: Props) {
  if (pedidos.length === 0) {
    return (
      <p className="px-4 py-10 text-center text-gray-500 text-sm lg:hidden">
        No hay pedidos productivos registrados.
      </p>
    );
  }

  const selected = selectedId ? pedidos.find((p) => p.id === selectedId) : null;

  if (selected) {
    const p = selected;
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
          <ResumenPedido pedido={p} formatDate={formatDate} renderValue={renderValue} />
        </div>
        <div className="px-4 py-4 space-y-4">
          <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm text-sm space-y-0">
            <DetalleFila label="Fecha necesidad">{formatDate(p.necesidad)}</DetalleFila>
            <DetalleFila label="Categoría">{renderValue(p.categoria)}</DetalleFila>
          </div>

          <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
            <p className="text-xs font-bold uppercase text-gray-500 mb-2">Artículos solicitados</p>
            {p.articulos && p.articulos.length > 0 ? (
              <div className="space-y-2">
                {p.articulos.map((art, index) => (
                  <div key={index} className="text-sm bg-gray-50 p-3 rounded-lg border border-gray-200">
                    <div className="font-medium text-gray-800">{art.articulo}</div>
                    <p className="text-gray-600 text-xs">Desc: {renderValue(art.descripcion)}</p>
                    <p className="text-gray-600">Cant: {art.cant}</p>
                    <p className="text-gray-600">Stock: {art.existencia ?? "-"}</p>
                    <p className="text-gray-600">Prov: {art.provsug || "-"}</p>
                    <p className="text-gray-600 text-xs font-mono bg-gray-100 px-2 py-1 rounded mt-1">
                      Código: {art.codint}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <span className="text-gray-400 text-sm">- Sin artículos -</span>
            )}
          </div>

          <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm text-sm space-y-0">
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
                  <span className="block text-xs text-blue-700 font-bold mt-1">{p.nota_comprador}</span>
                ) : null}
              </span>
            </DetalleFila>
            <DetalleFila label="Aprueba">
              <span>
                {renderValue(p.aprueba)}
                {(p.notas_aprobador || p.nota_aprobador) && (
                  <span className="block text-xs text-red-600 mt-1">
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
            <DetalleFila label="USD">
              ${(Number(p.usd) || 0).toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </DetalleFila>
            <DetalleFila label="EUR">
              €{(Number(p.eur) || 0).toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </DetalleFila>
            <DetalleFila label="ARS sin imp">
              ${(Number(p.ars) || 0).toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </DetalleFila>
            <DetalleFila label="Confirmado">{formatDate(p.fecha_conf)}</DetalleFila>
            <DetalleFila label="Promesa">{formatDate(p.fecha_prom)}</DetalleFila>
            <DetalleFila label="Entregó">{formatDate(p.fecha_ent)}</DetalleFila>
            <DetalleFila label="Fac">{renderValue(p.fac)}</DetalleFila>
            <DetalleFila label="Rto">{renderValue(p.rto)}</DetalleFila>
          </div>

          <div className="space-y-2 bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
            <p className="text-xs font-bold uppercase text-gray-500">Acciones</p>
            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={() => onEdit(p)}
                className={`${mobileBtnBase} bg-blue-500 text-white hover:bg-blue-600`}
              >
                ✏️ Editar
              </button>
              <button
                type="button"
                onClick={() => onComparativa(p)}
                className={`${mobileBtnBase} bg-green-500 text-white hover:bg-green-600`}
              >
                📊 Comparativa
              </button>
              <button
                type="button"
                onClick={() => onDelete(p)}
                className={`${mobileBtnBase} bg-red-500 text-white hover:bg-red-600`}
              >
                🗑️ Eliminar
              </button>
            </div>
          </div>
        </div>
      </article>
    );
  }

  return (
    <div className="lg:hidden divide-y divide-gray-200">
      <p className="px-4 py-2 text-xs text-gray-500 bg-gray-50 border-b border-gray-100">
        Tocá un pedido para ver el detalle
      </p>
      {pedidos.map((pedido) => (
        <button
          key={pedido.id}
          type="button"
          onClick={() => onSelect(pedido.id)}
          className="w-full text-left p-4 bg-white active:bg-blue-50 touch-manipulation transition-colors"
        >
          <ResumenPedido pedido={pedido} formatDate={formatDate} renderValue={renderValue} />
        </button>
      ))}
    </div>
  );
}
