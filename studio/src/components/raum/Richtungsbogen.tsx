/**
 * Der Richtungsbogen.
 *
 * Das dritte Gesetz, als Bauteil: *Bevor Dragoncore etwas zeigt, lässt es den
 * Nutzer zuerst spüren, wohin er geht.*
 *
 * Deshalb steht hier keine Vorschau. Keine Charakterliste, die hereinschiebt,
 * kein halbes Kartenbild am Rand, kein Miniaturabbild des Zielraums. Nur ein
 * Bogen, der aus dem Rand in die Mitte wächst – und ab einem bestimmten Punkt
 * ein Zeichen, das sagt, *welche Art* von Tiefe dort liegt.
 *
 * ---
 *
 * **Eine Sichel, keine Linie.**
 *
 * Der erste Bau hatte hier eine dünne Kurve. Auf dem Entwurfsblatt ist es
 * etwas anderes: ein **leuchtender Sichelkörper**, in der Mitte breit, zu den
 * Enden hin auslaufend, mit einer hellen Kante zur Bildschirmmitte hin. Das
 * ist nicht dieselbe Sache in schöner – es ist eine andere Aussage.
 *
 *   Eine Linie sagt: hier ist eine Grenze.
 *   Eine Sichel sagt: hier öffnet sich etwas.
 *
 * Und sie trägt Weichzeichnung. Eine Haarlinie weichgezeichnet ergibt einen
 * Schmier; eine Fläche weichgezeichnet ergibt Licht. Genau daran ist die erste
 * Fassung im gerenderten Bild gescheitert.
 *
 * ---
 *
 * **Wo der Charakter jetzt sitzt.**
 *
 * Zuerst hatten die vier Richtungen vier verschieden verzierte Bögen –
 * Nebenkurven für die Welt, Punkte für die Wesen, konzentrische Ringe für das
 * Wissen. Auf dem Entwurfsblatt sind alle vier Bögen **gleich**, und der
 * Unterschied steckt in einem Zeichen, das ab etwa fünfzehn Prozent
 * auftaucht.
 *
 * Das ist besser, und zwar aus einem Grund, den man erst am Gerät sieht: Eine
 * Verzierung, die mit dem Bogen mitskaliert und weichgezeichnet wird, ist bei
 * zehn Prozent nicht lesbar und bei achtzig Prozent nicht mehr nötig. Ein
 * Zeichen, das an einer festen Stelle scharf steht, ist genau dann lesbar,
 * wenn es gebraucht wird – im Augenblick des Erkennens.
 *
 * ---
 *
 * **Warum dieses Bauteil nichts rechnet.**
 *
 * Es wird nur neu gezeichnet, wenn sich die *Richtung* ändert – also etwa
 * einmal je Geste. Alles Laufende kommt als CSS-Variable von außen:
 *
 *   --dc-bogen         0…1, wie weit gezogen wurde
 *   --dc-bogen-deck    Deckkraft der Sichel
 *   --dc-bogen-weich   Weichzeichnung in Punkten
 *   --dc-zeichen-weg   0…1, wie weit das Zeichen hereingewandert ist
 *   --dc-zeichen-deck  Deckkraft des Zeichens (bleibt 0 bis zur Andeutung)
 */

import type { Richtung } from '../../lib/raum/geste';

/**
 * Die vordere Kante – die Seite, die zur Bildschirmmitte zeigt.
 *
 * Sie ist die helle: Dort öffnet sich der Raum. Der Scheitel liegt bei
 * halber Breite (Kontrollpunkt bei 0 ergibt 0,25·100 + 0,5·0 + 0,25·100 = 50).
 */
const VORNE: Record<Richtung, string> = {
  rechts: 'M100 0 Q0 50 100 100',
  links: 'M0 0 Q100 50 0 100',
  oben: 'M0 0 Q50 100 100 0',
  unten: 'M0 100 Q50 0 100 100',
};

/**
 * Die ganze Sichel: vordere Kante hin, hintere zurück, geschlossen.
 *
 * Die hintere Kante ist flacher (Scheitel bei 67 statt 50), damit dazwischen
 * ein Körper entsteht, der in der Mitte gut siebzehn Einheiten breit ist und
 * an beiden Enden auf null zuläuft.
 */
const SICHEL: Record<Richtung, string> = {
  rechts: 'M100 0 Q0 50 100 100 Q34 50 100 0 Z',
  links: 'M0 0 Q100 50 0 100 Q66 50 0 0 Z',
  oben: 'M0 0 Q50 100 100 0 Q50 66 0 0 Z',
  unten: 'M0 100 Q50 0 100 100 Q50 34 0 100 Z',
};

/** Hell am Scheitel der vorderen Kante, auslaufend zur hinteren. */
const VERLAUF: Record<Richtung, { x1: number; y1: number; x2: number; y2: number }> = {
  rechts: { x1: 48, y1: 0, x2: 70, y2: 0 },
  links: { x1: 52, y1: 0, x2: 30, y2: 0 },
  oben: { x1: 0, y1: 52, x2: 0, y2: 30 },
  unten: { x1: 0, y1: 48, x2: 0, y2: 70 },
};

/** Woher die Sichel wächst – der Punkt, der beim Skalieren stehen bleibt. */
const URSPRUNG: Record<Richtung, string> = {
  rechts: '100% 50%',
  links: '0% 50%',
  oben: '50% 0%',
  unten: '50% 100%',
};

const ACHSE: Record<Richtung, 'scaleX' | 'scaleY'> = {
  rechts: 'scaleX',
  links: 'scaleX',
  oben: 'scaleY',
  unten: 'scaleY',
};

/**
 * Der Grund, auf dem die Sichel steht.
 *
 * Ein sehr sanftes Abdunkeln vom Rand her. Es ist keine Verzierung, sondern
 * die Bedeutung selbst: Der Raum *öffnet* sich dorthin, und was sich öffnet,
 * wird zuerst tiefer. Auf hellem Papier gibt es dem Gold seinen Grund, auf dem
 * dunklen Tisch fällt es kaum auf – beides ist richtig.
 */
const SCHATTEN: Record<Richtung, string> = {
  rechts: 'to left',
  links: 'to right',
  oben: 'to bottom',
  unten: 'to top',
};

export function Richtungsbogen({ richtung }: { richtung: Richtung }) {
  const v = VERLAUF[richtung];
  const marke = `dc-verlauf-${richtung}`;

  return (
    <div
      /*
       * Fest am Fenster, nicht am Buchkasten – aus demselben Grund, aus dem
       * die Geste am Fenster gemessen wird. Der Raum gehört um das Buch herum,
       * und er hört am Bildschirmrand auf.
       */
      className="dc-bogen pointer-events-none fixed inset-0 z-[45]"
      style={{
        transformOrigin: URSPRUNG[richtung],
        transform: `${ACHSE[richtung]}(var(--dc-bogen, 0))`,
        opacity: 'var(--dc-bogen-deck, 0)',
        filter: 'blur(calc(var(--dc-bogen-weich, 0) * 1px))',
      }}
      aria-hidden
    >
      <span
        className="absolute inset-0"
        style={{
          background: `linear-gradient(${SCHATTEN[richtung]}, rgba(24,18,10,0.30), rgba(24,18,10,0.08) 55%, transparent)`,
        }}
        aria-hidden
      />
      <svg
        className="relative h-full w-full"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        fill="none"
      >
        <defs>
          {/*
            `userSpaceOnUse` und nicht der Vorgabewert: Der Umriss der Sichel
            reicht bis an den Rand (dort laufen ihre Enden zusammen), ihr
            sichtbarer Körper aber nur über ein Sechstel davon. Am Kasten
            ausgerichtet läge der ganze Verlauf im unsichtbaren Teil.
          */}
          <linearGradient id={marke} gradientUnits="userSpaceOnUse" {...v}>
            <stop offset="0" stopColor="var(--dc-accent)" stopOpacity="0.85" />
            <stop offset="0.45" stopColor="var(--dc-accent)" stopOpacity="0.34" />
            <stop offset="1" stopColor="var(--dc-accent)" stopOpacity="0" />
          </linearGradient>
        </defs>

        <path d={SICHEL[richtung]} fill={`url(#${marke})`} />

        {/*
          Die helle Kante. `non-scaling-stroke` ist hier nicht Kosmetik: Ohne
          sie würde die Linie beim Ziehen mitgestreckt und wäre am Anfang ein
          Faden und am Ende ein Balken.
        */}
        <path
          d={VORNE[richtung]}
          stroke="var(--dc-accent)"
          strokeWidth="var(--dc-bogen-strich, 1.6)"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
    </div>
  );
}

/* ------------------------------------------------------- Das Richtungszeichen */

/**
 * Vier Zeichen, eine Familie.
 *
 * Jedes sitzt in demselben Ring und unterscheidet sich nur in dem, was darin
 * steht. Das ist dieselbe Regel wie überall in diesem Projekt: **eine Form,
 * vier Tonfälle** – keine vier Entwürfe.
 *
 *   Welt     Meridiane        – eine Kugel, ein Raum, Ferne
 *   Wesen    drei verbundene Punkte – Personen, Begegnung
 *   Wissen   konzentrische Ringe mit Speichen – Zusammenhang, Gefüge
 *   Notizen  eine Schale, in die etwas fällt  – Ablage, Gedächtnis
 *
 * Gezeichnet und nicht als Bild geladen: Diese Zeichen müssen bei jeder Größe
 * und in jeder Buchidentität stimmen, und ein Strich, der aus derselben Marke
 * wie der Bogen kommt, stimmt immer.
 */
function Zeichnung({ richtung }: { richtung: Richtung }) {
  const strich = { stroke: 'var(--dc-accent)', strokeWidth: 1.4, fill: 'none' } as const;

  return (
    <svg viewBox="0 0 48 48" className="h-full w-full" aria-hidden>
      {/* Der gemeinsame Ring. */}
      <circle cx="24" cy="24" r="19" {...strich} strokeOpacity="0.55" />

      {richtung === 'links' && (
        <>
          <ellipse cx="24" cy="24" rx="7.5" ry="19" {...strich} />
          <path d="M6.5 17.5h35M6.5 30.5h35" {...strich} strokeOpacity="0.7" />
        </>
      )}

      {richtung === 'rechts' && (
        <>
          <path d="M24 12.5 34 29.5 14 29.5 Z" {...strich} strokeOpacity="0.6" />
          <circle cx="24" cy="12.5" r="3.4" fill="var(--dc-accent)" />
          <circle cx="34" cy="29.5" r="3.4" fill="var(--dc-accent)" />
          <circle cx="14" cy="29.5" r="3.4" fill="var(--dc-accent)" />
        </>
      )}

      {richtung === 'oben' && (
        <>
          <circle cx="24" cy="24" r="12" {...strich} strokeOpacity="0.7" />
          <circle cx="24" cy="24" r="5" {...strich} />
          <path d="M24 5v6M24 37v6M5 24h6M37 24h6" {...strich} strokeOpacity="0.8" />
        </>
      )}

      {richtung === 'unten' && (
        <>
          <path d="M11 24a13 13 0 0 0 26 0" {...strich} />
          <path d="M24 8v9" {...strich} strokeOpacity="0.75" />
          <circle cx="24" cy="19.5" r="2.6" fill="var(--dc-accent)" />
          <circle cx="16" cy="15" r="1.6" fill="var(--dc-accent)" fillOpacity="0.6" />
          <circle cx="32" cy="15" r="1.6" fill="var(--dc-accent)" fillOpacity="0.6" />
        </>
      )}
    </svg>
  );
}

/**
 * Wo das Zeichen steht – am Scheitel der vorderen Kante.
 *
 * In einer **eigenen, ungestreckten** Ebene über der Sichel. Das ist kein
 * Aufwand um seiner selbst willen: Die Sichel wird entlang einer Achse
 * gestaucht, und ein Zeichen darin wäre bei zehn Prozent ein senkrechter
 * Strich statt eines Ringes. Es wird auch nicht weichgezeichnet – es soll
 * gelesen werden, nicht leuchten.
 *
 * `52 %` ist derselbe Wert wie der Höchsteinzug des Bogens: Beide beschreiben
 * dieselbe Stelle, und wer den einen im Labor verschiebt, verschiebt den
 * anderen mit.
 */
const STAND: Record<Richtung, React.CSSProperties> = {
  rechts: { top: '50%', left: 'calc(100% - var(--dc-zeichen-weg, 0) * 52%)' },
  links: { top: '50%', left: 'calc(var(--dc-zeichen-weg, 0) * 52%)' },
  oben: { left: '50%', top: 'calc(var(--dc-zeichen-weg, 0) * 52%)' },
  unten: { left: '50%', top: 'calc(100% - var(--dc-zeichen-weg, 0) * 52%)' },
};

export function Richtungszeichen({ richtung }: { richtung: Richtung }) {
  return (
    <div className="pointer-events-none fixed inset-0 z-[46]" aria-hidden>
      <span
        className="dc-zeichen absolute block h-11 w-11"
        style={{
          ...STAND[richtung],
          transform: 'translate(-50%, -50%)',
          opacity: 'var(--dc-zeichen-deck, 0)',
        }}
      >
        {/* Ein weicher Schein dahinter, damit das Zeichen auf Papier und auf
            dem dunklen Tisch gleichermaßen steht. */}
        <span
          className="absolute inset-[-70%] rounded-full"
          style={{
            background:
              'radial-gradient(circle, rgb(var(--dc-metall-400) / 0.28), rgb(var(--dc-metall-400) / 0.06) 45%, transparent 70%)',
          }}
        />
        <span className="relative block h-full w-full">
          <Zeichnung richtung={richtung} />
        </span>
      </span>
    </div>
  );
}

/**
 * Der Fokuspunkt.
 *
 * Beim Öffnen verdichtet sich der Bogen für einen Augenblick zu einem Punkt in
 * der Mitte, und aus ihm entfaltet sich der neue Raum. Das ist die Übersetzung
 * von „Bedeutung verdichtet sich und wird zum neuen Raum" – und der Grund,
 * warum hier nicht ein Bildschirm gegen einen anderen getauscht wird.
 */
export function Fokuspunkt() {
  return (
    <div className="pointer-events-none fixed inset-0 z-[46] grid place-items-center" aria-hidden>
      <span className="dc-fokus block h-3 w-3 rounded-full" />
    </div>
  );
}
