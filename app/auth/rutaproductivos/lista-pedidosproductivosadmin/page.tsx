import { Suspense } from "react";
import ListaPedidosProductivosAdmin from "@/components/productivos/listapedidosproductivosadmin";

export default function Page() {
  return (
    <div className="w-full">
      <Suspense fallback={<div className="p-6 text-center">Cargando...</div>}>
        <ListaPedidosProductivosAdmin />
      </Suspense>
    </div>
  );
}
