/**
 * Ein ZIP schreiben und lesen – ohne Kompression, ohne Bibliothek.
 *
 * ---
 *
 * **Warum das überhaupt sein muss.**
 *
 * Die Sicherung legte bisher jedes Bild als Base64 in *eine* JSON-Zeichenkette.
 * Das hat eine harte Grenze, und sie ist gemessen: Eine Zeichenkette fasst in
 * dieser Laufzeitumgebung 512 MB, Base64 bläht um ein Drittel auf – die
 * Sicherung scheitert also je nach Dateigrösse zwischen etwa 260 und 1300
 * Bildern mit „Invalid string length". Wer zweitausend Zeichnungen einlegt,
 * kann sein Buch danach **nicht mehr aus dem Browser holen**. Das ist kein
 * Schönheitsfehler, das ist der Verlust der Arbeit.
 *
 * Ein ZIP kennt diese Grenze nicht: Die Dateien bleiben Bytes, sie werden nie
 * zu Text, und der Browser legt einen grossen Blob auf die Platte statt in den
 * Arbeitsspeicher.
 *
 * ---
 *
 * **Warum ohne Kompression.**
 *
 * Der Inhalt sind PNG und JPEG – beides ist bereits komprimiert. Deflate
 * darüber gewinnt ein paar Promille und kostet bei zweitausend Bildern
 * Minuten. Gespeichert wird deshalb mit Methode 0 („store"), und das ist
 * regelkonformes ZIP: Jedes Entpackprogramm liest es.
 *
 * Die einzige Datei, bei der Kompression etwas brächte, ist das JSON – und
 * die ist im Verhältnis winzig.
 *
 * ---
 *
 * **Warum selbst geschrieben und nicht als Abhängigkeit.**
 *
 * Weil „store" ein einfaches Format ist und weil es **beweisbar** ist: Die
 * Prüfungen schreiben ein Archiv und lassen es vom echten `unzip` prüfen und
 * auspacken. Eine Bibliothek müsste man glauben; das hier lässt sich zeigen.
 *
 * Was ausdrücklich **nicht** unterstützt wird: Kompression beim Lesen (wir
 * lesen nur, was wir selbst geschrieben haben) und Zip64. Oberhalb von vier
 * Gigabyte bricht der Packer ab, statt ein Archiv zu schreiben, das erst in
 * einem Jahr als kaputt auffällt.
 */

/* =======================================================================
 * 1 · CRC-32
 * ==================================================================== */

/**
 * Die Tabelle für CRC-32, einmal berechnet.
 *
 * Das Polynom 0xEDB88320 ist die gespiegelte Form von 0x04C11DB7 – dieselbe,
 * die ZIP, PNG und gzip benutzen. Ohne eine richtige Prüfsumme öffnet sich das
 * Archiv zwar, aber jedes Programm meldet beim Prüfen einen Fehler, und
 * niemand traut einer Sicherung, die sich beschwert.
 */
const CRC_TABELLE = (() => {
  const t = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[i] = c >>> 0;
  }
  return t;
})();

export function crc32(daten: Uint8Array, anfang = 0xffffffff): number {
  let c = anfang;
  for (let i = 0; i < daten.length; i++) c = CRC_TABELLE[(c ^ daten[i]) & 0xff] ^ (c >>> 8);
  return c >>> 0;
}

/** Die Prüfsumme abschliessen – erst danach ist sie die des ganzen Stroms. */
export const crcFertig = (c: number): number => (c ^ 0xffffffff) >>> 0;

/* =======================================================================
 * 2 · SCHREIBEN
 * ==================================================================== */

export interface Zipeintrag {
  /** Der Pfad im Archiv, mit Schrägstrichen. */
  name: string;
  daten: Blob | Uint8Array | string;
}

const roh = new TextEncoder();

/** Vier Bytes, kleinstwertiges zuerst – so steht jede Zahl im ZIP. */
function vier(wert: number): Uint8Array<ArrayBuffer> {
  const b = new Uint8Array(new ArrayBuffer(4));
  new DataView(b.buffer).setUint32(0, wert >>> 0, true);
  return b;
}

function zwei(wert: number): Uint8Array<ArrayBuffer> {
  const b = new Uint8Array(new ArrayBuffer(2));
  new DataView(b.buffer).setUint16(0, wert & 0xffff, true);
  return b;
}

function verbinde(...teile: Uint8Array[]): Uint8Array<ArrayBuffer> {
  const laenge = teile.reduce((n, t) => n + t.length, 0);
  const aus = new Uint8Array(new ArrayBuffer(laenge));
  let i = 0;
  for (const t of teile) {
    aus.set(t, i);
    i += t.length;
  }
  return aus;
}

/** Die Vier-Gigabyte-Grenze – darüber bräuchte es Zip64. */
export const ZIP_GRENZE = 0xffffffff;

/**
 * Ein Archiv bauen.
 *
 * Gibt einen Blob zurück und hält die Dateien nie alle zugleich im
 * Arbeitsspeicher: Die Teile werden als Blob-Stücke aneinandergereiht, und der
 * Browser darf sie auf die Platte legen. Genau darin liegt der Unterschied zur
 * alten Sicherung, die alles zu einer Zeichenkette machen musste.
 *
 * Die Prüfsumme braucht die Bytes allerdings **einmal**. Das ist unvermeidlich
 * – ohne gelesene Bytes gibt es keine Prüfsumme – aber es ist ein Bild nach
 * dem anderen und nicht alle auf einmal.
 */
export async function packe(eintraege: readonly Zipeintrag[]): Promise<Blob> {
  const stuecke: BlobPart[] = [];
  const verzeichnis: Uint8Array<ArrayBuffer>[] = [];
  let versatz = 0;

  for (const eintrag of eintraege) {
    const name = roh.encode(eintrag.name);
    const daten: Uint8Array<ArrayBuffer> =
      typeof eintrag.daten === 'string'
        ? roh.encode(eintrag.daten)
        : eintrag.daten instanceof Blob
          ? new Uint8Array(await eintrag.daten.arrayBuffer())
          : new Uint8Array(eintrag.daten);

    const summe = crcFertig(crc32(daten));
    const groesse = daten.length;

    if (versatz + groesse > ZIP_GRENZE) {
      throw new Error(
        'Das Archiv würde vier Gigabyte überschreiten. Sichere das Buch in zwei Teilen.',
      );
    }

    /*
     * Der lokale Kopf. Fassung 2.0, keine Flags, Methode 0 (unkomprimiert),
     * Zeit und Datum auf null – ein Zeitstempel je Datei sagt hier nichts, was
     * nicht schon im JSON stünde, und null ist ein gültiger Wert.
     */
    const kopf = verbinde(
      vier(0x04034b50),
      zwei(20),
      zwei(0),
      zwei(0),
      zwei(0),
      zwei(0),
      vier(summe),
      vier(groesse),
      vier(groesse),
      zwei(name.length),
      zwei(0),
      name,
    );

    stuecke.push(kopf, daten);

    verzeichnis.push(
      verbinde(
        vier(0x02014b50),
        zwei(20),
        zwei(20),
        zwei(0),
        zwei(0),
        zwei(0),
        zwei(0),
        vier(summe),
        vier(groesse),
        vier(groesse),
        zwei(name.length),
        zwei(0),
        zwei(0),
        zwei(0),
        zwei(0),
        vier(0),
        vier(versatz),
        name,
      ),
    );

    versatz += kopf.length + groesse;
  }

  const verzeichnisBytes = verbinde(...verzeichnis);
  const ende = verbinde(
    vier(0x06054b50),
    zwei(0),
    zwei(0),
    zwei(eintraege.length),
    zwei(eintraege.length),
    vier(verzeichnisBytes.length),
    vier(versatz),
    zwei(0),
  );

  return new Blob([...stuecke, verzeichnisBytes, ende], { type: 'application/zip' });
}

/* =======================================================================
 * 3 · LESEN
 * ==================================================================== */

/**
 * Ein Archiv öffnen.
 *
 * Gelesen wird über das **Zentralverzeichnis** am Ende und nicht, indem man
 * sich von vorn durch die lokalen Köpfe hangelt. Das ist der Weg, den das
 * Format vorsieht: Nur das Verzeichnis ist verbindlich, die lokalen Köpfe
 * dürfen laut Norm unvollständig sein.
 *
 * Gibt die Einträge als Blobs zurück – wieder, ohne sie in den Speicher zu
 * ziehen. Ein Bild wird erst gelesen, wenn es gebraucht wird.
 */
export async function entpacke(archiv: Blob): Promise<Map<string, Blob>> {
  /* Das Ende-Zeichen steht in den letzten 22 Bytes, sofern kein Kommentar folgt. */
  const schwanzGroesse = Math.min(archiv.size, 66_000);
  const schwanz = new Uint8Array(
    await archiv.slice(archiv.size - schwanzGroesse).arrayBuffer(),
  );

  let endeAb = -1;
  for (let i = schwanz.length - 22; i >= 0; i--) {
    if (
      schwanz[i] === 0x50 &&
      schwanz[i + 1] === 0x4b &&
      schwanz[i + 2] === 0x05 &&
      schwanz[i + 3] === 0x06
    ) {
      endeAb = i;
      break;
    }
  }
  if (endeAb < 0) throw new Error('Das ist kein ZIP-Archiv (kein Ende-Zeichen gefunden).');

  const sicht = new DataView(schwanz.buffer, schwanz.byteOffset + endeAb);
  const anzahl = sicht.getUint16(10, true);
  const verzeichnisGroesse = sicht.getUint32(12, true);
  const verzeichnisAb = sicht.getUint32(16, true);

  const verzeichnis = new DataView(
    await archiv.slice(verzeichnisAb, verzeichnisAb + verzeichnisGroesse).arrayBuffer(),
  );

  const aus = new Map<string, Blob>();
  let p = 0;
  const text = new TextDecoder();

  for (let i = 0; i < anzahl; i++) {
    if (verzeichnis.getUint32(p, true) !== 0x02014b50) {
      throw new Error('Das Archiv ist beschädigt (Verzeichniseintrag fehlt).');
    }
    const verfahren = verzeichnis.getUint16(p + 10, true);
    /*
     * Die unkomprimierte Grösse (+24), nicht die komprimierte (+20).
     *
     * Bei Methode 0 stehen in beiden Feldern dieselbe Zahl – eine Prüfung kann
     * die Verwechslung hier also gar nicht bemerken, und der Versuch, sie
     * gegenzuprüfen, lief folgerichtig grün durch. Richtig ist trotzdem +24:
     * Sollte je ein komprimiertes Archiv hereinkommen, bräche es unten an der
     * Verfahrensprüfung ab statt hier stillschweigend zu wenig zu lesen.
     */
    const groesse = verzeichnis.getUint32(p + 24, true);
    const namenLaenge = verzeichnis.getUint16(p + 28, true);
    const zusatzLaenge = verzeichnis.getUint16(p + 30, true);
    const kommentarLaenge = verzeichnis.getUint16(p + 32, true);
    const kopfAb = verzeichnis.getUint32(p + 42, true);
    const name = text.decode(
      new Uint8Array(verzeichnis.buffer, verzeichnis.byteOffset + p + 46, namenLaenge),
    );

    if (verfahren !== 0) {
      throw new Error(`„${name}" ist komprimiert – diese Sicherung erwartet unkomprimierte Dateien.`);
    }

    /*
     * Wo die Daten wirklich beginnen, sagt der **lokale** Kopf: Seine Namens-
     * und Zusatzfelder dürfen sich von denen im Verzeichnis unterscheiden, und
     * wer das übersieht, liest bei manchen Archiven um ein paar Bytes versetzt.
     */
    const lokal = new DataView(await archiv.slice(kopfAb, kopfAb + 30).arrayBuffer());
    if (lokal.getUint32(0, true) !== 0x04034b50) {
      throw new Error('Das Archiv ist beschädigt (lokaler Kopf fehlt).');
    }
    const datenAb =
      kopfAb + 30 + lokal.getUint16(26, true) + lokal.getUint16(28, true);

    aus.set(name, archiv.slice(datenAb, datenAb + groesse));
    p += 46 + namenLaenge + zusatzLaenge + kommentarLaenge;
  }

  return aus;
}
