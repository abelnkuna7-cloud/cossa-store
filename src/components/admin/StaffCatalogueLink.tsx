import { Link } from "@tanstack/react-router";
import { LayoutGrid } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useSession } from "@/lib/auth";
import { cn } from "@/lib/utils";

/**
 * Renders the catalogue manager entry point for any signed-in member. Public
 * visitors never see it, and the route itself is protected independently.
 * Row-level security limits each member to their own listings.
 */
export function StaffCatalogueLink({
  className,
  variant = "outline",
}: {
  className?: string;
  variant?: "outline" | "ghost" | "link";
}) {
  const { user } = useSession();
  if (!user) return null;

  return (
    <Button asChild size="sm" variant={variant} className={cn(className)}>
      <Link to="/admin/catalogue">
        <LayoutGrid className="mr-1.5 h-4 w-4" aria-hidden />
        My products
      </Link>
    </Button>
  );
}