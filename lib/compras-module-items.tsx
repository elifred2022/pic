import {
  BarChart3,
  Building2,
  ClipboardList,
  Cog,
  Package,
  Search,
  ShoppingCart,
  UserCog,
  type LucideIcon,
} from "lucide-react";
import type {
  ComprasAreaTone,
  ComprasModuleItem,
} from "@/components/panels/compras-module-card";

function glyph(Icon: LucideIcon) {
  return <Icon className="h-5 w-5" strokeWidth={1.75} aria-hidden />;
}

function area(
  href: string,
  title: string,
  description: string,
  tone: ComprasAreaTone,
  Icon: LucideIcon,
): ComprasModuleItem {
  return { href, title, description, tone, icon: glyph(Icon) };
}

const indicadoresComprasItem = area(
  "/auth/indicadores-compras",
  "Indicadores de compras",
  "Métricas y análisis del área de compras",
  "indicadores",
  BarChart3,
);

const consultasItem = area(
  "/auth/consultas",
  "Consultas",
  "Consultas y reportes del sistema",
  "consultas",
  Search,
);

export const adminComprasModuleItems: ComprasModuleItem[] = [
  area(
    "/auth/listaproveedores",
    "Sección Proveedores",
    "Gestiona proveedores y contactos",
    "proveedores",
    Building2,
  ),
  area(
    "/auth/usuarios",
    "Usuarios",
    "Consulta usuarios y roles",
    "usuarios",
    UserCog,
  ),
  area(
    "/auth/lista-articulos",
    "Sección Artículos",
    "Administra inventario y productos",
    "articulos",
    Package,
  ),
  area(
    "/auth/list-adminpedidosgenerales",
    "Pedidos Generales",
    "Gestiona pedidos generales",
    "pedidos",
    ClipboardList,
  ),
  area(
    "/auth/rutaproductivos/lista-pedidosproductivosadmin",
    "Pedidos Productivos",
    "Administra pedidos productivos",
    "productivos",
    Cog,
  ),
  area(
    "/auth/ordenes-compra",
    "Órdenes de Compra",
    "Gestiona órdenes de compra",
    "ordenes",
    ShoppingCart,
  ),
  indicadoresComprasItem,
  consultasItem,
];

export const finanzasComprasModuleItems: ComprasModuleItem[] = [
  area(
    "/auth/listaproveedores",
    "Sección Proveedores",
    "Consulta proveedores y contactos",
    "proveedores",
    Building2,
  ),
  area(
    "/auth/usuarios",
    "Usuarios",
    "Consulta usuarios y roles",
    "usuarios",
    UserCog,
  ),
  area(
    "/auth/lista-articulos",
    "Sección Artículos",
    "Consulta inventario y productos",
    "articulos",
    Package,
  ),
  area(
    "/auth/list-adminpedidosgenerales",
    "Pedidos Generales",
    "Consulta pedidos generales",
    "pedidos",
    ClipboardList,
  ),
  area(
    "/auth/rutaproductivos/lista-pedidosproductivosadmin",
    "Pedidos Productivos",
    "Consulta pedidos productivos",
    "productivos",
    Cog,
  ),
  area(
    "/auth/ordenes-compra",
    "Órdenes de Compra",
    "Consulta órdenes de compra",
    "ordenes",
    ShoppingCart,
  ),
  indicadoresComprasItem,
  consultasItem,
];

export const panolComprasModuleItems: ComprasModuleItem[] = [
  area(
    "/auth/lista-articulospanol",
    "Sección Artículos",
    "Gestionar inventario y artículos del almacén",
    "articulos",
    Package,
  ),
  area(
    "/auth/list-panolpedidosgenerales",
    "Pedidos Generales",
    "Administrar pedidos generales del sistema",
    "pedidos",
    ClipboardList,
  ),
  area(
    "/auth/rutaproductivos/lista-pedidosproductivos",
    "Pedidos Productivos",
    "Gestionar pedidos del área productiva",
    "productivos",
    Cog,
  ),
  area(
    "/auth/ordenes-compra",
    "Órdenes de Recepción",
    "Consulta órdenes de recepción",
    "ordenes",
    ShoppingCart,
  ),
  consultasItem,
];

export const aprobComprasModuleItems: ComprasModuleItem[] = [
  area(
    "/auth/listaproveedores",
    "Sección Proveedores",
    "Gestiona proveedores y contactos",
    "proveedores",
    Building2,
  ),
  area(
    "/auth/usuarios",
    "Usuarios",
    "Consulta y edita usuarios y roles",
    "usuarios",
    UserCog,
  ),
  area(
    "/auth/lista-articulos",
    "Sección Artículos",
    "Administra inventario y productos",
    "articulos",
    Package,
  ),
  area(
    "/auth/list-aprobpedidosgenerales",
    "Pedidos Generales",
    "Aprueba pedidos generales",
    "pedidos",
    ClipboardList,
  ),
  area(
    "/auth/list-aprobpedidosproductivos",
    "Pedidos Productivos",
    "Aprueba pedidos del área productiva",
    "productivos",
    Cog,
  ),
  area(
    "/auth/ordenes-compra",
    "Órdenes de Compra",
    "Gestiona órdenes de compra",
    "ordenes",
    ShoppingCart,
  ),
  indicadoresComprasItem,
  consultasItem,
];
