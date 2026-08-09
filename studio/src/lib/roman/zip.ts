/**
 * Ein sehr kleiner ZIP-Schreiber – gerade gross genug fuer eine .docx.
 *
 * Warum von Hand? Weil die Alternative eine Abhaengigkeit von rund hundert
 * Kilobyte gewesen waere, um drei XML-Dateien in einen Behaelter zu legen. Ein
 * ZIP ohne Kompression ist ein durchschaubares Format: Fuer jede Datei ein
 * Kopf, dann die Bytes, am Ende ein Verzeichnis. Word liest das anstandslos –
 * die Deflate-Kompression ist optional, nicht Pflicht.
 *
 * Bewusst nicht implementiert: Kompression, Ordnereintraege, ZIP64,
 * Verschluesselung, Zeitstempel mit Sinn. Nichts davon braucht eine .docx.
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

function crc32(daten: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < daten.length; i++) c = CRC_TABELLE[(c ^ daten[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

interface Eintrag {
  name: Uint8Array;
  daten: Uint8Array;
  crc: number;
  offset: number;
}

/** Zahlen little-endian in einen wachsenden Puffer schreiben. */
class Puffer {
  private teile: Uint8Array[] = [];
  laenge = 0;

  roh(u8: Uint8Array) {
    this.teile.push(u8);
    this.laenge += u8.length;
  }
  u16(n: number) {
    this.roh(new Uint8Array([n & 0xff, (n >>> 8) & 0xff]));
  }
  u32(n: number) {
    this.roh(new Uint8Array([n & 0xff, (n >>> 8) & 0xff, (n >>> 16) & 0xff, (n >>> 24) & 0xff]));
  }
  fertig(): Uint8Array<ArrayBuffer> {
    const out = new Uint8Array(new ArrayBuffer(this.laenge));
    let i = 0;
    for (const t of this.teile) {
      out.set(t, i);
      i += t.length;
    }
    return out;
  }
}

/* Flag 0x0800: Dateinamen sind UTF-8. Ohne das stolpert Word ueber Umlaute. */
const UTF8_FLAG = 0x0800;

export function zip(dateien: { name: string; inhalt: string }[]): Blob {
  const enc = new TextEncoder();
  const buf = new Puffer();
  const eintraege: Eintrag[] = [];

  for (const datei of dateien) {
    const name = enc.encode(datei.name);
    const daten = enc.encode(datei.inhalt);
    const crc = crc32(daten);
    const offset = buf.laenge;

    buf.u32(0x04034b50);
    buf.u16(20); // benoetigte Version
    buf.u16(UTF8_FLAG);
    buf.u16(0); // Methode: gespeichert
    buf.u16(0); // Uhrzeit
    buf.u16(0x21); // Datum: 1. Januar 1980, das ZIP-Nulldatum
    buf.u32(crc);
    buf.u32(daten.length);
    buf.u32(daten.length);
    buf.u16(name.length);
    buf.u16(0); // kein Extrafeld
    buf.roh(name);
    buf.roh(daten);

    eintraege.push({ name, daten, crc, offset });
  }

  const verzeichnisVon = buf.laenge;
  for (const e of eintraege) {
    buf.u32(0x02014b50);
    buf.u16(20); // erzeugende Version
    buf.u16(20); // benoetigte Version
    buf.u16(UTF8_FLAG);
    buf.u16(0);
    buf.u16(0);
    buf.u16(0x21);
    buf.u32(e.crc);
    buf.u32(e.daten.length);
    buf.u32(e.daten.length);
    buf.u16(e.name.length);
    buf.u16(0); // Extra
    buf.u16(0); // Kommentar
    buf.u16(0); // Diskette
    buf.u16(0); // interne Attribute
    buf.u32(0); // externe Attribute
    buf.u32(e.offset);
    buf.roh(e.name);
  }
  const verzeichnisGroesse = buf.laenge - verzeichnisVon;

  buf.u32(0x06054b50);
  buf.u16(0);
  buf.u16(0);
  buf.u16(eintraege.length);
  buf.u16(eintraege.length);
  buf.u32(verzeichnisGroesse);
  buf.u32(verzeichnisVon);
  buf.u16(0); // kein Kommentar

  return new Blob([buf.fertig()], {
    type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  });
}
