"use client";

import { ComprasFolderList } from "@/components/panels/compras-area-frame";
import type { ComprasModuleItem } from "@/components/panels/compras-module-card";
import { consultasModuleItems } from "@/lib/consultas-module-items";

type PanelModuloConsultasProps = {
  items?: ComprasModuleItem[];
};

export default function PanelModuloConsultas({
  items = consultasModuleItems,
}: PanelModuloConsultasProps) {
  return <ComprasFolderList items={items} label="Consultas disponibles" />;
}
