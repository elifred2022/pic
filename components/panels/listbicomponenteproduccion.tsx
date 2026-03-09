"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import PicRealtimeListener from "../realtime/picrealtimelistener";
import PicRealtimeListenerStock from "../realtime/picrealtimelistenerproductivo";

function ListBiComponenteProduccion() {
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
              🏭 Panel de Producción
            </h1>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Gestión de pedidos generales y órdenes de producción
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="mb-8 space-y-4">
          <PicRealtimeListenerStock />
          <PicRealtimeListener />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <Link
            href="/auth/list-panolpedidosgenerales"
            className="group bg-white rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:scale-105 border border-gray-100 overflow-hidden"
          >
            <div className="p-6 text-center">
              <div className="w-16 h-16 bg-gradient-to-r from-green-500 to-green-600 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
                <span className="text-2xl text-white">📋</span>
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-2 group-hover:text-green-600 transition-colors duration-300">
                Pedidos Generales
              </h3>
              <p className="text-gray-600 text-sm">
                Administrar pedidos generales del sistema
              </p>
            </div>
          </Link>

          <Link
            href="/auth/ordenes-produccion"
            className="group bg-white rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:scale-105 border border-gray-100 overflow-hidden"
          >
            <div className="p-6 text-center">
              <div className="w-16 h-16 bg-gradient-to-r from-amber-500 to-orange-600 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
                <span className="text-2xl text-white">🏭</span>
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-2 group-hover:text-amber-600 transition-colors duration-300">
                Órdenes de Producción
              </h3>
              <p className="text-gray-600 text-sm">
                Administrar órdenes de producción
              </p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}

export default ListBiComponenteProduccion;
