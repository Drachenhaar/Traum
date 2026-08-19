/**
 * Der Körper des aufgeschlagenen Buches.
 *
 * Bis hierher war das offene Buch ein Rechteck mit Schlagschatten. Man las
 * darauf, aber man war nicht *darin*. Der Unterschied sind drei Dinge, die
 * jedes echte Buch hat und die zusammen ein paar Dutzend Zeilen kosten:
 *
 *   Der Falz    – die Rinne, in der die Seite verschwindet. Ohne ihn liegt
 *                 kein Bogen, sondern ein Blatt.
 *   Der Block   – die Kanten der anderen Seiten, sichtbar am Rand. Sie sagen,
 *                 wie viel Buch noch da ist.
 *   Die Dicke   – der Schatten unter dem Block. Ein Buch liegt *auf* etwas.
 *
 * ---
 *
 * **Warum keine Texturen.**
 *
 * Der Auftrag sagt es ausdrücklich: erst der Körper, dann das Material. Alles
 * hier ist Geometrie und Verlauf – kein Leder, kein Pergament, kein Bild. Wenn
 * das Buch ohne Material nicht körperlich wirkt, wird es mit Material nur
 * zugedeckt. Und wenn es *mit* Geometrie schon wirkt, weiß man beim nächsten
 * Schritt genau, was das Material noch beitragen muss.
 */

import type { ReactNode } from 'react';
import { cx } from '../../lib/utils';

/**
 * Wie viele Seitenkanten am Rand zu sehen sind.
 *
 * Nicht die echte Seitenzahl – ein Buch mit zweitausend Seiten bekäme
 * zweitausend Striche und wäre ein grauer Balken. Gezeichnet wird ein
 * *Eindruck* von Dicke; die Wahrheit über den Umfang steht auf dem Einband,
 * wo sie hingehört.
 */
const KANTEN = 7;

export function Buchkoerper({
  children,
  /** 0…1 – wie dick dieses Buch wirkt. Kommt aus der Seitenzahl. */
  dicke = 0.5,
  className,
}: {
  children: ReactNode;
  dicke?: number;
  className?: string;
}) {
  const block = 3 + dicke * 9;

  return (
    <div className={cx('dc-buchkoerper relative flex min-h-0 flex-1', className)}>
      {/*
        Die Seitenkanten rechts – der Rest des Buches.

        Sie wachsen **nach innen**, und das ist die zweite Fassung dieser
        Stelle. Die erste ließ sie nach außen ragen, wie ein Buch, das auf
        einem Tisch liegt und Platz um sich hat. Auf einem Telefon füllt das
        Buch die ganze Breite: Es gibt kein Außen. Die Kanten lagen also
        jenseits des Randes und wurden weggeschnitten – auf dem Bildschirm war
        von der Dicke des Buches nichts zu sehen.

        Jetzt liegt die erste Kante an der Papierkante und jede weitere ein
        Stück weiter innen, schmaler und dunkler. Man sieht in den Stapel
        hinein statt auf ihn – dasselbe Zeichen, an den kleinen Bildschirm
        angepasst.
      */}
      <span aria-hidden className="pointer-events-none absolute inset-y-0 right-0 z-[25] block">
        {Array.from({ length: KANTEN }).map((_, i) => {
          const t = i / (KANTEN - 1);
          return (
            <span
              key={i}
              className="absolute block rounded-l-[1px]"
              style={{
                right: t * block,
                width: 1.5,
                top: `${3 + t * 4}px`,
                bottom: `${3 + t * 4}px`,
                background: `rgba(196, 178, 142, ${0.62 - t * 0.38})`,
                boxShadow: `0 0 1px rgba(90,70,44,${0.32 - t * 0.18})`,
              }}
            />
          );
        })}
      </span>

      {/*
        Der Falz.

        Eine schmale Rinne am linken Rand, in der das Papier abtaucht. Das ist
        der stärkste einzelne Hinweis darauf, dass hier ein Bogen liegt und
        kein Zettel – und er kostet einen Farbverlauf.
      */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-y-0 left-0 z-20 w-[26px]"
        style={{
          background:
            'linear-gradient(to right, rgba(74,56,32,calc(0.30 * var(--dc-falz,1))) 0%,' +
            ' rgba(74,56,32,calc(0.10 * var(--dc-falz,1))) 45%, transparent 100%)',
        }}
      />

      {/* Und die Gegenkante rechts – wo das Papier auf den Block trifft. */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-y-0 right-0 z-20 w-[14px]"
        style={{
          background:
            'linear-gradient(to left, rgba(74,56,32,calc(0.16 * var(--dc-falz,1))) 0%, transparent 100%)',
        }}
      />

      {children}
    </div>
  );
}

/**
 * Das Blatt, das dem Finger folgt.
 *
 * **Keine Papierengine.** Was hier passiert, ist eine Drehung um den Falz,
 * ein wandernder Lichtstreifen und ein Schatten – drei Größen, die von außen
 * als CSS-Variablen kommen:
 *
 *   --dc-blatt        0…1, wie weit gezogen wurde
 *   --dc-blatt-winkel Grad, aus dem Weg gerechnet
 *   --dc-blatt-woelb  0…1, die Krümmungsillusion
 *   --dc-blatt-schatt 0…1, wie tief der Schatten fällt
 *
 * Das Blatt trägt **keinen Inhalt**. Es ist die Rückseite: das, was man sieht,
 * wenn eine Seite auf der Kante steht und sich weiterdreht.
 *
 * ---
 *
 * **Die Lücke in der Mitte jeder Drehung.**
 *
 * Zuerst gab es dieses Blatt nur beim Zurückblättern. Vorwärts drehte sich die
 * lebende Seite weg – und war ab neunzig Grad schlicht verschwunden, weil ihre
 * Rückseite ausgeblendet ist. Die zweite Hälfte jeder Bewegung sah man auf
 * leeres Papier, ohne Kante, ohne Wölbung, ohne irgendetwas, das sich noch
 * bewegt hätte. In Zahlen war das nicht zu sehen; im Bild bei Station vier von
 * sechs war der Bildschirm einfach leer.
 *
 * Genau in dieser Hälfte soll man aber etwas *fühlen*. Ein Blatt, das
 * unterwegs unsichtbar wird, ist kein Blatt, sondern ein Übergang mit einer
 * Pause darin.
 *
 * Deshalb dreht sich jetzt in **beide** Richtungen ein Blatt mit: vorwärts
 * liegt es dicht unter der lebenden Seite und trägt denselben Winkel, sodass
 * es genau dann übernimmt, wenn die Seite ihre Rückseite zeigen würde.
 * Rückwärts fällt es von links darauf. In beiden Fällen ist über die ganze
 * Drehung hinweg ein Gegenstand in der Hand.
 *
 * Der Preis der Illusion bleibt: Der *Inhalt* der Zielseite erscheint erst,
 * wenn die Bewegung durch ist. Aber Papier mit einer Kante und einer Wölbung
 * ist etwas anderes als eine leere Fläche.
 */
export function Blatt({ richtung }: { richtung: 'vor' | 'zurueck' }) {
  const vor = richtung === 'vor';
  return (
    <div
      aria-hidden
      className="dc-blatt pointer-events-none absolute inset-0"
      data-richtung={richtung}
      style={{
        transformOrigin: 'left center',
        /*
         * Vorwärts denselben Winkel wie die lebende Seite – nur ohne deren
         * ausgeblendete Rückseite. Rückwärts der eigene Winkel des
         * hereinfallenden Blattes.
         */
        /*
         * Rückwärts kommt das Blatt von links hereingeschoben. Vorwärts
         * bleibt es liegen: Dort wandert die lebende Seite selbst weg und
         * gibt dieses Papier frei – es ist der Stapel darunter, nicht ein
         * fliegendes Blatt.
         */
        transform: vor
          ? 'none'
          : 'translateX(var(--dc-blatt-schub, 0px)) rotateY(var(--dc-blatt-winkel, 0deg))',
        transformStyle: 'preserve-3d',
        /*
         * Vorwärts sichtbar von beiden Seiten: Sonst verschwände dieses Blatt
         * an genau derselben Stelle wie die Seite, und die Lücke wäre wieder
         * da. Es liegt knapp unter der Seite (z-[9] gegen z-10), also sieht
         * man bis neunzig Grad die Seite und danach das Papier.
         */
        backfaceVisibility: vor ? 'visible' : 'hidden',
        zIndex: vor ? 9 : 30,
      }}
    >
      <span className="paper-sheet absolute inset-0 block rounded-[3px]" />
      <Woelbung />
    </div>
  );
}

/**
 * Die Wölbung.
 *
 * Ein heller Streifen, der mit der Drehung über das Blatt wandert, und ein
 * dunkler am Falz. Zusammen liest das Auge eine Biegung – dieselbe Art Trick
 * wie beim Richtungsbogen: Nicht die Sache selbst, sondern das, woran man sie
 * erkennt.
 *
 * **Warum eigenständig.** Anfangs steckte dieser Verlauf im leeren Blatt und
 * damit nur im Rückwärtsblättern. Vorwärts dreht sich aber die *lebende
 * Seite* weg, und die hatte gar keine Wölbung – sie klappte flach zur Seite
 * wie ein Brett. Im Bild bei 66 Grad war das sofort zu sehen und in keiner
 * Zahl: Alle Werte stimmten, es griff sie nur niemand ab.
 *
 * Jetzt legt sich derselbe Verlauf über beide Blätter. Er liegt über dem
 * Text, ist aber schwach genug, um ihn nicht zu verdecken – dass eine
 * halbgedrehte Seite schlechter lesbar wird, ist keine Störung, sondern
 * genau das, was ein Blatt in Bewegung tut.
 */
export function Woelbung() {
  return (
    <span
      aria-hidden
      className="dc-woelbung pointer-events-none absolute inset-0 block rounded-[3px]"
      style={{
        background:
          'linear-gradient(to right,' +
          ' rgba(88,66,38,calc(0.34 * var(--dc-blatt-woelb,0))) 0%,' +
          ' rgba(255,250,238,calc(0.30 * var(--dc-blatt-woelb,0))) 32%,' +
          ' rgba(120,96,62,calc(0.12 * var(--dc-blatt-woelb,0))) 78%,' +
          ' rgba(64,48,28,calc(0.22 * var(--dc-blatt-woelb,0))) 100%)',
      }}
    />
  );
}

/**
 * Der Schatten, den das gehobene Blatt auf die Seite darunter wirft.
 *
 * Getrennt vom Blatt, weil er *nicht* mitdreht – er liegt flach auf der
 * darunterliegenden Seite. Ein Schatten, der sich mit seinem Verursacher
 * dreht, ist der häufigste Fehler bei solchen Nachbauten und fällt sofort auf,
 * ohne dass man sagen könnte, warum.
 *
 * ---
 *
 * **Zwei Dinge waren hier zuerst falsch, und beide nur im Bild zu sehen.**
 *
 * Er lag am linken Rand. Ein Blatt, das sich um den Falz dreht, wirft seinen
 * Schatten aber nicht auf den Falz, sondern auf das Papier neben seiner
 * Kante – und der Falz liegt vollständig *unter* dem Blatt. Der Schatten war
 * gerechnet, gezeichnet und unsichtbar. Jetzt steht er bei
 * `--dc-blatt-kante`, dort, wo sich das Blatt vom Papier abhebt.
 *
 * Und er lag in der falschen Ebene. Vorwärts hebt sich die lebende Seite und
 * der Schatten fällt auf das Papier *darunter*; rückwärts fällt ein leeres
 * Blatt auf die lebende Seite, und der Schatten liegt *darüber*. Eine feste
 * Ebene ist in einem der beiden Fälle immer verkehrt – deshalb entscheidet
 * die Richtung.
 */
export function Blattschatten({ richtung }: { richtung?: 'vor' | 'zurueck' | null }) {
  const ueber = richtung === 'zurueck';
  return (
    <span
      aria-hidden
      className={cx(
        'dc-blattschatten pointer-events-none absolute inset-y-0 block',
        ueber ? 'z-20' : 'z-[5]',
      )}
      style={{
        /*
         * An der Kante der Seite – und die steht dort, wohin der Finger sie
         * geschoben hat. Vorher stand hier `--dc-blatt-kante`, der Kosinus des
         * Drehwinkels; mit dem Schub ist der Schub selbst die Antwort, und
         * eine zweite Rechnung daneben wäre ein zweiter Ort für dieselbe
         * Wahrheit.
         */
        left: ueber
          ? 'calc(100% + var(--dc-blatt-schub, 0px))'
          : 'calc(100% - var(--dc-seite-schub, 0px))',
        width: '26%',
        opacity: 'var(--dc-blatt-schatt, 0)',
        background:
          'linear-gradient(to right, rgba(42,30,15,0.62) 0%, rgba(42,30,15,0.22) 42%, transparent 100%)',
      }}
    />
  );
}
