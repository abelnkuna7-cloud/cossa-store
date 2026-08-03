/**
 * Saved projects.
 *
 * Stored on the customer's device today. When customer accounts go live the
 * same API can persist to the account instead — components never touch
 * storage directly.
 */
import { useCallback, useSyncExternalStore } from "react";

import type { ProjectFieldValues, SavedProject } from "@/types/catalog";
import type { KitLine } from "@/lib/project-kit";

const KEY = "cossa.saved-projects.v1";
const RECENT_KEY = "cossa.recent-projects.v1";
const MAX_RECENT = 8;

type Listener = () => void;
const listeners = new Set<Listener>();

let cache: SavedProject[] | null = null;
let recentCache: string[] | null = null;

function emit() {
  for (const listener of listeners) listener();
}

function readList<T>(key: string): T[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
}

function writeList(key: string, value: unknown): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage may be unavailable (private mode, quota) — fail quietly */
  }
}

function getAll(): SavedProject[] {
  if (cache === null) cache = readList<SavedProject>(KEY);
  return cache;
}

function setAll(next: SavedProject[]): void {
  cache = next;
  writeList(KEY, next);
  emit();
}

function getRecent(): string[] {
  if (recentCache === null) recentCache = readList<string>(RECENT_KEY);
  return recentCache;
}

function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

const EMPTY: SavedProject[] = [];
const EMPTY_SLUGS: string[] = [];

function newId(): string {
  return `proj_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export interface SaveProjectInput {
  slug: string;
  name: string;
  values: ProjectFieldValues;
  lines: KitLine[];
  services: string[];
  notes?: string;
}

export const savedProjects = {
  list: getAll,
  get(id: string): SavedProject | undefined {
    return getAll().find((p) => p.id === id);
  },
  /** Creates a new saved project, or updates the existing one when `id` is given. */
  save(input: SaveProjectInput, id?: string): SavedProject {
    const now = new Date().toISOString();
    const lines = input.lines.map((l) => ({
      label: l.label,
      quantity: l.quantity,
      unit: l.unit,
    }));
    const existing = id ? getAll().find((p) => p.id === id) : undefined;

    const project: SavedProject = existing
      ? { ...existing, ...input, lines, notes: input.notes ?? existing.notes, updatedAt: now }
      : {
          id: newId(),
          slug: input.slug,
          name: input.name,
          values: input.values,
          lines,
          services: input.services,
          notes: input.notes ?? "",
          status: "planning",
          quoteReference: null,
          createdAt: now,
          updatedAt: now,
        };

    const rest = getAll().filter((p) => p.id !== project.id);
    setAll([project, ...rest]);
    return project;
  },
  rename(id: string, name: string): void {
    const trimmed = name.trim();
    if (!trimmed) return;
    setAll(
      getAll().map((p) =>
        p.id === id ? { ...p, name: trimmed, updatedAt: new Date().toISOString() } : p,
      ),
    );
  },
  update(id: string, patch: Partial<SavedProject>): void {
    setAll(
      getAll().map((p) =>
        p.id === id ? { ...p, ...patch, id: p.id, updatedAt: new Date().toISOString() } : p,
      ),
    );
  },
  duplicate(id: string): SavedProject | null {
    const source = getAll().find((p) => p.id === id);
    if (!source) return null;
    const now = new Date().toISOString();
    const copy: SavedProject = {
      ...source,
      id: newId(),
      name: `${source.name} (copy)`,
      status: "planning",
      quoteReference: null,
      createdAt: now,
      updatedAt: now,
    };
    setAll([copy, ...getAll()]);
    return copy;
  },
  remove(id: string): void {
    setAll(getAll().filter((p) => p.id !== id));
  },
  markRecentlyViewed(slug: string): void {
    const next = [slug, ...getRecent().filter((s) => s !== slug)].slice(0, MAX_RECENT);
    recentCache = next;
    writeList(RECENT_KEY, next);
    emit();
  },
  recent: getRecent,
};

/** Subscribes a component to the saved-project list. SSR-safe. */
export function useSavedProjects(): { projects: SavedProject[]; hydrated: boolean } {
  const projects = useSyncExternalStore(
    subscribe,
    getAll,
    () => EMPTY,
  );
  const hydrated = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
  return { projects, hydrated };
}

export function useRecentProjectSlugs(): string[] {
  return useSyncExternalStore(subscribe, getRecent, () => EMPTY_SLUGS);
}

/** Stable callback that records a project as recently viewed. */
export function useMarkRecentlyViewed(): (slug: string) => void {
  return useCallback((slug: string) => savedProjects.markRecentlyViewed(slug), []);
}
