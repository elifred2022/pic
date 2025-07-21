

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ListUs from "@/components/listus";

import ListSupervisor from "@/components/listsupervisor";
import ListConsultas from "@/components/listconsultas";

import ListBiComponentAdmin from "@/components/listbicomponentadmin";
import ListBiComponentAprob from "@/components/listbicomponenteaprob";
import ListBiComponentePanol from "@/components/listbicomponentepanol";



export default async function ProtectedPage() {
  const supabase = await createClient();

  const { data, error } = await supabase.auth.getUser();
  if (error || !data?.user || !data.user.email) {
    redirect("/auth/login");
  }

  const email = data.user.email as string;

  const adminEmails = [
    
    "asistentecompras@perfilesyservicios.com.ar",
      "victor@perfilesyservicios.com.ar",
    
  ];

  const panolesEmails = [
    
    "panol@perfilesyservicios.com.ar",
    "pañolgasconperfilesyservicios.com.ar",
      "elifred21@hotmail.com",

    
  ];

  const aprobEmails = [
    "juanstok@perfilesyservicios.com.ar",
    "julio@perfilesyservicios.com.ar",
    "luciana.ledesma@perfilesyservicios.com.ar",
    "carolina@perfilesyservicios.com.ar",
    "carolina@perfilesyservicios.com.ar",
    "eduardo@perfilesyservicios.com.ar",
    "pedro@perfilesyservicios.com.ar",
    "Sofia sofiastok@perfilesyservicios.com.ar",

     "elifredmason@gmail.com",
    
  ];

   const supervisorEmails = [
    
    "joseluis@perfilesyservicios.com.ar",
     

  ];



    const consultasEmails = [
    
    "gestioncalidad@perfilesyservicios.com.ar",
    "bianca@perfilesyservicios.com.ar",
    "Agustina@perfilesyservicios.com.ar",
      
   
  ];

  let ComponentToRender = <ListUs />;

  if (adminEmails.includes(email)) {
    ComponentToRender =  <ListBiComponentAdmin/>;
  } else if (aprobEmails.includes(email)) {
    ComponentToRender = <ListBiComponentAprob />;
  } else if (consultasEmails.includes(email)) {
    ComponentToRender = <ListConsultas/>
  } else if (supervisorEmails.includes(email)) {
    ComponentToRender = <ListSupervisor/>
  } else if (panolesEmails.includes(email)) {
    ComponentToRender = <ListBiComponentePanol/>
  }

  return (
    <div className="flex-1 w-full flex flex-col gap-12">
      <div className="flex flex-col gap-2 items-start">
        
        {ComponentToRender}
      </div>
    </div>
  );
}
