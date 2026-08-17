/**
 * Vom Fingerstrich zur Fläche.
 *
 * Fünf Schritte, und jeder einzelne ist nötig. Wer einen wegnimmt, sieht es
 * sofort:
 *
 *   1. Maske      Der Strich wird in ein grobes Raster gestempelt.
 *   2. Kontur     Marching Squares zieht die Umrisslinie darum.
 *   3. Vereinfachen  Douglas–Peucker wirft die Treppenstufen weg.
 *   4. Glätten    Chaikin rundet die Ecken.
 *   5. Verfeinern Ein Hauch Rauschen bricht die digitale Kante auf.
 *
 * Der Weg über eine **Maske** statt direkt über die Fingerpunkte ist die
 * wichtigste Entscheidung hier. Ein Finger malt keine Fläche, er malt eine
 * Schlangenlinie, die sich selbst kreuzt, doppelt zurückläuft und Löcher
 * lässt. Diese Linie unmittelbar als Polygon zu lesen ergibt eine Figur mit
 * Schleifen, in der „innen" keine Bedeutung mehr hat. Über die Maske ist jede
 * Kritzelei eine Fläche – so, wie ein Mensch es meint, wenn er einen Fleck
 * malt.
 *
 * **Die Grenze der Verfeinerung.** Schritt 5 darf glätten und aufrauen; er
 * darf keine Buchten, Halbinseln oder Inseln erfinden. Deshalb ist die
 * Auslenkung an die Größe der Fläche gebunden und klein gedeckelt: Die
 * Geografie gehört dem Verfasser, nur ihr Strich gehört uns. Ein Programm,
 * das aus einem Kreis eine Küste mit Fjorden macht, hat die Karte
 * mitgeschrieben.
 */

import type { Punkt } from './modell';
import { kasten } from './modell';
import { rauschen } from './zufall';

/** Wie fein die Maske ist. Feiner heißt treuer und langsamer. */
const ZELLE = 8;

/* ----------------------------------------------------------- 1 Die Maske -- */

export interface Maske {
  breite: number;
  hoehe: number;
  /** Ursprung im Kartenraum – die Maske umfasst nur den bemalten Bereich. */
  x0: number;
  y0: number;
  zellen: Uint8Array;
}

/**
 * Den Strich in ein Raster stempeln.
 *
 * Zwischen zwei Zeigerpunkten wird linear aufgefüllt: Ein schneller Finger
 * liefert Punkte im Abstand von zwanzig Punkten, und ohne die Zwischenschritte
 * entstünde eine Perlenkette statt eines Strichs.
 */
export function maskeAus(spur: Punkt[], radius: number): Maske | undefined {
  if (!spur.length) return undefined;
  let x0 = Infinity,
    y0 = Infinity,
    x1 = -Infinity,
    y1 = -Infinity;
  for (const [x, y] of spur) {
    x0 = Math.min(x0, x);
    y0 = Math.min(y0, y);
    x1 = Math.max(x1, x);
    y1 = Math.max(y1, y);
  }
  /* Ein Rand von vier Zellen: für die Kontur, und für das Schließen darunter. */
  const rand = radius + ZELLE * 4;
  x0 -= rand;
  y0 -= rand;
  x1 += rand;
  y1 += rand;

  const breite = Math.max(3, Math.ceil((x1 - x0) / ZELLE));
  const hoehe = Math.max(3, Math.ceil((y1 - y0) / ZELLE));
  const zellen = new Uint8Array(breite * hoehe);
  const r = radius / ZELLE;

  const tupfe = (cx: number, cy: number) => {
    const von = Math.max(0, Math.floor(cy - r));
    const bis = Math.min(hoehe - 1, Math.ceil(cy + r));
    for (let y = von; y <= bis; y++) {
      const dy = y - cy;
      const halb = Math.sqrt(Math.max(0, r * r - dy * dy));
      const l = Math.max(0, Math.floor(cx - halb));
      const rr = Math.min(breite - 1, Math.ceil(cx + halb));
      for (let x = l; x <= rr; x++) zellen[y * breite + x] = 1;
    }
  };

  let vorher: Punkt | undefined;
  for (const p of spur) {
    const cx = (p[0] - x0) / ZELLE;
    const cy = (p[1] - y0) / ZELLE;
    if (vorher) {
      const vx = (vorher[0] - x0) / ZELLE;
      const vy = (vorher[1] - y0) / ZELLE;
      const schritte = Math.ceil(Math.hypot(cx - vx, cy - vy));
      for (let i = 1; i <= schritte; i++) {
        const t = i / schritte;
        tupfe(vx + (cx - vx) * t, vy + (cy - vy) * t);
      }
    } else {
      tupfe(cx, cy);
    }
    vorher = p;
  }
  return { breite, hoehe, x0, y0, zellen };
}

/**
 * Die Lücken schließen.
 *
 * Erst aufblähen, dann wieder abtragen – in der Bildverarbeitung heißt das
 * Closing. Was breiter ist als `weite`, überlebt beide Schritte unverändert;
 * was schmaler ist, wird beim Aufblähen zugeschüttet und kommt beim Abtragen
 * nicht wieder.
 *
 * **Warum das nötig ist.** Wer eine Landmasse mit dem Finger füllt, malt sie
 * in Bahnen, und zwischen zwei Bahnen bleibt ein Haar von einem Millimeter
 * offen. Ohne diesen Schritt findet die Konturverfolgung dort einen Kanal,
 * läuft hinein, wieder heraus – und in der fertigen Fläche stehen feine
 * Striche quer durch das Land, die niemand gemalt hat und die niemand
 * wegbekommt. Es ist der Unterschied zwischen „meine Kritzelei wurde eine
 * Küste" und „meine Kritzelei wurde nachgezeichnet".
 *
 * **Warum es klein bleiben muss.** Zwei Zellen sind sechzehn Kartenpunkte.
 * Eine Meerenge, die jemand absichtlich schmal gemalt hat, ist breiter; ein
 * Spalt zwischen zwei Fingerbahnen ist schmaler. Bei fünf Zellen verschwänden
 * Buchten – dann schriebe die Karte mit, und das darf sie nicht.
 */
function schliesse(m: Maske, weite: number): Maske {
  const { breite, hoehe } = m;
  /* Trennbar: erst waagerecht, dann senkrecht. Ein volles Quadrat kostete das
   * Quadrat der Weite je Zelle, so kostet es das Doppelte. */
  const lauf = (quelle: Uint8Array, treffer: 1 | 0) => {
    const a = new Uint8Array(breite * hoehe);
    for (let y = 0; y < hoehe; y++) {
      for (let x = 0; x < breite; x++) {
        let gefunden = false;
        for (let d = -weite; d <= weite && !gefunden; d++) {
          const nx = x + d;
          /* Beim Abtragen zählt außerhalb als leer – die Maske ist gepolstert,
           * dort ist ohnehin nichts. */
          const wert = nx < 0 || nx >= breite ? 0 : quelle[y * breite + nx];
          if (wert === treffer) gefunden = true;
        }
        a[y * breite + x] = gefunden ? treffer : ((1 - treffer) as 0 | 1);
      }
    }
    const b = new Uint8Array(breite * hoehe);
    for (let y = 0; y < hoehe; y++) {
      for (let x = 0; x < breite; x++) {
        let gefunden = false;
        for (let d = -weite; d <= weite && !gefunden; d++) {
          const ny = y + d;
          const wert = ny < 0 || ny >= hoehe ? 0 : a[ny * breite + x];
          if (wert === treffer) gefunden = true;
        }
        b[y * breite + x] = gefunden ? treffer : ((1 - treffer) as 0 | 1);
      }
    }
    return b;
  };

  /* Aufblähen sucht gesetzte Nachbarn, Abtragen sucht leere. */
  return { ...m, zellen: lauf(lauf(m.zellen, 1), 0) };
}

/* ---------------------------------------------------------- 2 Die Kontur -- */

/**
 * Die Umrisslinie der Maske.
 *
 * **Nicht** ein Verfolger, der von Zelle zu Zelle springt. Der Erstversuch war
 * genau das – Moore-Nachbarschaft, von der Rückrichtung aus im Kreis suchen –,
 * und er scheiterte auf eine Art, die es wert ist, hier zu stehen: Bei einem
 * Strich, der links oben mit einem 2×2-Block beginnt, lief er einmal um diesen
 * Block herum, kam am Startpunkt an, hielt an und meldete eine Fläche von
 * sechzehn Punkten Kantenlänge. Kein Fehler, keine Ausnahme – nur eine winzige
 * Insel statt einer Küste. Wer die Richtungslogik solcher Verfolger je
 * abgeglichen hat, weiß, dass sie in jeder Quelle anders und in den meisten
 * falsch ist.
 *
 * Stattdessen werden die **Kanten zwischen gesetzten und leeren Zellen**
 * eingesammelt und aneinandergehängt. Jede solche Kante wird so gerichtet,
 * dass die gesetzte Zelle links liegt. Damit ist die Umrisslinie keine
 * Suchaufgabe mehr, sondern eine Kette: Jede Ecke hat genau so viele
 * ausgehende wie eingehende Kanten, und die Schleifen ergeben sich von selbst.
 *
 * Löcher entstehen dabei als eigene Schleifen. Zurückgegeben wird die längste
 * – für einen Fleck, den jemand mit dem Finger malt, ist das der Umriss. Wer
 * eine Lichtung will, malt Land hinein.
 */
export function konturAus(m: Maske): Punkt[] {
  const gesetzt = (x: number, y: number) =>
    x >= 0 && y >= 0 && x < m.breite && y < m.hoehe && m.zellen[y * m.breite + x] === 1;

  /*
   * Von Ecke zu Ecke. Die Ecke (x,y) ist die linke obere Ecke der Zelle (x,y).
   *
   * Die vier Richtungen unten sind kein Geschmack: Bei nach unten wachsendem
   * y liegt links von „nach rechts" oben. Deshalb läuft die Oberkante einer
   * gesetzten Zelle nach *links* und die Unterkante nach rechts.
   */
  const ausgang = new Map<number, number[]>();
  const schluessel = (x: number, y: number) => y * (m.breite + 1) + x;
  const lege = (vx: number, vy: number, nx: number, ny: number) => {
    const k = schluessel(vx, vy);
    const liste = ausgang.get(k);
    if (liste) liste.push(schluessel(nx, ny));
    else ausgang.set(k, [schluessel(nx, ny)]);
  };

  for (let y = 0; y < m.hoehe; y++) {
    for (let x = 0; x < m.breite; x++) {
      if (!gesetzt(x, y)) continue;
      if (!gesetzt(x, y - 1)) lege(x + 1, y, x, y);
      if (!gesetzt(x, y + 1)) lege(x, y + 1, x + 1, y + 1);
      if (!gesetzt(x - 1, y)) lege(x, y, x, y + 1);
      if (!gesetzt(x + 1, y)) lege(x + 1, y + 1, x + 1, y);
    }
  }
  if (!ausgang.size) return [];

  /*
   * Die Ketten schließen.
   *
   * Jede Kante wird genau einmal benutzt. An einer Stelle, an der sich zwei
   * Flächen diagonal berühren, hat eine Ecke zwei Ausgänge; welchen man nimmt,
   * entscheidet nur darüber, wie die Schleifen aufgeteilt werden, und die
   * längste ist so oder so der Umriss.
   */
  let beste: Punkt[] = [];
  for (const start of [...ausgang.keys()]) {
    while (ausgang.get(start)?.length) {
      const schleife: number[] = [];
      let k: number | undefined = start;
      while (k !== undefined) {
        const weiter = ausgang.get(k);
        if (!weiter?.length) break;
        schleife.push(k);
        k = weiter.shift();
        if (k === start) break;
      }
      if (schleife.length > beste.length) {
        beste = schleife.map((s) => {
          const x = s % (m.breite + 1);
          const y = (s - x) / (m.breite + 1);
          return [m.x0 + x * ZELLE, m.y0 + y * ZELLE] as Punkt;
        });
      }
    }
  }
  return beste;
}

/* ------------------------------------------------------ 3 Vereinfachen ---- */

/** Douglas–Peucker: was die Linie nicht beschreibt, fliegt raus. */
export function vereinfache(punkte: Punkt[], toleranz: number): Punkt[] {
  if (punkte.length < 3) return punkte;

  const abstand = (p: Punkt, a: Punkt, b: Punkt) => {
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const l = dx * dx + dy * dy;
    if (!l) return Math.hypot(p[0] - a[0], p[1] - a[1]);
    const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / l));
    return Math.hypot(p[0] - (a[0] + t * dx), p[1] - (a[1] + t * dy));
  };

  const lauf = (von: number, bis: number, raus: Set<number>) => {
    let weit = -1;
    let wo = -1;
    for (let i = von + 1; i < bis; i++) {
      const d = abstand(punkte[i], punkte[von], punkte[bis]);
      if (d > weit) {
        weit = d;
        wo = i;
      }
    }
    if (weit > toleranz && wo > 0) {
      lauf(von, wo, raus);
      lauf(wo, bis, raus);
    } else {
      for (let i = von + 1; i < bis; i++) raus.add(i);
    }
  };

  const raus = new Set<number>();
  lauf(0, punkte.length - 1, raus);
  return punkte.filter((_, i) => !raus.has(i));
}

/* ---------------------------------------------------------- 4 Glätten ---- */

/**
 * Chaikin, zweimal.
 *
 * Jeder Durchgang ersetzt eine Ecke durch zwei Punkte auf einem Viertel und
 * drei Vierteln der Kante – die Ecke verschwindet, die Form bleibt. Drei
 * Durchgänge wären runder und würden die Fläche merklich schrumpfen lassen.
 */
export function glaette(punkte: Punkt[], durchgaenge = 2): Punkt[] {
  let aktuell = punkte;
  for (let d = 0; d < durchgaenge; d++) {
    if (aktuell.length < 3) return aktuell;
    const neu: Punkt[] = [];
    for (let i = 0; i < aktuell.length; i++) {
      const a = aktuell[i];
      const b = aktuell[(i + 1) % aktuell.length];
      neu.push([a[0] * 0.75 + b[0] * 0.25, a[1] * 0.75 + b[1] * 0.25]);
      neu.push([a[0] * 0.25 + b[0] * 0.75, a[1] * 0.25 + b[1] * 0.75]);
    }
    aktuell = neu;
  }
  return aktuell;
}

/* ------------------------------------------------------- 5 Verfeinern ---- */

/**
 * Der Küste ihre Unruhe geben – und nicht mehr.
 *
 * Jeder Punkt wandert ein Stück entlang seiner Normalen, gesteuert von
 * sanftem Rauschen über den Umfang. Der Ausschlag ist an die Größe der Fläche
 * gebunden und zusätzlich hart gedeckelt.
 *
 * Diese Deckelung ist keine Vorsicht, sondern die Grenze zwischen Werkzeug
 * und Mitverfasser: Bei drei Prozent sieht eine gemalte Insel nach Küste aus.
 * Bei fünfzehn entstehen Buchten, die niemand gemalt hat – und dann ist es
 * nicht mehr die Welt des Verfassers.
 */
export function verfeinere(punkte: Punkt[], seed: number, staerke = 0.03): Punkt[] {
  if (punkte.length < 4) return punkte;

  let x0 = Infinity,
    y0 = Infinity,
    x1 = -Infinity,
    y1 = -Infinity;
  for (const [x, y] of punkte) {
    x0 = Math.min(x0, x);
    y0 = Math.min(y0, y);
    x1 = Math.max(x1, x);
    y1 = Math.max(y1, y);
  }
  const groesse = Math.hypot(x1 - x0, y1 - y0);
  const ausschlag = Math.min(groesse * staerke, 14);

  return punkte.map((p, i) => {
    const vor = punkte[(i - 1 + punkte.length) % punkte.length];
    const nach = punkte[(i + 1) % punkte.length];
    const tx = nach[0] - vor[0];
    const ty = nach[1] - vor[1];
    const l = Math.hypot(tx, ty) || 1;
    /* Normale: die Tangente um neunzig Grad gedreht. */
    const nx = -ty / l;
    const ny = tx / l;
    const d = rauschen(seed, i * 0.35) * ausschlag;
    return [p[0] + nx * d, p[1] + ny * d] as Punkt;
  });
}

/* ------------------------------------------------------------ Das Ganze --- */

/**
 * Der ganze Weg, in einem Aufruf.
 *
 * `radius` ist die Pinselbreite in Kartenmaßen. Kommt am Ende keine Fläche
 * mit drei Punkten heraus, war es kein Fleck, sondern ein Tippen – dann
 * entsteht nichts, und das ist richtig.
 */
export function flaecheAus(spur: Punkt[], radius: number, seed: number): Punkt[] | undefined {
  /*
   * Ein Tippen ist kein Fleck.
   *
   * Ohne diese Zeile hinterlässt jedes versehentliche Antippen der Karte eine
   * kreisrunde Insel – technisch eine gültige Fläche, in der Sache Müll. Die
   * Schwelle ist die Pinselbreite selbst und keine feste Zahl: Wer nah
   * herangezoomt hat, malt kleiner, und was dort eine Insel ist, wäre
   * herausgezoomt ein Fingerabdruck.
   */
  const k = kasten(spur);
  if (!spur.length || Math.hypot(k.x1 - k.x0, k.y1 - k.y0) < radius) return undefined;

  const m = maskeAus(spur, radius);
  if (!m) return undefined;
  const roh = konturAus(schliesse(m, 2));
  if (roh.length < 4) return undefined;
  const knapp = vereinfache(roh, ZELLE * 0.9);
  if (knapp.length < 3) return undefined;
  return verfeinere(glaette(knapp), seed);
}
