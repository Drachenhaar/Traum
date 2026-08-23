/**
 * Die Setzerei – die Bauteile einer gesetzten Buchseite.
 *
 * Was hier steht, ist bewusst schmal: ein Satzspiegel, ein Kolumnentitel, eine
 * Seitenzahl, ein Fließtext, eine Angabe, ein Zitat, ein Trenner, eine
 * Randnotiz, eine Bildunterschrift, eine Handnotiz. Zehn Dinge. Wer eine
 * Buchseite baut, soll aus diesen zehn wählen und nichts Elftes erfinden –
 * genau daraus entsteht der Eindruck, dass jede Seite von derselben Hand
 * gesetzt wurde.
 *
 * ---
 *
 * **Kein Bauteil bringt einen Kasten mit.** Keine Karte, kein Rahmen, kein
 * Hintergrund, kein Schatten. Der Satz trennt durch Weißraum, Haarlinien und
 * Schriftgrade. Wo hier doch einmal eine Linie steht, ist sie ein Haarstrich
 * und trägt eine Bedeutung – nicht eine Umrandung, die etwas zusammenhält,
 * was der Abstand schon zusammenhält.
 *
 * Die Maße kommen aus `lib/setzerei/mass.ts`, die Klassen aus `index.css`.
 */

import type { ReactNode } from 'react';
import { Goldteiler } from '../../lib/zeichen/zeichen';
import { cx } from '../../lib/utils';

/* ======================================================== Der Satzspiegel == */

/**
 * Die Fläche, auf der gesetzt wird.
 *
 * `spalte` begrenzt zusätzlich die Zeilenlänge. Sie ist voreingestellt an,
 * weil eine unbegrenzte Zeile der häufigste Satzfehler im Netz ist – wer sie
 * abschaltet, tut es für ein Bild oder eine Tabelle und weiß warum.
 */
export function Satzspiegel({
  children,
  spalte = true,
  className,
}: {
  children: ReactNode;
  spalte?: boolean;
  className?: string;
}) {
  return (
    <div className={cx('satz-spiegel relative', className)}>
      <div className={spalte ? 'satz-spalte' : undefined}>{children}</div>
    </div>
  );
}

/* ================================================ Kolumnentitel, Seitenzahl == */

/**
 * Der Kolumnentitel.
 *
 * Im aufgeschlagenen Buch tragen linke und rechte Seite verschiedene Angaben:
 * links das Werk oder das Kapitel, rechts das Stichwort. Auf einem Telefon
 * gibt es keine Doppelseite – deshalb stehen beide Angaben nebeneinander auf
 * einer Zeile, links und rechts ausgerichtet. Es ist derselbe Satz, nur
 * gefaltet.
 *
 * Er sagt, **wo man ist**, nicht wohin man kann. Wer hier Knöpfe hinstellt,
 * hat eine Navigationsleiste gebaut und den Kolumnentitel verloren.
 */
export function Kolumnentitel({
  links,
  rechts,
  className,
}: {
  links: string;
  rechts?: string;
  className?: string;
}) {
  return (
    <div
      className={cx('satz-kolumne flex items-baseline justify-between gap-4', className)}
      aria-hidden
    >
      <span className="min-w-0 truncate">{links}</span>
      {rechts && <span className="min-w-0 truncate text-right">{rechts}</span>}
    </div>
  );
}

/**
 * Die Seitenzahl.
 *
 * Sie gehört zum Buch und nicht zur Bedienung: keine Pfeile, keine „Seite 3
 * von 12", kein Punktereigen. Nur die Zahl, klein, mit den beiden Strichen,
 * die Bücher seit Jahrhunderten dafür benutzen.
 */
export function Seitenzahl({ zahl, className }: { zahl: number | string; className?: string }) {
  return (
    <p className={cx('satz-seitenzahl text-center', className)} aria-hidden>
      — {zahl} —
    </p>
  );
}

/* ==================================================== Überschriften, Trenner == */

/**
 * Ein Abschnittstitel – gesperrte Kapitälchen zwischen zwei Haarlinien.
 *
 * Die Linien laufen nach außen aus, statt an einer harten Kante zu enden. Eine
 * Linie, die aufhört, ist ein Rahmenteil; eine, die verklingt, ist ein
 * Satzzeichen.
 */
export function Abschnitt({
  children,
  mittig = true,
  className,
}: {
  children: ReactNode;
  mittig?: boolean;
  className?: string;
}) {
  const strich = (
    <span
      aria-hidden
      className="h-px min-w-[1.5rem] flex-1 bg-gradient-to-r from-transparent via-current to-transparent opacity-30"
    />
  );
  return (
    <div
      className={cx('flex items-center gap-3 text-gold', className)}
      style={{ marginTop: 'calc(var(--satz-raster) * 1.5)', marginBottom: 'var(--satz-raster)' }}
    >
      {mittig && strich}
      {/*
        `min-w-0` und Umbruch – nicht `shrink-0`.

        Mit `shrink-0` lief „CHARAKTERISTISCHER BUCHAUFTRITT" auf dem Telefon
        ueber die rechte Kante hinaus und wurde zu „CHARAKTERISTISCHER BUCHA".
        Ein Abschnittstitel, der aus der Seite laeuft, ist der sichtbarste
        Satzfehler ueberhaupt – und er entsteht immer gleich: Ein Element darf
        nicht schrumpfen, und niemand hat nachgesehen, ob es passt.

        Gesperrte Versalien sind hier besonders anfaellig, weil die Sperrung
        jedes Wort verlaengert. Also darf der Titel umbrechen, und die Zeilen
        stehen mittig untereinander.
      */}
      <h2
        className="satz-kapitael min-w-0 text-center"
        style={{
          fontSize: 'var(--satz-abschnitt)',
          lineHeight: 'var(--satz-abschnitt-zeile)',
          letterSpacing: 'var(--satz-abschnitt-sperre)',
          textWrap: 'balance',
        }}
      >
        {children}
      </h2>
      {strich}
    </div>
  );
}

/** Eine Rubrik – die kleinste Überschrift, ohne Linien. */
export function Rubrik({ children, className }: { children: ReactNode; className?: string }) {
  return <h3 className={cx('satz-kapitael', className)}>{children}</h3>;
}

/**
 * Der Trenner zwischen zwei Abschnitten.
 *
 * „Ein einzelnes kleines Ornament zwischen zwei Abschnitten ist stärker als
 * ein vollständig verzierter Rahmen." Deshalb gibt es hier genau eine Form
 * und keine Auswahl – wer wählen kann, wählt irgendwann zu oft.
 */
export function Trenner({ breite = 128, className }: { breite?: number; className?: string }) {
  return (
    <div
      className={cx('flex justify-center text-gold opacity-45', className)}
      style={{ marginTop: 'var(--satz-raster)', marginBottom: 'var(--satz-raster)' }}
      aria-hidden
    >
      <Goldteiler breite={breite} />
    </div>
  );
}

/** Eine bloße Haarlinie, wo nicht einmal ein Ornament nötig ist. */
export function Haarlinie({ className }: { className?: string }) {
  return (
    <div
      className={cx('h-px bg-current opacity-[0.15]', className)}
      style={{ marginTop: 'var(--satz-raster)', marginBottom: 'var(--satz-raster)' }}
      aria-hidden
    />
  );
}

/* ============================================================ Der Fließtext == */

/**
 * Ein Absatz.
 *
 * `initial` setzt die Initiale – aber nur dort, wo ein Abschnitt wirklich
 * anfängt. Der Fließtext trennt Absätze durch Erstzeileneinzug und nicht durch
 * Abstand; das erledigt die Regel `.satz-absatz + .satz-absatz`, weshalb hier
 * keine Ränder gesetzt werden.
 */
export function Absatz({
  children,
  initial = false,
  className,
}: {
  children: ReactNode;
  initial?: boolean;
  className?: string;
}) {
  return (
    <p className={cx('satz-fliess satz-absatz', initial && 'satz-initial', className)}>
      {children}
    </p>
  );
}

/**
 * Ein ganzer Text aus einem Feld – an Leerzeilen in Absätze zerlegt.
 *
 * Die Initiale steht am ersten Absatz und nur dort. Ein Text, dessen jeder
 * Absatz mit einer Initiale beginnt, sieht nicht gesetzt aus, sondern verziert.
 */
export function Fliesstext({
  text,
  initial = false,
  className,
}: {
  text: string;
  initial?: boolean;
  className?: string;
}) {
  const absaetze = text
    .split(/\n\s*\n/)
    .map((a) => a.trim())
    .filter(Boolean);
  if (!absaetze.length) return null;
  return (
    <div className={className}>
      {absaetze.map((a, i) => (
        <Absatz key={i} initial={initial && i === 0}>
          {a}
        </Absatz>
      ))}
    </div>
  );
}

/* ============================================================== Die Angaben == */

/**
 * ALTER · 31 Jahre – die Zeile eines Nachschlagewerks.
 *
 * Die Bezeichnung steht in gesperrten Kapitälchen, der Wert in gewöhnlicher
 * Leseschrift daneben. Beide sitzen auf **derselben Grundlinie**: Die Rubrik
 * ist kleiner, würde also von selbst höher sitzen – `items-baseline` holt sie
 * herunter. Ohne das steht jede zweite Zeile leicht verrutscht, und die Seite
 * wirkt unruhig, ohne dass man sagen könnte warum.
 *
 * Bei sehr schmalen Spalten bricht der Wert unter die Bezeichnung, statt die
 * Spalte zu sprengen.
 */
export function Angabe({
  name,
  children,
  className,
}: {
  name: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cx('flex items-baseline gap-x-4 gap-y-0.5', className)}>
      <dt className="satz-kapitael w-[7.5rem] shrink-0 text-right">{name}</dt>
      <dd className="satz-fliess min-w-0 flex-1">{children}</dd>
    </div>
  );
}

/** Mehrere Angaben untereinander, auf einem gemeinsamen Raster. */
export function Angaben({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <dl
      className={cx('space-y-1', className)}
      style={{ marginTop: 'var(--satz-raster)', marginBottom: 'var(--satz-raster)' }}
    >
      {children}
    </dl>
  );
}

/* ================================================================= Das Zitat == */

/**
 * Ein Zitat – ein stiller Moment auf der Seite.
 *
 * Es bekommt deutlich mehr Raum als jede Information, und diesen Raum macht
 * der Abstand, nicht ein Rahmen. Die Herkunftszeile darunter ist sehr klein
 * und **nicht** kursiv: Wäre sie es auch, verschwämme sie mit dem Zitat.
 */
export function Zitat({
  children,
  von,
  className,
}: {
  children: ReactNode;
  von?: string;
  className?: string;
}) {
  return (
    <figure
      className={cx('text-center', className)}
      style={{ marginTop: 'calc(var(--satz-raster) * 1.5)', marginBottom: 'calc(var(--satz-raster) * 1.5)' }}
    >
      {/*
        Keine eigene Farbe – das Zitat erbt sie.

        Hier stand `text-paper-200`, also *helle Schrift auf dunklem Grund*.
        Auf der Charakterseite stimmt das, und genau deshalb waere es
        durchgerutscht: Sie ist immer dunkel. Auf einer hellen Buchseite waere
        dasselbe Zitat unsichtbar gewesen – ein Bauteil der Setzerei muss auf
        beiden Baenden funktionieren, sonst ist es keins.
      */}
      <blockquote className="satz-zitat mx-auto max-w-[26ch]">„{children}“</blockquote>
      {von && (
        <figcaption
          className="satz-bildunter mt-3 not-italic text-gold opacity-80"
          style={{ letterSpacing: '0.16em', textTransform: 'uppercase' }}
        >
          — {von}
        </figcaption>
      )}
    </figure>
  );
}

/* ====================================================== Bild und Randnotiz == */

/**
 * Eine Bildunterschrift, wie sie in einem Tafelteil steht.
 *
 * Die Nummer gehört dazu: „Abb. 03" ist der Unterschied zwischen einer
 * Bildbeschriftung und einer editorialen Angabe. Der Zusatz darunter – wann,
 * woher, von wem – steht kleiner und ruhiger.
 */
export function Bildunterschrift({
  nummer,
  children,
  zusatz,
  className,
}: {
  nummer?: number | string;
  children: ReactNode;
  zusatz?: string;
  className?: string;
}) {
  return (
    <figcaption className={cx('satz-bildunter mt-2.5', className)}>
      <span className="text-ink-muted">
        {nummer !== undefined && (
          <span className="text-gold" style={{ letterSpacing: '0.1em' }}>
            Abb. {typeof nummer === 'number' ? String(nummer).padStart(2, '0') : nummer}
            {' — '}
          </span>
        )}
        {children}
      </span>
      {zusatz && <span className="mt-1 block italic opacity-65">{zusatz}</span>}
    </figcaption>
  );
}

/**
 * Eine Randnotiz.
 *
 * Auf dem Telefon eingefaltet in den Satz, ab dem großen Bildschirm draußen im
 * Außensteg – die Regel dazu steht in `index.css` und ist dort begründet.
 * Sie soll wie eine editoriale Ergänzung wirken und nicht wie ein Hinweisfeld:
 * kein Symbol, keine Farbe, keine Umrandung. Nur kleinere Schrift und ein
 * Strich.
 */
export function Randnotiz({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <aside
      className={cx('satz-rand text-ink-muted', className)}
      style={{ marginTop: 'calc(var(--satz-raster) * 0.5)', marginBottom: 'var(--satz-raster)' }}
    >
      {children}
    </aside>
  );
}

/**
 * Was später von Hand hineingeschrieben wurde.
 *
 * Sparsam – ein, zwei auf einer Seite. Sie sind der Unterschied zwischen einem
 * gedruckten Band und einem, mit dem jemand gearbeitet hat.
 */
export function Handnotiz({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <p
      className={cx('satz-hand text-gold', className)}
      style={{ marginTop: 'calc(var(--satz-raster) * 0.5)' }}
    >
      {children}
    </p>
  );
}

/* ==================================================================== Stille == */

/**
 * Was dasteht, wenn nichts dasteht.
 *
 * Keine leere Fläche mit „Keine Daten", sondern eine Frage an den Verfasser,
 * ruhig gesetzt. Sie ist kursiv und leise, damit man sie als das erkennt, was
 * sie ist: eine Stelle im Buch, die noch auf jemanden wartet.
 */
export function Still({ was, className }: { was: string; className?: string }) {
  return (
    <p
      className={cx('satz-fliess italic text-ink-faint', className)}
      style={{ marginTop: 'var(--satz-raster)' }}
    >
      {was}
    </p>
  );
}
