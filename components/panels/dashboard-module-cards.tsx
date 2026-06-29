"use client";

import Link from "next/link";
import { Factory, ShoppingCart } from "lucide-react";

type DashboardModuleCardsProps = {
  comprasHref?: string;
  produccionHref?: string;
};

export function DashboardModuleCards({
  comprasHref = "/auth/modulo-compras",
  produccionHref = "/auth/ordenes-produccion",
}: DashboardModuleCardsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <Link
        href={comprasHref}
        className="group relative overflow-hidden rounded-2xl border border-gray-200 bg-gradient-to-br from-slate-700 via-slate-800 to-slate-900 p-8 shadow-xl transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl"
      >
        <div className="flex flex-col items-center text-center">
          <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/25 transition-transform duration-300 group-hover:scale-110">
            <ShoppingCart className="h-10 w-10 text-white" strokeWidth={2} aria-hidden />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Módulo de Compras</h2>
          <p className="text-slate-300 text-sm max-w-xs">
            Proveedores, usuarios, artículos, pedidos y órdenes de compra
          </p>
        </div>
      </Link>

      <Link
        href={produccionHref}
        className="group relative overflow-hidden rounded-2xl border border-gray-200 bg-gradient-to-br from-teal-500 via-teal-600 to-emerald-700 p-8 shadow-xl transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl"
      >
        <div className="flex flex-col items-center text-center">
          <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/25 transition-transform duration-300 group-hover:scale-110">
            <Factory className="h-10 w-10 text-white" strokeWidth={2} aria-hidden />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Órdenes de Producción PVC</h2>
          <p className="text-teal-100 text-sm max-w-xs">
            Administra y visualiza órdenes de producción PVC
          </p>
        </div>
      </Link>
    </div>
  );
}
