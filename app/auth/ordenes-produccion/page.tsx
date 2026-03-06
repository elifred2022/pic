import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { canAccessOrdenesProduccion } from "@/lib/panol-access";
import ListOrdenesProduccion from "@/components/lists/panol/listordenesproduccion";

export default async function Page() {
  const supabase = await createClient();
  const { data: authData, error } = await supabase.auth.getUser();

  if (error || !authData?.user?.email) {
    redirect("/auth/login");
  }

  if (!canAccessOrdenesProduccion(authData.user.email)) {
    redirect("/protected");
  }

  return (
    <div className="p-4">
      <ListOrdenesProduccion />
    </div>
  );
}
