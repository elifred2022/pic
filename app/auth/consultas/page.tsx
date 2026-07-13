import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isAdminEmail } from "@/lib/panol-access";
import { fetchUserRolByUuid } from "@/lib/user-rol";
import PanelModuloConsultas from "@/components/panels/panel-modulo-consultas";

export default async function ConsultasPage() {
  const supabase = await createClient();
  const { data: authData, error } = await supabase.auth.getUser();

  if (error || !authData?.user?.email) {
    redirect("/auth/login");
  }

  const rol = await fetchUserRolByUuid(supabase, authData.user.id);

  if (!isAdminEmail(authData.user.email, rol)) {
    redirect("/protected");
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-slate-100 p-6">
      <div className="mb-6">
        <Link
          href="/auth/modulo-compras"
          className="inline-block px-4 sm:px-6 py-3 bg-slate-600 text-white font-semibold rounded-lg shadow-md hover:bg-slate-700 transition-all duration-200 text-center touch-manipulation"
        >
          Volver al módulo de compras
        </Link>
      </div>

      <PanelModuloConsultas />
    </div>
  );
}
