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
    <div className="p-4 space-y-4">
      <PicRealtimeListenerAdmin/>
        <div className="flex flex-wrap gap-4 items-center" >
           <Link
              href="/auth/listaproveedores"
              className="inline-block px-4 py-2 mb-4 bg-white text-black font-semibold rounded-md shadow hover:bg-blue-700 transition-colors duration-200"
            >
              Secc. Proveedores
            </Link>

            <Link
              href="/auth/lista-articulos"
              className="inline-block px-4 py-2 mb-4 bg-white text-black font-semibold rounded-md shadow hover:bg-blue-700 transition-colors duration-200"
            >
              Secc. Articulos
            </Link>  
             <Link
              href="/auth/list-adminpedidosproductivos"
              className="inline-block px-4 py-2 mb-4 bg-white text-black font-semibold rounded-md shadow hover:bg-blue-700 transition-colors duration-200"
            >
              Ir a Pedidos productivos
            </Link>

            <Link
              href="/auth/list-adminpedidosgenerales"
              className="inline-block px-4 py-2 mb-4 bg-white text-black font-semibold rounded-md shadow hover:bg-blue-700 transition-colors duration-200"
            >
              Ir a Pedidos generales
            </Link>  

             <Link
              href="/auth/rutaproductivos/lista-pedidosproductivosadmin"
              className="inline-block px-4 py-2 mb-4 bg-white text-black font-semibold rounded-md shadow hover:bg-blue-700 transition-colors duration-200"
            >
              Ir a Pedidos productivos array
            </Link>  

             
       </div>
      <div className="flex gap-4 items-center">
        <label>
          <input
            type="checkbox"
            checked={showListAdminStock}
            onChange={() => setShowListAdminStock(!showListAdminStock)}
          />
          Mostrar pedidos productivos
        </label>

        <label>
          <input
            type="checkbox"
            checked={showListAdmin}
            onChange={() => setShowListAdmin(!showListAdmin)}
          />
          Mostrar pedidos generales
        </label>
      </div>

      <div className="mt-4">
        {showListAdminStock && <ListaPedidosProductivosAprobVista />}
        {showListAdmin && <ListAdminVer />}
      </div>
    </div>
  );
}

export default ListBiComponentAdmin;
