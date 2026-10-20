import { nodeConfig } from '@kardia/config/eslint/node';

export default [...nodeConfig, { ignores: ['build.mjs', 'dist/**'] }];
