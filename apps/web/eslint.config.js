import { nextConfig } from '@kardia/config/eslint/next';

export default [...nextConfig, { ignores: ['scripts/**'] }];
