"use client";

import { Search } from "lucide-react";
import { ComprasModuleCard } from "@/components/panels/compras-module-card";
import { consultasModuleItems } from "@/lib/consultas-module-items";

export default function PanelModuloConsultas() {
  return (
    <ComprasModuleCard
      items={consultasModuleItems}
      title="Consultas"
      description="Consultas y reportes del sistema"
      headerIcon={Search}
    />
  );
}
