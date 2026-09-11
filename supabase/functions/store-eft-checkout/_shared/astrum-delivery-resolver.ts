import { ASTRUM_BRANCHES, ASTRUM_MAIN_CENTRES, type AstrumBranch } from "./delivery-intelligence.ts";
import { drivingDistanceKm, geocodeSouthAfricanAddress, type GeocodePoint } from "./heigit-delivery.ts";

export type AstrumAddress = {
  address1: string;
  address2?: string;
  suburb: string;
  city: string;
  region: string;
  zip: string;
};

export type AstrumResolvedDelivery = {
  methodCode: "astrum_local" | "astrum_main_centre" | "astrum_rest_sa";
  destinationClass: "local" | "main_centre" | "rest_sa";
  nearestBranchCode: AstrumBranch["code"];
  nearestBranchDistanceKm: number;
  evidence: {
    resolver: "heigit-openrouteservice";
    distanceType: "driving";
    customerGeocoded: true;
    evaluatedAt: string;
  };
};

const branchPointCache = new Map<AstrumBranch["code"], GeocodePoint>();

function normalise(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

async function branchPoint(apiKey: string, branch: AstrumBranch): Promise<GeocodePoint> {
  const cached = branchPointCache.get(branch.code);
  if (cached) return cached;
  const point = await geocodeSouthAfricanAddress({
    apiKey,
    address1: branch.address,
    suburb: branch.name,
    city: branch.code === "midrand" ? "Midrand" : branch.code === "durban" ? "Durban" : "Cape Town",
    region: branch.code === "midrand" ? "Gauteng" : branch.code === "durban" ? "KwaZulu-Natal" : "Western Cape",
    zip: branch.code === "midrand" ? "1685" : branch.code === "durban" ? "4037" : "7447",
  });
  branchPointCache.set(branch.code, point);
  return point;
}

export async function resolveAstrumDelivery(address: AstrumAddress): Promise<AstrumResolvedDelivery> {
  const apiKey = Deno.env.get("OPENROUTESERVICE_API_KEY")?.trim();
  if (!apiKey) {
    throw new Error("Astrum delivery distance service is not configured.");
  }

  const customer = await geocodeSouthAfricanAddress({ apiKey, ...address });
  const evaluated = await Promise.all(
    ASTRUM_BRANCHES.map(async (branch) => {
      const from = await branchPoint(apiKey, branch);
      const distanceKm = await drivingDistanceKm({ apiKey, from, to: customer });
      return { branch, distanceKm };
    }),
  );
  evaluated.sort((left, right) => left.distanceKm - right.distanceKm);
  const nearest = evaluated[0];
  if (!nearest || !Number.isFinite(nearest.distanceKm)) {
    throw new Error("Astrum delivery distance could not be resolved safely.");
  }

  const common = {
    nearestBranchCode: nearest.branch.code,
    nearestBranchDistanceKm: Math.round(nearest.distanceKm * 100) / 100,
    evidence: {
      resolver: "heigit-openrouteservice" as const,
      distanceType: "driving" as const,
      customerGeocoded: true as const,
      evaluatedAt: new Date().toISOString(),
    },
  };

  if (nearest.distanceKm <= 30) {
    return { ...common, methodCode: "astrum_local", destinationClass: "local" };
  }

  if (ASTRUM_MAIN_CENTRES.has(normalise(address.city))) {
    return { ...common, methodCode: "astrum_main_centre", destinationClass: "main_centre" };
  }

  return { ...common, methodCode: "astrum_rest_sa", destinationClass: "rest_sa" };
}
