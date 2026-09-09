export interface AdminSessionRotationInput {
  hasActiveSession: boolean;
  sameSession: boolean;
  timedOut: boolean;
  incomingIssuedAt: number;
  existingIssuedAt: number;
}

/**
 * Fail closed for the current/stale session, while allowing a strictly newer
 * authenticated session to replace an expired or revoked registry row.
 */
export function shouldRejectAdminSessionRotation(input: AdminSessionRotationInput): boolean {
  if (!input.hasActiveSession) return false;
  if (input.sameSession) return input.timedOut;
  return input.incomingIssuedAt <= input.existingIssuedAt;
}
