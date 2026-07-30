import { Link } from "@tanstack/react-router";
import { LayoutGrid } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useRoles, useSession } from "@/lib/auth";
import { cn } from "@/lib/utils";

/**
 * Renders the internal catalogue manager entry point, but only for signed-in
 * users who actually hold the Cossa staff or admin role. Public visitors never
 * see it, and the route itself is protected independently.
 */
export function StaffCatalogueLink({
  className,
  variant = "outline",
}: {
  className?: string;
  variant?: "outline" | "ghost" | "link";
}) {
  const { user } = useSession();
  const roles = useRoles(user?.id);
  const list = roles.data ?? [];
  const isStaff = list.includes("staff") || list.includes("admin");

  if (!isStaff) return null;

  return (
    <Button asChild size="sm" variant={variant} className={cn(className)}>
      <Link to="/admin/catalogue">
        <LayoutGrid className="mr-1.5 h-4 w-4" aria-hidden />
        Catalogue manager
      </Link>
    </Button>
  );
}