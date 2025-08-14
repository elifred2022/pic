"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import ListPanolProductivoVer from "./listpanolproductivover";
import ListPanolProductosGeneralesVer from "./listpanolproductosgeneralesver";
import PicRealtimeListener from "./picrealtimelistener/picrealtimelistener";
import PicRealtimeListenerStock from "./picrealtimelistener/picrealtimelistenerproductivo";
import ListaPedidosProductivosVista from "./productivos/listapedidosproductivospanolvista";





function ListBiComponentePanol() {
 const [showListAdmin, setShowListAdmin] = useState(true);
   const [showListAdminStock, setShowListAdminStock] = useState(true);
   const [showListaPedidosProductivosVista, setShowListaPedidosProductivosVista] = useState(true);
   const [hasMounted, setHasMounted] = useState(false); // <- NUEVO
 
   // Evitar render hasta que esté montado
   useEffect(() => {
     setHasMounted(true);
 
     const storedAdmin = localStorage.getItem("showListAdmin");
     const storedProductivos = localStorage.getItem("showListaPedidosProductivosVista");
     const storedStock = localStorage.getItem("showListAdminStock"); // ESTA ES LA Q VOY A LEIMINAR 
 
     if (storedAdmin !== null) {
       setShowListAdmin(storedAdmin === "true");
     }

      if (storedProductivos !== null) {
       setShowListaPedidosProductivosVista(storedProductivos === "true");
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
       localStorage.setItem("showListaPedidosProductivosVista", showListaPedidosProductivosVista.toString());
     }
   }, [showListaPedidosProductivosVista, hasMounted]);
 
   useEffect(() => {
     if (hasMounted) {
       localStorage.setItem("showListAdminStock", showListAdminStock.toString());
     }
   }, [showListAdminStock, hasMounted]);
 
   // Mientras no esté montado, no renderizar nada
   if (!hasMounted) return null;

 

  return (
    <div className="p-4 space-y-4">
      <PicRealtimeListenerStock/>
      <PicRealtimeListener/>
        <div className="flex flex-wrap gap-4 items-center" >
           
            <Link
              href="/auth/lista-articulospanol"
              className="inline-block px-4 py-2 mb-4 bg-white text-black font-semibold rounded-md shadow hover:bg-blue-700 transition-colors duration-200"
            >
              Secc. Articulos
            </Link>  
           

            <Link
              href="/auth/list-panolpedidosgenerales"
              className="inline-block px-4 py-2 mb-4 bg-white text-black font-semibold rounded-md shadow hover:bg-blue-700 transition-colors duration-200"
            >
              Ir a Pedidos generales
            </Link>  
              <Link
              href="/auth/rutaproductivos/lista-pedidosproductivos"
              className="inline-block px-4 py-2 mb-4 bg-white text-black font-semibold rounded-md shadow hover:bg-blue-700 transition-colors duration-200"
            >
              Ir a Pedidos productivos
            </Link>  

           
       </div>

        <div className="flex gap-4 items-center">

           <label>
          <input
            type="checkbox"
            checked={showListaPedidosProductivosVista}
            onChange={() => setShowListaPedidosProductivosVista(!showListaPedidosProductivosVista)}
          />
          Mostrar pedidos productivos array
        </label>

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
                 {showListaPedidosProductivosVista && <ListaPedidosProductivosVista/>}
               {showListAdminStock && <ListPanolProductivoVer/>}
               {showListAdmin && <ListPanolProductosGeneralesVer/>}
             </div>
        
   
      
    </div>
  );
}

export default ListBiComponentePanol;
