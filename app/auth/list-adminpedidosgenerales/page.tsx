import { Suspense } from "react";
import ListAdmin from "@/components/lists/admin/listadmin";

export default function Page() {
  return (
    <div className="p-4">
      <Suspense fallback={<div className="p-6 text-center">Cargando...</div>}>
        <ListAdmin />
      </Suspense>
    </div>
  );
}