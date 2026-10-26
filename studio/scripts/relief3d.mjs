/**
 * Das Gebirge als Geometrie – eine Seite zum Drehen, und ein Umlauf als Film.
 *
 * ---
 *
 * **Warum das überhaupt geht.**
 *
 * Das Gebirgssystem speichert keine Bergbilder. Es speichert einen
 * Kammverlauf, eine Breite, eine Höhe, eine Zerklüftung und einen Startwert;
 * alles Übrige ist `hoeheUeberall(x, y, kaemme)` – eine Funktion von einem
 * Ort auf eine Höhe. Die Karte benutzt sie, um Licht und Schatten auf eine
 * **Fläche** zu malen. Dieselbe Funktion kann genauso gut echte Geometrie
 * nach oben schieben.
 *
 * Das ist kein Kunststück, sondern die Probe darauf, dass die Entscheidung
 * von damals richtig war: Hätten wir fertige Bergbilder gespeichert, gäbe es
 * diese Seite nicht.
 *
 * ---
 *
 * **Was Three.js hier tut und was nicht.**
 *
 * Three.js zeichnet **nichts von der Karte**. Es bekommt zwei fertige
 * Bilder – eine Höhenkarte und das gemalte Artbook-Relief – und macht daraus
 * eine Fläche, die man drehen kann. Beide Bilder entstehen vorher, durch die
 * echten Maler.
 *
 * Es ist damit ausdrücklich **keine zweite Renderengine für die Karte**. Das
 * Buch sieht diese Datei nie. Sie liegt neben dem Buch wie ein Modell aus
 * Pappe neben einem Bauplan.
 *
 * ---
 *
 * **Die Höhenkarte ist sechzehn Bit und nicht acht.**
 *
 * Ein graues PNG hätte 256 Höhenstufen. Auf einer Flanke, die über
 * vierhundert Punkte sanft ansteigt, sind das sichtbare Treppen – genau die
 * Art von Treppe, die aussieht, als wäre das Gelände falsch gerechnet. Die
 * Höhe steht deshalb in zwei Kanälen: Rot ist das hohe Byte, Grün das
 * niedrige. 65 536 Stufen, und die Treppen sind weg.
 *
 * ---
 *
 * **Warum vier Dateien und keine einzelne.**
 *
 * Der erste Entwurf hat alles in eine HTML-Datei geschrieben, Three.js
 * eingeschlossen. Das geht nicht: Eine **minifizierte** ES-Modul-Datei gibt
 * ihre Namen nicht an den umgebenden Code weiter – `Scene` heisst darin `S`,
 * und nur die `export`-Zeile am Ende weiss das. Eingefügter Modulquelltext
 * ist deshalb stumm.
 *
 * Also liegen die Teile nebeneinander und die Seite importiert sie. Das ist
 * ohnehin besser: Der fremde Quelltext landet nicht im Verzeichnis, sondern
 * wird bei Bedarf geholt.
 *
 * ---
 *
 * Aufruf:  npm run relief
 *          npm run relief -- --gitter 768 --farbe 2560
 */

import { spawn, execFileSync } from 'node:child_process';
import { writeFileSync, readFileSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SCHAUPLATZ } from './film/schauplatz.mjs';
import { oeffneBuehne } from './film/buehne.mjs';

const wurzel = join(dirname(fileURLToPath(import.meta.url)), '..');
const ARBEIT = join(wurzel, '.testbau', 'relief');

const wahl = (name, vorgabe) => {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 && process.argv[i + 1] ? Number(process.argv[i + 1]) : vorgabe;
};

/** Wie fein die Geometrie wird. 512 sind gut 260 000 Punkte – ein Telefon trägt das. */
const GITTER = wahl('gitter', 512);
/** Wie fein das gemalte Bild darauf wird. */
const FARBE = wahl('farbe', 2048);
/** Wie viele Bilder der Umlauf bekommt. */
const BILDER = wahl('bilder', 144);
/** Welcher Teil der Karte. Der Hauptkamm liegt zwischen 120 und 900. */
const FELD = { x: 100, y: 180, w: 820 };
/**
 * Wie hoch ein Berg wird, in Karteneinheiten.
 *
 * `hoeheUeberall` liefert 0 bis 1. Der Wert hier ist Gestaltung und keine
 * Messung – die Karte von oben kennt keine Höhe in Metern, sie kennt nur
 * hell und dunkel.
 */
const UEBERHOEHUNG = wahl('hoehe', 150);
/** Welche Fassung von Three.js. Fest, damit derselbe Aufruf dasselbe ergibt. */
const DREI_FASSUNG = '0.169.0';

rmSync(ARBEIT, { recursive: true, force: true });
mkdirSync(ARBEIT, { recursive: true });

/* =======================================================================
 * 0 · THREE.JS HOLEN
 * ==================================================================== */

/**
 * Three.js aus der Paketquelle holen, nicht aus dem Verzeichnis.
 *
 * Es liegt dann in `.testbau/` und damit ausserhalb der Versionsverwaltung:
 * 672 KB fremder Quelltext gehören nicht in ein Verzeichnis, in dem jede
 * Zeile begründet ist. Wer den Ordner weitergibt, gibt die Datei mit – sie
 * liegt ja daneben.
 */
function holeDrei(ziel) {
  const fach = join(ARBEIT, '.drei');
  mkdirSync(fach, { recursive: true });
  console.log(`Three.js ${DREI_FASSUNG} holen …`);
  execFileSync('npm', ['pack', `three@${DREI_FASSUNG}`, '--silent'], {
    cwd: fach, stdio: ['ignore', 'ignore', 'inherit'],
  });
  execFileSync('tar', ['xzf', `three-${DREI_FASSUNG}.tgz`, 'package/build/three.module.min.js'], {
    cwd: fach, stdio: 'inherit',
  });
  const quelle = join(fach, 'package', 'build', 'three.module.min.js');
  if (!existsSync(quelle)) throw new Error('three.module.min.js nicht im Paket gefunden');
  writeFileSync(ziel, readFileSync(quelle));
}

holeDrei(join(ARBEIT, 'three.module.min.js'));

const { basis: B, browser, schliesse } = await oeffneBuehne(ARBEIT, { '/relief': ARBEIT });

const seite = await browser.newPage({ viewport: { width: 1080, height: 1080 } });
const fehler = [];
seite.on('pageerror', (e) => fehler.push(e.message));
seite.on('console', (m) => { if (m.type() === 'error') fehler.push(m.text()); });
await seite.goto(`${B}leer.html`);

/* =======================================================================
 * 1 · DIE HÖHENKARTE
 * ==================================================================== */

console.log(`Höhenkarte ${GITTER}×${GITTER} …`);
const hoehe = await seite.evaluate(async ([karte, feld, n]) => {
  const W = await import('/werkbank.mjs');
  const k = W.heileKarte(karte);

  const c = document.createElement('canvas');
  c.width = n;
  c.height = n;
  const g = c.getContext('2d');
  const bild = g.createImageData(n, n);

  let hoechste = 0;
  for (let j = 0; j < n; j++) {
    const y = feld.y + (j / (n - 1)) * feld.w;
    for (let i = 0; i < n; i++) {
      const x = feld.x + (i / (n - 1)) * feld.w;
      const h = W.hoeheUeberall(x, y, k.kaemme);
      if (h > hoechste) hoechste = h;
      /* Rot ist das hohe Byte, Grün das niedrige – zusammen 16 Bit. */
      const v = Math.max(0, Math.min(65535, Math.round(h * 65535)));
      const p = (j * n + i) * 4;
      bild.data[p] = v >> 8;
      bild.data[p + 1] = v & 255;
      bild.data[p + 2] = 0;
      bild.data[p + 3] = 255;
    }
  }
  g.putImageData(bild, 0, 0);
  return { png: c.toDataURL('image/png').split(',')[1], hoechste };
}, [SCHAUPLATZ, FELD, GITTER]);
if (fehler.length) throw new Error(fehler[0]);
console.log(`  höchster Punkt: ${hoehe.hoechste.toFixed(3)} von 1`);
writeFileSync(join(ARBEIT, 'hoehe.png'), Buffer.from(hoehe.png, 'base64'));

/* =======================================================================
 * 2 · DAS GEMALTE BILD
 * ==================================================================== */

console.log(`Gemaltes Relief ${FARBE}×${FARBE} …`);
const farbe = await seite.evaluate(async ([basis, karte, feld, px]) => {
  const W = await import('/werkbank.mjs');
  const stil = W.ARTBOOK;
  const atlas = await W.ladeAtlas(stil.bildsatz, basis);
  if (!atlas) throw new Error('kein Atlas – wurde gebacken?');
  const buch = W.stilbuchFuer(stil, atlas);

  const k = W.heileKarte(karte);
  const raster = new W.Staffageraster(W.staffageAus(k.features, buch, k.kaemme));
  const rand = W.WERKPLAN.ueberstand;

  const c = document.createElement('canvas');
  c.width = px;
  c.height = px;
  const g = c.getContext('2d');
  g.fillStyle = stil.land.flaeche;
  g.fillRect(0, 0, px, px);

  /*
   * **Hier ohne Kachelwerk, und das ist der Punkt.**
   *
   * Der Film braucht Kacheln, weil er dieselbe Gegend hundertfünfzig Mal
   * zeigt. Dieses Bild entsteht einmal. Ein Kachelwerk wäre hier reine
   * Umständlichkeit – und schlimmer: Jede Kachelgrenze liefe später als
   * Linie quer über den Berg. Eine einzige grosse Zeichnung hat keine
   * Grenzen.
   */
  const massstab = px / feld.w;
  const kasten = { x0: feld.x, y0: feld.y, x1: feld.x + feld.w, y1: feld.y + feld.w };
  g.setTransform(massstab, 0, 0, massstab, -feld.x * massstab, -feld.y * massstab);
  W.maleGebirge(g, kasten, massstab, k.kaemme, stil, { dichte: 1 });
  const liste = raster.imKasten(
    kasten.x0 - rand, kasten.y0 - rand, kasten.x1 + rand, kasten.y1 + rand,
  );
  W.maleStaffage(g, kasten, massstab, liste, buch, stil, { rand, dichte: 1 });

  return c.toDataURL('image/jpeg', 0.9).split(',')[1];
}, [B, SCHAUPLATZ, FELD, FARBE]);
if (fehler.length) throw new Error(fehler[0]);
writeFileSync(join(ARBEIT, 'farbe.jpg'), Buffer.from(farbe, 'base64'));

/* =======================================================================
 * 3 · DIE SEITE
 * ==================================================================== */

writeFileSync(join(ARBEIT, 'relief.html'), bauSeite({ gitter: GITTER, feld: FELD, ueber: UEBERHOEHUNG }));
console.log(`  ✓ ${join(ARBEIT, 'relief.html')}`);

/* =======================================================================
 * 4 · EIN UMLAUF ALS FILM
 * ==================================================================== */

console.log(`Umlauf, ${BILDER} Bilder …`);
await seite.goto(`${B}relief/relief.html?film`);
await seite.waitForFunction('window.__bereit === true', null, { timeout: 60000 });
if (fehler.length) throw new Error(fehler[0]);

const ziel = join(ARBEIT, 'umlauf.mp4');
const ffmpeg = spawn('ffmpeg', [
  '-y', '-loglevel', 'error',
  '-f', 'image2pipe', '-framerate', '24', '-i', '-',
  '-c:v', 'libx264', '-preset', 'slow', '-crf', '20',
  '-pix_fmt', 'yuv420p', '-movflags', '+faststart',
  ziel,
], { stdio: ['pipe', 'inherit', 'inherit'] });
const fertig = new Promise((ok, nein) => {
  ffmpeg.on('close', (c) => (c === 0 ? ok() : nein(new Error(`ffmpeg: ${c}`))));
  ffmpeg.stdin.on('error', nein);
});

for (let n = 0; n < BILDER; n++) {
  /*
   * Ohne das letzte Bild bei `t = 1`: Beim Umlauf **ist** t = 1 dasselbe
   * Bild wie t = 0. Nähme man es mit, stünde die Drehung für zwei Bilder
   * still, und genau an der Nahtstelle einer Schleife fällt das auf.
   */
  await seite.evaluate((t) => window.__umlauf(t), n / BILDER);
  const bild = await seite.screenshot({ type: 'png' });
  if (fehler.length) throw new Error(fehler[0]);
  if (!ffmpeg.stdin.write(bild)) {
    await new Promise((ok) => ffmpeg.stdin.once('drain', ok));
  }
  if ((n + 1) % 36 === 0) console.log(`  ${n + 1}/${BILDER}`);
}
ffmpeg.stdin.end();
await fertig;
console.log(`  ✓ ${ziel}`);

await seite.close();
await schliesse();

/* =======================================================================
 * DIE SEITE ZUSAMMENSETZEN
 * ==================================================================== */

function bauSeite({ gitter, feld, ueber }) {
  return `<!doctype html>
<html lang="de">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>Gebirge als Geometrie</title>
<style>
  :root {
    color-scheme: light dark;
    --papier: #EFE9DC;
    --tinte: #3A3426;
  }
  @media (prefers-color-scheme: dark) {
    :root:not([data-thema="hell"]) { --papier: #15130F; --tinte: #CFC6B2; }
  }
  :root[data-thema="dunkel"] { --papier: #15130F; --tinte: #CFC6B2; }
  * { box-sizing: border-box; }
  html, body { margin: 0; height: 100%; overflow: hidden; background: var(--papier); }
  body { font: 15px/1.5 ui-serif, Georgia, serif; color: var(--tinte); }
  canvas { display: block; touch-action: none; }
  .schild {
    position: fixed; left: 16px; right: 16px; bottom: max(16px, env(safe-area-inset-bottom));
    max-width: 32rem; pointer-events: none; font-size: 13px; opacity: .74;
  }
  .schild b { font-weight: 600; }
  body.film .schild { display: none; }
</style>
</head>
<body>
<div class="schild">
  <b>Gebirge als Geometrie.</b> Kein gespeichertes Bergbild: Die Höhe kommt aus
  dem Kammverlauf, die Oberfläche von denselben Malern wie die Karte im Buch.
  Ziehen dreht, zwei Finger zoomen.
</div>
<script type="module">
import * as DREI from './three.module.min.js';

if (new URLSearchParams(location.search).has('film')) document.body.classList.add('film');

const GITTER = ${gitter};
const WEITE = ${feld.w};
const UEBER = ${ueber};

const papier = () => getComputedStyle(document.documentElement)
  .getPropertyValue('--papier').trim() || '#EFE9DC';

const szene = new DREI.Scene();
const kamera = new DREI.PerspectiveCamera(42, innerWidth / innerHeight, 1, 8000);
const maler = new DREI.WebGLRenderer({ antialias: true });
maler.setPixelRatio(Math.min(2, devicePixelRatio || 1));
maler.setSize(innerWidth, innerHeight);
document.body.appendChild(maler.domElement);

/*
 * Licht von links oben – dieselbe Richtung wie in der gemalten Karte.
 * Stünde es woanders, widerspräche das Modell dem Bild, das darauf liegt.
 */
/*
 * \`position\` ist an einem Three-Objekt schreibgeschützt – man setzt sie,
 * man ersetzt sie nicht. Ein \`Object.assign\` darauf wirft im strengen
 * Modus, und ein Modulskript ist immer streng.
 */
const sonne = new DREI.DirectionalLight(0xfff6e2, 0.8);
sonne.position.set(-1, 1.3, -0.9).normalize();
szene.add(sonne);
szene.add(new DREI.AmbientLight(0xe7eef2, 1.35));

const lader = new DREI.TextureLoader();
const [hoeheBild, farbeBild] = await Promise.all([
  lader.loadAsync('./hoehe.png'),
  lader.loadAsync('./farbe.jpg'),
]);
farbeBild.colorSpace = DREI.SRGBColorSpace;
farbeBild.anisotropy = maler.capabilities.getMaxAnisotropy();

/*
 * Die Höhe aus den zwei Kanälen zurückrechnen.
 *
 * Three.js kann eine Verschiebungskarte selbst lesen, aber nur mit acht Bit.
 * Deshalb wird hier von Hand gelesen: Rot mal 256 plus Grün, geteilt durch
 * 65 535 – das ergibt wieder 0 bis 1, über 65 536 Stufen.
 */
const leinwand = document.createElement('canvas');
leinwand.width = GITTER;
leinwand.height = GITTER;
const lctx = leinwand.getContext('2d', { willReadFrequently: true });
lctx.drawImage(hoeheBild.image, 0, 0);
const roh = lctx.getImageData(0, 0, GITTER, GITTER).data;

const geo = new DREI.PlaneGeometry(WEITE, WEITE, GITTER - 1, GITTER - 1);
const pos = geo.attributes.position;
for (let i = 0; i < GITTER * GITTER; i++) {
  pos.setZ(i, ((roh[i * 4] * 256 + roh[i * 4 + 1]) / 65535) * UEBER);
}
geo.computeVertexNormals();

/*
 * **Viel Rauheit, kein Metall, kräftiges Umgebungslicht.**
 *
 * Das gemalte Bild trägt sein Licht schon in sich – es ist in der Karte von
 * links oben beleuchtet. Legt man darüber noch starkes Licht aus dem Modell,
 * steht jede Flanke zweimal im Schatten, und die ruhigen Artbook-Töne werden
 * dunkel und speckig. Das Modell liefert die Form, das Bild liefert die
 * Farbe.
 */
const netz = new DREI.Mesh(geo, new DREI.MeshStandardMaterial({
  map: farbeBild, roughness: 0.97, metalness: 0,
}));
/* Die Fläche liegt flach; in der Karte wächst y nach Süden, hier nach hinten. */
netz.rotation.x = -Math.PI / 2;
szene.add(netz);

const ton = new DREI.Color(papier());
szene.background = ton;
/*
 * **Der Dunst stand viel zu nah.**
 *
 * Bei 1,0 bis 2,6 Weiten lag die Kamera selbst schon im Dunst: Der
 * Vordergrund wurde grau, die hinteren Grate verschwanden ganz, und die
 * ruhigen Artbook-Töne sahen aus wie schlechtes Wetter. Jetzt beginnt er
 * erst hinter dem Modell und nimmt nur noch der fernsten Kante die Härte.
 */
szene.fog = new DREI.Fog(ton, WEITE * 1.6, WEITE * 3.8);

/* ---- Drehen und Zoomen, von Hand ------------------------------------- */
/*
 * Keine OrbitControls: Die liegen in \`examples/\` und wären eine zweite
 * Abhängigkeit für dreissig Zeilen. Diese dreissig Zeilen sind leichter zu
 * lesen als die Einstellungen, die man an OrbitControls vornehmen müsste.
 */
let drehung = -0.6;
let neigung = 0.62;
let abstand = WEITE * 1.15;
let treibt = true;

const setzeKamera = () => {
  kamera.position.set(
    Math.sin(drehung) * Math.cos(neigung) * abstand,
    Math.sin(neigung) * abstand,
    Math.cos(drehung) * Math.cos(neigung) * abstand,
  );
  kamera.lookAt(0, UEBER * 0.3, 0);
};

const zeiger = new Map();
let letzterAbstand = 0;
const flaeche = maler.domElement;

flaeche.addEventListener('pointerdown', (e) => {
  flaeche.setPointerCapture(e.pointerId);
  zeiger.set(e.pointerId, { x: e.clientX, y: e.clientY });
  treibt = false;
});
flaeche.addEventListener('pointermove', (e) => {
  const alt = zeiger.get(e.pointerId);
  if (!alt) return;
  const neu = { x: e.clientX, y: e.clientY };
  if (zeiger.size === 1) {
    drehung -= (neu.x - alt.x) * 0.006;
    neigung = Math.max(0.06, Math.min(1.45, neigung + (neu.y - alt.y) * 0.004));
  }
  zeiger.set(e.pointerId, neu);
  if (zeiger.size === 2) {
    const [a, b] = [...zeiger.values()];
    const d = Math.hypot(a.x - b.x, a.y - b.y);
    if (letzterAbstand) {
      abstand = Math.max(WEITE * 0.3, Math.min(WEITE * 2.8, abstand * (letzterAbstand / d)));
    }
    letzterAbstand = d;
  }
  setzeKamera();
});
const loslassen = (e) => {
  zeiger.delete(e.pointerId);
  if (zeiger.size < 2) letzterAbstand = 0;
};
flaeche.addEventListener('pointerup', loslassen);
flaeche.addEventListener('pointercancel', loslassen);
flaeche.addEventListener('wheel', (e) => {
  e.preventDefault();
  treibt = false;
  abstand = Math.max(WEITE * 0.3, Math.min(WEITE * 2.8, abstand * (1 + e.deltaY * 0.0012)));
  setzeKamera();
}, { passive: false });

addEventListener('resize', () => {
  kamera.aspect = innerWidth / innerHeight;
  kamera.updateProjectionMatrix();
  maler.setSize(innerWidth, innerHeight);
});

setzeKamera();

/**
 * Der Umlauf von aussen.
 *
 * \`window.__umlauf(t)\` setzt den Winkel und zeichnet sofort – damit nimmt
 * der Filmtreiber Bild für Bild auf, ohne auf die Uhr angewiesen zu sein.
 * Ohne ihn treibt die Szene von selbst, langsam genug, dass es nicht
 * kreiselt.
 */
window.__umlauf = (t) => {
  treibt = false;
  drehung = -0.6 + t * Math.PI * 2;
  setzeKamera();
  maler.render(szene, kamera);
};

const takt = () => {
  if (treibt) {
    drehung += 0.0012;
    setzeKamera();
    maler.render(szene, kamera);
  }
  requestAnimationFrame(takt);
};
takt();
window.__bereit = true;
</script>
</body>
</html>
`;
}
