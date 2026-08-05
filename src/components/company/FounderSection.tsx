import { companyConfig } from "@/config/company";

/** Executive founder profile. */
export function FounderSection() {
  const { founder } = companyConfig;
  return (
    <section className="overflow-hidden rounded-xl border border-primary/25 bg-surface-strong">
      <div className="grid gap-0 md:grid-cols-[minmax(0,320px)_1fr]">
        <img
          src={founder.image}
          alt={founder.imageAlt}
          width={900}
          height={1300}
          loading="lazy"
          decoding="async"
          className="h-72 w-full object-cover object-top md:h-full"
        />
        <div className="p-6 sm:p-8">
          <p className="text-[11px] uppercase tracking-[0.22em] text-primary">Meet our founder</p>
          <div className="gold-rule mt-3 h-px w-16" aria-hidden />
          <h2 className="mt-4 font-display text-2xl font-bold">{founder.name}</h2>
          <p className="mt-1 text-sm font-medium text-muted-foreground">{founder.title}</p>
          <p className="mt-5 text-sm leading-relaxed text-muted-foreground">{founder.body}</p>
        </div>
      </div>
    </section>
  );
}