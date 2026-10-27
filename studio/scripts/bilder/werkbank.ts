/**
 * Was die Werkzeuge aus dem Programm brauchen – an einer Stelle.
 *
 * Kein eigener Renderer, keine Nachbildung: Dies reicht die **echten**
 * Maler nach aussen, damit Bildprüfung, Film und Relief genau das zeichnen,
 * was die Karte zeichnet. Eine Prüfung, die eine zweite Fassung desselben
 * Bildes malt, prüft die zweite Fassung.
 *
 * Gebündelt wird diese Datei mit `esbuild` – derselbe Weg, den auch die
 * Prüfungen in `tests/` gehen.
 */

export { maleStaffage } from '../../src/lib/kartenwerk/waldwerk';
export { maleGebirge } from '../../src/lib/kartenwerk/gebirgswerk';
export { staffageAus } from '../../src/lib/kartenwerk/streuwerk';
export { Staffageraster } from '../../src/lib/kartenwerk/raster';
export { stilbuchFuer } from '../../src/lib/kartenwerk/stilbuch';
export { ladeAtlas } from '../../src/lib/kartenwerk/atlas';
export { kachelmass, stufeFuer, WERKPLAN, Kachelwerk } from '../../src/lib/kartenwerk/kachelwerk';
export { maleLage } from '../../src/lib/kartenwerk/maler';
export { ARTBOOK } from '../../src/lib/karte/stil';
/*
 * Die Höhenrechnung selbst – nicht ihr Bild.
 *
 * Das Relief in drei Dimensionen braucht die Zahlen und nicht die
 * Schattierung: Es verschiebt echte Geometrie nach oben, statt Licht und
 * Schatten auf eine Fläche zu malen. Beide fragen dieselbe Funktion, und
 * genau deshalb stimmen Karte und Modell überein.
 */
export { hoeheUeberall, gebirgskasten, GEBIRGE } from '../../src/lib/karte/gebirge';
export { heileKarte } from '../../src/lib/karte/modell';
