import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ComprasAreaFrame } from "@/components/panels/compras-area-frame";
import { isPanolEmail } from "@/lib/panol-access";
import { fetchUserRolByUuid } from "@/lib/user-rol";
import ListArticulos from "@/components/lists/listarticulos";

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
    <ComprasAreaFrame
      title="Artículos del almacén"
      description="Inventario y artículos que sigue el pañol."
      tab="Artículos"
      width="full"
    >
      <ListArticulos />
    </ComprasAreaFrame>
  );
}
