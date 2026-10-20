import globals from 'globals';
import tseslint from 'typescript-eslint';

import { baseConfig } from './base.js';

/** ESLint config for Node services (worker, packages, scripts). */
export const nodeConfig = tseslint.config(...baseConfig, {
  languageOptions: {
    globals: { ...globals.node },
  },
  rules: {
    '@typescript-eslint/require-await': 'off',
  },
});

export default nodeConfig;
