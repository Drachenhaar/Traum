/**
 * Die Faltkarte.
 *
 * Der Weltgraph, aber nicht mehr als Werkzeug: als Sternkarte, die hinten im
 * Buch eingeklebt ist. Man klappt sie auf, sieht die Ordnung der Welt, und
 * klappt sie wieder zu.
 *
 * Entscheidend ist, was hier *nicht* passiert: nichts wackelt. Die Anordnung
 * wird einmal berechnet und dann eingefroren. Ein Sternbild bewegt sich nicht,
 * während man es betrachtet.
 */

import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X } from 'lucide-react';
import { useStudio, livingEntries } from '../../store/useStudio';
import { GraphSimulation } from '../../lib/graph';
import { relationType } from '../../lib/relations';
import { templateFor } from '../../lib/templates';
import { chapterOfType } from '../../lib/book';
import { cx } from '../../lib/utils';

/** So oft wird gerechnet, bis die Karte ruhig liegt. Danach nie wieder. */
const SETTLE_TICKS = 420;

export function FoldOutMap() {
  const navigate = useNavigate();
  const entries = useStudio((s) => s.entries);
  const relations = useStudio((s) => s.relations);
  const relIndex = useStudio((s) => s.relIndex);
  const [selected, setSelected] = useState<string | null>(null);

  /*
   * Einmal rechnen, dann stehen lassen. Kein Animationsrahmen, kein Nachfedern –
   * deshalb wirkt die Karte gezeichnet statt simuliert.
   */
  const layout = useMemo(() => {
    const living = livingEntries(entries);
    if (living.length === 0) return null;

    /* Weit auseinander: ein Sternbild braucht Schwarz zwischen den Sternen. */
    const sim = new GraphSimulation({ linkDistance: 210, charge: 6200, gravity: 0.008 });
    sim.setData(
      living.map((e) => ({
        id: e.id,
        r: 4 + Math.min(7, (relIndex.neighbours.get(e.id)?.size ?? 0) * 1.1),
        color: templateFor(e.type).accent,
        label: e.title,
        type: e.type,
      })),
      relations
        .filter((r) => living.some((e) => e.id === r.fromId) && living.some((e) => e.id === r.toId))
        .map((r) => ({
          id: r.id,
          source: r.fromId,
          target: r.toId,
          color: relationType(r.type).color,
          label: relationType(r.type).label,
        })),
    );

    for (let i = 0; i < SETTLE_TICKS; i++) sim.tick();

    const b = sim.bounds();
    /* Knapper Rand – sonst schrumpft das Bild in der Mitte zusammen. */
    const pad = 60;
    const viewW = b.maxX - b.minX + pad * 2;

    /*
     * Schriftgröße an den Ausschnitt koppeln: Ob 12 oder 500 Sterne – die
     * Namen erscheinen auf dem Schirm immer etwa gleich groß.
     */
    const labelSize = Math.max(7, Math.min(15, viewW / 95));

    return {
      nodes: sim.nodes,
      edges: sim.edges,
      labelSize,
      view: `${b.minX - pad} ${b.minY - pad} ${viewW} ${b.maxY - b.minY + pad * 2}`,
      byId: new Map(sim.nodes.map((n) => [n.id, n])),
    };
  }, [entries, relations, relIndex]);

  const close = () => navigate('/anhang');

  return (
    <div className="animate-bookOpen flex min-h-0 w-full flex-1 flex-col">
      <div
        className="relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-[2px]"
        style={{
          background:
            'radial-gradient(120% 100% at 50% 0%, #1c2436 0%, #131a28 45%, #0c1018 100%)',
          boxShadow: 'inset 0 0 120px rgba(0,0,0,0.7)',
        }}
      >
        {/* Faltkanten – die Karte lag lange zusammengelegt im Buchdeckel. */}
        <div aria-hidden className="pointer-events-none absolute inset-0 z-10">
          {[25, 50, 75].map((x) => (
            <span
              key={x}
              className="absolute top-0 h-full w-px"
              style={{
                left: `${x}%`,
                background:
                  'linear-gradient(180deg, transparent, rgba(255,255,255,0.055) 20%, rgba(255,255,255,0.055) 80%, transparent)',
              }}
            />
          ))}
          <span
            className="absolute left-0 top-1/2 h-px w-full"
            style={{
              background:
                'linear-gradient(90deg, transparent, rgba(255,255,255,0.05) 15%, rgba(255,255,255,0.05) 85%, transparent)',
            }}
          />
        </div>

        {/* Kopf */}
        <div className="relative z-20 flex items-start justify-between gap-4 px-6 pt-6 sm:px-9 sm:pt-8">
          <div>
            <p className="rubric text-gild-400/80">Anhang · Faltkarte</p>
            <h1 className="mt-1.5 font-serif text-[26px] leading-tight text-paper-100 sm:text-[32px]">
              Die Welt
            </h1>
            <p className="mt-1 font-serif text-[12.5px] italic text-paper-400/50">
              {layout?.nodes.length ?? 0} Sterne · {layout?.edges.length ?? 0} Linien
            </p>
          </div>

          <button
            type="button"
            onClick={close}
            aria-label="Karte zusammenlegen"
            className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-gild-500/25 text-gild-400/70 transition-colors hover:border-gild-400/60 hover:text-gild-300 no-tap-highlight"
          >
            <X size={17} />
          </button>
        </div>

        {/* Die Karte */}
        {layout ? (
          <svg
            viewBox={layout.view}
            className="relative z-10 min-h-0 w-full flex-1"
            preserveAspectRatio="xMidYMid meet"
          >
            {/* Linien zuerst – sie liegen hinter den Sternen */}
            <g>
              {layout.edges.map((edge) => {
                const a = layout.byId.get(edge.source);
                const b = layout.byId.get(edge.target);
                if (!a || !b) return null;
                const active =
                  selected && (edge.source === selected || edge.target === selected);
                return (
                  <line
                    key={edge.id}
                    x1={a.x}
                    y1={a.y}
                    x2={b.x}
                    y2={b.y}
                    stroke={active ? '#E3C878' : '#9FB0CE'}
                    strokeWidth={active ? 1.6 : 0.9}
                    opacity={selected ? (active ? 0.9 : 0.1) : 0.42}
                  />
                );
              })}
            </g>

            {/* Sterne */}
            <g>
              {layout.nodes.map((node, i) => {
                const active = selected === node.id;
                const dimmed =
                  selected && !active && !relIndex.neighbours.get(selected)?.has(node.id);
                /*
                 * Vier Phasen statt zwei: über, unter, und jeweils seitlich
                 * versetzt. Benachbarte Namen kommen sich dadurch deutlich
                 * seltener ins Gehege – wie beim Setzen einer echten Karte.
                 */
                const phase = i % 4;
                const above = phase === 1 || phase === 2;
                const nudge = phase === 2 || phase === 3 ? layout.labelSize * 1.15 : 0;
                return (
                  <g
                    key={node.id}
                    opacity={dimmed ? 0.22 : 1}
                    className="cursor-pointer transition-opacity duration-500"
                    onClick={() => setSelected(active ? null : node.id)}
                    onDoubleClick={() => navigate(`/eintrag/${node.id}`)}
                  >
                    {/* Der Schein um helle Sterne */}
                    <circle
                      cx={node.x}
                      cy={node.y}
                      r={node.r * 2.6}
                      fill="#D4AF37"
                      opacity={active ? 0.22 : 0.09}
                    />
                    <circle
                      cx={node.x}
                      cy={node.y}
                      r={node.r}
                      fill={active ? '#F0DFA8' : '#E3C878'}
                    />
                    <text
                      x={node.x}
                      y={
                        (above
                          ? node.y - node.r - layout.labelSize * 0.7
                          : node.y + node.r + layout.labelSize * 1.3) + (above ? -nudge : nudge)
                      }
                      textAnchor="middle"
                      className="pointer-events-none select-none"
                      style={{
                        fontFamily: "'Iowan Old Style', Georgia, serif",
                        fontSize: layout.labelSize,
                        fill: active ? '#F5EACB' : '#C3CCDE',
                        letterSpacing: '0.04em',
                        /* Dunkler Saum, damit Namen auch über Linien lesbar bleiben */
                        paintOrder: 'stroke',
                        stroke: '#0d1119',
                        strokeWidth: layout.labelSize * 0.32,
                        strokeLinejoin: 'round',
                      }}
                    >
                      {node.label.length > 22 ? `${node.label.slice(0, 21)}…` : node.label}
                    </text>
                  </g>
                );
              })}
            </g>
          </svg>
        ) : (
          <div className="relative z-10 grid flex-1 place-items-center px-8">
            <p className="max-w-[36ch] text-center font-serif text-[15px] italic leading-relaxed text-paper-400/60">
              Noch keine Sterne. Sobald die Welt Einträge und Verbindungen hat, zeichnet sich hier
              ihre Ordnung.
            </p>
          </div>
        )}

        {/* Legende: die Kapitel als Himmelsregionen */}
        <div className="relative z-20 flex flex-wrap items-center gap-x-5 gap-y-2 px-6 pb-6 sm:px-9 sm:pb-8">
          {selected ? (
            <SelectedNote id={selected} onOpen={() => navigate(`/eintrag/${selected}`)} />
          ) : (
            <p className="font-serif text-[12px] italic text-paper-400/45">
              Einen Stern antippen, um seine Linien zu sehen. Zweimal, um die Seite aufzuschlagen.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function SelectedNote({ id, onOpen }: { id: string; onOpen: () => void }) {
  const entry = useStudio((s) => s.entries.find((e) => e.id === id));
  if (!entry) return null;
  const tpl = templateFor(entry.type);
  const chapter = chapterOfType(entry.type);

  return (
    <div className="flex min-w-0 flex-wrap items-baseline gap-x-3 gap-y-1">
      <span className="rubric text-gild-400/70">{tpl.label}</span>
      <button
        type="button"
        onClick={onOpen}
        className={cx(
          'font-serif text-[17px] text-paper-100 underline decoration-gild-500/40 underline-offset-4',
          'transition-colors hover:text-gild-300 no-tap-highlight',
        )}
      >
        {entry.title}
      </button>
      <span className="font-serif text-[12.5px] italic text-paper-400/50">
        Kapitel {chapter.title}
      </span>
    </div>
  );
}
