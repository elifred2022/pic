import { Suspense } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isPanolEmail } from "@/lib/panol-access";
import { fetchUserRolByUuid } from "@/lib/user-rol";
import ListaPedidosProductivos from "@/components/productivos/listapedidosproductivospanol";

export default async function Page() {
  const supabase = await createClient();
  const { data: authData, error } = await supabase.auth.getUser();

  if (error || !authData?.user?.email) {
    redirect("/auth/login");
  }

  const rol = await fetchUserRolByUuid(supabase, authData.user.id);

  if (!isPanolEmail(authData.user.email, rol)) {
    redirect("/protected");
  }

  return (
    <div className="w-full">
      <Suspense fallback={<div className="p-6 text-center">Cargando...</div>}>
        <ListaPedidosProductivos />
      </Suspense>
    </div>
  );
}
