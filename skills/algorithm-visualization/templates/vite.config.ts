import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/leetcode-{题号}-{slug}-visualization/',
  server: {
    port: {随机端口}
  }
})
