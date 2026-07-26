import { FULFILMENT_LABELS, type FulfilmentType, type StockStatus } from "@/types/catalog";

const STOCK_LABELS: Record<StockStatus, string> = {
  in_stock: "In stock",
  low_stock: "Low stock",
  out_of_stock: "Out of stock",
  backorder: "On backorder",
  made_to_order: "Made to order",
};

const STOCK_TONE: Record<StockStatus, string> = {
  in_stock: "border-success/40 text-success",
  low_stock: "border-warning/50 text-warning",
  out_of_stock: "border-destructive/40 text-destructive",
  backorder: "border-border text-muted-foreground",
  made_to_order: "border-border text-muted-foreground",
};

export function StockBadge({ status }: { status: StockStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${STOCK_TONE[status]}`}
    >
      {STOCK_LABELS[status]}
    </span>
  );
}

export function FulfilmentBadge({ type }: { type: FulfilmentType }) {
  return (
    <span className="inline-flex items-center rounded-full border border-border px-2 py-0.5 text-[11px] text-muted-foreground">
      {FULFILMENT_LABELS[type]}
    </span>
  );
}
