import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ListUs from "@/components/lists/listus";
import ListConsultas from "@/components/lists/listconsultas";
import ListBiComponentAdmin from "@/components/panels/listbicomponentadmin";
import ListBiComponentAprob from "@/components/panels/listbicomponenteaprob";
import ListBiComponentePanol from "@/components/panels/listbicomponentepanol";
import ListBiComponenteSupervisor from "@/components/panels/listabicomponentesupervisor";

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

  // ✅ Listas de emails por roles
  const adminEmails = [
    "asistentecompras@perfilesyservicios.com.ar",
    "victor@perfilesyservicios.com.ar",
    "joseluis@perfilesyservicios.com.ar", //usuiario jose luis
    "recepcion@perfilesyservicios.com.ar", // usuario de fatima
  ];



  const panolesEmails = [
    "paniol@perfilesyservicios.com.ar",
    "panolgascon@perfilesyservicios.com.ar",
   "elifred21@hotmail.com",
   "asist.controlstock@perfilesyservicios.com.ar"
  ];

  const aprobEmails = [
    "juanstok@perfilesyservicios.com.ar",
    "julio@perfilesyservicios.com.ar",
    "luciana.ledesma@perfilesyservicios.com.ar",
    "carolina@perfilesyservicios.com.ar",
    "eduardo@perfilesyservicios.com.ar",
    "pedro@perfilesyservicios.com.ar",
    "Sofia sofiastok@perfilesyservicios.com.ar",
    
    "elifredmason@gmail.com",
    
  ];

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
  }

  // ✅ Render dinámico basado en server fetch
  return (
    <div className="flex-1 w-full flex flex-col gap-12">
      <div className="flex flex-col gap-2 items-start">{ComponentToRender}</div>
    </div>
  );
}
