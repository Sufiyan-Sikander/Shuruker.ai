import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': process.env.VITE_API_URL || 'http://127.0.0.1:5000',
      '/verify-token': process.env.VITE_API_URL || 'http://127.0.0.1:5000',
      '/data': process.env.VITE_API_URL || 'http://127.0.0.1:5000',
      '/static': process.env.VITE_API_URL || 'http://127.0.0.1:5000',
      '/logout': process.env.VITE_API_URL || 'http://127.0.0.1:5000',
    },
  },
});