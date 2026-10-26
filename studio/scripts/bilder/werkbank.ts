/**
 * Was die Bildprüfung aus dem Programm braucht – an einer Stelle.
 *
 * Kein eigener Renderer, keine Nachbildung: Dies reicht die **echten**
 * Maler nach aussen, damit die Prüfung genau das zeichnet, was die Karte
 * zeichnet. Eine Prüfung, die eine zweite Fassung desselben Bildes malt,
 * prüft die zweite Fassung.
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
export { kachelmass, WERKPLAN, Kachelwerk } from '../../src/lib/kartenwerk/kachelwerk';
export { maleLage } from '../../src/lib/kartenwerk/maler';
export { ARTBOOK } from '../../src/lib/karte/stil';
export { heileKarte } from '../../src/lib/karte/modell';
