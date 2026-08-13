/**
 * Die Zeichenwerkstatt.
 *
 * Kein Zeichenprogramm im Buch. Eine Werkstatt, in der man vier Fragen
 * beantwortet und dabei ein Zeichen entsteht.
 *
 * Der Unterschied liegt in der Reihenfolge und nicht im Umfang. Ein Editor
 * zeigt zuerst seine Werkzeuge und danach das Werkstück; hier steht das
 * Zeichen oben und groß, und darunter liegt genau eine Frage. Wer nichts
 * gestalten will, tippt viermal und ist fertig. Wer gestalten will, tippt auf
 * eine Ebene und bekommt sie in die Hand.
 *
 * Drei Dinge, die es hier bewusst **nicht** gibt:
 *
 *   Keine dauerhafte Ebenenliste. Sie wäre die eine Sache, die aus einem Buch
 *   sofort wieder Designsoftware macht. Wer eine Ebene bearbeiten will, tippt
 *   sie an – im Zeichen, nicht in einer Liste daneben.
 *
 *   Keine Farben. Der Bauplan beschreibt Form; wie sie erscheint, entscheidet
 *   der Einband. Eine Farbwahl hier wäre eine zweite Wahrheit über dasselbe.
 *
 *   Kein Raster, keine Hilfslinien, keine Koordinaten. Wo etwas steht, sieht
 *   man; Zahlen darüber sind eine Auskunft, die niemand braucht.
 */

import { useCallback, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  FlipHorizontal,
  RotateCcw,
  Shuffle,
  Trash2,
  Undo2,
  Redo2,
} from 'lucide-react';
import type { Emblem, Ebene } from '../../lib/zeichen/emblem';
import {
  LEERES_EMBLEM,
  aendere,
  einfuegen,
  entferne,
  inspiration,
  neueEbene,
  schiebe,
  setzeEinzeln,
  spiegelpaar,
} from '../../lib/zeichen/emblem';
import { FORMEN, RAHMEN, SYMBOLE, SYMBOLGRUPPEN, teilById } from '../../lib/zeichen/teile';
import { Zeichnung } from '../../components/zeichen/Zeichnung';
import { cx } from '../../lib/utils';

/* --------------------------------------------------------- Der Verlauf ---- */

/**
 * Zurück und wieder vor.
 *
 * Ein Stapel von Zuständen, keine Liste von Handlungen. Bei einem Bauplan aus
 * höchstens einem Dutzend Ebenen ist eine ganze Fassung so klein, dass sich
 * rückgängig zu *rechnen* nur Fehler einbringen würde – und ein „Rückgängig",
 * das gelegentlich etwas anderes zurückholt, als man erwartet, ist schlimmer
 * als keines.
 */
function useVerlauf(start: Emblem) {
  const [stapel, setStapel] = useState<Emblem[]>([start]);
  const [wo, setWo] = useState(0);
  const jetzt = stapel[wo];

  const setzen = useCallback(
    (naechstes: Emblem) => {
      setStapel((s) => [...s.slice(0, wo + 1), naechstes].slice(-40));
      setWo((w) => Math.min(w + 1, 39));
    },
    [wo],
  );

  return {
    emblem: jetzt,
    setzen,
    zurueck: () => setWo((w) => Math.max(0, w - 1)),
    vor: () => setWo((w) => Math.min(stapel.length - 1, w + 1)),
    kannZurueck: wo > 0,
    kannVor: wo < stapel.length - 1,
  };
}

/* ------------------------------------------------------------ Die Schritte */

type Schritt = 'form' | 'rahmen' | 'haupt' | 'zusatz' | 'fertig';

const FRAGEN: Record<Exclude<Schritt, 'fertig'>, string> = {
  form: 'Welche Form soll dein Zeichen tragen?',
  rahmen: 'Soll es einen Rahmen bekommen?',
  haupt: 'Was steht im Mittelpunkt?',
  zusatz: 'Möchtest du noch etwas dazulegen?',
};

const FOLGE: Schritt[] = ['form', 'rahmen', 'haupt', 'zusatz', 'fertig'];

export function Zeichenwerkstatt({
  start,
  onFertig,
  onAbbruch,
}: {
  start?: Emblem;
  onFertig: (emblem: Emblem) => void;
  onAbbruch: () => void;
}) {
  const verlauf = useVerlauf(start ?? LEERES_EMBLEM);
  const { emblem, setzen } = verlauf;

  /* Wer mit einem fertigen Zeichen hereinkommt, will es bearbeiten, nicht neu bauen. */
  const [schritt, setSchritt] = useState<Schritt>(start?.layers.length ? 'fertig' : 'form');
  const [gewaehlt, setGewaehlt] = useState<string | undefined>();
  const [gruppe, setGruppe] = useState<string>('kreatur');

  const ebene = emblem.layers.find((l) => l.id === gewaehlt);
  const gefuehrt = schritt !== 'fertig';

  const weiter = () => setSchritt(FOLGE[Math.min(FOLGE.length - 1, FOLGE.indexOf(schritt) + 1)]);
  const zurueckSchritt = () => {
    const i = FOLGE.indexOf(schritt);
    if (i <= 0) onAbbruch();
    else setSchritt(FOLGE[i - 1]);
  };

  return (
    <div className="flex min-h-full w-full flex-col">
      {/* ------------------------------------------------------ Das Zeichen */}
      <div className="flex flex-1 items-center justify-center px-6 py-6">
        <Buehne
          emblem={emblem}
          gewaehlt={gewaehlt}
          onWaehle={setGewaehlt}
          onZiehe={(id, dx, dy) => setzen(aendere(emblem, id, { x: dx, y: dy }))}
        />
      </div>

      {/* -------------------------------------------------------- Der Boden */}
      <div className="shrink-0 border-t border-paper-400/15 bg-[#15100a]/80 px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-4 backdrop-blur-sm">
        {ebene ? (
          <Werkzeuge
            ebene={ebene}
            emblem={emblem}
            setzen={setzen}
            onSchliessen={() => setGewaehlt(undefined)}
          />
        ) : gefuehrt ? (
          <>
            <p className="mb-3 text-center font-serif text-[15.5px] text-paper-200/90">
              {FRAGEN[schritt as Exclude<Schritt, 'fertig'>]}
            </p>
            <Ablage
              schritt={schritt as Exclude<Schritt, 'fertig'>}
              gruppe={gruppe}
              onGruppe={setGruppe}
              emblem={emblem}
              onWaehle={(teil) => {
                if (schritt === 'form') setzen(setzeEinzeln(emblem, 'form', teil));
                else if (schritt === 'rahmen') setzen(setzeEinzeln(emblem, 'rahmen', teil));
                else if (schritt === 'haupt') {
                  /* Nur ein Mittelpunkt – ein zweiter waere ein Zusatz. */
                  const ohne = { layers: emblem.layers.filter((l) => l.art !== 'haupt') };
                  setzen(einfuegen(ohne, neueEbene(teil, 'haupt')));
                } else {
                  const neu = einfuegen(emblem, neueEbene(teil, 'zusatz'));
                  setzen(neu);
                  setGewaehlt(neu.layers[neu.layers.length - 1]?.id);
                }
              }}
            />
            <div className="mt-4 flex items-center justify-between">
              <button
                type="button"
                onClick={zurueckSchritt}
                className="min-h-[44px] px-1 font-serif text-[13.5px] italic text-paper-400/45 transition-colors hover:text-paper-300 no-tap-highlight"
              >
                Zurück
              </button>
              <button
                type="button"
                onClick={weiter}
                className="min-h-[44px] rounded-full border border-gild-500/40 px-6 font-serif text-[14.5px] text-gild-300 transition-colors hover:bg-gild-400/10 no-tap-highlight"
              >
                {schritt === 'zusatz' ? 'Dein Zeichen' : 'Weiter'}
              </button>
            </div>
          </>
        ) : (
          <Abschluss
            emblem={emblem}
            verlauf={verlauf}
            onWeiterGestalten={() => setSchritt('zusatz')}
            onFertig={() => onFertig(emblem)}
            onInspiration={() =>
              setzen(inspiration(FORMEN.map((f) => f.id), RAHMEN.map((r) => r.id)))
            }
          />
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------- Die Bühne -- */

/**
 * Das Zeichen, anfassbar.
 *
 * Ziehen bewegt die gewählte Ebene. Bewusst *nur* Ziehen mit einem Finger und
 * kein Kneifen zum Skalieren: Ein Zeichen aus einem Dutzend Ebenen, das auf
 * jede Zweifingergeste reagiert, verstellt sich beim Blättern und beim
 * Zoomen der Seite. Größe und Drehung stehen unten als Regler – langsamer,
 * aber niemals versehentlich.
 */
function Buehne({
  emblem,
  gewaehlt,
  onWaehle,
  onZiehe,
}: {
  emblem: Emblem;
  gewaehlt?: string;
  onWaehle: (id?: string) => void;
  onZiehe: (id: string, x: number, y: number) => void;
}) {
  const feld = useRef<HTMLDivElement>(null);
  const zieht = useRef<{ id: string; startX: number; startY: number; x0: number; y0: number } | null>(
    null,
  );

  const anfassen = (e: React.PointerEvent) => {
    if (!gewaehlt) return;
    const l = emblem.layers.find((x) => x.id === gewaehlt);
    if (!l) return;
    zieht.current = { id: l.id, startX: e.clientX, startY: e.clientY, x0: l.x, y0: l.y };
    (e.target as Element).setPointerCapture?.(e.pointerId);
  };
  const bewegen = (e: React.PointerEvent) => {
    const z = zieht.current;
    const kasten = feld.current?.getBoundingClientRect();
    if (!z || !kasten) return;
    const dx = (e.clientX - z.startX) / kasten.width;
    const dy = (e.clientY - z.startY) / kasten.height;
    onZiehe(z.id, Math.max(-0.8, Math.min(0.8, z.x0 + dx)), Math.max(-0.8, Math.min(0.8, z.y0 + dy)));
  };
  const loslassen = () => {
    zieht.current = null;
  };

  return (
    <div className="w-full max-w-[20rem]">
      <p className="mb-3 text-center font-serif text-[11px] uppercase tracking-[0.22em] text-paper-400/35">
        Dein Zeichen
      </p>
      <div
        ref={feld}
        onPointerDown={anfassen}
        onPointerMove={bewegen}
        onPointerUp={loslassen}
        onPointerCancel={loslassen}
        className={cx(
          'relative aspect-square touch-none select-none rounded-[3px] border transition-colors',
          gewaehlt ? 'border-gild-500/35' : 'border-paper-400/12',
        )}
      >
        <Zeichnung emblem={emblem} size={320} color="#E3C878" className="h-full w-full" />

        {emblem.layers.length === 0 && (
          <p className="absolute inset-0 grid place-items-center px-8 text-center font-serif text-[13px] italic leading-relaxed text-paper-400/30">
            Noch nichts. Was unten steht, erscheint hier.
          </p>
        )}

        {/*
          Die Ebenen antippbar machen.

          Keine Umrandungen, keine Griffe, keine Nummern – nur unsichtbare
          Flaechen ueber dem Zeichen. Sichtbare Auswahlrahmen waeren das
          zweite, was aus einem Buch Designsoftware macht.
        */}
        {emblem.layers.map((l) => (
          <button
            key={l.id}
            type="button"
            aria-label={teilById(l.teil)?.label ?? 'Ebene'}
            onClick={() => onWaehle(gewaehlt === l.id ? undefined : l.id)}
            className="absolute"
            style={{
              left: `${50 + l.x * 100 - (l.scale * 100) / 2}%`,
              top: `${50 + l.y * 100 - (l.scale * 100) / 2}%`,
              width: `${l.scale * 100}%`,
              height: `${l.scale * 100}%`,
            }}
          />
        ))}
      </div>
      {gewaehlt && (
        <p className="mt-2 text-center font-serif text-[12px] italic text-paper-400/40">
          {teilById(emblem.layers.find((l) => l.id === gewaehlt)?.teil ?? '')?.label} – ziehen zum
          Verschieben
        </p>
      )}
    </div>
  );
}

/* ------------------------------------------------------------- Die Ablage - */

function Ablage({
  schritt,
  gruppe,
  onGruppe,
  emblem,
  onWaehle,
}: {
  schritt: Exclude<Schritt, 'fertig'>;
  gruppe: string;
  onGruppe: (g: string) => void;
  emblem: Emblem;
  onWaehle: (teil: string) => void;
}) {
  const symbole = schritt === 'haupt' || schritt === 'zusatz';
  const teile = useMemo(() => {
    if (schritt === 'form') return FORMEN;
    if (schritt === 'rahmen') return RAHMEN;
    return SYMBOLE.filter((s) => s.gruppe === gruppe);
  }, [schritt, gruppe]);

  const aktiv = emblem.layers.find((l) => l.art === (schritt === 'form' ? 'form' : 'rahmen'))?.teil;

  return (
    <>
      {symbole && (
        <div className="mb-3 flex justify-center gap-x-5">
          {SYMBOLGRUPPEN.map((g) => (
            <button
              key={g.id}
              type="button"
              onClick={() => onGruppe(g.id)}
              className={cx(
                'min-h-[36px] font-serif text-[13px] transition-colors no-tap-highlight',
                gruppe === g.id ? 'text-gild-300' : 'text-paper-400/40 hover:text-paper-300',
              )}
            >
              {g.label}
            </button>
          ))}
        </div>
      )}

      {/*
        Eine waagerechte Reihe und kein Raster.

        Ein Raster fuellt den halben Bildschirm und schiebt das Zeichen nach
        oben aus dem Blick. Eine Reihe, durch die man wischt, laesst das
        Zeichen, wo es ist – und man sieht beim Waehlen, was man aendert.
      */}
      <div className="scroll-slim -mx-4 flex gap-2.5 overflow-x-auto px-4 pb-1">
        {teile.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => onWaehle(t.id)}
            title={t.label}
            className={cx(
              'grid h-[68px] w-[68px] shrink-0 place-items-center rounded-[3px] border transition-colors no-tap-highlight',
              (schritt === 'form' || schritt === 'rahmen') && (aktiv ?? 'keine') === t.id
                ? 'border-gild-500/50 bg-gild-400/10'
                : 'border-paper-400/15 hover:border-gild-500/30',
            )}
          >
            {t.zeichnung ? (
              <Zeichnung emblem={{ layers: [neueEbene(t.id, 'form', { scale: 0.92 })] }} size={54} color="#E3C878" />
            ) : (
              <span className="font-serif text-[11px] italic text-paper-400/45">ohne</span>
            )}
          </button>
        ))}
      </div>
    </>
  );
}

/* ---------------------------------------------------------- Die Werkzeuge - */

function Werkzeuge({
  ebene,
  emblem,
  setzen,
  onSchliessen,
}: {
  ebene: Ebene;
  emblem: Emblem;
  setzen: (e: Emblem) => void;
  onSchliessen: () => void;
}) {
  const knopf =
    'grid h-11 w-11 place-items-center rounded-full border border-paper-400/15 text-paper-300/70 transition-colors hover:border-gild-500/40 hover:text-gild-300 no-tap-highlight';
  return (
    <>
      <div className="mb-3 flex items-center justify-between">
        <p className="font-serif text-[14px] text-paper-200/85">
          {teilById(ebene.teil)?.label}
        </p>
        <button
          type="button"
          onClick={onSchliessen}
          className="min-h-[40px] font-serif text-[13px] italic text-paper-400/45 transition-colors hover:text-paper-300 no-tap-highlight"
        >
          Fertig
        </button>
      </div>

      {/* Groesse und Drehung als Regler – langsamer als Gesten, nie versehentlich. */}
      <label className="mb-2 flex items-center gap-3">
        <span className="w-[4.5rem] shrink-0 font-serif text-[12px] text-paper-400/45">Größe</span>
        <input
          type="range"
          min={5}
          max={160}
          value={Math.round(ebene.scale * 100)}
          onChange={(e) => setzen(aendere(emblem, ebene.id, { scale: Number(e.target.value) / 100 }))}
          className="h-11 flex-1 accent-gild-500"
        />
      </label>
      <label className="mb-3 flex items-center gap-3">
        <span className="w-[4.5rem] shrink-0 font-serif text-[12px] text-paper-400/45">Drehung</span>
        <input
          type="range"
          min={-180}
          max={180}
          value={Math.round(ebene.drehung)}
          onChange={(e) => setzen(aendere(emblem, ebene.id, { drehung: Number(e.target.value) }))}
          className="h-11 flex-1 accent-gild-500"
        />
      </label>

      <div className="flex flex-wrap items-center justify-center gap-2.5">
        <button
          type="button"
          title="Spiegeln"
          onClick={() => setzen(aendere(emblem, ebene.id, { gespiegelt: !ebene.gespiegelt }))}
          className={knopf}
        >
          <FlipHorizontal size={17} />
        </button>
        <button
          type="button"
          title="Spiegelpaar"
          onClick={() => setzen(spiegelpaar(emblem, ebene.id))}
          className="h-11 rounded-full border border-paper-400/15 px-4 font-serif text-[13px] text-paper-300/70 transition-colors hover:border-gild-500/40 hover:text-gild-300 no-tap-highlight"
        >
          Spiegelpaar
        </button>
        <button
          type="button"
          title="Nach hinten"
          onClick={() => setzen(schiebe(emblem, ebene.id, 'zurueck'))}
          className={knopf}
        >
          <ArrowLeft size={17} />
        </button>
        <button
          type="button"
          title="Nach vorne"
          onClick={() => setzen(schiebe(emblem, ebene.id, 'vor'))}
          className={knopf}
        >
          <ArrowRight size={17} />
        </button>
        <button
          type="button"
          title="Zurücksetzen"
          onClick={() =>
            setzen(aendere(emblem, ebene.id, { x: 0, y: 0, drehung: 0, gespiegelt: false }))
          }
          className={knopf}
        >
          <RotateCcw size={16} />
        </button>
        <button
          type="button"
          title="Entfernen"
          onClick={() => {
            setzen(entferne(emblem, ebene.id));
            onSchliessen();
          }}
          className={knopf}
        >
          <Trash2 size={16} />
        </button>
      </div>
    </>
  );
}

/* ------------------------------------------------------------ Der Abschluss */

function Abschluss({
  emblem,
  verlauf,
  onWeiterGestalten,
  onFertig,
  onInspiration,
}: {
  emblem: Emblem;
  verlauf: ReturnType<typeof useVerlauf>;
  onWeiterGestalten: () => void;
  onFertig: () => void;
  onInspiration: () => void;
}) {
  return (
    <>
      <div className="mb-3 flex items-center justify-center gap-2.5">
        <button
          type="button"
          onClick={verlauf.zurueck}
          disabled={!verlauf.kannZurueck}
          title="Rückgängig"
          className="grid h-11 w-11 place-items-center rounded-full border border-paper-400/15 text-paper-300/70 transition-colors hover:border-gild-500/40 hover:text-gild-300 disabled:opacity-25 no-tap-highlight"
        >
          <Undo2 size={16} />
        </button>
        <button
          type="button"
          onClick={verlauf.vor}
          disabled={!verlauf.kannVor}
          title="Wiederholen"
          className="grid h-11 w-11 place-items-center rounded-full border border-paper-400/15 text-paper-300/70 transition-colors hover:border-gild-500/40 hover:text-gild-300 disabled:opacity-25 no-tap-highlight"
        >
          <Redo2 size={16} />
        </button>
        <button
          type="button"
          onClick={onInspiration}
          className="inline-flex h-11 items-center gap-2 rounded-full border border-paper-400/15 px-4 font-serif text-[13.5px] text-paper-300/70 transition-colors hover:border-gild-500/40 hover:text-gild-300 no-tap-highlight"
        >
          <Shuffle size={15} /> Inspiration
        </button>
      </div>

      <p className="mb-3 text-center font-serif text-[12.5px] italic leading-relaxed text-paper-400/40">
        Tippe im Zeichen auf etwas, um es zu verändern.
      </p>

      <div className="flex items-center justify-center gap-4">
        <button
          type="button"
          onClick={onWeiterGestalten}
          className="min-h-[44px] font-serif text-[13.5px] italic text-paper-400/45 transition-colors hover:text-paper-300 no-tap-highlight"
        >
          Weiter gestalten
        </button>
        <button
          type="button"
          onClick={onFertig}
          disabled={emblem.layers.length === 0}
          className="inline-flex min-h-[46px] items-center gap-2 rounded-full border border-gild-500/45 px-6 font-serif text-[15px] text-gild-300 transition-colors hover:bg-gild-400/10 disabled:opacity-30 no-tap-highlight"
        >
          <Check size={16} /> Das ist mein Zeichen
        </button>
      </div>
    </>
  );
}
