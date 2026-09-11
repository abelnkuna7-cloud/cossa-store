import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    // Restore the persisted browser session before validating it.  On a cold
    // navigation getUser() can otherwise run before the client has hydrated
    // local storage, incorrectly sending a signed-in admin through /auth.
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) throw redirect({ to: "/auth" });

    const { data, error } = await supabase.auth.getUser(sessionData.session.access_token);
    if (error || !data.user) throw redirect({ to: "/auth" });
    return { user: data.user };
  },
  component: () => <Outlet />,
});
