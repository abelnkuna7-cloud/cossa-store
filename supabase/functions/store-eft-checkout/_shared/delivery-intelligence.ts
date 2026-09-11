export type GeoPoint = { latitude: number; longitude: number };

export type AstrumBranch = {
  code: "midrand" | "durban" | "cape_town";
  name: string;
  address: string;
};

export const ASTRUM_BRANCHES: AstrumBranch[] = [
  {
    code: "midrand",
    name: "Astrum Midrand",
    address: "Unit 4, Richards Park, 35 Richards Drive, Midrand, South Africa",
  },
  {
    code: "durban",
    name: "Astrum Durban",
    address: "Unit 4, Origin Park, 14 Riverhorse Close, Riverhorse Valley, 4037, South Africa",
  },
  {
    code: "cape_town",
    name: "Astrum Cape Town",
    address: "Unit 4, Creation Park, Computer Road, Marconi Beam, 7447, South Africa",
  },
];

export const ASTRUM_MAIN_CENTRES = new Set([
  "durban",
  "johannesburg",
  "cape town",
  "bloemfontein",
  "east london",
  "port elizabeth",
  "nelspruit",
  "polokwane",
  "kimberley",
  "newcastle",
  "pietermaritzburg",
  "george",
]);

export type AstrumDestinationClass = "local" | "main_centre" | "rest_sa" | "manual_quote";

export type AstrumDestinationDecision = {
  destinationClass: AstrumDestinationClass;
  nearestBranchCode: AstrumBranch["code"] | null;
  nearestBranchDistanceKm: number | null;
  methodCode: "astrum_local" | "astrum_main_centre" | "astrum_rest_sa" | null;
  reason: string;
};

function radians(value: number) {
  return (value * Math.PI) / 180;
}

export function haversineDistanceKm(from: GeoPoint, to: GeoPoint) {
  const radiusKm = 6371.0088;
  const latitudeDelta = radians(to.latitude - from.latitude);
  const longitudeDelta = radians(to.longitude - from.longitude);
  const fromLatitude = radians(from.latitude);
  const toLatitude = radians(to.latitude);
  const h =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(fromLatitude) * Math.cos(toLatitude) * Math.sin(longitudeDelta / 2) ** 2;
  return radiusKm * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

function normalisePlace(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

export function classifyAstrumDestination(input: {
  customer: GeoPoint;
  city: string;
  branchPoints: Array<{ code: AstrumBranch["code"]; point: GeoPoint }>;
  totalWeightKg: number | null;
}): AstrumDestinationDecision {
  if (
    typeof input.totalWeightKg === "number" &&
    Number.isFinite(input.totalWeightKg) &&
    input.totalWeightKg > 15
  ) {
    return {
      destinationClass: "manual_quote",
      nearestBranchCode: null,
      nearestBranchDistanceKm: null,
      methodCode: null,
      reason: "Astrum states that volumetric surcharge may apply beyond 15kg.",
    };
  }

  const distances = input.branchPoints
    .map((branch) => ({
      code: branch.code,
      distanceKm: haversineDistanceKm(input.customer, branch.point),
    }))
    .sort((left, right) => left.distanceKm - right.distanceKm);

  const nearest = distances[0] ?? null;
  if (nearest && nearest.distanceKm <= 30) {
    return {
      destinationClass: "local",
      nearestBranchCode: nearest.code,
      nearestBranchDistanceKm: nearest.distanceKm,
      methodCode: "astrum_local",
      reason: "Customer is within Astrum's verified 30km local radius.",
    };
  }

  if (ASTRUM_MAIN_CENTRES.has(normalisePlace(input.city))) {
    return {
      destinationClass: "main_centre",
      nearestBranchCode: nearest?.code ?? null,
      nearestBranchDistanceKm: nearest?.distanceKm ?? null,
      methodCode: "astrum_main_centre",
      reason: "Customer city is in Astrum's verified main-centre list.",
    };
  }

  return {
    destinationClass: "rest_sa",
    nearestBranchCode: nearest?.code ?? null,
    nearestBranchDistanceKm: nearest?.distanceKm ?? null,
    methodCode: "astrum_rest_sa",
    reason: "Customer is outside the 30km branch radius and not in Astrum's main-centre list.",
  };
}

export function validateDmcParcelEvidence(input: {
  lengthCm: number | null;
  widthCm: number | null;
  heightCm: number | null;
  weightKg: number | null;
}) {
  const values = [input.lengthCm, input.widthCm, input.heightCm, input.weightKg];
  if (values.some((value) => typeof value !== "number" || !Number.isFinite(value) || value <= 0)) {
    return { ready: false as const, reason: "missing_or_invalid_measurements" as const };
  }

  const dimensions = [input.lengthCm!, input.widthCm!, input.heightCm!].sort((a, b) => b - a);
  const fitsPudoXl = dimensions[0] <= 69 && dimensions[1] <= 60 && dimensions[2] <= 41;
  const underWeightLimit = input.weightKg! < 20;

  return {
    ready: fitsPudoXl && underWeightLimit,
    reason:
      fitsPudoXl && underWeightLimit
        ? ("standard_rate_eligible" as const)
        : ("manual_quote_required" as const),
    fitsPudoXl,
    underWeightLimit,
  };
}
