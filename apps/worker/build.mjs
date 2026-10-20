import { build } from 'esbuild';

/**
 * Bündelt den Worker zu einer Datei (`node dist/worker.js`, PRD 10.2). Workspace-Pakete
 * (@kardia/*, auch der generierte Prisma-Client) werden eingebunden; native bzw.
 * dynamisch geladene Pakete bleiben extern und kommen aus node_modules.
 */
await build({
  entryPoints: ['src/worker.ts'],
  outfile: 'dist/worker.js',
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node22',
  sourcemap: true,
  jsx: 'automatic',
  logLevel: 'warning',
  banner: {
    js: [
      "import { createRequire as __kardiaCreateRequire } from 'node:module';",
      "import { fileURLToPath as __kardiaFileURLToPath } from 'node:url';",
      "import { dirname as __kardiaDirname } from 'node:path';",
      'const require = __kardiaCreateRequire(import.meta.url);',
      'const __filename = __kardiaFileURLToPath(import.meta.url);',
      'const __dirname = __kardiaDirname(__filename);',
    ].join('\n'),
  },
  external: [
    'pg-native',
    'pg-boss',
    'unpdf',
    '@sentry/node',
    'web-push',
    '@aws-sdk/*',
  ],
});
