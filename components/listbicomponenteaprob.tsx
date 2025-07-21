"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import ListAdminStockVer from "./listadminstockver";
import ListAdminVer from "./listadminver";

function ListBiComponentAprob() {
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
              href="/auth/list-aprobpedidosproductivos"
              className="inline-block px-4 py-2 mb-4 bg-white text-black font-semibold rounded-md shadow hover:bg-blue-700 transition-colors duration-200"
            >
              Ir a Pedidos productivos
            </Link>

            <Link
              href="/auth/list-aprobpedidosgenerales"
              className="inline-block px-4 py-2 mb-4 bg-white text-black font-semibold rounded-md shadow hover:bg-blue-700 transition-colors duration-200"
            >
              Ir a Pedidos generales
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
        {showListAdminStock && <ListAdminStockVer />}
        {showListAdmin && <ListAdminVer />}
      </div>
    </div>
  );
}

export default ListBiComponentAprob;
