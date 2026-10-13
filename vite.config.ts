import { defineConfig } from 'vite';

const repository = process.env.GITHUB_REPOSITORY?.split('/')[1];
export default defineConfig({
  base: process.env.SITE_BASE ?? (repository ? (repository.endsWith('.github.io') ? '/' : `/${repository}/`) : './'),
  build: { outDir: 'dist' },
});
