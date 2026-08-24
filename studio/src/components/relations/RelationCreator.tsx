/**
 * Eine Beziehung knüpfen.
 *
 * Der Satz oben liest sich immer wie ein Satz – „Waldkoi lebt in …“ – damit
 * beim Verbinden klar bleibt, was man gerade über die Welt behauptet.
 */

import { useMemo, useState } from 'react';
import { ArrowLeftRight, Check, Plus, Search } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { EmptyState } from '../ui/EmptyState';
import { Thumb } from '../images/Thumb';
import { useStudio, livingEntries } from '../../store/useStudio';
import { RELATION_TYPES, relationType } from '../../lib/relations';
import { templateFor } from '../../lib/templates';
import { zielArt } from '../../lib/gedanke';
import { cx } from '../../lib/utils';
import { Link2 } from 'lucide-react';
import type { Entry } from '../../types';

export function RelationCreator({
  open,
  onClose,
  entry,
  /** Vorbelegte Beziehungsart, z. B. „folgt der Regel“ aus der DNA heraus */
  presetType,
  presetTargetTypes,
  /**
   * Vorbelegte Suche und Auswahl.
   *
   * Wer aus „Wer und was hier vorkommt" heraus verbindet, hat den Namen
   * schon genannt – ihn hier noch einmal zu suchen waere derselbe Weg zum
   * zweiten Mal.
   */
  presetPicked,
}: {
  open: boolean;
  onClose: () => void;
  entry: Entry;
  presetType?: string;
  presetTargetTypes?: string[];
  presetPicked?: string[];
}) {
  const allEntries = useStudio((s) => s.entries);
  const addRelation = useStudio((s) => s.addRelation);
  const notify = useStudio((s) => s.notify);
  const createEntry = useStudio((s) => s.createEntry);

  const [type, setType] = useState(presetType ?? 'lives_in');
  const [reversed, setReversed] = useState(false);
  const [query, setQuery] = useState('');
  const [picked, setPicked] = useState<string[]>(presetPicked ?? []);

  // Beim Öffnen zurücksetzen.
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setType(presetType ?? 'lives_in');
      setReversed(false);
      setQuery('');
      setPicked(presetPicked ?? []);
    }
  }

  const def = relationType(type);

  /*
   * Was noch nicht existiert, entsteht hier.
   *
   * Vorher stand an dieser Stelle „Es gibt noch keinen passenden Eintrag.
   * Lege ihn zuerst an" – und genau das war der Bruch: Man wollte „Niko lebt
   * in Wald" sagen, musste dafuer das Blatt schliessen, einen Ort anlegen,
   * zurueckfinden und von vorn beginnen. Der Satz war im Kopf fertig, der
   * Weg dorthin nicht.
   *
   * Die Art kommt aus der Beziehung, nicht aus dem Wort: Wer „lebt in"
   * gewaehlt hat, meint einen Ort – auch wenn der Ort „Bum" heisst. Erst
   * wenn die Beziehung schweigt, entscheidet das Wort.
   */
  const neuerName = query.trim();
  const gibtEsSchon = useMemo(
    () =>
      livingEntries(allEntries).some(
        (e) => e.title.trim().toLowerCase() === neuerName.toLowerCase(),
      ),
    [allEntries, neuerName],
  );
  const neueArt = neuerName ? zielArt(type, !reversed, neuerName) : '';

  const legeAn = () => {
    if (!neuerName) return;
    void createEntry(neueArt, { title: neuerName })
      .then((neu) => {
        setPicked((prev) => [...prev, neu.id]);
        setQuery('');
        notify(`„${neu.title}" steht jetzt im Buch.`, 'success');
      })
      .catch((err) => notify(`Nicht angelegt: ${(err as Error).message}`, 'error'));
  };

  const candidates = useMemo(() => {
    const q = query.trim().toLowerCase();
    return livingEntries(allEntries)
      .filter((e) => e.id !== entry.id)
      .filter((e) => !presetTargetTypes?.length || presetTargetTypes.includes(e.type))
      .filter((e) =>
        !q ? true : [e.title, e.subtitle, e.category, ...e.tags].join(' ').toLowerCase().includes(q),
      )
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .slice(0, 80);
  }, [allEntries, entry.id, query, presetTargetTypes]);

  const save = () => {
    if (!picked.length) return;
    for (const targetId of picked) {
      if (reversed) addRelation(targetId, entry.id, type);
      else addRelation(entry.id, targetId, type);
    }
    notify(
      picked.length === 1 ? 'Verbindung geknüpft.' : `${picked.length} Verbindungen geknüpft.`,
      'success',
    );
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Verbinden"
      size="lg"
      footer={
        <>
          <span className="mr-auto text-[13px] text-ink-muted">{picked.length} ausgewählt</span>
          <button type="button" className="btn-ghost" onClick={onClose}>
            Abbrechen
          </button>
          <button type="button" className="btn-accent" disabled={!picked.length} onClick={save}>
            Verbindung knüpfen
          </button>
        </>
      }
    >
      {/* Der Satz, den man gerade schreibt */}
      <div className="mb-4 rounded-2xl border border-line bg-cream-50 p-3.5">
        <p className="text-[15px] leading-relaxed text-ink">
          <span className="font-medium">{reversed ? '…' : entry.title}</span>{' '}
          <span
            className="mx-0.5 rounded-md px-1.5 py-0.5 font-medium"
            style={{ background: `${def.color}1F`, color: def.color }}
          >
            {reversed ? def.inverse : def.label}
          </span>{' '}
          <span className="font-medium">{reversed ? entry.title : '…'}</span>
        </p>
        {def.hint && <p className="mt-1 text-[13px] text-ink-muted">{def.hint}</p>}
      </div>

      <div className="mb-4">
        <p className="label-base">Art der Verbindung</p>
        <div className="flex flex-wrap gap-1.5">
          {RELATION_TYPES.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => setType(r.id)}
              className={cx(
                'inline-flex min-h-[38px] items-center rounded-full border px-3 text-[14px] transition-all duration-200 ease-calm',
                type === r.id ? 'text-ink' : 'border-line bg-cream-50 text-ink-muted hover:bg-cream-200',
              )}
              style={
                type === r.id
                  ? { borderColor: r.color, background: `${r.color}1F` }
                  : undefined
              }
            >
              {r.label}
            </button>
          ))}
        </div>
        {!def.symmetric && (
          <button
            type="button"
            onClick={() => setReversed((v) => !v)}
            className="btn-quiet mt-2 px-2 text-[14px]"
          >
            <ArrowLeftRight size={16} /> Richtung umdrehen ({reversed ? def.inverse : def.label})
          </button>
        )}
      </div>

      <div className="relative mb-3">
        <Search size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />
        <input
          className="input-base pl-10"
          placeholder="Wonach suchst du?"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {/*
        Das Angebot steht ueber der Liste, nicht darunter: Wer einen Namen
        tippt, den es nicht gibt, sucht nicht weiter – er will ihn anlegen.
      */}
      {neuerName && !gibtEsSchon && (
        <button
          type="button"
          onClick={legeAn}
          className={cx(
            'mb-3 flex w-full items-center gap-3 rounded-xl border border-dashed border-gild-500/45',
            'bg-gild-400/5 px-3 py-3 text-left transition-colors hover:bg-gild-400/10 no-tap-highlight',
          )}
        >
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-cream-200 text-gold">
            <Plus size={20} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[15px] text-ink">„{neuerName}" anlegen</span>
            <span className="block truncate text-[13px] text-ink-muted">
              als {templateFor(neueArt).label} – und gleich verbinden
            </span>
          </span>
        </button>
      )}

      {candidates.length === 0 ? (
        neuerName && !gibtEsSchon ? null : (
          <EmptyState
            icon={Link2}
            title="Nichts gefunden"
            message="Tippe einen Namen ein – was es noch nicht gibt, legst du gleich hier an."
          />
        )
      ) : (
        <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line">
          {candidates.map((e) => {
            const active = picked.includes(e.id);
            const tpl = templateFor(e.type);
            return (
              <li key={e.id}>
                <button
                  type="button"
                  onClick={() =>
                    setPicked((prev) => (active ? prev.filter((x) => x !== e.id) : [...prev, e.id]))
                  }
                  className={cx(
                    'flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors',
                    active ? 'bg-brass-500/10' : 'bg-cream-50 hover:bg-cream-200',
                  )}
                >
                  <Thumb imageId={e.coverImage} alt="" className="h-11 w-11 shrink-0" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[15px] text-ink">{e.title}</span>
                    <span className="flex items-center gap-1.5 text-[13px] text-ink-muted">
                      <span
                        className="inline-block h-2 w-2 shrink-0 rounded-full"
                        style={{ background: tpl.accent }}
                      />
                      {tpl.label}
                      {e.category ? ` · ${e.category}` : ''}
                    </span>
                  </span>
                  <span
                    className={cx(
                      'grid h-6 w-6 shrink-0 place-items-center rounded-full border',
                      active ? 'border-brass-500 bg-brass-500 text-paper-50' : 'border-lineStrong',
                    )}
                  >
                    {active && <Check size={14} />}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </Modal>
  );
}
