"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

function ListAdmin() {
  const [pedidos, setPedidos] = useState<any[]>([]);
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
  }, []);

  return (
    <div className="flex-1 w-full overflow-auto p-4">
      <Link
        href="/auth/crear-form"
        className="inline-block px-4 py-2 mb-4 bg-blue-600 text-white font-semibold rounded-md shadow hover:bg-blue-700 transition-colors duration-200"
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
              <td className="px-4 py-2 border">{pedido.created_at || "-"}</td>
              <td className="px-4 py-2 border">{pedido.necesidad}</td>
              <td className="px-4 py-2 border">{pedido.categoria}</td>
              <td className="px-4 py-2 border">{pedido.solicita}</td>
              {/* Agregá más celdas si lo necesitás */}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default ListAdmin;
