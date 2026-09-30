"use client";

import React, { useEffect, useState } from "react";
import PicRealtimeListenerAdmin from "../realtime/picrealtimelisteneradmin";
import { DashboardModuleCards } from "@/components/panels/dashboard-module-cards";
import { ComprasAreaFrame } from "@/components/panels/compras-area-frame";

function ListBiComponentFinanzas() {
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
      description="Consulta pedidos, órdenes y reportes."
      tab="PIC"
    >
      <div className="border-b border-[#D3E0E3] p-4 dark:border-[#2C4652]">
        <PicRealtimeListenerAdmin />
      </div>
      <DashboardModuleCards />
    </ComprasAreaFrame>
  );
}

export default ListBiComponentFinanzas;
