import { requireAdminEditAccess } from "@/lib/require-admin-edit";
import { CrearFormOrdenCompra } from "@/components/forms/crear-formordencompra";

export default async function CrearOrdenCompraPage() {
  await requireAdminEditAccess();

  return (
    <div className="flex-1 w-full flex flex-col gap-12">
      <div className="flex flex-col gap-2 items-start">
        <CrearFormOrdenCompra />
      </div>
    </div>
  );
}
