"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { fetchUserRolByUuid } from "@/lib/user-rol";

export function useUserAccess() {
  const [email, setEmail] = useState<string | null>(null);
  const [rol, setRol] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (cancelled) return;

      if (!user) {
        setLoading(false);
        return;
      }

      setEmail(user.email ?? null);
      const userRol = await fetchUserRolByUuid(supabase, user.id);
      if (!cancelled) {
        setRol(userRol);
        setLoading(false);
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [supabase]);

  return { email, rol, loading };
}
