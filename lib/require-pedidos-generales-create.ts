import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { canCreatePedidosGenerales } from "@/lib/panol-access";
import { fetchUserRolByUuid } from "@/lib/user-rol";

export async function requirePedidosGeneralesCreateAccess() {
  const supabase = await createClient();
  const { data: authData, error } = await supabase.auth.getUser();

  if (error || !authData?.user?.email) {
    redirect("/auth/login");
  }

  const rol = await fetchUserRolByUuid(supabase, authData.user.id);

  if (!canCreatePedidosGenerales(authData.user.email, rol)) {
    redirect("/protected");
  }

  return { supabase, user: authData.user, rol };
}
