import { Suspense } from "react";
import ListaPedidosProductivosAprob from "@/components/productivos/listapedidosproductivosaprob";
import { ComprasAreaFrame } from "@/components/panels/compras-area-frame";

export default function Page() {
  return (
    <ComprasAreaFrame
      title="Pedidos productivos"
      description="Pedidos productivos para aprobar."
      tab="Productivos"
      width="full"
    >
      <Suspense fallback={<div className="p-6 text-center">Cargando...</div>}>
        <ListaPedidosProductivosAprob />
      </Suspense>
    </ComprasAreaFrame>
  );
}