import { ASTRUM_BRANCHES, classifyAstrumDestination, haversineDistanceKm, validateDmcParcelEvidence } from "./delivery-intelligence.ts";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

Deno.test("haversine returns zero for identical points", () => {
  assert(haversineDistanceKm({ latitude: -25.99, longitude: 28.13 }, { latitude: -25.99, longitude: 28.13 }) === 0, "distance should be zero");
});

Deno.test("Astrum local classification wins within 30km", () => {
  const result = classifyAstrumDestination({
    customer: { latitude: -25.99, longitude: 28.13 },
    city: "Midrand",
    branchPoints: [{ code: "midrand", point: { latitude: -25.99, longitude: 28.13 } }],
    totalWeightKg: 2,
  });
  assert(result.destinationClass === "local", "expected local");
  assert(result.methodCode === "astrum_local", "expected local method");
});

Deno.test("Astrum main centre classification applies outside local radius", () => {
  const result = classifyAstrumDestination({
    customer: { latitude: -26.2041, longitude: 28.0473 },
    city: "Johannesburg",
    branchPoints: [{ code: "cape_town", point: { latitude: -33.9249, longitude: 18.4241 } }],
    totalWeightKg: 2,
  });
  assert(result.destinationClass === "main_centre", "expected main centre");
  assert(result.methodCode === "astrum_main_centre", "expected main centre method");
});

Deno.test("Astrum >15kg requires manual quote", () => {
  const result = classifyAstrumDestination({
    customer: { latitude: -25.99, longitude: 28.13 },
    city: "Midrand",
    branchPoints: [{ code: "midrand", point: { latitude: -25.99, longitude: 28.13 } }],
    totalWeightKg: 15.01,
  });
  assert(result.destinationClass === "manual_quote", "expected manual quote");
});

Deno.test("DMC PUDO XL eligibility accepts verified in-bounds parcel", () => {
  const result = validateDmcParcelEvidence({ lengthCm: 40, widthCm: 30, heightCm: 20, weightKg: 5 });
  assert(result.ready, "expected ready");
});

Deno.test("DMC missing or oversized parcel does not silently quote", () => {
  const missing = validateDmcParcelEvidence({ lengthCm: null, widthCm: 30, heightCm: 20, weightKg: 5 });
  assert(!missing.ready && missing.reason === "missing_or_invalid_measurements", "missing evidence should block");
  const oversized = validateDmcParcelEvidence({ lengthCm: 80, widthCm: 30, heightCm: 20, weightKg: 5 });
  assert(!oversized.ready && oversized.reason === "manual_quote_required", "oversized parcel should require quote");
});

Deno.test("official Astrum branch list is complete", () => {
  assert(ASTRUM_BRANCHES.length === 3, "expected three branches");
});
