/**
 * Das Verzeichnis eines Romans.
 *
 * Der Ort „Welt" im Schreibraum – und ausdrücklich **keine Datenbankansicht**.
 * Was hier steht, steht hier, weil es im Manuskript vorkommt. Der Auftrag
 * verlangt es so: „Die Charakterseiten sollen automatisch aus dem Roman
 * wachsen. Der Autor soll diese Informationen nicht vorher manuell ausfüllen
 * müssen."
 *
 * Vier Abschnitte, und die Reihenfolge ist eine Aussage:
 *
 *   1. **Roman** – Kapitel und Szenen. Das ist das Werk; alles andere ist
 *      daraus entstanden.
 *   2. **Aus dem Text** – Namen, die im Manuskript stehen und die die Welt
 *      noch nicht kennt. Ein Griff, und sie sind da.
 *   3. **Bewohner · Orte · Gegenstände** – was die Welt kennt, mit der Zahl
 *      der Erwähnungen daneben.
 *   4. Ganz unten und leise: was in der Welt steht und im Text fehlt.
 *
 * Der zweite Abschnitt steht **vor** den anderen, obwohl er der kleinste ist.
 * Das ist Absicht: Er ist das einzige, was der Verfasser hier tun kann, und
 * die anderen sind zum Nachsehen da.
 */

import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { useStudio, livingEntries } from '../../store/useStudio';
import { asText } from '../../lib/templates';
import { istRomanTeil, romanBaum, nachOrdnung } from '../../lib/roman/struktur';
import { baueVerzeichnis } from '../../lib/roman/verzeichnis';
import { ART_NAME, ART_ZU_TYP, type Namensfund } from '../../lib/roman/namen';
import { cx } from '../../lib/utils';
import type { Entry } from '../../types';

export function Verzeichnis() {
  const entries = useStudio((s) => s.entries);
  const relIndex = useStudio((s) => s.relIndex);
  const createEntry = useStudio((s) => s.createEntry);
  const navigate = useNavigate();

  /** Was gerade angelegt wird – damit ein Doppeltipp keine zwei Figuren macht. */
  const [imGange, setImGange] = useState<string | null>(null);

  const lebend = useMemo(() => livingEntries(entries), [entries]);

  const romane = useMemo(
    () => nachOrdnung(lebend.filter((e) => e.type === 'roman')),
    [lebend],
  );

  /*
   * Das ganze Manuskript als **ein** Text.
   *
   * Aneinandergehängt und nicht Szene für Szene: Eine Figur, die in Kapitel
   * eins und in Kapitel sieben vorkommt, gehört einmal ins Verzeichnis und
   * nicht zweimal. Für „in welchen Kapiteln kommt sie vor" gibt es die
   * Charakterseite – hier zählt, *dass* sie vorkommt.
   */
  const manuskript = useMemo(
    () =>
      lebend
        .filter((e) => e.type === 'szene')
        .map((e) => asText(e.fields.manuskript))
        .join('\n\n'),
    [lebend],
  );

  const welt = useMemo(() => lebend.filter((e) => !istRomanTeil(e.type)), [lebend]);
  const verzeichnis = useMemo(() => baueVerzeichnis(manuskript, welt), [manuskript, welt]);

  const byId = useMemo(() => new Map(lebend.map((e) => [e.id, e])), [lebend]);

  /**
   * Aus einem Fund einen Eintrag machen.
   *
   * Der Titel kommt aus dem Text, sonst nichts – kein Steckbrief, keine
   * Vorlage, keine leeren Felder. Der Auftrag ist an dieser Stelle deutlich:
   * Der Verfasser soll nichts ausfüllen müssen. Was die Figur ausmacht, steht
   * schon im Manuskript; die Seite ist nur der Ort, an dem es zusammenkommt.
   */
  const anlegen = async (fund: Namensfund) => {
    if (imGange) return;
    setImGange(fund.name);
    try {
      const entry = await createEntry(ART_ZU_TYP[fund.art], { title: fund.name });
      navigate(`/eintrag/${entry.id}`);
    } finally {
      setImGange(null);
    }
  };

  const leer = manuskript.trim().length === 0;

  return (
    <div className="px-5 pb-14 pt-7 sm:px-9 sm:pt-9">
      <p className="rubric text-gild-600/70">Verzeichnis</p>
      <h1 className="mt-1.5 font-serif text-[26px] leading-tight text-ink sm:text-[32px]">
        Deine Welt
      </h1>
      <p className="mt-2 max-w-[54ch] font-serif text-[14.5px] italic leading-relaxed text-ink-faint">
        {leer
          ? 'Noch ist nichts geschrieben. Was hier steht, wächst aus deinem Text.'
          : 'Gelesen, nicht gepflegt: Was hier steht, steht in deinem Manuskript.'}
      </p>

      {/* ------------------------------------------------------- Der Roman */}
      {romane.length > 0 && (
        <section className="mt-9">
          <p className="rubric text-ink-faint">Roman</p>
          <ul className="mt-3 space-y-2.5">
            {romane.map((r) => {
              const baum = romanBaum(relIndex, byId, r.id);
              if (!baum) return null;
              return (
                <li key={r.id}>
                  <Link
                    to={`/roman/${r.id}`}
                    className="font-serif text-[16px] text-ink transition-colors hover:text-gild-700 no-tap-highlight"
                  >
                    {r.title || 'Ohne Titel'}
                  </Link>
                  {(baum.kapitel.length > 0 || baum.lose.length > 0) && (
                    <p className="mt-1 font-serif text-[13.5px] leading-relaxed text-ink-muted">
                      {[...baum.kapitel.map((k) => k.kapitel), ...baum.lose]
                        .map((k) => k.title || 'Ohne Titel')
                        .join(' · ')}
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {/* -------------------------------------------------- Aus dem Text */}
      {verzeichnis.vorschlaege > 0 && (
        <section className="mt-10">
          <p className="rubric text-gild-600/70">Aus dem Text</p>
          <p className="mt-1.5 max-w-[52ch] font-serif text-[13.5px] italic leading-relaxed text-ink-faint">
            Diese Namen stehen in deinem Manuskript und noch nicht in deiner Welt.
          </p>
          <div className="mt-4 space-y-2">
            {verzeichnis.abteilungen.flatMap((a) =>
              a.nurText.map((f) => (
                <button
                  key={`${a.id}:${f.name}`}
                  type="button"
                  disabled={imGange === f.name}
                  onClick={() => void anlegen(f)}
                  className="flex w-full items-start gap-3 rounded-sm border border-gild-600/30 px-4 py-3 text-left transition-colors hover:border-gild-600/70 hover:bg-gild-600/5 disabled:opacity-40 no-tap-highlight"
                >
                  <Plus size={15} className="mt-1 shrink-0 text-gild-600/80" />
                  <span className="min-w-0 flex-1">
                    <span className="block font-serif text-[16px] text-ink">
                      {f.name}
                      <span className="ml-2 font-sans text-[10px] uppercase tracking-[0.13em] text-gild-600/60">
                        {ART_NAME[f.art]}
                      </span>
                      <span className="ml-1.5 font-serif text-[12.5px] italic text-ink-faint">
                        {f.anzahl}×
                      </span>
                    </span>
                    {/*
                      Der Beleg. Er ist der Unterschied zwischen einem
                      Vorschlag und einer Behauptung: Wer den Satz liest,
                      entscheidet in einem Augenblick, ob das ein Name ist.
                    */}
                    <span className="mt-0.5 block truncate font-serif text-[13px] italic text-ink-faint">
                      {f.beleg}
                    </span>
                  </span>
                </button>
              )),
            )}
          </div>
        </section>
      )}

      {/* ------------------------------------------------- Die Abteilungen */}
      {verzeichnis.abteilungen.map((a) => {
        if (a.imText.length === 0 && a.nurWelt.length === 0) return null;
        return (
          <section key={a.id} className="mt-10">
            <p className="rubric text-ink-faint">{a.titel}</p>
            {a.imText.length > 0 && (
              <ul className="mt-3 space-y-1.5">
                {a.imText.map(({ entry, anzahl }) => (
                  <li key={entry.id}>
                    <Zeile entry={entry} anzahl={anzahl} />
                  </li>
                ))}
              </ul>
            )}
            {a.nurWelt.length > 0 && (
              <div className={cx(a.imText.length > 0 && 'mt-4')}>
                {/*
                  Was in der Welt steht und im Text nicht vorkommt.

                  Leise, aber da. Es ist entweder noch nicht dran oder
                  vergessen – und welches von beidem, entscheidet der
                  Verfasser und nicht das Programm.
                */}
                <p className="font-serif text-[12.5px] italic text-ink-faint/70">
                  Noch nicht im Text:
                </p>
                <p className="mt-1 font-serif text-[13.5px] leading-relaxed text-ink-faint">
                  {a.nurWelt.map((e, i) => (
                    <span key={e.id}>
                      {i > 0 && ' · '}
                      <Link
                        to={`/eintrag/${e.id}`}
                        className="transition-colors hover:text-ink no-tap-highlight"
                      >
                        {e.title || 'Ohne Titel'}
                      </Link>
                    </span>
                  ))}
                </p>
              </div>
            )}
          </section>
        );
      })}

      {leer && romane.length === 0 && (
        <p className="mt-10 font-serif text-[15px] italic leading-relaxed text-ink-faint">
          Schreib ein paar Sätze – Figuren, Orte und Dinge finden sich danach von selbst hier ein.
        </p>
      )}
    </div>
  );
}

/* ------------------------------------------------------------- Eine Zeile -- */

function Zeile({ entry, anzahl }: { entry: Entry; anzahl: number }) {
  return (
    <Link
      to={`/eintrag/${entry.id}`}
      className="flex items-baseline gap-2 no-tap-highlight"
    >
      <span className="min-w-0 truncate font-serif text-[15.5px] text-ink-muted transition-colors hover:text-ink">
        {entry.title || 'Ohne Titel'}
      </span>
      {/*
        Die Zahl der Erwähnungen – klein und ohne Balken.

        Sie ist eine Auskunft und kein Mass: Wer wissen will, wie wichtig eine
        Figur ist, liest sein Buch. Ein Fortschrittsbalken daneben machte aus
        einem Verzeichnis ein Armaturenbrett.
      */}
      <span className="shrink-0 font-serif text-[12px] italic text-ink-faint/70">{anzahl}×</span>
    </Link>
  );
}
