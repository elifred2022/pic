"use client";

import {
  ComprasAreaFrame,
  ComprasFolderList,
} from "@/components/panels/compras-area-frame";
import type { ComprasModuleItem } from "@/components/panels/compras-module-card";

type PanelModuloComprasProps = {
  items: ComprasModuleItem[];
};

function areaCount(count: number) {
  return count === 1 ? "1 área para elegir." : `${count} áreas para elegir.`;
}

export default function PanelModuloCompras({ items }: PanelModuloComprasProps) {
  return (
    <ComprasAreaFrame
      title="¿Qué vas a trabajar hoy?"
      description={`Módulo de compras. ${areaCount(items.length)}`}
      tab="Compras"
      backHref="/protected"
      backLabel="Volver al panel"
      width="desk"
    >
      <ComprasFolderList items={items} label="Áreas del módulo de compras" />
    </ComprasAreaFrame>
  );
}
