"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";

import ListAdminVer from "./listadminver";
import ListaPedidosProductivosAprobVista from "./productivos/listapedidosproductivosaprobvista";

function ListBiComponentAprob() {
  const [showListAdmin, setShowListAdmin] = useState(true);
  const [showListAdminStock, setShowListAdminStock] = useState(true);
  const [hasMounted, setHasMounted] = useState(false);

  // Evitar render hasta que esté montado
  useEffect(() => {
    setHasMounted(true);

    const storedAdmin = localStorage.getItem("showListAdmin");
    const storedStock = localStorage.getItem("showListAdminStock");

    if (storedAdmin !== null) {
      setShowListAdmin(storedAdmin === "true");
    }

    if (storedStock !== null) {
      setShowListAdminStock(storedStock === "true");
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
      localStorage.setItem("showListAdminStock", showListAdminStock.toString());
    }
  }, [showListAdminStock, hasMounted]);

  // Mientras no esté montado, no renderizar nada
  if (!hasMounted) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 p-6">
      {/* Header principal con título */}
      <div className="bg-white rounded-2xl shadow-xl p-8 mb-8 border border-gray-100">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-4">
            📋 Panel de Aprobación
          </h1>
          <p className="text-gray-600 text-lg">
            Gestiona y aprueba pedidos desde un solo lugar centralizado
          </p>
        </div>

        {/* Navegación principal */}
        <div className="flex flex-wrap gap-4 items-center justify-center mb-6">
          <Link
            href="/auth/listaproveedores"
            className="inline-block px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 transition-all duration-200 transform hover:scale-105"
          >
            🏢 Secc. Proveedores
          </Link>

          <Link
            href="/auth/lista-articulos"
            className="inline-block px-6 py-3 bg-green-600 text-white font-semibold rounded-lg shadow-md hover:bg-green-700 transition-all duration-200 transform hover:scale-105"
          >
            📦 Secc. Artículos
          </Link>

          <Link
            href="/auth/list-aprobpedidosproductivos"
            className="inline-block px-6 py-3 bg-purple-600 text-white font-semibold rounded-lg shadow-md hover:bg-purple-700 transition-all duration-200 transform hover:scale-105"
          >
            ⚙️ Pedidos Productivos
          </Link>

          <Link
            href="/auth/list-aprobpedidosgenerales"
            className="inline-block px-6 py-3 bg-orange-600 text-white font-semibold rounded-lg shadow-md hover:bg-orange-700 transition-all duration-200 transform hover:scale-105"
          >
            📋 Pedidos Generales
          </Link>
        </div>
      </div>

      {/* Controles de visualización */}
      <div className="bg-white rounded-2xl shadow-xl p-6 mb-8 border border-gray-100">
        <h3 className="text-xl font-semibold text-gray-800 mb-4 text-center">
          🎛️ Controles de Visualización
        </h3>
        <div className="flex flex-wrap gap-6 items-center justify-center">
          <label className="flex items-center gap-3 cursor-pointer hover:bg-gray-50 p-3 rounded-lg transition-colors duration-200">
            <input
              type="checkbox"
              checked={showListAdminStock}
              onChange={() => setShowListAdminStock(!showListAdminStock)}
              className="w-5 h-5 text-purple-600 rounded focus:ring-purple-500"
            />
            <span className="text-gray-700 font-medium">Mostrar pedidos productivos</span>
          </label>

          <label className="flex items-center gap-3 cursor-pointer hover:bg-gray-50 p-3 rounded-lg transition-colors duration-200">
            <input
              type="checkbox"
              checked={showListAdmin}
              onChange={() => setShowListAdmin(!showListAdmin)}
              className="w-5 h-5 text-orange-600 rounded focus:ring-orange-500"
            />
            <span className="text-gray-700 font-medium">Mostrar pedidos generales</span>
          </label>
        </div>
      </div>

      {/* Contenido dinámico */}
      <div className="space-y-8">
        {showListAdminStock && (
          <div className="bg-white rounded-2xl shadow-xl p-6 border border-gray-100">
            <h3 className="text-2xl font-bold text-purple-600 mb-4 flex items-center">
              <span className="mr-2">⚙️</span>
              Pedidos Productivos
            </h3>
            <ListaPedidosProductivosAprobVista />
          </div>
        )}
        
        {showListAdmin && (
          <div className="bg-white rounded-2xl shadow-xl p-6 border border-gray-100">
            <h3 className="text-2xl font-bold text-orange-600 mb-4 flex items-center">
              <span className="mr-2">📋</span>
              Pedidos Generales
            </h3>
            <ListAdminVer />
          </div>
        )}
      </div>
    </div>
  );
}

export default ListBiComponentAprob;
