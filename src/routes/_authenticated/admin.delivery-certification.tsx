import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

import { CatalogueShell, useCatalogueAccess } from "@/components/admin/CatalogueShell";
import { EmptyBlock } from "@/components/common/StateBlocks";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/admin/delivery-certification")({
  component: DeliveryCertificationPage,
});

type Address = {
  address1: string;
  address2: string;
  suburb: string;
  city: string;
  region: string;
  zip: string;
  country: "ZA";
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
              <CardTitle>Astrum routing test</CardTitle>
              <CardDescription>Use a small approved unpublished Astrum SKU for route/rate certification.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="max-w-md space-y-2">
                <Label htmlFor="supplier-ref">Astrum supplier product reference</Label>
                <Input id="supplier-ref" value={supplierProductRef} onChange={(event) => setSupplierProductRef(event.target.value)} />
              </div>
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
