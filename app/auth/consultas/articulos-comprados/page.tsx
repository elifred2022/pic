import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { canAccessConsultaArticulos } from "@/lib/panol-access";
import { fetchUserRolByUuid } from "@/lib/user-rol";
import { ConsultaArticulosComprados } from "@/components/consultas/consulta-articulos-comprados";
import { ComprasAreaFrame } from "@/components/panels/compras-area-frame";

export default async function ConsultaArticulosCompradosPage() {
  const supabase = await createClient();
  const { data: authData, error } = await supabase.auth.getUser();

  if (error || !authData?.user?.email) {
    redirect("/auth/login");
  }

  const rol = await fetchUserRolByUuid(supabase, authData.user.id);

  if (!canAccessConsultaArticulos(authData.user.email, rol)) {
    redirect("/protected");
  }

  return (
    <ComprasAreaFrame
      title="Consulta por artículos"
      description="Artículos comprados, entregados y pendientes."
      tab="Consultas"
      backHref="/auth/consultas"
      backLabel="Volver a consultas"
      width="full"
    >
      <ConsultaArticulosComprados />
    </ComprasAreaFrame>
  );
}
