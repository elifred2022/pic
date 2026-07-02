"use client";

import { useMemo } from "react";
import { useUserAccess } from "@/hooks/use-user-rol";
import {
  canEditAsAdmin,
  canCreatePedidosGenerales,
  isAdminOrFinanzasEmail,
  isFinanzasEmail,
} from "@/lib/panol-access";

export function useCanEditAsAdmin() {
  const { email, rol, loading } = useUserAccess();

  return useMemo(
    () => ({
      email,
      rol,
      loading,
      canEdit: !loading && canEditAsAdmin(email, rol),
      canCreatePedidosGenerales:
        !loading && canCreatePedidosGenerales(email, rol),
      isFinanzas: !loading && isFinanzasEmail(email, rol),
      canViewAsAdmin: !loading && isAdminOrFinanzasEmail(email, rol),
    }),
    [email, rol, loading],
  );
}
