import { Package, ShoppingCart } from "lucide-react";
import type { ComprasModuleItem } from "@/components/panels/compras-module-card";

export const consultasModuleItems: ComprasModuleItem[] = [
  {
    href: "/auth/consultas/articulos-comprados",
    title: "Consulta por artículos",
    description: "Artículos comprados, entregados y pendientes",
    icon: (
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/20 ring-1 ring-white/30">
        <Package className="h-5 w-5 text-white" strokeWidth={2} aria-hidden />
      </div>
    ),
    linkClassName:
      "bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700",
  },
  {
    href: "/auth/consultas/ordenes-compra",
    title: "Consulta orden de compra",
    description: "Consulta y análisis de órdenes de compra",
    icon: (
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/20 ring-1 ring-white/30">
        <ShoppingCart className="h-5 w-5 text-white" strokeWidth={2} aria-hidden />
      </div>
    ),
    linkClassName:
      "bg-gradient-to-r from-rose-500 to-red-600 hover:from-rose-600 hover:to-red-700",
  },
];
