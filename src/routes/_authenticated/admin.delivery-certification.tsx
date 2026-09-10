import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

import { CatalogueShell, useCatalogueAccess } from "@/components/admin/CatalogueShell";
import { EmptyBlock, LoadingBlock } from "@/components/common/StateBlocks";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/admin/delivery-certification")({
  component: DeliveryCertificationPage,
});

const ASTRUM_SUPPLIER_ID = "3b625ee7-25d4-4604-afd5-2a0909ac04b6";

type Address = {
  address1: string;
  address2: string;
  suburb: string;
  city: string;
  region: string;
  zip: string;
  country: "ZA";
};

type AstrumIntake = {
  id: string;
  name: string;
  supplier_product_ref: string;
  supplier_available_stock: number | string | null;
  selling_price_override: number | string | null;
  approval_status: string;
  publication_store_product_id: string | null;
};

type Result = {
  ok?: boolean;
  error?: string;
  destination?: { class: string; nearestBranchCode: string; nearestBranchDistanceKm: number };
  rate?: { methodCode: string; customerLabel: string; amount: number; currency: string };
  safety?: { fullCheckoutCertificationPassed: boolean; reason: string };
  intake?: { name: string; supplierProductRef: string };
};

const CASES: Array<{ label: string; expected: string; amount: number; address: Address }> = [
  {
    label: "Local — Midrand branch",
    expected: "local",
    amount: 103.5,
    address: {
      address1: "35 Richards Drive",
      address2: "",
      suburb: "Halfway House",
      city: "Midrand",
      region: "Gauteng",
      zip: "1685",
      country: "ZA",
    },
  },
  {
    label: "Main centre — Bloemfontein",
    expected: "main_centre",
    amount: 172.5,
    address: {
      address1: "1 Nelson Mandela Drive",
      address2: "",
      suburb: "Westdene",
      city: "Bloemfontein",
      region: "Free State",
      zip: "9301",
      country: "ZA",
    },
  },
  {
    label: "Rest of SA — Potchefstroom",
    expected: "rest_sa",
    amount: 287.5,
    address: {
      address1: "1 Nelson Mandela Drive",
      address2: "",
      suburb: "Potchefstroom Central",
      city: "Potchefstroom",
      region: "North West",
      zip: "2531",
      country: "ZA",
    },
  },
];

function DeliveryCertificationPage() {
  const access = useCatalogueAccess();
  const [supplierProductRef, setSupplierProductRef] = useState("A11561-B");
  const [running, setRunning] = useState<string | null>(null);
  const [results, setResults] = useState<Record<string, Result>>({});

  const stockQuery = useQuery({
    queryKey: ["astrum-delivery-certification-stock"],
    enabled: access.isAdmin,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("store_inventory_intakes")
        .select("id,name,supplier_product_ref,supplier_available_stock,selling_price_override,approval_status,publication_store_product_id")
        .eq("supplier_id", ASTRUM_SUPPLIER_ID)
        .eq("approval_status", "approved")
        .is("publication_store_product_id", null)
        .gt("supplier_available_stock", 0)
        .order("name", { ascending: true })
        .limit(100);
      if (error) throw error;
      return (data ?? []) as AstrumIntake[];
    },
  });

  const runCase = async (testCase: (typeof CASES)[number]) => {
    setRunning(testCase.label);
    setResults((current) => ({ ...current, [testCase.label]: {} }));
    const { data, error } = await supabase.functions.invoke("store-delivery-certification", {
      body: {
        supplierProductRef: supplierProductRef.trim(),
        shippingAddress: testCase.address,
      },
    });
    const result: Result = error
      ? { error: error.message || "Certification request failed." }
      : ((data ?? {}) as Result);
    setResults((current) => ({ ...current, [testCase.label]: result }));
    setRunning(null);
  };

  const runAll = async () => {
    for (const testCase of CASES) await runCase(testCase);
  };

  return (
    <CatalogueShell
      title="Delivery certification"
      description="Admin-only, read-only routing checks for approved unpublished Astrum products. These tests do not publish stock, create orders or create EFT requests."
    >
      {!access.isAdmin ? (
        <EmptyBlock title="Administrator access required" description="Delivery certification is restricted to Cossa administrators." />
      ) : (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Approved Astrum stock</CardTitle>
              <CardDescription>Select one of the approved, unpublished Astrum products with live supplier stock. Nothing on this page publishes a product.</CardDescription>
            </CardHeader>
            <CardContent>
              {stockQuery.isPending ? (
                <LoadingBlock label="Loading approved Astrum stock…" />
              ) : stockQuery.error ? (
                <p className="text-sm text-destructive">Could not load Astrum stock: {stockQuery.error instanceof Error ? stockQuery.error.message : "Unknown error"}</p>
              ) : (stockQuery.data ?? []).length === 0 ? (
                <EmptyBlock title="No approved unpublished Astrum stock visible" description="The admin session may not have read access to the intake records, or no matching stock currently passes the filter." />
              ) : (
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {(stockQuery.data ?? []).map((item) => {
                    const selected = supplierProductRef === item.supplier_product_ref;
                    return (
                      <button
                        type="button"
                        key={item.id}
                        onClick={() => {
                          setSupplierProductRef(item.supplier_product_ref);
                          setResults({});
                        }}
                        className={`rounded-lg border p-4 text-left transition ${selected ? "border-primary ring-1 ring-primary" : "hover:border-foreground/30"}`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <strong className="text-sm leading-5">{item.name}</strong>
                          {selected ? <Badge>Selected</Badge> : null}
                        </div>
                        <p className="mt-2 text-xs text-muted-foreground">Ref: {item.supplier_product_ref}</p>
                        <p className="mt-1 text-xs">Supplier stock: <strong>{Number(item.supplier_available_stock ?? 0)}</strong></p>
                        {item.selling_price_override != null ? <p className="mt-1 text-xs">Cossa price: <strong>R{Number(item.selling_price_override).toFixed(2)}</strong></p> : null}
                      </button>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Astrum routing test</CardTitle>
              <CardDescription>Selected supplier product reference: <strong>{supplierProductRef}</strong></CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button onClick={runAll} disabled={Boolean(running) || supplierProductRef.trim().length < 2}>
                {running ? `Testing ${running}…` : "Run all three routing tests"}
              </Button>
              <p className="text-xs text-muted-foreground">Expected charges: Local R103.50 · Main centre R172.50 · Rest of SA R287.50.</p>
            </CardContent>
          </Card>

          <div className="grid gap-4 lg:grid-cols-3">
            {CASES.map((testCase) => {
              const result = results[testCase.label];
              const pass = Boolean(result?.ok && result.destination?.class === testCase.expected && Number(result.rate?.amount) === testCase.amount);
              return (
                <Card key={testCase.label}>
                  <CardHeader>
                    <div className="flex items-center justify-between gap-2">
                      <CardTitle className="text-base">{testCase.label}</CardTitle>
                      {result?.ok ? <Badge variant={pass ? "default" : "destructive"}>{pass ? "PASS" : "CHECK"}</Badge> : null}
                    </div>
                    <CardDescription>{testCase.address.city}, {testCase.address.region}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    <Button variant="outline" size="sm" onClick={() => runCase(testCase)} disabled={Boolean(running)}>
                      Test this route
                    </Button>
                    {result?.error ? <p className="text-destructive">{result.error}</p> : null}
                    {result?.ok ? (
                      <div className="space-y-1">
                        <p><strong>Class:</strong> {result.destination?.class}</p>
                        <p><strong>Nearest branch:</strong> {result.destination?.nearestBranchCode}</p>
                        <p><strong>Driving distance:</strong> {result.destination?.nearestBranchDistanceKm} km</p>
                        <p><strong>Rate:</strong> {result.rate?.currency} {Number(result.rate?.amount ?? 0).toFixed(2)}</p>
                        <p><strong>Method:</strong> {result.rate?.methodCode}</p>
                        <p className="pt-2 text-xs text-muted-foreground">{result.safety?.reason}</p>
                      </div>
                    ) : null}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}
    </CatalogueShell>
  );
}
