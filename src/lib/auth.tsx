/** Supabase session + Cossa staff/admin role helpers. */
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { Session } from "@supabase/supabase-js";

import { supabase } from "@/integrations/supabase/client";

export function useSession() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data.session ?? null);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next ?? null);
      setLoading(false);
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return { session, loading, user: session?.user ?? null };
}

export type CossaRole = "admin" | "staff";

export interface MemberProfile {
  id: string;
  full_name: string | null;
  business_name: string | null;
  phone: string | null;
}

export function useProfile(userId: string | undefined) {
  return useQuery({
    queryKey: ["profile", userId],
    enabled: Boolean(userId),
    queryFn: async (): Promise<MemberProfile | null> => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, business_name, phone")
        .eq("id", userId as string)
        .maybeSingle();
      if (error) throw error;
      return data ?? null;
    },
  });
}

export function useRoles(userId: string | undefined) {
  return useQuery({
    queryKey: ["user-roles", userId],
    enabled: Boolean(userId),
    queryFn: async (): Promise<CossaRole[]> => {
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId as string);
      if (error) throw error;
      return (data ?? []).map((r) => r.role as CossaRole);
    },
  });
}
