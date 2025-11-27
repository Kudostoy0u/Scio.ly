/**
 * tRPC Client for Team Store
 */

import type { AppRouter } from "@/lib/trpc/routers/_app";
import { createTRPCProxyClient, httpBatchLink } from "@trpc/client";
import superjson from "superjson";

export const trpcClient = createTRPCProxyClient<AppRouter>({
  links: [
    httpBatchLink({
      url: "/api/trpc",
      transformer: superjson,
      headers: () => ({
        "Content-Type": "application/json",
      }),
      fetch: (url, options) => {
        return fetch(url, {
          ...options,
          credentials: "include",
        });
      },
    }),
  ],
});
