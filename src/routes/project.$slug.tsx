import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";

import { PageHeader } from "@/components/common/PageHeader";
import { EmptyBlock, ErrorBlock, LoadingBlock } from "@/components/common/StateBlocks";
import { ProductGrid } from "@/components/shop/ProductCard";
import { Button } from "@/components/ui/button";
import { getProject } from "@/data/categories";
import { projectQuery } from "@/lib/queries";

export const Route = createFileRoute("/project/$slug")({
  head: ({ params }) => {
    const project = getProject(params.slug);
    const title = project ? `${project.name} | Cossa Store` : "Project | Cossa Store";
    const description = project?.description ?? "Project supply lists from Cossa Store.";
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
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
        {products.length === 0 ? (
          <EmptyBlock title="No products listed for this project yet" />
        ) : (
          <ProductGrid products={products} />
        )}
      </div>
    </div>
  );
}