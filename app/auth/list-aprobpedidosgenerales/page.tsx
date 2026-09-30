
import { Suspense } from "react";
import ListAprob from "@/components/lists/approval/listaprob";
import { ComprasAreaFrame } from "@/components/panels/compras-area-frame";

export default function Page() {
  return (
    <ComprasAreaFrame
      title="Pedidos generales"
      description="Pedidos que esperan tu aprobación."
      tab="Pedidos"
      width="full"
    >
      <Suspense fallback={<div className="p-6 text-center">Cargando...</div>}>
        <ListAprob />
      </Suspense>
    </ComprasAreaFrame>
  );
}