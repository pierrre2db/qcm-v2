import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    https: false, // set to true with mkcert for local HTTPS if needed
    port: 5173,
  },
  base: '/qcm-v2/',
})
