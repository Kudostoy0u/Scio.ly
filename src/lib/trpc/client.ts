import { createTRPCReact, httpBatchLink } from '@trpc/react-query';
import { type AppRouter } from './routers/_app';
import superjson from 'superjson';

export const trpc = createTRPCReact<AppRouter>();

export function getTRPCClient() {
  return trpc.createClient({
    links: [
      httpBatchLink({
        url: '/api/trpc',
        transformer: superjson,
        // Enable batching with a small delay to collect multiple requests
        maxURLLength: 2083,
        // Batch requests that occur within 10ms
        // This allows React to render multiple components and batch their data fetches
        headers: () => {
          return {
            'Content-Type': 'application/json',
          };
        },
      }),
    ],
  });
}

