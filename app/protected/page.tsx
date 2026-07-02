import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  hasRolAsignado,
  isAdminRol,
  isFinanzasRol,
  isAprobRol,
  isPanolRol,
  isProduccionRol,
  isInventarioPvcRol,
  isTabletRol,
  soloPedidosGeneralesPorRol,
} from "@/lib/panol-access";
import ListUs from "@/components/lists/listus";
import ListBiComponentAdmin from "@/components/panels/listbicomponentadmin";
import ListBiComponentFinanzas from "@/components/panels/listbicomponentfinanzas";
import ListBiComponentAprob from "@/components/panels/listbicomponenteaprob";
import ListBiComponentePanol from "@/components/panels/listbicomponentepanol";
import ListBiComponenteProduccion from "@/components/panels/listbicomponenteproduccion";
import ListBiComponenteTablet from "@/components/panels/listbicomponentetablet";
import ListBiComponenteInventarioPvc from "@/components/panels/listbicomponenteinventariopvc";

export const revalidate = 0; // 🔄 Forzar siempre dinámico (server fetch en cada request)

export default async function ProtectedPage() {
  const supabase = await createClient();

  const { data: authData, error } = await supabase.auth.getUser();

  if (error || !authData?.user || !authData.user.email) {
    redirect("/auth/login");
  }

  const { data: userProfile, error: profileError } = await supabase
    .from("usuarios")
    .select("id, rol")
    .eq("uuid", authData.user.id)
    .single();

  if (profileError && profileError.code !== "PGRST116") {
    console.error("Error checking user profile:", profileError);
  }

  if (!userProfile) {
    redirect("/auth/complete-profile");
  }

  const rol = userProfile.rol;

  if (soloPedidosGeneralesPorRol(rol)) {
    return (
      <div className="flex-1 w-full flex flex-col gap-12">
        <div className="flex flex-col gap-2 items-start">
          <ListUs soloPedidosGenerales />
        </div>
      </div>
    );
  }

  let ComponentToRender = <ListUs soloPedidosGenerales />;

  if (hasRolAsignado(rol)) {
    if (isAdminRol(rol)) {
      ComponentToRender = <ListBiComponentAdmin />;
    } else if (isFinanzasRol(rol)) {
      ComponentToRender = <ListBiComponentFinanzas />;
    } else if (isAprobRol(rol)) {
      ComponentToRender = <ListBiComponentAprob />;
    } else if (isProduccionRol(rol)) {
      ComponentToRender = <ListBiComponenteProduccion />;
    } else if (isPanolRol(rol)) {
      ComponentToRender = <ListBiComponentePanol />;
    } else if (isTabletRol(rol)) {
      ComponentToRender = <ListBiComponenteTablet />;
    } else if (isInventarioPvcRol(rol)) {
      ComponentToRender = <ListBiComponenteInventarioPvc />;
    }
  }

  return (
    <div className="flex-1 w-full flex flex-col gap-12">
      <div className="flex flex-col gap-2 items-start">{ComponentToRender}</div>
    </div>
  );
}
