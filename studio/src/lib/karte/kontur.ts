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
import { imPolygon, kasten } from './modell';
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
  /**
   * Wie gross eine Zelle im Kartenmass ist.
   *
   * Stand früher als Modulkonstante daneben und musste hierher, als das
   * Abtragen dazukam: Beim Bearbeiten wird feiner gerastert als beim ersten
   * Malen (siehe `ZELLE_FEIN`), und eine Maske, die ihre eigene Auflösung
   * nicht kennt, wird beim Zurückrechnen um genau diesen Faktor falsch.
   */
  zelle: number;
  zellen: Uint8Array;
}

/**
 * Den Strich in ein Raster stempeln.
 *
 * Zwischen zwei Zeigerpunkten wird linear aufgefüllt: Ein schneller Finger
 * liefert Punkte im Abstand von zwanzig Punkten, und ohne die Zwischenschritte
 * entstünde eine Perlenkette statt eines Strichs.
 */
export function maskeAus(spur: Punkt[], radius: number, zelle = ZELLE): Maske | undefined {
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
  const rand = radius + zelle * 4;
  x0 -= rand;
  y0 -= rand;
  x1 += rand;
  y1 += rand;

  const breite = Math.max(3, Math.ceil((x1 - x0) / zelle));
  const hoehe = Math.max(3, Math.ceil((y1 - y0) / zelle));
  const zellen = new Uint8Array(breite * hoehe);
  const r = radius / zelle;

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
    const cx = (p[0] - x0) / zelle;
    const cy = (p[1] - y0) / zelle;
    if (vorher) {
      const vx = (vorher[0] - x0) / zelle;
      const vy = (vorher[1] - y0) / zelle;
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
  return { breite, hoehe, x0, y0, zelle, zellen };
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
export function konturenAus(m: Maske): Punkt[][] {
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
   * Die Ketten schließen – **alle**, nicht nur die längste.
   *
   * Hier stand einmal `if (schleife.length > beste.length)`, und für einen
   * einzelnen Fleck war das richtig: Ein Finger malt eine Fläche, die längste
   * Schleife ist ihr Umriss, der Rest sind Krümel.
   *
   * Beim **Abtragen** stimmt das nicht mehr. Eine Bucht, die eine Landmasse
   * durchschneidet, macht daraus zwei – und die kleinere wäre stillschweigend
   * verschwunden. Ein Verfahren, das die Hälfte einer Landmasse wegwirft, ohne
   * etwas zu sagen, ist schlimmer als eines, das sich weigert.
   *
   * Zurück kommen deshalb alle Schleifen, nach Länge sortiert. Wer nur eine
   * will, nimmt die erste – dafür gibt es `konturAus` darunter.
   */
  const schleifen: Punkt[][] = [];
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
      if (schleife.length >= 4) {
        schleifen.push(
          schleife.map((sk) => {
            const x = sk % (m.breite + 1);
            const y = (sk - x) / (m.breite + 1);
            return [m.x0 + x * m.zelle, m.y0 + y * m.zelle] as Punkt;
          }),
        );
      }
    }
  }
  return schleifen.sort((a, b) => b.length - a.length);
}

/**
 * Der Umriss – die längste Schleife.
 *
 * Der übliche Fall: ein Fleck, ein Umriss. Alles andere sind Krümel, die beim
 * Stempeln in der Maske entstanden sind.
 */
export function konturAus(m: Maske): Punkt[] {
  return konturenAus(m)[0] ?? [];
}

/**
 * Zweimal die Fläche, mit Vorzeichen.
 *
 * Das Vorzeichen unterscheidet einen **Umriss** von einem **Loch**: Beide sind
 * geschlossene Schleifen, aber sie laufen andersherum. Ohne diese
 * Unterscheidung würde ein See, den jemand mitten in eine Landmasse hinein
 * abträgt, als zweite Landmasse gelesen – ein Loch, das sich für eine Insel
 * hält.
 */
export function flaechenmass(poly: Punkt[]): number {
  let m = 0;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    m += poly[j][0] * poly[i][1] - poly[i][0] * poly[j][1];
  }
  return m;
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

/* ========================================================================
 * DAS ABTRAGEN – eine Bucht in eine Küste
 *
 * ---
 *
 * **Warum das die Regel nicht bricht.**
 *
 * Oben im Dateikopf steht: „Die Geografie gehört dem Verfasser, nur ihr Strich
 * gehört uns. Ein Programm, das aus einem Kreis eine Küste mit Fjorden macht,
 * hat die Karte mitgeschrieben."
 *
 * Der Satz bleibt wörtlich stehen. Eine Bucht wird hier **nicht geraten** –
 * sie entsteht genau dort, wo jemand sie gezogen hat, und genau so breit wie
 * sein Pinsel. Das Programm weiss nicht, *was* gemeint ist; es weiss, *wie
 * sich das benimmt, was benannt wurde.* Statt klüger zu werden, bekommt der
 * Verfasser mehr Wörter.
 *
 * ---
 *
 * **Der Glücksfall: Verschnitt ohne Verschnittbibliothek.**
 *
 * Der Weg über eine Maske wurde vor langer Zeit aus einem anderen Grund
 * gewählt – weil ein Finger keine Fläche malt, sondern eine Schlangenlinie.
 * Genau dieser Umweg schenkt das Abtragen umsonst: Die vorhandene Fläche wird
 * ins Raster gestempelt, der Strich löscht Zellen, und derselbe Weg wie beim
 * Malen zieht die neue Küste. Keine Polygon-Verschneidung, keine neue
 * Abhängigkeit – und das Ergebnis spricht dieselbe Formensprache, weil es
 * durch dieselben Schritte läuft.
 * ===================================================================== */

/**
 * Feiner als beim ersten Malen.
 *
 * Beim Bearbeiten geht die Fläche durch das Raster und wieder heraus. Jeder
 * solche Weg kostet Feinheit; bei acht Einheiten wäre eine Küste nach einem
 * Dutzend Buchten sichtbar weichgespült. Vier kostet das Vierfache an Zellen
 * und ist bei einer Bucht immer noch nichts – gerechnet wird nur über den
 * Kasten der Fläche, nicht über das ganze Kartenfeld.
 */
const ZELLE_FEIN = 4;

/**
 * Eine Bucht in eine vorhandene Fläche ziehen.
 *
 * Zurück kommen **alle** übrigbleibenden Flächen: Eine Bucht, die durchtrennt,
 * macht aus einer Landmasse zwei, und beide gehören dem Verfasser. Kommt
 * nichts zurück, hat der Strich die Fläche ganz weggenommen – auch das ist
 * eine gültige Antwort, und die Seite muss sie behandeln.
 *
 * `undefined` heisst dagegen: Es hat sich nichts geändert. Der Strich lag
 * daneben, war zu kurz, oder er lag ganz im Inneren.
 *
 * ---
 *
 * **Löcher fallen weg, und das ist Absicht.**
 *
 * Wer mitten in ein Land eine Bucht malt, ohne die Küste zu berühren, meint
 * einen See – und ein See ist in diesem Buch eine eigene Fläche mit der
 * Bedeutung „Wasser", keine Aussparung. Ein `Kartenfeature` ist genau ein
 * geschlossener Umriss; Aussparungen gäbe es nur mit einem zweiten Feld, und
 * das wäre eine zweite Art, dasselbe zu sagen.
 */
export function abtragen(
  poly: Punkt[],
  spur: Punkt[],
  radius: number,
): Punkt[][] | undefined {
  if (poly.length < 3 || spur.length < 2) return undefined;

  /* Der Kasten umfasst beides – die Fläche und den Strich, der über sie hinausragt. */
  const kf = kasten(poly);
  const ks = kasten(spur);
  const rand = radius + ZELLE_FEIN * 4;
  const x0 = Math.min(kf.x0, ks.x0) - rand;
  const y0 = Math.min(kf.y0, ks.y0) - rand;
  const x1 = Math.max(kf.x1, ks.x1) + rand;
  const y1 = Math.max(kf.y1, ks.y1) + rand;

  const breite = Math.max(3, Math.ceil((x1 - x0) / ZELLE_FEIN));
  const hoehe = Math.max(3, Math.ceil((y1 - y0) / ZELLE_FEIN));
  const zellen = new Uint8Array(breite * hoehe);

  /* Die Fläche einstempeln – Zellenmitte, damit die Kante nicht um eine halbe
     Zelle wandert. */
  for (let y = 0; y < hoehe; y++) {
    for (let x = 0; x < breite; x++) {
      const mx = x0 + (x + 0.5) * ZELLE_FEIN;
      const my = y0 + (y + 0.5) * ZELLE_FEIN;
      if (imPolygon([mx, my], poly)) zellen[y * breite + x] = 1;
    }
  }

  /* Und den Strich wieder herausnehmen. */
  const r = radius / ZELLE_FEIN;
  const loesche = (cx: number, cy: number) => {
    const von = Math.max(0, Math.floor(cy - r));
    const bis = Math.min(hoehe - 1, Math.ceil(cy + r));
    for (let y = von; y <= bis; y++) {
      const dy = y - cy;
      const halb = Math.sqrt(Math.max(0, r * r - dy * dy));
      const l = Math.max(0, Math.floor(cx - halb));
      const rr = Math.min(breite - 1, Math.ceil(cx + halb));
      for (let x = l; x <= rr; x++) zellen[y * breite + x] = 0;
    }
  };

  let vorher: Punkt | undefined;
  let getroffen = false;
  for (const p of spur) {
    const cx = (p[0] - x0) / ZELLE_FEIN;
    const cy = (p[1] - y0) / ZELLE_FEIN;
    if (imPolygon(p, poly)) getroffen = true;
    if (vorher) {
      const vx = (vorher[0] - x0) / ZELLE_FEIN;
      const vy = (vorher[1] - y0) / ZELLE_FEIN;
      const schritte = Math.ceil(Math.hypot(cx - vx, cy - vy));
      for (let i = 1; i <= schritte; i++) {
        const t = i / schritte;
        loesche(vx + (cx - vx) * t, vy + (cy - vy) * t);
      }
    } else {
      loesche(cx, cy);
    }
    vorher = p;
  }
  /* Kein Punkt des Striches lag in der Fläche – dann war er nicht gemeint. */
  if (!getroffen) return undefined;

  const schleifen = konturenAus({ breite, hoehe, x0, y0, zelle: ZELLE_FEIN, zellen });
  if (!schleifen.length) return [];

  /*
   * Umrisse behalten, Löcher wegwerfen – am Vorzeichen erkannt.
   *
   * Das Vorzeichen des grössten Umrisses ist die Richtung, in der ein „aussen"
   * läuft; alles Gegenläufige ist ein Loch.
   */
  const richtung = Math.sign(flaechenmass(schleifen[0]));
  const aussen = schleifen.filter((k) => Math.sign(flaechenmass(k)) === richtung);

  const fertig: Punkt[][] = [];
  for (const roh of aussen) {
    const knapp = vereinfache(roh, ZELLE_FEIN * 0.9);
    if (knapp.length < 3) continue;
    /*
     * **Geglättet, aber nicht neu verfeinert.**
     *
     * `verfeinere` bricht die digitale Kante mit Rauschen auf – einmal, beim
     * Entstehen. Ein zweites Mal darüber würde die Unruhe aufaddieren: Nach
     * fünf Buchten wäre aus einer Küste ein Sägeblatt. Die ursprüngliche
     * Unruhe überlebt das Raster ohnehin, weil bei vier Einheiten alles
     * erhalten bleibt, was grösser ist als vier.
     */
    fertig.push(glaette(knapp));
  }
  /* Krümel, die beim Stempeln entstanden sind, sind keine Landmassen. */
  const schwelle = radius * radius;
  return (
    fertig
      .filter((k) => Math.abs(flaechenmass(k)) / 2 > schwelle)
      /*
       * **Die grösste zuerst** – und nach Fläche, nicht nach Umfang.
       *
       * `konturenAus` sortiert nach Länge der Schleife, weil es dort um die
       * Frage geht, welche Kette der Umriss ist. Hier geht es um etwas
       * anderes: Wenn eine Landmasse zerfällt, behält *ein* Teil ihre
       * Kennung, ihren Namen und ihren Startwert – und das muss das
       * Hauptstück sein, nicht der zerfranste Zipfel.
       *
       * Umfang und Fläche fallen dabei auseinander: Eine schmale, lange
       * Halbinsel hat mehr Rand als ein rundes Stück doppelter Grösse. Wer
       * hier nach Länge sortierte, verschöbe den Namen einer Insel auf ihren
       * abgetrennten Ausläufer.
       */
      .sort((a, b) => Math.abs(flaechenmass(b)) - Math.abs(flaechenmass(a)))
  );
}
