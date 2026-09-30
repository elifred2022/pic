import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { canAccessConsultas } from "@/lib/panol-access";
import { fetchUserRolByUuid } from "@/lib/user-rol";
import { ConsultaOrdenesCompra } from "@/components/consultas/consulta-ordenes-compra";
import { ComprasAreaFrame } from "@/components/panels/compras-area-frame";

export default async function ConsultaOrdenesCompraPage() {
  const supabase = await createClient();
  const { data: authData, error } = await supabase.auth.getUser();

  if (error || !authData?.user?.email) {
    redirect("/auth/login");
  }

  const rol = await fetchUserRolByUuid(supabase, authData.user.id);

  if (!canAccessConsultas(authData.user.email, rol)) {
    redirect("/protected");
  }

  return (
    <ComprasAreaFrame
      title="Consulta de órdenes"
      description="Buscá y revisá órdenes de compra."
      tab="Consultas"
      backHref="/auth/consultas"
      backLabel="Volver a consultas"
      width="full"
    >
      <ConsultaOrdenesCompra />
    </ComprasAreaFrame>
  );
}
