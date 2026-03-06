"use client";

import React from "react";
import Link from "next/link";

function ListBiComponenteTablet() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 p-6">
      <div className="bg-white rounded-2xl shadow-xl p-8 mb-8 border border-gray-100">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-4">
            📱 Panel Tablet
          </h1>
          <p className="text-gray-600 text-lg">
            Consulta de órdenes de producción
          </p>
        </div>

        <div className="flex justify-center">
          <Link
            href="/auth/ordenes-produccion"
            className="group relative overflow-hidden bg-gradient-to-r from-teal-500 to-teal-600 text-white p-8 rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:scale-105 max-w-sm w-full"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-teal-400 to-teal-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <div className="relative z-10 text-center">
              <div className="text-4xl mb-4">🏭</div>
              <h3 className="text-xl font-bold mb-2">Órdenes de Producción</h3>
              <p className="text-teal-100 text-sm">Ver órdenes de producción</p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}

export default ListBiComponenteTablet;
