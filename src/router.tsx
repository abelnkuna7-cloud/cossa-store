import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { initAnalytics, trackPageView } from "@/lib/analytics";
import { routeTree } from "./routeTree.gen";

export const getRouter = () => {
  const queryClient = new QueryClient();

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
  });

  if (typeof window !== "undefined") {
    initAnalytics();

    const sendPageView = () => {
      const location = router.state.location;
      trackPageView(`${location.pathname}${location.searchStr}${location.hash}`, document.title);
    };

    sendPageView();
    router.subscribe("onResolved", sendPageView);
  }

  return router;
};
