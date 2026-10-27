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
 * **Die Masse kommen aus dem Querschnitt, nicht aus einer Vorstellung.**
 *
 * Gemessen am höchsten Grat des Hauptkamms, senkrecht zum Verlauf: Der
 * Gipfel ist **98 Karteneinheiten hoch** und am Fuss **222 breit**. Das ist
 * ein Verhältnis von 2,27 zu 1 – ein breiter Buckel, keine Zacke. Ein
 * gemalter Zackengipfel stünde im Widerspruch zu dem, was darunter
 * gerechnet wird, und der Widerspruch fiele genau dann auf, wenn man
 * heranzoomt.
 *
 * Zum Vergleich: Ein Baum ist 26 Einheiten hoch. Ein Gipfel ist also nicht
 * haushoch über dem Wald, sondern knapp viermal so hoch wie eine Fichte.
 */
const KARTE_HOEHE = 98;
const BREITE_ZU_HOEHE = 2.27;
/** Ein Baum, zum Vergleich daneben. */
const BAUM_HOEHE = 26;
/** Bildpunkte je Karteneinheit beim engsten Zoom, doppelte Dichte. */
const PUNKTE_JE_EINHEIT = 16.384;

/**
 * **Die Auflösung deckt den häufigen Fall, nicht den äussersten.**
 *
 * Beim engsten Zoom sind es 16,384 Bildpunkte je Karteneinheit; ein Gipfel
 * von 98 Einheiten bräuchte dann 1605 Punkte, bei 2,27 Breite also 3644 –
 * mal acht Varianten wäre das ein Atlas, den kein Telefon lädt.
 *
 * Beim engsten Zoom passt ein Gipfel von 222 Einheiten Breite aber ohnehin
 * nicht mehr aufs Bild. Der nächste Zoom, bei dem er **ganz** zu sehen ist,
 * deckt 222 Einheiten auf 2048 Punkten – 9,2 je Einheit, also 900 Punkte
 * Höhe. Das ist die Grösse, bei der man einen Berg wirklich ansieht.
 *
 * Wer näher herangeht, sieht eine Vergrösserung – aber dort trägt die
 * gerechnete Schattierung darunter die Feinheit, und die hat keine
 * Auflösungsgrenze.
 */
const FELD_H = wahl('punkte', 900);
const FELD_B = Math.round(FELD_H * BREITE_ZU_HOEHE);
/** Wo der Fuss sitzt – derselbe Anker wie bei Baum und Unterholz. */
const ANKER_Y = 0.96;
/** Luft am Rand, damit die Glättung nicht anschneidet. */
const RAND_FREI = 0.015;

const SPALTEN = 2;
const ZEILEN = Math.ceil(FELDER / SPALTEN);
const LUFT = 48;
const KOPF = 150;

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

  const felder = [];
  for (let n = 0; n < ORTE.length; n++) {
    const sp = n % p.spalten;
    const ze = Math.floor(n / p.spalten);
    const x0 = p.luft + sp * (p.feldB + p.luft);
    const y0 = p.kopf + p.luft + ze * (p.feldH + p.luft);

    /* ---- Die Unterlage: der echte Querschnitt ----------------------- */
    /*
     * **Warum ein Querschnitt und keine Schattierung.**
     *
     * Der erste Entwurf hat `maleGebirge` untergelegt. Das war die falsche
     * Projektion: Die Schattierung sieht von **oben** auf das Gelände, eine
     * gemalte Felswand steht aber **aufrecht** wie ein Baum. Wer auf eine
     * Draufsicht malt, malt eine Wand, die nie passt.
     *
     * Hier steht deshalb die Silhouette, die `hoeheUeberall` senkrecht zum
     * Kamm wirklich liefert – die Linie, hinter der die gemalte Wand
     * verschwinden darf und vor der sie nicht herausragen sollte.
     */
    const mitteX = ORTE[n].x;
    const prof = [];
    const halb = (p.feldB / 2) / p.punkteJeEinheit;
    for (let px = 0; px <= p.feldB; px += 2) {
      const t = (px / p.feldB - 0.5) * 2 * halb;
      prof.push([px, W.hoeheUeberall(mitteX, 600 + t, [kamm]) * W.GEBIRGE.vollhoehe]);
    }
    const fussY = y0 + Math.round(p.feldH * p.ankerY);
    const jeEinheit = (fussY - y0) / p.karteHoehe;

    g.save();
    g.beginPath();
    g.moveTo(x0, fussY);
    for (const [px, e] of prof) g.lineTo(x0 + px, fussY - e * jeEinheit);
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
     * Mit ihm sieht man, dass ein Gipfel knapp vier Fichten hoch ist – und
     * malt etwas, das daneben bestehen kann.
     */
    const bh = p.baumHoehe * jeEinheit;
    const bx = x0 + p.feldB - 70;
    g.save();
    g.fillStyle = '#7A8467';
    g.beginPath();
    g.moveTo(bx, fussY - bh);
    g.lineTo(bx - bh * 0.26, fussY);
    g.lineTo(bx + bh * 0.26, fussY);
    g.closePath();
    g.fill();
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
    const fy = y0 + Math.round(p.feldH * p.ankerY);
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
});
if (fehler.length) throw new Error(fehler[0]);

writeFileSync(join(ARBEIT, 'felsbogen.png'), Buffer.from(bogen.png, 'base64'));
console.log(`  ✓ ${join(ARBEIT, 'felsbogen.png')} (${bogen.breite}×${bogen.hoehe})`);
for (const f of bogen.felder) {
  console.log(`    fels_${String(f.nr).padStart(2, '0')}  Grathöhe ${f.hoehe}`);
}

await seite.close();
await schliesse();
