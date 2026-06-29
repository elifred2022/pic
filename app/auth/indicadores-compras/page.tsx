import Link from "next/link";
import { redirect } from "next/navigation";
import { BarChart3 } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { canAccessModuloCompras } from "@/lib/panol-access";
import { fetchUserRolByUuid } from "@/lib/user-rol";
import { IndicadoresComprasDashboard } from "@/components/indicadores/indicadores-compras-dashboard";

export default async function IndicadoresComprasPage() {
  const supabase = await createClient();
  const { data: authData, error } = await supabase.auth.getUser();

  if (error || !authData?.user?.email) {
    redirect("/auth/login");
  }

  const rol = await fetchUserRolByUuid(supabase, authData.user.id);

  if (!canAccessModuloCompras(authData.user.email, rol)) {
    redirect("/protected");
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-cyan-50 p-6">
      <div className="mb-6">
        <Link
          href="/auth/modulo-compras"
          className="inline-block px-4 sm:px-6 py-3 bg-cyan-600 text-white font-semibold rounded-lg shadow-md hover:bg-cyan-700 transition-all duration-200 text-center touch-manipulation"
        >
          Volver al módulo de compras
        </Link>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white shadow-xl overflow-hidden">
        <div className="bg-gradient-to-r from-cyan-500 to-teal-600 px-8 py-6">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/25">
              <BarChart3 className="h-7 w-7 text-white" strokeWidth={2} aria-hidden />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Indicadores de compras</h1>
              <p className="text-cyan-100 text-sm mt-1">
                Métricas y análisis del área de compras
              </p>
            </div>
          </div>
        </div>

        <IndicadoresComprasDashboard />
      </div>
    </div>
  );
}