import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { canAccessUsuarios } from "@/lib/panol-access";
import { fetchUserRolByUuid } from "@/lib/user-rol";
import ListUsuarios from "@/components/lists/listusuarios";

export default async function Page() {
  const supabase = await createClient();
  const { data: authData, error } = await supabase.auth.getUser();

  if (error || !authData?.user?.email) {
    redirect("/auth/login");
  }

  const rol = await fetchUserRolByUuid(supabase, authData.user.id);

  if (!canAccessUsuarios(authData.user.email, rol)) {
    redirect("/protected");
  }

  return (
    <div className="p-4">
      <ListUsuarios />
    </div>
  );
}
