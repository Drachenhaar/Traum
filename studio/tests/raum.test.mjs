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
import { readFileSync } from 'node:fs';
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
  const urteil = G.richtungsurteil(dx, dy, richtung, konf);
  if (urteil === 'nein') return { ergebnis: 'falsche Richtung', richtung };
  if (urteil === 'nochNicht') return { ergebnis: 'nicht ergriffen', richtung };

  const weg = G.fortschritt([x0, y0], [x0 + dx, y0 + dy], richtung, feld, konf);
  return {
    ergebnis: G.entscheide(weg, tempo, konf),
    richtung,
    weg,
    phase: G.phaseVon(weg, konf),
  };
}

/** Wie weit muss man ziehen, um einen bestimmten Fortschritt zu erreichen? */
const strecke = (anteil, achse = feld.breite) =>
  achse * (achse === feld.breite ? k.geste.wegAnteilWaagerecht : k.geste.wegAnteilSenkrecht) * anteil;

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
 * Wie schief ein Daumen wirklich zieht.
 *
 * Diese vier Zusicherungen fehlten, und ihr Fehlen war teuer: Die Toleranz
 * stand auf 25 Grad, und niemand hatte je nachgesehen, wie viel Grad ein
 * Daumen tatsächlich abweicht. Ein Daumen zieht keine Gerade – er dreht sich
 * um sein Gelenk, und die Hand hält das Gerät dabei fest. Bei einem
 * Zug über 150 Punkte kommt ein Bogen von dreißig Grad ohne Weiteres zustande,
 * und mit 25 Grad Toleranz scheiterte davon *jeder einzelne*.
 *
 * Deshalb wird hier in Grad geprüft und nicht in Punkten: Punkte sagen nichts
 * darüber, ob ein Mensch das schafft. Die Bedingung an die Toleranz ist,
 * einen menschlichen Bogen zu tragen und einen Scrollzug trotzdem
 * abzuweisen – beides zugleich, sonst ist der Wert falsch.
 */
const schraeg = (grad, laenge = 150) => [
  -laenge * Math.cos((grad * Math.PI) / 180),
  -laenge * Math.sin((grad * Math.PI) / 180),
];
wahr('  ein Bogen von 24 Grad ist ein Daumen', G.passtRichtung(...schraeg(24), 'rechts', k));
wahr('  ein Bogen von 32 Grad auch noch', G.passtRichtung(...schraeg(32), 'rechts', k));
wahr('  bei 50 Grad ist es keine Richtung mehr', !G.passtRichtung(...schraeg(50), 'rechts', k));
wahr('  und bei 70 Grad ist es Scrollen', !G.passtRichtung(...schraeg(70), 'rechts', k));

/*
 * Und jetzt die Prüfung, die den eigentlichen Fehler gefunden hätte.
 *
 * Die vier Zusicherungen oben prüfen den Zug an *einem* Punkt: dort, wo er
 * endet. Genau das war der blinde Fleck. Die Bedienung urteilte über die
 * Richtung, sobald der Finger zehn Punkte gelaufen war, und blieb bei diesem
 * Urteil – und nach zehn Punkten sieht ein Bogen ganz anders aus als am Ende.
 * Ein Zug mit 32 Grad Gesamtbogen zeigt dort momentan 44 Grad.
 *
 * Ein Bogen lässt sich deshalb nur Schritt für Schritt prüfen, so wie ihn der
 * Browser sieht: aufsetzen, vierzehn Bewegungen, loslassen. `zieheBogen` spielt
 * genau das nach – dieselbe Kurve, die die Messung im Gerät verwendet.
 */
function zieheBogen(x0, y0, laenge, grad, achse, konf = k) {
  const rad = (grad * Math.PI) / 180;
  const richtung = G.randRichtung(x0, y0, feld, konf);
  if (!richtung) return 'kein Rand';

  let gesperrt = false;
  const n = 14;
  for (let i = 1; i <= n; i++) {
    const s = (laenge * i) / n;
    /* Der Bogen wächst zur Mitte des Zuges hin und geht wieder zurück. */
    const quer = Math.sin((Math.PI * i) / n) * laenge * Math.tan(rad) * 0.5;
    const dx = (achse === 'x' ? s : quer);
    const dy = (achse === 'x' ? quer : s);
    if (!gesperrt) {
      const u = G.richtungsurteil(dx, dy, richtung, konf);
      if (u === 'nein') return 'aufgegeben';
      if (u === 'nochNicht') continue;
      gesperrt = true;
    }
  }
  if (!gesperrt) return 'nie ergriffen';
  const weg = G.fortschritt([x0, y0], [x0 + (achse === 'x' ? laenge : 0), y0 + (achse === 'x' ? 0 : laenge)], richtung, feld, k);
  return G.entscheide(weg, 0.2, konf);
}

/* Waagerecht: ein Daumen am rechten Rand zieht nach links. */
for (const grad of [0, 8, 16, 24, 32])
  p(`  ein Bogen von ${grad}° am rechten Rand öffnet`, zieheBogen(rechtsX, 430, -150, grad, 'x'), 'oeffnen');

/* Senkrecht: derselbe Daumen am unteren Rand zieht nach oben. */
const untenY = feld.hoehe - k.geste.randEinzugPx - k.geste.randBreitePx / 2;
for (const grad of [0, 8, 16, 24, 32])
  p(`  ein Bogen von ${grad}° am unteren Rand öffnet`, zieheBogen(195, untenY, -230, grad, 'y'), 'oeffnen');

/*
 * Und die Gegenprobe, ohne die das Ganze wertlos wäre: Das Abwarten darf das
 * Scrollen nicht verschlucken. Ein senkrechter Zug am rechten Rand ist ein
 * Scrollen und muss aufgegeben werden – nicht irgendwann, sondern bevor
 * irgendetwas sichtbar wird.
 */
p('  ein Scrollen am rechten Rand wird aufgegeben', zieheBogen(rechtsX, 500, -300, 0, 'y'), 'aufgegeben');
p('  ein Zug nach außen ebenso', wische(rechtsX, 400, 60, 0).ergebnis, 'falsche Richtung');

/*
 * Der Korridor, an dem alles hängt – und seine beiden Ränder.
 *
 * Dass das Abwarten kein Nachteil ist, hängt genau daran: Ein Scrollen darf
 * nicht mitwarten. Es liegt bei neunzig Grad und wird deshalb bei der
 * allerersten Prüfung abgegeben – **schneller als vorher**, wo es erst über
 * die Toleranz gerechnet wurde. Was wartet, ist nur der schmale Bereich
 * zwischen „gehört uns" und „gehört sichtbar jemand anderem".
 */
p('  senkrecht ist sofort abgegeben', G.richtungsurteil(0, -60, 'rechts', k), 'nein');
p('  im Korridor wird gewartet', G.richtungsurteil(-30, -28, 'rechts', k), 'nochNicht');
p('  innerhalb der Toleranz sofort ja', G.richtungsurteil(-30, -18, 'rechts', k), 'ja');
p('  jenseits des Aufgabewinkels nein', G.richtungsurteil(-30, -50, 'rechts', k), 'nein');

/*
 * Und der Rückhalt: Auch im Korridor wird nicht endlos gewartet. Wer eine
 * halbe Bildschirmbreite schräg zieht, wollte etwas anderes.
 */
p(
  '  aber nicht endlos',
  G.richtungsurteil(-(k.geste.fremdwegPx + 10), -(k.geste.fremdwegPx + 4), 'rechts', k),
  'nein',
);

/*
 * Jede Achse hat ihren eigenen Ziehweg.
 *
 * Hier stand ein Wert für beide Achsen. Auf einem Telefon heißt das: senkrecht
 * mehr als doppelt so weit ziehen wie waagerecht, geerbt vom Seitenverhältnis
 * und von niemandem entschieden. Diese Zusicherung hält die beiden Strecken
 * in einem Verhältnis, das ein Mensch als gleich empfinden kann.
 */
const bisSchwelle = (achse, anteil) => achse * anteil * k.geste.verpflichtung;
const waagerechtPx = bisSchwelle(feld.breite, k.geste.wegAnteilWaagerecht);
const senkrechtPx = bisSchwelle(feld.hoehe, k.geste.wegAnteilSenkrecht);
wahr(
  '  senkrecht kostet nicht mehr als ein Drittel mehr als waagerecht',
  senkrechtPx <= waagerechtPx * 1.34,
);
wahr('  und auch nicht weniger', senkrechtPx >= waagerechtPx * 0.9);

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
/*
 * Beide Schwellen werden hier **selbst gesetzt**, und das ist eine Lehre.
 *
 * Vorher stand hier `const streng = K.VORGABE` – die Vorgabe wurde als „die
 * strenge" angenommen und dagegen ein Zug von 0,4 gehalten. Das ging so
 * lange gut, wie die Vorgabe über 0,4 lag. Als sie auf 0,34 sank, weil die
 * Geste am Gerät zu weit zu ziehen war, scheiterte diese Zusicherung – und
 * sie scheiterte über etwas, das sie gar nicht prüfen will.
 *
 * Sie prüft, dass der Regler **wirkt**. Dann darf sie nicht davon abhängen,
 * wo er zufällig gerade steht.
 */
const streng = { ...K.VORGABE, geste: { ...K.VORGABE.geste, verpflichtung: 0.6 } };
const locker = { ...K.VORGABE, geste: { ...K.VORGABE.geste, verpflichtung: 0.3 } };
const halb = -strecke(0.45);
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

const breit = { ...K.VORGABE, geste: { ...K.VORGABE.geste, randBreitePx: 120 } };
p('  ein breiterer Streifen fängt weiter innen an', G.randRichtung(300, 400, feld, breit), 'rechts');
p('  mit der Vorgabe nicht', G.randRichtung(300, 400, feld, k), undefined);

const tief = { ...K.VORGABE, geste: { ...K.VORGABE.geste, hoechsteTiefe: 2 } };
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

/* =========================================================================
 * 12  DIE GESTE MUSS ENDEN KÖNNEN
 *
 * Der Ablauf setzte voraus, dass auf jedes Aufsetzen ein Loslassen folgt. Auf
 * einem iPhone tut es das nicht: Die Randstreifen liegen dort, wo auch das
 * Betriebssystem zuhört, und wer die Berührung an sich nimmt, schickt weder
 * `pointerup` noch `pointercancel`.
 *
 * Dann blieb `lauf.current` für immer gesetzt – und das sah aus wie drei
 * verschiedene Fehler: der Inhalt blieb verschoben stehen, jede neue Geste
 * lief gegen `if (lauf.current) return`, und der nicht-passive
 * `touchmove`-Halt nahm mit seinem `preventDefault` das Scrollen, das Zoomen
 * **und** das Markieren von Text mit.
 *
 * Gemessen an einer gebauten verlorenen Berührung, vorher: `phase:
 * ergriffen`, `--dc-mitte-x: -4,56px`, nach 1,5 Sekunden unverändert,
 * `touchmove` verhindert. Nachher: nach 2,2 Sekunden `phase: ruhe`,
 * `--dc-mitte-x: 0px`, `touchmove` nicht mehr verhindert.
 *
 * Prüfbar ist das hier nur am Quelltext – eine Wache über einen Finger, den
 * es nicht gibt, hat keine reine Funktion. Deshalb: Kommentare weg, dann
 * suchen. Eine Prüfung, die Code nicht von Prosa unterscheidet, prüft den
 * Text und nicht das Programm; genau das ist in diesem Projekt schon dreimal
 * passiert.
 * ========================================================================= */
const ohneProsa = (q) => q.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
const lies = (pf) => readFileSync(new URL(pf, import.meta.url), 'utf8');
const schicht = ohneProsa(lies('../src/components/raum/Raumschicht.tsx'));

wahr('12 die Stille hat eine Zahl, und sie steht in der Konfiguration',
  typeof k.geste.verlorenNachMs === 'number' && k.geste.verlorenNachMs > 0);
wahr('  die Wache liest sie von dort und erfindet keine eigene',
  /verlorenNachMs/.test(schicht) && !/setTimeout\(\s*verwerfeGeste\s*,\s*\d/.test(schicht));

/*
 * Die Zeile, die das Buch verschloss. Ein zweites Aufsetzen ist der beste
 * Beweis, dass die vorige Geste vorbei ist – niemand setzt zweimal denselben
 * Finger auf.
 */
wahr('  ein neues Aufsetzen wird nicht mehr stumm abgewiesen',
  !/if\s*\(\s*lauf\.current\s*\)\s*return/.test(schicht));
wahr('  sondern verwirft die alte Geste', /if\s*\(lauf\.current\)\s*verwerfeGeste\(\)/.test(schicht));

/* Vier Auslöser, eine Genesung – jeder einzelne ist ein Weg, auf dem ein
 * Finger auf dem Gerät verschwindet. */
for (const auslöser of ['touchend', 'touchcancel', 'visibilitychange', 'blur'])
  wahr(`  „${auslöser}" beendet eine verlorene Geste`,
    new RegExp(`'${auslöser}'`).test(schicht));

/* Zwei Finger sind ein Zoom. Ohne diese Zeile frisst der Halt das
 * Auseinanderziehen, auch wenn die Geste danach sauber endet. */
wahr('  zwei Finger nehmen der Reise den Vortritt',
  /touches\.length\s*>\s*1/.test(schicht) && /touchmove/.test(schicht));

/* =========================================================================
 * 13  `pan-y` ALLEIN VERBIETET AUCH DAS ZOOMEN
 *
 * `touch-action` zählt auf, was der Browser noch selbst tun darf; was nicht
 * dasteht, ist verboten. An vier Stellen stand `pan-y`, gedacht gegen das
 * waagerechte Ziehen – und schaltete nebenbei das Auseinanderziehen mit zwei
 * Fingern im ganzen Buch ab. `maximum-scale=5.0` im `index.html` half nichts,
 * weil diese Regeln davor lagen.
 *
 * Die Prüfung ist bewusst hart: **kein** `pan-y` ohne `pinch-zoom`. Die
 * nächste Regel entsteht durch Abschreiben von der Nachbarregel, und dann
 * wäre das Zoomen wieder weg, ohne dass irgendetwas kaputt aussieht.
 * ========================================================================= */
const css = ohneProsa(lies('../src/index.css'));
const panRegeln = [...css.matchAll(/touch-action:\s*([^;]+);/g)].map((m) => m[1].trim());
wahr('13 es gibt überhaupt `touch-action`-Regeln', panRegeln.length >= 4);
for (const regel of panRegeln)
  wahr(`  „${regel}" erlaubt das Zoomen`,
    !/\bpan-y\b/.test(regel) || /\bpinch-zoom\b/.test(regel));

/* Und die Gegenprobe am Dokument selbst: Ohne diese Angabe im `index.html`
 * hilft das beste `touch-action` nichts. */
const html = lies('../index.html');
wahr('  das Dokument selbst erlaubt Vergrössern',
  /maximum-scale=\s*[2-9]/.test(html) && !/user-scalable\s*=\s*no/.test(html));

/* =========================================================================
 * 14  DIE ANSATZMARKEN
 *
 * „Man muss noch raten, ob man nun umblättert oder die Tiefe erwischt."
 *
 * Die Randstreifen waren unsichtbar. Wer daneben aufsetzte, blätterte um –
 * eine Antwort auf eine Frage, die niemand gestellt hat, und man muss sie
 * zurücknehmen, bevor man es noch einmal versucht. Die Geste war fertig
 * gebaut, gemessen, richtig eingestellt und praktisch unauffindbar.
 *
 * Vier Dinge müssen dafür wahr bleiben, und alle vier sind schon einmal
 * fast danebengegangen.
 * ========================================================================= */
const marken = ohneProsa(lies('../src/components/raum/Ansatzmarken.tsx'));

/*
 * Eine Marke, unter der nichts liegt, ist schlimmer als gar keine Marke.
 * Deshalb dieselbe Frage mit derselben Funktion wie in `Raumschicht.runter` –
 * keine zweite Meinung, die auseinanderlaufen kann.
 */
wahr('14 die Marke fragt dieselbe Funktion wie die Geste',
  /gesteErlaubt\(/.test(marken) && /gesteErlaubt\(/.test(schicht));
wahr('  und erfindet keine eigene Liste von Richtungen',
  !/'character'|'location'|'creature'/.test(marken));

/* Die Zahlen kommen aus der Konfiguration, nicht aus dieser Datei – sonst
 * wandert der Streifen im Labor und die Marke bleibt stehen. */
wahr('  ihre Stellung kommt aus derselben Konfiguration wie der Streifen',
  /randEinzugPx/.test(marken) && !/=\s*12\b/.test(marken));

/*
 * Der Grund, warum ein Zug *von der Marke aus* trotzdem eine Reise wird:
 * `BEDIENELEMENTE` kennt keinen Knopf. Stünde `button` in dieser Liste,
 * bliebe die Marke antippbar und die Geste wäre auf ihr tot – und niemand
 * käme darauf, in dieser Zeile nachzusehen.
 */
wahr('  ein Knopf am Rand nimmt der Geste den Finger nicht',
  /const BEDIENELEMENTE =/.test(schicht)
    && !/const BEDIENELEMENTE = '[^']*button/.test(schicht));

/*
 * Die Trefferfläche wächst nach aussen.
 *
 * Der erste Bau polsterte den Knopf um siebzehn Punkte nach innen – und weil
 * `inset-0` die Polsterung mitzählt, war das Bild so gross wie das Ziel:
 * zwei gelbe Pillen auf dem Papier. Gefunden hat das kein Test, sondern ein
 * gerendertes Bild.
 */
const marktCss = ohneProsa(css).match(/\.dc-ansatz\s*\{[^}]*\}/)?.[0] ?? '';
wahr('  die Marke wird nicht nach innen gepolstert', !/padding/.test(marktCss));
wahr('  ihre Trefferfläche wächst nach aussen',
  /\.dc-ansatz::after\s*\{[^}]*inset:\s*-/.test(ohneProsa(css)));

/* Einmal erklärt, nie wieder – über den Leitfaden, der genau dafür da ist. */
const wegpunkte = ohneProsa(lies('../src/lib/leitfaden.ts'));
wahr('  ein Wegweiser erklärt sie ein einziges Mal',
  /id: 'tiefe'/.test(wegpunkte) && /ziel: 'tiefe'/.test(wegpunkte)
    && /data-leitfaden=\{[^}]*'tiefe'/.test(marken));

/*
 * **Eine Kerbe wird nicht über etwas gelegt, das schon da ist.**
 *
 * Die Charakterseite trägt ein Daumenregister an der Aussenkante. Ihr eigener
 * Quelltext beschreibt den Entwurf in einem Satz: „Ein Tipp gehört ihnen, ein
 * Zug gehört dem Raum." Das hielt – bis die Kerbe antippbar wurde. Seither lag
 * ihre Trefferfläche (367 bis 385) über den Reitern (334 bis 390), und wer das
 * Register am äusseren Rand antippte, landete in der Tiefe. Gemessen lagen an
 * (376, 422) drei Lagen Ansatzmarke über dem Registerknopf.
 *
 * Gemeldet als: „Wenn ich mich rechts durchnavigieren möchte, klicke ich
 * unweigerlich auf die Tiefe."
 *
 * Das Register auf die andere Seite zu legen hätte nichts geheilt – dort liegt
 * derselbe Streifen für eine andere Richtung, und der Fehler zöge mit um.
 */
wahr('  eine Kerbe weicht, wo schon ein Bedienelement liegt',
  /elementsFromPoint/.test(marken) && /verdeckt/.test(marken));
wahr('  gefragt wird, was wirklich dort liegt – nicht eine Liste von Namen',
  !/Registerkante|dc-registerkante/.test(marken));

/*
 * Und die Lage der Kerbe hat **eine** Quelle.
 *
 * Der Messpunkt und das Bild müssen dieselbe Stelle meinen. Zwei Rechnungen
 * für dieselbe Lage sind in diesem Projekt schon mehrfach auseinandergelaufen,
 * ohne dass etwas kaputt aussah – hier hiesse das: Die Kerbe weicht an einer
 * Stelle aus, an der gar nichts liegt.
 */
wahr('  Bild und Messpunkt kommen aus derselben Rechnung',
  /function kerbenlage/.test(marken) && (marken.match(/kerbenlage\(/g) ?? []).length >= 3);

/*
 * **Ein Haken läuft auch dann, wenn der Anstrich vorher aufgibt.**
 *
 * Der teuerste Fehler dieser Datei, und er dauerte einen Nachmittag: `ein`
 * stand unter dem vorzeitigen `return null`. Sobald eine Geste begann, kehrte
 * die Komponente zurück, bevor der Wert zugewiesen war – der Haken lief
 * trotzdem und griff ins Leere. Kein falsches Bild, sondern ein Absturz:
 * „Diese Seite ist gerissen", genau beim Ziehen vom Rand.
 *
 * Geprüft wird die Reihenfolge im Quelltext, weil genau sie der Fehler war.
 */
{
  const werte = marken.indexOf('const ein = konfig()');
  /*
   * Mit Klammer gesucht, sonst findet man die Einfuhrzeile ganz oben und
   * nicht den Haken selbst – und die Prüfung wäre immer erfüllt.
   */
  const haken = marken.indexOf('useLayoutEffect(');
  const aufgabe = marken.indexOf("if (phase !== 'ruhe') return null");
  wahr('  alle drei Stellen sind auffindbar', werte >= 0 && haken >= 0 && aufgabe >= 0);
  wahr('  was der Haken anfasst, steht vor ihm', werte < haken);
  wahr('  und vor jedem vorzeitigen Zurückkehren', werte < aufgabe);
}

/* =========================================================================
 * 15  WIE WEIT MAN ZIEHEN MUSS
 *
 * Gemeldet: „Man muss sehr weit ziehen, um in die Tiefe zu kommen. Auch wenn
 * man von unten in die Mitte zieht, dann muss man wirklich bis in die Mitte
 * ziehen." Und im selben Atemzug: „Die Tiefe nur noch durch den Knopf."
 *
 * Das ist dieselbe Meldung zweimal. Wer eine Geste dreimal nicht schafft,
 * hört auf, sie zu versuchen, und nimmt die Abkürzung – und eine Abkürzung,
 * die zum einzigen Weg wird, ist ein Zeugnis über den Hauptweg.
 *
 * Gemessen war es: 88 Punkte waagerecht, 110 senkrecht.
 *
 * Zwei Zusicherungen, und beide prüfen eine Strecke in Punkten und keinen
 * Anteil. Anteile lassen sich nicht mit einem Daumen vergleichen – die Zahl,
 * die zählt, ist die, die der Finger wirklich zurücklegen muss.
 * ========================================================================= */

/** Wie viele Punkte bis zum Öffnen – bei ruhigem Zug, ohne Schwung. */
function ziehstrecke(richtung, konf = k) {
  const f = { breite: 390, hoehe: 844, oben: 67, unten: 62 };
  const start =
    richtung === 'rechts' ? [356, 420]
      : richtung === 'links' ? [22, 420]
      : richtung === 'oben' ? [195, f.oben + 25]
      : [195, f.hoehe - f.unten - 25];
  const [ex, ey] = G.EINWAERTS[richtung];
  for (let d = 1; d <= 900; d++) {
    const weg = G.fortschritt(start, [start[0] + ex * d, start[1] + ey * d], richtung, f, konf);
    if (G.entscheide(weg, 0.2, konf) === 'oeffnen') return d;
  }
  return Infinity;
}

const waagerecht = ziehstrecke('rechts');
const senkrecht = ziehstrecke('unten');

/*
 * Ein Daumen, der am Rand aufsetzt, reicht rund neunzig Punkte weit, bevor
 * die ganze Hand mitwandern muss – und währenddessen muss die Richtung auch
 * noch im Toleranzkorridor bleiben. Fünfundsiebzig ist die Grenze, ab der es
 * sich nach Arbeit anfühlt.
 */
wahr(`15 waagerecht bleibt in Daumenreichweite (${waagerecht} Punkte)`, waagerecht <= 75);
wahr(`  senkrecht auch (${senkrecht} Punkte)`, senkrecht <= 75);

/*
 * **Und beide Achsen kosten gleich viel.**
 *
 * Das ist die Zusicherung, die zweimal gefehlt hat. Zuerst gab es einen
 * einzigen Anteil für beide Achsen – auf einem Telefon von 390 × 844 kostete
 * senkrecht damit mehr als das Doppelte. Dann wurden die Anteile getrennt,
 * und es waren immer noch 110 gegen 88: die Schieflage war kleiner, aber
 * nicht weg. Beide Male hat es niemand entschieden; beide Male war es das
 * Seitenverhältnis des Geräts, das sich als Designentscheidung ausgab.
 *
 * Geprüft wird deshalb nicht, dass zwei Regler *existieren*, sondern dass
 * sie zum selben Ergebnis führen.
 */
wahr(`  und beide Achsen kosten gleich viel (${waagerecht} zu ${senkrecht})`,
  Math.abs(waagerecht - senkrecht) <= Math.max(waagerecht, senkrecht) * 0.12);

console.log(`\n${ok} bestanden, ${bad} gescheitert`);
process.exit(bad ? 1 : 0);
