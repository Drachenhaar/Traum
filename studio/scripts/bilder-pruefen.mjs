/**
 * Die Bildprüfung – sieht die Karte noch aus wie gestern?
 *
 * ---
 *
 * **Der Anlass, und er ist unangenehm.**
 *
 * Neunundfünfzig Prüfdateien, und kein einziger Bildvergleich. Jedes
 * optische Urteil dieses Sommers ist mit den Augen gefällt worden:
 * Ausschnitt zeichnen, hinsehen, meinen. Was das gekostet hat:
 *
 * - **Die Kachelnähte im Waldwerk** wurden durch Hinsehen und Vergrössern
 *   gefunden, zweimal hintereinander, weil unter der ersten Ursache eine
 *   zweite lag.
 * - **Beim Gebirge** wurde sechs Durchläufe lang eine „bröckelnde Stufe"
 *   beurteilt, bis auffiel, dass der eigene Kontaktabzug die untere Hälfte
 *   abschnitt. Geurteilt wurde über ein Bild, das nie ganz zu sehen war.
 * - **Die matschigen Bäume hat der Verfasser gefunden, nicht die Prüfung.**
 *   Hundertneunzig Bildpunkte statt vierhundertsechsundzwanzig, von Anfang
 *   an falsch, und keine der damals achtundfünfzig Prüfungen hat es
 *   bemerkt.
 *
 * Eine Zusage, die nur im Bild sichtbar ist, braucht eine Prüfung, die ins
 * Bild sieht. Alles andere ist Hoffnung.
 *
 * ---
 *
 * **Was hier *nicht* geprüft wird: ob es schön ist.**
 *
 * Diese Prüfung hat keine Meinung. Sie sagt nur: *hier* hat sich etwas
 * geändert, und zwar so viel. Ob die Änderung gut war, entscheidet ein
 * Mensch – und schreibt die Vorlagen neu:
 *
 *     npm run bilder -- --neu
 *
 * Das ist ausdrücklich ein eigener Befehl und passiert nie von selbst. Eine
 * Prüfung, die ihre Vorlage bei Abweichung stillschweigend nachzieht, ist
 * keine Prüfung, sondern ein Tagebuch.
 *
 * ---
 *
 * **Die Schwelle ist gemessen, nicht geraten.**
 *
 * Zweimal dasselbe gezeichnet ergibt nicht Bildpunkt für Bildpunkt
 * dasselbe: Kantenglättung und Textdarstellung schwanken geringfügig.
 * `--rauschen` misst diesen Boden, indem es jede Szene zweimal zeichnet und
 * vergleicht. Die Schwellen unten stammen aus diesem Lauf, mit Luft nach
 * oben.
 *
 * ---
 *
 * **Warum sie nicht in der CI läuft.**
 *
 * Die Vorlagen sind auf *einem* Rechner entstanden. Ein anderer zeichnet
 * Kantenglättung und Schrift geringfügig anders – und eine Prüfung, die auf
 * dem Bauserver grundlos anschlägt, wird nach dem dritten Mal abgeschaltet.
 * Der Kopf von `pruefung.yml` sagt es für den umgekehrten Fall: „Ein Wächter
 * vor einem Netz mit Löchern ist schlimmer als keiner." Einer, der ohne
 * Grund schreit, auch.
 *
 * Dazu kommt, dass Playwright hier nicht in den Abhängigkeiten steht,
 * sondern im Container liegt. Wer sie in die CI holen will, muss beides
 * lösen: Playwright installieren **und** die Vorlagen dort erzeugen, wo sie
 * auch verglichen werden.
 *
 * ---
 *
 * **Was die Kachelszenen nicht sehen.**
 *
 * Sie setzen ihre vier Kacheln selbst aneinander und gehen dabei nicht durch
 * `maler.ts`. Ein Fehler **im Maler** – etwa die halbe Überlappung, die über
 * dem ganzen Wald ein dunkles Gitter lag – zeigt sich deshalb nur in den
 * Kartenszenen. Gegengeprobt: Er tut es, mit acht bis neun Prozent
 * Abweichung.
 *
 * ---
 *
 * Aufruf:  npm run bilder          (nach einem Build)
 *          npm run bilder -- --neu       Vorlagen neu schreiben
 *          npm run bilder -- --rauschen  den Rauschboden messen
 */

import { createServer } from 'node:http';
import { execFileSync } from 'node:child_process';
import {
  readFileSync, writeFileSync, existsSync, mkdirSync, rmSync, readdirSync,
} from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SZENEN } from './bilder/szenen.mjs';

const wurzel = join(dirname(fileURLToPath(import.meta.url)), '..');
const VORLAGEN = join(wurzel, 'tests', 'bilder');
const ARBEIT = join(wurzel, '.testbau', 'bilder');
const DIST = join(wurzel, 'dist');

const neuSchreiben = process.argv.includes('--neu');
const rauschen = process.argv.includes('--rauschen');

/**
 * Wie weit zwei Bilder auseinanderliegen dürfen.
 *
 * `kanal` ist der erlaubte Abstand je Farbkanal – darunter zählt ein
 * Bildpunkt als gleich. `anteil` ist, wie viele Punkte überhaupt abweichen
 * dürfen.
 *
 * Kachelbilder sind reine Rechnung und dürfen deshalb fast nichts: Dort ist
 * jede Abweichung eine echte Änderung. Kartenbilder tragen Text und
 * Kantenglättung des Browsers und bekommen etwas Luft.
 */
const SCHWELLE = {
  kachel: { kanal: 2, anteil: 0.0002 },
  maler: { kanal: 2, anteil: 0.0002 },
  karte: { kanal: 3, anteil: 0.0004 },
};

/*
 * **Gemessen: der Boden ist null.**
 *
 * `--rauschen` zeichnet jede Szene zweimal und vergleicht. Auf dieser
 * Maschine kommt in allen vier Szenen **grösster Kanalabstand 0** heraus,
 * bitgleich – auch bei den Kartenbildern durch die ganze Anwendung.
 *
 * Die Schwellen oben sind trotzdem nicht null, und das ist kein
 * Sicherheitsabstand aus Bequemlichkeit: Gemessen ist dieser eine Rechner.
 * Ein anderer kann bei der Kantenglättung um einen Punkt danebenliegen, und
 * eine Prüfung, die auf jedem zweiten Rechner grundlos anschlägt, wird
 * abgeschaltet.
 *
 * Nach oben begrenzt sie das, was sie noch finden muss: Eine Naht von einem
 * Bildpunkt quer durch einen Block von 512 Punkten sind 512 von 262 144
 * Punkten, also **0,195 %**. Alles, was darüber erlaubt wäre, liesse genau
 * den Fehler durch, für den diese Prüfung gebaut wurde.
 */

if (!existsSync(DIST)) {
  console.error('Kein Build gefunden. Erst „npm run build", dann diese Pruefung.');
  process.exit(1);
}

rmSync(ARBEIT, { recursive: true, force: true });
mkdirSync(ARBEIT, { recursive: true });
mkdirSync(VORLAGEN, { recursive: true });

/* ---- Die echten Maler bündeln ------------------------------------------ */
execFileSync(
  'npx',
  ['esbuild', 'scripts/bilder/werkbank.ts', '--bundle', '--format=esm',
   `--outfile=${join(ARBEIT, 'werkbank.mjs')}`, '--log-level=error'],
  { cwd: wurzel, stdio: 'inherit' },
);

/* ---- Ein Server für Build, Bündel und Vorlagen -------------------------- */
const typen = {
  '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript',
  '.css': 'text/css', '.json': 'application/json', '.png': 'image/png',
  '.webp': 'image/webp', '.svg': 'image/svg+xml', '.woff2': 'font/woff2',
};
const server = createServer((anfrage, antwort) => {
  const pfad = (anfrage.url ?? '/').split('?')[0];
  let datei;
  if (pfad === '/werkbank.mjs') datei = join(ARBEIT, 'werkbank.mjs');
  else if (pfad === '/leer.html') {
    antwort.writeHead(200, { 'content-type': 'text/html' }).end('<!doctype html><title>leer</title>');
    return;
  } else datei = join(DIST, pfad.replace(/^\/Traum\/studio/, '').replace(/^\//, '') || 'index.html');
  if (!existsSync(datei) || !datei.startsWith(wurzel)) { antwort.writeHead(404).end(); return; }
  antwort
    .writeHead(200, { 'content-type': typen[datei.slice(datei.lastIndexOf('.'))] ?? 'application/octet-stream' })
    .end(readFileSync(datei));
});
await new Promise((ok) => server.listen(0, ok));
const hafen = server.address().port;
const B = `http://localhost:${hafen}/`;

const pw = await import('playwright').catch(() =>
  import('/opt/node22/lib/node_modules/playwright/index.js'));
const chromium = pw.chromium ?? pw.default?.chromium;
const browser = await chromium.launch(
  process.env.PLAYWRIGHT_BROWSERS_PATH
    ? {}
    : { executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' },
);

/* =======================================================================
 * EINE SZENE ZEICHNEN
 * ==================================================================== */

/**
 * Ein Block aus zwei mal zwei Kacheln, durch die echten Maler.
 *
 * Kein React, keine Gesten, kein Zeitverhalten – eine Kachel ist eine reine
 * Rechnung. Deshalb ist dieses Bild bis auf den Bildpunkt wiederholbar, und
 * deshalb lassen sich damit Nähte überhaupt bewachen.
 */
async function zeichneBlock(szene) {
  const seite = await browser.newPage({ viewport: { width: 600, height: 600 } });
  const fehler = [];
  seite.on('pageerror', (e) => fehler.push(e.message));
  await seite.goto(`${B}leer.html`);

  const daten = await seite.evaluate(async ([basis, s]) => {
    const W = await import('/werkbank.mjs');
    const stil = W.ARTBOOK;
    const atlas = await W.ladeAtlas(stil.bildsatz, basis);
    if (!atlas) throw new Error('kein Atlas – wurde gebacken?');
    const buch = W.stilbuchFuer(stil, atlas);

    const karte = W.heileKarte(s.karte);
    const staffage = W.staffageAus(karte.features, buch, karte.kaemme);
    const raster = new W.Staffageraster(staffage);

    const mass = W.kachelmass(s.stufe);
    const px = 256;
    const massstab = px / mass;
    const rand = W.WERKPLAN.ueberstand;

    const block = document.createElement('canvas');
    block.width = px * 2;
    block.height = px * 2;
    const g = block.getContext('2d');
    /*
     * Der Grund, auf dem die Kacheln liegen.
     *
     * Auf der Karte ist das die Landfläche aus dem SVG darunter. Hier wird
     * sie mit ihrer Farbe angenähert – geprüft werden die Kacheln, nicht
     * der Untergrund, und ein durchsichtiger Grund machte jede Abweichung
     * in den halbdurchsichtigen Lagen unlesbar.
     */
    g.fillStyle = stil.land.flaeche;
    g.fillRect(0, 0, block.width, block.height);

    for (let dj = 0; dj < 2; dj++) {
      for (let di = 0; di < 2; di++) {
        const i = s.i + di;
        const j = s.j + dj;
        const x0 = i * mass;
        const y0 = j * mass;
        const kasten = { x0, y0, x1: x0 + mass, y1: y0 + mass };

        const kachel = document.createElement('canvas');
        kachel.width = px;
        kachel.height = px;
        const k = kachel.getContext('2d');
        k.setTransform(massstab, 0, 0, massstab, -x0 * massstab, -y0 * massstab);

        /* Dieselbe Reihenfolge wie auf der Karte: erst der Grund. */
        W.maleGebirge(k, kasten, massstab, karte.kaemme, stil, { dichte: 1 });
        const liste = raster.imKasten(x0 - rand, y0 - rand, kasten.x1 + rand, kasten.y1 + rand);
        W.maleStaffage(k, kasten, massstab, liste, buch, stil, { rand, dichte: 1 });

        g.drawImage(kachel, di * px, dj * px);
      }
    }
    return block.toDataURL('image/png').split(',')[1];
  }, [B, { karte: szene.karte, stufe: szene.stufe, i: szene.i, j: szene.j }]);

  await seite.close();
  if (fehler.length) throw new Error(`${szene.name}: ${fehler[0]}`);
  return Buffer.from(daten, 'base64');
}

/**
 * Die ganze Karte, durch die Anwendung – in der Grundsicht, ohne Geste.
 *
 * Gewartet wird, bis **nichts mehr backt**. Die Bedingung war erst zu
 * schwach: keine Vorschau, keine veraltete Kachel, und zwei Messungen
 * hintereinander dieselbe Zahl gebackener Kacheln. Das reicht nicht – eine
 * Kachel, die noch gar nicht gebacken ist, zählt weder als Vorschau noch
 * als veraltet. Sie ist ein Loch, und ein Loch sah von aussen aus wie ein
 * fertiges Bild.
 *
 * Gefunden hat es die Prüfung selbst: In einem von mehreren Läufen fehlte im
 * Osten genau ein Kachelrechteck, 0,233 % Abweichung. Daraufhin kam
 * `wartend` in die Messung – die Länge der Warteschlange.
 *
 * **Und auch das reichte nicht.** Mit leerer Warteschlange, ohne veraltete
 * Kachel und ohne Vorschau wechselte das Bild weiter zwischen zwei Läufen,
 * um bis zu 1,4 %: je ein kachelgrosser Fleck am Südrand der beiden Wälder.
 * Die Ursache ist nicht gefunden – siehe `AUSSENSICHT.md`; es gibt ein
 * Zeitfenster, in dem alle Zähler „fertig" sagen und die Leinwand es nicht
 * ist.
 *
 * Deshalb hängt die Wartebedingung **nicht mehr an den Zählern, sondern am
 * Bild selbst**: Aufgenommen wird, bis zwei Aufnahmen hintereinander
 * bitgleich sind. Das ist die einzige Bedingung, die nicht davon abhängt,
 * ob die Messung die Wahrheit sagt – und sie prüft genau das, worauf es
 * ankommt. Wer sie nicht erreicht, scheitert laut.
 */
async function zeichneKarte(szene) {
  const kontext = await browser.newContext({
    viewport: { width: 900, height: 1000 },
    deviceScaleFactor: 1,
  });
  const seite = await kontext.newPage();
  const fehler = [];
  seite.on('pageerror', (e) => fehler.push(e.message));

  await seite.goto(B);
  await seite.waitForTimeout(2500);
  await seite.evaluate(async (k) => {
    const db = await new Promise((ok) => {
      const r = indexedDB.open('dragoncore-studio');
      r.onsuccess = () => ok(r.result);
    });
    const tx = db.transaction(['books', 'welten', 'settings', 'karten'], 'readwrite');
    const j = Date.now();
    tx.objectStore('books').put({
      id: 'b1', title: 'Bildprobe', worldId: 'w1', worldName: 'Bildwelt', art: 'artbook',
      coverMaterial: 'leder', coverColor: 'umbra', emblemType: 'preset', emblemId: 'drache',
      recentIds: [], goals: [], customTypes: [], createdAt: j, updatedAt: j, lastOpenedAt: j,
    });
    tx.objectStore('welten').put({ id: 'w1', name: 'Bildwelt', createdAt: j, updatedAt: j });
    const st = await new Promise((ok) => {
      const q = tx.objectStore('settings').get('settings');
      q.onsuccess = () => ok(q.result || { id: 'settings' });
    });
    st.activeBookId = 'b1';
    st.leitfaden = { an: false, erledigt: [] };
    tx.objectStore('settings').put(st);
    /* Nur diese eine Karte – eine zweite stünde in derselben Welt. */
    tx.objectStore('karten').clear();
    tx.objectStore('karten').put(k);
    await new Promise((ok) => { tx.oncomplete = ok; });
    db.close();
  }, szene.karte);

  await seite.goto(B);
  await seite.reload();
  await seite.waitForTimeout(2500);
  await seite.goto(`${B}#/weltkarte`);
  await seite.waitForTimeout(3000);
  for (const t of ['Verstanden', 'Nicht mehr zeigen']) {
    await seite.evaluate(
      (x) => [...document.querySelectorAll('button')]
        .find((e) => (e.textContent || '').includes(x))?.click(),
      t,
    );
  }
  await seite.waitForTimeout(1200);

  const feld = await seite.$('[data-raum="aus"]');
  if (!feld) throw new Error(`${szene.name}: kein Kartenfeld gefunden`);

  /*
   * Aufnehmen, bis sich nichts mehr ändert.
   *
   * Zwei bitgleiche Aufnahmen hintereinander, dazwischen eine knappe
   * Sekunde. Die Zähler des Kartenwerks werden dabei bewusst **nicht**
   * gefragt – siehe oben: Sie haben schon „fertig" gesagt, als es nicht
   * stimmte.
   */
  let bild = await feld.screenshot({ type: 'png' });
  let gleich = 0;
  for (let i = 0; i < 25 && gleich < 1; i++) {
    await seite.waitForTimeout(900);
    const naechstes = await feld.screenshot({ type: 'png' });
    gleich = Buffer.compare(bild, naechstes) === 0 ? gleich + 1 : 0;
    bild = naechstes;
  }
  if (!gleich) throw new Error(`${szene.name}: das Bild kam nicht zur Ruhe`);

  await kontext.close();
  if (fehler.length) throw new Error(`${szene.name}: ${fehler[0]}`);
  return bild;
}

/**
 * Vier Kacheln, **durch den Maler** gesetzt.
 *
 * Der Unterschied zu `zeichneBlock`: Dort werden die Kacheln von Hand
 * aneinandergesetzt, hier geht derselbe Weg durch `maleLage` – also über
 * den Code, der sie auf der Karte setzt. Gebacken wird in einer Schleife,
 * bis nichts mehr aussteht; das ist rein rechnerisch und braucht weder
 * Bildtakt noch Wartezeit.
 */
async function zeichneMaler(szene) {
  const seite = await browser.newPage({ viewport: { width: 700, height: 700 } });
  const fehler = [];
  seite.on('pageerror', (e) => fehler.push(e.message));
  await seite.goto(`${B}leer.html`);

  const daten = await seite.evaluate(async ([basis, s]) => {
    const W = await import('/werkbank.mjs');
    const stil = W.ARTBOOK;
    const atlas = await W.ladeAtlas(stil.bildsatz, basis);
    if (!atlas) throw new Error('kein Atlas – wurde gebacken?');
    const buch = W.stilbuchFuer(stil, atlas);

    const karte = W.heileKarte(s.karte);
    const raster = new W.Staffageraster(W.staffageAus(karte.features, buch, karte.kaemme));
    const rand = W.WERKPLAN.ueberstand;
    const plan = { ...W.WERKPLAN, dichte: 1 };

    const bewuchs = new W.Kachelwerk('bewuchs', (ctx, kach, massstab) => {
      const liste = raster.imKasten(
        kach.x0 - rand, kach.y0 - rand, kach.x1 + rand, kach.y1 + rand,
      );
      W.maleStaffage(ctx, kach, massstab, liste, buch, stil, { rand, dichte: 1 });
    }, plan);
    const grund = new W.Kachelwerk('grund', (ctx, kach, massstab) => {
      W.maleGebirge(ctx, kach, massstab, karte.kaemme, stil, { dichte: 1 });
    }, { ...plan, ueberstand: 0 });

    const px = 600;
    const c = document.createElement('canvas');
    c.width = px;
    c.height = px;
    const g = c.getContext('2d');

    /*
     * Zeichnen fordert an, backen erfüllt – abwechselnd, bis nichts mehr
     * aussteht. Dann ein letztes Mal zeichnen, damit auch die zuletzt
     * gebackene Kachel im Bild steht.
     */
    const male = () => {
      g.setTransform(1, 0, 0, 1, 0, 0);
      g.fillStyle = stil.land.flaeche;
      g.fillRect(0, 0, px, px);
      W.maleLage(g, grund, s.sicht, px, s.stufe);
      W.maleLage(g, bewuchs, s.sicht, px, s.stufe);
    };
    for (let runde = 0; runde < 200; runde++) {
      male();
      const a = grund.backeBudgetiert();
      const b = bewuchs.backeBudgetiert();
      if (!a && !b) break;
    }
    male();
    if (grund.wartend() || bewuchs.wartend()) throw new Error('es blieb etwas im Ofen');
    return c.toDataURL('image/png').split(',')[1];
  }, [B, { karte: szene.karte, stufe: szene.stufe, sicht: szene.sicht }]);

  await seite.close();
  if (fehler.length) throw new Error(`${szene.name}: ${fehler[0]}`);
  return Buffer.from(daten, 'base64');
}

const zeichne = (szene) => {
  if (szene.art === 'kachel') return zeichneBlock(szene);
  if (szene.art === 'maler') return zeichneMaler(szene);
  return zeichneKarte(szene);
};

/* =======================================================================
 * VERGLEICHEN
 * ==================================================================== */

/**
 * Zwei Bilder vergleichen – im Browser, weil der PNG lesen kann.
 *
 * Node kann es ohne weitere Abhängigkeit nicht, und eine Abhängigkeit für
 * eine Prüfung einzuführen, die genau einmal im Monat anschlägt, wäre ein
 * schlechter Tausch. Der Browser läuft ohnehin.
 */
async function vergleiche(a, b, kanal) {
  const seite = await browser.newPage();
  await seite.goto(`${B}leer.html`);
  const ergebnis = await seite.evaluate(async ([x, y, grenze]) => {
    const laden = (d) => new Promise((ok, nein) => {
      const i = new Image();
      i.onload = () => ok(i);
      i.onerror = () => nein(new Error('Bild unlesbar'));
      i.src = 'data:image/png;base64,' + d;
    });
    const [ia, ib] = await Promise.all([laden(x), laden(y)]);
    if (ia.naturalWidth !== ib.naturalWidth || ia.naturalHeight !== ib.naturalHeight) {
      return { masse: `${ia.naturalWidth}×${ia.naturalHeight} gegen ${ib.naturalWidth}×${ib.naturalHeight}` };
    }
    const w = ia.naturalWidth;
    const h = ia.naturalHeight;
    const hol = (bild) => {
      const c = document.createElement('canvas');
      c.width = w; c.height = h;
      const g = c.getContext('2d', { willReadFrequently: true });
      g.drawImage(bild, 0, 0);
      return g.getImageData(0, 0, w, h).data;
    };
    const da = hol(ia);
    const db = hol(ib);

    const diff = document.createElement('canvas');
    diff.width = w; diff.height = h;
    const dg = diff.getContext('2d');
    const dbild = dg.createImageData(w, h);
    const dd = dbild.data;

    let anders = 0;
    let groesste = 0;
    for (let k = 0; k < da.length; k += 4) {
      const d0 = Math.abs(da[k] - db[k]);
      const d1 = Math.abs(da[k + 1] - db[k + 1]);
      const d2 = Math.abs(da[k + 2] - db[k + 2]);
      const d3 = Math.abs(da[k + 3] - db[k + 3]);
      const weit = Math.max(d0, d1, d2, d3);
      if (weit > groesste) groesste = weit;
      if (weit > grenze) {
        anders++;
        dd[k] = 230; dd[k + 1] = 40; dd[k + 2] = 40; dd[k + 3] = 255;
      } else {
        /* Was gleich ist, bleibt sichtbar – aber blass, als Orientierung. */
        const grau = (da[k] + da[k + 1] + da[k + 2]) / 3;
        const hell = 235 + (grau - 235) * 0.25;
        dd[k] = hell; dd[k + 1] = hell; dd[k + 2] = hell; dd[k + 3] = 255;
      }
    }
    dg.putImageData(dbild, 0, 0);
    return {
      anders,
      punkte: w * h,
      anteil: anders / (w * h),
      groesste,
      diff: diff.toDataURL('image/png').split(',')[1],
    };
  }, [a.toString('base64'), b.toString('base64'), kanal]);
  await seite.close();
  return ergebnis;
}

/* =======================================================================
 * LAUFEN
 * ==================================================================== */

let gescheitert = 0;
let geprueft = 0;

if (rauschen) {
  console.log('\nRauschboden – jede Szene zweimal gezeichnet:\n');
  for (const szene of SZENEN) {
    if (szene.aus && !process.argv.includes('--auch-stillgelegte')) continue;
    const a = await zeichne(szene);
    const b = await zeichne(szene);
    const r = await vergleiche(a, b, 0);
    console.log(`  ${szene.name.padEnd(18)} groesster Kanalabstand ${String(r.groesste).padStart(3)}`
      + `  ·  abweichend ${(r.anteil * 100).toFixed(4)} %`);
    if (r.anders) {
      writeFileSync(join(ARBEIT, `${szene.name}-rauschen.png`), Buffer.from(r.diff, 'base64'));
      writeFileSync(join(ARBEIT, `${szene.name}-a.png`), a);
      writeFileSync(join(ARBEIT, `${szene.name}-b.png`), b);
    }
  }
  console.log('\nDie Schwellen in diesem Skript muessen darueber liegen.\n');
} else {
  for (const szene of SZENEN) {
    if (szene.aus) {
      console.log(`  – ${szene.name}  (stillgelegt: ${szene.aus})`);
      continue;
    }
    const vorlage = join(VORLAGEN, `${szene.name}.png`);
    const bild = await zeichne(szene);

    if (neuSchreiben || !existsSync(vorlage)) {
      writeFileSync(vorlage, bild);
      console.log(`  ${existsSync(vorlage) && !neuSchreiben ? 'neu' : '✎'} ${szene.name} – Vorlage geschrieben (${Math.round(bild.length / 1024)} kB)`);
      continue;
    }

    geprueft++;
    const schwelle = SCHWELLE[szene.art];
    const r = await vergleiche(readFileSync(vorlage), bild, schwelle.kanal);
    if (r.masse) {
      console.error(`  ✗ ${szene.name}: andere Masse – ${r.masse}`);
      gescheitert++;
      continue;
    }
    if (r.anteil > schwelle.anteil) {
      writeFileSync(join(ARBEIT, `${szene.name}-neu.png`), bild);
      writeFileSync(join(ARBEIT, `${szene.name}-unterschied.png`), Buffer.from(r.diff, 'base64'));
      console.error(
        `  ✗ ${szene.name}: ${(r.anteil * 100).toFixed(3)} % abweichend `
        + `(erlaubt ${(schwelle.anteil * 100).toFixed(3)} %), groesster Abstand ${r.groesste}`,
      );
      console.error(`      ${szene.was}`);
      for (const b of szene.bewacht) console.error(`      bewacht: ${b}`);
      console.error(`      neu:          .testbau/bilder/${szene.name}-neu.png`);
      console.error(`      Unterschied:  .testbau/bilder/${szene.name}-unterschied.png`);
      gescheitert++;
    } else {
      console.log(`  ✓ ${szene.name}  (${(r.anteil * 100).toFixed(4)} % abweichend)`);
    }
  }
}

await browser.close();
server.close();

if (!rauschen && !neuSchreiben) {
  const uebrig = readdirSync(VORLAGEN).filter((f) => f.endsWith('.png'))
    .filter((f) => !SZENEN.some((s) => `${s.name}.png` === f));
  if (uebrig.length) {
    console.error(`\n  ! Vorlagen ohne Szene: ${uebrig.join(', ')}`);
    console.error('    Eine Vorlage, die niemand mehr vergleicht, bewacht nichts.');
    gescheitert++;
  }
  if (gescheitert) {
    console.error(`\n${gescheitert} von ${geprueft} Bildern weichen ab.`);
    console.error('Ist die Aenderung gewollt? Dann: npm run bilder -- --neu\n');
    process.exit(1);
  }
  console.log(`\n${geprueft} Bilder unveraendert.\n`);
}
