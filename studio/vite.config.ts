import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Relative Basis, damit der Build auch aus einem Unterordner heraus
// (z. B. GitHub Pages /Traum/studio/) funktioniert.
export default defineConfig({
  base: './',
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
  },
});
