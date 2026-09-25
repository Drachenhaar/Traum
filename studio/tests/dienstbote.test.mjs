/**
 * Der Dienstbote – geprüft, indem er läuft.
 *
 * Gemessen, bevor es ihn gab: Flugmodus, geräumter Zwischenspeicher, und die
 * App startet nicht. `ERR_INTERNET_DISCONNECTED`, englisch, mit einem Rat
 * über Kabel und Router – während die Seiten unversehrt in der Datenbank
 * liegen, nur ohne Programm, das sie zeigen könnte. Eine App, die „vollständig
 * lokal" verspricht, schickte ihren Besitzer zum Router.
 *
 * ---
 *
 * **Warum hier der gebaute `sw.js` läuft und nicht die Vorlage.**
 *
 * Die Vorlage in `src/dienstbote.js` enthält `__WERK__` – eine Marke, kein
 * Code. Was ausgeliefert wird, entsteht erst in
 * `scripts/dienstbote-bauen.mjs`. Prüfte man die Vorlage, prüfte man genau
 * die Hälfte, in der nichts schiefgehen kann: Die Liste, die falsch sein
 * könnte, wird erst beim Bauen eingesetzt.
 *
 * Der Dienstbote läuft deshalb hier wirklich – in einer nachgebauten
 * Umgebung mit erfundenem `caches`, `fetch` und `clients`, die mitschreibt,
 * was er tut. Zeichenketten in einer Datei zu suchen hätte bei jedem der
 * Fehler unten grün gemeldet.
 *
 * ---
 *
 * **Die Zusage, die am meisten kostet, wenn sie bricht.**
 *
 * Ein Dienstbote liegt hartnäckig falsch: Er liefert sein veraltetes Zeug
 * auch dann aus, wenn draussen längst eine heile Fassung steht. Der teuerste
 * Fehler wäre `skipWaiting()` – dann löscht die neue Fassung die Vorräte der
 * alten, während eine Seite der alten noch offen ist und gleich ein Stück
 * Code nachladen will, das es nicht mehr gibt. Mitten im Schreiben.
 * Abschnitt 2 prüft, dass das nicht passiert.
 *
 * Jede Zusage wurde gegengeprobt: der Fehler absichtlich wieder eingebaut,
 * bis die Prüfung anschlug.
 */
import { strict as assert } from 'node:assert';
import { execFileSync } from 'node:child_process';
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { runInNewContext } from 'node:vm';

const wurzel = join(import.meta.dirname, '..');
const dist = join(wurzel, 'dist');
const swPfad = join(dist, 'sw.js');

let geprueft = 0;
const pruefe = (was, fn) => {
  const ergebnis = fn();
  const fertig = () => {
    geprueft++;
    console.log(`  ✓ ${was}`);
  };
  return ergebnis instanceof Promise ? ergebnis.then(fertig) : fertig();
};

if (!existsSync(swPfad)) {
  console.log('\n  … dist/sw.js fehlt, es wird gebaut.\n');
  execFileSync('npm', ['run', 'build'], { cwd: wurzel, stdio: 'inherit' });
}

const swQuelle = readFileSync(swPfad, 'utf8');
const ORT = 'https://drachenhaar.github.io';
const BEREICH = `${ORT}/Traum/studio/`;

/* =======================================================================
 * DIE NACHGEBAUTE UMGEBUNG
 *
 * Kein Fenster, kein DOM, kein `document` – ein Dienstbote hat davon
 * nichts. Was er hat, steht hier, und nur das.
 * ==================================================================== */

/** Ein Vorrat: eine Schublade mit Adressen darin. */
class Vorrat {
  constructor() {
    this.inhalt = new Map();
  }
  async put(anfrage, antwort) {
    this.inhalt.set(typeof anfrage === 'string' ? anfrage : anfrage.url, antwort);
  }
  async match(anfrage) {
    return this.inhalt.get(typeof anfrage === 'string' ? anfrage : anfrage.url);
  }
  async keys() {
    return [...this.inhalt.keys()].map((url) => ({ url }));
  }
  async delete(anfrage) {
    return this.inhalt.delete(typeof anfrage === 'string' ? anfrage : anfrage.url);
  }
  async addAll(adressen) {
    for (const a of adressen) {
      const antwort = await welt.fetch({ url: a, method: 'GET', mode: 'no-cors' });
      if (!antwort || !antwort.ok) throw new TypeError(`addAll: ${a} kam nicht`);
      this.inhalt.set(a, antwort);
    }
  }
}

/** Die Welt ausserhalb – was geholt wird, und was jeder Griff kostet. */
const welt = {
  geholt: [],
  antwortet: (url) => ({ ok: true, type: 'basic', url, clone: () => ({ ok: true, type: 'basic', url }) }),
  async fetch(anfrage) {
    const url = typeof anfrage === 'string' ? anfrage : anfrage.url;
    welt.geholt.push(url);
    return welt.antwortet(url);
  },
};

function neueUmgebung() {
  welt.geholt = [];
  welt.antwortet = (url) => ({ ok: true, type: 'basic', url, clone: () => ({ ok: true, type: 'basic', url }) });

  const vorraete = new Map();
  const caches = {
    async open(name) {
      if (!vorraete.has(name)) vorraete.set(name, new Vorrat());
      return vorraete.get(name);
    },
    async keys() {
      return [...vorraete.keys()];
    },
    async delete(name) {
      return vorraete.delete(name);
    },
    async match(anfrage) {
      for (const v of vorraete.values()) {
        const t = await v.match(anfrage);
        if (t) return t;
      }
      return undefined;
    },
  };

  const horcher = new Map();
  const self = {
    addEventListener: (art, fn) => horcher.set(art, fn),
    registration: { scope: BEREICH },
    location: { origin: ORT },
    clients: { geklaut: false, claim: async () => { self.clients.geklaut = true; } },
    skipWaiting: () => { self.skipWaiting.gerufen = true; },
  };
  self.skipWaiting.gerufen = false;
  self.self = self;

  runInNewContext(swQuelle, { self, caches, fetch: welt.fetch, URL, console }, { filename: 'sw.js' });

  /** Ein Ereignis auslösen und abwarten, was der Dienstbote daraufhin tut. */
  const loese = async (art, zusatz = {}) => {
    const fn = horcher.get(art);
    assert.ok(fn, `kein Horcher für „${art}"`);
    let gewartet = null;
    let geantwortet;
    let hatGeantwortet = false;
    const e = {
      ...zusatz,
      waitUntil: (p) => { gewartet = p; },
      respondWith: (p) => { hatGeantwortet = true; geantwortet = p; },
    };
    fn(e);
    if (gewartet) await gewartet;
    return { hatGeantwortet, antwort: hatGeantwortet ? await geantwortet : undefined };
  };

  return { self, caches, vorraete, loese, welt };
}

/** Eine Anfrage, wie der Browser sie stellt. */
const anfrage = (url, mehr = {}) => ({ url, method: 'GET', mode: 'no-cors', ...mehr });

/* Die Listen aus dem gebauten Dienstboten herausholen – ohne ihn auszuführen. */
const listeAus = (name) => {
  const m = swQuelle.match(new RegExp(`const ${name} = (\\[[\\s\\S]*?\\n\\]);`));
  assert.ok(m, `${name} steht nicht als Liste im gebauten sw.js`);
  return JSON.parse(m[1]);
};
const WERK = listeAus('WERK');
const BILDER = listeAus('BILDER');
const FASSUNG = swQuelle.match(/const FASSUNG = '([^']+)'/)[1];

/* =======================================================================
 * 1 · WAS EINGEPACKT WIRD
 * ==================================================================== */

console.log('\n1 · Was eingepackt wird');

const alleDateien = (ordner) => {
  const raus = [];
  for (const n of readdirSync(ordner)) {
    const p = join(ordner, n);
    if (statSync(p).isDirectory()) raus.push(...alleDateien(p));
    else raus.push(relative(dist, p).split(sep).join('/'));
  }
  return raus;
};
const BILDENDUNG = /\.(webp|png|jpe?g|svg|avif|gif|ico)$/i;
const imOrdner = alleDateien(dist);

pruefe('jedes Stück Code ist dabei – vollständig', () => {
  /*
   * Die eine Zusage, an der alles hängt. Fehlt ein nachgeladenes Stück,
   * führt eine Seite genau dann ins Leere, wenn kein Netz da ist, um es zu
   * holen – und das ist der Fall, für den es den Dienstboten gibt.
   */
  const code = imOrdner.filter((p) => p !== 'sw.js' && !BILDENDUNG.test(p));
  assert.deepEqual([...WERK].sort(), code.sort(), 'Vorrat und Ordner gehen auseinander');
});

pruefe('der Dienstbote hält sich nicht selbst vor', () => {
  /*
   * Er hinterlegte sich sonst in der Fassung, in der er gerade läuft, fände
   * sich beim nächsten Besuch selbst wieder vor und verhinderte seine eigene
   * Ablösung. Ein Programm in dieser Lage bekommt man nur noch mit dem
   * Notausgang los.
   */
  assert.ok(!WERK.includes('sw.js'), 'sw.js liegt im eigenen Vorrat');
});

pruefe('kein Bild liegt im Vorrat', () => {
  /*
   * 1,7 MB ungefragt über ein Mobilfunknetz, damit jedes Wappen bereitläge,
   * das dieser Leser vielleicht nie aufschlägt. Ein fehlendes Bild ist eine
   * blasse Stelle; ein fehlendes Stück Code ist ein Absturz.
   */
  const drin = WERK.filter((p) => BILDENDUNG.test(p));
  assert.deepEqual(drin, [], `Bilder im Vorrat: ${drin}`);
  assert.deepEqual([...BILDER].sort(), imOrdner.filter((p) => BILDENDUNG.test(p)).sort());
});

pruefe('die Fassung steht für den Inhalt, nicht für die Uhrzeit', () => {
  /*
   * Ein Zeitstempel wechselte bei jedem Bauen, auch wenn sich nichts geändert
   * hat – jeder Leser holte dann grundlos 1,4 MB neu. Zweimal bauen muss
   * denselben Dienstboten ergeben.
   */
  assert.match(FASSUNG, /^[0-9a-f]{12}$/, `Fassung „${FASSUNG}" sieht nicht nach Inhalt aus`);
  execFileSync('node', ['scripts/dienstbote-bauen.mjs'], { cwd: wurzel, stdio: 'pipe' });
  const nochmal = readFileSync(swPfad, 'utf8');
  assert.equal(nochmal, swQuelle, 'zweimal gebaut ergibt zwei verschiedene Dienstboten');
});

/* =======================================================================
 * 2 · DAS EINRICHTEN – UND WAS DABEI NICHT PASSIEREN DARF
 * ==================================================================== */

console.log('\n2 · Das Einrichten');

await pruefe('er packt beim Einrichten das ganze Werk ein', async () => {
  const u = neueUmgebung();
  await u.loese('install');
  const vorrat = u.vorraete.get(`dragoncore-werk-${FASSUNG}`);
  assert.ok(vorrat, 'kein Vorrat angelegt');
  assert.equal(vorrat.inhalt.size, WERK.length);
  assert.ok(vorrat.inhalt.has(`${BEREICH}index.html`), 'der Einstieg fehlt');
});

await pruefe('er reisst das Ruder nicht an sich', async () => {
  /*
   * **Die teuerste Zeile, die hier stehen könnte.**
   *
   * `skipWaiting()` lässt die neue Fassung sofort übernehmen. Sie löscht
   * beim Aufräumen die Vorräte der alten – und die alte Seite, die noch
   * offen im Browser steht, lädt gleich darauf ein Stück Code nach, das es
   * nicht mehr gibt. Im Browser nachgestellt: ohne skipWaiting wartet die
   * neue Fassung, und die offene alte Seite lädt fehlerfrei weiter.
   */
  const u = neueUmgebung();
  await u.loese('install');
  assert.equal(u.self.skipWaiting.gerufen, false, 'die neue Fassung drängelt');
});

await pruefe('ein halber Vorrat entsteht gar nicht erst', async () => {
  /*
   * Reisst die Verbindung mitten im Einpacken ab, muss das Einrichten
   * scheitern. Ein Dienstbote mit Löchern fällt erst auf, wenn kein Netz
   * mehr da ist – also im schlechtestmöglichen Augenblick.
   */
  const u = neueUmgebung();
  let n = 0;
  welt.antwortet = (url) => (++n > 3 ? { ok: false, type: 'basic', url } : { ok: true, type: 'basic', url, clone: () => ({ ok: true, type: 'basic', url }) });
  await assert.rejects(() => u.loese('install'));
});

/* =======================================================================
 * 3 · DAS AUFRÄUMEN
 * ==================================================================== */

console.log('\n3 · Das Aufräumen');

const eingerichtet = async () => {
  const u = neueUmgebung();
  await u.loese('install');
  return u;
};

await pruefe('der Vorrat der vorigen Fassung fliegt raus', async () => {
  const u = await eingerichtet();
  u.vorraete.set('dragoncore-werk-vorgestern', new Vorrat());
  await u.loese('activate');
  assert.ok(!u.vorraete.has('dragoncore-werk-vorgestern'), 'alter Vorrat blieb liegen');
  assert.ok(u.vorraete.has(`dragoncore-werk-${FASSUNG}`), 'der eigene ist weg');
});

await pruefe('die Bilder überleben den Fassungswechsel', async () => {
  /*
   * Sie tragen ihren Inhalt im Namen – ein einmal geholtes Bild bleibt
   * richtig. Sie bei jedem Wechsel wegzuwerfen hiesse, dem Leser im Zug
   * seine Wappen zu nehmen, weil anderswo eine Textzeile anders wurde.
   */
  const u = await eingerichtet();
  const bilder = await u.caches.open('dragoncore-bilder');
  const bleibt = `${BEREICH}${BILDER[0]}`;
  await bilder.put({ url: bleibt }, { ok: true });
  await u.loese('activate');
  assert.ok(await bilder.match({ url: bleibt }), 'ein gültiges Bild wurde weggeworfen');
});

await pruefe('Bilder aus alten Fassungen werden weggeräumt', async () => {
  /*
   * Sonst wüchse der Vorrat über die Jahre um jedes je ersetzte Wappen –
   * ein Leck, das niemand bemerkt, bis der Browser Speicher zurückfordert.
   * Und was er dann zurückfordert, ist im Zweifel auch die Datenbank.
   */
  const u = await eingerichtet();
  const bilder = await u.caches.open('dragoncore-bilder');
  const alt = `${BEREICH}assets/drache-VONGESTERN.webp`;
  await bilder.put({ url: alt }, { ok: true });
  await u.loese('activate');
  assert.ok(!(await bilder.match({ url: alt })), 'ein Bild von gestern liegt noch da');
});

await pruefe('er übernimmt die schon offenen Seiten', async () => {
  const u = await eingerichtet();
  await u.loese('activate');
  assert.equal(u.self.clients.geklaut, true, 'die offene Seite bleibt unversorgt');
});

/* =======================================================================
 * 4 · WOVON ER DIE FINGER LÄSST
 * ==================================================================== */

console.log('\n4 · Wovon er die Finger lässt');

const durchgelassen = async (u, req) => {
  const { hatGeantwortet } = await u.loese('fetch', { request: req });
  return !hatGeantwortet;
};

await pruefe('ein POST geht unberührt ans Netz', async () => {
  /*
   * Eine abgeschickte Handlung aus dem Vorrat zu beantworten, ohne sie
   * abzuschicken, wäre eine Lüge über etwas Geschehenes.
   */
  const u = await eingerichtet();
  assert.ok(await durchgelassen(u, anfrage(`${BEREICH}irgendwas`, { method: 'POST' })));
});

await pruefe('fremde Herkunft geht ihn nichts an', async () => {
  /*
   * Diese Prüfung hatte einmal eine eigene Zeile im Dienstboten neben sich –
   * einen Vergleich auf `self.location.origin`. Beim Gegenproben liess sie
   * sich herausnehmen, ohne dass irgendetwas anschlug, und das war richtig
   * so: `scope` ist eine vollständige Adresse samt Herkunft. Die Zeile ist
   * weg, die Zusage bleibt – und wird hier weiter geprüft.
   */
  const u = await eingerichtet();
  assert.ok(await durchgelassen(u, anfrage('https://beispiel.example/bild.png')));
  assert.ok(await durchgelassen(u, anfrage('https://beispiel.example/Traum/studio/x.js')));
});

await pruefe('was ausserhalb des eigenen Ordners liegt, auch nicht', async () => {
  /*
   * Unter GitHub Pages liegen neben dem Buch andere Seiten derselben
   * Herkunft. Der Dienstbote steht zwischen jeder Anfrage und der Welt –
   * diese Stellung missbraucht man am besten gar nicht.
   */
  const u = await eingerichtet();
  assert.ok(await durchgelassen(u, anfrage(`${ORT}/Traum/etwas-anderes/seite.html`)));
});

/* =======================================================================
 * 5 · WAS ER AUSLIEFERT
 * ==================================================================== */

console.log('\n5 · Was er ausliefert');

await pruefe('ein Seitenaufruf bekommt den Einband – ohne Netz', async () => {
  const u = await eingerichtet();
  u.welt.geholt = [];
  const { antwort } = await u.loese('fetch', { request: anfrage(BEREICH, { mode: 'navigate' }) });
  assert.equal(antwort.url, `${BEREICH}index.html`);
  assert.deepEqual(u.welt.geholt, [], 'er ging trotzdem ans Netz');
});

await pruefe('auch `?neuanfang` kommt an', async () => {
  /*
   * Der Suchteil wird im Fenster ausgewertet, nicht beim Holen. Würde er
   * hier mitgezählt, bekäme ausgerechnet die Rückfrage vor dem Löschen kein
   * Blatt – ohne Netz also gar keines.
   */
  const u = await eingerichtet();
  const { antwort } = await u.loese('fetch', {
    request: anfrage(`${BEREICH}?neuanfang`, { mode: 'navigate' }),
  });
  assert.equal(antwort.url, `${BEREICH}index.html`);
});

await pruefe('ein Seitenaufruf ohne Vorrat geht ans Netz statt ins Leere', async () => {
  const u = neueUmgebung(); /* nicht eingerichtet */
  const { antwort } = await u.loese('fetch', { request: anfrage(BEREICH, { mode: 'navigate' }) });
  assert.ok(antwort, 'keine Antwort');
  assert.deepEqual(u.welt.geholt, [BEREICH]);
});

await pruefe('vorgehaltener Code kommt aus dem Vorrat, nicht aus dem Netz', async () => {
  const u = await eingerichtet();
  u.welt.geholt = [];
  const datei = WERK.find((p) => p.endsWith('.js'));
  const { antwort } = await u.loese('fetch', { request: anfrage(`${BEREICH}${datei}`) });
  assert.equal(antwort.url, `${BEREICH}${datei}`);
  assert.deepEqual(u.welt.geholt, [], 'er holte etwas, das er schon hatte');
});

await pruefe('ein angesehenes Bild bleibt da', async () => {
  const u = await eingerichtet();
  const bild = `${BEREICH}${BILDER[0]}`;
  await u.loese('fetch', { request: anfrage(bild) });
  const bilder = await u.caches.open('dragoncore-bilder');
  assert.ok(await bilder.match({ url: bild }), 'das Bild wurde nicht behalten');

  u.welt.geholt = [];
  await u.loese('fetch', { request: anfrage(bild) });
  assert.deepEqual(u.welt.geholt, [], 'beim zweiten Mal ging er wieder ans Netz');
});

await pruefe('eine Fehlermeldung wird nicht aufbewahrt', async () => {
  /*
   * Ein hinterlegtes 404 wäre ein Fehler, der nie wieder weggeht: Der
   * Dienstbote lieferte ihn danach auch dann aus, wenn die Datei längst da
   * ist.
   */
  const u = await eingerichtet();
  const bild = `${BEREICH}${BILDER[1]}`;
  u.welt.antwortet = (url) => ({ ok: false, type: 'basic', url, clone: () => ({ url }) });
  await u.loese('fetch', { request: anfrage(bild) });
  const bilder = await u.caches.open('dragoncore-bilder');
  assert.ok(!(await bilder.match({ url: bild })), 'ein Fehlschlag liegt jetzt im Vorrat');
});

await pruefe('eine undurchsichtige Antwort auch nicht', async () => {
  /*
   * Bei `type: 'opaque'` kann niemand sehen, ob sie überhaupt geglückt ist –
   * `ok` ist dort immer falsch, aber verlassen sollte man sich darauf nicht.
   */
  const u = await eingerichtet();
  const bild = `${BEREICH}${BILDER[1]}`;
  u.welt.antwortet = (url) => ({ ok: true, type: 'opaque', url, clone: () => ({ url }) });
  await u.loese('fetch', { request: anfrage(bild) });
  const bilder = await u.caches.open('dragoncore-bilder');
  assert.ok(!(await bilder.match({ url: bild })), 'etwas Undurchsichtiges liegt im Vorrat');
});

/* =======================================================================
 * 6 · OB ER ÜBERHAUPT GERUFEN WIRD
 * ==================================================================== */

console.log('\n6 · Ob er überhaupt gerufen wird');

const lies = (p) => readFileSync(join(wurzel, p), 'utf8');

pruefe('das Buch meldet ihn an', () => {
  /*
   * Ohne diese Zeile wäre der ganze Dienstbote eine Datei, die niemand
   * ruft – geprüft, gepflegt und wirkungslos.
   */
  const q = lies('src/main.tsx').replace(/\/\*[\s\S]*?\*\//g, '');
  assert.match(q, /\n\s*meldeDienstbotenAn\(\);/, 'er wird nirgends angemeldet');
});

pruefe('ein Fehlschlag beim Anmelden bleibt folgenlos', () => {
  /*
   * `register()` gibt ein Versprechen zurück. Bliebe es unbehandelt, fiele
   * es in `main.tsx` auf `unhandledrejection` – und `showFatal` ersetzt dann
   * den Inhalt der Wurzel durch eine Fehlerseite. Ein Leser im privaten
   * Fenster sähe statt seines Buches eine Meldung über eine Bequemlichkeit,
   * die er nie verlangt hat.
   */
  const q = lies('src/lib/dienstbote.ts');
  assert.match(q, /\.register\([\s\S]{0,200}?\)\s*\.catch\(/, 'ein Fehlschlag fällt durch');
});

pruefe('er wird erst nach dem ersten Bild gerufen', () => {
  /*
   * Die Anmeldung stösst das Holen von 1,4 MB an. Vor dem ersten Bild wäre
   * das ein Wettlauf gegen genau die Zeit, die vorher von acht Sekunden auf
   * 231 ms gedrückt wurde.
   */
  const q = lies('src/lib/dienstbote.ts');
  assert.match(q, /readyState === 'complete'/, 'ein fertig geladenes Fenster geht leer aus');
  assert.match(q, /addEventListener\('load'/);
});

pruefe('beim Entwickeln schweigt er', () => {
  const q = lies('src/lib/dienstbote.ts');
  assert.match(q, /import\.meta\.env\.PROD/);
});

console.log(`\n${geprueft} Prüfungen bestanden.\n`);
