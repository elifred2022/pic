import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ListAdmin from "@/components/listadmin";
import ListUs from "@/components/listus";
import ListAprob from "@/components/listaprob";
import ListSupervisor from "@/components/listsupervisor";
import ListConsultas from "@/components/listconsultas";


export default async function ProtectedPage() {
  const supabase = await createClient();

  const { data, error } = await supabase.auth.getUser();
  if (error || !data?.user || !data.user.email) {
    redirect("/auth/login");
  }

  const email = data.user.email as string;

  const adminEmails = [
    
    "asistentecompras@perfilesyservicios.com.ar",
    
  ];

  const aprobEmails = [
    "juanstok@perfilesyservicios.com.ar",
    "julio@perfilesyservicios.com.ar",
    "luciana.ledesma@perfilesyservicios.com.ar",
    "carolina@perfilesyservicios.com.ar",
    "elifredmason@gmail.com",
    
  ];

   const supervisorEmails = [
    "victor@perfilesyservicios.com.ar",
   "elifred21@hotmail.com",
    
  ];

    const consultasEmails = [
    
    "gestioncalidad@perfilesyservicios.com.ar",
    "bianca@perfilesyservicios.com.ar",
    "Agustina@perfilesyservicios.com.ar",
      
   
  ];

  let ComponentToRender = <ListUs />;

  if (adminEmails.includes(email)) {
    ComponentToRender = <ListAdmin />;
  } else if (aprobEmails.includes(email)) {
    ComponentToRender = <ListAprob />;
  } else if (consultasEmails.includes(email)) {
    ComponentToRender = <ListConsultas/>
  } else if (supervisorEmails.includes(email)) {
    ComponentToRender = <ListSupervisor/>
  }

  return (
    <div className="flex-1 w-full flex flex-col gap-12">
      <div className="flex flex-col gap-2 items-start">
        {ComponentToRender}
      </div>
    </div>
  );
}
