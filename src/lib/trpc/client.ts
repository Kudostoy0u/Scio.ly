import { createTRPCReact, httpBatchLink } from "@trpc/react-query";
import superjson from "superjson";
import type { AppRouter } from "./routers/_app";

export const trpc = createTRPCReact<AppRouter>();
export const api = trpc;
export type TRPCUtils = ReturnType<typeof trpc.useUtils>;

export function getTRPCClient() {
  return trpc.createClient({
    links: [
      httpBatchLink({
        url: "/api/trpc",
        transformer: superjson,
        // Enable batching with a small delay to collect multiple requests
        maxURLLength: 2083,
        // Batch requests that occur within 10ms
        // This allows React to render multiple components and batch their data fetches
        headers: () => {
          return {
            "Content-Type": "application/json",
          };
        },
        // Include credentials for authentication
        fetch: (url, options) => {
          return fetch(url, {
            ...options,
            credentials: "include", // This ensures cookies are sent with the request
          });
        },
      }),
    ],
  });
}
