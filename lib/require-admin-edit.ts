import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { canEditAsAdmin } from "@/lib/panol-access";
import { fetchUserRolByUuid } from "@/lib/user-rol";

export async function requireAdminEditAccess() {
  const supabase = await createClient();
  const { data: authData, error } = await supabase.auth.getUser();

  if (error || !authData?.user?.email) {
    redirect("/auth/login");
  }

  const rol = await fetchUserRolByUuid(supabase, authData.user.id);

  if (!canEditAsAdmin(authData.user.email, rol)) {
    redirect("/protected");
  }

  return { supabase, user: authData.user, rol };
}
