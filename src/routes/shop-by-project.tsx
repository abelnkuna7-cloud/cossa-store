import { createFileRoute, Link } from "@tanstack/react-router";
import { SITE_URL } from "@/config/seo";

import { PageHeader } from "@/components/common/PageHeader";
import { PROJECTS } from "@/data/categories";

const TITLE = "Shop by project | Cossa Store";
const DESCRIPTION =
  "Start from the job — painting a room, cleaning an office, equipping a construction team — and see the products you need.";

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

function ShopByProject() {
  return (
    <div>
      <PageHeader eyebrow="Projects" title="Shop by project" description={DESCRIPTION} />
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {PROJECTS.map((project) => (
            <Link
              key={project.slug}
              to="/project/$slug"
              params={{ slug: project.slug }}
              className="rounded-lg border border-border bg-card p-6 transition-colors hover:border-accent"
            >
              <h2 className="font-display text-lg font-semibold">{project.name}</h2>
              <p className="mt-2 text-sm text-muted-foreground">{project.description}</p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
