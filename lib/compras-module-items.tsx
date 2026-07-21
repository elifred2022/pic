import { BarChart3, Search, UserCog } from "lucide-react";
import type { ComprasModuleItem } from "@/components/panels/compras-module-card";

const indicadoresComprasIcon = (
  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/20 ring-1 ring-white/30">
    <BarChart3 className="h-5 w-5 text-white" strokeWidth={2} aria-hidden />
  </div>
);

const indicadoresComprasItem: ComprasModuleItem = {
  href: "/auth/indicadores-compras",
  title: "Indicadores de compras",
  description: "Métricas y análisis del área de compras",
  icon: indicadoresComprasIcon,
  linkClassName:
    "bg-gradient-to-r from-cyan-500 to-teal-600 hover:from-cyan-600 hover:to-teal-700",
};

const consultasItem: ComprasModuleItem = {
  href: "/auth/consultas",
  title: "Consultas",
  description: "Consultas y reportes del sistema",
  icon: (
    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/20 ring-1 ring-white/30">
      <Search className="h-5 w-5 text-white" strokeWidth={2} aria-hidden />
    </div>
  ),
  linkClassName:
    "bg-gradient-to-r from-slate-500 to-slate-700 hover:from-slate-600 hover:to-slate-800",
};

export const adminComprasModuleItems: ComprasModuleItem[] = [
  {
    href: "/auth/listaproveedores",
    title: "Sección Proveedores",
    description: "Gestiona proveedores y contactos",
    icon: <span className="text-2xl">🏢</span>,
    linkClassName:
      "bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700",
  },
  {
    href: "/auth/usuarios",
    title: "Usuarios",
    description: "Consulta usuarios y roles",
    icon: (
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/20 ring-1 ring-white/30">
        <UserCog className="h-5 w-5 text-white" strokeWidth={2} aria-hidden />
      </div>
    ),
    linkClassName:
      "bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700",
  },
  {
    href: "/auth/lista-articulos",
    title: "Sección Artículos",
    description: "Administra inventario y productos",
    icon: <span className="text-2xl">📦</span>,
    linkClassName:
      "bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700",
  },
  {
    href: "/auth/list-adminpedidosgenerales",
    title: "Pedidos Generales",
    description: "Gestiona pedidos generales",
    icon: <span className="text-2xl">📋</span>,
    linkClassName:
      "bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700",
  },
  {
    href: "/auth/rutaproductivos/lista-pedidosproductivosadmin",
    title: "Pedidos Productivos",
    description: "Administra pedidos productivos",
    icon: <span className="text-2xl">⚙️</span>,
    linkClassName:
      "bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700",
  },
  {
    href: "/auth/ordenes-compra",
    title: "Órdenes de Compra",
    description: "Gestiona órdenes de compra",
    icon: <span className="text-2xl">🛒</span>,
    linkClassName:
      "bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700",
  },
  indicadoresComprasItem,
  consultasItem,
];


export const finanzasComprasModuleItems: ComprasModuleItem[] = [
  {
    href: "/auth/listaproveedores",
    title: "Sección Proveedores",
    description: "Consulta proveedores y contactos",
    icon: <span className="text-2xl">🏢</span>,
    linkClassName:
      "bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700",
  },
  {
    href: "/auth/usuarios",
    title: "Usuarios",
    description: "Consulta usuarios y roles",
    icon: (
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/20 ring-1 ring-white/30">
        <UserCog className="h-5 w-5 text-white" strokeWidth={2} aria-hidden />
      </div>
    ),
    linkClassName:
      "bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700",
  },
  {
    href: "/auth/lista-articulos",
    title: "Sección Artículos",
    description: "Consulta inventario y productos",
    icon: <span className="text-2xl">📦</span>,
    linkClassName:
      "bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700",
  },
  {
    href: "/auth/list-adminpedidosgenerales",
    title: "Pedidos Generales",
    description: "Consulta pedidos generales",
    icon: <span className="text-2xl">📋</span>,
    linkClassName:
      "bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700",
  },
  {
    href: "/auth/rutaproductivos/lista-pedidosproductivosadmin",
    title: "Pedidos Productivos",
    description: "Consulta pedidos productivos",
    icon: <span className="text-2xl">⚙️</span>,
    linkClassName:
      "bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700",
  },
  {
    href: "/auth/ordenes-compra",
    title: "Órdenes de Compra",
    description: "Consulta órdenes de compra",
    icon: <span className="text-2xl">🛒</span>,
    linkClassName:
      "bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700",
  },
  indicadoresComprasItem,
  consultasItem,
];

export const panolComprasModuleItems: ComprasModuleItem[] = [
  {
    href: "/auth/lista-articulospanol",
    title: "Sección Artículos",
    description: "Gestionar inventario y artículos del almacén",
    icon: <span className="text-2xl">📦</span>,
    linkClassName:
      "bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700",
  },
  {
    href: "/auth/list-panolpedidosgenerales",
    title: "Pedidos Generales",
    description: "Administrar pedidos generales del sistema",
    icon: <span className="text-2xl">📋</span>,
    linkClassName:
      "bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700",
  },
  {
    href: "/auth/rutaproductivos/lista-pedidosproductivos",
    title: "Pedidos Productivos",
    description: "Gestionar pedidos del área productiva",
    icon: <span className="text-2xl">⚙️</span>,
    linkClassName:
      "bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700",
  },
  {
    href: "/auth/ordenes-compra",
    title: "Órdenes de Recepción",
    description: "Consulta órdenes de recepción",
    icon: <span className="text-2xl">🛒</span>,
    linkClassName:
      "bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700",
  },
];

export const aprobComprasModuleItems: ComprasModuleItem[] = [
  {
    href: "/auth/listaproveedores",
    title: "Sección Proveedores",
    description: "Gestiona proveedores y contactos",
    icon: <span className="text-2xl">🏢</span>,
    linkClassName:
      "bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700",
  },
  {
    href: "/auth/usuarios",
    title: "Usuarios",
    description: "Consulta usuarios y roles",
    icon: (
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/20 ring-1 ring-white/30">
        <UserCog className="h-5 w-5 text-white" strokeWidth={2} aria-hidden />
      </div>
    ),
    linkClassName:
      "bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700",
  },
  {
    href: "/auth/lista-articulos",
    title: "Sección Artículos",
    description: "Administra inventario y productos",
    icon: <span className="text-2xl">📦</span>,
    linkClassName:
      "bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700",
  },
  {
    href: "/auth/list-aprobpedidosgenerales",
    title: "Pedidos Generales",
    description: "Aprueba pedidos generales",
    icon: <span className="text-2xl">📋</span>,
    linkClassName:
      "bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700",
  },
  {
    href: "/auth/list-aprobpedidosproductivos",
    title: "Pedidos Productivos",
    description: "Aprueba pedidos del área productiva",
    icon: <span className="text-2xl">⚙️</span>,
    linkClassName:
      "bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700",
  },
  {
    href: "/auth/ordenes-compra",
    title: "Órdenes de Compra",
    description: "Gestiona órdenes de compra",
    icon: <span className="text-2xl">🛒</span>,
    linkClassName:
      "bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700",
  },
  indicadoresComprasItem,
  consultasItem,
];
