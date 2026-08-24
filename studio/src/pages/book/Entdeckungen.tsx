/**
 * Entdeckungen.
 *
 * Dasselbe, was eine Datenbank „Validation Errors (7)" nennen würde – nur
 * dass es hier keine Fehler sind. Es ist die eigene Welt, die zurückspricht.
 *
 * Deshalb keine roten Balken, keine Zähler in Warnfarbe, keine Liste mit
 * Häkchen zum Abarbeiten. Eine Seite, auf der steht, was aufgefallen ist, in
 * ganzen Sätzen, mit dem Weg zur betroffenen Seite daneben. Wer nichts davon
 * ändern will, ändert nichts – und die Seite hält es aus.
 *
 * Drei Dinge kann man mit einer Entdeckung tun:
 *
 *   **Ansehen** – zur Seite gehen, um die es geht. Der häufigste Fall.
 *   **Ist Absicht** – sie verschwindet und kommt nicht wieder. Eine Welt darf
 *     ungewöhnlich sein, und wer das für seinen Waldkoi entschieden hat, will
 *     nicht jedes Mal aufs Neue gefragt werden.
 *   **Nichts** – auch das ist eine Antwort.
 *
 * Was hier bewusst *nicht* passiert: Es wird nie etwas repariert. Kein
 * „automatisch beheben", kein Vorschlag, den man annimmt. Die Regeln lesen,
 * der Verfasser entscheidet und schreibt.
 */

import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { CircleDot, HelpCircle, Minus, Sparkles } from 'lucide-react';
import { useStudio } from '../../store/useStudio';
import { AppendixSheet } from './Appendix';
import { EmptyState } from '../../components/ui/EmptyState';
import { weltsicht } from '../../lib/welt/abfrage';
import { pruefeWelt, WELTREGELN, type Befund } from '../../lib/welt/regeln';
import { cx } from '../../lib/utils';

const ZEICHEN = {
  widerspruch: CircleDot,
  frage: HelpCircle,
  luecke: Minus,
} as const;

/** Die Überschrift über einer Gruppe – in der Sprache des Buches. */
const GRUPPEN: { art: Befund['art']; titel: string; unterzeile: string }[] = [
  {
    art: 'widerspruch',
    titel: 'Was sich widerspricht',
    unterzeile: 'Zwei Stellen deiner Welt sagen etwas Verschiedenes über dieselbe Sache.',
  },
  {
    art: 'frage',
    titel: 'Was Fragen aufwirft',
    unterzeile: 'Nicht falsch – aber ungewöhnlich genug, dass es eine Geschichte haben könnte.',
  },
  {
    art: 'luecke',
    titel: 'Was noch offen ist',
    unterzeile: 'Kein Fehler. Unfertige Arbeit, und die ist der Normalzustand einer Welt.',
  },
];

export function EntdeckungenSheet() {
  return (
    <AppendixSheet title="Entdeckungen" rubric="Anhang · Deine Welt">
      <Entdeckungen />
    </AppendixSheet>
  );
}

function Entdeckungen() {
  const entries = useStudio((s) => s.entries);
  const relations = useStudio((s) => s.relations);
  const images = useStudio((s) => s.images);
  const settings = useStudio((s) => s.settings);
  const updateSettings = useStudio((s) => s.updateSettings);
  const [zeigeAbsicht, setZeigeAbsicht] = useState(false);

  const alle = useMemo(
    () => pruefeWelt(weltsicht(entries, relations, images)),
    [entries, relations, images],
  );

  const absicht = useMemo(
    () => new Set(settings.entdeckungenAbsicht ?? []),
    [settings.entdeckungenAbsicht],
  );

  const offen = alle.filter((b) => !absicht.has(b.id));
  const beiseite = alle.filter((b) => absicht.has(b.id));

  const alsAbsicht = (id: string) =>
    updateSettings({ entdeckungenAbsicht: [...absicht, id] });
  const zurueckholen = (id: string) =>
    updateSettings({ entdeckungenAbsicht: [...absicht].filter((x) => x !== id) });

  /*
   * Eine junge Welt hat nichts zu entdecken, und das ist richtig so – nicht
   * jede leere Liste ist ein Mangel. Erst ab einer Handvoll Seiten lohnt das
   * Hinsehen ueberhaupt.
   */
  const seiten = entries.filter((e) => !e.deletedAt).length;

  if (seiten < 4) {
    return (
      <EmptyState
        icon={Sparkles}
        title="Deine Welt ist noch jung"
        message="Sobald ein paar Seiten miteinander verbunden sind, sieht das Buch hier nach, was zusammenpasst – und was noch offen ist. Bis dahin gibt es nichts zu entdecken, und das ist kein Mangel."
      />
    );
  }

  if (offen.length === 0 && beiseite.length === 0) {
    return (
      <EmptyState
        icon={Sparkles}
        title="Deine Welt ist in sich stimmig"
        message="Nichts widerspricht sich, nichts endet im Nichts, nichts steht ganz für sich. Das heißt nicht, dass sie fertig ist – nur, dass sie zusammenhält."
      />
    );
  }

  return (
    <div className="max-w-[46rem]">
      <p className="font-serif text-[16px] italic leading-relaxed text-ink-muted">
        {offen.length === 0
          ? 'Alles, was auffiel, hast du als Absicht gekennzeichnet.'
          : offen.length === 1
            ? 'Eine Spur in deiner Welt ist noch ungelöst.'
            : `${offen.length} ungelöste Spuren in deiner Welt.`}
      </p>
      <p className="mt-2 max-w-[52ch] font-serif text-[13.5px] italic leading-relaxed text-ink-faint">
        Nichts davon ist ein Fehler. Das Buch liest, was dasteht, und hält es gegen das, was
        ebenfalls dasteht – entscheiden tust du.
      </p>

      {GRUPPEN.map((g) => {
        const dieser = offen.filter((b) => b.art === g.art);
        if (!dieser.length) return null;
        return (
          <section key={g.art} className="mt-10">
            <p className="rubric">{g.titel}</p>
            <p className="mt-1 max-w-[52ch] font-serif text-[13px] italic leading-snug text-ink-faint">
              {g.unterzeile}
            </p>
            <ul className="mt-4 space-y-4">
              {dieser.map((b) => (
                <BefundZeile key={b.id} befund={b} onAbsicht={() => alsAbsicht(b.id)} />
              ))}
            </ul>
          </section>
        );
      })}

      {/* ------------------------------------------------ Was Absicht ist */}
      {beiseite.length > 0 && (
        <section className="mt-14 border-t border-line pt-6">
          <button
            type="button"
            onClick={() => setZeigeAbsicht((z) => !z)}
            aria-expanded={zeigeAbsicht}
            className="min-h-[40px] font-serif text-[13.5px] italic text-ink-faint transition-colors hover:text-gold no-tap-highlight"
          >
            {beiseite.length} {beiseite.length === 1 ? 'Stelle ist' : 'Stellen sind'} Absicht
            {zeigeAbsicht ? ' – zuklappen' : ' – ansehen'}
          </button>
          {zeigeAbsicht && (
            <ul className="mt-4 space-y-4 opacity-60">
              {beiseite.map((b) => (
                <BefundZeile key={b.id} befund={b} onZurueck={() => zurueckholen(b.id)} />
              ))}
            </ul>
          )}
        </section>
      )}

      {/* ------------------------------------------------ Wonach gesucht wird */}
      <section className="mt-14 border-t border-line pt-6">
        <p className="rubric mb-2">Wonach das Buch sieht</p>
        <p className="mb-4 max-w-[52ch] font-serif text-[13.5px] italic leading-relaxed text-ink-faint">
          Hinter jeder Entdeckung steht ein Satz, den ein Mensch geschrieben hat – kein Orakel.
          Hier stehen sie alle.
        </p>
        <dl className="space-y-2.5">
          {WELTREGELN.map((r) => (
            <div key={r.id}>
              <dt className="font-serif text-[14.5px] text-ink">{r.name}</dt>
              <dd className="font-serif text-[13px] italic leading-snug text-ink-muted">
                {r.beschreibung}
              </dd>
            </div>
          ))}
        </dl>
      </section>
    </div>
  );
}

function BefundZeile({
  befund,
  onAbsicht,
  onZurueck,
}: {
  befund: Befund;
  onAbsicht?: () => void;
  onZurueck?: () => void;
}) {
  const entries = useStudio((s) => s.entries);
  const Icon = ZEICHEN[befund.art];

  /*
   * Bis zu drei Wege hinein. Bei einem Sammelbefund („12 Pflanzen wachsen
   * nirgendwo") waeren zwoelf Verweise eine Wand; drei sind eine Einladung.
   */
  const ziele = befund.betrifft
    .map((id) => entries.find((e) => e.id === id && !e.deletedAt))
    .filter((e): e is NonNullable<typeof e> => !!e)
    .slice(0, 3);

  return (
    <li className="flex gap-2.5">
      <Icon
        size={14}
        strokeWidth={1.7}
        className={cx(
          'mt-[4px] shrink-0',
          befund.art === 'widerspruch' ? 'text-mahnung' : 'text-ink-faint/60',
        )}
      />
      <div className="min-w-0">
        <p className="font-serif text-[15px] leading-relaxed text-ink-muted">{befund.text}</p>
        <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1">
          {ziele.map((z) => (
            <Link
              key={z.id}
              to={`/eintrag/${z.id}`}
              className="font-serif text-[13px] italic text-gold no-tap-highlight"
            >
              {z.title} ansehen
            </Link>
          ))}
          {onAbsicht && (
            <button
              type="button"
              onClick={onAbsicht}
              className="min-h-[32px] font-serif text-[13px] italic text-ink-faint transition-colors hover:text-gold no-tap-highlight"
            >
              Ist Absicht
            </button>
          )}
          {onZurueck && (
            <button
              type="button"
              onClick={onZurueck}
              className="min-h-[32px] font-serif text-[13px] italic text-ink-faint transition-colors hover:text-gold no-tap-highlight"
            >
              Doch wieder ansehen
            </button>
          )}
        </div>
      </div>
    </li>
  );
}
