import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
const repositoryName = process.env.GITHUB_REPOSITORY?.split('/')[1]
const basePath = process.env.GITHUB_ACTIONS && repositoryName ? `/${repositoryName}/` : '/'

export default defineConfig({
  base: basePath,
  plugins: [react()],
  server: {
    port: 3000,
    open: true
  }
})
