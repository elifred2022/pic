"use client";

import type { ReactNode } from "react";

type ArticuloPedido = {
  articulo: string;
  descripcion?: string;
  cant: number;
  cant_exist?: number;
  observacion?: string;
  link?: string;
};

export type PedidoGeneralesMobile = {
  id: string;
  created_at: string;
  necesidad: string;
  categoria: string;
  solicita: string;
  nota_solicitante?: string | null;
  sector: string;
  articulos: ArticuloPedido[];
  notas?: string;
  controlado: string;
  superviso: string;
  estado: string;
  aprueba: string;
  notas_aprobador?: string;
  nota_aprobador?: string;
  oc: number;
  proveedor_selec: string;
  usd: number;
  eur: number;
  tc: number;
  ars: number;
  porcent: number;
  ars_desc: number;
  total_simp: number;
  fecha_conf: string;
  fecha_prom: string;
  fecha_ent: string;
  rto: number;
  fac: number;
  mod_pago: string;
  proceso: string;
  prov_uno: string;
  cost_prov_uno: string | number;
  subt_prov1: number;
  prov_dos: string;
  cost_prov_dos: string | number;
  subt_prov2: number;
  prov_tres: string;
  cost_prov_tres: string | number;
  subt_prov3: number;
  notas_comprador?: string;
  comprador?: string | null;
};

type Props = {
  pedidos: PedidoGeneralesMobile[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onClearSelection: () => void;
  formatDate: (dateString: string | null) => string;
  renderValue: (value: unknown) => string;
  mobileBtnBase: string;
  onInfo: (pedido: PedidoGeneralesMobile) => void;
  onEdit: (pedido: PedidoGeneralesMobile) => void;
  onDelete: (pedido: PedidoGeneralesMobile) => void;
};

function estadoBadgeClass(estado: string): string {
  const base = "inline-block px-2.5 py-1 text-xs font-semibold rounded-full";
  const e = estado.toLowerCase();
  if (e === "anulado") return `${base} bg-red-100 text-red-800`;
  if (e === "aprobado" || e === "confirmado") return `${base} bg-green-100 text-green-800`;
  if (e === "cotizado") return `${base} bg-yellow-100 text-yellow-800`;
  if (e === "stand by" || e === "visto/recibido" || e === "presentar presencial") {
    return `${base} bg-orange-100 text-orange-800`;
  }
  if (e === "cumplido") return `${base} bg-gray-100 text-gray-800`;
  return `${base} bg-gray-100 text-gray-600`;
}

function ResumenPedido({
  pedido,
  formatDate,
  renderValue,
}: {
  pedido: PedidoGeneralesMobile;
  formatDate: (dateString: string | null) => string;
  renderValue: (value: unknown) => string;
}) {
  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-3">
      <div>
        <span className="text-[10px] font-bold uppercase tracking-wide text-blue-600">Nº PIC</span>
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

function DetalleFila({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex justify-between gap-2 py-2 border-b border-gray-100 last:border-0">
      <span className="text-gray-500 shrink-0 text-sm">{label}</span>
      <span className="font-medium text-gray-800 text-right text-sm break-words">{children}</span>
    </div>
  );
}

export default function PedidosGeneralesAdminMobileList({
  pedidos,
  selectedId,
  onSelect,
  onClearSelection,
  formatDate,
  renderValue,
  mobileBtnBase,
  onInfo,
  onEdit,
  onDelete,
}: Props) {
  if (pedidos.length === 0) {
    return (
      <p className="px-4 py-10 text-center text-gray-500 text-sm lg:hidden">
        No hay pedidos generales registrados.
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
            <DetalleFila label="Mod. pago">{renderValue(p.mod_pago)}</DetalleFila>
            <DetalleFila label="Proceso">{renderValue(p.proceso)}</DetalleFila>
          </div>

          <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
            <p className="text-xs font-bold uppercase text-gray-500 mb-2">Artículos solicitados</p>
            {Array.isArray(p.articulos) && p.articulos.length > 0 ? (
              <div className="space-y-2">
                {p.articulos.map((a, idx) => (
                  <div key={idx} className="text-sm bg-gray-50 p-3 rounded-lg border border-gray-200">
                    <p className="font-medium text-gray-800">{a.articulo}</p>
                    <p className="text-gray-600 text-xs">Desc: {renderValue(a.descripcion)}</p>
                    <p className="text-gray-600">Cant: {Number(a.cant) || 0}</p>
                    <p className="text-gray-600">Stock: {Number(a.cant_exist) || 0}</p>
                    <p className="text-gray-600 text-xs">Obs: {renderValue(a.observacion)}</p>
                    {a.link ? (
                      <a
                        href={a.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 underline text-xs mt-1 inline-block"
                      >
                        Ver link
                      </a>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : (
              <span className="text-gray-400 text-sm">Sin artículos</span>
            )}
          </div>

          <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm text-sm space-y-0">
            <DetalleFila label="Supervisado / revisado">
              <span>
                {renderValue(p.controlado)}
                {p.superviso ? ` / ${p.superviso}` : ""}
              </span>
            </DetalleFila>
            <DetalleFila label="Comprador">
              <span>
                {renderValue(p.comprador)}
                {p.notas_comprador?.trim() ? (
                  <span className="block text-xs text-blue-700 font-bold mt-1">{p.notas_comprador}</span>
                ) : null}
              </span>
            </DetalleFila>
            <DetalleFila label="Notas">
              <span className="text-red-600">{renderValue(p.notas)}</span>
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
              <span className="text-orange-600">{p.oc}</span>
            </DetalleFila>
            <DetalleFila label="Proveedor selec.">
              <span className="text-orange-600">{renderValue(p.proveedor_selec)}</span>
            </DetalleFila>
            <DetalleFila label="USD">{p.usd}</DetalleFila>
            <DetalleFila label="EUR">{p.eur}</DetalleFila>
            <DetalleFila label="TC">{p.tc}</DetalleFila>
            <DetalleFila label="ARS sin imp">
              $ {Number(p.ars).toLocaleString("es-AR")}
            </DetalleFila>
            <DetalleFila label="%">{p.porcent}</DetalleFila>
            <DetalleFila label="ARS desc">{p.ars_desc}</DetalleFila>
            <DetalleFila label="Total simp">{p.total_simp}</DetalleFila>
            <DetalleFila label="Fecha confirm">{formatDate(p.fecha_conf)}</DetalleFila>
            <DetalleFila label="Fecha prometida">{formatDate(p.fecha_prom)}</DetalleFila>
            <DetalleFila label="Fecha entrega">{formatDate(p.fecha_ent)}</DetalleFila>
            <DetalleFila label="Rto">{p.rto}</DetalleFila>
            <DetalleFila label="Fact">{p.fac}</DetalleFila>
            <DetalleFila label="Prov. 1">
              {renderValue(p.prov_uno)} — {renderValue(p.cost_prov_uno)} (Subt: {p.subt_prov1})
            </DetalleFila>
            <DetalleFila label="Prov. 2">
              {renderValue(p.prov_dos)} — {renderValue(p.cost_prov_dos)} (Subt: {p.subt_prov2})
            </DetalleFila>
            <DetalleFila label="Prov. 3">
              {renderValue(p.prov_tres)} — {renderValue(p.cost_prov_tres)} (Subt: {p.subt_prov3})
            </DetalleFila>
          </div>

          <div className="space-y-2 bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
            <p className="text-xs font-bold uppercase text-gray-500">Acciones</p>
            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={() => onInfo(p)}
                className={`${mobileBtnBase} bg-indigo-500 text-white hover:bg-indigo-600`}
              >
                📋 Info
              </button>
              <button
                type="button"
                onClick={() => onEdit(p)}
                className={`${mobileBtnBase} bg-blue-500 text-white hover:bg-blue-600`}
              >
                ✏️ Editar
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
