import { requireAdminEditAccess } from "@/lib/require-admin-edit";
import FormularioCrearArticulo from "@/components/forms/formulario-creararticulo";

export default async function Page() {
  await requireAdminEditAccess();

  return (
    <div className="min-h-svh w-full bg-muted/30 p-4 md:p-8">
      <div className="mx-auto w-full max-w-4xl">
        <FormularioCrearArticulo />
      </div>
    </div>
  );
}
