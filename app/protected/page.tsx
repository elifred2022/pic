import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

import ListUs from "@/components/listus";
import ListConsultas from "@/components/listconsultas";
import ListBiComponentAdmin from "@/components/listbicomponentadmin";
import ListBiComponentAprob from "@/components/listbicomponenteaprob";
import ListBiComponentePanol from "@/components/listbicomponentepanol";
import ListBiComponenteSupervisor from "@/components/listabicomponentesupervisor";

export const revalidate = 0; // 🔄 Forzar siempre dinámico (server fetch en cada request)

export default async function ProtectedPage() {
  const supabase = await createClient();

  // ✅ Obtener usuario autenticado desde el server
  const { data: authData, error } = await supabase.auth.getUser();

  if (error || !authData?.user || !authData.user.email) {
    redirect("/auth/login"); // 🔒 Redirección si no hay sesión
  }

  const email = authData.user.email;

  // ✅ Listas de emails por roles
  const adminEmails = [
    "asistentecompras@perfilesyservicios.com.ar",
    "victor@perfilesyservicios.com.ar",
    
  ];

  const panolesEmails = [
    "paniol@perfilesyservicios.com.ar",
    "panolgascon@perfilesyservicios.com.ar",
    "elifred21@hotmail.com",
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

  const supervisorEmails = ["joseluis@perfilesyservicios.com.ar"];

  const consultasEmails = [
   // "gestioncalidad@perfilesyservicios.com.ar",
    "bianca@perfilesyservicios.com.ar",
    "Agustina@perfilesyservicios.com.ar",
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
