import { Suspense } from "react";
import ListaPedidosProductivosAprob from "@/components/productivos/listapedidosproductivosaprob";

export default function Page() {
  return (
    <div className="p-4">
      <Suspense fallback={<div className="p-6 text-center">Cargando...</div>}>
        <ListaPedidosProductivosAprob />
      </Suspense>
    </div>
  );
}