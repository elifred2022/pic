import { Suspense } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isTabletEmail } from "@/lib/panol-access";
import { ChatApp } from "@/components/chats";

export default async function ChatsPage() {
  const supabase = await createClient();
  const { data: authData, error } = await supabase.auth.getUser();

  if (!authData?.user) {
    redirect("/auth/login");
  }

  if (isTabletEmail(authData.user.email)) {
    redirect("/protected");
  }

  return (
    <div className="flex-1 w-full flex flex-col gap-6 p-4">
      <Suspense fallback={<div className="p-6 text-center">Cargando chat...</div>}>
        <ChatApp />
      </Suspense>
    </div>
  );
}
