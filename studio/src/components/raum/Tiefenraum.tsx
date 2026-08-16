/**
 * Was in der Tiefe liegt.
 *
 * Vier Richtungen, und rechts drei Ebenen tief – der Durchstich aus dem
 * Bauplan. Alles hier ist **Lesesicht auf vorhandene Daten**: Es entsteht
 * kein Eintrag, keine Beziehung, kein Feld. Ein Raum, den man durch eine Geste
 * betritt, darf die Welt nicht anfassen; sonst wäre Erkunden gefährlich, und
 * dann erkundet niemand.
 *
 * ---
 *
 * **Warum diese Räume so wenig zeigen.**
 *
 * Die Versuchung ist groß, aus „Tiefe 3: das Verknüpfungsnetz" eine
 * Graphenansicht mit Filtern, Legende und Werkzeugleiste zu machen. Das wäre
 * dann ein Dashboard mit Umweg. Die Räume sind Orte, keine Werkzeuge: Man
 * sieht, was zusammenhängt, man kann etwas in die Mitte holen, und man geht
 * wieder. Wer arbeiten will, arbeitet in der Mitte.
 *
 * Die einzige Handlung, die es hier gibt, ist deshalb auch die einzige, die
 * etwas verändern darf: **In die Mitte holen.** Sie verschiebt den Anker – und
 * nur sie.
 */

import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRightLeft, MapPin, Sparkles } from 'lucide-react';
import { useStudio, livingEntries } from '../../store/useStudio';
import { useRaum } from '../../lib/raum/useRaum';
import { RICHTUNGEN, type Ort } from '../../lib/raum/geste';
import { relationsOf } from '../../lib/relations';
import { templateFor } from '../../lib/templates';
import { chapterOfType } from '../../lib/book';
import { cx } from '../../lib/utils';
import type { Entry } from '../../types';

/** Die Überschrift eines Raums – Richtung und Tiefe, in Buchsprache. */
const TITEL: Record<string, string> = {
  'links:1': 'Die Welt umher',
  'rechts:1': 'Wesen in der Nähe',
  'rechts:2': 'Wie sie zusammenhängen',
  'rechts:3': 'Das ganze Geflecht',
  'oben:1': 'Was darüber bekannt ist',
  'unten:1': 'Was sich angesammelt hat',
};

export function Tiefenraum() {
  const ort = useRaum((s) => s.ort);
  const tiefe = useRaum((s) => s.tiefe);
  const phase = useRaum((s) => s.phase);
  const ankerId = useRaum((s) => s.ankerId);
  const entries = useStudio((s) => s.entries);
  const relIndex = useStudio((s) => s.relIndex);

  const lebende = useMemo(() => livingEntries(entries), [entries]);
  const nach = useMemo(() => new Map(lebende.map((e) => [e.id, e])), [lebende]);
  const anker = ankerId ? nach.get(ankerId) : undefined;

  if (ort === 'mitte' || tiefe === 0) return null;
  const richtung = RICHTUNGEN.find((r) => r.id === ort);

  return (
    <div
      /*
       * Der Schlüssel enthält Ort und Tiefe: Bei jedem Wechsel entsteht der
       * Knoten neu, und damit läuft die Entfaltungsanimation erneut. Ohne ihn
       * wechselte nur der Text, und der Raum fühlte sich an wie eine
       * aktualisierte Liste.
       */
      key={`${ort}:${tiefe}`}
      className={cx(
        'flex min-h-0 flex-1 flex-col overflow-y-auto px-5 pb-8 pt-4 sm:px-8',
        phase === 'heimkehrend' ? 'dc-heimkehr' : 'dc-entfalten',
      )}
    >
      <header className="mb-5 shrink-0">
        <p className="font-serif text-[11.5px] uppercase tracking-[0.24em] text-gild-500/60">
          {richtung?.name}
          {' · '}
          {'Tiefe '}
          {tiefe}
        </p>
        <h2 className="mt-1 font-serif text-[22px] text-paper-200">
          {TITEL[`${ort}:${tiefe}`] ?? richtung?.name}
        </h2>
        {anker && (
          /*
           * Der Anker steht sichtbar da.
           *
           * Das ist die halbe Miete des Gesetzes „Anker und sichtbare Mitte
           * sind nicht dasselbe": Wer drei Ebenen tief steht, muss sehen
           * können, wessen Umgebung er gerade betrachtet. Sonst ist Tiefe
           * dasselbe wie Verirren.
           */
          <p className="mt-1 font-serif text-[13px] italic text-paper-400/55">
            um {anker.title}
          </p>
        )}
      </header>

      <Inhalt ort={ort} tiefe={tiefe} anker={anker} lebende={lebende} nach={nach} index={relIndex} />

      <p className="mt-8 shrink-0 text-center font-serif text-[12px] italic text-paper-400/35">
        Doppeltipp bringt dich zurück zu deinem Werk.
      </p>
    </div>
  );
}

/* --------------------------------------------------------------- Die Räume */

interface RaumProps {
  ort: Ort;
  tiefe: number;
  anker: Entry | undefined;
  lebende: Entry[];
  nach: Map<string, Entry>;
  index: ReturnType<typeof useStudio.getState>['relIndex'];
}

function Inhalt({ ort, tiefe, anker, lebende, nach, index }: RaumProps) {
  if (ort === 'rechts') {
    if (tiefe === 1) return <WesenNah anker={anker} lebende={lebende} nach={nach} index={index} />;
    if (tiefe === 2) return <Zusammenhang anker={anker} nach={nach} index={index} />;
    return <Geflecht anker={anker} nach={nach} index={index} />;
  }
  if (ort === 'links') return <Welt lebende={lebende} />;
  if (ort === 'oben') return <Wissen anker={anker} nach={nach} index={index} />;
  return <Notizen lebende={lebende} />;
}

/**
 * Rechts, Tiefe 1: die Wesen in der Nähe.
 *
 * „Nähe" heißt: direkt mit dem Werk verbunden. Ist gar nichts verbunden – und
 * das ist am Anfang der Normalfall –, stehen hier die Wesen des Buches. Kein
 * leerer Raum mit einer Aufforderung: Ein Raum, der nur sagt „hier ist nichts",
 * ist eine Sackgasse mit Aussicht.
 */
function WesenNah({ anker, lebende, nach, index }: Omit<RaumProps, 'ort' | 'tiefe'>) {
  const wesen = useMemo(() => {
    const alleWesen = lebende.filter((e) => chapterOfType(e.type).id === 'wesen');
    if (!anker) return alleWesen.slice(0, 24);
    const nahe = relationsOf(index, anker.id)
      .map((r) => nach.get(r.otherId))
      .filter((e): e is Entry => !!e && chapterOfType(e.type).id === 'wesen');
    const gesehen = new Set(nahe.map((e) => e.id));
    return [...nahe, ...alleWesen.filter((e) => !gesehen.has(e.id) && e.id !== anker.id)].slice(0, 24);
  }, [anker, lebende, nach, index]);

  if (!wesen.length) return <Leer text="In diesem Buch lebt noch niemand." />;
  return (
    <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {wesen.map((e) => (
        <Kachel key={e.id} entry={e} />
      ))}
    </ul>
  );
}

/** Rechts, Tiefe 2: wie sie zusammenhängen – nach Art der Beziehung geordnet. */
function Zusammenhang({ anker, nach, index }: Omit<RaumProps, 'ort' | 'tiefe' | 'lebende'>) {
  const gruppen = useMemo(() => {
    if (!anker) return [];
    const karte = new Map<string, { label: string; farbe: string; wer: Entry[] }>();
    for (const r of relationsOf(index, anker.id)) {
      const anderer = nach.get(r.otherId);
      if (!anderer) continue;
      const g = karte.get(r.label);
      if (g) g.wer.push(anderer);
      else karte.set(r.label, { label: r.label, farbe: r.color, wer: [anderer] });
    }
    return [...karte.values()];
  }, [anker, nach, index]);

  if (!anker) return <Leer text="Kein Werk in der Mitte." />;
  if (!gruppen.length) return <Leer text={`${anker.title} steht noch für sich allein.`} />;

  return (
    <div className="space-y-5">
      {gruppen.map((g) => (
        <section key={g.label}>
          <p className="mb-2 flex items-center gap-2 font-serif text-[12px] uppercase tracking-[0.18em] text-paper-400/50">
            <span className="h-2 w-2 rounded-full" style={{ background: g.farbe }} aria-hidden />
            {g.label}
          </p>
          <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {g.wer.map((e) => (
              <Kachel key={e.id} entry={e} />
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

/**
 * Rechts, Tiefe 3: das ganze Geflecht.
 *
 * Zwei Schritte weit – was mit dem Werk verbunden ist und was daran hängt.
 * Kein Graph mit Kräften und Knoten: Auf einer Handbreite ist ein
 * Kräftegraph Nebel. Hier steht, wer über wen erreichbar ist, und das ist die
 * Auskunft, die man in dieser Tiefe wirklich sucht.
 */
function Geflecht({ anker, nach, index }: Omit<RaumProps, 'ort' | 'tiefe' | 'lebende'>) {
  const wege = useMemo(() => {
    if (!anker) return [];
    const erste = relationsOf(index, anker.id);
    return erste
      .map((r) => {
        const ueber = nach.get(r.otherId);
        if (!ueber) return null;
        const weiter = relationsOf(index, ueber.id)
          .map((z) => nach.get(z.otherId))
          .filter((e): e is Entry => !!e && e.id !== anker.id);
        return { ueber, label: r.label, farbe: r.color, weiter };
      })
      .filter((x): x is NonNullable<typeof x> => !!x && x.weiter.length > 0);
  }, [anker, nach, index]);

  if (!anker) return <Leer text="Kein Werk in der Mitte." />;
  if (!wege.length) return <Leer text="Über die erste Reihe hinaus führt noch nichts." />;

  return (
    <ul className="space-y-4">
      {wege.map((w) => (
        <li key={w.ueber.id} className="border-l pl-4" style={{ borderColor: w.farbe }}>
          <p className="font-serif text-[15px] text-paper-200">{w.ueber.title}</p>
          <p className="text-[11.5px] uppercase tracking-[0.16em] text-paper-400/40">{w.label}</p>
          <p className="mt-1 font-serif text-[13px] leading-relaxed text-paper-300/70">
            führt weiter zu {w.weiter.map((e) => e.title).join(', ')}
          </p>
        </li>
      ))}
    </ul>
  );
}

/** Links, Tiefe 1: die Welt – Orte und Schauplätze. */
function Welt({ lebende }: { lebende: Entry[] }) {
  const navigate = useNavigate();
  const orte = useMemo(
    () => lebende.filter((e) => chapterOfType(e.type).id === 'welt').slice(0, 30),
    [lebende],
  );
  return (
    <div>
      <button
        type="button"
        onClick={() => navigate('/weltkarte')}
        className="mb-4 flex w-full items-center gap-3 rounded-2xl border border-gild-500/25 px-4 py-3 text-left no-tap-highlight"
      >
        <MapPin size={16} className="shrink-0 text-gild-500/70" aria-hidden />
        <span className="font-serif text-[15px] text-paper-200">Zur Weltkarte</span>
      </button>
      {orte.length ? (
        <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {orte.map((e) => (
            <Kachel key={e.id} entry={e} />
          ))}
        </ul>
      ) : (
        <Leer text="Noch kein Ort in dieser Welt." />
      )}
    </div>
  );
}

/**
 * Oben, Tiefe 1: Wissen und Zusammenhang.
 *
 * Was über das Werk *bekannt* ist – seine Art, sein Kapitel, wie stark es
 * verbunden ist, welche Felder gefüllt sind. Ausdrücklich kein Ratgeber: Hier
 * steht, was da ist, nicht, was fehlen könnte. Das Anerbieten hat seinen
 * eigenen Ort und seine eigenen Regeln.
 */
function Wissen({ anker, nach, index }: Omit<RaumProps, 'ort' | 'tiefe' | 'lebende'>) {
  if (!anker) return <Leer text="Kein Werk in der Mitte." />;
  const tpl = templateFor(anker.type);
  const kanten = relationsOf(index, anker.id);
  const gefuellt = tpl.fields.filter((f) => {
    const w = anker.fields?.[f.key];
    return Array.isArray(w) ? w.length > 0 : !!w;
  });

  return (
    <dl className="space-y-3">
      <Zeile marke="Art" wert={tpl.label} />
      <Zeile marke="Kapitel" wert={chapterOfType(anker.type).title} />
      <Zeile marke="Verbindungen" wert={`${kanten.length}`} />
      <Zeile
        marke="Ausgefüllt"
        wert={`${gefuellt.length} von ${tpl.fields.length} Feldern`}
      />
      {gefuellt.length > 0 && (
        <div className="pt-2">
          <p className="mb-2 font-serif text-[12px] uppercase tracking-[0.18em] text-paper-400/50">
            Was steht
          </p>
          <ul className="flex flex-wrap gap-1.5">
            {gefuellt.map((f) => (
              <li
                key={f.key}
                className="rounded-full border border-paper-400/20 px-3 py-1 font-serif text-[12.5px] text-paper-300/70"
              >
                {f.label}
              </li>
            ))}
          </ul>
        </div>
      )}
      {kanten.length > 0 && (
        <div className="pt-2">
          <p className="mb-2 font-serif text-[12px] uppercase tracking-[0.18em] text-paper-400/50">
            Woran es hängt
          </p>
          <ul className="space-y-1">
            {kanten.slice(0, 12).map((r) => (
              <li key={r.relation.id} className="font-serif text-[13.5px] text-paper-300/75">
                <span className="text-paper-400/45">{r.label} · </span>
                {nach.get(r.otherId)?.title ?? '—'}
              </li>
            ))}
          </ul>
        </div>
      )}
    </dl>
  );
}

/** Unten, Tiefe 1: was sich angesammelt hat – zuletzt Berührtes. */
function Notizen({ lebende }: { lebende: Entry[] }) {
  const zuletzt = useMemo(
    () => [...lebende].sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 20),
    [lebende],
  );
  if (!zuletzt.length) return <Leer text="Noch nichts gesammelt." />;
  return (
    <ul className="space-y-1.5">
      {zuletzt.map((e) => (
        <Kachel key={e.id} entry={e} breit />
      ))}
    </ul>
  );
}

/* ------------------------------------------------------------- Kleinkram -- */

function Zeile({ marke, wert }: { marke: string; wert: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-paper-400/10 pb-2">
      <dt className="font-serif text-[12px] uppercase tracking-[0.18em] text-paper-400/50">
        {marke}
      </dt>
      <dd className="font-serif text-[15px] text-paper-200">{wert}</dd>
    </div>
  );
}

function Leer({ text }: { text: string }) {
  return (
    <p className="py-10 text-center font-serif text-[14px] italic text-paper-400/40">{text}</p>
  );
}

/**
 * Ein Wesen, ein Ort, eine Notiz – mit **einer** Handlung.
 *
 * Hier standen zuerst zwei Knöpfe: aufschlagen und in die Mitte holen. Das
 * war ein Widerspruch zum Ankergesetz, und zwar ein feiner. „Aufschlagen"
 * hätte die Seite in der Mitte gezeigt, während der Anker woanders lag – die
 * sichtbare Mitte und das Werk wären auseinandergefallen, und der Doppeltipp
 * hätte einen an einen Ort gebracht, den man gar nicht mehr im Kopf hatte.
 *
 * Also nur eine Handlung, und die heißt, was sie tut: **In die Mitte holen.**
 * Sie verschiebt den Anker, holt den Blick zurück und schlägt die Seite auf –
 * alles in einem, ausdrücklich, benannt, nirgends nebenbei. Wer nur schauen
 * will, schaut; wer arbeiten will, holt sich das Werk.
 */
function Kachel({ entry, breit = false }: { entry: Entry; breit?: boolean }) {
  const navigate = useNavigate();
  const setzeAnker = useRaum((s) => s.setzeAnker);

  return (
    <li className={breit ? 'w-full' : undefined}>
      <button
        type="button"
        onClick={() => {
          setzeAnker(entry.id);
          navigate(`/eintrag/${entry.id}`);
        }}
        title="In die Mitte holen"
        className={cx(
          'group flex w-full items-center gap-2 rounded-xl border border-paper-400/15 px-3 py-2.5 text-left transition-colors hover:border-gild-500/35 no-tap-highlight',
        )}
      >
        <span className="min-w-0 flex-1">
          <span className="block truncate font-serif text-[14.5px] text-paper-200">
            {entry.title}
          </span>
          <span className="block truncate text-[11px] uppercase tracking-[0.14em] text-paper-400/35">
            {templateFor(entry.type).label}
          </span>
        </span>
        <ArrowRightLeft
          size={14}
          aria-hidden
          className="shrink-0 text-paper-400/25 transition-colors group-hover:text-gild-400"
        />
      </button>
    </li>
  );
}

/** Für die Kopfzeile: ein stilles Zeichen, dass Tiefe existiert. */
export function Tiefenmarke() {
  const tiefe = useRaum((s) => s.tiefe);
  const ort = useRaum((s) => s.ort);
  if (!tiefe) return null;
  const name = RICHTUNGEN.find((r) => r.id === ort)?.name ?? '';
  return (
    <span className="flex items-center gap-1.5 font-serif text-[11.5px] uppercase tracking-[0.18em] text-gild-500/60">
      <Sparkles size={11} aria-hidden />
      {name} {tiefe}
    </span>
  );
}
