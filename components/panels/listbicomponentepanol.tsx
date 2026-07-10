"use client";

import React, { useState, useEffect } from "react";
import PicRealtimeListener from "../realtime/picrealtimelistener";
import PicRealtimeListenerStock from "../realtime/picrealtimelistenerproductivo";
import { DashboardModuleCards } from "@/components/panels/dashboard-module-cards";

function ListBiComponentePanol() {
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  if (!hasMounted) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      <div className="bg-white shadow-2xl border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="text-center">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent mb-4">
              🏭 Panel de Control Panol
            </h1>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Sistema integral de gestión para pedidos generales, productivos y artículos del almacén Panol
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="mb-8 space-y-4">
          <PicRealtimeListenerStock />
          <PicRealtimeListener />
        </div>

        <DashboardModuleCards />
      </div>
    </div>
  );
}

export default ListBiComponentePanol;
