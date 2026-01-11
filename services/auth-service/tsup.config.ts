import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  dts: false,
  clean: true,
  sourcemap: true,
  target: 'node22',
  external: [
    'drizzle-orm',
    'argon2',
    '@fastify/cors',
    '@fastify/jwt',
    'fastify',
    '@nexusdialer/database',
    '@nexusdialer/types',
  ],
});
