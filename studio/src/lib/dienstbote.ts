/**
 * Den Dienstboten anmelden – leise, spät und ohne Folgen im Fehlerfall.
 *
 * Der Dienstbote selbst steht in `src/dienstbote.js`; dort steht auch,
 * warum es ihn gibt. Hier stehen nur die drei Bedingungen, unter denen er
 * überhaupt gerufen wird.
 */

/**
 * **Erst wenn das Buch offen ist.**
 *
 * Die Anmeldung stösst das Holen von 1,4 MB an. Vor dem ersten Bild wäre das
 * ein Wettlauf gegen genau die Zeit, die in Punkt 1 dieser Runde von acht
 * Sekunden auf 231 ms gedrückt wurde. Nach `load` ist der Bildschirm
 * gezeichnet und der Leser liest; was dann im Hintergrund geholt wird, merkt
 * er nicht.
 *
 * **Nicht beim Entwickeln.**
 *
 * `npm run dev` liefert keinen gebauten Dienstboten aus. Ein Anmeldeversuch
 * bekäme dort die Startseite mit falschem Inhaltstyp zurück und würde in
 * jeder Sitzung eine rote Meldung in die Konsole schreiben – Lärm, den man
 * nach drei Tagen nicht mehr liest, auch dann nicht, wenn er einmal recht
 * hat.
 *
 * **Und ein Fehlschlag bleibt ein Fehlschlag, kein Ereignis.**
 *
 * Das ist die eigentliche Falle. `register()` gibt ein Versprechen zurück;
 * bliebe es unbehandelt, fiele es in `main.tsx` auf `unhandledrejection` –
 * und `showFatal` ersetzt dann den Inhalt der Wurzel durch eine Fehlerseite.
 * Ein Leser, dessen Browser keine Dienstboten erlaubt (privates Fenster,
 * Firmenrichtlinie), sähe statt seines Buches eine Meldung über eine
 * Bequemlichkeit, die er nie verlangt hat. Ohne Netz zu starten ist ein
 * Zugewinn; scheitert er, ist alles wie vorher, und das ist auszuhalten.
 */
export function meldeDienstbotenAn(): void {
  if (!import.meta.env.PROD) return;
  if (!('serviceWorker' in navigator)) return;

  const anmelden = () => {
    const ort = `${import.meta.env.BASE_URL}sw.js`;
    navigator.serviceWorker
      .register(ort, { scope: import.meta.env.BASE_URL })
      .catch((grund) => {
        console.warn('Ohne Netz startet das Buch diesmal nicht:', grund);
      });
  };

  /*
   * `load` kann schon vorbei sein, wenn dieses Modul lief – dann käme das
   * Ereignis nie mehr, und der Dienstbote würde nie angemeldet. Ein Fehler,
   * der sich nur auf schnellen Geräten zeigt und auf langsamen nie.
   */
  if (document.readyState === 'complete') anmelden();
  else window.addEventListener('load', anmelden, { once: true });
}
