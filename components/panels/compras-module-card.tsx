"use client";

import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { ShoppingCart } from "lucide-react";

export type ComprasModuleItem = {
  href: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  linkClassName: string;
};

type ComprasModuleCardProps = {
  items: ComprasModuleItem[];
  title?: string;
  description?: string;
  headerIcon?: LucideIcon;
};

export function ComprasModuleCard({
  items,
  title = "Módulo de Compras",
  description = "Gestión integral de proveedores, artículos, pedidos y órdenes",
  headerIcon: HeaderIcon = ShoppingCart,
}: ComprasModuleCardProps) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white shadow-xl overflow-hidden">
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-8 py-6">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/25">
            <HeaderIcon className="h-7 w-7 text-white" strokeWidth={2} aria-hidden />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white">{title}</h2>
            <p className="text-blue-100 text-sm mt-1">{description}</p>
          </div>
        </div>
      </div>

      <div className="p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`group relative overflow-hidden text-white p-5 rounded-xl shadow-md hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02] ${item.linkClassName}`}
            >
              <div className="relative z-10">
                <div className="mb-3">{item.icon}</div>
                <h3 className="text-base font-bold mb-1">{item.title}</h3>
                <p className="text-white/80 text-xs leading-snug">{item.description}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
