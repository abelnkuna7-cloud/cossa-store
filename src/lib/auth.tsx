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
      syncServerSessionCookie(data.session?.access_token ?? null);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next ?? null);
      syncServerSessionCookie(next?.access_token ?? null);
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
  catalogue_status: "pending" | "approved" | "rejected";
  catalogue_review_notes: string | null;
}

export function useProfile(userId: string | undefined) {
  return useQuery({
    queryKey: ["profile", userId],
    enabled: Boolean(userId),
    queryFn: async (): Promise<MemberProfile | null> => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, business_name, phone, catalogue_status, catalogue_review_notes")
        .eq("id", userId as string)
        .maybeSingle();
      if (error) throw error;
      return (data as unknown as MemberProfile) ?? null;
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

function syncServerSessionCookie(accessToken: string | null) {
  if (typeof document === "undefined") return;
  const base = "Path=/; Max-Age=3600; SameSite=Lax; Secure";
  document.cookie = accessToken
    ? `cossa_store_session=${encodeURIComponent(accessToken)}; ${base}`
    : `cossa_store_session=; ${base}; Max-Age=0`;
}

const COSSA_STORE_ORGANISATION_ID = "00000000-0000-4000-8000-000000000001";

/**
 * Store administration is deliberately separate from being a customer, a
 * catalogue applicant, or a legacy staff-role holder. The database remains
 * the authority; this hook keeps private navigation out of customer screens.
 */
export function useCossaStoreAdminAccess() {
  const { user, loading } = useSession();
  const db = supabase as unknown as { from: (table: string) => any };
  const membership = useQuery({
    queryKey: ["cossa-store-admin", user?.id],
    enabled: Boolean(user?.id),
    retry: false,
    refetchOnMount: "always",
    refetchOnWindowFocus: "always",
    staleTime: 0,
    queryFn: async (): Promise<boolean> => {
      const { data, error } = await db
        .from("organisation_members")
        .select("role")
        .eq("organisation_id", COSSA_STORE_ORGANISATION_ID)
        .eq("user_id", user?.id)
        .eq("status", "active")
        .in("role", ["owner", "admin"])
        .maybeSingle();
      if (error) throw error;
      return Boolean(data);
    },
  });

  return {
    loading: loading || (Boolean(user) && membership.isPending),
    isMember: Boolean(user),
    // Fail closed if membership cannot be read.
    isAdmin: Boolean(user) && !loading && !membership.isError && membership.data === true,
  };
}
