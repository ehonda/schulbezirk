import { defineConfig } from 'vitest/config';

const repositoryName = process.env.GITHUB_REPOSITORY?.split('/')[1];
const shouldUseProjectBase =
  process.env.GITHUB_ACTIONS === 'true' && Boolean(repositoryName);

export default defineConfig({
  base: shouldUseProjectBase ? `/${repositoryName}/` : '/',
  test: {
    environment: 'node',
    include: ['src/tests/**/*.test.ts']
  }
});
