import Link from "next/link";
import { redirect } from "next/navigation";
import { Package } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { canAccessConsultas } from "@/lib/panol-access";
import { fetchUserRolByUuid } from "@/lib/user-rol";
import { ConsultaArticulosComprados } from "@/components/consultas/consulta-articulos-comprados";

export default async function ConsultaArticulosCompradosPage() {
  const supabase = await createClient();
  const { data: authData, error } = await supabase.auth.getUser();

  if (error || !authData?.user?.email) {
    redirect("/auth/login");
  }

  const rol = await fetchUserRolByUuid(supabase, authData.user.id);

  if (!canAccessConsultas(authData.user.email, rol)) {
    redirect("/protected");
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-slate-100 p-3 sm:p-4">
      <div className="mb-4">
        <Link
          href="/auth/consultas"
          className="inline-block px-4 sm:px-5 py-2 bg-slate-600 text-white text-sm font-semibold rounded-lg shadow-md hover:bg-slate-700 transition-all duration-200 text-center touch-manipulation"
        >
          Volver a consultas
        </Link>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white shadow-xl overflow-hidden">
        <div className="bg-gradient-to-r from-emerald-500 to-teal-600 px-4 py-3 sm:px-6 sm:py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white/15 ring-1 ring-white/25">
              <Package className="h-5 w-5 text-white" strokeWidth={2} aria-hidden />
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-bold text-white">
                Consulta por artículos
              </h1>
              <p className="text-emerald-100 text-xs mt-0.5">
                Artículos comprados, entregados y pendientes
              </p>
            </div>
          </div>
        </div>

        <ConsultaArticulosComprados />
      </div>
    </div>
  );
}
