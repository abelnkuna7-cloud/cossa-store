import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";

import { EmptyBlock, LoadingBlock } from "@/components/common/StateBlocks";
import { Button } from "@/components/ui/button";
import { useRoles, useSession } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";

export function useCatalogueAccess() {
  const { user, loading } = useSession();
  const roles = useRoles(user?.id);
  const list = roles.data ?? [];
  return {
    loading: loading || roles.isPending,
    isStaff: list.includes("staff") || list.includes("admin"),
    isAdmin: list.includes("admin"),
    isMember: Boolean(user),
    email: user?.email ?? null,
  };
}

export function CatalogueShell({
  title,
  description,
  actions,
  children,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  const access = useCatalogueAccess();

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4 border-b border-border pb-6">
        <div>
          <p className="text-xs uppercase tracking-widest text-muted-foreground">
            Cossa internal · Catalogue
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h1>
          {description ? (
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{description}</p>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {actions}
          {access.email ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={async () => {
                await supabase.auth.signOut();
                window.location.href = "/auth";
              }}
            >
              Sign out
            </Button>
          ) : null}
        </div>
      </div>

      {access.loading ? (
        <LoadingBlock label="Checking your access…" />
      ) : !access.isMember ? (
        <EmptyBlock
          title="Sign in to manage listings"
          description="Sign in with your Cossa Store member account to add and manage your own products."
          action={
            <Button asChild variant="outline">
              <Link to="/auth">Sign in</Link>
            </Button>
          }
        />
      ) : (
        <>
          {!access.isStaff ? (
            <p className="mb-6 rounded-md border border-border bg-card px-4 py-3 text-sm text-muted-foreground">
              You are managing your own listings. New products are saved as drafts and go live on
              the storefront once a Cossa administrator approves them.
            </p>
          ) : null}
          {children}
        </>
      )}
    </div>
  );
}
