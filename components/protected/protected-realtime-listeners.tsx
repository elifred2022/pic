"use client";

import PicRealtimeListener from "@/components/realtime/picrealtimelistener";
import PedidosProductivosRealtimeListener from "@/components/realtime/pedidosproductivosrealtimelistener";
import OrdenesProduccionAlertasRealtimeListener from "@/components/realtime/ordenesproduccionalertasrealtimelistener";
import { useUserAccess } from "@/hooks/use-user-rol";
import { soloPedidosGeneralesPorRol } from "@/lib/panol-access";

export default function ProtectedRealtimeListeners() {
  const { rol, loading } = useUserAccess();

  if (loading) return null;

  if (soloPedidosGeneralesPorRol(rol)) {
    return <PicRealtimeListener />;
  }

  return (
    <>
      <PicRealtimeListener />
      <PedidosProductivosRealtimeListener />
      <OrdenesProduccionAlertasRealtimeListener />
    </>
  );
}
