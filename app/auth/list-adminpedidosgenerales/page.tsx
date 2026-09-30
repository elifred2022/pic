import { Suspense } from "react";
import ListAdmin from "@/components/lists/admin/listadmin";
import { ComprasAreaFrame } from "@/components/panels/compras-area-frame";

export default function Page() {
  return (
    <ComprasAreaFrame
      title="Pedidos generales"
      description="Seguimiento de pedidos del área."
      tab="Pedidos"
      width="full"
    >
      <Suspense fallback={<div className="p-6 text-center">Cargando...</div>}>
        <ListAdmin />
      </Suspense>
    </ComprasAreaFrame>
  );
}