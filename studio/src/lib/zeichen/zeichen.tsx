/**
 * Der Dragoncore-Zeichensatz.
 *
 * Die Symbole aus dem Referenzbild, gezeichnet statt eingekauft. Jedes ist ein
 * Pfad in einem 24er-Feld, in einer einzigen Strichsprache: 1,25 Punkte,
 * runde Enden, keine Flächen außer dort, wo ein Zeichen ohne Fläche nicht
 * lesbar wäre. Alle nehmen ihre Farbe von `currentColor` – ein Symbol hat
 * hier keine eigene Farbe, es hat die Farbe der Stelle, an der es steht.
 *
 * ---
 *
 * **Warum gezeichnet und nicht aus einer Bibliothek.**
 *
 * Das Projekt benutzt `lucide` und wird das weiter tun; für einen Stift, einen
 * Stern, ein Kreuz ist das genau richtig. Die Zeichen hier sind etwas anderes:
 * Sie stehen in goldenen Medaillons um ein Porträt herum und sollen aussehen,
 * als wären sie in denselben Band geprägt worden wie alles andere. Ein
 * Symbolsatz, den fünfzigtausend andere Anwendungen auch benutzen, kann das
 * nicht leisten – nicht weil er schlecht wäre, sondern weil er neutral ist.
 * Neutralität ist hier der Fehler.
 *
 * ---
 *
 * **Was ein Zeichen hier nicht ist.**
 *
 * Es ist kein Knopf. Die Medaillons im Referenzbild bezeichnen Bedeutungen,
 * die man mit einer Geste erreicht; sie sind Beschriftung, nicht Bedienung.
 * Deshalb gibt es hier keine Zustände, kein Hover, kein Aktiv – wer daraus
 * Knöpfe macht, hat aus der Tiefe wieder ein Menü gemacht.
 */

import type { SVGProps } from 'react';

export interface ZeichenEigenschaften extends SVGProps<SVGSVGElement> {
  /** Kantenlänge in Punkten. Die Strichstärke wächst nicht mit. */
  groesse?: number;
}

/**
 * Der gemeinsame Rahmen.
 *
 * `vectorEffect="non-scaling-stroke"` steht bewusst *nicht* hier: Die Zeichen
 * werden in wenigen festen Größen benutzt (14, 18, 22, 34), und ein Strich,
 * der bei jeder Größe gleich dick bleibt, wirkt bei 34 dünn und bei 14 grob.
 * Stattdessen skaliert der Strich mit und wird bei kleinen Größen leicht
 * nachgezogen – siehe `strich`.
 */
function Zeichen({
  groesse = 22,
  children,
  ...rest
}: ZeichenEigenschaften & { children: React.ReactNode }) {
  return (
    <svg
      width={groesse}
      height={groesse}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strich(groesse)}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      focusable="false"
      {...rest}
    >
      {children}
    </svg>
  );
}

/**
 * Wie dick der Strich bei dieser Größe sein muss.
 *
 * Rein optisch bestimmt, nicht gerechnet: Ein Zeichen bei 14 Punkten braucht
 * anteilig mehr Strich als eines bei 34, sonst verschwindet es im Dunkeln.
 * Die Kurve ist flach – es geht um eine Spur, nicht um zwei Sorten Zeichen.
 */
function strich(groesse: number): number {
  if (groesse <= 14) return 1.55;
  if (groesse <= 18) return 1.4;
  if (groesse <= 26) return 1.25;
  return 1.1;
}

/* ============================================================ RICHTUNGEN === */
/*
 * Die vier großen Bedeutungen der Charakterseite. Sie stehen im Referenzbild
 * nicht als Medaillon, sondern als sehr feine Marke am Rand – deshalb sind sie
 * einfacher gebaut als die Medaillonzeichen weiter unten.
 */

/** OBEN – Wissen, Geschichte, Hintergrund. Ein aufgehendes Gestirn. */
export function ZWissen(p: ZeichenEigenschaften) {
  return (
    <Zeichen {...p}>
      <path d="M12 3v3.2M12 17.8V21M3 12h3.2M17.8 12H21" />
      <path d="M5.6 5.6l2.3 2.3M16.1 16.1l2.3 2.3M18.4 5.6l-2.3 2.3M7.9 16.1l-2.3 2.3" />
      <circle cx="12" cy="12" r="3.4" />
    </Zeichen>
  );
}

/** LINKS – Herkunft, Ort, Welt. Ein Horizont mit Wurzel. */
export function ZHerkunft(p: ZeichenEigenschaften) {
  return (
    <Zeichen {...p}>
      <circle cx="12" cy="12" r="8.4" />
      <path d="M3.6 12h16.8" />
      <path d="M12 3.6c2.4 2.6 3.6 5.4 3.6 8.4s-1.2 5.8-3.6 8.4c-2.4-2.6-3.6-5.4-3.6-8.4s1.2-5.8 3.6-8.4z" />
    </Zeichen>
  );
}

/** RECHTS – Beziehungen. Zwei Kreise, die einander halten. */
export function ZBeziehungen(p: ZeichenEigenschaften) {
  return (
    <Zeichen {...p}>
      <circle cx="9" cy="12" r="4.6" />
      <circle cx="15" cy="12" r="4.6" />
    </Zeichen>
  );
}

/** UNTEN – Notizen, Erinnerungen, Fundstücke. Ein eingelegtes Blatt. */
export function ZNotizen(p: ZeichenEigenschaften) {
  return (
    <Zeichen {...p}>
      <path d="M5.5 3.8h10.2l2.8 2.8v13.6H5.5z" />
      <path d="M15.7 3.8v2.8h2.8" />
      <path d="M8.4 11.2h7.2M8.4 14.4h7.2M8.4 17.6h4.4" />
    </Zeichen>
  );
}

/* ================================================== WISSEN · MEDAILLONS === */

/** Biografie – ein aufgeschlagener Band. */
export function ZBiografie(p: ZeichenEigenschaften) {
  return (
    <Zeichen {...p}>
      <path d="M3.6 5.4h5.6c1.5 0 2.8.9 2.8 2v11c0-1.1-1.3-2-2.8-2H3.6z" />
      <path d="M20.4 5.4h-5.6c-1.5 0-2.8.9-2.8 2v11c0-1.1 1.3-2 2.8-2h5.6z" />
      <path d="M12 7.4v11" />
    </Zeichen>
  );
}

/** Wissen & Fertigkeiten – ein achtstrahliger Stern. */
export function ZFertigkeiten(p: ZeichenEigenschaften) {
  return (
    <Zeichen {...p}>
      <path d="M12 2.6l1.9 6.1 6.1 1.9-6.1 1.9L12 18.6l-1.9-6.1L4 10.6l6.1-1.9z" />
      <path d="M18.6 16.4l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8z" />
    </Zeichen>
  );
}

/** Chronik – eine Feder über einer Linie. */
export function ZChronik(p: ZeichenEigenschaften) {
  return (
    <Zeichen {...p}>
      <path d="M19.6 4.4c-5.4.4-9.2 2.6-11.2 6.6-.9 1.8-1.3 3.6-1.3 5.4 3.4-4.6 7-7.2 10.8-7.8-2.9 1.6-5.3 3.9-7.2 6.9" />
      <path d="M6.4 19.6c.4-1.4.9-2.7 1.5-3.8" />
      <path d="M4.4 20.4h6.4" />
    </Zeichen>
  );
}

/** Geheimnisse – ein Siegel mit Schlüsselloch. */
export function ZGeheimnisse(p: ZeichenEigenschaften) {
  return (
    <Zeichen {...p}>
      <path d="M12 2.8l8 3.4v6c0 4.6-3.2 8-8 9.4-4.8-1.4-8-4.8-8-9.4v-6z" />
      <circle cx="12" cy="10.8" r="2" />
      <path d="M12 12.8v3.4" />
    </Zeichen>
  );
}

/* ============================================= BEZIEHUNGEN · MEDAILLONS === */

/** Familie – drei Gestalten, eine kleiner. */
export function ZFamilie(p: ZeichenEigenschaften) {
  return (
    <Zeichen {...p}>
      <circle cx="7.6" cy="7.8" r="2.6" />
      <circle cx="16.4" cy="7.8" r="2.6" />
      <circle cx="12" cy="14.6" r="2" />
      <path d="M3 19.4c0-2.4 2.1-4 4.6-4 .9 0 1.7.2 2.4.6" />
      <path d="M21 19.4c0-2.4-2.1-4-4.6-4-.9 0-1.7.2-2.4.6" />
      <path d="M8.8 21.2c0-1.8 1.4-3 3.2-3s3.2 1.2 3.2 3" />
    </Zeichen>
  );
}

/** Freunde & Verbündete – ein Herz aus zwei Bögen, nicht geschlossen. */
export function ZFreunde(p: ZeichenEigenschaften) {
  return (
    <Zeichen {...p}>
      <path d="M12 20.4S3.8 15.2 3.8 9.4A4.6 4.6 0 0 1 12 6.6a4.6 4.6 0 0 1 8.2 2.8c0 5.8-8.2 11-8.2 11z" />
      <path d="M12 6.6v13.8" />
    </Zeichen>
  );
}

/** Rivalen & Feinde – zwei gekreuzte Klingen. */
export function ZRivalen(p: ZeichenEigenschaften) {
  return (
    <Zeichen {...p}>
      <path d="M4.4 3.6l11.4 13.6M19.6 3.6L8.2 17.2" />
      <path d="M14.2 18.4l3.2-1.4 1.4-3.2M9.8 18.4l-3.2-1.4-1.4-3.2" />
    </Zeichen>
  );
}

/** Organisationen – ein Wappenring mit vier Bindungen. */
export function ZOrganisation(p: ZeichenEigenschaften) {
  return (
    <Zeichen {...p}>
      <circle cx="12" cy="12" r="4.2" />
      <circle cx="12" cy="3.6" r="1.8" />
      <circle cx="12" cy="20.4" r="1.8" />
      <circle cx="3.6" cy="12" r="1.8" />
      <circle cx="20.4" cy="12" r="1.8" />
      <path d="M12 5.4v2.4M12 16.2v2.4M5.4 12h2.4M16.2 12h2.4" />
    </Zeichen>
  );
}

/** Beziehungsnetz – Knoten und Fäden. */
export function ZGeflecht(p: ZeichenEigenschaften) {
  return (
    <Zeichen {...p}>
      <circle cx="12" cy="12" r="2.2" />
      <circle cx="4.6" cy="6" r="1.8" />
      <circle cx="19.4" cy="6" r="1.8" />
      <circle cx="4.6" cy="18" r="1.8" />
      <circle cx="19.4" cy="18" r="1.8" />
      <path d="M6.1 7.2l4.4 3.4M17.9 7.2l-4.4 3.4M6.1 16.8l4.4-3.4M17.9 16.8l-4.4-3.4" />
    </Zeichen>
  );
}

/* ================================================ HERKUNFT · MEDAILLONS === */

/** Herkunft – ein Stammzeichen, das sich nach unten verzweigt. */
export function ZStamm(p: ZeichenEigenschaften) {
  return (
    <Zeichen {...p}>
      <circle cx="12" cy="4.4" r="2" />
      <path d="M12 6.4v4.4" />
      <path d="M12 10.8c0 2.4-2.4 3.2-4 4.4-1.2.9-1.8 2-1.8 3.4" />
      <path d="M12 10.8c0 2.4 2.4 3.2 4 4.4 1.2.9 1.8 2 1.8 3.4" />
      <path d="M12 10.8v9" />
    </Zeichen>
  );
}

/** Heimat – ein Dach über einem Feuer. */
export function ZHeimat(p: ZeichenEigenschaften) {
  return (
    <Zeichen {...p}>
      <path d="M3.4 11.2L12 4l8.6 7.2" />
      <path d="M5.6 12.8v7.4h12.8v-7.4" />
      <path d="M12 20.2v-3.6c0-1 .8-1.8 1.8-1.8" />
    </Zeichen>
  );
}

/** Welt – ein Gitter aus Meridianen. */
export function ZWelt(p: ZeichenEigenschaften) {
  return (
    <Zeichen {...p}>
      <circle cx="12" cy="12" r="8.6" />
      <path d="M3.4 12h17.2" />
      <path d="M12 3.4c2.3 2.5 3.5 5.4 3.5 8.6s-1.2 6.1-3.5 8.6c-2.3-2.5-3.5-5.4-3.5-8.6s1.2-6.1 3.5-8.6z" />
      <path d="M5.2 7.2c1.9 1.1 4.2 1.7 6.8 1.7s4.9-.6 6.8-1.7" />
      <path d="M5.2 16.8c1.9-1.1 4.2-1.7 6.8-1.7s4.9.6 6.8 1.7" />
    </Zeichen>
  );
}

/** Aktueller Standort – eine Nadel mit Ring. */
export function ZStandort(p: ZeichenEigenschaften) {
  return (
    <Zeichen {...p}>
      <path d="M12 21.2c3.6-4.4 5.4-7.7 5.4-9.9A5.4 5.4 0 1 0 6.6 11.3c0 2.2 1.8 5.5 5.4 9.9z" />
      <circle cx="12" cy="11.2" r="2.1" />
    </Zeichen>
  );
}

/** Zeit & Kontext – eine Spirale, kein Zifferblatt. */
export function ZZeit(p: ZeichenEigenschaften) {
  return (
    <Zeichen {...p}>
      <path d="M12 12c0-1.3 1.1-2.4 2.4-2.4S16.8 10.7 16.8 12s-1.1 2.4-2.4 2.4c-2.2 0-4-1.8-4-4s1.8-4 4-4c3 0 5.4 2.4 5.4 5.4s-2.4 5.4-5.4 5.4c-3.9 0-7-3.1-7-7" />
      <path d="M4.4 9.8l.4-2.6 2.4 1" />
    </Zeichen>
  );
}

/* ================================================= NOTIZEN · MEDAILLONS === */

/** Persönliche Notizen – ein Bogen mit Falz. */
export function ZBogen(p: ZeichenEigenschaften) {
  return (
    <Zeichen {...p}>
      <path d="M5.6 3.8h12.8v16.4H5.6z" />
      <path d="M8.6 8.2h6.8M8.6 11.6h6.8M8.6 15h4.2" />
    </Zeichen>
  );
}

/** Erinnerungen – eine Welle unter einem Bogen. */
export function ZErinnerung(p: ZeichenEigenschaften) {
  return (
    <Zeichen {...p}>
      <path d="M4 15.6c1.6-6.2 4.3-9.3 8-9.3s6.4 3.1 8 9.3" />
      <path d="M4 19.2c1.3-.9 2.7-1.3 4-1.3s2.7.4 4 1.3c1.3.9 2.7 1.3 4 1.3s2.7-.4 4-1.3" />
      <circle cx="12" cy="3.6" r="1.4" />
    </Zeichen>
  );
}

/** Fundstücke – ein Anhänger an einer Kette. */
export function ZFundstueck(p: ZeichenEigenschaften) {
  return (
    <Zeichen {...p}>
      <path d="M6.4 3.6l5.6 5.2 5.6-5.2" />
      <path d="M12 8.8l4.6 4.4-4.6 7-4.6-7z" />
      <path d="M7.4 13.2h9.2" />
    </Zeichen>
  );
}

/** Sammlungen – gestapelte Bögen. */
export function ZSammlung(p: ZeichenEigenschaften) {
  return (
    <Zeichen {...p}>
      <path d="M12 2.8l8.4 4.2-8.4 4.2-8.4-4.2z" />
      <path d="M3.6 12L12 16.2 20.4 12" />
      <path d="M3.6 16.6L12 20.8l8.4-4.2" />
    </Zeichen>
  );
}

/* ==================================================== LINIEN UND ZIERAT === */

/**
 * Die goldene Trennlinie mit Raute – der Teiler aus dem Referenzbild.
 *
 * Sie liegt dort unter der Überschrift links oben und trennt Kopf von Text.
 * Kein `<hr>`: Eine Linie, die in der Mitte eine Raute trägt und zu beiden
 * Seiten ausläuft, ist keine Regel, sondern ein Zeichen.
 */
export function Goldteiler({
  breite = 120,
  className,
}: {
  breite?: number;
  className?: string;
}) {
  return (
    <svg
      width={breite}
      height="9"
      viewBox={`0 0 ${breite} 9`}
      fill="none"
      className={className}
      aria-hidden
      focusable="false"
    >
      <defs>
        {/*
          Der Verlauf ist der ganze Punkt. Eine Linie mit harten Enden sieht
          abgeschnitten aus; eine, die zu den Rändern hin verschwindet, sieht
          aus, als läge sie im Licht.
        */}
        <linearGradient id={`dc-teiler-${breite}`} x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stopColor="currentColor" stopOpacity="0" />
          <stop offset="0.28" stopColor="currentColor" stopOpacity="0.75" />
          <stop offset="0.72" stopColor="currentColor" stopOpacity="0.75" />
          <stop offset="1" stopColor="currentColor" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`M0 4.5h${breite}`} stroke={`url(#dc-teiler-${breite})`} strokeWidth="1" />
      <path
        d={`M${breite / 2 - 4.5} 4.5l4.5-3.4 4.5 3.4-4.5 3.4z`}
        fill="currentColor"
        fillOpacity="0.8"
      />
    </svg>
  );
}

/**
 * Die Ecke eines Rahmens – vier davon ergeben den Rahmen aus dem Referenzbild.
 *
 * Bewusst nur die Ecke und keine vier Kanten: Ein voller Rahmen um ein Porträt
 * macht daraus eine Karte in einer Anwendung. Vier Ecken, die andeuten, wo ein
 * Rahmen wäre, machen daraus ein eingelegtes Bildnis.
 */
export function Rahmenecke({
  groesse = 22,
  className,
}: {
  groesse?: number;
  className?: string;
}) {
  return (
    <svg
      width={groesse}
      height={groesse}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1"
      strokeLinecap="round"
      className={className}
      aria-hidden
      focusable="false"
    >
      <path d="M1 8V1h7" />
      <path d="M4.5 1h-.2M1 4.5v-.2" />
      <circle cx="4.4" cy="4.4" r="1.1" />
    </svg>
  );
}

/**
 * Der Wegepunkt – der feine goldene Punkt, der eine Richtung andeutet.
 *
 * Drei Ringe, nach außen schwächer. Er markiert im Referenzbild die Stellen,
 * an denen das Porträt mit seiner Umgebung verbunden ist.
 */
export function Wegepunkt({ groesse = 14, className }: { groesse?: number; className?: string }) {
  return (
    <svg
      width={groesse}
      height={groesse}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      aria-hidden
      focusable="false"
    >
      <circle cx="12" cy="12" r="2.6" fill="currentColor" fillOpacity="0.9" />
      <circle cx="12" cy="12" r="6" stroke="currentColor" strokeOpacity="0.4" strokeWidth="1" />
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity="0.15" strokeWidth="1" />
    </svg>
  );
}

/* ============================================================ ZUORDNUNG === */

/**
 * Die Zeichen unter ihren Kennungen.
 *
 * **Absichtlich eine Tabelle, und absichtlich hier.** Anderswo im Raumwerk ist
 * eine Tabelle der Fehler – dort bestimmt sie Bedeutung. Hier bestimmt sie
 * nur, wie eine bereits feststehende Bedeutung *aussieht*, und das ist genau
 * die Aufgabe der vierten Verantwortlichkeit: Darstellung.
 *
 * Eine Kennung ohne Zeichen ist zulässig und ergibt kein Zeichen – kein
 * Ersatzsymbol. Ein falsches Zeichen ist schlimmer als keines.
 */
export const ZEICHEN = {
  wissen: ZWissen,
  herkunft: ZHerkunft,
  beziehungen: ZBeziehungen,
  notizen: ZNotizen,

  biografie: ZBiografie,
  fertigkeiten: ZFertigkeiten,
  chronik: ZChronik,
  geheimnisse: ZGeheimnisse,

  familie: ZFamilie,
  freunde: ZFreunde,
  rivalen: ZRivalen,
  organisation: ZOrganisation,
  geflecht: ZGeflecht,

  stamm: ZStamm,
  heimat: ZHeimat,
  welt: ZWelt,
  standort: ZStandort,
  zeit: ZZeit,

  bogen: ZBogen,
  erinnerung: ZErinnerung,
  fundstueck: ZFundstueck,
  sammlung: ZSammlung,
} as const;

export type Zeichenkennung = keyof typeof ZEICHEN;

/** Ein Zeichen zu seiner Kennung – oder nichts, wenn es keines gibt. */
export function zeichenFuer(k: string | undefined) {
  if (!k) return undefined;
  return (ZEICHEN as Record<string, (p: ZeichenEigenschaften) => JSX.Element>)[k];
}
