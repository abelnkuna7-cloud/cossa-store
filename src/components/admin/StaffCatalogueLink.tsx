import { Link } from "@tanstack/react-router";
import { LayoutGrid } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useCossaStoreAdminAccess } from "@/lib/auth";
import { cn } from "@/lib/utils";

/**
 * Renders the catalogue manager entry point only for active Cossa Store
 * owners and administrators. The route and database are protected separately.
 */
export function StaffCatalogueLink({
  className,
  variant = "outline",
}: {
  className?: string;
  variant?: "outline" | "ghost" | "link";
}) {
  const access = useCossaStoreAdminAccess();
  if (!access.isAdmin) return null;

  return (
    <Button asChild size="sm" variant={variant} className={cn(className)}>
      <Link to="/admin/catalogue">
        <LayoutGrid className="mr-1.5 h-4 w-4" aria-hidden />
        Store admin
      </Link>
    </Button>
  );
}
