
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isPanolEmail } from "@/lib/panol-access";
import ListaPedidosProductivos from "@/components/productivos/listapedidosproductivospanol";


export default async function Page() {
  const supabase = await createClient();
  const { data: authData, error } = await supabase.auth.getUser();

  if (error || !authData?.user?.email) {
    redirect("/auth/login");
  }

  if (!isPanolEmail(authData.user.email)) {
    redirect("/protected");
  }

  return (
    <div className="w-full">
      <div className="w-full">
        <ListaPedidosProductivos/>
      </div>
    </div>
  );
}
