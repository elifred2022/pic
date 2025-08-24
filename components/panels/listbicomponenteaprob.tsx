"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";

import ListAdminVer from "../lists/admin/listadminver";
import ListaPedidosProductivosAprobVista from "../productivos/listapedidosproductivosaprobvista";

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

        {/* Navegación principal con diseño mejorado */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Link
            href="/auth/listaproveedores"
            className="group relative overflow-hidden bg-gradient-to-r from-blue-500 to-blue-600 text-white p-6 rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:scale-105 hover:from-blue-600 hover:to-blue-700"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-blue-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <div className="relative z-10">
              <div className="text-3xl mb-3">🏢</div>
              <h3 className="text-lg font-bold mb-2">Secc. Proveedores</h3>
              <p className="text-blue-100 text-sm">Gestiona proveedores y contactos</p>
            </div>
          </Link>

          <Link
            href="/auth/lista-articulos"
            className="group relative overflow-hidden bg-gradient-to-r from-green-500 to-green-600 text-white p-6 rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:scale-105 hover:from-green-600 hover:to-green-700"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-green-400 to-green-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <div className="relative z-10">
              <div className="text-3xl mb-3">📦</div>
              <h3 className="text-lg font-bold mb-2">Secc. Artículos</h3>
              <p className="text-green-100 text-sm">Administra inventario y productos</p>
            </div>
          </Link>

          <Link
            href="/auth/list-aprobpedidosproductivos"
            className="group relative overflow-hidden bg-gradient-to-r from-purple-500 to-purple-600 text-white p-6 rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:scale-105 hover:from-purple-600 hover:to-purple-700"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-purple-400 to-purple-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <div className="relative z-10">
              <div className="text-3xl mb-3">⚙️</div>
              <h3 className="text-lg font-bold mb-2">Pedidos Productivos</h3>
              <p className="text-purple-100 text-sm">Aprueba pedidos del área productiva</p>
            </div>
          </Link>

          <Link
            href="/auth/list-aprobpedidosgenerales"
            className="group relative overflow-hidden bg-gradient-to-r from-orange-500 to-orange-600 text-white p-6 rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:scale-105 hover:from-orange-600 hover:to-orange-700"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-orange-400 to-orange-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <div className="relative z-10">
              <div className="text-3xl mb-3">📋</div>
              <h3 className="text-lg font-bold mb-2">Pedidos Generales</h3>
              <p className="text-orange-100 text-sm">Aprueba pedidos generales</p>
            </div>
          </Link>
        </div>
      </div>

      {/* Estilos CSS personalizados para animaciones */}
      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .animate-fadeIn {
          animation: fadeIn 0.5s ease-out;
        }
      `}</style>
    </div>
  );
}

export default ListBiComponentAprob;
