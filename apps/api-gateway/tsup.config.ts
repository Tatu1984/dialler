import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  dts: true,
  clean: true,
  sourcemap: true,
  target: 'node22',
  external: [
    'drizzle-orm',
    'postgres',
    'argon2',
    '@fastify/cors',
    '@fastify/jwt',
    '@fastify/cookie',
    '@fastify/rate-limit',
    '@fastify/websocket',
    'fastify',
    'ioredis',
    'socket.io',
    '@nexusdialer/database',
    '@nexusdialer/events',
    '@nexusdialer/types',
    '@nexusdialer/utils',
  ],
});
