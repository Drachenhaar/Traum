/**
 * Welt-DNA.
 *
 * Keine Dokumentation, sondern Identität. Jede Regel ist ein Eintrag wie jeder
 * andere – aber alles darf sich auf sie beziehen. Deshalb zeigt jede Regel
 * hier direkt, was ihr folgt: die DNA bleibt nur lebendig, wenn sichtbar ist,
 * wo sie tatsächlich wirkt.
 */

import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Dna, Plus, Sparkle } from 'lucide-react';
import { useStudio, livingEntries } from '../store/useStudio';
import { templateFor, asList, asText } from '../lib/templates';
import { relationsOf } from '../lib/relations';
import { RelationCreator } from '../components/relations/RelationCreator';
import { EmptyState } from '../components/ui/EmptyState';
import { Thumb } from '../components/images/Thumb';
import { cx } from '../lib/utils';
import type { Entry } from '../types';

const DNA_AREAS = templateFor('dna').categories;

export function DnaPage() {
  const entries = useStudio((s) => s.entries);
  const relIndex = useStudio((s) => s.relIndex);
  const settings = useStudio((s) => s.settings);
  const createEntry = useStudio((s) => s.createEntry);
  const navigate = useNavigate();
  const [connectFor, setConnectFor] = useState<Entry | null>(null);

  const living = useMemo(() => livingEntries(entries), [entries]);
  const rules = useMemo(
    () => living.filter((e) => e.type === 'dna').sort((a, b) => a.category.localeCompare(b.category, 'de')),
    [living],
  );
  const byId = useMemo(() => new Map(living.map((e) => [e.id, e])), [living]);

  /** Wie viele Einträge folgen der DNA überhaupt? */
  const coverage = useMemo(() => {
    const followers = new Set<string>();
    for (const rule of rules) {
      for (const rel of relationsOf(relIndex, rule.id)) {
        if (rel.relation.type === 'follows_dna') followers.add(rel.otherId);
      }
    }
    const relevant = living.filter((e) => e.type !== 'dna' && e.type !== 'page');
    return {
      followers: followers.size,
      relevant: relevant.length,
      percent: relevant.length ? Math.round((followers.size / relevant.length) * 100) : 0,
    };
  }, [rules, relIndex, living]);

  const areasWithRules = useMemo(() => {
    const map = new Map<string, Entry[]>();
    for (const rule of rules) {
      const key = rule.category || 'Ohne Bereich';
      const list = map.get(key);
      if (list) list.push(rule);
      else map.set(key, [rule]);
    }
    return map;
  }, [rules]);

  const missingAreas = DNA_AREAS.filter((a) => !areasWithRules.has(a));

  const createRule = async (category: string) => {
    const entry = await createEntry('dna', { category, title: `Regel für ${category}` });
    navigate(`/eintrag/${entry.id}`);
  };

  return (
    <div className="space-y-8">
      {/* ------------------------------------------------------------- Kopf */}
      <header>
        <p className="text-[13px] uppercase tracking-[0.18em] text-brass-600">
          {settings.worldName || 'Dragoncore'}
        </p>
        <h1 className="mt-1 font-serif text-[32px] leading-tight text-ink sm:text-[40px]">Welt-DNA</h1>
        <p className="mt-2 max-w-2xl text-[16px] leading-relaxed text-ink-muted">
          Die Regeln, an denen sich alles messen lässt. Nicht als Dokument gedacht, sondern als
          Prüfstein: Wenn ein Entwurf sich hier nicht wiederfindet, gehört er noch nicht dazu.
        </p>
      </header>

      {rules.length > 0 && (
        <section className="card p-4 sm:p-5">
          <div className="flex flex-wrap items-center gap-4">
            <div>
              <p className="font-serif text-[32px] leading-none text-ink">{coverage.percent}%</p>
              <p className="mt-1 text-[13px] text-ink-muted">der Welt folgt einer Regel</p>
            </div>
            <div className="h-10 w-px bg-line" aria-hidden />
            <div>
              <p className="font-serif text-[32px] leading-none text-ink">{rules.length}</p>
              <p className="mt-1 text-[13px] text-ink-muted">
                {rules.length === 1 ? 'Regel' : 'Regeln'} in {areasWithRules.size} Bereichen
              </p>
            </div>
            <div className="ml-auto min-w-[160px] flex-1">
              <div className="h-2 overflow-hidden rounded-full bg-cream-300">
                <div
                  className="h-full rounded-full bg-brass-500 transition-[width] duration-700 ease-calm"
                  style={{ width: `${coverage.percent}%` }}
                />
              </div>
              <p className="mt-1.5 text-[13px] text-ink-faint">
                {coverage.followers} von {coverage.relevant} Einträgen sind an die DNA gebunden
              </p>
            </div>
          </div>
        </section>
      )}

      {/* ------------------------------------------------------------ Regeln */}
      {rules.length === 0 ? (
        <EmptyState
          icon={Dna}
          title="Noch keine DNA"
          message="Beginne mit dem Gefühl: ein Satz, der beschreibt, wie sich deine Welt anfühlen soll. Alles Weitere ordnet sich dem unter."
          action={
            <button type="button" className="btn-accent" onClick={() => void createRule('Gefühl')}>
              <Plus size={18} /> Erste Regel schreiben
            </button>
          }
        />
      ) : (
        <div className="space-y-6">
          {[...areasWithRules.entries()].map(([area, areaRules]) => (
            <section key={area}>
              <h2 className="mb-3 font-serif text-2xl text-ink">{area}</h2>
              <div className="grid gap-3 lg:grid-cols-2">
                {areaRules.map((rule) => (
                  <RuleCard
                    key={rule.id}
                    rule={rule}
                    followers={relationsOf(relIndex, rule.id)
                      .filter((r) => r.relation.type === 'follows_dna')
                      .map((r) => byId.get(r.otherId))
                      .filter(Boolean) as Entry[]}
                    onConnect={() => setConnectFor(rule)}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      {/* -------------------------------------------------- Fehlende Bereiche */}
      {missingAreas.length > 0 && (
        <section className="rounded-2xl border border-dashed border-lineStrong bg-cream-50/60 p-4 sm:p-5">
          <h2 className="mb-1 flex items-center gap-2 font-serif text-xl text-ink">
            <Sparkle size={17} className="text-brass-600" /> Noch offen
          </h2>
          <p className="mb-3 text-[15px] text-ink-muted">
            Für diese Bereiche gibt es noch keine Regel. Kein Muss – aber jede davon macht spätere
            Entscheidungen leichter.
          </p>
          <div className="flex flex-wrap gap-1.5">
            {missingAreas.map((area) => (
              <button
                key={area}
                type="button"
                onClick={() => void createRule(area)}
                className="chip min-h-[38px] hover:border-brass-400 hover:bg-cream-200"
              >
                <Plus size={13} /> {area}
              </button>
            ))}
          </div>
        </section>
      )}

      {connectFor && (
        <RelationCreator
          open
          onClose={() => setConnectFor(null)}
          entry={connectFor}
          presetType="follows_dna"
        />
      )}
    </div>
  );
}

/* ----------------------------------------------------------------- Regelkarte */

function RuleCard({
  rule,
  followers,
  onConnect,
}: {
  rule: Entry;
  followers: Entry[];
  onConnect: () => void;
}) {
  const doThis = asList(rule.fields.doThis);
  const notThis = asList(rule.fields.notThis);
  const palette = asList(rule.fields.palette);
  const ruleText = asText(rule.fields.rule) || rule.description;

  return (
    <article className="card flex flex-col p-4 transition-shadow duration-200 ease-calm hover:shadow-lift">
      <Link to={`/eintrag/${rule.id}`} className="group">
        <h3 className="font-serif text-xl leading-snug text-ink transition-colors group-hover:text-brass-600">
          {rule.title}
        </h3>
        {ruleText && <p className="mt-1.5 text-[15px] leading-relaxed text-ink">{ruleText}</p>}
      </Link>

      {(doThis.length > 0 || notThis.length > 0) && (
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {doThis.length > 0 && (
            <div>
              <p className="mb-1 text-[12px] uppercase tracking-wide text-olive-500">So ja</p>
              <p className="text-[14px] leading-snug text-ink-muted">{doThis.join(' · ')}</p>
            </div>
          )}
          {notThis.length > 0 && (
            <div>
              <p className="mb-1 text-[12px] uppercase tracking-wide text-red-800/70">So nicht</p>
              <p className="text-[14px] leading-snug text-ink-muted">{notThis.join(' · ')}</p>
            </div>
          )}
        </div>
      )}

      {palette.length > 0 && (
        <div className="mt-3 flex gap-1.5">
          {palette.map((raw, i) => (
            <span
              key={i}
              className="h-7 w-7 rounded-lg border border-line"
              style={{ background: raw.split('|')[0] }}
              title={raw.split('|')[1] || raw.split('|')[0]}
            />
          ))}
        </div>
      )}

      {/* Was folgt dieser Regel? */}
      <div className="mt-4 border-t border-line pt-3">
        <p className="mb-2 text-[12px] uppercase tracking-wide text-ink-muted">
          {followers.length > 0 ? `${followers.length} folgen dieser Regel` : 'Noch folgt nichts'}
        </p>
        <div className="flex flex-wrap items-center gap-1.5">
          {followers.slice(0, 8).map((f) => (
            <Link
              key={f.id}
              to={`/eintrag/${f.id}`}
              className="flex items-center gap-1.5 rounded-full border border-line bg-cream-50 py-1 pl-1 pr-2.5 text-[13px] text-ink transition-colors hover:border-brass-400"
              title={templateFor(f.type).label}
            >
              <Thumb imageId={f.coverImage} alt="" className="h-5 w-5" rounded="rounded-full" />
              <span className="max-w-[140px] truncate">{f.title}</span>
            </Link>
          ))}
          <button
            type="button"
            onClick={onConnect}
            className={cx(
              'inline-flex min-h-[30px] items-center gap-1 rounded-full border border-dashed border-lineStrong px-2.5 text-[13px] text-ink-muted transition-colors hover:bg-cream-200 hover:text-ink',
            )}
          >
            <Plus size={13} /> verbinden
          </button>
        </div>
      </div>
    </article>
  );
}
