"use client";

import React, { useState, useEffect } from "react";
import PicRealtimeListener from "../realtime/picrealtimelistener";
import PicRealtimeListenerStock from "../realtime/picrealtimelistenerproductivo";
import { DashboardModuleCards } from "@/components/panels/dashboard-module-cards";
import { ComprasAreaFrame } from "@/components/panels/compras-area-frame";

function ListBiComponentePanol() {
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
      description="Pedidos y artículos del almacén."
      tab="PIC"
    >
      <div className="space-y-4 border-b border-[#D3E0E3] p-4 dark:border-[#2C4652]">
        <PicRealtimeListenerStock />
        <PicRealtimeListener />
      </div>
      <DashboardModuleCards />
    </ComprasAreaFrame>
  );
}

export default ListBiComponentePanol;
