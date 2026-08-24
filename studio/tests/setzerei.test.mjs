/*
 * Das Maß der Setzerei.
 *
 * Prueft keine Farben und kein Aussehen – das findet nur das Hinsehen. Was
 * sich pruefen laesst, sind die *Verhaeltnisse*: Sitzt der Lesetext auf der
 * Grundlinie? Ist der Fusssteg wirklich der groesste? Bleibt die Zeilenlaenge
 * in dem Bereich, den ein Buch vertraegt?
 *
 * Diese Zahlen zu aendern ist erlaubt und soll leicht bleiben. Sie
 * *versehentlich* auseinanderlaufen zu lassen, ist der Fehler, den es hier zu
 * fangen gibt – und er faellt sonst niemandem auf, weil eine Seite mit einem
 * gebrochenen Raster nicht falsch aussieht, sondern nur unruhig.
 */

import { readFileSync } from 'node:fs';

let bestanden = 0;
let gescheitert = 0;
function pruefe(was, bedingung, hinweis = '') {
  if (bedingung) {
    bestanden++;
  } else {
    gescheitert++;
    console.error(`  ✗ ${was}${hinweis ? ` – ${hinweis}` : ''}`);
  }
}

/*
 * `mass.ts` ist reines TypeScript ohne Abhaengigkeiten, und die Zahlen stehen
 * als Literale darin. Sie hier herauszulesen ist stumpfer als ein Import –
 * und spart, fuer eine Handvoll Zahlen einen Uebersetzer zu starten.
 */
const roh = readFileSync(new URL('../src/lib/setzerei/mass.ts', import.meta.url), 'utf8');
/*
 * `zeile: ZEILE` ist ein Verweis und keine Zahl – der Lesetext bezieht sich
 * ausdruecklich auf die Grundlinie, statt sie abzuschreiben. Genau das ist
 * richtig, also loest die Pruefung den Verweis auf, statt ihn zu verbieten.
 */
const RASTER = Number((roh.match(/export const ZEILE = ([0-9.]+)/) ?? [])[1]);
const quelle = roh.replace(/zeile: ZEILE\b/g, `zeile: ${RASTER}`);
const zahl = (name) => {
  const t = quelle.match(new RegExp(`${name}[^0-9]*?([0-9]+(?:\\.[0-9]+)?)`));
  return t ? Number(t[1]) : NaN;
};
const grad = (name) => {
  const b = quelle.match(new RegExp(`${name}: \\{ px: ([0-9.]+), zeile: ([0-9.]+)`));
  return b ? { px: Number(b[1]), zeile: Number(b[2]) } : null;
};

const ZEILE = RASTER;
const MASS = zahl('export const MASS_EM =');
const fliess = grad('fliess');

console.log('\n1 Grundlinienraster');
pruefe('Die Grundlinie ist gesetzt', ZEILE > 0);
pruefe(
  'Der Lesetext sitzt genau auf der Grundlinie',
  fliess && fliess.zeile === ZEILE,
  fliess ? `Zeilenabstand ${fliess.zeile}, Raster ${ZEILE}` : 'kein Grad gefunden',
);
pruefe(
  'Sein Zeilenabstand liegt zwischen 1,5 und 1,9',
  fliess && fliess.zeile / fliess.px >= 1.5 && fliess.zeile / fliess.px <= 1.9,
  fliess ? (fliess.zeile / fliess.px).toFixed(2) : '',
);

console.log('2 Größenhierarchie');
const name = grad('name');
const abschnitt = grad('abschnitt');
const rubrik = grad('rubrik');
const zitat = grad('zitat');
const rand = grad('rand');
const bildunter = grad('bildunter');
pruefe('Der Name ist die größte Stufe', name.px > zitat.px && zitat.px > fliess.px);
pruefe('Der Abschnittstitel steht über der Rubrik', abschnitt.px > rubrik.px);
pruefe('Randnotizen sind kleiner als der Lesetext', rand.px < fliess.px);
/*
 * „Marginalien werden kleiner gesetzt als der Haupttext" – aber der Auftrag
 * sagt im selben Atemzug „weiterhin gut lesbar". Unter elf Punkt ist auf
 * einem Telefon nichts mehr gut lesbar.
 */
pruefe('Randnotizen bleiben lesbar (mindestens 11 Punkt)', rand.px >= 11, `${rand.px}px`);
pruefe('Bildunterschriften bleiben lesbar (mindestens 11 Punkt)', bildunter.px >= 11, `${bildunter.px}px`);
pruefe(
  'Es gibt höchstens sieben Stufen – mehr ist keine Hierarchie mehr',
  (quelle.match(/\{ px: /g) ?? []).length <= 7,
);

console.log('3 Satzspiegel');
const innen = zahl('innen:');
const aussen = zahl('aussen:');
pruefe('Innensteg und Außensteg sind gesetzt', innen > 0 && aussen > 0);
pruefe('Der Fußsteg ist der großzügigste', /unten: zeilen\(2\.5\)/.test(quelle));
pruefe('Der Kopfsteg ist eine volle Zeile', /oben: zeilen\(1\)/.test(quelle));

console.log('4 Zeilenlänge');
/*
 * 0,408em je Zeichen – in Chromium mit der Schriftkaskade des Buches
 * gemessen, nicht geschaetzt. Die Obergrenze soll die sehr lange Zeile auf
 * breiten Geraeten verhindern und darf zugleich nicht so eng sein, dass sie
 * dort eine Telefonspalte erzwingt.
 */
const zeichen = MASS / 0.408;
pruefe('Die Obergrenze liegt bei höchstens 75 Zeichen', zeichen <= 75, `${Math.round(zeichen)}`);
pruefe('Die Obergrenze liegt über 50 Zeichen', zeichen > 50, `${Math.round(zeichen)}`);

console.log('5 Ausgabe als CSS');
/*
 * Die festen Namen stehen woertlich im Quelltext, die Grade nicht: Sie
 * entstehen in einer Schleife als `--satz-<name>` samt `-zeile` und
 * `-sperre`. Die erste Fassung dieser Pruefung suchte nach
 * `--satz-fliess-zeile` und schlug fehl – nicht weil die Variable fehlte,
 * sondern weil sie *erzeugt* wird. Eine Pruefung, die den Bauplan nicht
 * kennt, prueft den falschen Ort.
 */
for (const noetig of ['--satz-raster', '--satz-mass', '--satz-steg-unten']) {
  pruefe(`${noetig} wird ausgegeben`, quelle.includes(noetig));
}
pruefe('Jeder Grad gibt auch Zeilenabstand und Sperrung aus',
  /--satz-\$\{name\}-zeile/.test(quelle) && /--satz-\$\{name\}-sperre/.test(quelle));

/*
 * 6 Kommt die Setzerei bei den Buchseiten an?
 *
 * Die Frage klingt trivial und war es nicht. Nach dem ganzen Umbau sah das
 * Buch beim Aufschlagen aus wie vorher – und der Grund stand in einer
 * einzigen Zeile Suchergebnis: `grep -rln "satz-" src/pages/book/` fand
 * **nichts**. Das Mass war gebaut, gepruft und dokumentiert, und keine
 * Buchseite benutzte es.
 *
 * Deshalb pruefen die folgenden Zusicherungen nicht das Mass selbst, sondern
 * seine *Ankunft*: Der gemeinsame Rahmen aller Buchseiten muss die Zeile
 * begrenzen, den Falz beruecksichtigen und einen Fusssteg aus dem Raster
 * haben. Eine Setzerei, die niemand benutzt, ist keine.
 */
console.log('6 Ankunft auf den Buchseiten');
const rahmen = readFileSync(new URL('../src/components/book/Spread.tsx', import.meta.url), 'utf8');
pruefe('Der Seitenrahmen begrenzt die Zeilenlänge', /const SPALTE = \d+/.test(rahmen));
const spalte = Number((rahmen.match(/const SPALTE = (\d+)/) ?? [])[1]);
/* Der Kasten traegt die Stege mit; 112 Punkte davon sind Rand am Schreibtisch. */
pruefe(
  'Die Spalte darin bleibt unter 75 Zeichen',
  (spalte - 112) / (0.408 * 17) < 75,
  `${Math.round((spalte - 112) / (0.408 * 17))} Zeichen`,
);
pruefe(
  'Der Innensteg unterscheidet sich vom Außensteg',
  /export function stege/.test(rahmen) && /pl-7 pr-10/.test(rahmen) && /pl-10 pr-7/.test(rahmen),
);
pruefe('Der Fußsteg kommt aus dem Raster', /--satz-raster/.test(rahmen));
pruefe('Die Seitenzahl ist eine Buchseitenzahl', /satz-seitenzahl/.test(rahmen));

/*
 * Und die Seiten, die ihr Blatt **selbst** bauen?
 *
 * Die Anhangsblätter gehen nicht durch `Leaf`: eigenes Papier, eigener
 * Scrollbereich. Der erste Reflex war, ihnen dieselbe Spalte zu geben – und
 * das war falsch. Ein Anhangsblatt ist eine Werkbank: Die Setzerei hat zwei
 * Spalten, Manuskript und Andruck. In 480 Punkte gezwängt zeigte das
 * Textfeld drei Wörter je Zeile.
 *
 * Das Maß schützt Fließtext, nicht Werkzeuge. Der Fließtext dort ist längst
 * am Inhalt begrenzt – zehn Blätter tragen ihr eigenes `max-w-[Nch]`.
 * Geprüft wird deshalb, was wirklich gelten muss: dass sie den Falz kennen,
 * einen Fußsteg aus dem Raster haben, und dass die Begrenzung am Inhalt
 * nicht verschwindet.
 */
const anhang = readFileSync(new URL('../src/pages/book/Appendix.tsx', import.meta.url), 'utf8');
pruefe('Die Anhangsblätter kennen den Falz', /stege\('single'\)/.test(anhang));
pruefe('Ihr Fußsteg kommt aus dem Raster', /--satz-raster/.test(anhang));

const buchseiten = readFileSync(new URL('../src/pages/book/MeinBuch.tsx', import.meta.url), 'utf8');
pruefe(
  'Der Fließtext der Anhangsblätter bleibt am Inhalt begrenzt',
  /max-w-\[\d+ch\]/.test(anhang) && /max-w-\[\d+ch\]/.test(buchseiten),
);

console.log(`\n  ${bestanden} bestanden, ${gescheitert} gescheitert\n`);
process.exit(gescheitert ? 1 : 0);
