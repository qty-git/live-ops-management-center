import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  base:
    command === 'build'
      ? (process.env.VITE_DEPLOY_BASE ?? '/live-ops-management-center/')
      : '/',
  plugins: [react()],
}))
