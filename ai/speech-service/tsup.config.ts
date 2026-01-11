import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  target: 'es2022',
  outDir: 'dist',
  clean: true,
  sourcemap: true,
  dts: false,
  splitting: false,
  bundle: true,
  external: [
    '@nexusdialer/database',
    '@nexusdialer/events',
    '@nexusdialer/types',
    'drizzle-orm',
  ],
});
