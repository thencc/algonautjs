import { defineConfig } from 'vite'

// https://vitejs.dev/config/
export default defineConfig({
  envDir: '../',
  envPrefix: 'NCC_',
  server: {
    port: 5512
  }
})
