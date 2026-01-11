import { createTRPCReact, httpBatchLink } from '@trpc/react-query';
import { createTRPCClient } from '@trpc/client';
import superjson from 'superjson';
import type { AppRouter } from './routers';

/**
 * React hooks client for tRPC
 */
export const trpc = createTRPCReact<AppRouter>();

/**
 * Create tRPC client configuration
 */
export function createTRPCClientConfig(apiUrl: string) {
  return {
    links: [
      httpBatchLink({
        url: `${apiUrl}/trpc`,
        transformer: superjson,
        headers: () => ({
          // Add auth headers here
        }),
        fetch: (url, options) => {
          return fetch(url, {
            ...options,
            credentials: 'include',
          });
        },
      }),
    ],
  };
}

/**
 * Vanilla tRPC client (for non-React usage)
 */
export function createVanillaClient(apiUrl: string) {
  return createTRPCClient<AppRouter>(createTRPCClientConfig(apiUrl));
}

// Re-export types for convenience
export type { AppRouter } from './routers';
