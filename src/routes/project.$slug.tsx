import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";

import { PageHeader } from "@/components/common/PageHeader";
import { EmptyBlock, ErrorBlock, LoadingBlock } from "@/components/common/StateBlocks";
import { ProductGrid } from "@/components/shop/ProductCard";
import { Button } from "@/components/ui/button";
import { getProject } from "@/data/categories";
import { projectQuery } from "@/lib/queries";
import { ServiceCrossSell } from "@/components/support/ServiceCrossSell";
import { SITE_URL } from "@/config/seo";
import { ProjectPlanner } from "@/components/project/ProjectPlanner";

export const Route = createFileRoute("/project/$slug")({
  head: ({ params }) => {
    const project = getProject(params.slug);
    const title = project ? `${project.name} | Cossa Store` : "Project | Cossa Store";
    const description = project?.description ?? "Project supply lists from Cossa Store.";
    const url = `${SITE_URL}/project/${params.slug}`;
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:url", content: url },
      ],
      links: [{ rel: "canonical", href: url }],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "CollectionPage",
            name: title,
            description,
            url,
          }),
        },
      ],
    };
  },
  component: ProjectPage,
});

function ProjectPage() {
  const { slug } = Route.useParams();
  const query = useQuery(projectQuery(slug));
  const project = query.data?.project ?? null;

  if (query.isPending) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <LoadingBlock />
      </div>
    );
  }

  if (query.isError) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16">
        <ErrorBlock action={<Button onClick={() => query.refetch()}>Try again</Button>} />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16">
        <EmptyBlock
          title="Project not found"
          action={
            <Button asChild>
              <Link to="/shop-by-project">All projects</Link>
            </Button>
          }
        />
      </div>
    );
  }

  const products = query.data?.products ?? [];

  return (
    <div>
      <PageHeader
        eyebrow="Shop by project"
        title={project.name}
        description={project.description}
        actions={
          <Button asChild variant="outline">
            <Link to="/request-a-quote">Request a quote for this project</Link>
          </Button>
        }
      />
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        {project.calculator ? (
          <div className="mb-10">
            <ProjectPlanner project={project} />
          </div>
        ) : null}
        {products.length === 0 ? (
          <EmptyBlock
            title="No products listed for this project yet"
            description="The kit structure above is ready. Request a quote and our team will price every item for you."
            action={
              <Button asChild>
                <Link to="/request-a-quote">Request a project quote</Link>
              </Button>
            }
          />
        ) : (
          <ProductGrid products={products} />
        )}
        <div className="mt-10">
          <ServiceCrossSell categorySlug={project.categories[0]} />
        </div>
      </div>
    </div>
  );
}
