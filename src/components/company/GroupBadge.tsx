import { companyConfig } from "@/config/company";
import { cn } from "@/lib/utils";

/** Small parent-company ownership badge: "A proud member of Cossa Nexus Holdings". */
export function GroupBadge({ className }: { className?: string }) {
  return (
    <a
      href={companyConfig.parentCompany.website}
      target="_blank"
      rel="noreferrer"
      className={cn(
        "inline-flex items-center gap-2 rounded-full border border-primary/30 bg-surface-strong px-2.5 py-1 transition-colors hover:border-primary/60",
        className,
      )}
    >
      <img
        src={companyConfig.parentCompany.logo}
        alt={companyConfig.parentCompany.logoAlt}
        width={20}
        height={20}
        loading="lazy"
        decoding="async"
        className="h-5 w-5 object-contain"
      />
      <span className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
        {companyConfig.store.parentText}
      </span>
    </a>
  );
}

/** Construction-company mark for construction products, projects and quotes. */
export function ConstructionBadge({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "inline-flex items-center gap-3 rounded-lg border border-primary/25 bg-surface-strong px-3 py-2",
        className,
      )}
    >
      <img
        src={companyConfig.construction.logo}
        alt={companyConfig.construction.logoAlt}
        width={32}
        height={32}
        loading="lazy"
        decoding="async"
        className="h-8 w-8 object-contain"
      />
      <div className="leading-tight">
        <p className="text-xs font-semibold text-foreground">
          {companyConfig.construction.shortName}
        </p>
        <p className="text-[11px] text-muted-foreground">
          Construction, renovations and building maintenance by our group company.
        </p>
      </div>
    </div>
  );
}