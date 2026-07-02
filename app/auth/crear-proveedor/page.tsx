import { requireAdminEditAccess } from "@/lib/require-admin-edit";
import { CrearFormProveedor } from "@/components/forms/crear-formproveedor";

export default async function Page() {
  await requireAdminEditAccess();

  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        <CrearFormProveedor />
      </div>
    </div>
  );
}
