/**
 * Der Richtungsbogen.
 *
 * Das dritte Gesetz, als Bauteil: *Bevor Dragoncore etwas zeigt, lässt es den
 * Nutzer zuerst spüren, wohin er geht.*
 *
 * Deshalb steht hier keine Vorschau. Keine Charakterliste, die hereinschiebt,
 * kein halbes Kartenbild am Rand, kein Miniaturabbild des Zielraums. Nur ein
 * Bogen, der aus dem Rand in die Mitte wächst und dessen Charakter verrät,
 * welche Art von Tiefe dort liegt.
 *
 * Der Unterschied ist nicht Geschmack. Eine hereinschiebende Liste beantwortet
 * die Frage „was ist dort?", bevor man sie gestellt hat, und macht aus einer
 * Erkundung eine Auswahl. Ein Bogen beantwortet nur „welche Art von Ort ist
 * dort?" – und lässt den Rest offen, bis man wirklich hingeht.
 *
 * ---
 *
 * **Warum dieses Bauteil nichts rechnet.**
 *
 * Es wird nur neu gezeichnet, wenn sich die *Richtung* ändert – also etwa
 * einmal je Geste. Der Fortschritt selbst kommt als CSS-Variable von außen:
 *
 *   --dc-bogen        0…1, wie weit gezogen wurde
 *   --dc-bogen-deck   Deckkraft
 *   --dc-bogen-weich  Weichzeichnung in Punkten
 *
 * Ein React-Zustand an dieser Stelle hieße sechzig Durchläufe in der Sekunde,
 * und der Finger würde das merken. So schreibt die Geste drei Zahlen ins DOM
 * und der Rest ist Sache des Browsers.
 *
 * ---
 *
 * **Vier Charaktere, eine Sprache.**
 *
 * Alle vier bestehen aus derselben Grundkurve. Was sie unterscheidet, ist, was
 * daneben liegt:
 *
 *   Welt    weite Nebenbögen        – Raum, Karte, Ferne
 *   Wesen   wenige Punkte, verbunden – Personen, Begegnung
 *   Wissen  enge konzentrische Bögen – Zusammenhang, Logik
 *   Notizen ein weicher zweiter Bogen – Ablage, Gedächtnis
 *
 * Keine vier Entwürfe. Ein Entwurf mit vier Tonfällen.
 */

import type { Richtung } from '../../lib/raum/geste';

/** Die Grundkurve je Richtung, im Feld 0…100. */
const KURVE: Record<Richtung, string> = {
  rechts: 'M100 0 Q0 50 100 100',
  links: 'M0 0 Q100 50 0 100',
  oben: 'M0 0 Q50 100 100 0',
  unten: 'M0 100 Q50 0 100 100',
};

/** Woher der Bogen wächst – der Punkt, der beim Skalieren stehen bleibt. */
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
 * Der Grund, auf dem der Bogen steht.
 *
 * Im ersten gerenderten Bild war der Bogen fast unsichtbar: eine dünne goldene
 * Linie auf cremefarbenem Papier, dazu weichgezeichnet – ein Schmier statt
 * einer Richtung. Auf dem dunklen Schreibtisch hätte sie getragen, auf einer
 * Buchseite nicht, und auf dem Telefon füllt die Seite den ganzen Bildschirm.
 *
 * Also ein sehr sanftes Abdunkeln vom Rand her, das mit der Geste wächst. Es
 * ist keine Verzierung, sondern die Bedeutung selbst: Der Raum *öffnet* sich
 * dorthin, und was sich öffnet, wird zuerst tiefer. Auf hellem Papier gibt es
 * dem Gold seinen Grund, auf dem dunklen Tisch fällt es kaum auf – beides ist
 * richtig.
 */
const SCHATTEN: Record<Richtung, string> = {
  rechts: 'to left',
  links: 'to right',
  oben: 'to bottom',
  unten: 'to top',
};

/**
 * Ein Nebenbogen, enger oder weiter als die Grundkurve.
 *
 * `anteil` unter 1 heißt: flacher, näher am Rand. Über 1 ginge über die
 * Grundkurve hinaus – das gibt es nur beim Wissen, dessen Bögen sich
 * ineinanderlegen sollen.
 */
function nebenkurve(richtung: Richtung, anteil: number): string {
  const s = 100 * anteil;
  switch (richtung) {
    case 'rechts':
      return `M100 0 Q${100 - s} 50 100 100`;
    case 'links':
      return `M0 0 Q${s} 50 0 100`;
    case 'oben':
      return `M0 0 Q50 ${s} 100 0`;
    default:
      return `M0 100 Q50 ${100 - s} 100 100`;
  }
}

/** Punkte auf der Grundkurve – für den Charakter „Wesen". */
function punkte(richtung: Richtung): [number, number][] {
  const b = (t: number): [number, number] => {
    const u = 1 - t;
    const mische = (a: number, c: number, e: number) => u * u * a + 2 * u * t * c + t * t * e;
    switch (richtung) {
      case 'rechts':
        return [mische(100, 0, 100), mische(0, 50, 100)];
      case 'links':
        return [mische(0, 100, 0), mische(0, 50, 100)];
      case 'oben':
        return [mische(0, 50, 100), mische(0, 100, 0)];
      default:
        return [mische(0, 50, 100), mische(100, 0, 100)];
    }
  };
  return [b(0.3), b(0.5), b(0.7)];
}

export function Richtungsbogen({ richtung }: { richtung: Richtung }) {
  const d = KURVE[richtung];

  return (
    <div
      /*
       * Fest am Fenster, nicht am Buchkasten – aus demselben Grund, aus dem
       * die Geste am Fenster gemessen wird. Der Bogen gehoert zum Raum um das
       * Buch, und der Raum hoert am Bildschirmrand auf.
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
          background: `linear-gradient(${SCHATTEN[richtung]}, rgba(24,18,10,0.34), rgba(24,18,10,0.10) 55%, transparent)`,
        }}
        aria-hidden
      />
      <svg
        className="relative h-full w-full"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        fill="none"
        stroke="var(--dc-accent)"
        vectorEffect="non-scaling-stroke"
      >
        {/*
          Die Grundkurve. `non-scaling-stroke` ist hier nicht Kosmetik: Ohne
          sie würde die Linie beim Ziehen mitgestreckt und wäre am Anfang ein
          Faden und am Ende ein Balken.
        */}
        <path d={d} strokeWidth="var(--dc-bogen-strich, 1.6)" vectorEffect="non-scaling-stroke" />

        {richtung === 'links' && (
          <>
            <path d={nebenkurve('links', 0.62)} strokeWidth="0.8" strokeOpacity="0.45" vectorEffect="non-scaling-stroke" />
            <path d={nebenkurve('links', 0.34)} strokeWidth="0.6" strokeOpacity="0.28" vectorEffect="non-scaling-stroke" />
          </>
        )}

        {richtung === 'rechts' && (
          <>
            {/* Die Verbindungen zuerst, damit die Punkte darauf liegen. */}
            <path
              d={`M${punkte('rechts')
                .map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`)
                .join('L')}`}
              strokeWidth="0.6"
              strokeOpacity="0.5"
              vectorEffect="non-scaling-stroke"
            />
            {punkte('rechts').map(([x, y], i) => (
              <circle
                key={i}
                cx={x}
                cy={y}
                r={i === 1 ? 2.1 : 1.5}
                fill="var(--dc-accent)"
                stroke="none"
              />
            ))}
          </>
        )}

        {richtung === 'oben' && (
          <>
            <path d={nebenkurve('oben', 0.78)} strokeWidth="0.7" strokeOpacity="0.5" vectorEffect="non-scaling-stroke" />
            <path d={nebenkurve('oben', 0.56)} strokeWidth="0.6" strokeOpacity="0.38" vectorEffect="non-scaling-stroke" />
            <path d={nebenkurve('oben', 0.34)} strokeWidth="0.5" strokeOpacity="0.26" vectorEffect="non-scaling-stroke" />
          </>
        )}

        {richtung === 'unten' && (
          <path
            d={nebenkurve('unten', 0.72)}
            strokeWidth="3"
            strokeOpacity="0.22"
            vectorEffect="non-scaling-stroke"
          />
        )}
      </svg>
    </div>
  );
}

/**
 * Der Fokuspunkt.
 *
 * Beim Öffnen verdichtet sich der Bogen für einen Augenblick zu einem Punkt in
 * der Mitte, und aus ihm entfaltet sich der neue Raum. Das ist die
 * Übersetzung von „Bedeutung verdichtet sich und wird zum neuen Raum" –
 * und der Grund, warum hier nicht ein Bildschirm gegen einen anderen getauscht
 * wird.
 */
export function Fokuspunkt() {
  return (
    <div className="pointer-events-none fixed inset-0 z-[45] grid place-items-center" aria-hidden>
      <span className="dc-fokus block h-3 w-3 rounded-full" />
    </div>
  );
}
