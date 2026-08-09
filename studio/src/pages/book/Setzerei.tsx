/**
 * Die Setzerei.
 *
 * Man legt ein geschriebenes Blatt ein – etwa aus ChatGPT – und das Buch setzt
 * daraus eine Seite. Links das Manuskript, rechts der Andruck: so wird die
 * Seite aussehen, bevor sie ins Buch kommt.
 *
 * Alles geschieht auf diesem Gerät. Der Text wird nirgendwohin geschickt.
 */

import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Check, ChevronDown, ClipboardCopy, FileInput, Wand2 } from 'lucide-react';
import { useStudio, livingEntries } from '../../store/useStudio';
import { transcribe, promptTemplateFor, blankTemplateFor, angabenFor } from '../../lib/transcribe';
import { templateFor, templatesByFamily } from '../../lib/templates';
import { relationType } from '../../lib/relations';
import { chapterOfType } from '../../lib/book';
import { AppendixSheet } from './Appendix';
import { cx } from '../../lib/utils';

export function Setzerei() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const entries = useStudio((s) => s.entries);
  const settings = useStudio((s) => s.settings);
  const createEntry = useStudio((s) => s.createEntry);
  const addRelation = useStudio((s) => s.addRelation);
  const notify = useStudio((s) => s.notify);

  const [text, setText] = useState('');
  /** Leer = der Erkennung folgen; sonst die Wahl des Nutzers. */
  const [chosenType, setChosenType] = useState<string>(params.get('typ') ?? '');
  const [skipped, setSkipped] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  /** Die volle Typenliste bleibt zu, bis jemand sie wirklich braucht. */
  const [typenOffen, setTypenOffen] = useState(false);

  const living = useMemo(() => livingEntries(entries), [entries]);

  /*
   * Das Lesen des Manuskripts geschieht mitten im Rendern. Wirft es, reisst
   * es die ganze Setzerei mit – genau so verschwand das Buch auf aelteren
   * iPhones hinter einer leeren Seite. Ein unleserliches Manuskript ist aber
   * kein Grund, den Raum zu verlassen: Der eingegebene Text bleibt stehen,
   * und daneben steht, was schiefging.
   */
  const [gelesen, leseFehler] = useMemo<[ReturnType<typeof transcribe> | null, string]>(() => {
    if (!text.trim()) return [null, ''];
    try {
      return [transcribe(text, living, chosenType || undefined), ''];
    } catch (err) {
      const e = err as Error;
      return [null, `${e?.name ?? 'Fehler'}: ${e?.message ?? String(err)}`];
    }
  }, [text, living, chosenType]);

  const result = gelesen;

  const activeType = chosenType || result?.suggestedType || 'page';
  const tpl = templateFor(activeType);
  const families = useMemo(() => templatesByFamily(), []);

  const copyPrompt = async () => {
    const prompt = promptTemplateFor(activeType, settings.worldName);
    try {
      await navigator.clipboard.writeText(prompt);
      notify('Vorlage kopiert – jetzt in ChatGPT einsetzen.', 'success');
    } catch {
      notify('Kopieren nicht möglich. Die Vorlage steht unten zum Markieren.', 'error');
    }
  };

  const commit = async () => {
    if (!result || !result.title.trim()) {
      notify('Ohne Titel lässt sich keine Seite setzen.', 'error');
      return;
    }
    setBusy(true);
    try {
      const entry = await createEntry(activeType, {
        title: result.title.trim(),
        subtitle: result.subtitle,
        category: result.category,
        description: result.description,
        beginn: result.beginn,
        ende: result.ende,
        tags: result.tags,
        fields: result.fields,
        blocks: result.blocks,
        ...(result.status ? { status: result.status } : {}),
      });

      for (const mention of result.mentions) {
        if (skipped.has(mention.entryId)) continue;
        addRelation(entry.id, mention.entryId, mention.relationType ?? 'related');
      }

      notify(`„${entry.title}“ steht jetzt im Buch.`, 'success');
      navigate(`/eintrag/${entry.id}`);
    } catch (err) {
      /*
       * Ohne dieses `catch` verliess ein Fehler die Setzerei ungefangen und
       * kam erst am Fenster an – wo Safari ihn zu einem blossen
       * „Script error." verkuerzt und die Ursache verschweigt. Hier ist der
       * Fehler noch vollstaendig, und der Leser bleibt in der Setzerei
       * stehen statt vor einer leeren Seite.
       */
      const e = err as Error;
      notify(`Die Seite liess sich nicht setzen: ${e?.name ?? 'Fehler'} – ${e?.message ?? String(err)}`, 'error');
    } finally {
      setBusy(false);
    }
  };

  const linked = result ? result.mentions.filter((m) => !skipped.has(m.entryId)).length : 0;

  /*
   * Die Angaben, die diese Seite kennt – und welche davon im Manuskript
   * bereits stehen. Bisher stand diese Auskunft nur im Platzhalter, und der
   * verschwand beim ersten Tastendruck: Man musste sich jedes Feld merken,
   * genau dann, wenn man es brauchte. Jetzt bleibt die Liste stehen und
   * hakt beim Schreiben ab, was schon gesetzt ist.
   */
  const angaben = useMemo(() => angabenFor(activeType), [activeType]);

  const erkannt = useMemo(() => {
    const da = new Set<string>();
    if (!result) return da;
    if (result.title.trim()) da.add('#title');
    if (result.subtitle?.trim()) da.add('#subtitle');
    if (result.category?.trim()) da.add('#category');
    if (result.description?.trim()) da.add('#description');
    if (result.tags.length) da.add('#tags');
    if (result.beginn.trim()) da.add('#beginn');
    if (result.ende.trim()) da.add('#ende');
    for (const [key, wert] of Object.entries(result.fields)) {
      const leer =
        wert == null ||
        wert === '' ||
        wert === false ||
        (Array.isArray(wert) && wert.length === 0);
      if (!leer) da.add(key);
    }
    return da;
  }, [result]);

  /*
   * Das Gerüst kommt an den Anfang, der vorhandene Text bleibt darunter
   * stehen. Nichts geht verloren – auch dann nicht, wenn schon etwas
   * geschrieben war.
   */
  const insertTemplate = () => {
    const geruest = blankTemplateFor(activeType);
    setText((alt) => (alt.trim() ? `${geruest}\n\n${alt}` : `${geruest}\n\n`));
  };

  return (
    <AppendixSheet title="Setzerei" rubric="Anhang · Eine Seite einlegen">
      <div className="grid gap-10 lg:grid-cols-2">
        {/* ------------------------------------------------------ Manuskript */}
        <div>
          <p className="rubric mb-2">Das Manuskript</p>
          <p className="mb-4 font-serif text-[14px] italic leading-relaxed text-ink-muted">
            Text einfügen – aus ChatGPT, aus einer Notiz, aus einem Dokument. Das Buch liest
            Überschriften, „Feld: Wert“-Zeilen, Aufzählungen und Farbwerte und füllt die Seite
            selbst aus. Nichts verlässt dieses Gerät.
          </p>

          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={'Titel: Waldkoi\nKategorie: Kreatur\nArt: Schleierkarpfen\nGröße: 40 cm\nVerhalten: schwimmt durch Luft wie durch Wasser\nFarbpalette: Moosgrün #55604A, Messing #A8853F\n\nDer Waldkoi zieht in kleinen Schwärmen durch den Nebelwald …'}
            /*
             * Acht Zeilen statt sechzehn. Auf dem Telefon schob ein Feld
             * dieser Hoehe die Vorlage darunter aus dem Blick – man schrieb
             * oben und haette unten nachsehen muessen. Am Schreibtisch bleibt
             * die alte Hoehe, dort ist Platz genug.
             */
            rows={8}
            /* 16px auf dem Telefon – sonst zoomt Safari beim Hineintippen,
               und das ausgerechnet in dem Feld, in das man am meisten tippt. */
            className="w-full resize-y rounded-[2px] border border-paper-400/70 bg-paper-50/70 px-4 py-3 font-mono text-[16px] leading-relaxed text-ink outline-none transition-colors placeholder:text-ink-faint/60 focus:border-gild-500/60 sm:text-[13.5px] lg:min-h-[24rem]"
          />

          {/*
           * Die bleibende Vorlage.
           *
           * Sie steht bewusst direkt unter dem Schreibfeld und nicht in der
           * Randspalte: Auf einem Telefon gibt es keine Randspalte, und
           * gebraucht wird sie genau dort, wo geschrieben wird.
           */}
          <section className="mt-5 border-t border-paper-300/70 pt-4">
            <div className="mb-2.5 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2">
              <p className="rubric">Was „{tpl.label}“ kennt</p>
              <button
                type="button"
                onClick={insertTemplate}
                className="inline-flex min-h-[34px] items-center gap-1.5 font-serif text-[13.5px] italic text-gild-600 transition-colors hover:text-gild-500 no-tap-highlight"
              >
                <Wand2 size={14} /> Gerüst einsetzen
              </button>
            </div>

            <ul className="space-y-[5px]">
              {angaben.map((a) => {
                const da = erkannt.has(a.key);
                return (
                  <li key={a.key} className="flex items-baseline gap-2">
                    {/* Ein Haken, sobald die Angabe im Manuskript steht – sonst ein blasser Punkt. */}
                    <span
                      aria-hidden
                      className={cx(
                        'mt-[7px] h-[5px] w-[5px] shrink-0 rounded-full transition-colors',
                        da ? 'bg-gild-500' : 'bg-paper-400/70',
                      )}
                    />
                    <span
                      className={cx(
                        'font-serif text-[14.5px] leading-snug',
                        da ? 'text-ink' : 'text-ink-muted',
                      )}
                    >
                      {a.label}
                      {a.hint && (
                        <span className="text-ink-faint/80"> – {a.hint}</span>
                      )}
                    </span>
                  </li>
                );
              })}
            </ul>
          </section>

          {/*
            Die Wahl der Art.

            Vorher standen hier siebenundzwanzig Knöpfe auf einmal – auf einem
            Telefon eine Wand, durch die man scrollt, statt einer Auswahl, die
            man trifft. Fast immer erkennt die Setzerei die Art ohnehin richtig;
            wer das nicht bestätigen muss, soll die Liste gar nicht sehen.

            Also: die Erkennung, daneben die aktuelle Wahl – und der Rest erst
            auf Verlangen, nach Familien geordnet statt in einem Haufen.
          */}
          <div className="mt-5">
            <p className="rubric mb-2">Als was soll es gesetzt werden?</p>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <TypeChip
                label={
                  result?.suggestedType
                    ? `Erkannt: ${templateFor(result.suggestedType).label}`
                    : 'Automatisch'
                }
                active={chosenType === ''}
                onClick={() => setChosenType('')}
              />
              {chosenType && (
                <TypeChip label={tpl.label} active onClick={() => setChosenType('')} />
              )}
              <button
                type="button"
                onClick={() => setTypenOffen((o) => !o)}
                aria-expanded={typenOffen}
                className="inline-flex min-h-[38px] items-center gap-1 font-serif text-[13.5px] italic text-gild-600 transition-colors hover:text-gild-500 no-tap-highlight"
              >
                {typenOffen ? 'Weniger' : 'Andere Art wählen'}
                <ChevronDown
                  size={13}
                  className={cx('transition-transform duration-300', typenOffen && 'rotate-180')}
                />
              </button>
            </div>

            {typenOffen && (
              <div className="mt-4 space-y-3.5 border-t border-paper-300/60 pt-4">
                {families.map((family) => (
                  <section key={family.family}>
                    <p className="mb-1.5 font-serif text-[12px] italic text-ink-faint">
                      {family.label}
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {family.items.map((item) => (
                        <TypeChip
                          key={item.type}
                          label={item.label}
                          active={chosenType === item.type}
                          onClick={() => {
                            setChosenType(item.type);
                            setTypenOffen(false);
                          }}
                        />
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            )}
          </div>

          <div className="mt-6 border-t border-paper-300/70 pt-4">
            <button
              type="button"
              onClick={() => void copyPrompt()}
              className="inline-flex min-h-[40px] items-center gap-2 rounded-full border border-gild-500/35 px-4 font-serif text-[14px] text-gild-600 transition-colors hover:bg-gild-400/10 no-tap-highlight"
            >
              <ClipboardCopy size={15} /> Vorlage für ChatGPT kopieren
            </button>
            <p className="mt-2 font-serif text-[13px] italic leading-relaxed text-ink-faint">
              Der Prompt fragt genau die Felder ab, die „{tpl.label}“ kennt. Die Antwort lässt sich
              vollständig hier einfügen.
            </p>
          </div>
        </div>

        {/* ---------------------------------------------------------- Andruck */}
        <div>
          <p className="rubric mb-2">Der Andruck</p>

          {leseFehler ? (
            <div className="rounded-[2px] border border-dashed border-paper-400/70 px-6 py-10">
              <p className="font-serif text-[15px] italic leading-relaxed text-ink-muted">
                Dieses Manuskript liess sich nicht lesen. Der Text links bleibt unangetastet.
              </p>
              <pre className="mt-4 whitespace-pre-wrap break-words font-mono text-[11px] leading-relaxed text-ink-faint/80">
                {leseFehler}
              </pre>
            </div>
          ) : !result ? (
            <div className="rounded-[2px] border border-dashed border-paper-400/70 px-6 py-14 text-center">
              <FileInput size={22} className="mx-auto mb-3 text-ink-faint/50" strokeWidth={1.5} />
              <p className="font-serif text-[15px] italic text-ink-muted">
                Sobald links Text steht, erscheint hier die Seite.
              </p>
            </div>
          ) : (
            <>
              {/* Die Seite, wie sie im Buch stehen wird */}
              <div className="paper-sheet rounded-[2px] px-6 py-6 shadow-[0_2px_16px_-10px_rgba(60,44,26,0.6)]">
                <p className="rubric">{tpl.label}</p>
                <h2 className="mt-1.5 font-serif text-[26px] leading-tight text-ink">
                  {result.title || <span className="text-ink-faint/60">Ohne Titel</span>}
                </h2>
                {result.subtitle && (
                  <p className="mt-1 font-serif text-[15px] italic text-ink-muted">
                    {result.subtitle}
                  </p>
                )}
                {/* Die Lebenszeit, wie sie später unter dem Titel stehen wird. */}
                {(result.beginn || result.ende) && (
                  <p className="mt-1.5 font-serif text-[13px] tracking-[0.06em] text-ink-faint">
                    {result.beginn && result.ende
                      ? `${result.beginn} – ${result.ende}`
                      : result.beginn
                        ? `seit ${result.beginn}`
                        : `bis ${result.ende}`}
                  </p>
                )}

                <span aria-hidden className="rule-gild mt-3 block w-20 opacity-70" />

                {result.description && (
                  <p className="prose-book mt-4 text-[15px]">{result.description}</p>
                )}

                {result.matched.length > 0 && (
                  <dl className="mt-5 space-y-1.5">
                    {result.matched.map((row, i) => (
                      <div key={i} className="flex gap-3 leading-snug">
                        <dt className="rubric w-[36%] shrink-0 pt-[3px] text-right">
                          {row.fieldLabel}
                        </dt>
                        <dd className="min-w-0 flex-1 truncate font-serif text-[14px] text-ink">
                          {row.value}
                        </dd>
                      </div>
                    ))}
                  </dl>
                )}

                {result.tags.length > 0 && (
                  <p className="mt-4 font-serif text-[13px] italic text-ink-muted">
                    {result.tags.join(' · ')}
                  </p>
                )}
              </div>

              {/* Was das Buch verstanden hat */}
              <p className="mt-4 font-serif text-[13px] italic leading-relaxed text-ink-muted">
                {result.matched.length} {result.matched.length === 1 ? 'Feld' : 'Felder'} zugeordnet
                {result.blocks.length > 0 && `, ${result.blocks.length} Textblöcke übernommen`}
                {result.unmatched.length > 0 &&
                  ` · ${result.unmatched.length} nicht zugeordnet (kommen als Notiz auf die Seite)`}
                . Kapitel: {chapterOfType(activeType).title}.
              </p>

              {/* Gefundene Verbindungen */}
              {result.mentions.length > 0 && (
                <section className="mt-6 border-t border-paper-300/70 pt-4">
                  <p className="rubric mb-1">Im Text erwähnt</p>
                  <p className="mb-3 font-serif text-[13px] italic text-ink-muted">
                    Diese Seiten gibt es bereits. Angehakte werden mit der neuen Seite verbunden.
                  </p>
                  <ul className="space-y-1">
                    {result.mentions.map((mention) => {
                      const on = !skipped.has(mention.entryId);
                      const rel = relationType(mention.relationType ?? 'related');
                      return (
                        <li key={mention.entryId}>
                          <button
                            type="button"
                            onClick={() =>
                              setSkipped((prev) => {
                                const next = new Set(prev);
                                if (on) next.add(mention.entryId);
                                else next.delete(mention.entryId);
                                return next;
                              })
                            }
                            className="flex w-full items-baseline gap-2.5 py-1 text-left no-tap-highlight"
                          >
                            <span
                              className={cx(
                                'mt-[3px] grid h-[15px] w-[15px] shrink-0 place-items-center rounded-[2px] border transition-colors',
                                on
                                  ? 'border-gild-500/70 bg-gild-400/25 text-gild-600'
                                  : 'border-paper-400/80',
                              )}
                            >
                              {on && <Check size={11} strokeWidth={3} />}
                            </span>
                            <span className="min-w-0">
                              <span className="font-serif text-[15px] text-ink">{mention.title}</span>
                              <span className="ml-2 font-serif text-[12.5px] italic text-ink-faint">
                                {rel.label} · {mention.via}
                              </span>
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              )}

              <button
                type="button"
                onClick={() => void commit()}
                disabled={busy || !result.title.trim()}
                className="mt-7 inline-flex min-h-[46px] w-full items-center justify-center gap-2 rounded-full border border-gild-500/50 bg-gild-400/12 px-6 font-serif text-[16px] text-gild-600 transition-colors hover:bg-gild-400/22 disabled:opacity-40 no-tap-highlight"
              >
                <Wand2 size={17} />
                {busy ? 'Wird gesetzt …' : 'Ins Buch übernehmen'}
                {linked > 0 && !busy && (
                  <span className="text-[13px] italic">
                    · {linked} {linked === 1 ? 'Verbindung' : 'Verbindungen'}
                  </span>
                )}
              </button>
            </>
          )}
        </div>
      </div>
    </AppendixSheet>
  );
}

function TypeChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(
        'inline-flex min-h-[32px] items-center rounded-full border px-3 font-serif text-[13.5px] transition-colors no-tap-highlight',
        active
          ? 'border-gild-500/60 bg-gild-400/15 text-ink'
          : 'border-paper-400/70 text-ink-muted hover:border-gild-500/40 hover:text-ink',
      )}
    >
      {label}
    </button>
  );
}
