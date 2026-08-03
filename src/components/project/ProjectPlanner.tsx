import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  Check,
  Loader2,
  MessageCircle,
  RotateCcw,
  Save,
  Share2,
  ShoppingCart,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { NoticeBlock } from "@/components/common/StateBlocks";
import { trackEvent } from "@/lib/analytics";
import {
  KIT_DISCLAIMER,
  computeKit,
  defaultValues,
  normaliseValues,
  sanitiseField,
  summariseKit,
  summariseValues,
  type KitLine,
} from "@/lib/project-kit";
import { savedProjects } from "@/lib/saved-projects";
import { contextualWhatsAppLink } from "@/lib/whatsapp-context";
import type { ProjectBundle, ProjectFieldValues } from "@/types/catalog";

function readValuesFromUrl(project: ProjectBundle): ProjectFieldValues | undefined {
  if (typeof window === "undefined" || !project.calculator) return undefined;
  const params = new URLSearchParams(window.location.search);
  if (![...params.keys()].length) return undefined;
  const values: ProjectFieldValues = {};
  let found = false;
  for (const field of project.calculator.fields) {
    const raw = params.get(field.id);
    if (raw !== null) {
      values[field.id] = sanitiseField(field, raw);
      found = true;
    }
  }
  return found ? values : undefined;
}

export function ProjectPlanner({
  project,
  savedId,
  initialValues,
  initialServices,
}: {
  project: ProjectBundle;
  savedId?: string;
  initialValues?: ProjectFieldValues;
  initialServices?: string[];
}) {
  const calculator = project.calculator;
  const [values, setValues] = useState<ProjectFieldValues>(() =>
    calculator ? normaliseValues(calculator, initialValues ?? defaultValues(calculator)) : {},
  );
  const [services, setServices] = useState<string[]>(initialServices ?? []);
  const [savedRecordId, setSavedRecordId] = useState<string | undefined>(savedId);
  const [saving, setSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const startedRef = useRef(false);

  /* Shared links carry calculator values so a project can be handed over intact. */
  useEffect(() => {
    if (initialValues || !calculator) return;
    const fromUrl = readValuesFromUrl(project);
    if (fromUrl) setValues(normaliseValues(calculator, fromUrl));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project.slug]);

  const lines: KitLine[] = useMemo(
    () => (calculator ? computeKit(calculator, values) : []),
    [calculator, values],
  );

  const measurements = useMemo(
    () => (calculator ? summariseValues(calculator, values) : []),
    [calculator, values],
  );

  const onChange = useCallback(
    (fieldId: string, raw: string) => {
      if (!calculator) return;
      const field = calculator.fields.find((f) => f.id === fieldId);
      if (!field) return;
      if (!startedRef.current) {
        startedRef.current = true;
        trackEvent("project_calculator_started", { project: project.slug });
      }
      setValues((prev) => ({ ...prev, [fieldId]: sanitiseField(field, raw) }));
    },
    [calculator, project.slug],
  );

  const reset = useCallback(() => {
    if (!calculator) return;
    setValues(defaultValues(calculator));
    setServices([]);
    trackEvent("project_reset", { project: project.slug });
    toast.success("Calculator reset");
  }, [calculator, project.slug]);

  const toggleService = useCallback(
    (id: string) => {
      setServices((prev) => {
        const next = prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id];
        if (!prev.includes(id)) trackEvent("service_add_on_selected", { project: project.slug, service: id });
        return next;
      });
    },
    [project.slug],
  );

  const selectedServiceNames = useMemo(
    () =>
      (project.services ?? [])
        .filter((s) => services.includes(s.id))
        .map((s) => `${s.name} (${s.provider})`),
    [project.services, services],
  );

  const shareUrl = useMemo(() => {
    if (typeof window === "undefined") return "";
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(values)) params.set(key, String(value));
    return `${window.location.origin}/project/${project.slug}?${params.toString()}`;
  }, [values, project.slug]);

  const whatsappHref = useMemo(
    () =>
      contextualWhatsAppLink({
        subject: `I am planning the "${project.name}" project on Cossa Store.`,
        details: [
          ...measurements,
          ...(lines.length ? ["Estimated kit:"] : []),
          ...summariseKit(lines),
          ...(selectedServiceNames.length
            ? [`Services required: ${selectedServiceNames.join(", ")}`]
            : []),
        ],
        url: shareUrl || undefined,
      }),
    [project.name, measurements, lines, selectedServiceNames, shareUrl],
  );

  const save = useCallback(() => {
    setSaving(true);
    try {
      const record = savedProjects.save(
        {
          slug: project.slug,
          name: project.name,
          values,
          lines,
          services,
        },
        savedRecordId,
      );
      setSavedRecordId(record.id);
      setJustSaved(true);
      trackEvent("project_saved", { project: project.slug });
      toast.success("Project saved", {
        description: "Saved on this device. Open it any time from My account.",
      });
      window.setTimeout(() => setJustSaved(false), 2500);
    } catch {
      toast.error("We could not save this project", {
        description: "Your browser may be blocking storage. Continue on WhatsApp instead.",
      });
    } finally {
      setSaving(false);
    }
  }, [project.slug, project.name, values, lines, services, savedRecordId]);

  const share = useCallback(async () => {
    trackEvent("project_shared", { project: project.slug });
    const data = { title: `${project.name} — Cossa Store`, url: shareUrl };
    try {
      if (typeof navigator !== "undefined" && navigator.share) {
        await navigator.share(data);
        return;
      }
      await navigator.clipboard.writeText(shareUrl);
      toast.success("Project link copied");
    } catch {
      toast.message("Copy this link to share your project", { description: shareUrl });
    }
  }, [project.name, project.slug, shareUrl]);

  const addKit = useCallback(() => {
    trackEvent("project_kit_added", { project: project.slug, lines: lines.length });
    toast.message("Your kit structure is ready", {
      description:
        "Matching products for this project are not loaded in the catalogue yet. Request a quote and we will price the full kit for you.",
    });
  }, [project.slug, lines.length]);

  if (!calculator) return null;

  const quoteLines = lines.filter((l) => l.availability === "quote");
  const comingSoon = lines.filter((l) => l.availability === "coming_soon");
  const hasWaste = lines.some((l) => l.waste > 0);

  return (
    <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      {/* ---- Inputs ---- */}
      <div className="rounded-lg border border-border bg-card p-5 sm:p-6">
        <h2 className="font-display text-lg font-semibold">{calculator.label} calculator</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Change any value and the kit below updates immediately.
        </p>

        <div className="mt-5 space-y-4">
          {calculator.fields.map((field) => {
            const id = `calc-${project.slug}-${field.id}`;
            return (
              <div key={field.id}>
                <Label htmlFor={id} className="text-sm">
                  {field.label}
                  {field.unit ? (
                    <span className="ml-1 text-muted-foreground">({field.unit})</span>
                  ) : null}
                </Label>
                {field.type === "select" ? (
                  <select
                    id={id}
                    value={String(values[field.id] ?? field.defaultValue)}
                    onChange={(e) => onChange(field.id, e.target.value)}
                    className="mt-1.5 h-11 w-full rounded-md border border-border bg-background px-3 text-sm"
                  >
                    {field.options?.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                ) : (
                  <Input
                    id={id}
                    type="number"
                    inputMode="decimal"
                    className="mt-1.5 h-11"
                    min={field.min ?? 0}
                    max={field.max}
                    step={field.step ?? 1}
                    value={String(values[field.id] ?? "")}
                    onChange={(e) => onChange(field.id, e.target.value)}
                    onBlur={() => onChange(field.id, String(values[field.id] ?? field.defaultValue))}
                  />
                )}
                {field.help ? (
                  <p className="mt-1 text-xs text-muted-foreground">{field.help}</p>
                ) : null}
              </div>
            );
          })}
        </div>

        {project.services?.length ? (
          <fieldset className="mt-6">
            <legend className="text-sm font-semibold">Optional Cossa services</legend>
            <p className="mt-1 text-xs text-muted-foreground">
              Nothing is added automatically — select only what you need.
            </p>
            <div className="mt-3 space-y-3">
              {project.services.map((service) => (
                <label
                  key={service.id}
                  className="flex cursor-pointer items-start gap-3 rounded-md border border-border p-3 text-sm"
                >
                  <Checkbox
                    checked={services.includes(service.id)}
                    onCheckedChange={() => toggleService(service.id)}
                    aria-label={service.name}
                  />
                  <span>
                    <span className="font-medium">{service.name}</span>
                    <span className="block text-xs text-muted-foreground">
                      {service.provider} — {service.description}
                    </span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
        ) : null}

        <Button variant="ghost" size="sm" className="mt-5" onClick={reset}>
          <RotateCcw className="mr-1.5 h-4 w-4" aria-hidden /> Reset calculator
        </Button>
      </div>

      {/* ---- Live kit summary ---- */}
      <div className="rounded-lg border border-border bg-card p-5 sm:p-6" aria-live="polite">
        <p className="text-xs uppercase tracking-widest text-muted-foreground">Project kit</p>
        <h2 className="mt-1 font-display text-lg font-semibold">{project.name}</h2>
        <p className="text-xs text-muted-foreground">
          Estimated category: {project.themes.join(", ")} · {project.budgetBand} budget band
        </p>

        <dl className="mt-4 space-y-1 text-sm">
          {measurements.map((line) => (
            <div key={line} className="flex justify-between gap-3 text-muted-foreground">
              <dt>{line.split(":")[0]}</dt>
              <dd className="text-right text-foreground">{line.split(": ").slice(1).join(": ")}</dd>
            </div>
          ))}
        </dl>

        <div className="mt-5 border-t border-border pt-4">
          <h3 className="text-sm font-semibold">Estimated quantities</h3>
          {lines.length === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">
              Enter your measurements above to generate a kit.
            </p>
          ) : (
            <ul className="mt-2 space-y-1.5 text-sm">
              {lines.map((line) => (
                <li key={line.id} className="flex items-baseline justify-between gap-3">
                  <span>{line.label}</span>
                  <span className="whitespace-nowrap font-medium">
                    {line.quantity} {line.unit}
                    {line.waste > 0 ? (
                      <span className="ml-1 text-xs font-normal text-muted-foreground">
                        (incl. {line.waste} allowance)
                      </span>
                    ) : null}
                  </span>
                </li>
              ))}
            </ul>
          )}
          {hasWaste ? (
            <p className="mt-2 text-xs text-muted-foreground">
              Quantities include a waste allowance for cutting, spillage and replacement.
            </p>
          ) : null}
        </div>

        {project.accessories?.length ? (
          <div className="mt-4 border-t border-border pt-4">
            <h3 className="text-sm font-semibold">Recommended accessories</h3>
            <ul className="mt-2 list-inside list-disc text-sm text-muted-foreground">
              {project.accessories.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        ) : null}

        {selectedServiceNames.length ? (
          <div className="mt-4 border-t border-border pt-4">
            <h3 className="text-sm font-semibold">Selected services</h3>
            <ul className="mt-2 list-inside list-disc text-sm text-muted-foreground">
              {selectedServiceNames.map((name) => (
                <li key={name}>{name}</li>
              ))}
            </ul>
          </div>
        ) : null}

        {quoteLines.length || comingSoon.length ? (
          <div className="mt-4 border-t border-border pt-4 text-sm">
            {quoteLines.length ? (
              <p className="text-muted-foreground">
                <span className="font-medium text-foreground">{quoteLines.length} item(s)</span> are
                priced on quotation.
              </p>
            ) : null}
            {comingSoon.length ? (
              <p className="mt-1 text-muted-foreground">
                <span className="font-medium text-foreground">{comingSoon.length} item(s)</span> are
                not available in the catalogue yet.
              </p>
            ) : null}
          </div>
        ) : null}

        {calculator.note ? (
          <p className="mt-4 text-xs text-muted-foreground">{calculator.note}</p>
        ) : null}

        <div className="mt-4">
          <NoticeBlock tone="pending" title="Estimates only">
            {KIT_DISCLAIMER}
          </NoticeBlock>
        </div>

        <div className="mt-5 grid gap-2 sm:grid-cols-2">
          <Button onClick={addKit} disabled={lines.length === 0}>
            <ShoppingCart className="mr-1.5 h-4 w-4" aria-hidden /> Add full kit to cart
          </Button>
          <Button asChild variant="outline">
            <Link
              to="/request-a-quote"
              onClick={() => trackEvent("project_quote_requested", { project: project.slug })}
            >
              Request project quote
            </Link>
          </Button>
          <Button variant="outline" onClick={save} disabled={saving}>
            {saving ? (
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" aria-hidden />
            ) : justSaved ? (
              <Check className="mr-1.5 h-4 w-4" aria-hidden />
            ) : (
              <Save className="mr-1.5 h-4 w-4" aria-hidden />
            )}
            {justSaved ? "Project saved" : "Save this project"}
          </Button>
          <Button variant="outline" onClick={share}>
            <Share2 className="mr-1.5 h-4 w-4" aria-hidden /> Share project
          </Button>
          <Button asChild variant="secondary" className="sm:col-span-2">
            <a
              href={whatsappHref}
              target="_blank"
              rel="noreferrer"
              onClick={() => trackEvent("whatsapp_clicked", { context: "project", project: project.slug })}
            >
              <MessageCircle className="mr-1.5 h-4 w-4" aria-hidden /> Continue this on WhatsApp
            </a>
          </Button>
        </div>
      </div>
    </section>
  );
}
