/**
 * Weltzeit.
 *
 * Die Chronik im Anhang zeigt, wann *du* etwas geaendert hast. Das hier ist
 * etwas anderes: wann etwas *in der Welt* geschah. Beides sind Zeiten, und sie
 * haben nichts miteinander zu tun – ein Eintrag, den du heute anlegst, kann
 * ein Ereignis von vor achthundert Jahren beschreiben.
 *
 * Zwei Entscheidungen, die alles Weitere tragen:
 *
 * **Die Eingabe bleibt Text.** Gespeichert wird, was der Verfasser geschrieben
 * hat – „1032", „Frueh 1044", „12.4.1032". Nicht eine Zahl, in die wir seine
 * Schreibweise uebersetzt haben. Ein Buch, das die eigene Notation des
 * Verfassers stillschweigend umschreibt, nimmt ihm die Welt aus der Hand. Wir
 * lesen sie beim Rechnen, und wenn wir sie nicht verstehen, sagen wir das,
 * statt zu raten.
 *
 * **Der Kalender gehoert der Welt.** Zwoelf Monate zu dreissig Tagen sind eine
 * Annahme ueber die Erde, nicht ueber Dragoncore. Deshalb steht er als Wert
 * hier und nicht als Zahl im Code – eine Welt mit acht Monaten oder drei
 * Jahreszeiten aendert eine Zeile.
 */

export interface Kalender {
  /** Wie viele Monate ein Jahr hat. */
  monate: number;
  /** Wie viele Tage ein Monat hat. */
  tage: number;
  /** Die Namen der Monate – leer, wenn die Welt nur zaehlt. */
  monatsnamen: string[];
  /** Was hinter der Jahreszahl steht, z. B. „n. d. F." */
  aera: string;
  /** Wie ein Jahr vor dem Nullpunkt heisst. */
  aeraDavor: string;
}

export const DEFAULT_KALENDER: Kalender = {
  monate: 12,
  tage: 30,
  monatsnamen: [],
  aera: '',
  aeraDavor: 'v. Z.',
};

/**
 * Ein Zeitpunkt in der Welt.
 *
 * Monat, Tag und Stunde duerfen fehlen. Das ist keine Nachlaessigkeit, sondern
 * der Normalfall: Von den meisten Ereignissen einer erfundenen Welt kennt man
 * das Jahr und sonst nichts, und ein Buch, das auf einem Tagesdatum besteht,
 * zwingt zum Erfinden.
 */
export interface Weltzeit {
  jahr: number;
  monat?: number;
  tag?: number;
  stunde?: number;
  /** Wie es dastand, bevor wir es gelesen haben. */
  roh: string;
  /**
   * Wie genau die Angabe ist. Danach richtet sich die Darstellung: Ein Jahr
   * ist ein Balken ueber zwoelf Monate, ein Tag ein Strich.
   */
  genauigkeit: 'jahr' | 'monat' | 'tag' | 'stunde';
  /**
   * „um 874", „ca. 1200", „gegen Ende des Jahres 1032".
   *
   * Unschaerfe ist etwas anderes als Ungenauigkeit. „1032" heisst: irgendwann
   * in diesem Jahr, aber sicher in diesem. „um 1032" heisst: vielleicht auch
   * 1029 – niemand weiss es mehr. Fuer eine Chronik ist das der haeufigste
   * Fall ueberhaupt, und bis hierher hat das Buch solche Angaben schlicht
   * verworfen: Wer „um 874" schrieb, bekam „nicht lesbar" und keinen Balken.
   *
   * Gerechnet wird mit dem genannten Jahr. Etwas anderes waere erfunden – ein
   * Unschaerfebereich, den niemand angegeben hat. Die Angabe bleibt aber
   * erhalten und darf spaeter weicher gezeichnet werden.
   */
  ungefaehr?: boolean;
}

/* ------------------------------------------------------------- Ordnung ---- */

/**
 * Eine einzige vergleichbare Zahl.
 *
 * Fehlende Angaben zaehlen als Anfang ihres Abschnitts: „1032" ist damit der
 * erste Augenblick des Jahres. Fuer das Ende eines Zeitraums gibt es
 * `ordnungEnde` – sonst waere ein Reich, das „1032" endet, schon am Neujahr
 * untergegangen.
 */
export function ordnung(z: Weltzeit, k: Kalender = DEFAULT_KALENDER): number {
  const monat = (z.monat ?? 1) - 1;
  const tag = (z.tag ?? 1) - 1;
  const stunde = z.stunde ?? 0;
  return ((z.jahr * k.monate + monat) * k.tage + tag) * 24 + stunde;
}

/** Der letzte Augenblick, den diese Angabe noch umfasst. */
export function ordnungEnde(z: Weltzeit, k: Kalender = DEFAULT_KALENDER): number {
  const monat = (z.monat ?? k.monate) - 1;
  const tag = (z.tag ?? k.tage) - 1;
  const stunde = z.stunde ?? 23;
  return ((z.jahr * k.monate + monat) * k.tage + tag) * 24 + stunde;
}

/** Zurueck aus der Ordnungszahl – gebraucht fuer die Achse des Zeitstrahls. */
export function ausOrdnung(n: number, k: Kalender = DEFAULT_KALENDER): Weltzeit {
  const proJahr = k.monate * k.tage * 24;
  const jahr = Math.floor(n / proJahr);
  let rest = n - jahr * proJahr;
  const monat = Math.floor(rest / (k.tage * 24));
  rest -= monat * k.tage * 24;
  const tag = Math.floor(rest / 24);
  const stunde = rest - tag * 24;
  return {
    jahr,
    monat: monat + 1,
    tag: tag + 1,
    stunde,
    roh: '',
    genauigkeit: 'stunde',
  };
}

/** Wie viele Ordnungseinheiten ein Jahr umfasst. */
export function jahrLaenge(k: Kalender = DEFAULT_KALENDER): number {
  return k.monate * k.tage * 24;
}

/* -------------------------------------------------------------- Lesen ---- */

/*
 * Anerkannte Schreibweisen. Bewusst wenige und bewusst eindeutig: Wer
 * „4/5/1032" schreibt, meint je nach Herkunft den vierten Mai oder den
 * fuenften April, und keine Regel der Welt entscheidet das richtig. Solche
 * Angaben lehnen wir ab, statt sie falsch zu verstehen.
 */
const NUR_JAHR = /^(-?\d{1,6})$/;
const JAHR_MONAT = /^(-?\d{1,6})\s*[-/]\s*(\d{1,2})$/;
const JAHR_MONAT_TAG = /^(-?\d{1,6})\s*[-/]\s*(\d{1,2})\s*[-/]\s*(\d{1,2})$/;
const TAG_MONAT_JAHR = /^(\d{1,2})\s*\.\s*(\d{1,2})\s*\.\s*(-?\d{1,6})$/;
/**
 * „v. Z." und Verwandte: das Jahr liegt vor dem Nullpunkt.
 *
 * Am Zeilenende verankert, nicht mit `\b` abgeschlossen. Eine Wortgrenze nach
 * einem optionalen Punkt gibt es am Zeilenende naemlich nicht – „300 v. Z."
 * blieb damit ungelesen, und das Jahr landete auf der falschen Seite der
 * Zeitrechnung.
 */
const DAVOR = /\s*\b(?:v\.?\s*(?:z|chr|d\.?\s*f)|vor\s+der\s+zeit(?:rechnung)?)\.?\s*$/i;

/**
 * Unschaerfe am Anfang: „um 874", „ca. 1200", „etwa 1032".
 *
 * Am Zeilenanfang verankert, damit ein Ort namens „Um" oder ein Titel, in dem
 * „etwa" vorkommt, nicht versehentlich zur Jahresangabe wird.
 */
const UNGEFAEHR = /^\s*(?:um|ca\.?|circa|etwa|gegen|vermutlich|wohl|ungefähr|ungefaehr)\s+/i;

/**
 * Eine geschriebene Zeitangabe lesen.
 *
 * Gibt `undefined` zurueck, wenn sie sich nicht sicher deuten laesst – nie
 * einen geratenen Wert. Der Text bleibt trotzdem am Eintrag stehen und wird
 * angezeigt; er taucht nur nicht auf der Achse auf, und die Pruefung sagt
 * warum.
 */
export function leseZeit(text: string | undefined, k: Kalender = DEFAULT_KALENDER): Weltzeit | undefined {
  if (!text) return undefined;
  const roh = text.trim();
  if (!roh) return undefined;

  const davor = DAVOR.test(roh);
  const ungefaehr = UNGEFAEHR.test(roh);
  /* Alles ausser Ziffern, Trennern und Monatsnamen stoert beim Lesen. */
  let rest = roh.replace(DAVOR, '').replace(UNGEFAEHR, '').trim();

  /*
   * Die Aera der Welt hinten abschneiden – „1032 n. d. F." ist dasselbe Jahr
   * wie „1032". Sie negiert nicht, sie benennt nur die Zeitrechnung.
   */
  if (!davor && k.aera) {
    const aera = k.aera.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    rest = rest.replace(new RegExp(`\\s*${aera}\\s*$`, 'i'), '').trim();
  }

  /* Monatsnamen der Welt, falls sie welche hat. */
  let monatAusName: number | undefined;
  if (k.monatsnamen.length) {
    const treffer = k.monatsnamen.findIndex((m) => m && new RegExp(`\\b${m}\\b`, 'i').test(rest));
    if (treffer >= 0) {
      monatAusName = treffer + 1;
      rest = rest.replace(new RegExp(`\\b${k.monatsnamen[treffer]}\\b`, 'i'), '').trim();
    }
  }

  const vorzeichen = (j: number) => (davor && j > 0 ? -j : j);
  const fertig = (
    jahr: number,
    monat: number | undefined,
    tag: number | undefined,
    genauigkeit: Weltzeit['genauigkeit'],
  ): Weltzeit | undefined => {
    if (monat !== undefined && (monat < 1 || monat > k.monate)) return undefined;
    if (tag !== undefined && (tag < 1 || tag > k.tage)) return undefined;
    return {
      jahr: vorzeichen(jahr),
      monat,
      tag,
      roh,
      genauigkeit,
      ...(ungefaehr ? { ungefaehr: true } : {}),
    };
  };

  let m: RegExpMatchArray | null;
  if ((m = rest.match(JAHR_MONAT_TAG))) {
    return fertig(+m[1], +m[2], +m[3], 'tag');
  }
  if ((m = rest.match(TAG_MONAT_JAHR))) {
    return fertig(+m[3], +m[2], +m[1], 'tag');
  }
  if ((m = rest.match(JAHR_MONAT))) {
    return fertig(+m[1], +m[2], undefined, 'monat');
  }
  if ((m = rest.match(NUR_JAHR))) {
    const jahr = +m[1];
    return monatAusName !== undefined
      ? fertig(jahr, monatAusName, undefined, 'monat')
      : fertig(jahr, undefined, undefined, 'jahr');
  }
  return undefined;
}

/* ------------------------------------------------------------ Schreiben ---- */

export function schreibeZeit(z: Weltzeit, k: Kalender = DEFAULT_KALENDER): string {
  const jahr = Math.abs(z.jahr);
  const suffix = z.jahr < 0 ? ` ${k.aeraDavor}` : k.aera ? ` ${k.aera}` : '';
  /* Die Unschaerfe gehoert zur Aussage und darf beim Zurueckschreiben nicht verlorengehen. */
  const vorn = z.ungefaehr ? 'um ' : '';

  if (z.genauigkeit === 'jahr' || z.monat === undefined) return `${vorn}${jahr}${suffix}`;

  const monat = k.monatsnamen[z.monat - 1] || `${z.monat}.`;
  if (z.genauigkeit === 'monat' || z.tag === undefined) return `${vorn}${monat} ${jahr}${suffix}`;

  return `${vorn}${z.tag}. ${monat} ${jahr}${suffix}`;
}

/** Nur das Jahr, wie es an der Achse steht. */
export function schreibeJahr(jahr: number, k: Kalender = DEFAULT_KALENDER): string {
  if (jahr < 0) return `${Math.abs(jahr)} ${k.aeraDavor}`;
  return k.aera ? `${jahr} ${k.aera}` : String(jahr);
}

/* ----------------------------------------------------------- Zeitraum ---- */

/**
 * Die zeitliche Ausdehnung einer Entitaet.
 *
 * Beides darf fehlen. Ein Ort ohne Ende besteht bis heute; eine Figur ohne
 * Anfang war immer schon da. Das ist kein Mangel an Daten, sondern eine
 * Aussage – und wird auf dem Zeitstrahl auch so gezeichnet: offen.
 */
export interface Zeitraum {
  beginn?: Weltzeit;
  ende?: Weltzeit;
  /** Von wann bis wann, als Ordnungszahlen – fuer Vergleiche. */
  von?: number;
  bis?: number;
}

export function leseZeitraum(
  beginn: string | undefined,
  ende: string | undefined,
  k: Kalender = DEFAULT_KALENDER,
): Zeitraum {
  const b = leseZeit(beginn, k);
  const e = leseZeit(ende, k);
  return {
    beginn: b,
    ende: e,
    von: b ? ordnung(b, k) : undefined,
    bis: e ? ordnungEnde(e, k) : undefined,
  };
}

/** Bestand das hier zum Zeitpunkt `n`? */
export function bestandBei(r: Zeitraum, n: number): boolean {
  if (r.von !== undefined && n < r.von) return false;
  if (r.bis !== undefined && n > r.bis) return false;
  return true;
}

/** Hat es zu diesem Zeitpunkt schon begonnen? */
export function begannVor(r: Zeitraum, n: number): boolean {
  return r.von === undefined || r.von <= n;
}
