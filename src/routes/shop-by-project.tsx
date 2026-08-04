import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Search } from "lucide-react";

import { SITE_URL } from "@/config/seo";
import { PageHeader } from "@/components/common/PageHeader";
import { EmptyBlock } from "@/components/common/StateBlocks";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PROJECTS, getProject } from "@/data/categories";
import { useRecentProjectSlugs, useSavedProjects } from "@/lib/saved-projects";
import type { ProjectBudgetBand, ProjectTheme } from "@/types/catalog";

const TITLE = "Shop by project | Cossa Store";
const DESCRIPTION =
  "Start from the job — painting a room, cleaning an office, equipping a construction team — and see exactly what you need, with live quantity calculators.";

export const Route = createFileRoute("/shop-by-project")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:url", content: `${SITE_URL}/shop-by-project` },
    ],
    links: [{ rel: "canonical", href: `${SITE_URL}/shop-by-project` }],
  }),
  component: ShopByProject,
});

const THEMES: { value: ProjectTheme | "all"; label: string }[] = [
  { value: "all", label: "All projects" },
  { value: "construction", label: "Construction" },
  { value: "cleaning", label: "Cleaning" },
  { value: "technology", label: "Technology" },
  { value: "workplace", label: "Workplace" },
];

const BUDGETS: { value: ProjectBudgetBand | "all"; label: string }[] = [
  { value: "all", label: "Any budget" },
  { value: "low", label: "Entry budget" },
  { value: "medium", label: "Mid budget" },
  { value: "high", label: "Large budget" },
];

type SortKey = "popular" | "newest" | "effort" | "az";

const SORTS: { value: SortKey; label: string }[] = [
  { value: "popular", label: "Most popular" },
  { value: "newest", label: "Newest" },
  { value: "effort", label: "Easiest first" },
  { value: "az", label: "A–Z" },
];

function chipClass(active: boolean): string {
  return `rounded-full border px-3.5 py-1.5 text-sm transition-colors ${
    active
      ? "border-accent bg-accent/10 text-foreground"
      : "border-border text-muted-foreground hover:border-accent"
  }`;
}

function ShopByProject() {
  const [term, setTerm] = useState("");
  const [theme, setTheme] = useState<ProjectTheme | "all">("all");
  const [budget, setBudget] = useState<ProjectBudgetBand | "all">("all");
  const [sort, setSort] = useState<SortKey>("popular");

  const recentSlugs = useRecentProjectSlugs();
  const { projects: saved, hydrated } = useSavedProjects();

  const results = useMemo(() => {
    const q = term.trim().toLowerCase();
    const list = PROJECTS.filter((project) => {
      if (theme !== "all" && !project.themes.includes(theme)) return false;
      if (budget !== "all" && project.budgetBand !== budget) return false;
      if (!q) return true;
      return [project.name, project.description, project.job ?? "", ...project.themes]
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
    const sorted = [...list];
    if (sort === "popular") sorted.sort((a, b) => b.popularity - a.popularity);
    if (sort === "newest") sorted.sort((a, b) => b.addedAt.localeCompare(a.addedAt));
    if (sort === "effort") sorted.sort((a, b) => a.effort - b.effort);
    if (sort === "az") sorted.sort((a, b) => a.name.localeCompare(b.name));
    return sorted;
  }, [term, theme, budget, sort]);

  const recent = recentSlugs
    .map((slug) => getProject(slug))
    .filter((p): p is NonNullable<typeof p> => Boolean(p))
    .slice(0, 4);

  return (
    <div>
      <PageHeader eyebrow="Projects" title="Shop by project" description={DESCRIPTION} />
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        {hydrated && saved.length ? (
          <div className="mb-8 rounded-lg border border-border bg-card p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-display text-base font-semibold">Your saved projects</h2>
                <p className="text-sm text-muted-foreground">
                  {saved.length} project{saved.length === 1 ? "" : "s"} saved on this device.
                </p>
              </div>
              <Button asChild variant="outline" size="sm">
                <Link to="/account/projects">Open saved projects</Link>
              </Button>
            </div>
          </div>
        ) : null}

        {/* Filters */}
        <div className="space-y-4">
          <div className="relative max-w-md">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <Input
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              placeholder="Search projects, e.g. painting, office, safety"
              aria-label="Search projects"
              className="h-11 pl-9"
            />
          </div>

          <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by theme">
            {THEMES.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setTheme(option.value)}
                className={chipClass(theme === option.value)}
                aria-pressed={theme === option.value}
              >
                {option.label}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by budget">
              {BUDGETS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setBudget(option.value)}
                  className={chipClass(budget === option.value)}
                  aria-pressed={budget === option.value}
                >
                  {option.label}
                </button>
              ))}
            </div>
            <label className="ml-auto flex items-center gap-2 text-sm text-muted-foreground">
              Sort
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as SortKey)}
                className="h-10 rounded-md border border-border bg-background px-3 text-sm text-foreground"
              >
                {SORTS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>

        <p className="mt-6 text-sm text-muted-foreground" aria-live="polite">
          Showing {results.length} of {PROJECTS.length} projects
        </p>

        {results.length === 0 ? (
          <div className="mt-4">
            <EmptyBlock
              title="No projects match those filters"
              description="Try a different theme or budget band — or tell us about your job and we will build the kit for you."
              action={
                <div className="flex flex-wrap justify-center gap-3">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setTerm("");
                      setTheme("all");
                      setBudget("all");
                    }}
                  >
                    Clear filters
                  </Button>
                  <Button asChild>
                    <Link to="/request-a-quote">Request a custom project</Link>
                  </Button>
                </div>
              }
            />
          </div>
        ) : (
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {results.map((project) => (
              <Link
                key={project.slug}
                to="/project/$slug"
                params={{ slug: project.slug }}
                className="flex flex-col rounded-lg border border-border bg-card p-6 transition-colors hover:border-accent"
              >
                <div className="flex flex-wrap gap-1.5">
                  {project.themes.map((t) => (
                    <span
                      key={t}
                      className="rounded-full border border-border px-2 py-0.5 text-[11px] uppercase tracking-wide text-muted-foreground"
                    >
                      {t}
                    </span>
                  ))}
                </div>
                <h2 className="mt-3 font-display text-lg font-semibold">{project.name}</h2>
                <p className="mt-2 flex-1 text-sm text-muted-foreground">{project.description}</p>
                <p className="mt-4 text-xs text-muted-foreground">
                  {project.budgetBand} budget · effort {project.effort}/5
                  {project.calculator ? " · live calculator" : ""}
                </p>
              </Link>
            ))}
          </div>
        )}

        {recent.length ? (
          <section className="mt-12">
            <h2 className="font-display text-lg font-semibold">Recently viewed projects</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {recent.map((project) => (
                <Link
                  key={project.slug}
                  to="/project/$slug"
                  params={{ slug: project.slug }}
                  className="rounded-full border border-border px-4 py-1.5 text-sm text-muted-foreground hover:border-accent"
                >
                  {project.name}
                </Link>
              ))}
            </div>
          </section>
        ) : null}
      </div>
    </div>
  );
}
