import { companyConfig, GROUP_SUPPORT } from "@/config/company";
import { cn } from "@/lib/utils";

/* -------------------------------------------------------------------------- */
/* TYPES                                                                      */
/* -------------------------------------------------------------------------- */

export type CossaServiceProvider =
  | "construction"
  | "facility"
  | "tech";

/* -------------------------------------------------------------------------- */
/* PARENT GROUP BADGE                                                         */
/* -------------------------------------------------------------------------- */

/**
 * Parent-company ownership badge.
 *
 * Use where the Store should visibly establish that it is part of
 * Cossa Nexus Holdings without overwhelming the Store's own identity.
 */
export function GroupBadge({
  className,
}: {
  className?: string;
}) {
  return (
    <a
      href={companyConfig.parentCompany.website}
      target="_blank"
      rel="noopener noreferrer"
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

/* -------------------------------------------------------------------------- */
/* GENERIC SERVICE PROVIDER BADGE                                             */
/* -------------------------------------------------------------------------- */

/**
 * Contextual Cossa group support badge.
 *
 * Use only where the relevant Cossa company materially supports
 * the customer's current category, product or project.
 *
 * Examples:
 *
 * Construction products
 * -> Cossa Nexus Construction
 *
 * Cleaning/facility products
 * -> Cossa Facility Services
 *
 * Technology products
 * -> Cossa Tech
 *
 * This is contextual cross-support, not a directory of subsidiaries.
 */
export function ServiceProviderBadge({
  provider,
  className,
}: {
  provider: CossaServiceProvider;
  className?: string;
}) {
  const config =
    provider === "construction"
      ? companyConfig.construction
      : provider === "facility"
        ? companyConfig.facility
        : companyConfig.tech;

  const support = GROUP_SUPPORT[provider];

  return (
    <div
      className={cn(
        "inline-flex max-w-full items-center gap-3 rounded-lg border border-primary/25 bg-surface-strong px-3 py-2",
        className,
      )}
    >
      <img
        src={config.logo}
        alt={config.logoAlt}
        width={32}
        height={32}
        loading="lazy"
        decoding="async"
        className="h-8 w-8 shrink-0 object-contain"
      />

      <div className="min-w-0 leading-tight">
        <p className="truncate text-xs font-semibold text-foreground">
          {config.shortName}
        </p>

        <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">
          {support.description}
        </p>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* BACKWARD-COMPATIBLE NAMED BADGES                                           */
/* -------------------------------------------------------------------------- */

/**
 * Construction-company mark for relevant construction products,
 * projects and quotation journeys.
 */
export function ConstructionBadge({
  className,
}: {
  className?: string;
}) {
  return (
    <ServiceProviderBadge
      provider="construction"
      className={className}
    />
  );
}

/**
 * Facility Services mark for relevant cleaning, hygiene,
 * facility-supply and recurring-service journeys.
 */
export function FacilityServicesBadge({
  className,
}: {
  className?: string;
}) {
  return (
    <ServiceProviderBadge
      provider="facility"
      className={className}
    />
  );
}

/**
 * Cossa Tech mark for relevant technology, smart-solution,
 * setup and technical-support journeys.
 */
export function TechBadge({
  className,
}: {
  className?: string;
}) {
  return (
    <ServiceProviderBadge
      provider="tech"
      className={className}
    />
  );
}
