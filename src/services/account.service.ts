/**
 * Account / orders data-access layer.
 *
 * Authentication is NOT connected in Phase 1. These functions return honest
 * "not connected" results so the UI never fabricates a signed-in customer,
 * order history or tracking information.
 */
export const AUTH_CONNECTED = false;

export interface AuthResult {
  status: "unavailable";
  message: string;
}

export interface CustomerOrder {
  id: string;
  reference: string;
  placed_at: string;
  status: string;
  total: number;
}

const UNAVAILABLE =
  "Customer accounts are not connected yet. Your details were not submitted or stored on a server.";

async function unavailable(): Promise<AuthResult> {
  await new Promise((resolve) => setTimeout(resolve, 350));
  return { status: "unavailable", message: UNAVAILABLE };
}

export function signIn(_input: { email: string; password: string }) {
  return unavailable();
}

export function register(_input: {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  password: string;
}) {
  return unavailable();
}

export function requestPasswordReset(_input: { email: string }) {
  return unavailable();
}

export async function listOrders(): Promise<CustomerOrder[]> {
  return [];
}

export async function trackOrder(
  _reference: string,
): Promise<{ found: false; reason: "not_connected" }> {
  await new Promise((resolve) => setTimeout(resolve, 350));
  return { found: false, reason: "not_connected" };
}
