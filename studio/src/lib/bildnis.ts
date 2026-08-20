/**
 * Bildnisse – die Schächte, nicht die Bilder.
 *
 * **Ein Charakter ist nicht sein Bild.** Das ist keine Feinheit, sondern die
 * Regel, an der sich entscheidet, ob wir später Bilder tauschen können, ohne
 * Layoutcode anzufassen. Deshalb liegt hier nichts als die Frage
 * „welches Bild gehört an diese Stelle" – und die Antwort ist eine Kennung,
 * kein Bild.
 *
 * Die Datei kennt vier Dinge:
 *
 *   SCHÄCHTE    benannte Stellen, an die ein Bild gehört
 *   ZUSCHNITT   wie ein Bild in seinen Schacht gelegt wird
 *   AUFLÖSUNG   welche Fassung geladen wird – klein oder groß
 *   RÜCKFALL    was dasteht, wenn kein Bild da ist
 *
 * Was sie nicht kennt: wie das Ergebnis aussieht. Das steht in `Bildnis.tsx`.
 *
 * ---
 *
 * **Warum der Zuschnitt nicht im Bild steckt.**
 *
 * Die Versuchung wäre, das Porträt einmal richtig zuzuschneiden und fertig.
 * Dann hinge das Layout an genau diesem Bild – ein neues Bildnis mit anderem
 * Bildausschnitt säße falsch, und man müsste am Code drehen statt am Bild.
 * Der Auftrag verlangt ausdrücklich das Gegenteil: „Kein Layout so bauen, dass
 * es nur mit exakt einem bestimmten Bild funktioniert."
 *
 * Also ist der Zuschnitt eine Angabe *am Eintrag* – drei Zahlen, die sagen,
 * wie nah und auf welchen Punkt. Fehlen sie, gilt eine Vorgabe, die für
 * Porträts fast immer stimmt: etwas herangeholt, auf das obere Drittel
 * ausgerichtet. Dort sitzen Augen.
 */

import type { Entry } from '../types';

/* ------------------------------------------------------------- Schächte --- */

/**
 * Die benannten Stellen, an denen Bilder liegen.
 *
 * Eine geschlossene Aufzählung, damit ein Tippfehler beim Bauen auffällt und
 * nicht beim Ansehen. Neue Schächte kommen hinzu, wenn es eine neue *Stelle*
 * gibt – nicht, wenn es ein neues Bild gibt.
 */
export type Schacht =
  /** Das große Bildnis in der Mitte der Charakterseite. */
  | 'hauptbildnis'
  /** Was hinter dem Bildnis liegt – Dunst, Landschaft, Wappen. */
  | 'bildnisgrund'
  /** Die kleinen Bildnisse in der Beziehungsliste. */
  | 'beziehungsbildnis'
  /** Der Grund der ganzen Seite. */
  | 'weltgrund'
  /** Die Materialschicht darüber – Papier, Leder, Korn. */
  | 'textur';

/**
 * Welche Fassung ein Schacht braucht.
 *
 * Das Hauptbildnis bekommt die große, alles andere die kleine. Das ist der
 * ganze Unterschied zwischen „eine Charakterseite lädt zwei Megabyte" und
 * „eine Charakterseite lädt zwanzig Megabyte, weil auch die sieben kleinen
 * Bildnisse in Originalauflösung kamen".
 */
export function fassungFuer(schacht: Schacht): 'thumb' | 'full' {
  return schacht === 'hauptbildnis' || schacht === 'weltgrund' ? 'full' : 'thumb';
}

/* ------------------------------------------------------------ Zuschnitt --- */

/**
 * Wie ein Bild in seinem Schacht liegt.
 *
 * Alle Werte sind Verhältnisse, keine Pixel – sonst hinge der Zuschnitt an
 * der Bildschirmgröße und wäre auf dem iPad falsch.
 */
export interface Zuschnitt {
  /** 1 = ganz einpassen. Darüber wird herangeholt und beschnitten. */
  zoom: number;
  /** Waagerechter Fokus: -1 ganz links, 0 Mitte, 1 ganz rechts. */
  x: number;
  /** Senkrechter Fokus: -1 ganz oben, 0 Mitte, 1 ganz unten. */
  y: number;
  /** Wie stark der dunkle Schleier über dem Bild liegt, 0 bis 1. */
  schleier: number;
}

/**
 * Die Vorgabe für ein Porträt.
 *
 * `y: -0.35` ist der einzige Wert hier, der eine Behauptung enthält: Auf einem
 * Porträt sitzt das Gesicht über der Mitte. Wer ein Bild einlegt, auf dem das
 * nicht stimmt, dreht am Eintrag und nicht am Programm.
 */
export const ZUSCHNITT_VORGABE: Zuschnitt = { zoom: 1.12, x: 0, y: -0.35, schleier: 0.42 };

/** Werte innerhalb ihrer Grenzen halten – ein Zuschnitt von außen ist Eingabe. */
export function gesundeZuschnitt(z: Partial<Zuschnitt> | undefined): Zuschnitt {
  const v = ZUSCHNITT_VORGABE;
  if (!z) return v;
  const klemme = (n: unknown, von: number, bis: number, ersatz: number) =>
    typeof n === 'number' && Number.isFinite(n) ? Math.min(bis, Math.max(von, n)) : ersatz;
  return {
    zoom: klemme(z.zoom, 1, 3, v.zoom),
    x: klemme(z.x, -1, 1, v.x),
    y: klemme(z.y, -1, 1, v.y),
    schleier: klemme(z.schleier, 0, 1, v.schleier),
  };
}

/**
 * Der Zuschnitt eines Eintrags.
 *
 * Steht er nicht am Eintrag, gilt die Vorgabe. Das ist der Normalfall und
 * soll keine Arbeit machen: Ein Bildnis einzulegen darf nicht bedeuten, dass
 * man anschließend drei Regler bedienen muss.
 */
export function zuschnittVon(e: Entry | undefined): Zuschnitt {
  return gesundeZuschnitt(e?.bildnis);
}

/**
 * Der Zuschnitt als CSS – `object-position` und `scale` getrennt.
 *
 * Getrennt, weil `object-fit: cover` schon zuschneidet und `object-position`
 * nur noch bestimmt, *welcher* Ausschnitt es wird. Der Zoom kommt als
 * `transform` obendrauf. Beides in einem Wert auszudrücken ginge, wäre aber
 * nicht mehr lesbar, und diese Zahlen dreht später ein Mensch am Gerät.
 */
export function bildlage(z: Zuschnitt): { objectPosition: string; transform: string } {
  /* -1..1 → 0..100 Prozent. */
  const p = (n: number) => `${((n + 1) / 2) * 100}%`;
  return {
    objectPosition: `${p(z.x)} ${p(z.y)}`,
    transform: z.zoom === 1 ? 'none' : `scale(${z.zoom})`,
  };
}

/* -------------------------------------------------------------- Auskunft -- */

/**
 * Welches Bild an einem Eintrag hängt.
 *
 * Heute ist das `coverImage`, und diese eine Zeile ist der Grund, warum die
 * ganze Datei existiert: Solange alle Stellen im Programm über sie gehen,
 * kostet ein zweites Bildfeld – ein eigenes Porträt neben dem Titelbild –
 * genau eine Änderung hier und keine im Layout.
 */
export function bildnisVon(e: Entry | undefined): string | undefined {
  return e?.coverImage || undefined;
}

/**
 * Das Namenszeichen für den Rückfall.
 *
 * Der erste Buchstabe, aber nicht blind: Ein Name wie „von Arven" soll ein A
 * ergeben und kein v. Also der erste Buchstabe des ersten Wortes, das groß
 * anfängt – und wenn es keines gibt, eben doch der erste.
 */
export function namenszeichen(titel: string | undefined): string {
  const worte = (titel ?? '').trim().split(/\s+/).filter(Boolean);
  if (!worte.length) return '·';
  const gross = worte.find((w) => w[0] === w[0].toUpperCase() && /\p{L}/u.test(w[0]));
  return (gross ?? worte[0])[0].toUpperCase();
}
