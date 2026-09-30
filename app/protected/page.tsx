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
import { ComprasAreaFrame } from "@/components/panels/compras-area-frame";
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

  if (soloPedidosGeneralesPorRol(rol) || !hasRolAsignado(rol)) {
    return <PedidosGeneralesHome />;
  }

  if (isAdminRol(rol)) return <ListBiComponentAdmin />;
  if (isFinanzasRol(rol)) return <ListBiComponentFinanzas />;
  if (isAprobRol(rol)) return <ListBiComponentAprob />;
  if (isProduccionRol(rol)) return <ListBiComponenteProduccion />;
  if (isPanolRol(rol)) return <ListBiComponentePanol />;
  if (isTabletRol(rol)) return <ListBiComponenteTablet />;
  if (isInventarioPvcRol(rol)) return <ListBiComponenteInventarioPvc />;

  return <PedidosGeneralesHome />;
}

function PedidosGeneralesHome() {
  return (
    <ComprasAreaFrame
      hideBack
      width="full"
      title="Pedidos generales"
      description="Tus pedidos de compras no productivas."
      tab="PIC"
    >
      <ListUs />
    </ComprasAreaFrame>
  );
}
