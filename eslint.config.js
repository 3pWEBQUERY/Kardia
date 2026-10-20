import { nextConfig } from '@kardia/config/eslint/next';
import { nodeConfig } from '@kardia/config/eslint/node';

/**
 * Root entry so editors and pre-commit hooks can lint any file.
 * Each package also has its own eslint.config.js for `pnpm --filter <pkg> lint`.
 */
const scoped = (configs, files) =>
  configs.map((config) => {
    const keys = Object.keys(config);
    if (keys.length === 1 && keys[0] === 'ignores') return config;
    return { ...config, files: config.files ?? files };
  });

export default [
  ...scoped(nodeConfig, ['apps/worker/**/*.ts', 'packages/{db,ai,core}/**/*.ts']),
  ...scoped(nextConfig, ['apps/web/**/*.{ts,tsx}', 'packages/ui/**/*.{ts,tsx}']),
];
