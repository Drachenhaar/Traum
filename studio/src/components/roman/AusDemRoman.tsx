/**
 * Was der Roman über diese Figur weiss.
 *
 * Der Auftrag verlangt für die Charakterseite eines Romans: Beziehungen,
 * wichtige Orte, wichtige Gegenstände, Kapitel, in denen er vorkommt – und
 * dazu den Satz, der alles entscheidet: **„Der Autor soll diese Informationen
 * nicht vorher manuell ausfüllen müssen."**
 *
 * Dieser Block füllt nichts aus. Er **liest**. Alles, was hier steht, steht
 * im Manuskript; wer eine Szene umschreibt, ändert damit diese Zeilen, ohne
 * sie anzufassen. Es gibt nichts zu pflegen und deshalb auch nichts, was
 * veralten kann.
 *
 * **Warum er nur im Roman erscheint.**
 * Ein Artbook hat kein Manuskript, ein Rollenspielband hat Abenteuer statt
 * Szenen. Der Block wäre dort leer – und ein leerer Block, der erklärt, warum
 * er leer ist, ist genau die Software-Anmutung, gegen die dieser Umbau
 * antritt.
 *
 * **Und warum „kommt zusammen vor" keine Beziehung ist.**
 * Zwei Figuren in derselben Szene können Geschwister sein, Feinde oder
 * einander nie begegnet. Was hier steht, ist eine Beobachtung und keine
 * Behauptung – deshalb heisst die Überschrift „Steht bei" und nicht
 * „Beziehungen".
 */

import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useStudio, livingEntries } from '../../store/useStudio';
import { asText } from '../../lib/templates';
import { elternVon, istRomanTeil } from '../../lib/roman/struktur';
import { romanspur, type Szenentext } from '../../lib/roman/verzeichnis';
import type { Entry } from '../../types';

export function AusDemRoman({ entry }: { entry: Entry }) {
  const entries = useStudio((s) => s.entries);
  const relIndex = useStudio((s) => s.relIndex);

  const lebend = useMemo(() => livingEntries(entries), [entries]);
  const byId = useMemo(() => new Map(lebend.map((e) => [e.id, e])), [lebend]);

  /* Jede Szene mit ihrem Text und dem Kapitel, in dem sie hängt. */
  const texte = useMemo<Szenentext[]>(
    () =>
      lebend
        .filter((e) => e.type === 'szene')
        .map((szene) => ({
          szene,
          kapitel: elternVon(relIndex, byId, szene.id),
          text: asText(szene.fields.manuskript),
        }))
        .filter((t) => t.text.trim().length > 0),
    [lebend, relIndex, byId],
  );

  const welt = useMemo(() => lebend.filter((e) => !istRomanTeil(e.type)), [lebend]);
  const spur = useMemo(() => romanspur(entry, welt, texte), [entry, welt, texte]);

  /*
   * Nichts im Text – dann steht hier nichts.
   *
   * Kein „Noch keine Vorkommen gefunden", kein leerer Kasten. Eine Figur, die
   * noch nicht vorkommt, ist nicht unfertig; sie ist noch nicht dran.
   */
  if (spur.szenen.length === 0) return null;

  /* Die Kapitel in Erzählreihenfolge, jedes einmal. */
  const kapitel: Entry[] = [];
  for (const s of spur.szenen) {
    if (s.kapitel && !kapitel.some((k) => k.id === s.kapitel!.id)) kapitel.push(s.kapitel);
  }

  return (
    <section className="mt-8 border-t border-line pt-6">
      <p className="rubric text-gild-600/70">Aus dem Roman</p>
      <p className="mt-1.5 font-serif text-[13px] italic leading-relaxed text-ink-faint">
        Gelesen, nicht gepflegt. {spur.anzahl}× im Manuskript.
      </p>

      {/* -------------------------------------------- Wo er vorkommt */}
      <div className="mt-4">
        <p className="font-sans text-[10px] uppercase tracking-[0.13em] text-ink-faint/80">
          {kapitel.length > 0 ? 'Kapitel' : 'Szenen'}
        </p>
        <p className="mt-1.5 font-serif text-[14.5px] leading-relaxed text-ink-muted">
          {(kapitel.length > 0 ? kapitel : spur.szenen.map((s) => s.szene)).map((k, i) => (
            <span key={k.id}>
              {i > 0 && ' · '}
              <Link
                to={`/eintrag/${k.id}`}
                className="transition-colors hover:text-ink no-tap-highlight"
              >
                {k.title || 'Ohne Titel'}
              </Link>
            </span>
          ))}
        </p>
      </div>

      {/* ------------------------------------------------ Wer daneben steht */}
      {spur.zusammenMit.length > 0 && (
        <div className="mt-5">
          <p className="font-sans text-[10px] uppercase tracking-[0.13em] text-ink-faint/80">
            Steht bei
          </p>
          <p className="mt-1.5 font-serif text-[14.5px] leading-relaxed text-ink-muted">
            {spur.zusammenMit.slice(0, 12).map((z, i) => (
              <span key={z.entry.id}>
                {i > 0 && ' · '}
                <Link
                  to={`/eintrag/${z.entry.id}`}
                  className="transition-colors hover:text-ink no-tap-highlight"
                >
                  {z.entry.title || 'Ohne Titel'}
                </Link>
                {/*
                  Die Zahl der gemeinsamen Szenen – nur ab zwei.

                  Einmal zusammen in einer Szene zu stehen heisst nichts; das
                  tut jede Figur mit jeder. Erst die Wiederholung ist eine
                  Auskunft, und nur die wird gezeigt.
                */}
                {z.szenen > 1 && (
                  <span className="ml-1 font-serif text-[11.5px] italic text-ink-faint/70">
                    {z.szenen}
                  </span>
                )}
              </span>
            ))}
          </p>
        </div>
      )}
    </section>
  );
}
