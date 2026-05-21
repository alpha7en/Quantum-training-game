import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
const repositoryParts = process.env.GITHUB_REPOSITORY?.split('/')
const repositoryName = repositoryParts && repositoryParts.length > 1 ? repositoryParts[1] : undefined
const basePath = process.env.GITHUB_ACTIONS && repositoryName ? `/${repositoryName}/` : '/'

export default defineConfig({
  base: basePath,
  plugins: [react()],
  server: {
    port: 3000,
    open: true
  }
})
