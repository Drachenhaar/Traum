/* =====================================================================
 * KARTENWERK — ein hybrider Kartenrenderer, vertikaler Prototyp
 *
 * Fünf Stufen, eine Richtung. Jede Stufe ist hier eine Sektion und wird
 * später eine Datei unter `src/lib/kartenwerk/`.
 *
 *   Kartendokument  (Semantik — unverändert, jederzeit editierbar)
 *        │
 *   [1] GELÄNDE     Abstandsfelder, Nachbarschaften, Säume
 *        │
 *   [2] STREUWERK   → Staffage[]  (Daten, keine Zeichnung)
 *        │
 *   [3] STILBUCH    Art+Variante → Zeichenanweisung (Bild | Pinsel)
 *        │
 *   [4] KACHELWERK  Kacheln im Kartenraum, zwischengespeichert
 *        │
 *   [5] MALER       blittet Kacheln in die Sicht
 *
 * Der Kern des Hybriden steht in Stufe 3: Eine Zeichenanweisung ist
 * entweder ein **Bild** aus einem Atlas oder ein **Pinsel** (Code).
 * Beide laufen durch denselben Maler. Ein Stil kann deshalb frei
 * mischen – und ein neuer Landschaftstyp kommt als Eintrag im Stilbuch
 * dazu, nicht als Änderung am Maler.
 * ================================================================== */

export const FELD = 1000;

/* ===================================================================
 * 0 · DER ZUFALL
 *
 * Ortszufall, keine Zufallsfolge. Derselbe Ort mit demselben Startwert
 * gibt immer dieselbe Zahl – unabhängig davon, in welcher Reihenfolge
 * gefragt wird, und unabhängig davon, was sich sonst auf der Karte
 * geändert hat. Das ist die Grundlage der Forderung „dieselben Daten
 * und derselbe Seed ergeben dieselbe Landschaft".
 * ================================================================ */
export function amOrt(x, y, saat) {
  let h = Math.imul((Math.round(x * 16) | 0) ^ 0x9e3779b9, 0x85ebca6b);
  h = Math.imul(h ^ (Math.round(y * 16) | 0), 0xc2b2ae35);
  h ^= Math.imul((saat | 0) + 0x27d4eb2f, 0x165667b1);
  h ^= h >>> 15;
  h = Math.imul(h, 0x2545f491);
  h ^= h >>> 13;
  return ((h >>> 0) % 1000003) / 1000003;
}

function folge(saat) {
  let s = (saat >>> 0) || 1;
  return () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
}

/* ===================================================================
 * 1 · GELÄNDE
 *
 * Was eine Fläche über sich selbst weiß, bevor irgendetwas gezeichnet
 * wird: ihr Kasten, ihr Abstandsfeld, und wer ihr Nachbar ist.
 *
 * Das Abstandsfeld ist der Schlüssel zu den Übergängen. Es sagt für
 * jeden Punkt, wie weit er von der Kante entfernt ist (innen positiv,
 * außen negativ). Damit wird ein Waldsaum nicht gewürfelt, sondern
 * gemessen: Dicht in der Mitte, licht am Rand, und am Übergang zur
 * Wiese schieben sich Grasbüschel zwischen die letzten Bäume.
 *
 * Dieselbe Rechnung steht heute schon in `kartografie.ts` für die
 * Küstensäume. Sie wird hier nur allgemein gemacht.
 * ================================================================ */

export function kasten(poly) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const [x, y] of poly) {
    if (x < x0) x0 = x; if (y < y0) y0 = y;
    if (x > x1) x1 = x; if (y > y1) y1 = y;
  }
  return { x0, y0, x1, y1 };
}

export function imPolygon(x, y, poly) {
  let d = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    if ((poly[i][1] > y) !== (poly[j][1] > y) &&
        x < ((poly[j][0] - poly[i][0]) * (y - poly[i][1])) / (poly[j][1] - poly[i][1]) + poly[i][0]) d = !d;
  }
  return d;
}

const ZELLE = 8;

/** Vorzeichenbehaftetes Abstandsfeld einer Fläche. Einmal je Fläche. */
export function abstandsfeld(poly, rand = 60) {
  /*
   * **Das Feld rechnet mit einem ausgedünnten Umriss.**
   *
   * Gemessen: Eine Küste mit 360 Punkten gegen 8000 Rasterzellen sind
   * 2,9 Millionen Abstandsrechnungen – 250 ms für eine Karte. Das Feld hat
   * aber eine Zelle von 8 Einheiten; Umrisspunkte, die enger liegen als
   * das, kann es gar nicht auflösen. Jeder vierte Punkt genügt und kostet
   * ein Viertel.
   */
  const grob = poly.length > 80 ? poly.filter((_, i) => i % 4 === 0) : poly;
  const k = kasten(poly);
  const x0 = k.x0 - rand, y0 = k.y0 - rand;
  const breite = Math.max(2, Math.ceil((k.x1 - k.x0 + rand * 2) / ZELLE));
  const hoehe = Math.max(2, Math.ceil((k.y1 - k.y0 + rand * 2) / ZELLE));
  const werte = new Float32Array(breite * hoehe);
  for (let j = 0; j < hoehe; j++) {
    for (let i = 0; i < breite; i++) {
      const px = x0 + (i + 0.5) * ZELLE;
      const py = y0 + (j + 0.5) * ZELLE;
      let m = Infinity;
      for (let a = 0; a < grob.length; a++) {
        const p = grob[a], q = grob[(a + 1) % grob.length];
        const dx = q[0] - p[0], dy = q[1] - p[1];
        const l2 = dx * dx + dy * dy || 1;
        let t = ((px - p[0]) * dx + (py - p[1]) * dy) / l2;
        t = t < 0 ? 0 : t > 1 ? 1 : t;
        const d = Math.hypot(px - (p[0] + dx * t), py - (p[1] + dy * t));
        if (d < m) m = d;
      }
      werte[j * breite + i] = imPolygon(px, py, poly) ? m : -m;
    }
  }
  return { x0, y0, breite, hoehe, zelle: ZELLE, werte };
}

/** Bilinear – sonst sieht man das Raster im Saum. */
export function abstandBei(feld, x, y) {
  const fx = (x - feld.x0) / feld.zelle - 0.5;
  const fy = (y - feld.y0) / feld.zelle - 0.5;
  const i = Math.floor(fx), j = Math.floor(fy);
  if (i < 0 || j < 0 || i >= feld.breite - 1 || j >= feld.hoehe - 1) return -999;
  const tx = fx - i, ty = fy - j;
  const w = feld.werte, b = feld.breite;
  const a0 = w[j * b + i] * (1 - tx) + w[j * b + i + 1] * tx;
  const a1 = w[(j + 1) * b + i] * (1 - tx) + w[(j + 1) * b + i + 1] * tx;
  return a0 * (1 - ty) + a1 * ty;
}

/**
 * Das Gelände einer ganzen Karte.
 *
 * Einmal je Änderung an den Flächen – nicht je Bild und nicht je
 * Kachel. Bei einer Änderung wird nur das Feld der geänderten Fläche
 * neu gerechnet; die anderen bleiben stehen.
 */
export function gelaendeAus(dokument) {
  const felder = new Map();
  for (const f of dokument.features) felder.set(f.id, abstandsfeld(f.punkte));
  return { felder, dokument };
}

/* ===================================================================
 * 2 · STREUWERK
 *
 * Aus Bedeutung wird Staffage: eine flache Liste von Dingen, die auf
 * der Karte stehen. **Hier wird nichts gezeichnet.** Das Streuwerk
 * weiß nicht, ob ein Baum später ein Bild oder ein Pinselstrich ist –
 * es weiß nur, dass an dieser Stelle einer steht, wie groß er ist und
 * welche Variante.
 *
 * Diese Trennung ist der Grund, warum ein Stilwechsel mehr kann als
 * Farben: Dieselbe Staffageliste, zwei Stilbücher, zwei Bilder.
 *
 * Das Gitter ist am **Kartenraum** ausgerichtet, nicht am Kasten der
 * Fläche. Sonst verschöbe sich beim Vergrößern einer Fläche das ganze
 * Gitter, und mit ihm jeder Baum. (Derselbe Grund wie in `wald.ts`.)
 * ================================================================ */

/**
 * Ein Ding auf der Karte.
 *
 * `ebene` entscheidet die Malreihenfolge grob (Boden vor Bewuchs vor
 * Bauwerk), `y` fein. Der globale y-Vergleich über **alle** Flächen
 * hinweg ist neu: Heute zeichnet jede Fläche ihre eigenen Bäume, und
 * ein Baum kann deshalb nicht vor einem Berg stehen, der zu einer
 * anderen Fläche gehört.
 */
function staffage(art, variante, x, y, h, ebene, dreh = 0) {
  return { art, variante, x, y, h, ebene, dreh };
}

export const EBENE = { boden: 0, bewuchs: 1, fels: 2, bauwerk: 3 };

/**
 * Wie dicht eine Art steht und wie sie zum Rand hin ausläuft.
 *
 * Steht hier und nicht im Stilbuch: Ein Wald ist in jedem Stil ein
 * Wald. Was der Stil ändert, ist, *wie ein Baum aussieht* – nicht, wo
 * er steht. Sonst wäre derselbe Wald in zwei Stilen zwei Wälder, und
 * die Karte wäre nicht mehr dieselbe.
 */
const ARTEN = {
  wald:   { abstand: 13, saum: 30, ebene: EBENE.bewuchs, hoch: [15, 27], varianten: 4 },
  wiese:  { abstand: 17, saum: 10, ebene: EBENE.boden,   hoch: [7, 11],  varianten: 2 },
  sumpf:  { abstand: 21, saum: 14, ebene: EBENE.boden,   hoch: [9, 14],  varianten: 2 },
  berge:  { abstand: 19, saum: 14, ebene: EBENE.fels,    hoch: [40, 112], varianten: 8 },
};

/**
 * Die Staffage einer Fläche.
 *
 * Rein und deterministisch: dieselbe Fläche, derselbe Startwert,
 * dieselbe Liste – in derselben Reihenfolge.
 */
function streueFlaeche(feature, feld, saat) {
  const regel = ARTEN[feature.art];
  if (!regel) return [];
  const k = kasten(feature.punkte);
  const r = regel.abstand;
  const aus = [];

  for (let zeile = Math.floor(k.y0 / r); zeile <= Math.ceil(k.y1 / r); zeile++) {
    for (let spalte = Math.floor(k.x0 / r); spalte <= Math.ceil(k.x1 / r); spalte++) {
      const bx = spalte * r, by = zeile * r;
      const x = bx + amOrt(bx, by, saat) * r;
      const y = by + amOrt(by, bx, saat + 7) * r;

      const d = abstandBei(feld, x, y);
      if (d <= 0) continue;

      /*
       * Der Saum, gemessen statt gewürfelt.
       *
       * Innerhalb von `saum` Einheiten zur Kante steigt die Chance,
       * dass hier nichts steht, linear an. Das ist der Unterschied
       * zwischen einem Wald mit Kante und einem Wald, der ausläuft –
       * und zugleich die Stelle, an der zwei Landschaftsarten
       * ineinander übergehen, statt aneinanderzustoßen.
       */
      const naehe = Math.min(1, d / regel.saum);
      if (amOrt(x, y, saat + 31) > 0.25 + naehe * 0.75) continue;

      const w = amOrt(x, y, saat + 53);
      /* Am Rand kleiner – auch das misst das Abstandsfeld. */
      const skala = 0.55 + 0.45 * naehe;
      const h = (regel.hoch[0] + w * (regel.hoch[1] - regel.hoch[0])) * skala;
      const variante = Math.floor(amOrt(x, y, saat + 71) * regel.varianten);
      aus.push(staffage(feature.art, variante, x, y, h, regel.ebene,
        (amOrt(x, y, saat + 97) - 0.5) * 0.12));
    }
  }
  return aus;
}

/**
 * **Die Gebirgskette.**
 *
 * Berge sind der eine Fall, in dem gleichmäßiges Streuen falsch ist:
 * Auf einer Karte stehen sie in Ketten, nicht in Beeten. Gemessen am
 * ersten Versuch sah eine gestreute Bergfläche aus wie ein Nagelbrett.
 *
 * Gerechnet wird deshalb aus derselben Fläche eine **Hauptachse** –
 * das ist dieselbe Funktion, die `kartografie.ts` heute schon für die
 * Lage eines Namens benutzt. Entlang ihr stehen die höchsten Gipfel,
 * seitlich fallen sie ab. Der Verfasser malt weiterhin nur eine
 * Fläche.
 */
function streueGebirge(feature, feld, saat) {
  const regel = ARTEN.berge;
  const k = kasten(feature.punkte);
  /* Hauptachse: grob über den Schwerpunkt und die größte Ausdehnung. */
  let sx = 0, sy = 0;
  for (const [x, y] of feature.punkte) { sx += x; sy += y; }
  sx /= feature.punkte.length; sy /= feature.punkte.length;
  let bxx = 0, byy = 0, bxy = 0;
  for (const [x, y] of feature.punkte) {
    bxx += (x - sx) ** 2; byy += (y - sy) ** 2; bxy += (x - sx) * (y - sy);
  }
  const winkel = 0.5 * Math.atan2(2 * bxy, bxx - byy);
  const ax = Math.cos(winkel), ay = Math.sin(winkel);

  const aus = [];
  const r = regel.abstand;
  for (let zeile = Math.floor(k.y0 / r); zeile <= Math.ceil(k.y1 / r); zeile++) {
    for (let spalte = Math.floor(k.x0 / r); spalte <= Math.ceil(k.x1 / r); spalte++) {
      const bx = spalte * r, by = zeile * r;
      const x = bx + amOrt(bx, by, saat) * r;
      const y = by + amOrt(by, bx, saat + 7) * r;
      const d = abstandBei(feld, x, y);
      if (d <= 2) continue;

      /* Abstand zur Hauptachse – daraus wird die Höhe. */
      const qx = x - sx, qy = y - sy;
      const quer = Math.abs(-ay * qx + ax * qy);
      const naheAchse = Math.max(0, 1 - quer / Math.max(30, (k.y1 - k.y0) * 0.42));
      const naheKante = Math.min(1, d / regel.saum);

      const w = amOrt(x, y, saat + 53);
      const h = (regel.hoch[0] + w * (regel.hoch[1] - regel.hoch[0]))
        * (0.30 + 0.70 * naheAchse * naheAchse) * (0.45 + 0.55 * naheKante);
      /*
       * **Unter einer Mindesthöhe lieber nichts.**
       *
       * Sonst säumt sich die Kette mit Zwergen, und aus einem Gebirge wird
       * ein Gebirge mit Kiesrand. Was wegfällt, fällt am Rand weg – genau
       * da, wo eine Kette auslaufen soll.
       */
      if (h < 34) continue;
      const variante = Math.floor(amOrt(x, y, saat + 71) * regel.varianten);
      const st = staffage('berge', variante, x, y, h, EBENE.fels);
      /* Spiegeln verdoppelt die Formenzahl, ohne ein Bild zu kosten. */
      st.spiegel = amOrt(x, y, saat + 113) > 0.5;
      aus.push(st);
    }
  }
  return aus;
}

/**
 * Die Staffage der ganzen Karte, einmal sortiert.
 *
 * **Global sortiert, nicht je Fläche.** Erst `ebene`, dann `y`. Damit
 * steht ein Baum vor dem Berg, hinter dem er steht – auch wenn Baum
 * und Berg zu verschiedenen Flächen gehören. Genau das kann der
 * heutige Renderer nicht.
 */
export function staffageAus(gelaende, saat = 1) {
  const aus = [];
  for (const f of gelaende.dokument.features) {
    const feld = gelaende.felder.get(f.id);
    if (!feld) continue;
    if (f.art === 'berge') aus.push(...streueGebirge(f, feld, saat + hash(f.id)));
    else aus.push(...streueFlaeche(f, feld, saat + hash(f.id)));
  }
  for (const m of gelaende.dokument.marken ?? []) {
    aus.push(staffage(m.art, 0, m.bei[0], m.bei[1], m.gr ?? 34, EBENE.bauwerk));
  }
  aus.sort((a, b) => (a.ebene - b.ebene) || (a.y - b.y));
  return aus;
}

function hash(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 8;
}

/* ===================================================================
 * 3 · STILBUCH UND ATLAS — hier sitzt das Hybride
 *
 * Eine Zeichenanweisung ist **entweder** ein Bild aus einem Atlas
 * **oder** ein Pinsel aus Code. Der Maler kennt beide und sonst
 * nichts. Daraus folgt alles, was der Auftrag verlangt:
 *
 *   · Ein Stil kann frei mischen – Artbook bleibt Pinsel, Pergament
 *     bekommt Bilder, und beide laufen durch dasselbe Werk.
 *   · Ein neuer Landschaftstyp ist ein Eintrag, keine Änderung am
 *     Maler.
 *   · Fehlen die Bilder noch, malt ein Pinsel – die Engine steht
 *     trotzdem schon richtig.
 *
 * ---
 *
 * **Warum ein Atlas und nicht einzelne Bilder.**
 *
 * Ein Wald sind schnell zweitausend Bäume. Zweitausend `drawImage`
 * aus zweitausend verschiedenen Quellen zwingen den Browser zu
 * zweitausend Texturwechseln. Aus einem Atlas sind es zweitausend
 * Ausschnitte **derselben** Quelle.
 *
 * ---
 *
 * **Und warum der Atlas hier gebacken statt geladen wird.**
 *
 * Die hochwertigen Grafiken gibt es noch nicht. Statt sie zu
 * behaupten, backt dieser Prototyp sie beim Start aus Code – mit
 * deutlich mehr Aufwand je Bild, als man sich je Einzelbild leisten
 * könnte: Felsfacetten, Schichtung, Streulicht, Kontaktschatten.
 *
 * Das ist zugleich der Beweis des Verfahrens: **Teure Kunst ist
 * bezahlbar, wenn sie einmal entsteht statt zweitausendmal.** Wenn
 * die echten PNG-Dateien kommen, tritt `ladeAtlas()` an die Stelle
 * von `backeAtlas()`, und sonst ändert sich nichts.
 * ================================================================ */

export const MIPS = [1, 0.5, 0.25];

/**
 * Ein Atlas: eine Leinwand, ein Verzeichnis.
 *
 * Jedes Feld kennt seinen Ausschnitt je Mipstufe und seinen
 * **Ankerpunkt** – die Mitte der Grundlinie. Der Anker ist nicht
 * dekorativ: Er ist der Punkt, mit dem das Bild auf dem Boden steht.
 * Ein Bild, das um seine Mitte verankert wäre, rutschte beim
 * Vergrößern nach unten weg.
 */
export class Atlas {
  constructor(breite = 4096) {
    this.leinwand = new OffscreenCanvas(breite, breite);
    this.ctx = this.leinwand.getContext('2d');
    this.felder = new Map();
    this.spalte = 0; this.zeile = 0; this.zeilenhoehe = 0; this.breite = breite;
  }

  /** Platz suchen – eine Regalpackung, mehr braucht es nicht. */
  platz(w, h) {
    if (this.spalte + w > this.breite) { this.spalte = 0; this.zeile += this.zeilenhoehe + 2; this.zeilenhoehe = 0; }
    /*
     * **Der Atlas ist ein Budget, und es läuft über.**
     *
     * Gemessen beim ersten Anlauf: acht Bergbilder zu 650x420 mal drei
     * Mipstufen passen nicht in 2048 Punkte. Die Bäume wurden danach
     * ausserhalb der Leinwand gebacken – also gar nicht –, und im Bild
     * fehlte der halbe Wald. Lautlos.
     *
     * Deshalb zählt der Atlas mit und sagt es. Später ist das die Stelle,
     * an der eine zweite Leinwand aufgemacht wird.
     */
    if (this.zeile + h > this.breite) {
      this.uebergelaufen = (this.uebergelaufen ?? 0) + 1;
      return { x: 0, y: 0, w, h, leer: true };
    }
    const p = { x: this.spalte, y: this.zeile, w, h };
    this.spalte += w + 2;
    if (h > this.zeilenhoehe) this.zeilenhoehe = h;
    return p;
  }

  /**
   * Ein Feld backen: volle Auflösung zeichnen, dann die Mipstufen
   * daraus verkleinern.
   *
   * **Warum Mipstufen.** Ein Bergbild von 512 Punkten, auf 40 Punkte
   * heruntergerechnet, flimmert beim Schieben – der Browser trifft bei
   * jedem Bild andere Quellpunkte. Aus einer passenden Stufe geholt,
   * steht es still. Das ist die Antwort auf „Zoomen darf nicht zu
   * unbrauchbaren Grafiken führen".
   */
  backe(name, w, h, ankerX, ankerY, male) {
    const stufen = [];
    for (const m of MIPS) {
      const bw = Math.max(2, Math.round(w * m)), bh = Math.max(2, Math.round(h * m));
      const p = this.platz(bw, bh);
      this.ctx.save();
      this.ctx.beginPath();
      this.ctx.rect(p.x, p.y, bw, bh);
      this.ctx.clip();
      this.ctx.translate(p.x, p.y);
      this.ctx.scale(m, m);
      male(this.ctx, w, h);
      this.ctx.restore();
      stufen.push(p);
    }
    this.felder.set(name, { stufen, w, h, ankerX, ankerY });
    return this.felder.get(name);
  }
}

/** Ein Bild-Eintrag im Stilbuch. */
const bild = (feld) => ({ art: 'bild', feld });
/** Ein Pinsel-Eintrag im Stilbuch. */
const pinsel = (male) => ({ art: 'pinsel', male });

/* ===================================================================
 * 4 · KACHELWERK
 *
 * Der Grund, warum auf dem iPhone überhaupt etwas läuft.
 *
 * ---
 *
 * **Das Problem, gemessen.**
 *
 * Der heutige Renderer hängt seinen Leinwand-Durchlauf an die Sicht
 * (`}, [karte.features, waelder, sicht, stil])`). Beim Schieben
 * entsteht also sechzigmal in der Sekunde jeder Baum neu. Darum müssen
 * die Bäume heute billig sein – nicht weil Canvas nicht mehr könnte.
 *
 * **Die Lösung.**
 *
 * Gezeichnet wird in Kacheln fester Größe im **Kartenraum**. Eine
 * Kachel wird einmal gefüllt und danach nur noch geblittet. Schieben
 * und Zoomen zeichnen nichts neu, sie kopieren. Wer eine Fläche
 * ändert, macht die Kacheln ungültig, die ihr Kasten berührt – und nur
 * die. Das ist zugleich die Antwort auf „einzelne Landschaftsflächen
 * müssen unabhängig neu gerendert werden können".
 *
 * **Und der Rand.** Ein Berg ragt über seinen Fußpunkt hinaus. Eine
 * Kachel zeichnet deshalb auch Staffage, deren Fuß außerhalb liegt,
 * solange ihr Bild hineinragt (`UEBERSTAND`). Ohne das hätte jede
 * Kachelgrenze eine Schnittkante, und man sähe das Raster.
 * ================================================================ */

export const KACHEL = 250;
const UEBERSTAND = 120;

export class Kachelwerk {
  constructor(stilbuch) {
    this.stilbuch = stilbuch;
    this.kacheln = new Map();
    this.gezeichnet = 0;
    this.msGesamt = 0;
  }

  schluessel(i, j, stufe) { return `${stufe}:${i}:${j}`; }

  /** Nur die Kacheln vergessen, die dieser Kasten berührt. */
  entwerte(kasten) {
    let weg = 0;
    for (const [s, k] of this.kacheln) {
      if (k.x1 < kasten.x0 - UEBERSTAND || k.x0 > kasten.x1 + UEBERSTAND ||
          k.y1 < kasten.y0 - UEBERSTAND || k.y0 > kasten.y1 + UEBERSTAND) continue;
      this.kacheln.delete(s); weg++;
    }
    return weg;
  }

  alles() { this.kacheln.clear(); }

  /**
   * Eine Kachel holen – und füllen, falls sie fehlt.
   *
   * `stufe` ist die Mipstufe: Je weiter herausgezoomt, desto gröber
   * wird gebacken. Eine Kachel bei voller Übersicht in voller
   * Auflösung zu zeichnen wäre Arbeit für Bildpunkte, die niemand
   * sieht.
   */
  hole(i, j, stufe, staffage, grund) {
    const s = this.schluessel(i, j, stufe);
    const da = this.kacheln.get(s);
    if (da) return da;

    const t0 = performance.now();
    const px = Math.round(KACHEL * MIPS[stufe] * 2);
    const leinwand = new OffscreenCanvas(px, px);
    const ctx = leinwand.getContext('2d');
    const massstab = px / KACHEL;
    const x0 = i * KACHEL, y0 = j * KACHEL;

    ctx.setTransform(massstab, 0, 0, massstab, -x0 * massstab, -y0 * massstab);
    grund(ctx, { x0, y0, x1: x0 + KACHEL, y1: y0 + KACHEL }, massstab);

    for (const st of staffage) {
      if (st.x < x0 - UEBERSTAND || st.x > x0 + KACHEL + UEBERSTAND) continue;
      if (st.y < y0 - UEBERSTAND || st.y > y0 + KACHEL + UEBERSTAND) continue;
      this.stilbuch.zeichne(ctx, st, massstab);
    }

    const kachel = { leinwand, massstab, x0, y0, x1: x0 + KACHEL, y1: y0 + KACHEL };
    this.kacheln.set(s, kachel);
    this.gezeichnet++;
    this.msGesamt += performance.now() - t0;
    return kachel;
  }
}

/* ===================================================================
 * 5 · MALER
 *
 * Blittet die sichtbaren Kacheln in die Sicht. Mehr tut er nicht –
 * und genau deshalb kann er später durch einen WebGL-Maler ersetzt
 * werden, ohne dass eine der Stufen 1 bis 4 davon erfährt.
 * ================================================================ */

export function male(ctx, sicht, breitePx, kachelwerk, staffage, grund) {
  const massstab = breitePx / sicht.w;
  const stufe = massstab > 0.75 ? 0 : massstab > 0.38 ? 1 : 2;

  const i0 = Math.floor(sicht.x / KACHEL), i1 = Math.floor((sicht.x + sicht.w) / KACHEL);
  const j0 = Math.floor(sicht.y / KACHEL), j1 = Math.floor((sicht.y + sicht.w) / KACHEL);

  ctx.save();
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  let gezeichnet = 0;
  for (let j = j0; j <= j1; j++) {
    for (let i = i0; i <= i1; i++) {
      const k = kachelwerk.hole(i, j, stufe, staffage, grund);
      ctx.drawImage(
        k.leinwand, 0, 0, k.leinwand.width, k.leinwand.height,
        (k.x0 - sicht.x) * massstab, (k.y0 - sicht.y) * massstab,
        KACHEL * massstab, KACHEL * massstab,
      );
      gezeichnet++;
    }
  }
  ctx.restore();
  return { stufe, kacheln: gezeichnet };
}

export { folge };
