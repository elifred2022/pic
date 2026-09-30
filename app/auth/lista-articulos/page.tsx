import ListArticulos from "@/components/lists/listarticulos";
import { ComprasAreaFrame } from "@/components/panels/compras-area-frame";

export default function Page() {
  return (
    <ComprasAreaFrame
      title="Artículos"
      description="Catálogo, stock, costos y proveedores."
      tab="Artículos"
      width="full"
    >
      <ListArticulos />
    </ComprasAreaFrame>
  );
}
