import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'node:path'

// Khi chạy `npm run dev`, mọi yêu cầu /api được chuyển tiếp sang backend Express (cổng 5000).
// Nhờ vậy trình duyệt chỉ làm việc với một địa chỉ (localhost:5173) nên không gặp lỗi CORS.
const API = process.env.VITE_PROXY_TARGET || 'http://127.0.0.1:5000'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: { alias: { '@': path.resolve(__dirname, './src') } },
  server: { port: 5173, proxy: { '/api': { target: API, changeOrigin: true }, '/uploads': { target: API, changeOrigin: true } } },
  preview: { port: 4173, proxy: { '/api': { target: API, changeOrigin: true }, '/uploads': { target: API, changeOrigin: true } } },
})
