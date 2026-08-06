/**
 * Die Materialien des Buches.
 *
 * Bewusst als Modul und nicht als CSS-Datei: So bekommen die Bilder von Vite
 * ihren Hash und den richtigen Basispfad (`/Traum/studio/…`). Ein `url()` im
 * Stylesheet würde beim Ausliefern in einem Unterordner ins Leere zeigen.
 */

import leather from '../assets/leather.jpg';
import desk from '../assets/desk.jpg';
import frontispiz from '../assets/frontispiz.jpg';

export const TEXTURES = { leather, desk, frontispiz };

/**
 * Der Tisch, auf dem das Buch liegt.
 *
 * Das Holz liegt unter zwei dunklen Verläufen: Es soll spürbar sein, aber nie
 * mit dem Papier um Aufmerksamkeit ringen. Das Licht fällt von oben links,
 * passend zur Fotografie.
 */
export const deskStyle: React.CSSProperties = {
  backgroundImage: `
    radial-gradient(115% 85% at 20% 0%, rgba(212,175,55,0.10) 0%, transparent 55%),
    linear-gradient(180deg, rgba(10,8,7,0.72) 0%, rgba(10,8,7,0.80) 60%, rgba(6,5,4,0.92) 100%),
    url(${desk})`,
  backgroundSize: 'cover, cover, cover',
  backgroundPosition: 'center, center, center',
};
