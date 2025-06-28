import React from 'react';

function ListAdmin() {
  return (
    <div className="flex-1 w-full overflow-auto p-4">
      <table className="min-w-full table-auto border border-gray-300 shadow-md rounded-md overflow-hidden">
        <thead className="bg-gray-100 text-gray-700">
          <tr>
            <th className="px-4 py-2 border">Nº PIC</th>
            <th className="px-4 py-2 border">FECHA</th>
            <th className="px-4 py-2 border">SOLICITA</th>
            <th className="px-4 py-2 border">SECTOR</th>
            <th className="px-4 py-2 border">COD CTA</th>
            <th className="px-4 py-2 border">CANT SOL</th>
            <th className="px-4 py-2 border">CANT EXIST</th>
            <th className="px-4 py-2 border">FECHA NEC</th>
            <th className="px-4 py-2 border">ARTICULO</th>
            <th className="px-4 py-2 border">DESCRIPCIÓN</th>
            <th className="px-4 py-2 border">ESTADO</th>
            <th className="px-4 py-2 border">OC</th>
            <th className="px-4 py-2 border">PROVEEDOR</th>
          </tr>
        </thead>
        <tbody>
          {/* Aquí puedes mapear tus datos */}
          <tr className="cursor-pointer">
            <td className="px-4 py-2 border">123</td>
            <td className="px-4 py-2 border">2025-06-28</td>
            <td className="px-4 py-2 border">Juan Pérez</td>
            <td className="px-4 py-2 border">Obras</td>
            <td className="px-4 py-2 border">00123</td>
            <td className="px-4 py-2 border">5</td>
            <td className="px-4 py-2 border">12</td>
            <td className="px-4 py-2 border">2025-07-01</td>
            <td className="px-4 py-2 border">A101</td>
            <td className="px-4 py-2 border">Tornillo M8x40</td>
            <td className="px-4 py-2 border text-green-600 font-semibold">Aprobado</td>
            <td className="px-4 py-2 border">OC-556</td>
            <td className="px-4 py-2 border">Ferretería SRL</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

export default ListAdmin;
