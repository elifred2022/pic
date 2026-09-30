import { Package, ShoppingCart } from "lucide-react";
import type { ComprasModuleItem } from "@/components/panels/compras-module-card";

const consultaArticulosItem: ComprasModuleItem = {
  href: "/auth/consultas/articulos-comprados",
  title: "Consulta por artículos",
  description: "Artículos comprados, entregados y pendientes",
  tone: "articulos",
  icon: <Package className="h-5 w-5" strokeWidth={1.75} aria-hidden />,
};

const consultaOrdenesCompraItem: ComprasModuleItem = {
  href: "/auth/consultas/ordenes-compra",
  title: "Consulta orden de compra",
  description: "Consulta y análisis de órdenes de compra",
  tone: "ordenes",
  icon: <ShoppingCart className="h-5 w-5" strokeWidth={1.75} aria-hidden />,
};

export const consultasModuleItems: ComprasModuleItem[] = [
  consultaArticulosItem,
  consultaOrdenesCompraItem,
];

export const panolConsultasModuleItems: ComprasModuleItem[] = [
  consultaOrdenesCompraItem,
];
