import { COMPANY_REGISTRY, companyConfig } from "@/config/company";

/** Public company registration information for the group. */
export function CompanyInfoCard() {
  return (
    <section className="rounded-xl border border-primary/25 bg-card p-6 sm:p-8">
      <h2 className="font-display text-xl font-semibold">Company information</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Cossa Store trades under Cossa Nexus Holdings (Pty) Ltd. Registered details below.
      </p>

      <div className="mt-6 grid gap-5 md:grid-cols-2">
        {COMPANY_REGISTRY.map((company) => (
          <div key={company.registrationNumber} className="rounded-lg border border-border p-5">
            <div className="flex items-start gap-3">
              <img
                src={company.logo}
                alt={company.logoAlt}
                width={40}
                height={40}
                loading="lazy"
                decoding="async"
                className="h-10 w-10 shrink-0 object-contain"
              />
              <div>
                <p className="text-[11px] uppercase tracking-widest text-primary">{company.role}</p>
                <p className="font-display text-base font-semibold">{company.name}</p>
              </div>
            </div>
            <dl className="mt-4 space-y-2 text-sm">
              <Row label="Registration number" value={company.registrationNumber} />
              <Row label="Tax reference" value={company.taxReference} />
              <Row label="B-BBEE" value={company.bbbee} />
            </dl>
          </div>
        ))}
      </div>

      <p className="mt-6 text-sm text-muted-foreground">
        Group website:{" "}
        <a
          href={companyConfig.parentCompany.website}
          target="_blank"
          rel="noreferrer"
          className="font-medium text-primary hover:underline"
        >
          {companyConfig.parentCompany.website}
        </a>
      </p>
    </section>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium tracking-wide">{value}</dd>
    </div>
  );
}