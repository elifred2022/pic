"use client";

import React, { useState, useEffect } from "react";
import { ClipboardList, Factory } from "lucide-react";
import PicRealtimeListener from "../realtime/picrealtimelistener";
import PicRealtimeListenerStock from "../realtime/picrealtimelistenerproductivo";
import { ComprasAreaFrame, ComprasFolderList } from "@/components/panels/compras-area-frame";

function ListBiComponenteProduccion() {
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  if (!hasMounted) return null;

  return (
    <ComprasAreaFrame
      hideBack
      width="desk"
      title="¿Qué vas a trabajar hoy?"
      description="Pedidos generales y órdenes de producción."
      tab="PIC"
    >
      <div className="space-y-4 border-b border-[#D3E0E3] p-4 dark:border-[#2C4652]">
        <PicRealtimeListenerStock />
        <PicRealtimeListener />
      </div>
      <ComprasFolderList
        label="Áreas de producción"
        items={[
          {
            href: "/auth/list-panolpedidosgenerales",
            title: "Pedidos generales",
            description: "Administrar pedidos generales del sistema",
            tone: "pedidos",
            icon: <ClipboardList className="h-5 w-5" strokeWidth={1.75} aria-hidden />,
          },
          {
            href: "/auth/ordenes-produccion",
            title: "Órdenes de producción",
            description: "Administrar órdenes de producción",
            tone: "productivos",
            icon: <Factory className="h-5 w-5" strokeWidth={1.75} aria-hidden />,
          },
        ]}
      />
    </ComprasAreaFrame>
  );
}

export default ListBiComponenteProduccion;
