import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Feste Basis für GitHub Pages (Projektseite unter /Traum/studio/).
// Eine relative Basis ('./') bricht, wenn die Adresse ohne abschließenden
// Schrägstrich aufgerufen wird: der Browser behandelt "studio" dann als
// Datei statt als Ordner und sucht die Assets eine Ebene zu hoch – die Seite
// bleibt weiß. Eine absolute Basis ist davon unabhängig.
export default defineConfig({
  base: '/Traum/studio/',
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
  },
});
