/**
 * Provider-neutral delivery adapter boundary.
 *
 * This module deliberately contains no provider credentials and is not wired
 * into checkout until a reviewed sandbox/live adapter is available. Growth or
 * a future server worker can implement this interface without changing Store
 * checkout or exposing supplier/provider details to the browser.
 */

export type DeliveryDestination = {
  address1: string;
  suburb: string;
  city: string;
  region: string;
  postalCode: string;
  country: "ZA";
};

export type DeliveryParcel = {
  lengthCm: number;
  widthCm: number;
  heightCm: number;
  weightKg: number;
  quantity?: number;
};

export type DeliveryProviderResult =
  | { status: "eligible"; provider: string; serviceCode?: string; metadata?: Record<string, unknown> }
  | { status: "surcharge_required" | "unsupported" | "unknown"; provider: string; reason?: string };

export type DeliveryProviderAdapter = {
  getDeliveryRates(input: {
    collection: DeliveryDestination;
    destination: DeliveryDestination;
    parcels: DeliveryParcel[];
    servicePreference?: string;
  }): Promise<DeliveryProviderResult>;
  resolveDestination(input: {
    collection: DeliveryDestination;
    destination: DeliveryDestination;
  }): Promise<DeliveryProviderResult>;
  getPickupPoints(input: { destination: DeliveryDestination }): Promise<{
    status: "available" | "unavailable";
    provider: string;
    points: Array<{ id: string; label: string; address?: string }>;
  }>;
};

/**
 * Safe default used until a provider sandbox credential and reviewed adapter
 * are supplied. It makes the absence of provider access explicit and keeps
 * checkout on the genuine exception path instead of guessing a rate.
 */
export function unavailableDeliveryProvider(provider = "unconfigured"):
  DeliveryProviderAdapter {
  const unavailable = async (): Promise<DeliveryProviderResult> => ({
    status: "unknown",
    provider,
    reason: "No reviewed provider adapter or credential is configured.",
  });

  return {
    getDeliveryRates: unavailable,
    resolveDestination: unavailable,
    getPickupPoints: async () => ({ status: "unavailable", provider, points: [] }),
  };
}
