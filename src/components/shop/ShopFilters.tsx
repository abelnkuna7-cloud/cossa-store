import { Button } from "@/components/ui/button";

export type ShopFilterFlag =
  | "new"
  | "trending"
  | "popular"
  | "in_stock"
  | "made_to_order"
  | "affiliate"
  | "digital"
  | "service"
  | "quote_only";

export type AvailabilityFilter =
  | "available_to_order"
  | "in_stock"
  | "limited_stock"
  | "out_of_stock"
  | "made_to_order";

export type ShopFilterState = {
  category?: string;
  subcategory?: string;
  collection?: string;
  sort?: "relevance" | "price_asc" | "price_desc" | "name_asc";
  fulfilment?: string;
  availability?: AvailabilityFilter;
  min?: number;
  max?: number;
  flag?: ShopFilterFlag;
};

type Department = {
  slug: string;
  name: string;
  subcategories: { slug: string; name: string }[];
};

type Collection = { slug: string; name: string };

const FLAGS: { value: ShopFilterFlag; label: string }[] = [
  { value: "new", label: "New arrivals" },
  { value: "popular", label: "Popular" },
  { value: "in_stock", label: "Available to order" },
  { value: "made_to_order", label: "Made to order" },
  { value: "affiliate", label: "Partner offers" },
  { value: "digital", label: "Digital" },
  { value: "service", label: "Services" },
  { value: "quote_only", label: "Quote only" },
];

const FULFILMENTS: { value: string; label: string }[] = [
  { value: "cossa_stock", label: "Cossa Stock" },
  { value: "local_supplier", label: "Local fulfilment" },
  { value: "local_dropshipping", label: "Local Dropshipping" },
  { value: "international_dropshipping", label: "Global Dropshipping" },
  { value: "print_on_demand", label: "Print on demand" },
  { value: "affiliate", label: "Partner offer" },
  { value: "digital", label: "Digital delivery" },
  { value: "service", label: "Service booking" },
];

const AVAILABILITY: { value: AvailabilityFilter; label: string }[] = [
  { value: "available_to_order", label: "Available to order" },
  { value: "in_stock", label: "In stock" },
  { value: "limited_stock", label: "Limited stock" },
  { value: "out_of_stock", label: "Out of stock" },
  { value: "made_to_order", label: "Made to order" },
];

export function ShopFilters({
  search,
  departments,
  activeDepartment,
  collections,
  onChange,
  idPrefix,
}: {
  search: ShopFilterState;
  departments: Department[];
  activeDepartment?: Department;
  collections: Collection[];
  onChange: (next: ShopFilterState) => void;
  idPrefix: string;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-sans text-sm font-semibold uppercase tracking-wide">Departments</h2>
        <div className="mt-3 flex flex-col gap-1">
          <FilterButton
            active={!search.category}
            onClick={() => onChange({ ...search, category: undefined, subcategory: undefined })}
            label="All products"
          />
          {departments.map((department) => (
            <FilterButton
              key={department.slug}
              active={search.category === department.slug}
              onClick={() => onChange({ ...search, category: department.slug, subcategory: undefined })}
              label={department.name}
            />
          ))}
        </div>
      </div>

      {activeDepartment ? (
        <div>
          <h2 className="font-sans text-sm font-semibold uppercase tracking-wide">Subcategories</h2>
          <div className="mt-3 flex flex-col gap-1">
            <FilterButton
              active={!search.subcategory}
              onClick={() => onChange({ ...search, category: activeDepartment.slug, subcategory: undefined })}
              label="All in department"
            />
            {activeDepartment.subcategories.map((subcategory) => (
              <FilterButton
                key={subcategory.slug}
                active={search.subcategory === subcategory.slug}
                onClick={() =>
                  onChange({
                    ...search,
                    category: activeDepartment.slug,
                    subcategory: subcategory.slug,
                  })
                }
                label={subcategory.name}
              />
            ))}
          </div>
        </div>
      ) : null}

      {collections.length > 0 ? (
        <div>
          <h2 className="font-sans text-sm font-semibold uppercase tracking-wide">Collections</h2>
          <div className="mt-3 flex flex-col gap-1">
            <FilterButton
              active={!search.collection}
              onClick={() => onChange({ ...search, collection: undefined })}
              label="All collections"
            />
            {collections.map((collection) => (
              <FilterButton
                key={collection.slug}
                active={search.collection === collection.slug}
                onClick={() => onChange({ ...search, collection: collection.slug })}
                label={collection.name}
              />
            ))}
          </div>
        </div>
      ) : null}

      <div>
        <h2 className="font-sans text-sm font-semibold uppercase tracking-wide">Product type</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {FLAGS.map((flag) => (
            <button
              key={flag.value}
              type="button"
              aria-pressed={search.flag === flag.value}
              onClick={() => onChange({ ...search, flag: search.flag === flag.value ? undefined : flag.value })}
              className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                search.flag === flag.value
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border text-muted-foreground hover:border-primary/60"
              }`}
            >
              {flag.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="font-sans text-sm font-semibold uppercase tracking-wide" htmlFor={`${idPrefix}-availability`}>
          Availability
        </label>
        <select
          id={`${idPrefix}-availability`}
          className="mt-3 h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
          value={search.availability ?? ""}
          onChange={(event) =>
            onChange({
              ...search,
              availability: (event.target.value || undefined) as AvailabilityFilter | undefined,
            })
          }
        >
          <option value="">All availability</option>
          {AVAILABILITY.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
      </div>

      <div>
        <label className="font-sans text-sm font-semibold uppercase tracking-wide" htmlFor={`${idPrefix}-fulfilment`}>
          Fulfilment
        </label>
        <select
          id={`${idPrefix}-fulfilment`}
          className="mt-3 h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
          value={search.fulfilment ?? ""}
          onChange={(event) => onChange({ ...search, fulfilment: event.target.value || undefined })}
        >
          <option value="">All fulfilment models</option>
          {FULFILMENTS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
      </div>

      <div>
        <h2 className="font-sans text-sm font-semibold uppercase tracking-wide">Price range (R)</h2>
        <div className="mt-3 flex items-center gap-2">
          <input
            type="number"
            min={0}
            inputMode="numeric"
            aria-label="Minimum price"
            placeholder="Min"
            value={search.min ?? ""}
            onChange={(event) => onChange({ ...search, min: event.target.value ? Number(event.target.value) : undefined })}
            className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
          />
          <input
            type="number"
            min={0}
            inputMode="numeric"
            aria-label="Maximum price"
            placeholder="Max"
            value={search.max ?? ""}
            onChange={(event) => onChange({ ...search, max: event.target.value ? Number(event.target.value) : undefined })}
            className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
          />
        </div>
      </div>

      <Button variant="outline" className="w-full" onClick={() => onChange({ sort: search.sort })}>
        Clear filters
      </Button>
    </div>
  );
}

function FilterButton({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-md px-3 py-2 text-left text-sm transition-colors ${
        active ? "bg-primary text-primary-foreground" : "hover:bg-secondary"
      }`}
    >
      {label}
    </button>
  );
}
