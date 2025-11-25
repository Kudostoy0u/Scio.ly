import { createContext } from "@/lib/trpc/context";
import { appRouter } from "@/lib/trpc/routers/_app";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";

const handler = (req: Request) =>
  fetchRequestHandler({
    endpoint: "/api/trpc",
    req,
    router: appRouter,
    createContext,
    onError:
      process.env.NODE_ENV === "development"
        ? () => {
            // Intentionally empty - error handling disabled in development
          }
        : undefined,
  });

export { handler as GET, handler as POST };
