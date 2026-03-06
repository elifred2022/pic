import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { adminEmails, aprobEmails, panolesEmails, tabletEmails } from "@/lib/panol-access";
import ListUs from "@/components/lists/listus";
import ListConsultas from "@/components/lists/listconsultas";
import ListBiComponentAdmin from "@/components/panels/listbicomponentadmin";
import ListBiComponentAprob from "@/components/panels/listbicomponenteaprob";
import ListBiComponentePanol from "@/components/panels/listbicomponentepanol";
import ListBiComponenteSupervisor from "@/components/panels/listabicomponentesupervisor";
import ListBiComponenteTablet from "@/components/panels/listbicomponentetablet";

export const revalidate = 0; // 🔄 Forzar siempre dinámico (server fetch en cada request)

export default async function ProtectedPage() {
  const supabase = await createClient();

  // ✅ Obtener usuario autenticado desde el server
  const { data: authData, error } = await supabase.auth.getUser();

  if (error || !authData?.user || !authData.user.email) {
    redirect("/auth/login"); // 🔒 Redirección si no hay sesión
  }

  const email = authData.user.email;

  // ✅ Verificar si el usuario tiene un perfil completo
  const { data: userProfile, error: profileError } = await supabase
    .from("usuarios")
    .select("id")
    .eq("uuid", authData.user.id)
    .single();

  if (profileError && profileError.code !== "PGRST116") {
    console.error("Error checking user profile:", profileError);
  }

  // Si el usuario no tiene perfil completo, redirigir a completarlo
  if (!userProfile) {
    redirect("/auth/complete-profile");
  }

  // ✅ Listas de emails por roles (desde lib centralizada)

  const supervisorEmails = ["orlandojosemartinez1946@gmail.com"];

  const consultasEmails = [
   // "gestioncalidad@perfilesyservicios.com.ar",
    "biancaccc@perfilesyservicios.com.ar",
    
  ];

  // ✅ Selección de componente según rol
  let ComponentToRender = <ListUs />;

  if (adminEmails.includes(email)) {
    ComponentToRender = <ListBiComponentAdmin />;
  } else if (aprobEmails.includes(email)) {
    ComponentToRender = <ListBiComponentAprob />;
  } else if (consultasEmails.includes(email)) {
    ComponentToRender = <ListConsultas />;
  } else if (supervisorEmails.includes(email)) {
    ComponentToRender = <ListBiComponenteSupervisor />;
  } else if (panolesEmails.includes(email)) {
    ComponentToRender = <ListBiComponentePanol />;
  } else if (tabletEmails.includes(email)) {
    ComponentToRender = <ListBiComponenteTablet />;
  }

  // ✅ Render dinámico basado en server fetch
  return (
    <div className="flex-1 w-full flex flex-col gap-12">
      <div className="flex flex-col gap-2 items-start">{ComponentToRender}</div>
    </div>
  );
}
