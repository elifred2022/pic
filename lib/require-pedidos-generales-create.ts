import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { canCreatePedidosGenerales } from "@/lib/panol-access";

export async function requirePedidosGeneralesCreateAccess() {
  const supabase = await createClient();
  const { data: authData, error } = await supabase.auth.getUser();

  if (error || !authData?.user?.email) {
    redirect("/auth/login");
  }

  const { data: userProfile } = await supabase
    .from("usuarios")
    .select("rol")
    .eq("uuid", authData.user.id)
    .maybeSingle();

  if (!userProfile) {
    redirect("/auth/complete-profile");
  }

  const rol = userProfile.rol ?? null;

  if (!canCreatePedidosGenerales(authData.user.email, rol)) {
    redirect("/protected");
  }

  return { supabase, user: authData.user, rol };
}
