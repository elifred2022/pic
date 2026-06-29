"use client";

import Link from "next/link";
import { ComprasModuleCard } from "@/components/panels/compras-module-card";
import type { ComprasModuleItem } from "@/components/panels/compras-module-card";

type PanelModuloComprasProps = {
  items: ComprasModuleItem[];
};

export default function PanelModuloCompras({ items }: PanelModuloComprasProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 p-6">
      <div className="mb-6">
        <Link
          href="/protected"
          className="inline-block px-4 sm:px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 transition-all duration-200 text-center touch-manipulation"
        >
          Volver a panel
        </Link>
      </div>

      <ComprasModuleCard
        items={items}
        description="Proveedores, usuarios, artículos, pedidos y órdenes de compra"
      />
    </div>
  );
}
