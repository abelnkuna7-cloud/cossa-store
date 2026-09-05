import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";

import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/auth";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Member sign in | Cossa Store" },
      {
        name: "description",
        content: "Sign in or create a Cossa Store account to manage purchases, downloads and Store access.",
      },
      { property: "og:title", content: "Member sign in | Cossa Store" },
      {
        property: "og:description",
        content: "Cossa Store account access for purchases, downloads and catalogue tools.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const { session, loading } = useSession();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [checkEmail, setCheckEmail] = useState(false);
  const [authFlow, setAuthFlow] = useState<"idle" | "checking-mfa" | "mfa">("idle");
  const [mfaFactorId, setMfaFactorId] = useState<string | null>(null);
  const [mfaChallengeId, setMfaChallengeId] = useState<string | null>(null);
  const [mfaCode, setMfaCode] = useState("");
  const [mfaError, setMfaError] = useState<string | null>(null);
  const [adminMfaNotice, setAdminMfaNotice] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setAdminMfaNotice(new URLSearchParams(window.location.search).get("mfa") === "required");
    }
    if (!loading && session && authFlow === "idle") navigate({ to: "/account", replace: true });
  }, [authFlow, loading, session, navigate]);

  function emailConfirmationRedirectUrl() {
    // Keep confirmation links on the Store domain, even if an old Growth
    // preview or bookmarked host opened the auth page.
    return "https://store.cossanexusholdings.co.za/auth";
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);

    if (mode === "signup") {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: emailConfirmationRedirectUrl(),
          data: { full_name: fullName, business_name: businessName, phone },
        },
      });
      setBusy(false);
      if (error) {
        toast.error("Sign up failed", { description: error.message });
        return;
      }
      if (!data.session) {
        setCheckEmail(true);
        toast.success("Check your email", {
          description:
            "If this is a new or unconfirmed Store account, use the newest confirmation link to finish signing up.",
        });
        return;
      }
      navigate({ to: "/account", replace: true });
      return;
    }

    setAuthFlow("checking-mfa");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) {
      if (error.code === "email_not_confirmed") {
        setAuthFlow("idle");
        setMode("signup");
        setCheckEmail(true);
        toast.error("Email address not confirmed", {
          description: "Request a new confirmation email, then use the newest link in your inbox.",
        });
        return;
      }
      setAuthFlow("idle");
      toast.error("Sign in failed", { description: "Check your email address and password." });
      return;
    }

    const { data: factorData, error: factorError } = await supabase.auth.mfa.listFactors();
    const verifiedFactor = factorData?.totp?.find((factor) => factor.status === "verified");
    if (!factorError && verifiedFactor) {
      const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({
        factorId: verifiedFactor.id,
      });
      if (challengeError || !challenge?.id) {
        setAuthFlow("idle");
        await supabase.auth.signOut();
        toast.error("Additional verification unavailable", { description: "Try signing in again or contact Store support." });
        return;
      }
      setMfaFactorId(verifiedFactor.id);
      setMfaChallengeId(challenge.id);
      setMfaCode("");
      setMfaError(null);
      setAuthFlow("mfa");
      setBusy(false);
      return;
    }
    setAuthFlow("idle");
    navigate({ to: "/account", replace: true });
  }

  async function onVerifyMfa(event: React.FormEvent) {
    event.preventDefault();
    if (!mfaFactorId || !mfaChallengeId || !/^\d{6}$/.test(mfaCode)) {
      setMfaError("Enter the current six-digit code from your authenticator app.");
      return;
    }
    setBusy(true);
    setMfaError(null);
    const { error } = await supabase.auth.mfa.verify({
      factorId: mfaFactorId,
      challengeId: mfaChallengeId,
      code: mfaCode,
    });
    if (error) {
      setBusy(false);
      setMfaError("That code was not accepted. Enter the newest code and try again.");
      return;
    }
    await supabase.auth.refreshSession();
    setBusy(false);
    setAuthFlow("idle");
    navigate({ to: "/account", replace: true });
  }

  async function onResendConfirmation() {
    setBusy(true);
    const { error } = await supabase.auth.resend({
      type: "signup",
      email,
      options: { emailRedirectTo: emailConfirmationRedirectUrl() },
    });
    setBusy(false);

    if (error) {
      toast.error("Could not resend confirmation", { description: error.message });
      return;
    }

    toast.success("Confirmation request sent", {
      description:
        "If this Store account still needs confirmation, use the newest email link to finish creating it.",
    });
  }

  return (
    <div>
      <PageHeader
        eyebrow="Members"
        title={mode === "signin" ? "Sign in" : "Create your account"}
        description="Sign in to access your purchases and downloads. Approved catalogue staff can also manage Store products."
      />
      <div className="mx-auto max-w-md px-4 py-10 sm:px-6">
        <div className="mb-4 flex rounded-md border border-border p-1">
          {(["signin", "signup"] as const).map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => {
                setMode(value);
                setCheckEmail(false);
              }}
              className={`flex-1 rounded px-3 py-1.5 text-sm font-medium ${
                mode === value
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {value === "signin" ? "Sign in" : "Sign up"}
            </button>
          ))}
        </div>

        {checkEmail ? (
          <div className="mb-4 flex items-center justify-between gap-3 rounded-md border border-border bg-card px-4 py-3 text-sm text-muted-foreground">
            <p>
              Confirm your email address with the newest link, then sign in. Existing confirmed
              accounts can sign in directly and do not receive another confirmation email.
            </p>
            <Button type="button" variant="outline" size="sm" onClick={onResendConfirmation} disabled={busy}>
              Resend email
            </Button>
          </div>
        ) : null}

        {adminMfaNotice ? (
          <div className="mb-4 rounded-md border border-accent/40 bg-accent/10 px-4 py-3 text-sm text-muted-foreground">
            Administrator access requires the approved owner's authenticator code after sign-in.
          </div>
        ) : null}

        {authFlow === "mfa" ? (
          <form onSubmit={onVerifyMfa} className="space-y-4 rounded-lg border border-border bg-card p-6">
            <div>
              <h2 className="text-lg font-semibold">Additional verification required</h2>
              <p className="mt-2 text-sm text-muted-foreground">Enter the current code from the approved Store administrator's authenticator app.</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="sign-in-totp-code">Authenticator code</Label>
              <Input
                id="sign-in-totp-code"
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="[0-9]{6}"
                maxLength={6}
                value={mfaCode}
                onChange={(event) => setMfaCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
                required
              />
            </div>
            {mfaError ? <p className="text-sm text-destructive">{mfaError}</p> : null}
            <Button type="submit" className="w-full" disabled={busy || mfaCode.length !== 6}>
              {busy ? "Verifying…" : "Verify and continue"}
            </Button>
          </form>
        ) : <form onSubmit={onSubmit} className="space-y-4 rounded-lg border border-border bg-card p-6">
          {mode === "signup" ? (
            <>
              <div className="space-y-2">
                <Label htmlFor="full-name">Full name</Label>
                <Input
                  id="full-name"
                  autoComplete="name"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="business-name">Business name (optional)</Label>
                <Input
                  id="business-name"
                  autoComplete="organization"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone number</Label>
                <Input
                  id="phone"
                  type="tel"
                  autoComplete="tel"
                  placeholder="067 801 1907"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
            </>
          ) : null}
          <div className="space-y-2">
            <Label htmlFor="email">Email address</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              autoComplete={mode === "signin" ? "current-password" : "new-password"}
              minLength={8}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <Button type="submit" className="w-full" disabled={busy}>
            {busy
              ? mode === "signin"
                ? "Signing inâ€¦"
                : "Creating accountâ€¦"
              : mode === "signin"
                ? "Sign in"
                : "Create account"}
          </Button>
          <p className="text-xs text-muted-foreground">
            Customer purchases and digital downloads stay linked to this account. Approved Cossa catalogue staff can manage products through the internal catalogue tools.
          </p>
        </form>}
      </div>
    </div>
  );
}

