import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { canAccessOrdenesProduccion } from "@/lib/panol-access";
import { fetchUserRolByUuid } from "@/lib/user-rol";
import ListOrdenesProduccion from "@/components/lists/panol/listordenesproduccion";
import OrdenesProduccionAlertasRealtimeListener from "@/components/realtime/ordenesproduccionalertasrealtimelistener";
import { ComprasAreaFrame } from "@/components/panels/compras-area-frame";

export default async function Page() {
  const supabase = await createClient();
  const { data: authData, error } = await supabase.auth.getUser();

  if (error || !authData?.user?.email) {
    redirect("/auth/login");
  }

  const rol = await fetchUserRolByUuid(supabase, authData.user.id);

  if (!canAccessOrdenesProduccion(authData.user.email, rol)) {
    redirect("/protected");
  }

  return (
    <ComprasAreaFrame
      title="Órdenes de producción"
      description="Obras, carpetas y avance de producción."
      tab="Producción"
      backHref="/protected"
      backLabel="Volver al panel"
      width="full"
    >
      <OrdenesProduccionAlertasRealtimeListener />
      <ListOrdenesProduccion />
    </ComprasAreaFrame>
  );
}
