"use client";

import React, { useEffect, useState } from "react";
import PicRealtimeListenerAdmin from "../realtime/picrealtimelisteneradmin";
import { DashboardModuleCards } from "@/components/panels/dashboard-module-cards";

function ListBiComponentFinanzas() {
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  if (!hasMounted) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-emerald-50 p-6">
      <div className="bg-white rounded-2xl shadow-xl p-8 mb-8 border border-gray-100">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent mb-4">
            Panel de Finanzas
          </h1>
          <p className="text-gray-600 text-lg">
            Consulta pedidos, órdenes y reportes con acceso de solo lectura
          </p>
        </div>

        <div className="mb-8">
          <PicRealtimeListenerAdmin />
        </div>

        <DashboardModuleCards />
      </div>
    </div>
  );
}

export default ListBiComponentFinanzas;
