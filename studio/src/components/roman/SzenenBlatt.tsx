/**
 * „Diese Szene“ – das Blatt, das neben dem Manuskript aufgeht.
 *
 * Es liegt bewusst *neben* dem Text und nicht darueber: Der Editor bleibt
 * eingehaengt, waehrend es offen ist. Deshalb steht der Cursor beim
 * Schliessen genau dort, wo er stand, und die Ansicht ist nicht gesprungen.
 * Eine Modalbox haette den Text kurz weggenommen – und jedes Mal, wenn man
 * einen Ort nachschlaegt, ein Stueck Schreibfluss.
 *
 * Was hier steht, ist alles vorhandene Welt. Nichts wird hier neu erfunden,
 * und nichts wird ohne Knopfdruck gespeichert.
 */

import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, ChevronRight, Plus, X } from 'lucide-react';
import type { Entry } from '../../types';
import { ENTRY_STATUSES } from '../../types';
import { useStudio, livingEntries } from '../../store/useStudio';
import { relationType } from '../../lib/relations';
import { templateFor } from '../../lib/templates';
import { szeneKontext } from '../../lib/roman/struktur';
import { liesVorschlag, type Randnotizen } from '../../lib/roman/randnotizen';
import { EntryLinkPicker } from '../entry/EntryLinkPicker';
import { SelectInput, TagInput, TextInput } from '../ui/Fields';
import { cx } from '../../lib/utils';

export function SzenenBlatt({
  szene,
  notizen,
  offen,
  onSchliessen,
}: {
  szene: Entry;
  /**
   * Schon gerechnet, im Schreibraum, aus dem beruhigten Text.
   *
   * Nicht hier drin: Der Knopf, der dieses Blatt oeffnet, traegt die Zahl der
   * Notizen – also muessen sie auch dann vorliegen, wenn das Blatt zu ist.
   */
  notizen: Randnotizen;
  offen: boolean;
  onSchliessen: () => void;
}) {
  const alleEintraege = useStudio((s) => s.entries);
  const relIndex = useStudio((s) => s.relIndex);
  const addRelation = useStudio((s) => s.addRelation);
  const setSingleRelation = useStudio((s) => s.setSingleRelation);
  const removeRelation = useStudio((s) => s.removeRelation);
  const updateEntry = useStudio((s) => s.updateEntry);
  const notify = useStudio((s) => s.notify);

  const entries = useMemo(() => livingEntries(alleEintraege), [alleEintraege]);
  const byId = useMemo(() => new Map(entries.map((e) => [e.id, e])), [entries]);
  const kontext = useMemo(
    () => szeneKontext(relIndex, byId, szene.id),
    [relIndex, byId, szene.id],
  );

  const [ignoriert, setIgnoriert] = useState<Set<string>>(new Set());
  const [waehle, setWaehle] = useState<'ort' | 'pov' | 'figuren' | null>(null);

  const vorschlaege = notizen.vorschlaege.filter((v) => !ignoriert.has(v.id));

  return (
    <>
      {/*
        Auf dem Telefon ein Blatt von unten, am Schreibtisch eines von rechts.
        Beides ohne Verdunkelung des Textes: Er soll lesbar bleiben, waehrend
        man nachschlaegt – man schreibt ja an ihm weiter.
      */}
      <aside
        aria-hidden={!offen}
        className={cx(
          'fixed inset-x-0 bottom-0 z-40 max-h-[72vh] sm:inset-y-0 sm:left-auto sm:right-0 sm:max-h-none sm:w-[23rem]',
          'flex flex-col overflow-hidden border-paper-300/80 bg-cream-50',
          'border-t sm:border-l sm:border-t-0',
          'shadow-[0_-14px_40px_-20px_rgba(60,44,26,0.45)] sm:shadow-[-14px_0_40px_-20px_rgba(60,44,26,0.45)]',
          'transition-[transform,visibility] duration-300 ease-out motion-reduce:transition-none',
          /*
            Zugeklappt wirklich weg – nicht nur aus dem Bild geschoben.
            `visibility: hidden` nimmt das Blatt aus der Tabreihenfolge und aus
            der Vorlesereihenfolge; ohne das fuehrt die Tabtaste mitten im Satz
            in ein Blatt, das niemand sieht. Die Verzoegerung beim Schliessen
            laesst es erst zu Ende gleiten.
          */
          offen
            ? 'visible translate-y-0 sm:translate-x-0'
            : 'invisible delay-300 translate-y-full sm:translate-y-0 sm:translate-x-full',
        )}
      >
        <header className="flex shrink-0 items-center justify-between border-b border-paper-300/60 px-4 py-3">
          <p className="rubric">Diese Szene</p>
          <button
            type="button"
            onClick={onSchliessen}
            aria-label="Blatt schließen"
            className="grid h-9 w-9 place-items-center text-ink-faint/45 transition-colors hover:text-ink no-tap-highlight"
          >
            <X size={16} />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto scroll-slim px-4 py-4">
          {/* ------------------------------------------------ Verankerung */}
          <Zeile label="Perspektive">
            <Wahl
              wert={kontext.pov}
              leer="Niemandes Sicht"
              onWaehlen={() => setWaehle('pov')}
              onLoesen={() => setSingleRelation(szene.id, 'pov', null)}
            />
          </Zeile>

          <Zeile label="Schauplatz">
            <Wahl
              wert={kontext.ort}
              leer="Kein Ort"
              onWaehlen={() => setWaehle('ort')}
              onLoesen={() => setSingleRelation(szene.id, 'plays_at', null)}
            />
          </Zeile>

          <Zeile label="Weltzeit">
            <TextInput
              value={szene.beginn ?? ''}
              placeholder="1038"
              onChange={(e) => updateEntry(szene.id, { beginn: e.target.value })}
            />
            <p className="mt-1 font-serif text-[12px] italic leading-relaxed text-ink-faint">
              Wann in der Welt – nicht das wievielte Kapitel. Eine Rückblende darf
              früher liegen als alles davor.
            </p>
          </Zeile>

          <Zeile label="Wer ist dabei">
            <div className="flex flex-wrap gap-1.5">
              {kontext.figuren.map((f) => (
                <span key={f.id} className="chip pr-1">
                  <Link to={`/eintrag/${f.id}`} className="text-ink hover:text-brass-600">
                    {f.title}
                  </Link>
                  <button
                    type="button"
                    aria-label={`${f.title} entfernen`}
                    onClick={() => {
                      const rel = (relIndex.out.get(f.id) ?? []).find(
                        (r) => r.toId === szene.id && r.type === 'appears_in',
                      );
                      if (rel) removeRelation(rel.id);
                    }}
                    className="grid h-7 w-7 place-items-center rounded-full text-ink-faint hover:bg-cream-300 hover:text-ink"
                  >
                    <X size={12} />
                  </button>
                </span>
              ))}
              <button type="button" className="chip hover:bg-cream-200" onClick={() => setWaehle('figuren')}>
                <Plus size={12} /> Figur
              </button>
            </div>
          </Zeile>

          <Zeile label="Handlungsfäden">
            <TagInput
              value={Array.isArray(szene.fields.faeden) ? szene.fields.faeden : []}
              onChange={(v) => updateEntry(szene.id, { fields: { ...szene.fields, faeden: v } })}
            />
          </Zeile>

          <Zeile label="Stand">
            <SelectInput
              value={szene.status}
              onChange={(e) => updateEntry(szene.id, { status: e.target.value as Entry['status'] })}
            >
              {ENTRY_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </SelectInput>
          </Zeile>

          {/* ------------------------------------------------- Randnotizen */}
          {notizen.widersprueche.length > 0 && (
            <Abschnitt titel="Die Welt sagt etwas anderes">
              {notizen.widersprueche.map((w) => (
                <div key={w.entry.id} className="mb-2.5 last:mb-0">
                  <p className="font-serif text-[14px] leading-relaxed text-ink">{w.text}</p>
                  <Link
                    to={`/eintrag/${w.entry.id}`}
                    className="mt-0.5 inline-flex items-center gap-1 font-serif text-[12.5px] text-ink-faint transition-colors hover:text-gild-600"
                  >
                    Nachsehen <ChevronRight size={11} />
                  </Link>
                </div>
              ))}
              <p className="mt-2 font-serif text-[12px] italic leading-relaxed text-ink-faint/80">
                Kein Fehler – vielleicht ist es eine Rückblende. Nur ein Hinweis.
              </p>
            </Abschnitt>
          )}

          {vorschlaege.length > 0 && (
            <Abschnitt titel="Neue mögliche Weltinformation">
              {vorschlaege.map((v) => (
                <div key={v.id} className="mb-3.5 last:mb-0">
                  <p className="font-serif text-[14.5px] text-ink">{liesVorschlag(v, byId)}</p>
                  <p className="mt-0.5 font-serif text-[12.5px] italic leading-relaxed text-ink-faint">
                    „{v.satz}“
                  </p>
                  <div className="mt-1.5 flex gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        addRelation(v.vonId, v.nachId, v.typ);
                        setIgnoriert((s) => new Set(s).add(v.id));
                        notify(
                          `${byId.get(v.vonId)?.title} ${relationType(v.typ).label} ${byId.get(v.nachId)?.title}`,
                          'success',
                        );
                      }}
                      className="inline-flex min-h-[32px] items-center gap-1 rounded-full border border-gild-500/40 px-3 font-serif text-[13px] text-gild-600 transition-colors hover:bg-gild-400/10 no-tap-highlight"
                    >
                      <Check size={12} /> Übernehmen
                    </button>
                    <button
                      type="button"
                      onClick={() => setIgnoriert((s) => new Set(s).add(v.id))}
                      className="inline-flex min-h-[32px] items-center rounded-full px-3 font-serif text-[13px] text-ink-faint transition-colors hover:text-ink no-tap-highlight"
                    >
                      Ignorieren
                    </button>
                  </div>
                </div>
              ))}
            </Abschnitt>
          )}

          {notizen.vorkommen.length > 0 && (
            <Abschnitt titel={`${notizen.vorkommen.length} bekannte Weltbestandteile`}>
              <div className="flex flex-wrap gap-1.5">
                {notizen.vorkommen.map((v) => (
                  <Link key={v.entry.id} to={`/eintrag/${v.entry.id}`} className="chip hover:bg-cream-200">
                    {v.entry.title}
                    <span className="text-ink-faint/60">{templateFor(v.entry.type).label}</span>
                  </Link>
                ))}
              </div>
              <p className="mt-2 font-serif text-[12px] italic leading-relaxed text-ink-faint/80">
                Im Text erkannt, weil sie im Buch stehen. Rein durch Namensvergleich –
                niemand liest hier mit.
              </p>
            </Abschnitt>
          )}
        </div>
      </aside>

      {/* -------------------------------------------------------- Auswahl */}
      <EntryLinkPicker
        open={waehle === 'pov'}
        onClose={() => setWaehle(null)}
        title="Aus wessen Sicht?"
        selected={kontext.pov ? [kontext.pov.id] : []}
        excludeId={szene.id}
        onChange={(ids) => setSingleRelation(szene.id, 'pov', ids[ids.length - 1] ?? null)}
      />
      <EntryLinkPicker
        open={waehle === 'ort'}
        onClose={() => setWaehle(null)}
        title="Wo spielt die Szene?"
        selected={kontext.ort ? [kontext.ort.id] : []}
        excludeId={szene.id}
        onChange={(ids) => setSingleRelation(szene.id, 'plays_at', ids[ids.length - 1] ?? null)}
      />
      <EntryLinkPicker
        open={waehle === 'figuren'}
        onClose={() => setWaehle(null)}
        title="Wer ist dabei?"
        selected={kontext.figuren.map((f) => f.id)}
        excludeId={szene.id}
        onChange={(ids) => {
          const vorher = new Set(kontext.figuren.map((f) => f.id));
          for (const id of ids) if (!vorher.has(id)) addRelation(id, szene.id, 'appears_in');
          for (const f of kontext.figuren) {
            if (ids.includes(f.id)) continue;
            const rel = (relIndex.out.get(f.id) ?? []).find(
              (r) => r.toId === szene.id && r.type === 'appears_in',
            );
            if (rel) removeRelation(rel.id);
          }
        }}
      />
    </>
  );
}

function Zeile({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-4">
      <p className="rubric mb-1.5">{label}</p>
      {children}
    </div>
  );
}

function Abschnitt({ titel, children }: { titel: string; children: React.ReactNode }) {
  return (
    <section className="mt-6 border-t border-paper-300/60 pt-4">
      <p className="rubric mb-2.5">{titel}</p>
      {children}
    </section>
  );
}

function Wahl({
  wert,
  leer,
  onWaehlen,
  onLoesen,
}: {
  wert?: Entry;
  leer: string;
  onWaehlen: () => void;
  onLoesen: () => void;
}) {
  if (!wert) {
    return (
      <button
        type="button"
        onClick={onWaehlen}
        className="inline-flex min-h-[34px] items-center gap-1 font-serif text-[14px] italic text-ink-faint transition-colors hover:text-gild-600 no-tap-highlight"
      >
        <Plus size={12} /> {leer}
      </button>
    );
  }
  return (
    <span className="chip pr-1">
      <Link to={`/eintrag/${wert.id}`} className="text-ink hover:text-brass-600">
        {wert.title}
      </Link>
      <button
        type="button"
        onClick={onWaehlen}
        className="px-1 font-serif text-[12px] text-ink-faint hover:text-ink"
      >
        ändern
      </button>
      <button
        type="button"
        onClick={onLoesen}
        aria-label="Lösen"
        className="grid h-7 w-7 place-items-center rounded-full text-ink-faint hover:bg-cream-300 hover:text-ink"
      >
        <X size={12} />
      </button>
    </span>
  );
}
