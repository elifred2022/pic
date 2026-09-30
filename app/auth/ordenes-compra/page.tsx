import ListaOrdenesCompra from "@/components/lists/listaordenescompra";
import { ComprasAreaFrame } from "@/components/panels/compras-area-frame";

export default function OrdenesCompraPage() {
  return (
    <ComprasAreaFrame
      title="Órdenes de compra"
      description="Altas, seguimiento y recepción."
      tab="Órdenes"
    >
      <ListaOrdenesCompra />
    </ComprasAreaFrame>
  );
}
