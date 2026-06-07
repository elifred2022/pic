import { Suspense } from "react";
import { ChatApp } from "@/components/chats";

export default function ChatsPage() {
  return (
    <div className="flex-1 w-full flex flex-col gap-6 p-4">
      <Suspense fallback={<div className="p-6 text-center">Cargando chat...</div>}>
        <ChatApp />
      </Suspense>
    </div>
  );
}
