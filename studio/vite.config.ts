import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * Das `crossorigin`-Merkmal aus den erzeugten Skript- und Stilverweisen
 * entfernen.
 *
 * Vite schreibt es voraus, weil Bündel oft von einem eigenen Auslieferungsnetz
 * kommen. Hier liegen sie unter derselben Herkunft wie die Seite, das Merkmal
 * ist also ohne Wirkung – bis auf eine, die teuer war: Safari behandelt einen
 * Fehler aus einem so gekennzeichneten Modul als fremd und verkürzt ihn auf
 * ein blosses „Script error." ohne Text, Datei und Zeile.
 *
 * Auf einem Telefon gibt es keine Konsole, in die man ausweichen könnte. Diese
 * eine Zeile ist der Unterschied zwischen einer Meldung, mit der sich arbeiten
 * lässt, und einer, die nichts sagt.
 */
function ohneCrossorigin(): Plugin {
  return {
    name: 'ohne-crossorigin',
    enforce: 'post',
    transformIndexHtml(html) {
      return html.replace(/\s+crossorigin(=["'][^"']*["'])?/g, '');
    },
  };
}

// Feste Basis für GitHub Pages (Projektseite unter /Traum/studio/).
// Eine relative Basis ('./') bricht, wenn die Adresse ohne abschließenden
// Schrägstrich aufgerufen wird: der Browser behandelt "studio" dann als
// Datei statt als Ordner und sucht die Assets eine Ebene zu hoch – die Seite
// bleibt weiß. Eine absolute Basis ist davon unabhängig.
export default defineConfig({
  base: '/Traum/studio/',
  plugins: [react(), ohneCrossorigin()],
  server: {
    host: true,
    port: 5173,
  },
});
