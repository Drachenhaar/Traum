/**
 * Die zwei Fragen, die vor allem anderen kommen.
 *
 *   1. Was möchtest du erstellen?          → die Art des Buches
 *   2. Gehört es zu einer bestehenden Welt? → die Welt darunter
 *
 * Sie stehen **vor** Einband, Titel und Zeichen, und das ist keine Frage der
 * Reihenfolge, sondern der Bedeutung: Die Art entscheidet, welcher Arbeitsraum
 * sich am Ende öffnet. Sie danach zu fragen hiesse, jemanden einen Einband
 * wählen zu lassen, bevor feststeht, was zwischen die Deckel kommt.
 *
 * Die zweite Frage erscheint nur, wenn es etwas zu wählen gibt. Beim allerersten
 * Buch eine leere Liste bestehender Welten zu zeigen wäre ein Formular ohne
 * Antwort – man würde nach etwas fragen, das es noch nicht geben kann.
 */

import { BUCHARTEN, type Buchart } from '../../lib/buchart';
import type { Weltsicht } from '../../lib/welten';
import { cx } from '../../lib/utils';
import { ClosedBook } from '../../components/book/CoverBoard';
import type { LibraryBook } from '../../types';
import { SzenenFrage, SzenenWeg } from './Geburt';

/* ------------------------------------------------------------- Die Art ---- */

/**
 * Was für ein Buch das wird.
 *
 * Drei Bände, nicht drei Listenzeilen. Man wählt hier kein Format aus einem
 * Auswahlfeld – man greift nach einem Buch. Deshalb ist jede Antwort ein
 * gezeichneter Einband in einem eigenen Material, und deshalb gibt es kein
 * „egal": Ein Buch ohne Art hätte keinen Arbeitsraum, und dann stünde man
 * nach der Zeremonie vor einer Tür ohne Zimmer.
 */
export function Artwahl({
  gewaehlt,
  onChange,
  onWeiter,
  onZurueck,
}: {
  gewaehlt?: Buchart;
  onChange: (art: Buchart) => void;
  onWeiter: () => void;
  onZurueck?: () => void;
}) {
  return (
    <div>
      <SzenenFrage
        frage="Was möchtest du erstellen?"
        hinweis="Die Art bestimmt, wie du an diesem Buch arbeitest. Die Welt darunter bleibt dieselbe."
      />

      {/*
        Drei nebeneinander, immer.

        `flex-wrap` brach auf dem Handy in 2+1 um, und zwei Bücher oben und
        eines darunter sehen aus wie eine Auswahl mit einem Nachzügler. Drei
        Spalten halten die Wahl als *eine* Zeile zusammen; die Deckel sind
        dafür schmal genug gerechnet: 3 × 84 + 2 × 12 passt in 345 Punkte,
        was ein iPhone abzüglich der Ränder übrig lässt.
      */}
      <div className="mx-auto grid max-w-md grid-cols-3 items-end gap-x-3 sm:gap-x-5">
        {BUCHARTEN.map((a) => {
          const aktiv = gewaehlt === a.id;
          return (
            <button
              key={a.id}
              type="button"
              onClick={() => onChange(a.id)}
              aria-pressed={aktiv}
              className="group flex flex-col items-center no-tap-highlight"
            >
              <div
                className={cx(
                  'transition-all duration-500 ease-out',
                  aktiv ? 'opacity-100' : 'opacity-45 group-hover:opacity-75',
                )}
                style={{ transform: aktiv ? 'translateY(-6px)' : undefined }}
              >
                <ClosedBook
                  identity={SCHAUBAND[a.id]}
                  width={84}
                  height={116}
                  ohneSchrift
                  className="transition-all duration-500"
                />
              </div>
              <p
                className={cx(
                  'mt-4 text-balance font-serif text-[14px] leading-tight transition-colors sm:text-[15.5px]',
                  aktiv ? 'text-paper-200' : 'text-paper-300/60',
                )}
              >
                {a.name}
              </p>
              <p className="mt-1 font-serif text-[11.5px] italic leading-snug text-paper-400/45 sm:text-[12.5px]">
                {a.taetigkeit}
              </p>
            </button>
          );
        })}
      </div>

      <SzenenWeg onZurueck={onZurueck} onWeiter={onWeiter} weiterAus={!gewaehlt} />
    </div>
  );
}

/**
 * Die drei Schaubände.
 *
 * Nur zum Ansehen – sie werden nie gespeichert. Drei verschiedene Materialien,
 * damit die Wahl aussieht wie drei Bücher und nicht wie dreimal dasselbe Buch
 * in drei Farben.
 */
const SCHAUBAND: Record<Buchart, LibraryBook> = {
  novel: schauband('novel', 'leder', 'naturbraun'),
  artbook: schauband('artbook', 'leinen', 'waldgruen'),
  rpg: schauband('rpg', 'leder', 'bordeaux'),
};

function schauband(id: string, coverMaterial: string, coverColor: string): LibraryBook {
  return {
    id: `schau_${id}`,
    title: '',
    coverMaterial,
    coverColor,
    emblemType: 'preset',
    worldName: '',
    worldTagline: '',
    recentIds: [],
    goals: [],
    customTypes: [],
    createdAt: 0,
    updatedAt: 0,
  } as unknown as LibraryBook;
}

/* ------------------------------------------------------------ Die Welt ---- */

/**
 * Ob dieses Buch zu einer bestehenden Welt gehört.
 *
 * Die Frage, die aus einer Bibliothek eine Weltensammlung macht. Wer hier eine
 * bestehende Welt wählt, bekommt kein zweites Exemplar ihrer Figuren und Orte,
 * sondern denselben Bestand – gesehen durch ein anderes Buch.
 *
 * „Eine neue Welt" steht oben und ist vorgewählt. Das ist die häufigere
 * Antwort und die folgenlosere: Eine neue Welt lässt sich später mit einer
 * bestehenden zusammenlegen, eine falsch gewählte Zugehörigkeit muss man
 * auseinandernehmen.
 */
export function Weltwahl({
  welten,
  gewaehlt,
  onChange,
  onWeiter,
  onZurueck,
}: {
  welten: Weltsicht[];
  /** Die Kennung der gewählten Welt – `undefined` heisst „eine neue". */
  gewaehlt?: string;
  onChange: (worldId: string | undefined) => void;
  onWeiter: () => void;
  onZurueck?: () => void;
}) {
  return (
    <div>
      <SzenenFrage
        frage="Gehört dieses Buch zu einer bestehenden Welt?"
        hinweis="Bücher derselben Welt teilen ihre Figuren, Orte und Ereignisse."
      />

      <div className="mx-auto grid max-w-md gap-1.5">
        <button
          type="button"
          onClick={() => onChange(undefined)}
          className={cx(
            'rounded-[3px] border px-4 py-3 text-left transition-colors no-tap-highlight',
            !gewaehlt
              ? 'border-gild-500/50 bg-gild-400/10'
              : 'border-paper-400/15 hover:border-gild-500/30',
          )}
        >
          <p className="font-serif text-[15.5px] text-paper-200/90">Eine neue Welt</p>
          <p className="mt-0.5 font-serif text-[12.5px] italic leading-snug text-paper-400/45">
            Dieses Buch steht für sich.
          </p>
        </button>

        {welten.map((w) => (
          <button
            key={w.id}
            type="button"
            onClick={() => onChange(w.id)}
            className={cx(
              'rounded-[3px] border px-4 py-3 text-left transition-colors no-tap-highlight',
              gewaehlt === w.id
                ? 'border-gild-500/50 bg-gild-400/10'
                : 'border-paper-400/15 hover:border-gild-500/30',
            )}
          >
            <p className="font-serif text-[15.5px] text-paper-200/90">{w.name}</p>
            <p className="mt-0.5 font-serif text-[12.5px] italic leading-snug text-paper-400/45">
              {baendeZeile(w)}
            </p>
          </button>
        ))}
      </div>

      <SzenenWeg onZurueck={onZurueck} onWeiter={onWeiter} />
    </div>
  );
}

/**
 * Was unter einer Welt steht: wie viele Bände, und welche.
 *
 * Bei einem oder zwei Bänden ihre Titel – das ist die Auskunft, die man
 * wirklich braucht („ach ja, *die* Welt"). Ab drei wird gezählt, weil eine
 * Aufzählung dann länger wäre als die Zeile.
 */
function baendeZeile(welt: Weltsicht): string {
  const titel = welt.buecher.map((b) => b.title?.trim()).filter(Boolean) as string[];
  if (titel.length === 1) return titel[0];
  if (titel.length === 2) return `${titel[0]} · ${titel[1]}`;
  return `${welt.buecher.length} Bände`;
}
