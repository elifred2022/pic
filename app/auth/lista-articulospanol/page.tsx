import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isPanolEmail } from "@/lib/panol-access";
import ListArticulosPanol from "@/components/modarticulopanol/listarticulospanol";
import ListArticulos from "@/components/lists/listarticulos";

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
    <div className="p-4">
      
      <ListArticulos />
    </div>
  );
}