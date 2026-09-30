import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { canAccessModuloCompras } from "@/lib/panol-access";
import { fetchUserRolByUuid } from "@/lib/user-rol";
import { IndicadoresComprasDashboard } from "@/components/indicadores/indicadores-compras-dashboard";
import { ComprasAreaFrame } from "@/components/panels/compras-area-frame";

export default async function IndicadoresComprasPage() {
  const supabase = await createClient();
  const { data: authData, error } = await supabase.auth.getUser();

  if (error || !authData?.user?.email) {
    redirect("/auth/login");
  }

  const rol = await fetchUserRolByUuid(supabase, authData.user.id);

  if (!canAccessModuloCompras(authData.user.email, rol)) {
    redirect("/protected");
  }

  return (
    <ComprasAreaFrame
      title="Indicadores de compras"
      description="Métricas y análisis del área de compras."
      tab="Indicadores"
    >
      <IndicadoresComprasDashboard />
    </ComprasAreaFrame>
  );
}
