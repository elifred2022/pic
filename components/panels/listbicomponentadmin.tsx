"use client";

import React, { useState, useEffect } from "react";

import PicRealtimeListenerAdmin from "../realtime/picrealtimelisteneradmin";
import { DashboardModuleCards } from "@/components/panels/dashboard-module-cards";
import { ComprasAreaFrame } from "@/components/panels/compras-area-frame";

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
    <ComprasAreaFrame
      hideBack
      width="desk"
      title="¿Qué vas a trabajar hoy?"
      description="Pedidos generales, productivos y el resto del sistema."
      tab="PIC"
    >
      <div className="border-b border-[#D3E0E3] p-4 dark:border-[#2C4652]">
        <PicRealtimeListenerAdmin />
      </div>
      <DashboardModuleCards />
    </ComprasAreaFrame>
  );
}

export default ListBiComponentAdmin;
