import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";

import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useCossaStoreAdminAccess, useSession } from "@/lib/auth";

const OWNER_ID = "fe80a00e-ec49-497f-b28b-c5b984c964b6";
const OWNER_EMAIL = "cossa@cossanexusholdings.co.za";

type TotpFactor = { id: string; status: string; friendly_name?: string | null };

export const Route = createFileRoute("/_authenticated/admin/security")({
  head: () => ({
    meta: [
      { title: "Administrator security | Cossa Store" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminSecurityPage,
});

function AdminSecurityPage() {
  const { user, loading: sessionLoading } = useSession();
  const { isAdmin, loading: accessLoading } = useCossaStoreAdminAccess();
  const [verifiedFactors, setVerifiedFactors] = useState<TotpFactor[]>([]);
  const [factorId, setFactorId] = useState<string | null>(null);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isApprovedOwner = user?.id === OWNER_ID && user.email?.toLowerCase() === OWNER_EMAIL;
  const canManage = isApprovedOwner && isAdmin;
  const canEnroll = verifiedFactors.length < 2 && !qrCode;

  async function loadFactors() {
    setError(null);
    const { data, error: listError } = await supabase.auth.mfa.listFactors();
    if (listError) {
      setError("Authenticator status could not be loaded. Try again.");
      return;
    }
    setVerifiedFactors((data?.totp ?? []).filter((factor) => factor.status === "verified") as TotpFactor[]);
  }

  useEffect(() => {
    if (canManage) void loadFactors();
  }, [canManage]);

  async function startEnrollment() {
    if (!canManage || !canEnroll) return;
    setBusy(true);
    setError(null);
    setMessage(null);
    const { data, error: enrollError } = await supabase.auth.mfa.enroll({
      factorType: "totp",
      friendlyName: verifiedFactors.length === 0 ? "Cossa Store owner authenticator" : "Cossa Store backup authenticator",
    });
    setBusy(false);
    if (enrollError || !data?.id || !data.totp?.qr_code) {
      setError("Authenticator enrollment could not start. No secret was stored or displayed.");
      return;
    }
    setFactorId(data.id);
    setQrCode(data.totp.qr_code);
  }

  async function verifyEnrollment(event: React.FormEvent) {
    event.preventDefault();
    if (!factorId || !/^\d{6}$/.test(code)) {
      setError("Enter the current six-digit code from your authenticator app.");
      return;
    }
    setBusy(true);
    setError(null);
    const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({ factorId });
    if (challengeError || !challenge?.id) {
      setBusy(false);
      setError("The authenticator challenge could not be created. Try again.");
      return;
    }
    const { error: verifyError } = await supabase.auth.mfa.verify({
      factorId,
      challengeId: challenge.id,
      code,
    });
    setBusy(false);
    if (verifyError) {
      setError("That code was not accepted. Enter the newest code and try again.");
      return;
    }
    await supabase.auth.refreshSession();
    setCode("");
    setFactorId(null);
    setQrCode(null);
    setMessage("Authenticator verified. Administrator access now requires this second factor.");
    await loadFactors();
  }

  const heading = useMemo(() => {
    if (sessionLoading || accessLoading) return "Checking administrator access";
    if (!canManage) return "Administrator security";
    return "Administrator security";
  }, [accessLoading, canManage, sessionLoading]);

  if (sessionLoading || accessLoading) {
    return <PageHeader eyebrow="Cossa Store internal" title={heading} description="Checking the protected administrator session…" />;
  }

  if (!canManage) {
    return <PageHeader eyebrow="Cossa Store internal" title="Administrator security" description="This protected page is available only to the verified Store owner." />;
  }

  return (
    <div>
      <PageHeader
        eyebrow="Cossa Store internal"
        title="Administrator security"
        description="Enroll the Store owner's authenticator before administrator access is required to complete a second-factor challenge."
      />
      <div className="mx-auto max-w-2xl space-y-6 px-4 py-10 sm:px-6">
        <section className="rounded-lg border border-border bg-card p-6">
          <h2 className="text-lg font-semibold">Authenticator status</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {verifiedFactors.length === 0
              ? "No verified authenticator is enrolled yet."
              : `${verifiedFactors.length} verified authenticator${verifiedFactors.length === 1 ? "" : "s"} enrolled.`}
          </p>
          {verifiedFactors.length < 2 ? (
            <p className="mt-2 text-sm text-muted-foreground">You may enroll a primary authenticator and one backup authenticator.</p>
          ) : null}
          {!qrCode && verifiedFactors.length < 2 ? (
            <Button className="mt-4" type="button" onClick={startEnrollment} disabled={busy}>
              {busy ? "Preparing enrollment…" : verifiedFactors.length === 0 ? "Start primary enrollment" : "Enroll backup authenticator"}
            </Button>
          ) : null}
        </section>

        {qrCode ? (
          <section className="rounded-lg border border-border bg-card p-6">
            <h2 className="text-lg font-semibold">Scan the authenticator QR code</h2>
            <p className="mt-2 text-sm text-muted-foreground">Scan this code privately with your authenticator app. Never send the QR code, secret, or one-time code to anyone.</p>
            <div className="mt-5 flex justify-center rounded-md bg-white p-4">
              <img src={qrCode} alt="Private authenticator enrollment QR code" className="h-56 w-56" />
            </div>
            <form onSubmit={verifyEnrollment} className="mt-5 space-y-3">
              <Label htmlFor="owner-totp-code">Current six-digit code</Label>
              <Input
                id="owner-totp-code"
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="[0-9]{6}"
                maxLength={6}
                value={code}
                onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
                required
              />
              <Button type="submit" disabled={busy || code.length !== 6}>
                {busy ? "Verifying…" : "Verify authenticator"}
              </Button>
            </form>
          </section>
        ) : null}

        {message ? <p className="rounded-md border border-emerald-500/40 bg-emerald-500/10 p-4 text-sm text-emerald-200">{message}</p> : null}
        {error ? <p className="rounded-md border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">{error}</p> : null}
        <p className="text-xs text-muted-foreground">This page never displays or logs the authenticator secret. Enrollment is bound to the approved owner account and is not available to customers or ordinary staff.</p>
      </div>
    </div>
  );
}
