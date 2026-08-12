/**
 * Der Charakterspiegel, aufgeschlagen.
 *
 * Die schwierigste Anforderung dieser Seite ist keine Funktion, sondern eine
 * Unterscheidung: Der Leser muss jederzeit sehen, **woher ein Satz kommt**.
 * Was er selbst geschrieben hat, was gezählt wurde, was ausgelegt wurde und
 * was eine Frage ist – vier Ebenen, die nicht ineinanderlaufen dürfen.
 *
 * Gelöst mit dem leisesten Mittel, das trägt: Jeder Abschnitt trägt eine
 * Herkunftszeile in seiner eigenen Sprache, und die Deutungen stehen
 * eingerückt hinter einem Strich. Keine Abzeichen, keine Farben, keine
 * Symbole mit Erklärung darunter – das wäre eine Legende, und eine Legende
 * ist das Eingeständnis, dass man es nicht lesbar hinbekommen hat.
 *
 * Was hier **nicht** steht: eine Schaltfläche „übernehmen", die eine Deutung
 * zu Weltwissen macht. Sie war geplant und ist bewusst nicht da – dazu unten
 * mehr, an der Stelle, an der sie stünde.
 */

import { useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { UserRound } from 'lucide-react';
import { useStudio, livingEntries } from '../../store/useStudio';
import { AppendixSheet } from './Appendix';
import { EmptyState } from '../../components/ui/EmptyState';
import { charakterspiegel, type Abschnitt } from '../../lib/anerbieten/charakterspiegel';
import { gewichtVon } from '../../lib/anerbieten/beobachter';
import type { Wissensstand } from '../../lib/anerbieten/beobachtung';
import { cx } from '../../lib/utils';

/**
 * Wie ein Abschnitt sich selbst einordnet.
 *
 * In Buchsprache und nicht in Datensprache: „Das hast du geschrieben" statt
 * `canonical`. Der Leser muss den Unterschied *verstehen*, nicht nur sehen.
 */
const HERKUNFT: Record<Wissensstand, string> = {
  kanon: 'Das hast du geschrieben.',
  beobachtung: 'Das steht so in deinen Seiten – gezählt, nicht gedeutet.',
  vermutung: 'Das ist eine Auslegung. Sie gehört nicht zu deiner Welt, solange du sie nicht hineinschreibst.',
  vorschlag: 'Fragen an dich. Sie haben keine hinterlegte Antwort.',
};

export function CharakterspiegelSheet() {
  const { id } = useParams();
  const entries = useStudio((s) => s.entries);
  const relations = useStudio((s) => s.relations);

  const lebende = useMemo(() => livingEntries(entries), [entries]);
  const entry = lebende.find((e) => e.id === id);

  const bild = useMemo(
    () => (entry ? charakterspiegel(entry, lebende, relations) : undefined),
    [entry, lebende, relations],
  );
  const gewicht = useMemo(
    () => (entry ? gewichtVon(entry, { entries: lebende, relations }) : undefined),
    [entry, lebende, relations],
  );

  if (!entry || !bild) {
    return (
      <AppendixSheet title="Spiegel" rubric="Anhang">
        <EmptyState
          icon={UserRound}
          title="Diese Seite gibt es nicht"
          message="Vielleicht liegt sie im Papierkorb. Die Chronik im Anhang holt sie zurück."
        />
      </AppendixSheet>
    );
  }

  return (
    <AppendixSheet title={entry.title} rubric="Anhang · Der Spiegel">
      {!bild.tragfaehig ? (
        /*
         * Zu wenig, um etwas zu zeigen – und das wird gesagt, nicht kaschiert.
         *
         * Ein Spiegel, der aus zwei Feldern eine Deutung macht, ist genau das,
         * wovor der Auftrag warnt. Lieber die ehrliche Auskunft, dass es noch
         * nichts zu spiegeln gibt.
         */
        <div className="max-w-[44rem]">
          <p className="prose-book">
            Über {entry.title} steht bisher vor allem das, was auf{' '}
            {entry.title.endsWith('s') ? `${entry.title}'` : `${entry.title}s`} eigener Seite
            geschrieben ist. Ein Spiegel entsteht erst, wenn eine Figur anderswo vorkommt – in
            Ereignissen, neben anderen, an Orten.
          </p>
          <p className="mt-4 font-serif text-[13.5px] italic leading-relaxed text-ink-faint">
            {gewicht?.kanten ?? 0} {gewicht?.kanten === 1 ? 'Verbindung' : 'Verbindungen'},{' '}
            {gewicht?.ereignisse ?? 0}{' '}
            {gewicht?.ereignisse === 1 ? 'Ereignis' : 'Ereignisse'}. Das Buch schweigt lieber, als
            aus zu wenig etwas zu machen.
          </p>
          <Link
            to={`/eintrag/${entry.id}`}
            className="mt-6 inline-block font-serif text-[15px] text-gild-600 underline"
          >
            Zurück zu {entry.title}
          </Link>
        </div>
      ) : (
        <div className="max-w-[44rem]">
          <p className="prose-book">
            Was hier steht, hat niemand über {entry.title} behauptet. Es ist zusammengetragen aus
            dem, was du selbst geschrieben hast – und jede Zeile sagt, woher sie kommt.
          </p>

          {bild.abschnitte.map((a) => (
            <AbschnittBlock key={a.id} abschnitt={a} />
          ))}

          {/*
            Hier stuende „Als Teil des Charakters uebernehmen".

            Der Auftrag sieht sie vor, und sie fehlt mit Absicht. Eine Deutung
            mit einem Tastendruck zu Weltwissen zu machen hiesse, einen Satz in
            die Welt zu schreiben, den nicht der Verfasser formuliert hat – und
            danach steht er dort, ununterscheidbar von allem anderen, und
            niemand weiss mehr, dass ein Programm ihn geschrieben hat.

            Der Weg dorthin fuehrt ueber die Seite selbst: Wer eine Beobachtung
            fuer wahr haelt, schreibt sie in seinen eigenen Worten auf. Das ist
            ein Satz mehr Arbeit und der ganze Unterschied zwischen einer Welt,
            die jemandem gehoert, und einer, die mit ihm ausgehandelt wurde.
          */}
          <p className="mt-12 border-t border-paper-300/60 pt-5 font-serif text-[13.5px] italic leading-relaxed text-ink-faint">
            Nichts davon steht in deiner Welt. Wenn etwas davon stimmt, schreib es auf{' '}
            <Link to={`/eintrag/${entry.id}`} className="text-gild-600 underline">
              {entry.title}s Seite
            </Link>{' '}
            – in deinen Worten. Dann gehört es dazu.
          </p>
        </div>
      )}
    </AppendixSheet>
  );
}

function AbschnittBlock({ abschnitt }: { abschnitt: Abschnitt }) {
  const gedeutet = abschnitt.stand === 'vermutung';
  return (
    <section className="mt-10">
      <h2 className="font-serif text-[19px] text-ink">{abschnitt.titel}</h2>
      <p className="mt-1 font-serif text-[12.5px] italic leading-snug text-ink-faint">
        {HERKUNFT[abschnitt.stand]}
      </p>

      <ul
        className={cx(
          'mt-4 space-y-2.5',
          /* Deutungen stehen eingerueckt hinter einem Strich – sichtbar anders. */
          gedeutet && 'border-l-2 border-paper-400/40 pl-4',
        )}
      >
        {abschnitt.punkte.map((p, i) => (
          <li key={i}>
            <p
              className={cx(
                'font-serif leading-relaxed',
                gedeutet ? 'text-[14.5px] italic text-ink-muted' : 'text-[15.5px] text-ink',
              )}
            >
              {p.text}
            </p>
            {/*
              Die Belege stehen offen und nicht hinter einem Aufklapper.

              Bei einem einzelnen Anerbieten waeren sie zugeklappt richtig – da
              stoert die Herkunft beim Lesen. Hier ist die Herkunft der Inhalt:
              Wer den Spiegel aufschlaegt, will genau wissen, woraus das Bild
              entstanden ist.
            */}
            {p.belege.length > 0 && (
              <p className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5">
                {p.belege.map((b) => (
                  <Link
                    key={b.entryId + b.warum}
                    to={`/eintrag/${b.entryId}`}
                    className="font-serif text-[12.5px] text-ink-faint underline decoration-paper-400/50 underline-offset-2 transition-colors hover:text-gild-600 no-tap-highlight"
                  >
                    {b.warum}
                  </Link>
                ))}
              </p>
            )}
          </li>
        ))}
      </ul>

      <p className="mt-3 font-serif text-[12px] italic text-ink-faint/70">{abschnitt.herkunft}</p>
    </section>
  );
}
