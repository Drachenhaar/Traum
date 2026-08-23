/**
 * Die Reise.
 *
 * Man wählt eine Seite und geht von dort aus los. Kein Graph-Debugger, keine
 * Knotenliste – ein Weg, den man Schritt für Schritt entscheidet, und hinter
 * einem bleibt stehen, wo man war.
 *
 * Der ganze Bildschirm besteht aus drei Dingen:
 *
 *   **Wo man ist.** Eine Station, groß, mit ihrem eigenen Satz.
 *   **Woher man kam.** Die zurückgelegten Stationen, klein, in einer Zeile.
 *   **Wohin man kann.** Ein paar Einladungen, in ganzen Sätzen.
 *
 * Was hier absichtlich fehlt: eine Karte daneben, eine Fortschrittsanzeige,
 * eine Zurück-Taste je Schritt. Eine Reise misst man nicht, und wer umkehren
 * will, tippt auf die Station, zu der er zurück möchte.
 */

import { useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowRight, Compass, Footprints } from 'lucide-react';
import { useStudio, livingEntries } from '../../store/useStudio';
import { AppendixSheet } from './Appendix';
import { EmptyState } from '../../components/ui/EmptyState';
import { weltsicht } from '../../lib/welt/abfrage';
import { routenVon, wegeVon } from '../../lib/welt/reise';
import { templateFor } from '../../lib/templates';
import { cx } from '../../lib/utils';
import type { Entry } from '../../types';

export function ReiseSheet() {
  return (
    <AppendixSheet title="Reise" rubric="Anhang · Unterwegs">
      <Reise />
    </AppendixSheet>
  );
}

function Reise() {
  const entries = useStudio((s) => s.entries);
  const relations = useStudio((s) => s.relations);
  const [suchParams, setSuchParams] = useSearchParams();

  const sicht = useMemo(() => weltsicht(entries, relations), [entries, relations]);
  const lebende = useMemo(() => livingEntries(entries), [entries]);

  /*
   * Der Weg steht in der Adresse, nicht im Zustand.
   *
   * Damit ist eine Reise teilbar und ueberlebt das Neuladen – und, wichtiger:
   * Die Zurueck-Taste des Browsers geht einen Schritt zurueck, statt die
   * ganze Reise zu verlassen. Das ist das Verhalten, das jeder erwartet, und
   * es kostet hier keine Zeile.
   */
  const weg = (suchParams.get('weg') ?? '').split(',').filter(Boolean);
  const stationen = weg.map((id) => sicht.byId.get(id)).filter((e): e is Entry => !!e);
  const hier = stationen[stationen.length - 1];

  const setzeWeg = (ids: string[]) => setSuchParams(ids.length ? { weg: ids.join(',') } : {});

  if (!hier) return <Aufbruch entries={lebende} onStart={(id) => setzeWeg([id])} />;

  const gesehen = new Set(stationen.map((e) => e.id));
  const schritte = wegeVon(sicht, hier.id, gesehen);
  const routen = routenVon(sicht, hier.id);

  return (
    <div className="max-w-[44rem]">
      {/* ------------------------------------------------ Woher man kam */}
      {stationen.length > 1 && (
        <nav className="mb-7 flex flex-wrap items-center gap-x-1.5 gap-y-1">
          {stationen.slice(0, -1).map((e, i) => (
            <span key={e.id} className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setzeWeg(weg.slice(0, i + 1))}
                title={`Zurück zu „${e.title}“`}
                className="font-serif text-[13px] italic text-ink-faint transition-colors hover:text-gold no-tap-highlight"
              >
                {e.title}
              </button>
              <ArrowRight size={11} className="text-ink-faint/35" />
            </span>
          ))}
          <span className="font-serif text-[13px] italic text-ink-muted">{hier.title}</span>
        </nav>
      )}

      {/* ------------------------------------------------------ Wo man ist */}
      <p className="rubric">{templateFor(hier.type).label}</p>
      <h2 className="mt-1.5 font-serif text-[30px] leading-tight text-ink sm:text-[36px]">
        {hier.title}
      </h2>
      {hier.subtitle?.trim() && (
        <p className="mt-1 font-serif text-[15px] italic text-ink-muted">{hier.subtitle}</p>
      )}
      <p className="mt-4 max-w-[52ch] font-serif text-[15px] leading-relaxed text-ink-muted">
        {hier.description?.trim() ||
          (stationen.length === 1
            ? 'Von hier aus beginnt deine Reise.'
            : 'Hier bist du angekommen.')}
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-1">
        <Link
          to={`/eintrag/${hier.id}`}
          className="font-serif text-[13.5px] italic text-gold no-tap-highlight"
        >
          Diese Seite aufschlagen
        </Link>
        {stationen.length > 1 && (
          <button
            type="button"
            onClick={() => setzeWeg([hier.id])}
            className="min-h-[32px] font-serif text-[13.5px] italic text-ink-faint transition-colors hover:text-gold no-tap-highlight"
          >
            Von hier aus neu beginnen
          </button>
        )}
        <button
          type="button"
          onClick={() => setzeWeg([])}
          className="min-h-[32px] font-serif text-[13.5px] italic text-ink-faint transition-colors hover:text-gold no-tap-highlight"
        >
          Andere Reise
        </button>
      </div>

      {/* ------------------------------------------------- Wohin man kann */}
      <section className="mt-10">
        {schritte.length === 0 ? (
          <p className="max-w-[46ch] font-serif text-[15px] italic leading-relaxed text-ink-faint">
            Von hier führt kein Weg weiter – jedenfalls keiner, den du noch nicht gegangen bist.
            Das ist kein Ende der Welt, sondern ein Rand deiner Karte.
          </p>
        ) : (
          <>
            <p className="rubric">Von hier aus</p>
            <ul className="mt-3">
              {schritte.map((s) => (
                <li key={s.relationId} className="border-b border-line/70 last:border-b-0">
                  <button
                    type="button"
                    onClick={() => setzeWeg([...weg, s.ziel.id])}
                    className="group flex w-full items-baseline gap-2 py-3 text-left no-tap-highlight"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block font-serif text-[16px] leading-snug text-ink transition-colors group-hover:text-gold">
                        {s.einladung}
                      </span>
                      <span className="mt-0.5 block font-serif text-[12.5px] italic text-ink-faint">
                        {s.warum} · {templateFor(s.ziel.type).label}
                      </span>
                    </span>
                    <ArrowRight
                      size={14}
                      className="mt-1 shrink-0 text-ink-faint/30 transition-colors group-hover:text-gold"
                    />
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>

      {/* --------------------------------------------- Fertige Reisen */}
      {routen.length > 0 && (
        <section className="mt-12 border-t border-line pt-6">
          <p className="rubric">Das Buch schlägt vor</p>
          <p className="mt-1 max-w-[48ch] font-serif text-[13px] italic leading-snug text-ink-faint">
            Wege, die es beim Nachsehen gefunden hat. Antippen führt sie ganz.
          </p>
          <ul className="mt-4 space-y-4">
            {routen.map((r) => (
              <li key={r.art.id}>
                <button
                  type="button"
                  onClick={() => setzeWeg(r.stationen.map((e) => e.id))}
                  className="group block w-full text-left no-tap-highlight"
                >
                  <span className="block font-serif text-[15.5px] text-ink transition-colors group-hover:text-gold">
                    {r.art.name}
                  </span>
                  <span className="mt-0.5 block font-serif text-[12.5px] italic leading-snug text-ink-faint">
                    {r.art.verspricht}
                  </span>
                  <span className="mt-1 block font-serif text-[12.5px] text-ink-muted">
                    {r.stationen.map((e) => e.title).join(' → ')}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

/* ------------------------------------------------------------- Aufbruch ---- */

/**
 * Wo man losgeht.
 *
 * „Wähle, wessen Augen du folgen willst" – deshalb stehen Figuren und Wesen
 * oben. Das ist keine Kosmetik: Eine Reise ist eine Perspektive, und eine
 * Perspektive hat jemand, kein Ort.
 *
 * Zuerst stand hier ein Filter auf „mindestens zwei Verbindungen", damit die
 * Reise nicht nach einem Schritt endet. Der war falsch, und zwar am
 * offensichtlichsten Beispiel: Elian, der genau *eine* Verbindung hat – zu
 * seinem Zuhause – und von dort aus durch die halbe Welt führt. Wie weit man
 * kommt, entscheidet nicht der erste Schritt, sondern was dahinter liegt.
 * Eine Verbindung genügt also; nur ein loses Blatt ist kein Anfang.
 */
function Aufbruch({ entries, onStart }: { entries: Entry[]; onStart: (id: string) => void }) {
  const relIndex = useStudio((s) => s.relIndex);
  const navigate = useNavigate();
  const [frage, setFrage] = useState('');

  const grad = (e: Entry) => relIndex.neighbours.get(e.id)?.size ?? 0;

  const vorschlaege = useMemo(() => {
    const beseelt = new Set(['character', 'creature', 'animal']);
    return [...entries]
      .filter((e) => grad(e) >= 1)
      .sort(
        (a, b) =>
          Number(beseelt.has(b.type)) - Number(beseelt.has(a.type)) ||
          grad(b) - grad(a) ||
          a.title.localeCompare(b.title, 'de'),
      )
      .slice(0, 8);
  }, [entries, relIndex]);

  const gefunden = useMemo(() => {
    const q = frage.trim().toLowerCase();
    if (!q) return [];
    return entries.filter((e) => e.title.toLowerCase().includes(q)).slice(0, 8);
  }, [entries, frage]);

  if (entries.length === 0 || vorschlaege.length === 0) {
    return (
      <EmptyState
        icon={Compass}
        title="Für eine Reise braucht es Wege"
        message="Sobald ein paar Seiten miteinander verbunden sind, lässt sich von einer zur nächsten gehen. Bis dahin gibt es nichts zu bereisen – verbinde zwei Seiten, und der Weg entsteht."
        action={
          <button
            type="button"
            onClick={() => navigate('/inhalt')}
            className="inline-flex min-h-[42px] items-center rounded-full border border-gild-500/40 px-5 font-serif text-[15px] text-gold transition-colors hover:bg-gild-400/10 no-tap-highlight"
          >
            Zum Inhaltsverzeichnis
          </button>
        }
      />
    );
  }

  return (
    <div className="max-w-[42rem]">
      <p className="max-w-[46ch] font-serif text-[16px] italic leading-relaxed text-ink-muted">
        Wähle, wessen Augen du folgen willst. Von dort aus entscheidest du bei jedem Schritt selbst,
        wohin es weitergeht.
      </p>

      <label className="mt-7 flex items-center gap-2 border-b border-line pb-2">
        <Footprints size={14} className="shrink-0 text-ink-faint/50" />
        <input
          value={frage}
          onChange={(e) => setFrage(e.target.value)}
          placeholder="Eine Seite suchen"
          /* 16px, sonst zoomt iOS beim Hineintippen. */
          className="w-full border-0 bg-transparent p-0 font-serif text-[16px] text-ink outline-none placeholder:text-ink-faint/45"
        />
      </label>

      <ul className="mt-5">
        {(frage.trim() ? gefunden : vorschlaege).map((e) => (
          <li key={e.id} className="border-b border-line/70 last:border-b-0">
            <button
              type="button"
              onClick={() => onStart(e.id)}
              className="group flex w-full items-baseline gap-3 py-3 text-left no-tap-highlight"
            >
              <span className="min-w-0 flex-1">
                <span className="block font-serif text-[16.5px] leading-snug text-ink transition-colors group-hover:text-gold">
                  {e.title}
                </span>
                <span className="mt-0.5 block font-serif text-[12.5px] italic text-ink-faint">
                  {templateFor(e.type).label}
                  {grad(e) > 0 && ` · ${grad(e)} ${grad(e) === 1 ? 'Verbindung' : 'Verbindungen'}`}
                </span>
              </span>
              <span
                className={cx(
                  'mt-1 shrink-0 font-serif text-[12.5px] italic transition-colors',
                  'text-ink-faint/40 group-hover:text-gold',
                )}
              >
                aufbrechen
              </span>
            </button>
          </li>
        ))}
      </ul>

      {frage.trim() && gefunden.length === 0 && (
        <p className="mt-6 font-serif text-[14.5px] italic text-ink-faint">
          Keine Seite dieses Namens.
        </p>
      )}
    </div>
  );
}
