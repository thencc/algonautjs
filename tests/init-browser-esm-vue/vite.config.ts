import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue()],
  envDir: '../',
  envPrefix: 'NCC_',
  server: {
    port: 5511
  }
})
