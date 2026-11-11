import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { viteSingleFile } from 'vite-plugin-singlefile'

// `npm run build` -> normal static build for any host (Netlify, GitHub Pages, S3).
// `npm run build:single` -> one self-contained index.html (used for the shareable demo link).
export default defineConfig(({ mode }) => ({
  base: '/',
  plugins: mode === 'single' ? [react(), viteSingleFile()] : [react()],
  preview: { allowedHosts: true },
  build: { outDir: mode === 'single' ? 'dist-single' : 'dist' },
}))
