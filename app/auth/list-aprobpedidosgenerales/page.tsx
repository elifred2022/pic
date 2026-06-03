
import { Suspense } from "react";
import ListAprob from "@/components/lists/approval/listaprob";

export default function Page() {
  return (
    <div className="p-4">
      <Suspense fallback={<div className="p-6 text-center">Cargando...</div>}>
        <ListAprob />
      </Suspense>
    </div>
  );
}