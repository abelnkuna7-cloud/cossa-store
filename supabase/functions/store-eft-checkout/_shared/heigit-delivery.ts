export type GeocodePoint = { latitude: number; longitude: number };

type PeliasFeature = {
  geometry?: { coordinates?: [number, number] };
  properties?: Record<string, unknown>;
};

type PeliasResponse = { features?: PeliasFeature[] };

export async function geocodeSouthAfricanAddress(input: {
  apiKey: string;
  address1: string;
  address2?: string;
  suburb: string;
  city: string;
  region: string;
  zip: string;
}) {
  const text = [input.address1, input.address2, input.suburb, input.city, input.region, input.zip, "South Africa"]
    .filter(Boolean)
    .join(", ");
  const url = new URL("https://api.heigit.org/pelias/v1/search");
  url.searchParams.set("text", text);
  url.searchParams.set("boundary.country", "ZAF");
  url.searchParams.set("size", "1");

  const response = await fetch(url, {
    headers: { Authorization: input.apiKey, Accept: "application/json" },
  });
  if (!response.ok) throw new Error("Delivery address could not be geocoded securely.");
  const body = (await response.json()) as PeliasResponse;
  const coordinates = body.features?.[0]?.geometry?.coordinates;
  if (!coordinates || coordinates.length !== 2) {
    throw new Error("Delivery address could not be located precisely enough to calculate delivery.");
  }
  const [longitude, latitude] = coordinates;
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    throw new Error("Delivery address coordinates are invalid.");
  }
  return { latitude, longitude } satisfies GeocodePoint;
}

export async function drivingDistanceKm(input: {
  apiKey: string;
  from: GeocodePoint;
  to: GeocodePoint;
}) {
  const response = await fetch("https://api.heigit.org/openrouteservice/v2/matrix/driving-car", {
    method: "POST",
    headers: {
      Authorization: input.apiKey,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      locations: [
        [input.from.longitude, input.from.latitude],
        [input.to.longitude, input.to.latitude],
      ],
      sources: [0],
      destinations: [1],
      metrics: ["distance"],
      units: "km",
    }),
  });
  if (!response.ok) throw new Error("Delivery distance could not be calculated securely.");
  const body = (await response.json()) as { distances?: number[][] };
  const value = body.distances?.[0]?.[0];
  if (!Number.isFinite(value) || value! < 0) throw new Error("Delivery distance result is invalid.");
  return value!;
}
