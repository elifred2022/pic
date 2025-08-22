"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import ListPanolProductosGeneralesVer from "./listpanolproductosgeneralesver";
import PicRealtimeListener from "./picrealtimelistener/picrealtimelistener";
import PicRealtimeListenerStock from "./picrealtimelistener/picrealtimelistenerproductivo";
import ListaPedidosProductivosVista from "./productivos/listapedidosproductivospanolvista";

function ListBiComponentePanol() {
  const [showListAdmin, setShowListAdmin] = useState(true);
  const [showListaPedidosProductivosVista, setShowListaPedidosProductivosVista] = useState(true);
  const [hasMounted, setHasMounted] = useState(false);

  // Evitar render hasta que esté montado
  useEffect(() => {
    setHasMounted(true);

    const storedAdmin = localStorage.getItem("showListAdmin");
    const storedProductivos = localStorage.getItem("showListaPedidosProductivosVista");

    if (storedAdmin !== null) {
      setShowListAdmin(storedAdmin === "true");
    }

    if (storedProductivos !== null) {
      setShowListaPedidosProductivosVista(storedProductivos === "true");
    }
  }, []);

  // Guardar cambios en localStorage
  useEffect(() => {
    if (hasMounted) {
      localStorage.setItem("showListAdmin", showListAdmin.toString());
    }
  }, [showListAdmin, hasMounted]);

  useEffect(() => {
    if (hasMounted) {
      localStorage.setItem("showListaPedidosProductivosVista", showListaPedidosProductivosVista.toString());
    }
  }, [showListaPedidosProductivosVista, hasMounted]);

  // Mientras no esté montado, no renderizar nada
  if (!hasMounted) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      {/* Header principal con título elegante */}
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
        {/* Componentes de tiempo real */}
        <div className="mb-8 space-y-4">
          <PicRealtimeListenerStock />
          <PicRealtimeListener />
        </div>

        {/* Navegación principal con tarjetas interactivas */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Link
            href="/auth/lista-articulospanol"
            className="group bg-white rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:scale-105 border border-gray-100 overflow-hidden"
          >
            <div className="p-6 text-center">
              <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
                <span className="text-2xl text-white">📦</span>
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-2 group-hover:text-blue-600 transition-colors duration-300">
                Sección Artículos
              </h3>
              <p className="text-gray-600 text-sm">
                Gestionar inventario y artículos del almacén
              </p>
            </div>
          </Link>

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
            href="/auth/rutaproductivos/lista-pedidosproductivos"
            className="group bg-white rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:scale-105 border border-gray-100 overflow-hidden"
          >
            <div className="p-6 text-center">
              <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
                <span className="text-2xl text-white">⚙️</span>
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-2 group-hover:text-purple-600 transition-colors duration-300">
                Pedidos Productivos
              </h3>
              <p className="text-gray-600 text-sm">
                Gestionar pedidos del área productiva
              </p>
            </div>
          </Link>
        </div>

       

       
      </div>
    </div>
  );
}

export default ListBiComponentePanol;