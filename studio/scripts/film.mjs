/**
 * Eine Kamerafahrt durch die echte Karte, Bild für Bild.
 *
 * ---
 *
 * **Was das ist und was es nicht ist.**
 *
 * Das hier ist **kein zweiter Renderer**. Jedes Bild entsteht durch
 * `maleGebirge`, `maleStaffage` und `maleLage` – dieselben Maler, die im Buch
 * die Karte zeichnen, über dasselbe Kachelwerk. Der Film fügt genau eine
 * Sache hinzu, die das Buch nicht hat: ein Sichtfeld, das sich zwischen zwei
 * Bildern bewegt.
 *
 * Mehr braucht es auch nicht. Die Karte ist schon eine Funktion von Geometrie
 * und Sichtfeld auf ein Bild; eine Bewegung ist dann nur eine Folge von
 * Sichtfeldern. Dass das so einfach ist, ist ein Verdienst des Kachelwerks
 * und kein Zufall.
 *
 * ---
 *
 * **Wie scharf es wird, und warum.**
 *
 * Eine Kachel ist `256 × Dichte` Bildpunkte gross und deckt `kachelmass`
 * Karteneinheiten. Auf dem Bild deckt sie `kachelmass × Massstab` Punkte.
 * Stehen diese beiden Zahlen gleich, wird jede Kachel eins zu eins gezeigt;
 * ist die Kachel kleiner, wird sie hochgezogen und das Bild weich.
 *
 * Deshalb ist die Dichte hier 2 und nicht 1: Bei 1080 Punkten Breite und
 * einem Ausschnitt von 180 Einheiten ist der Massstab 6, eine Kachel der
 * Stufe 4 deckt also 375 Punkte. Aus 512 heruntergerechnet ist das scharf –
 * aus 256 hochgezogen wäre es Brei. Das ist dieselbe Rechnung, die beim
 * Atlas der Bäume schiefging, und sie gilt hier genauso.
 *
 * ---
 *
 * **Nichts davon liegt auf der Platte.**
 *
 * Die Bilder gehen unverzüglich in `ffmpeg` hinein. Hundertfünfzig Bilder
 * wären sonst gut hundert Megabyte, und der Platz in diesem Behälter ist
 * knapp – gemessen, nicht vermutet.
 *
 * ---
 *
 * Aufruf:  npm run film
 *          npm run film -- --fahrt baumgrenze
 *          npm run film -- --fahrt alle --bilder 60
 *          npm run film -- --gif
 */

import { execFileSync, spawn } from 'node:child_process';
import { mkdirSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SCHAUPLATZ, FAHRTEN } from './film/schauplatz.mjs';
import { oeffneBuehne } from './film/buehne.mjs';

const wurzel = join(dirname(fileURLToPath(import.meta.url)), '..');
const ARBEIT = join(wurzel, '.testbau', 'film');

const wahl = (name, vorgabe) => {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : vorgabe;
};

const fahrtWahl = wahl('fahrt', 'kamm');
const BREITE = Number(wahl('breite', 1080));
const TAKT = Number(wahl('takt', 24));
const bilderWahl = wahl('bilder', null);
const auchGif = process.argv.includes('--gif');

const fahrten = fahrtWahl === 'alle'
  ? Object.entries(FAHRTEN)
  : [[fahrtWahl, FAHRTEN[fahrtWahl]]];
if (fahrten.some(([, f]) => !f)) {
  console.error(`Unbekannte Fahrt. Es gibt: ${Object.keys(FAHRTEN).join(', ')}, alle`);
  process.exit(1);
}

rmSync(ARBEIT, { recursive: true, force: true });

const { basis: B, browser, schliesse } = await oeffneBuehne(ARBEIT);

/* =======================================================================
 * DIE BÜHNE – einmal aufbauen, dann nur noch die Kamera bewegen
 * ==================================================================== */

/**
 * Warum der Aufbau genau einmal passiert.
 *
 * Das Kachelwerk ist ein Zwischenspeicher. Baut man ihn für jedes Bild neu
 * auf, backt jedes Bild seine ganze Umgebung von vorn – und der Film wird
 * nicht nur langsam, er prüft auch nichts mehr. So dagegen trägt die Kamera
 * ihren Vorrat mit sich: Bei einer Fahrt nach Osten backt nur die Spalte
 * nach, die neu hereinkommt. Genau das soll auf dem Telefon auch passieren.
 */
async function buehne(seite) {
  await seite.goto(`${B}leer.html`);
  await seite.evaluate(async ([basis, karte, breite]) => {
    const W = await import('/werkbank.mjs');
    const stil = W.ARTBOOK;
    const atlas = await W.ladeAtlas(stil.bildsatz, basis);
    if (!atlas) throw new Error('kein Atlas – wurde gebacken?');
    const buch = W.stilbuchFuer(stil, atlas);

    const k = W.heileKarte(karte);
    const raster = new W.Staffageraster(W.staffageAus(k.features, buch, k.kaemme));
    const rand = W.WERKPLAN.ueberstand;
    /*
     * Drei Zahlen weichen hier vom Buch ab, und jede aus einem Grund.
     *
     * **Dichte 2**, damit die Kacheln heruntergerechnet und nicht hochgezogen
     * werden – sonst ist der Film Brei.
     *
     * **Zeitbudget unbegrenzt.** Im Buch darf ein Bild acht Millisekunden
     * kosten, weil die Hand nicht warten soll. Hier wartet niemand, und ein
     * halbfertiges Bild wäre ein Fehler im Film.
     *
     * **Speicherdeckel 512 MB statt 48.** Das ist nicht Grosszügigkeit,
     * sondern gemessen: Bei 1080 Punkten Breite und einem Ausschnitt von 180
     * Einheiten wählt `stufeFuer` die Stufe 5, eine Kachel deckt dann 31
     * Einheiten, und der Ausschnitt braucht sieben mal sieben – **49 Kacheln
     * à 1 MB bei einem Deckel von 48**. Eine einzige zu viel, und der
     * Zwischenspeicher wirft bei jedem Bild eine sichtbare Kachel hinaus,
     * die das Zeichnen sofort wieder anfordert. Gemessen: 400 Runden und 850
     * gebackene Kacheln für ein Bild, 50 Sekunden statt einer.
     *
     * Der Deckel von 48 MB ist richtig – für ein Telefon, das die Seite
     * sonst verliert. Dieser Film läuft auf einem Rechner.
     */
    const plan = { ...W.WERKPLAN, dichte: 2, budgetMs: 1e9, budgetBytes: 512 * 1024 * 1024 };

    const bewuchs = new W.Kachelwerk('bewuchs', (ctx, kach, massstab) => {
      const liste = raster.imKasten(
        kach.x0 - rand, kach.y0 - rand, kach.x1 + rand, kach.y1 + rand,
      );
      W.maleStaffage(ctx, kach, massstab, liste, buch, stil, { rand, dichte: 2 });
    }, plan);
    const grund = new W.Kachelwerk('grund', (ctx, kach, massstab) => {
      W.maleGebirge(ctx, kach, massstab, k.kaemme, stil, { dichte: 2 });
    }, { ...plan, ueberstand: 0 });

    const c = document.createElement('canvas');
    c.width = breite;
    c.height = breite;
    document.body.appendChild(c);

    /*
     * **Es gibt hier keine Wasserfläche, und das ist Absicht.**
     *
     * Ein erster Versuch hat Seen selbst gefüllt, damit die Landschaft nicht
     * trocken aussieht. Das Ergebnis war ein aufgeklebter blauer Fleck ohne
     * Saum – ein See, der anders aussieht als der im Buch. Zwei Wahrheiten
     * über dasselbe Wasser sind schlimmer als gar kein See; die Begründung
     * steht ausführlich in `film/schauplatz.mjs`.
     */
    window.__film = { W, stil, grund, bewuchs, c, g: c.getContext('2d'), stufe: undefined };
  }, [B, SCHAUPLATZ, BREITE]);
}

/**
 * Ein einzelnes Bild.
 *
 * Zeichnen fordert an, Backen erfüllt – abwechselnd, bis nichts mehr
 * aussteht. Dann ein letztes Mal zeichnen, damit auch die zuletzt gebackene
 * Kachel im Bild steht. **Das ist derselbe Fehler, der im Buch das Loch im
 * Wald verursacht hat**, nur hier offensichtlich: Ohne das letzte Zeichnen
 * fehlt genau die Kachel, die als letzte fertig wurde.
 */
async function bild(seite, sicht) {
  return seite.evaluate(async (sicht) => {
    const f = window.__film;
    const { W, stil, grund, bewuchs, c, g } = f;
    const px = c.width;

    f.stufe = W.stufeFuer(px, sicht.w, f.stufe);

    const male = () => {
      g.setTransform(1, 0, 0, 1, 0, 0);
      g.fillStyle = stil.land.flaeche;
      g.fillRect(0, 0, px, px);

      W.maleLage(g, grund, sicht, px, f.stufe);
      W.maleLage(g, bewuchs, sicht, px, f.stufe);
    };

    /*
     * **Die Abbruchbedingung hängt am Ofen, nicht am Backen.**
     *
     * Erst stand hier „backen, bis das Backen nichts mehr meldet". Das ist
     * nicht dasselbe: Bei unbegrenztem Budget backt die erste Runde alles
     * und meldet danach nichts mehr – aber gezeichnet wurde in dieser Runde
     * *vor* dem Backen. Was das Zeichnen danach noch anfordert, etwa eine
     * gröbere Kachel als Vorschau, blieb liegen, und der Lauf scheiterte
     * mit „es blieb etwas im Ofen".
     *
     * Jetzt wird gezeichnet, und **dann** gefragt, ob dabei etwas
     * angefordert wurde. Nur wenn nicht, ist das Bild vollständig.
     */
    let runden = 0;
    for (; runden < 400; runden++) {
      male();
      if (!grund.wartend() && !bewuchs.wartend()) break;
      grund.backeBudgetiert();
      bewuchs.backeBudgetiert();
    }
    if (grund.wartend() || bewuchs.wartend()) {
      throw new Error(
        `es blieb etwas im Ofen: Grund ${grund.wartend()}, Bewuchs ${bewuchs.wartend()}, `
        + `Stufe ${f.stufe}, ${runden} Runden, `
        + `${(grund.bytes() / 1048576).toFixed(1)} + ${(bewuchs.bytes() / 1048576).toFixed(1)} MB, `
        + `${grund.anzahl()} + ${bewuchs.anzahl()} Kacheln, `
        + `verdrängt ${grund.verdraengt} + ${bewuchs.verdraengt}`,
      );
    }
    const gebacken = grund.gebacken + bewuchs.gebacken;
    return {
      daten: c.toDataURL('image/png').split(',')[1],
      runden,
      gebacken,
      msGebacken: Math.round(grund.msGebacken + bewuchs.msGebacken),
    };
  }, sicht);
}

/* =======================================================================
 * DREHEN
 * ==================================================================== */

/** `ffmpeg` mit offenem Mund: Die Bilder gehen hinein, wie sie entstehen. */
function kamera(ziel, takt) {
  const k = spawn('ffmpeg', [
    '-y', '-loglevel', 'error',
    '-f', 'image2pipe', '-framerate', String(takt), '-i', '-',
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '20',
    '-pix_fmt', 'yuv420p', '-movflags', '+faststart',
    ziel,
  ], { stdio: ['pipe', 'inherit', 'inherit'] });
  return k;
}

/**
 * Ein Bild in den offenen Mund schieben, ohne ihn zu überfüllen.
 *
 * `write` meldet mit `false`, dass der Puffer voll ist; dann wird auf
 * `drain` gewartet. Der Fehlerhorcher hängt **nicht** hier, sondern einmal
 * am Strom – hier angehängt, sammelten sich bei 150 Bildern 150 Horcher an
 * derselben Steckdose, und Node warnte zu Recht vor einem Leck.
 */
const schreibe = (strom, puffer) =>
  new Promise((ok) => {
    if (strom.write(puffer)) ok();
    else strom.once('drain', ok);
  });

let fehlgeschlagen = false;

for (const [kennung, fahrt] of fahrten) {
  const bilder = Number(bilderWahl ?? fahrt.bilder);
  const ziel = join(ARBEIT, `${kennung}.mp4`);
  console.log(`\n${fahrt.name} – ${bilder} Bilder, ${BREITE}×${BREITE}, ${TAKT}/s`);

  const seite = await browser.newPage({ viewport: { width: 900, height: 900 } });
  const fehler = [];
  seite.on('pageerror', (e) => fehler.push(e.message));
  await buehne(seite);

  const ffmpeg = kamera(ziel, TAKT);
  const fertig = new Promise((ok, nein) => {
    ffmpeg.on('close', (code) => (code === 0 ? ok() : nein(new Error(`ffmpeg: ${code}`))));
    ffmpeg.stdin.on('error', nein);
  });

  const t0 = Date.now();
  let vorherGebacken = 0;
  let vorherMs = 0;
  try {
    for (let n = 0; n < bilder; n++) {
      /*
       * `bilder - 1` im Nenner, damit das letzte Bild wirklich bei t = 1
       * ankommt. Mit `bilder` fehlte am Ende ein Bildschritt, und eine Fahrt,
       * die kurz vor dem Ziel aufhört, sieht nach einem Schnittfehler aus.
       */
      const t = bilder === 1 ? 0 : n / (bilder - 1);
      const tb = Date.now();
      const b = await bild(seite, fahrt.sicht(t));
      if (fehler.length) throw new Error(fehler[0]);
      await schreibe(ffmpeg.stdin, Buffer.from(b.daten, 'base64'));
      const ms = Date.now() - tb;
      if (process.env.FILM_LAUT) {
        process.stdout.write(
          `  ${String(n + 1).padStart(3)}  ${String(ms).padStart(6)} ms  `
          + `${b.gebacken - vorherGebacken} Kacheln (${b.msGebacken - vorherMs} ms), `
          + `${b.runden} Runden\n`,
        );
      } else if ((n + 1) % 25 === 0 || n + 1 === bilder) {
        const s = (Date.now() - t0) / 1000;
        process.stdout.write(
          `  ${n + 1}/${bilder}  (${(s / (n + 1)).toFixed(2)} s je Bild, zuletzt ${(ms / 1000).toFixed(2)} s)\n`,
        );
      }
      vorherGebacken = b.gebacken;
      vorherMs = b.msGebacken;
    }
  } catch (e) {
    console.error(`  ✗ ${fahrt.name}: ${e.message}`);
    fehlgeschlagen = true;
  }
  ffmpeg.stdin.end();
  await fertig.catch((e) => { console.error(`  ✗ ${e.message}`); fehlgeschlagen = true; });
  await seite.close();

  if (!fehlgeschlagen) {
    console.log(`  ✓ ${ziel}`);
    if (auchGif) {
      /*
       * Ein Umweg über eine Farbtabelle, weil ein GIF nur 256 Farben kann.
       * Ohne `palettegen` wählt ffmpeg eine Standardtabelle, und ein
       * Artbook-Grün wird darin zu Grau.
       */
      const gif = ziel.replace(/\.mp4$/, '.gif');
      execFileSync('ffmpeg', [
        '-y', '-loglevel', 'error', '-i', ziel,
        '-vf', 'fps=12,scale=540:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=192[p];[b][p]paletteuse=dither=bayer',
        gif,
      ], { stdio: 'inherit' });
      console.log(`  ✓ ${gif}`);
    }
  }
}

await schliesse();
process.exit(fehlgeschlagen ? 1 : 0);
