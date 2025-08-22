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
            Gestiona y aprueba pedidos internos de compras
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

     

     
    </div>
  );
}

export default ListBiComponentAprob;
