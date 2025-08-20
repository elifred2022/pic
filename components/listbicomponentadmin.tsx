"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";

import ListAdminVer from "./listadminver";
import PicRealtimeListenerAdmin from "./picrealtimelistener/picrealtimelisteneradmin";

import ListaPedidosProductivosAprobVista from "./productivos/listapedidosproductivosaprobvista";

function ListBiComponentAdmin() {
  const [showListAdmin, setShowListAdmin] = useState(true);
  const [showListAdminStock, setShowListAdminStock] = useState(true);
  const [hasMounted, setHasMounted] = useState(false); // <- NUEVO

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
            🎛️ Panel de Administración
          </h1>
          <p className="text-gray-600 text-lg">
            Gestiona pedidos generales, productivos y más desde un solo lugar
          </p>
        </div>

        {/* Componente de tiempo real */}
        <div className="mb-8">
          <PicRealtimeListenerAdmin />
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
              <h3 className="text-lg font-bold mb-2">Sección Proveedores</h3>
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
              <h3 className="text-lg font-bold mb-2">Sección Artículos</h3>
              <p className="text-green-100 text-sm">Administra inventario y productos</p>
            </div>
          </Link>

          <Link
            href="/auth/list-adminpedidosgenerales"
            className="group relative overflow-hidden bg-gradient-to-r from-purple-500 to-purple-600 text-white p-6 rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:scale-105 hover:from-purple-600 hover:to-purple-700"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-purple-400 to-purple-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <div className="relative z-10">
              <div className="text-3xl mb-3">📋</div>
              <h3 className="text-lg font-bold mb-2">Pedidos Generales</h3>
              <p className="text-purple-100 text-sm">Gestiona pedidos generales</p>
            </div>
          </Link>

          <Link
            href="/auth/rutaproductivos/lista-pedidosproductivosadmin"
            className="group relative overflow-hidden bg-gradient-to-r from-orange-500 to-orange-600 text-white p-6 rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:scale-105 hover:from-orange-600 hover:to-orange-700"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-orange-400 to-orange-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <div className="relative z-10">
              <div className="text-3xl mb-3">⚙️</div>
              <h3 className="text-lg font-bold mb-2">Pedidos Productivos</h3>
              <p className="text-orange-100 text-sm">Administra pedidos productivos</p>
            </div>
          </Link>
        </div>

        {/* Controles de visualización con diseño mejorado */}
        <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
          <h3 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
            <span className="mr-2">🎛️</span>
            Controles de Visualización
          </h3>
          <div className="flex flex-wrap gap-6 items-center">
            <label className="flex items-center gap-3 cursor-pointer group">
              <div className="relative">
                <input
                  type="checkbox"
                  checked={showListAdminStock}
                  onChange={() => setShowListAdminStock(!showListAdminStock)}
                  className="sr-only"
                />
                <div className={`w-6 h-6 border-2 rounded-lg transition-all duration-200 ${
                  showListAdminStock 
                    ? 'bg-green-500 border-green-500' 
                    : 'bg-white border-gray-300'
                }`}>
                  {showListAdminStock && (
                    <svg className="w-4 h-4 text-white mx-auto mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>
              </div>
              <span className="text-gray-700 font-medium group-hover:text-green-600 transition-colors duration-200">
                Mostrar Pedidos Productivos
              </span>
            </label>

            <label className="flex items-center gap-3 cursor-pointer group">
              <div className="relative">
                <input
                  type="checkbox"
                  checked={showListAdmin}
                  onChange={() => setShowListAdmin(!showListAdmin)}
                  className="sr-only"
                />
                <div className={`w-6 h-6 border-2 rounded-lg transition-all duration-200 ${
                  showListAdmin 
                    ? 'bg-blue-500 border-blue-500' 
                    : 'bg-white border-gray-300'
                }`}>
                  {showListAdmin && (
                    <svg className="w-4 h-4 text-white mx-auto mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>
              </div>
              <span className="text-gray-700 font-medium group-hover:text-blue-600 transition-colors duration-200">
                Mostrar Pedidos Generales
              </span>
            </label>
          </div>
        </div>
      </div>

      {/* Contenido dinámico con transiciones suaves */}
      <div className="space-y-6">
        {showListAdminStock && (
          <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100 animate-fadeIn">
            <div className="bg-gradient-to-r from-green-500 to-green-600 text-white p-6">
              <h2 className="text-2xl font-bold flex items-center">
                <span className="mr-3">⚙️</span>
                Pedidos Productivos
              </h2>
              <p className="text-green-100 mt-2">Vista de administración de pedidos productivos</p>
            </div>
            <div className="p-6">
              <ListaPedidosProductivosAprobVista />
            </div>
          </div>
        )}

        {showListAdmin && (
          <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100 animate-fadeIn">
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-6">
              <h2 className="text-2xl font-bold flex items-center">
                <span className="mr-3">📋</span>
                Pedidos Generales
              </h2>
              <p className="text-blue-100 mt-2">Vista de administración de pedidos generales</p>
            </div>
            <div className="p-6">
              <ListAdminVer />
            </div>
          </div>
        )}
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

export default ListBiComponentAdmin;
