/**
 * Ein Vorlagenbogen für die gemalten Felswände.
 *
 * ---
 *
 * **Wozu.**
 *
 * Die gemalten Berge sind die Oberflächenschicht über dem gerechneten
 * Relief. Damit sie beim ersten Versuch passen, müssen sie drei Dinge
 * treffen: die Grösse, den Fusspunkt und die Lichtrichtung. Zwei davon sind
 * schon einmal danebengegangen – die Bäume lagen bei 190 Bildpunkten statt
 * 430, und das Unterholz kam von rechts beleuchtet.
 *
 * Dieser Bogen beantwortet alle drei, bevor der erste Strich gezogen ist.
 *
 * ---
 *
 * **Die Zahl ist gemessen, nicht gewählt.**
 *
 * Eine Felswand ist so hoch wie das Band zwischen Baumgrenze und Grat.
 * Gemessen am Hauptkamm des Filmschauplatzes, senkrecht zum Verlauf, dort
 * wo die Höhe `BAUMGRENZE.ende` übersteigt: **10 bis 49 Karteneinheiten,
 * im Mittel 32**.
 *
 * Beim engsten Zoom deckt die Leinwand 125 Einheiten auf 2048 Bildpunkten,
 * also 16,384 Punkte je Einheit – dieselbe Rechnung wie beim Atlas der
 * Bäume. Das grösste Band braucht damit 795 Punkte. Der Bogen gibt 800.
 *
 * Wer kleiner malt, bekommt beim Heranzoomen Brei; wer grösser malt,
 * verschenkt nur Platz. Die Richtung des Irrtums ist also klar.
 *
 * ---
 *
 * **Die Unterlage ist echtes Relief.**
 *
 * In jedem Feld steht blass die Schattierung, die das Gebirgswerk an dieser
 * Stelle wirklich rechnet – durch `maleGebirge`, nicht nachgebaut. Wer
 * darüber malt, malt auf die Form, die später darunter liegt. Das ist der
 * Unterschied zwischen einer Felswand, die sitzt, und einer, die daneben
 * klebt.
 *
 * ---
 *
 * Aufruf:  npm run felsbogen
 *          npm run felsbogen -- --felder 8
 */

import { writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { oeffneBuehne } from './film/buehne.mjs';

const wurzel = join(dirname(fileURLToPath(import.meta.url)), '..');
const ARBEIT = join(wurzel, '.testbau', 'felsbogen');

const wahl = (name, vorgabe) => {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 && process.argv[i + 1] ? Number(process.argv[i + 1]) : vorgabe;
};

/** Wie viele Varianten der Bogen anbietet. Acht, wie beim Wald. */
const FELDER = wahl('felder', 8);

/**
 * **Was eine Felswand ist – und was sie nicht ist.**
 *
 * Ein erster Anlauf hat sie auf einen ganzen Gipfel bemessen: 98
 * Karteneinheiten hoch, 222 breit. Das war die falsche Einheit. Die
 * Erweiterungsstelle `gratpunkte` liefert alle 18 Einheiten einen Ort auf
 * dem Kamm, und `GEBIRGE.md` sagt dazu: „an den Gipfeln die grossen, in den
 * Sätteln die kleinen". Eine Wand ist also ein **Stück Grat**, das sich mit
 * seinen Nachbarn überlappt – wie ein Baum ein Stück Wald ist.
 *
 * Das löst nebenbei ein Problem, das die ganze Gipfelrechnung hatte: Ein
 * Bild hat ein festes Seitenverhältnis, ein Gebirge nicht. Gemessen reicht
 * die Form über `breite` und `hoehe` von 0,85 zu 1 bis 4,45 zu 1 – beides
 * Eigenschaften des einzelnen Kamms. Ein ganzer Gipfel als ein Bild müsste
 * dafür gezerrt werden. Eine Folge von Wandstücken muss es nicht: Die Breite
 * des Berges entsteht daraus, wie viele nebeneinanderstehen.
 *
 * ---
 *
 * **Die Höhe ist gemessen.** Eine Wand deckt das Felsband zwischen
 * Baumgrenze und Grat. Senkrecht zum Hauptkamm gemessen, dort wo die Höhe
 * `BAUMGRENZE.ende` übersteigt: 10 bis 49 Einheiten, im Mittel 32. Die
 * grosse Wand bekommt also **48**.
 *
 * Bei 16,384 Bildpunkten je Einheit im engsten Zoom sind das **800 Punkte**.
 * Zum Vergleich: ein Baum ist 26 Einheiten hoch und wird mit 430 gebacken.
 */
const KARTE_HOEHE = 48;
const BREITE_ZU_HOEHE = 1.3;
/** Ein Baum, zum Vergleich daneben. */
const BAUM_HOEHE = 26;
/** Bildpunkte je Karteneinheit beim engsten Zoom, doppelte Dichte. */
const PUNKTE_JE_EINHEIT = 16.384;
/** Unterkante des Felsbandes: dort steht die Wand auf. */
const BAND_UNTEN = 68;
/** Der Vorgabeabstand von `gratpunkte` – so dicht stehen die Wände. */
const GRATABSTAND = 18;

const FELD_H = wahl('punkte', 800);
const FELD_B = Math.round(FELD_H * BREITE_ZU_HOEHE);
/** Wo der Fuss sitzt – derselbe Anker wie bei Baum und Unterholz. */
const ANKER_Y = 0.96;
/** Luft am Rand, damit die Glättung nicht anschneidet. */
const RAND_FREI = 0.015;

const SPALTEN = 2;
const ZEILEN = Math.ceil(FELDER / SPALTEN);
const LUFT = 48;
const KOPF = 560;

rmSync(ARBEIT, { recursive: true, force: true });
mkdirSync(ARBEIT, { recursive: true });

const { basis: B, browser, schliesse } = await oeffneBuehne(ARBEIT);
const seite = await browser.newPage({ viewport: { width: 1000, height: 1000 } });
const fehler = [];
seite.on('pageerror', (e) => fehler.push(e.message));
await seite.goto(`${B}leer.html`);

console.log(`Vorlagenbogen: ${FELDER} Felder à ${FELD_B}×${FELD_H} …`);

const bogen = await seite.evaluate(async (p) => {
  const W = await import('/werkbank.mjs');
  const stil = W.ARTBOOK;

  /*
   * **Ein gerader Kamm statt des gebogenen.**
   *
   * Gesucht sind verschiedene Gipfel- und Sattelformen, nicht verschiedene
   * Richtungen. Ein gerader Zug liefert sie, indem man an verschiedenen
   * Stellen hineinsieht – und erspart dem Bogen jede Drehrechnung. Die
   * Formen sind trotzdem die echten: Dieselbe Breite, dieselbe Höhe,
   * dieselbe Zerklüftung, derselbe Startwert wie am Filmschauplatz.
   */
  const kamm = {
    id: 'g_bogen',
    punkte: [[0, 600], [2400, 600]],
    breite: 132,
    hoehe: 0.86,
    zerkluftung: 0.55,
    seed: 90130394,
  };

  /*
   * Felder dort anlegen, wo der Grat **hoch** ist – sonst zeigt die Hälfte
   * des Bogens flaches Land. Gesucht wird entlang des Kamms nach den
   * höchsten Stellen, mit Mindestabstand, damit nicht achtmal derselbe
   * Gipfel herauskommt.
   */
  const ORTE = [];
  const roh = [];
  for (let x = 120; x < 2300; x += 4) roh.push([x, W.hoeheUeberall(x, 600, [kamm])]);
  roh.sort((a, b) => b[1] - a[1]);
  for (const [x, h] of roh) {
    if (ORTE.length >= p.felder) break;
    if (ORTE.every((o) => Math.abs(o.x - x) > 90)) ORTE.push({ x, h });
  }
  ORTE.sort((a, b) => a.x - b.x);

  const breite = p.spalten * p.feldB + (p.spalten + 1) * p.luft;
  const hoehe = p.kopf + p.zeilen * p.feldH + (p.zeilen + 1) * p.luft;
  const c = document.createElement('canvas');
  c.width = breite;
  c.height = hoehe;
  const g = c.getContext('2d');

  g.fillStyle = '#F4EFE3';
  g.fillRect(0, 0, breite, hoehe);

  /* ---- Kopfzeile ---------------------------------------------------- */
  g.fillStyle = '#3A3426';
  g.font = '600 46px Georgia, serif';
  g.fillText('Felswände – Vorlagenbogen', p.luft, 70);
  g.font = '26px Georgia, serif';
  g.fillStyle = '#6B6047';
  g.fillText(
    `${p.feldB} × ${p.feldH} Bildpunkte · ${p.karteHoehe} Karteneinheiten hoch · Fuss auf der Linie · Licht von links oben`,
    p.luft, 112,
  );

  /* =====================================================================
   * DER ZUSAMMENHANG – acht Wände nebeneinander ergeben einen Grat
   * ================================================================== */
  /*
   * **Das wichtigste Feld des Bogens.**
   *
   * Ohne es malt man acht Einzelberge. Mit ihm sieht man, dass eine Wand ein
   * Stück einer fortlaufenden Linie ist: Sie überlappt ihre Nachbarn, ihre
   * linke Kante muss an deren rechte anschliessen können, und ihr eigener
   * Umriss ist nie die ganze Geschichte.
   *
   * Gezeigt wird der Grat über 420 Einheiten – ungefähr das, was ein Zug auf
   * dem Bildschirm einnimmt – mit den acht Feldern als Kästen darauf.
   */
  const zuX0 = ORTE[0].x - 40;
  const zuX1 = ORTE[ORTE.length - 1].x + 40;
  const zuB = breite - 2 * p.luft;
  const zuH = 300;
  const zuY = p.kopf - zuH - 40;
  const jeZu = zuB / (zuX1 - zuX0);
  const zuHoch = zuH / (W.GEBIRGE.vollhoehe * 0.95);

  g.save();
  g.beginPath();
  g.moveTo(p.luft, zuY + zuH);
  for (let px = 0; px <= zuB; px += 2) {
    const sx = zuX0 + px / jeZu;
    const e = W.hoeheUeberall(sx, 600, [kamm]) * W.GEBIRGE.vollhoehe;
    g.lineTo(p.luft + px, zuY + zuH - e * zuHoch);
  }
  g.lineTo(p.luft + zuB, zuY + zuH);
  g.closePath();
  g.fillStyle = '#DED4C0';
  g.fill();
  g.strokeStyle = '#8A8171';
  g.lineWidth = 2;
  g.stroke();

  /* Die Baumgrenze – darunter steht Wald, darüber die Wände. */
  const grenzeY = zuY + zuH - p.bandUnten * zuHoch;
  g.strokeStyle = '#7A8467';
  g.setLineDash([10, 8]);
  g.lineWidth = 2;
  g.beginPath();
  g.moveTo(p.luft, grenzeY);
  g.lineTo(p.luft + zuB, grenzeY);
  g.stroke();
  g.setLineDash([]);
  g.fillStyle = '#6B6047';
  g.font = '22px Georgia, serif';
  g.fillText('Baumgrenze', p.luft + 8, grenzeY - 10);

  /* Die Gratpunkte, im echten Abstand – so dicht stehen die Wände. */
  g.save();
  g.strokeStyle = '#A8853F';
  g.lineWidth = 1.5;
  g.beginPath();
  for (let sx = zuX0; sx <= zuX1; sx += p.abstand) {
    const px = p.luft + (sx - zuX0) * jeZu;
    g.moveTo(px, grenzeY - 7);
    g.lineTo(px, grenzeY + 7);
  }
  g.stroke();
  g.restore();

  /* Die acht Felder als Kästen – sichtbar überlappend. */
  const spanneE = p.feldB / p.punkteJeEinheit;
  for (let n = 0; n < ORTE.length; n++) {
    const kx = p.luft + (ORTE[n].x - spanneE / 2 - zuX0) * jeZu;
    const kb = spanneE * jeZu;
    g.strokeStyle = '#B8860B';
    g.lineWidth = 2;
    g.strokeRect(kx, grenzeY - p.karteHoehe * zuHoch, kb, p.karteHoehe * zuHoch);
    g.fillStyle = '#A8853F';
    g.font = '19px Georgia, serif';
    g.fillText(String(n), kx + 6, grenzeY - p.karteHoehe * zuHoch + 22);
  }
  g.restore();

  g.fillStyle = '#6B6047';
  g.font = '24px Georgia, serif';
  /*
   * **Die Unterschrift sagte zuerst etwas Falsches.**
   *
   * Sie behauptete, die acht Kästen überlappten einander. Das tun sie
   * nicht: Sie sitzen an acht verschiedenen Gipfeln, damit acht
   * verschiedene Formen herauskommen. Es sind **Varianten**, keine
   * Nachbarn. Überlappt wird erst beim Setzen – dort steht alle 18
   * Einheiten eine Wand, und die Striche auf der Baumgrenze zeigen, wie
   * dicht das ist.
   */
  g.fillText(
    'Acht Varianten, an acht Gipfeln abgenommen. Keine ist ein ganzer Berg – eine Wand ist ein Stück Grat.',
    p.luft, zuY - 44,
  );
  g.fillText(
    `Gesetzt wird alle ${p.abstand} Einheiten (Striche): Jede Wand überlappt im Gebrauch etwa drei Nachbarn.`,
    p.luft, zuY - 14,
  );

  const felder = [];
  for (let n = 0; n < ORTE.length; n++) {
    const sp = n % p.spalten;
    const ze = Math.floor(n / p.spalten);
    const x0 = p.luft + sp * (p.feldB + p.luft);
    const y0 = p.kopf + p.luft + ze * (p.feldH + p.luft);

    /* ---- Die Unterlage: der Grat, am Kamm entlang -------------------- */
    /*
     * **Zwei Irrtümer liegen hinter dieser Unterlage.**
     *
     * Der erste legte `maleGebirge` darunter – die falsche Projektion: Die
     * Schattierung sieht von **oben** auf das Gelände, eine gemalte Wand
     * steht **aufrecht** wie ein Baum.
     *
     * Der zweite schnitt **quer** zum Kamm. Das ist der Schnitt durch den
     * ganzen Berg und damit die Form eines Gipfels, nicht die einer Wand.
     * Eine Wand steht mit ihrer Breite **am Grat entlang** – also ist der
     * Längsschnitt die Linie, die sie zu treffen hat. Erst der zeigt, was
     * eine Wand wirklich bedeckt: Zacken und Scharten, nicht einen Buckel.
     */
    const mitteX = ORTE[n].x;
    const spanne = p.feldB / p.punkteJeEinheit;
    const fussY = y0 + Math.round(p.feldH * p.ankerY);
    const jeEinheit = (fussY - y0) / p.karteHoehe;
    const prof = [];
    for (let px = 0; px <= p.feldB; px += 2) {
      const sx = mitteX + (px / p.feldB - 0.5) * spanne;
      prof.push([px, W.hoeheUeberall(sx, 600, [kamm]) * W.GEBIRGE.vollhoehe - p.bandUnten]);
    }

    g.save();
    g.beginPath();
    g.moveTo(x0, fussY);
    for (const [px, e] of prof) g.lineTo(x0 + px, fussY - Math.max(0, e) * jeEinheit);
    g.lineTo(x0 + p.feldB, fussY);
    g.closePath();
    g.fillStyle = '#DED4C0';
    g.globalAlpha = 0.85;
    g.fill();
    g.globalAlpha = 1;
    g.strokeStyle = '#8A8171';
    g.lineWidth = 2.5;
    g.stroke();
    g.restore();

    /* ---- Ein Baum daneben, als Mass ---------------------------------- */
    /*
     * Ohne ihn liest man die Silhouette als „Berg" und malt etwas Hohes.
     * Mit ihm sieht man, dass eine Wand knapp zwei Fichten hoch ist.
     */
    const bh = p.baumHoehe * jeEinheit;
    const bx = x0 + p.feldB - 70;
    g.save();
    /*
     * Umriss statt Fläche: Gefüllt deckte der Baum ein Drittel des Feldes
     * zu – also genau die Stelle, auf die gemalt werden soll. Das Mass soll
     * man sehen, nicht umgehen müssen.
     */
    g.strokeStyle = '#7A8467';
    g.lineWidth = 2.5;
    g.beginPath();
    g.moveTo(bx, fussY - bh);
    g.lineTo(bx - bh * 0.26, fussY);
    g.lineTo(bx + bh * 0.26, fussY);
    g.closePath();
    g.stroke();
    g.fillStyle = '#6B6047';
    g.font = '22px Georgia, serif';
    g.fillText('Baum', bx - 30, fussY + 28);
    g.restore();

    /* ---- Rahmen, Anker, Rand --------------------------------------- */
    g.strokeStyle = '#8A8171';
    g.lineWidth = 2;
    g.strokeRect(x0 + 1, y0 + 1, p.feldB - 2, p.feldH - 2);

    /* Der Rand, in dem nichts stehen darf. */
    const r = Math.round(p.feldB * p.randFrei);
    g.save();
    g.strokeStyle = '#B8860B';
    g.setLineDash([9, 9]);
    g.lineWidth = 1.5;
    g.strokeRect(x0 + r, y0 + r, p.feldB - 2 * r, p.feldH - 2 * r);
    g.restore();

    /* Die Fusslinie – hier berührt die Wand den Boden. */
    const fy = fussY;
    g.save();
    g.strokeStyle = '#A8853F';
    g.lineWidth = 3;
    g.beginPath();
    g.moveTo(x0, fy);
    g.lineTo(x0 + p.feldB, fy);
    g.stroke();
    g.restore();

    /* Die Mittelachse – der Fusspunkt sitzt waagerecht in der Mitte. */
    g.save();
    g.strokeStyle = '#A8853F';
    g.globalAlpha = 0.55;
    g.setLineDash([5, 12]);
    g.lineWidth = 1.5;
    g.beginPath();
    g.moveTo(x0 + p.feldB / 2, y0);
    g.lineTo(x0 + p.feldB / 2, fy);
    g.stroke();
    g.restore();

    /* Der Lichtpfeil, links oben. */
    g.save();
    g.translate(x0 + 44, y0 + 44);
    g.strokeStyle = '#3A3426';
    g.lineWidth = 3;
    g.beginPath();
    g.moveTo(0, 0);
    g.lineTo(46, 46);
    g.moveTo(46, 46);
    g.lineTo(46, 30);
    g.moveTo(46, 46);
    g.lineTo(30, 46);
    g.stroke();
    g.restore();

    g.fillStyle = '#6B6047';
    g.font = '24px Georgia, serif';
    g.fillText(`fels_${String(n).padStart(2, '0')}`, x0 + 12, y0 + p.feldH - 14);

    felder.push({ nr: n, beiX: Math.round(mitteX), hoehe: Number(ORTE[n].h.toFixed(3)) });
  }

  return { png: c.toDataURL('image/png').split(',')[1], felder, breite, hoehe };
}, {
  felder: FELDER, spalten: SPALTEN, zeilen: ZEILEN, luft: LUFT, kopf: KOPF,
  feldB: FELD_B, feldH: FELD_H, ankerY: ANKER_Y, randFrei: RAND_FREI,
  punkteJeEinheit: PUNKTE_JE_EINHEIT, karteHoehe: KARTE_HOEHE, baumHoehe: BAUM_HOEHE,
  bandUnten: BAND_UNTEN, abstand: GRATABSTAND,
});
if (fehler.length) throw new Error(fehler[0]);

writeFileSync(join(ARBEIT, 'felsbogen.png'), Buffer.from(bogen.png, 'base64'));
console.log(`  ✓ ${join(ARBEIT, 'felsbogen.png')} (${bogen.breite}×${bogen.hoehe})`);
for (const f of bogen.felder) {
  console.log(`    fels_${String(f.nr).padStart(2, '0')}  Grathöhe ${f.hoehe}`);
}

await seite.close();
await schliesse();
