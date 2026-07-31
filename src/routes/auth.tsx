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
        content: "Sign in or create a Cossa Store member account to list and manage products.",
      },
      { property: "og:title", content: "Member sign in | Cossa Store" },
      {
        property: "og:description",
        content: "Cossa Store member access for catalogue and product listing tools.",
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

  useEffect(() => {
    if (!loading && session) navigate({ to: "/admin/catalogue", replace: true });
  }, [loading, session, navigate]);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);

    if (mode === "signup") {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth`,
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
        toast.success("Account created", {
          description: "Check your inbox and confirm your email address to finish signing up.",
        });
        return;
      }
      navigate({ to: "/admin/catalogue", replace: true });
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) {
      toast.error("Sign in failed", { description: "Check your email address and password." });
      return;
    }
    navigate({ to: "/admin/catalogue", replace: true });
  }

  return (
    <div>
      <PageHeader
        eyebrow="Members"
        title={mode === "signin" ? "Sign in" : "Create your account"}
        description="Cossa Store member access — list and manage your own products."
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
          <p className="mb-4 rounded-md border border-border bg-card px-4 py-3 text-sm text-muted-foreground">
            Almost there — confirm your email address using the link we sent, then sign in.
          </p>
        ) : null}

        <form onSubmit={onSubmit} className="space-y-4 rounded-lg border border-border bg-card p-6">
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
                ? "Signing in…"
                : "Creating account…"
              : mode === "signin"
                ? "Sign in"
                : "Create account"}
          </Button>
          <p className="text-xs text-muted-foreground">
            Members can capture their own products (print-on-demand, dropshipping, affiliate,
            services and stocked goods). Listings go live once a Cossa administrator approves them.
          </p>
        </form>
      </div>
    </div>
  );
}
