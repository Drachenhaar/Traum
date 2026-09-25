/**
 * Den Dienstboten bauen – nach `vite build`, aus dem, was wirklich dasteht.
 *
 * Die Liste der vorzuhaltenden Dateien darf nicht von Hand gepflegt werden,
 * und der Grund ist nicht Bequemlichkeit. Vite hängt an jeden Dateinamen den
 * Inhaltsstempel (`App-B2W2dL08.js`); eine von Hand gepflegte Liste zeigt
 * nach dem nächsten Build auf Dateien, die es nicht mehr gibt. `addAll` ist
 * alles-oder-nichts, also würde der Dienstbote sich schlicht nicht mehr
 * einrichten – lautlos, denn wer online ist, merkt davon nichts. Auffallen
 * würde es dem Leser im Flugzeug.
 *
 * Deshalb liest dieses Skript den fertigen Ordner und schreibt die Liste
 * selbst. Was nicht gebaut wurde, steht nicht drin; was gebaut wurde, fehlt
 * nicht.
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const wurzel = fileURLToPath(new URL('..', import.meta.url));
const dist = join(wurzel, 'dist');
const vorlage = join(wurzel, 'src', 'dienstbote.js');
const ziel = join(dist, 'sw.js');

/** Alle Dateien unter `dist`, als Pfade relativ dazu, mit Schrägstrichen. */
function alleDateien(ordner) {
  const raus = [];
  for (const name of readdirSync(ordner)) {
    const p = join(ordner, name);
    if (statSync(p).isDirectory()) raus.push(...alleDateien(p));
    else raus.push(relative(dist, p).split(sep).join('/'));
  }
  return raus;
}

const BILDENDUNG = /\.(webp|png|jpe?g|svg|avif|gif|ico)$/i;

const alle = alleDateien(dist).sort();

/*
 * Der Dienstbote selbst gehört nicht in seinen eigenen Vorrat.
 *
 * Er hinterlegte sich sonst in der Fassung, in der er gerade läuft – und
 * fände sich beim nächsten Besuch selbst wieder vor, statt die neue Fassung
 * zu sehen. Ein Programm, das seine eigene Ablösung verhindert, ist genau
 * der Fehler, gegen den der Notausgang in `src/dienstbote.js` steht.
 */
const werk = alle.filter((p) => p !== 'sw.js' && !BILDENDUNG.test(p));
const bilder = alle.filter((p) => BILDENDUNG.test(p));

/*
 * Die Fassung steht für den Inhalt, nicht für die Uhrzeit.
 *
 * Ein Zeitstempel wechselte bei jedem Bauen, auch wenn sich nichts geändert
 * hat – jeder Leser holte dann grundlos 1,4 MB neu. Der Stempel über die
 * Dateinamen wechselt genau dann, wenn eine Datei anders ist; die Namen
 * tragen den Inhalt ja bereits in sich.
 */
const fassung = createHash('sha256').update(werk.join('\n')).digest('hex').slice(0, 12);

const quelle = readFileSync(vorlage, 'utf8');

/* Jede Marke genau einmal – sonst schreibt eine Umbenennung stillschweigend
   einen Dienstboten mit Platzhaltern darin, und der fällt erst draussen auf. */
for (const marke of ['__FASSUNG__', '__WERK__', '__BILDER__']) {
  const anzahl = quelle.split(marke).length - 1;
  if (anzahl !== 1) {
    throw new Error(`${marke} steht ${anzahl}× in src/dienstbote.js, erwartet genau 1×`);
  }
}

const fertig = quelle
  .replace('__FASSUNG__', fassung)
  .replace('__WERK__', JSON.stringify(werk, null, 2))
  .replace('__BILDER__', JSON.stringify(bilder, null, 2));

if (/__(FASSUNG|WERK|BILDER)__/.test(fertig)) {
  throw new Error('Im fertigen Dienstboten steht noch eine Marke.');
}

writeFileSync(ziel, fertig);

const gewicht = (liste) =>
  liste.reduce((s, p) => s + statSync(join(dist, p)).size, 0) / 1024;

console.log(
  `Dienstbote ${fassung}: ${werk.length} Dateien vorgehalten (${gewicht(werk).toFixed(0)} kB), ` +
    `${bilder.length} Bilder unterwegs (${gewicht(bilder).toFixed(0)} kB).`,
);
