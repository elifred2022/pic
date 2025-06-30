"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

function ListAdmin() {

  type Pedido = {
  id: string;
  created_at: string;
  necesidad: string;
  categoria: string;
  solicita: string;
  sector: string;
  cc: number;
  cant: number;
  cant_exist: number;
  articulo: string;
  descripcion: string;
  estado: string;
  oc: number;
  proveedor: string;
  usd: number;
  eur: number;
  tc: number;
  ars: number;
  porcent: number;
  ars_desc: number;
  total_simp: number;
  fecha_conf: string;
  fecha_prom: string;
  fecha_ent: string;
  rto: number;
  fac: number;
  mod_pago: string;
  proceso: string;
  // Agregá más campos si los usás en el .map()
};
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const supabase = createClient();

  useEffect(() => {
    const fetchPedidos = async () => {
      const { data, error } = await supabase.from("pic").select("*");
      if (error) {
        console.error("Error al traer los pedidos:", error);
      } else {
        setPedidos(data);
      }
    };

    fetchPedidos();
  }, [supabase]);

 function formatDate(dateString: string | null): string {
  if (!dateString) return "-";
  const date = new Date(dateString);
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0"); // Los meses van de 0 a 11
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}



  return (
    <div className="flex-1 w-full overflow-auto p-4">
      <Link
        href="/auth/crear-form"
        className="inline-block px-4 py-2 mb-4 bg-white text-black font-semibold rounded-md shadow hover:bg-blue-700 transition-colors duration-200"
      >
        Nuevo pedido
      </Link>

      <h1 className="text-xl font-semibold mb-4">Sus pedidos</h1>

      <table className="min-w-full table-auto border border-gray-300 shadow-md rounded-md overflow-hidden">
        <thead className="bg-gray-100 text-gray-700">
          <tr>
            <th className="px-4 py-2 border">Nº PIC</th>
            <th className="px-4 py-2 border">FECHA SOL</th>
            <th className="px-4 py-2 border">FECHA NECESIDAD</th>
            <th className="px-4 py-2 border">CATEGORIA</th>
            <th className="px-4 py-2 border">SOLICITA</th>
            <th className="px-4 py-2 border">SECTOR</th>
            <th className="px-4 py-2 border">COD CTA</th>
            <th className="px-4 py-2 border">CANT SOL</th>
            <th className="px-4 py-2 border">CANT EXIST</th>
            <th className="px-4 py-2 border">ARTICULO</th>
            <th className="px-4 py-2 border">DESCRIPCIÓN</th>
            <th className="px-4 py-2 border">ESTADO</th>
            <th className="px-4 py-2 border">OC</th>
            <th className="px-4 py-2 border">PROVEEDOR</th>
            <th className="px-4 py-2 border">USD</th>
            <th className="px-4 py-2 border">EUR</th>
            <th className="px-4 py-2 border">T.C</th>
            <th className="px-4 py-2 border">ARS</th>
            <th className="px-4 py-2 border">% DESC</th>
            <th className="px-4 py-2 border">ARS CON DESC</th>
            <th className="px-4 py-2 border">TOTAL SIN IMP</th>
            <th className="px-4 py-2 border">FECHA CONFIRMADA</th>
            <th className="px-4 py-2 border">FECHA PROMETIDA</th>
            <th className="px-4 py-2 border">FECHA ENTREGADA</th>
            <th className="px-4 py-2 border">REMITO</th>
            <th className="px-4 py-2 border">FACTURA</th>
            <th className="px-4 py-2 border">MOD DE PAGO</th>
            <th className="px-4 py-2 border">PROCESO</th>
          </tr>
        </thead>
        <tbody>
          {pedidos.map((pedido) => (
            <tr key={pedido.id} className="cursor-pointer ">
              <td className="px-4 py-2 border">{pedido.id}</td>
              <td className="px-4 py-2 border">{formatDate(pedido.created_at) || "-"}</td>
              <td className="px-4 py-2 border">{formatDate(pedido.necesidad)}</td>
              <td className="px-4 py-2 border">{pedido.categoria}</td>
              <td className="px-4 py-2 border">{pedido.solicita}</td>
              <td className="px-4 py-2 border">{pedido.sector}</td>
              <td className="px-4 py-2 border">{pedido.cc}</td>
              <td className="px-4 py-2 border">{pedido.cant}</td>
              <td className="px-4 py-2 border">{pedido.cant_exist}</td>
              <td className="px-4 py-2 border">{pedido.articulo}</td>
              <td className="px-4 py-2 border">{pedido.descripcion}</td>
              <td className="px-4 py-2 border">{pedido.estado}</td>
              <td className="px-4 py-2 border">{pedido.oc}</td>
              <td className="px-4 py-2 border">{pedido.proveedor}</td>
              <td className="px-4 py-2 border">{pedido.usd}</td>
              <td className="px-4 py-2 border">{pedido.eur}</td>
              <td className="px-4 py-2 border">{pedido.tc}</td>
              <td className="px-4 py-2 border">{pedido.ars}</td>
              <td className="px-4 py-2 border">{pedido.porcent}</td>
              <td className="px-4 py-2 border">{pedido.ars_desc}</td>
              <td className="px-4 py-2 border">{pedido.total_simp}</td>
              <td className="px-4 py-2 border">{formatDate(pedido.fecha_conf)}</td>
              <td className="px-4 py-2 border">{formatDate(pedido.fecha_prom)}</td>
              <td className="px-4 py-2 border">{formatDate(pedido.fecha_ent)}</td>
              <td className="px-4 py-2 border">{pedido.rto}</td>
              <td className="px-4 py-2 border">{pedido.fac}</td>
              <td className="px-4 py-2 border">{pedido.mod_pago}</td>
              <td className="px-4 py-2 border">{pedido.proceso}</td>
              {/* Agregá más celdas si lo necesitás */}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default ListAdmin;
