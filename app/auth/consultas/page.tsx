import { redirect } from "next/navigation";
import { ComprasAreaFrame } from "@/components/panels/compras-area-frame";
import { createClient } from "@/lib/supabase/server";
import { canAccessConsultas, isPanolEmail } from "@/lib/panol-access";
import { fetchUserRolByUuid } from "@/lib/user-rol";
import {
  consultasModuleItems,
  panolConsultasModuleItems,
} from "@/lib/consultas-module-items";
import PanelModuloConsultas from "@/components/panels/panel-modulo-consultas";

export default async function ConsultasPage() {
  const supabase = await createClient();
  const { data: authData, error } = await supabase.auth.getUser();

  if (error || !authData?.user?.email) {
    redirect("/auth/login");
  }

  const rol = await fetchUserRolByUuid(supabase, authData.user.id);

  if (!canAccessConsultas(authData.user.email, rol)) {
    redirect("/protected");
  }

  const items = isPanolEmail(authData.user.email, rol)
    ? panolConsultasModuleItems
    : consultasModuleItems;

  return (
    <ComprasAreaFrame
      title="Consultas"
      description="Elegí el reporte que necesitás."
      tab="Consultas"
      width="desk"
    >
      <PanelModuloConsultas items={items} />
    </ComprasAreaFrame>
  );
}
