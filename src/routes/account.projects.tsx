import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Copy, MessageCircle, Pencil, Share2, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { EmptyBlock } from "@/components/common/StateBlocks";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { trackEvent } from "@/lib/analytics";
import { savedProjects, useSavedProjects } from "@/lib/saved-projects";
import { contextualWhatsAppLink } from "@/lib/whatsapp-context";
import type { SavedProject } from "@/types/catalog";

export const Route = createFileRoute("/account/projects")({
  component: SavedProjectsPage,
});

const STATUS_LABELS: Record<SavedProject["status"], string> = {
  planning: "Planning",
  quote_requested: "Quote requested",
  ordered: "Ordered",
  complete: "Complete",
};

function projectUrl(project: SavedProject): string {
  if (typeof window === "undefined") return "";
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(project.values)) params.set(key, String(value));
  return `${window.location.origin}/project/${project.slug}?${params.toString()}`;
}

function SavedProjectsPage() {
  const { projects, hydrated } = useSavedProjects();

  if (!hydrated) {
    return <p className="text-sm text-muted-foreground">Loading your saved projects…</p>;
  }

  if (projects.length === 0) {
    return (
      <EmptyBlock
        title="No saved projects yet"
        description="Plan a job with any project calculator and tap “Save this project”. Saved projects stay on this device so you can pick up where you left off."
        action={
          <Button asChild onClick={() => trackEvent("empty_state_cta_clicked", { area: "saved_projects" })}>
            <Link to="/shop-by-project">Browse projects</Link>
          </Button>
        }
      />
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        {projects.length} saved project{projects.length === 1 ? "" : "s"} on this device.
      </p>
      {projects.map((project) => (
        <SavedProjectCard key={project.id} project={project} />
      ))}
    </div>
  );
}

function SavedProjectCard({ project }: { project: SavedProject }) {
  const [renaming, setRenaming] = useState(false);
  const [name, setName] = useState(project.name);
  const [notes, setNotes] = useState(project.notes);

  const whatsappHref = contextualWhatsAppLink({
    subject: `I would like help with my saved project "${project.name}".`,
    details: [
      ...project.lines.map((l) => `${l.label}: ${l.quantity} ${l.unit}`),
      project.notes ? `Notes: ${project.notes}` : null,
    ],
    url: projectUrl(project),
  });

  return (
    <article className="rounded-lg border border-border bg-card p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          {renaming ? (
            <div className="flex flex-wrap items-center gap-2">
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                aria-label="Project name"
                className="h-10 w-56"
              />
              <Button
                size="sm"
                onClick={() => {
                  savedProjects.rename(project.id, name);
                  setRenaming(false);
                  toast.success("Project renamed");
                }}
              >
                Save
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setName(project.name);
                  setRenaming(false);
                }}
              >
                Cancel
              </Button>
            </div>
          ) : (
            <h2 className="font-display text-lg font-semibold">{project.name}</h2>
          )}
          <p className="mt-1 text-xs text-muted-foreground">
            Updated {new Date(project.updatedAt).toLocaleDateString("en-ZA")} ·{" "}
            {STATUS_LABELS[project.status]}
            {project.quoteReference ? ` · ${project.quoteReference}` : ""}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="ghost" onClick={() => setRenaming((v) => !v)}>
            <Pencil className="mr-1.5 h-4 w-4" aria-hidden /> Rename
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              savedProjects.duplicate(project.id);
              toast.success("Project duplicated");
            }}
          >
            <Copy className="mr-1.5 h-4 w-4" aria-hidden /> Duplicate
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={async () => {
              const url = projectUrl(project);
              trackEvent("project_shared", { project: project.slug });
              try {
                if (typeof navigator !== "undefined" && navigator.share) {
                  await navigator.share({ title: project.name, url });
                  return;
                }
                await navigator.clipboard.writeText(url);
                toast.success("Project link copied");
              } catch {
                toast.message("Copy this link to share", { description: url });
              }
            }}
          >
            <Share2 className="mr-1.5 h-4 w-4" aria-hidden /> Share
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              savedProjects.remove(project.id);
              toast.success("Project removed");
            }}
          >
            <Trash2 className="mr-1.5 h-4 w-4" aria-hidden /> Delete
          </Button>
        </div>
      </div>

      {project.lines.length ? (
        <ul className="mt-4 space-y-1 text-sm">
          {project.lines.map((line) => (
            <li key={line.label} className="flex justify-between gap-3">
              <span className="text-muted-foreground">{line.label}</span>
              <span className="font-medium">
                {line.quantity} {line.unit}
              </span>
            </li>
          ))}
        </ul>
      ) : null}

      <div className="mt-4">
        <Label htmlFor={`notes-${project.id}`} className="text-sm">
          Project notes
        </Label>
        <Textarea
          id={`notes-${project.id}`}
          value={notes}
          rows={2}
          className="mt-1.5"
          placeholder="Site address, deadlines, colours, contact person…"
          onChange={(e) => setNotes(e.target.value)}
          onBlur={() => {
            if (notes !== project.notes) {
              savedProjects.update(project.id, { notes });
              toast.success("Notes saved");
            }
          }}
        />
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Button asChild size="sm">
          <Link to="/project/$slug" params={{ slug: project.slug }} search={{ saved: project.id }}>
            Open planner
          </Link>
        </Button>
        <Button asChild size="sm" variant="outline">
          <Link to="/request-a-quote">Request a quote</Link>
        </Button>
        <Button asChild size="sm" variant="secondary">
          <a
            href={whatsappHref}
            target="_blank"
            rel="noreferrer"
            onClick={() => trackEvent("whatsapp_clicked", { context: "saved_project" })}
          >
            <MessageCircle className="mr-1.5 h-4 w-4" aria-hidden /> WhatsApp this project
          </a>
        </Button>
      </div>
    </article>
  );
}
