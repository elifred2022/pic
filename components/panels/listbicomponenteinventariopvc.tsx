"use client";

import { Factory } from "lucide-react";
import { ComprasAreaFrame, ComprasFolderList } from "@/components/panels/compras-area-frame";

function ListBiComponenteInventarioPvc() {
  return (
    <ComprasAreaFrame
      hideBack
      width="desk"
      title="¿Qué vas a trabajar hoy?"
      description="Órdenes de producción, solo para consultar."
      tab="PIC"
    >
      <ComprasFolderList
        label="Órdenes de producción"
        items={[
          {
            href: "/auth/ordenes-produccion",
            title: "Órdenes de producción",
            description: "Ver órdenes de producción",
            tone: "productivos",
            icon: <Factory className="h-5 w-5" strokeWidth={1.75} aria-hidden />,
          },
        ]}
      />
    </ComprasAreaFrame>
  );
}

export default ListBiComponenteInventarioPvc;
