from pathlib import Path


def replace_once(path: str, old: str, new: str) -> None:
    file = Path(path)
    text = file.read_text(encoding="utf-8")
    if new in text:
        return
    if old not in text:
        raise SystemExit(f"Expected text not found in {path}: {old[:100]!r}")
    file.write_text(text.replace(old, new, 1), encoding="utf-8")


replace_once(
    "src/routes/index.tsx",
    '[ShieldCheck, "Payment truth", "Payment methods are presented as available only when the relevant merchant verification and production integration are complete."],',
    '[ShieldCheck, "Secure payments", "Pay securely at checkout using the payment options currently available for your order. Available methods may vary as we continue expanding our payment options."],',
)

replace_once(
    "src/components/layout/SiteHeader.tsx",
    '<div className="grid grid-cols-4 gap-0 divide-x divide-border">',
    '<div className="divide-y divide-border">',
)

replace_once(
    "src/components/layout/SiteHeader.tsx",
    '<div className="space-y-1">',
    '<div className="flex flex-wrap gap-2">',
)

replace_once(
    "src/components/layout/SiteHeader.tsx",
    'className="group flex items-center justify-between gap-2 rounded-md px-2 py-2 text-sm text-foreground/80 transition-colors hover:bg-secondary hover:text-foreground"',
    'className="group inline-flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm text-foreground/80 transition-colors hover:border-primary hover:bg-secondary hover:text-foreground"',
)

print("Store experience completion patch applied safely.")
