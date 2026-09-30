"use client";

import { Factory, ShoppingCart } from "lucide-react";
import { ComprasFolderList } from "@/components/panels/compras-area-frame";
import type { ComprasModuleItem } from "@/components/panels/compras-module-card";

type DashboardModuleCardsProps = {
  comprasHref?: string;
  produccionHref?: string;
};

export function DashboardModuleCards({
  comprasHref = "/auth/modulo-compras",
  produccionHref = "/auth/ordenes-produccion",
}: DashboardModuleCardsProps) {
  const items: ComprasModuleItem[] = [
    {
      href: comprasHref,
      title: "Módulo de compras",
      description: "Proveedores, artículos, pedidos y órdenes de compra",
      tone: "ordenes",
      icon: <ShoppingCart className="h-5 w-5" strokeWidth={1.75} aria-hidden />,
    },
    {
      href: produccionHref,
      title: "Órdenes de producción PVC",
      description: "Administrá y consultá las órdenes de producción",
      tone: "productivos",
      icon: <Factory className="h-5 w-5" strokeWidth={1.75} aria-hidden />,
    },
  ];

  return <ComprasFolderList items={items} label="Módulos del panel" />;
}
