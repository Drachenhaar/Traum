/**
 * Die Backstube – hier entstehen die Grafiken.
 *
 * ---
 *
 * **Warum das hier steht und nicht in `src/`.**
 *
 * Dies ist kein Programmteil, sondern eine **Quelle**. Was hier geschrieben
 * wird, läuft genau einmal: beim Backen. Heraus kommen PNG-Dateien und ein
 * Verzeichnis, und nur die liegen der Anwendung bei. Das Programm weiß
 * nichts von dieser Datei.
 *
 * Deshalb darf hier verschwenderisch gezeichnet werden. Ein Baum bekommt
 * hier mehr Striche, als man sich je Bild und Bild jemals leisten könnte –
 * das ist der ganze Sinn: **Teure Kunst ist bezahlbar, wenn sie einmal
 * entsteht statt zweitausendmal.**
 *
 * ---
 *
 * **Und warum sie aus Code kommt und nicht aus einem Bildmodell.**
 *
 * Ein Bildmodell kann schöner. Es kann aber drei Dinge nicht, die hier
 * zählen: Es trifft die Lichtrichtung nicht über acht Bilder hinweg, es
 * trifft die Palette nicht, und es ist nicht wiederholbar. Ein gebackener
 * Satz ist von Haus aus zusammengehörig, weil er aus denselben Zahlen kommt.
 *
 * Wenn später gemalte oder erzeugte Bilder kommen, treten sie als Dateien an
 * dieselbe Stelle. Das Verzeichnis beschreibt sie, und das Programm merkt
 * keinen Unterschied – genau dafür ist die Strecke gebaut.
 *
 * ---
 *
 * **Die Regeln, die jedes Bild einhält** (siehe `KARTENWERK.md`, Abschnitt 4):
 *
 *   · Der Ankerpunkt ist die Mitte der Unterkante. Dort steht das Ding auf
 *     dem Boden. Es muss die Unterkante erreichen.
 *   · Ein Hauptlicht, von links oben. Schattenseite unten rechts.
 *   · Kein Schlagschatten im Bild – nur ein Kontaktschatten am Fuß, damit
 *     das Ding nicht schwebt.
 *   · Freigestellt, durchsichtiger Rand oben und seitlich.
 */

/** Derselbe Zufall, jedes Mal. Ein Bildsatz muss wiederholbar sein. */
export function folge(saat) {
  let s = (saat >>> 0) || 1;
  return () => {
    s ^= s << 13; s >>>= 0;
    s ^= s >> 17;
    s ^= s << 5; s >>>= 0;
    return s / 4294967296;
  };
}

function mische(a, b, t) {
  const pa = parseInt(a.slice(1), 16);
  const pb = parseInt(b.slice(1), 16);
  const k = (v) => Math.round(((pa >> v) & 255) + (((pb >> v) & 255) - ((pa >> v) & 255)) * t);
  return `rgb(${k(16)},${k(8)},${k(0)})`;
}

/* ==================================================================
 * DER BAUM
 *
 * Acht Varianten aus zwei Familien: Nadel und Laub. Die Familie
 * entscheidet die Silhouette, der Startwert alles andere – Zahl und
 * Lage der Ballen, Neigung des Stamms, Dichte der Spitzen.
 *
 * Drei Tonlagen übereinander machen aus einer Scheibe einen Körper:
 * Schatten nach rechts unten versetzt, Grundton mittig, Streiflicht
 * nach links oben. Mehr Lagen sähen gemalt aus und wären auf einer
 * Karte zu laut; weniger bleiben ein Symbol.
 * =============================================================== */
export function backeBaum(ctx, w, h, p, variante) {
  const r = folge(1000 + variante * 7919);
  const boden = h * 0.955;
  const mx = w / 2;
  const nadel = variante % 2 === 0;

  /* Der Kontaktschatten – das, was einen Baum auf den Boden stellt. */
  ctx.fillStyle = 'rgba(40,34,20,0.17)';
  ctx.beginPath();
  ctx.ellipse(mx + w * 0.07, boden - h * 0.004, w * 0.24, h * 0.02, 0, 0, 7);
  ctx.fill();

  /* Der Stamm, leicht aus dem Lot – kein Baum steht gerade. */
  const kipp = (r() - 0.5) * w * 0.06;
  const ansatz = nadel ? 0.8 : 0.58;
  ctx.strokeStyle = p.stamm;
  ctx.lineCap = 'round';
  ctx.lineWidth = w * (0.05 + r() * 0.018);
  ctx.beginPath();
  ctx.moveTo(mx, boden);
  ctx.quadraticCurveTo(mx + kipp * 0.4, h * (ansatz + 0.1), mx + kipp, h * ansatz);
  ctx.stroke();

  /*
   * Die Silhouette als **ein** Pfad.
   *
   * Der erste Anlauf stapelte Ellipsen. Gebacken sah jeder Nadelbaum aus wie
   * eine Birne: Übereinandergelegte Kreise haben keine Spitze, und ohne
   * Spitze ist ein Nadelbaum ein Laubbaum. Ein geschlossener Umriss mit
   * gezacktem Rand löst beides auf einmal – Form und Kante.
   */
  const umriss = () => {
    const pfad = new Path2D();
    if (nadel) {
      /* Fünf bis sieben Kranzreihen, nach unten breiter. Jede springt ein
         Stück heraus und wieder zurück: das sind die Äste. */
      const reihen = 5 + Math.floor(r() * 3);
      const spitze = h * (0.05 + r() * 0.05);
      const fuss = h * (ansatz + 0.03);
      const links = [];
      const rechts = [];
      for (let i = 0; i <= reihen; i++) {
        const t = i / reihen;
        const y = spitze + (fuss - spitze) * t;
        const b = w * (0.03 + 0.42 * t ** 1.15) * (0.9 + r() * 0.2);
        /* Der Knick über jeder Reihe – ohne ihn ist es ein glattes Dreieck. */
        if (i > 0) {
          links.push([mx + kipp * (1 - t) - b * 0.62, y - (fuss - spitze) / reihen * 0.42]);
          rechts.push([mx + kipp * (1 - t) + b * 0.6, y - (fuss - spitze) / reihen * 0.42]);
        }
        links.push([mx + kipp * (1 - t) - b, y]);
        rechts.push([mx + kipp * (1 - t) + b, y]);
      }
      pfad.moveTo(mx + kipp, spitze);
      for (const [x, y] of rechts) pfad.lineTo(x, y);
      for (const [x, y] of links.reverse()) pfad.lineTo(x, y);
      pfad.closePath();
    } else {
      /* Eine runde Krone mit gezacktem Rand – Laub, kein Ballon. */
      const mitteY = h * 0.38;
      const rx = w * (0.36 + r() * 0.07);
      const ry = h * (0.27 + r() * 0.06);
      const zacken = 13 + Math.floor(r() * 5);
      for (let i = 0; i <= zacken; i++) {
        const a = (i / zacken) * Math.PI * 2 - Math.PI / 2;
        const aus = 0.88 + (i % 2 ? 0.14 : 0.0) + r() * 0.07;
        const x = mx + kipp * 0.5 + Math.cos(a) * rx * aus;
        const y = mitteY + Math.sin(a) * ry * aus;
        if (i === 0) pfad.moveTo(x, y);
        else pfad.lineTo(x, y);
      }
      pfad.closePath();
    }
    return pfad;
  };

  const form = umriss();

  /*
   * Drei Tonlagen machen aus einer Scheibe einen Körper.
   *
   * Der Grundton füllt die ganze Form. Schatten und Licht werden
   * **ausgeschnitten**, nicht versetzt gezeichnet – versetzt verschiebt sich
   * auch die Silhouette, und dann hat der Baum zwei Umrisse.
   */
  ctx.save();
  ctx.fillStyle = p.laub;
  ctx.fill(form);

  ctx.clip(form);
  /*
   * Schatten und Licht als **Verläufe**, nicht als Scheiben.
   *
   * Der erste Anlauf füllte zwei Ellipsen. Gebacken sah das Streiflicht aus
   * wie ein aufgeklebter Punkt – eine harte Kante mitten im Laub, die es in
   * der Natur nirgends gibt. Ein Verlauf hat keine Kante, und genau das ist
   * der Unterschied zwischen einem Körper und einem Aufkleber.
   */
  const schatten = ctx.createLinearGradient(mx - w * 0.3, h * 0.2, mx + w * 0.45, h * 0.7);
  schatten.addColorStop(0, 'rgba(0,0,0,0)');
  schatten.addColorStop(0.45, 'rgba(0,0,0,0)');
  schatten.addColorStop(1, p.laubSchatten);
  ctx.globalAlpha = 0.92;
  ctx.fillStyle = schatten;
  ctx.fillRect(0, 0, w, h);

  const licht = ctx.createRadialGradient(
    mx - w * 0.15, h * (nadel ? 0.3 : 0.26), 0,
    mx - w * 0.15, h * (nadel ? 0.3 : 0.26), w * 0.34,
  );
  licht.addColorStop(0, p.laubLicht);
  licht.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.globalAlpha = 0.85;
  ctx.fillStyle = licht;
  ctx.fillRect(0, 0, w, h);
  ctx.globalAlpha = 1;
  ctx.restore();

  /*
   * Ein paar Zweige im Schatten – kurz, innen, und nur in der unteren
   * Hälfte. Der erste Anlauf zog sie über den Umriss hinaus; gebacken sahen
   * sie aus wie Kratzer auf dem Papier.
   */
  ctx.save();
  ctx.clip(form);
  ctx.strokeStyle = mische(p.laubSchatten, p.stamm, 0.35);
  ctx.lineCap = 'round';
  ctx.globalAlpha = 0.5;
  for (let i = 0; i < (nadel ? 5 : 4); i++) {
    const y = h * (0.42 + r() * 0.3);
    const seite = r() > 0.5 ? 1 : -1;
    ctx.lineWidth = w * (0.012 + r() * 0.012);
    ctx.beginPath();
    ctx.moveTo(mx + kipp * 0.4, y);
    ctx.lineTo(mx + kipp * 0.4 + seite * w * (0.1 + r() * 0.16), y + h * (0.02 + r() * 0.05));
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  ctx.restore();
}

/* ==================================================================
 * WAS EIN BILDSATZ BESCHREIBT
 *
 * Diese Tabelle ist zugleich die Anforderung an gemalte oder erzeugte
 * Grafiken: Höhe in Bildpunkten, Verhältnis Breite zu Höhe, Zahl der
 * Varianten. Wer Bilder liefert, liefert sie so.
 * =============================================================== */
export const SAETZE = {
  artbook: {
    /* Dieselben Töne wie `karte/stil.ts`. Eine Farbe steht nie zweimal
       im Programm – aber ein gebackenes Bild ist kein Programm, sondern
       ein Erzeugnis, und das Verzeichnis trägt die Herkunft mit. */
    wald: {
      hoehe: 190,
      breiteZuHoehe: 0.8,
      varianten: 8,
      palette: { laub: '#7A8467', laubLicht: '#99A484', laubSchatten: '#5C6749', stamm: '#6B6047' },
      male: backeBaum,
    },
  },
};
