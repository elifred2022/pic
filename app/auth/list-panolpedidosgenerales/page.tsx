import { Suspense } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isPanolEmail, isProduccionEmail } from "@/lib/panol-access";
import { fetchUserRolByUuid } from "@/lib/user-rol";
import ListPanolProductosGenerales from "@/components/lists/panol/listpanolproductosgenerales";
import { ComprasAreaFrame } from "@/components/panels/compras-area-frame";

export default async function Page() {
  const supabase = await createClient();
  const { data: authData, error } = await supabase.auth.getUser();

  if (error || !authData?.user?.email) {
    redirect("/auth/login");
  }

  const rol = await fetchUserRolByUuid(supabase, authData.user.id);

  if (
    !isPanolEmail(authData.user.email, rol) &&
    !isProduccionEmail(authData.user.email, rol)
  ) {
    redirect("/protected");
  }

  return (
    <ComprasAreaFrame
      title="Pedidos generales"
      description="Entregas y seguimiento del almacén."
      tab="Pedidos"
      width="full"
    >
      <Suspense fallback={<div className="p-6 text-center">Cargando...</div>}>
        <ListPanolProductosGenerales />
      </Suspense>
    </ComprasAreaFrame>
  );
}
