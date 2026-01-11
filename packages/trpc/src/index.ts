// Main entry point for @nexusdialer/trpc package

// Export server utilities
export {
  router,
  publicProcedure,
  protectedProcedure,
  adminProcedure,
  supervisorProcedure,
  agentProcedure,
  createCallerFactory,
  TRPCError,
  type Context,
} from './server';

// Export routers
export { appRouter, type AppRouter } from './routers';
export * from './routers';

// Export client utilities
export { trpc, createTRPCClientConfig, createVanillaClient } from './client';
