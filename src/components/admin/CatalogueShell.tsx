import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";

import { EmptyBlock, LoadingBlock } from "@/components/common/StateBlocks";
import { Button } from "@/components/ui/button";
import { useCossaStoreAdminAccess } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";

export function useCatalogueAccess() {
  const access = useCossaStoreAdminAccess();
  return { ...access, isStaff: access.isAdmin };
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

  if (access.loading) return <LoadingBlock label="Checking your access…" />;
  if (!access.isAdmin) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10">
        <EmptyBlock
          title={access.isMember ? "Administrator access required" : "Sign in to Store administration"}
          description="Please use your customer account to shop and manage your own orders."
          action={
            <Button asChild variant="outline">
              <Link to={access.isMember ? "/shop" : "/auth"}>
                {access.isMember ? "Return to the Store" : "Sign in"}
              </Link>
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4 border-b border-border pb-6">
        <div>
          <p className="text-xs uppercase tracking-widest text-muted-foreground">
            Cossa Store administration
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h1>
          {description ? (
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{description}</p>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {actions}
          <Button asChild size="sm" variant="outline">
            <Link to="/admin/approvals">Approvals</Link>
          </Button>
          <Button asChild size="sm" variant="outline">
            <Link to="/admin/email-operations">Email operations</Link>
          </Button>
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
        </div>
      </div>
      {children}
    </div>
  );
}
