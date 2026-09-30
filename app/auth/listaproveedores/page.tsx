import ListProveedores from "@/components/lists/listaproveedores";
import { ComprasAreaFrame } from "@/components/panels/compras-area-frame";

export default function Page() {
  return (
    <ComprasAreaFrame
      title="Proveedores"
      description="Contactos, datos y situación de cada proveedor."
      tab="Proveedores"
    >
      <ListProveedores />
    </ComprasAreaFrame>
  );
}
