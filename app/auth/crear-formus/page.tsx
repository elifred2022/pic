import { requirePedidosGeneralesCreateAccess } from "@/lib/require-pedidos-generales-create";
import CrearFormUs from "@/components/forms/crear-formus";

export default async function Page() {
  await requirePedidosGeneralesCreateAccess();

  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        <CrearFormUs />
      </div>
    </div>
  );
}
