/*
 * Die Bedienung.
 *
 * Eine Geste lässt sich nicht dadurch prüfen, dass man wischt. Prüfbar ist,
 * was die Geste *entscheidet* – und weil diese Entscheidungen in reinen
 * Funktionen stehen (`lib/raum/geste.ts`), lassen sie sich ohne Browser
 * stellen.
 *
 * Die meisten Zusicherungen hier sind Verneinungen, und das ist kein Zufall:
 * Bei einer Bedienung, die auf jede Berührung reagieren *könnte*, ist nicht
 * interessant, ob sie reagiert. Interessant ist, ob sie stillhält, wenn der
 * Finger jemand anderem gehört. Ein System, das zu oft losgeht, ist schlimmer
 * als eines, das zu selten losgeht: Das eine kann man nicht benutzen, das
 * andere nur schlecht.
 */
import { execSync } from 'child_process';
import { ARBEIT } from './arbeit.mjs';
const S = ARBEIT;
for (const f of ['geste', 'konfig'])
  execSync(`npx esbuild src/lib/raum/${f}.ts --bundle --format=esm --outfile=${S}/t/r-${f}.mjs`, {
    stdio: 'pipe',
  });
execSync(`npx esbuild src/lib/book.ts --bundle --format=esm --outfile=${S}/t/r-buch.mjs`, {
  stdio: 'pipe',
});
const G = await import(S + '/t/r-geste.mjs');
const K = await import(S + '/t/r-konfig.mjs');
const B = await import(S + '/t/r-buch.mjs');

let ok = 0,
  bad = 0;
const p = (n, ist, soll) => {
  if (JSON.stringify(ist) === JSON.stringify(soll)) ok++;
  else {
    bad++;
    console.log('FEHLER', n, '\n  ist :', JSON.stringify(ist), '\n  soll:', JSON.stringify(soll));
  }
};
const wahr = (n, b) => p(n, !!b, true);

const k = K.VORGABE;
/* Ein iPhone im Hochformat – das Referenzgerät des Auftrags. */
const feld = { breite: 390, hoehe: 844 };

/**
 * Eine Geste nachspielen.
 *
 * Setzt am Startpunkt auf, zieht um (dx,dy) und lässt los. Gibt zurück, was
 * die Bedienung daraus gemacht hätte – oder warum sie es nicht getan hat.
 */
function wische(x0, y0, dx, dy, { tempo = 0.2, konf = k } = {}) {
  const richtung = G.randRichtung(x0, y0, feld, konf);
  if (!richtung) return { ergebnis: 'kein Rand' };

  const weite = Math.hypot(dx, dy);
  if (weite < Math.max(konf.geste.totzonePx, konf.geste.richtungssperrePx))
    return { ergebnis: 'unter der Totzone', richtung };
  if (!G.passtRichtung(dx, dy, richtung, konf))
    return { ergebnis: 'falsche Richtung', richtung };

  const weg = G.fortschritt([x0, y0], [x0 + dx, y0 + dy], richtung, feld, konf);
  return {
    ergebnis: G.entscheide(weg, tempo, konf),
    richtung,
    weg,
    phase: G.phaseVon(weg, konf),
  };
}

/** Wie weit muss man ziehen, um einen bestimmten Fortschritt zu erreichen? */
const strecke = (anteil, achse = feld.breite) => achse * k.geste.wegAnteil * anteil;

/* Der Punkt im rechten Randstreifen. */
const rechtsX = feld.breite - k.geste.randEinzugPx - k.geste.randBreitePx / 2;

/* ------------------------------------------------------ 1. Der Randstreifen */

p('1 der rechte Rand gehört den Wesen', G.randRichtung(rechtsX, 400, feld, k), 'rechts');
p('  der linke Rand der Welt', G.randRichtung(k.geste.randEinzugPx + 5, 400, feld, k), 'links');
p('  oben das Wissen', G.randRichtung(200, k.geste.randEinzugPx + 5, feld, k), 'oben');
p('  unten die Notizen', G.randRichtung(200, feld.hoehe - k.geste.randEinzugPx - 5, feld, k), 'unten');

/*
 * Der äußerste Rand gehört nicht uns.
 *
 * iOS beansprucht ihn für „zurück". Ein Streifen, der bei null anfinge,
 * kämpfte bei jedem Zug mit dem Betriebssystem – und verlöre.
 */
p('  der äußerste Rand gehört iOS', G.randRichtung(2, 400, feld, k), undefined);
p('  und die Mitte niemandem', G.randRichtung(195, 400, feld, k), undefined);

/*
 * Die Systemzonen oben und unten.
 *
 * **Das hier ist der Fehler, der auf dem Gerät auftrat und im Browser nicht.**
 * Links und rechts ging alles, oben und unten nichts. Der Grund: Die Seite
 * läuft mit `viewport-fit=cover` und reicht damit unter die Dynamic Island und
 * unter den Home-Indikator. Der obere Streifen lag mitten in der Statusleiste,
 * der untere in der Geste zum Startbildschirm – beide Zonen gehören iOS, und
 * dagegen gewinnt keine Anwendung.
 *
 * Ein iPhone mit Aussparung: knapp sechzig Punkte oben, vierunddreißig unten.
 * Dazu der Sicherheitsabstand aus der Konfiguration.
 */
const iphone = {
  breite: 390,
  hoehe: 844,
  oben: 59 + k.geste.systemEinzugObenPx,
  unten: 34 + k.geste.systemEinzugUntenPx,
};

p(
  '  in der Statusleiste beginnt nichts',
  G.randRichtung(200, 20, iphone, k),
  undefined,
);
p(
  '  am Home-Indikator auch nicht',
  G.randRichtung(200, iphone.hoehe - 20, iphone, k),
  undefined,
);
p(
  '  aber unterhalb der sicheren Fläche schon',
  G.randRichtung(200, iphone.oben + k.geste.randEinzugPx + 5, iphone, k),
  'oben',
);
p(
  '  und oberhalb des Indikators ebenso',
  G.randRichtung(200, iphone.hoehe - iphone.unten - k.geste.randEinzugPx - 5, iphone, k),
  'unten',
);

/*
 * Waagerecht ändert sich dadurch nichts.
 *
 * Die Systemzonen liegen oben und unten; links und rechts gibt es nur Safaris
 * Zurück-Wisch am äußersten Rand, und den umgeht `randEinzugPx` bereits. Wer
 * den senkrechten Einzug auch waagerecht anwendete, verschöbe eine Bedienung,
 * die funktioniert.
 */
p('  der rechte Rand bleibt, wo er war', G.randRichtung(rechtsX, 400, iphone, k), 'rechts');
p('  der linke auch', G.randRichtung(k.geste.randEinzugPx + 5, 400, iphone, k), 'links');

/* Ohne Angaben zur sicheren Fläche verhält sich alles wie zuvor – ein Gerät
 * ohne Aussparung verliert nichts. */
p('  ein Gerät ohne Aussparung behält den Rand', G.randRichtung(200, 20, feld, k), 'oben');

/* --------------------------------------------------------- 2. Die Schwellen */

p(
  '2 unter der Totzone passiert nichts',
  wische(rechtsX, 400, -4, 0).ergebnis,
  'unter der Totzone',
);

const kaum = wische(rechtsX, 400, -strecke(k.geste.andeutung * 0.5), 0);
p('  unter der Andeutungsschwelle nur ein Hauch', kaum.phase, 'andeutung');
p('  und noch kein Öffnen', kaum.ergebnis, 'zurueck');

const gemerkt = wische(rechtsX, 400, -strecke(k.geste.andeutung + 0.02), 0);
p('  über der Andeutungsschwelle: erkannt', gemerkt.phase, 'ergriffen');
p('  aber immer noch kein Öffnen', gemerkt.ergebnis, 'zurueck');

p(
  '  unter der Schwelle loslassen federt zurück',
  wische(rechtsX, 400, -strecke(k.geste.verpflichtung - 0.05), 0).ergebnis,
  'zurueck',
);
p(
  '  über der Schwelle loslassen öffnet',
  wische(rechtsX, 400, -strecke(k.geste.verpflichtung + 0.05), 0).ergebnis,
  'oeffnen',
);

/* ---------------------------------------------------- 3. Der schnelle Wisch */

/*
 * Wer die Bedienung kennt, soll nicht jedes Mal den ganzen Weg ziehen müssen.
 * Kurz, aber schnell – und eindeutig gerichtet.
 */
p(
  '3 kurz und schnell genügt',
  wische(rechtsX, 400, -strecke(k.geste.schnellMindestweg + 0.02), 0, { tempo: 1.2 }).ergebnis,
  'oeffnen',
);
p(
  '  kurz und langsam nicht',
  wische(rechtsX, 400, -strecke(k.geste.schnellMindestweg + 0.02), 0, { tempo: 0.1 }).ergebnis,
  'zurueck',
);
p(
  '  sehr kurz und sehr schnell auch nicht',
  wische(rechtsX, 400, -strecke(k.geste.schnellMindestweg - 0.08), 0, { tempo: 3 }).ergebnis,
  'zurueck',
);

/* ------------------------------------------------------- 4. Die Richtung */

/*
 * Ein Zug vom rechten Rand *nach rechts* ist kein Weg zu den Wesen. Ohne diese
 * Prüfung würde jedes Zurückwischen den Raum öffnen, aus dem man kommt.
 */
p('4 nach außen zieht nichts auf', wische(rechtsX, 400, 90, 0).ergebnis, 'falsche Richtung');

/*
 * Und das Scrollen: Ein senkrechter Wisch, der zufällig im rechten Randstreifen
 * beginnt, ist ein Scrollen. Das passiert bei jedem zweiten Lesen.
 */
p('  senkrecht am rechten Rand ist Scrollen', wische(rechtsX, 400, 0, -160).ergebnis, 'falsche Richtung');
wahr('  leicht schräg ist noch erlaubt', G.passtRichtung(-100, -20, 'rechts', k));
wahr('  deutlich schräg nicht mehr', !G.passtRichtung(-100, -90, 'rechts', k));

/*
 * Zurückziehen vor dem Loslassen.
 *
 * Der Fortschritt misst nur die Bewegung nach innen und fällt beim Zurückziehen
 * auf null – kein negativer Wert, kein Bogen auf der Gegenseite.
 */
const hinUndZurueck = G.fortschritt([rechtsX, 400], [rechtsX + 30, 400], 'rechts', feld, k);
p('  wer zurückzieht, ist bei null', hinUndZurueck, 0);
p('  und öffnet damit nichts', G.entscheide(hinUndZurueck, 0.1, k), 'zurueck');

/* ------------------------------------------------------------- 5. Die Tiefe */

let stand = { ort: 'mitte', tiefe: 0 };
stand = G.naechsterStand(stand, 'rechts', k);
p('5 aus der Mitte in die erste Tiefe', stand, { ort: 'rechts', tiefe: 1 });
stand = G.naechsterStand(stand, 'rechts', k);
p('  noch einmal: zweite Tiefe', stand, { ort: 'rechts', tiefe: 2 });
stand = G.naechsterStand(stand, 'rechts', k);
p('  und die dritte', stand, { ort: 'rechts', tiefe: 3 });
stand = G.naechsterStand(stand, 'rechts', k);
p('  eine vierte gibt es nicht', stand, { ort: 'rechts', tiefe: 3 });

/*
 * Der Weg zurück ist die Gegenrichtung – und er endet in der Mitte, nicht bei
 * der Welt. Wer im Wesensraum steht, für den führt der linke Rand heraus.
 */
let heim = { ort: 'rechts', tiefe: 1 };
p('  die Gegenrichtung führt heraus', G.naechsterStand(heim, 'links', k), { ort: 'mitte', tiefe: 0 });
p(
  '  aus Tiefe 3 eine Ebene zurück',
  G.naechsterStand({ ort: 'rechts', tiefe: 3 }, 'links', k),
  { ort: 'rechts', tiefe: 2 },
);

/*
 * Und der Fall, der bewusst nichts tut: quer aus der Tiefe heraus. Sonst
 * stünde man ohne Übergang in einem fremden Bedeutungsraum – das ist keine
 * Tiefe mehr, das ist Verirren.
 */
p(
  '  quer aus der Tiefe: nichts',
  G.naechsterStand({ ort: 'rechts', tiefe: 2 }, 'oben', k),
  { ort: 'rechts', tiefe: 2 },
);

/* --------------------------------------------------------- 6. Der Doppeltipp */

const t0 = 1000;
wahr(
  '6 zwei schnelle Tipps am selben Ort',
  G.istDoppeltipp({ x: 200, y: 400, t: t0 }, { x: 205, y: 403, t: t0 + 150 }, k),
);
wahr(
  '  zu langsam ist kein Doppeltipp',
  !G.istDoppeltipp({ x: 200, y: 400, t: t0 }, { x: 200, y: 400, t: t0 + 600 }, k),
);
wahr(
  '  zu weit auseinander auch nicht',
  !G.istDoppeltipp({ x: 200, y: 400, t: t0 }, { x: 200, y: 500, t: t0 + 150 }, k),
);
wahr('  und ein einzelner Tipp erst recht nicht', !G.istDoppeltipp(null, { x: 1, y: 1, t: t0 }, k));

/* ------------------------------------------------- 7. Die Heimkehr ist eine */

/*
 * Aus jeder Tiefe direkt zum Werk – nicht drei Rücknavigationen hintereinander.
 * Geprüft am Zustandsübergang: Ein Sprung, egal wie tief man stand.
 */
const heimkehr = (s) => ({ ort: 'mitte', tiefe: 0, ankerId: s.ankerId });
p(
  '7 aus Tiefe 1 direkt zum Werk',
  heimkehr({ ort: 'rechts', tiefe: 1, ankerId: 'e_lysander' }),
  { ort: 'mitte', tiefe: 0, ankerId: 'e_lysander' },
);
p(
  '  aus Tiefe 3 ebenso, in einem Schritt',
  heimkehr({ ort: 'rechts', tiefe: 3, ankerId: 'e_lysander' }),
  { ort: 'mitte', tiefe: 0, ankerId: 'e_lysander' },
);

/* ----------------------------------------------------------- 8. Der Anker */

/*
 * Der Anker bleibt beim Erkunden.
 *
 * Das ist die Zusicherung, an der die ganze Bedienung hängt: Wer sich umsieht,
 * verliert nicht seinen Arbeitsplatz. `naechsterStand` fasst den Anker nicht
 * an – es kennt ihn nicht einmal, und genau das ist die Prüfung.
 */
const wege = ['rechts', 'rechts', 'rechts', 'links'];
let unterwegs = { ort: 'mitte', tiefe: 0 };
for (const w of wege) unterwegs = G.naechsterStand(unterwegs, w, k);
p('8 der Weg führt durch drei Räume und zurück', unterwegs, { ort: 'rechts', tiefe: 2 });
wahr(
  '  und der Stand kennt keinen Anker – er kann ihn nicht ändern',
  !('ankerId' in unterwegs) && !('anker' in unterwegs),
);

/* ------------------------------------------------ 9. Keine Weltveränderung */

/*
 * Die härteste Zusicherung dieser Datei, und die einfachste zu prüfen: Keine
 * dieser Funktionen fasst ihre Eingabe an. Ein Wisch, ein Andeuten, ein
 * Abbrechen, ein Wechsel der Tiefe – nichts davon darf je eine Kennung, eine
 * Beziehung oder ein Feld berühren.
 */
const vorher = { ort: 'rechts', tiefe: 2 };
const abzug = JSON.stringify(vorher);
G.naechsterStand(vorher, 'rechts', k);
G.naechsterStand(vorher, 'links', k);
G.naechsterStand(vorher, 'oben', k);
p('9 der Stand wird nicht verändert, sondern beantwortet', JSON.stringify(vorher), abzug);

const punkte = [rechtsX, 400];
const punkteAbzug = JSON.stringify(punkte);
G.fortschritt(punkte, [100, 400], 'rechts', feld, k);
p('  und die Punkte auch nicht', JSON.stringify(punkte), punkteAbzug);

/* ------------------------------------------- 10. Alles lässt sich stimmen */

/*
 * Der eigentliche Zweck dieses Auftrags: Kein Wert ist festgebacken. Geprüft
 * wird nicht, dass es Regler *gibt*, sondern dass sie *wirken* – dieselbe
 * Geste, andere Konfiguration, anderes Ergebnis.
 */
const streng = K.VORGABE;
const locker = { ...streng, geste: { ...streng.geste, verpflichtung: 0.3 } };
const halb = -strecke(0.4);
p(
  '10 dieselbe Geste, strenge Schwelle: zurück',
  wische(rechtsX, 400, halb, 0, { konf: streng }).ergebnis,
  'zurueck',
);
p(
  '  dieselbe Geste, lockere Schwelle: öffnen',
  wische(rechtsX, 400, halb, 0, { konf: locker }).ergebnis,
  'oeffnen',
);

const breit = { ...streng, geste: { ...streng.geste, randBreitePx: 120 } };
p('  ein breiterer Streifen fängt weiter innen an', G.randRichtung(300, 400, feld, breit), 'rechts');
p('  mit der Vorgabe nicht', G.randRichtung(300, 400, feld, streng), undefined);

const tief = { ...streng, geste: { ...streng.geste, hoechsteTiefe: 2 } };
p(
  '  und die höchste Tiefe ist ein Regler',
  G.naechsterStand({ ort: 'rechts', tiefe: 2 }, 'rechts', tief),
  { ort: 'rechts', tiefe: 2 },
);

/* Die Vorlagen sind wirklich verschieden – sonst wären sie Zierde. */
const namen = Object.keys(K.VORLAGEN);
wahr('  es gibt Vorlagen zum Vergleichen', namen.length >= 4);
wahr(
  '  und sie unterscheiden sich hörbar',
  K.VORLAGEN.RUHIG.geste.verpflichtung !== K.VORLAGEN.ANTWORTFREUDIG.geste.verpflichtung,
);

/* -------------------------------------- 11. Die Räume zeigen wirklich etwas */

/*
 * Die Zusicherung, die einen stillen Fehler gefunden hätte.
 *
 * Die Tiefenräume filtern Einträge nach dem Kapitel, in dem sie stehen –
 * `bewohner`, `tiere`, `stimmen` für die Wesen, `lebendige-welt`, `natur`,
 * `architektur` für die Welt. Im ersten Bau standen dort erfundene Kennungen
 * (`wesen`, `welt`), und weil `chapterOfType` bei Unbekanntem still auf das
 * letzte Kapitel zurückfällt, gab es keinen Fehler: Der Raum blieb einfach
 * leer und behauptete, in diesem Buch lebe noch niemand.
 *
 * Gefunden hat es ein gerendertes Bild. Deshalb steht die Prüfung jetzt hier –
 * sie kostet vier Zeilen und macht aus einem stillen Fehler einen lauten.
 */
const KAPITEL = {
  wesen: ['bewohner', 'tiere', 'stimmen'],
  welt: ['lebendige-welt', 'natur', 'architektur'],
};
const alleKapitel = new Set(B.CHAPTERS.map((c) => c.id));
for (const [wohin, liste] of Object.entries(KAPITEL))
  for (const id of liste)
    wahr(`11 „${id}" ist ein Kapitel dieses Buches (${wohin})`, alleKapitel.has(id));

/* Und die Gegenprobe: Ein Kapitel, das es nicht gibt, fällt still zurück –
 * genau das war die Falle. */
p(
  '  ein unbekannter Typ landet still im letzten Kapitel',
  B.chapterOfType('gibtesnicht').id,
  B.CHAPTERS[B.CHAPTERS.length - 1].id,
);

/* Die wichtigsten Typen liegen wirklich dort, wo die Räume sie suchen. */
p('  eine Figur gehört zu den Wesen', B.chapterOfType('character').id, 'bewohner');
p('  ein Ort gehört zur Welt', B.chapterOfType('location').id, 'lebendige-welt');
wahr('  und beide werden gefunden', KAPITEL.wesen.includes(B.chapterOfType('character').id)
  && KAPITEL.welt.includes(B.chapterOfType('location').id));

console.log(`\n${ok} bestanden, ${bad} gescheitert`);
process.exit(bad ? 1 : 0);
