import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  canAccessModuloCompras,
  isAdminEmail,
  isFinanzasEmail,
} from "@/lib/panol-access";
import { fetchUserRolByUuid } from "@/lib/user-rol";
import {
  adminComprasModuleItems,
  aprobComprasModuleItems,
  finanzasComprasModuleItems,
} from "@/lib/compras-module-items";
import PanelModuloCompras from "@/components/panels/panel-modulo-compras";

export default async function ModuloComprasPage() {
  const supabase = await createClient();
  const { data: authData, error } = await supabase.auth.getUser();

  if (error || !authData?.user?.email) {
    redirect("/auth/login");
  }

  const rol = await fetchUserRolByUuid(supabase, authData.user.id);

  if (!canAccessModuloCompras(authData.user.email, rol)) {
    redirect("/protected");
  }

  const items = isAdminEmail(authData.user.email, rol)
    ? adminComprasModuleItems
    : isFinanzasEmail(authData.user.email, rol)
      ? finanzasComprasModuleItems
      : aprobComprasModuleItems;

  return <PanelModuloCompras items={items} />;
}
