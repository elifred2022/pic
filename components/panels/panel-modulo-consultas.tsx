"use client";

import { Search } from "lucide-react";
import { ComprasModuleCard } from "@/components/panels/compras-module-card";
import type { ComprasModuleItem } from "@/components/panels/compras-module-card";
import { consultasModuleItems } from "@/lib/consultas-module-items";

type PanelModuloConsultasProps = {
  items?: ComprasModuleItem[];
};

export default function PanelModuloConsultas({
  items = consultasModuleItems,
}: PanelModuloConsultasProps) {
  return (
    <ComprasModuleCard
      items={items}
      title="Consultas"
      description="Consultas y reportes del sistema"
      headerIcon={Search}
    />
  );
}
