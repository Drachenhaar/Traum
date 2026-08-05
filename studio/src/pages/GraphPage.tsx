/**
 * Der Weltgraph.
 *
 * Nicht als Schaubild gedacht, sondern als Ort: man zieht daran, folgt einer
 * Kante und landet in einem Eintrag. Knoten sind so groß, wie sie vernetzt
 * sind – dadurch treten die Knotenpunkte der Welt von allein hervor.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Crosshair, Maximize2, Minus, Plus, Sparkle, Waypoints, X } from 'lucide-react';
import { useStudio, livingEntries } from '../store/useStudio';
import { GraphSimulation, neighbourhood, type GraphEdge } from '../lib/graph';
import { relationType, relationsOf } from '../lib/relations';
import { templateFor } from '../lib/templates';
import { EmptyState } from '../components/ui/EmptyState';
import { Thumb } from '../components/images/Thumb';
import { cx } from '../lib/utils';

interface Camera {
  x: number;
  y: number;
  zoom: number;
}

export function GraphPage() {
  const entries = useStudio((s) => s.entries);
  const relations = useStudio((s) => s.relations);
  const relIndex = useStudio((s) => s.relIndex);
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();

  const svgRef = useRef<SVGSVGElement>(null);
  const simRef = useRef(new GraphSimulation());
  const frameRef = useRef<number | null>(null);
  const cameraRef = useRef<Camera>({ x: 0, y: 0, zoom: 1 });

  const [, forceRender] = useState(0);
  const [camera, setCamera] = useState<Camera>({ x: 0, y: 0, zoom: 1 });
  const [selectedId, setSelectedId] = useState<string | null>(params.get('fokus'));
  const [focusMode, setFocusMode] = useState(Boolean(params.get('fokus')));
  const [hiddenTypes, setHiddenTypes] = useState<Set<string>>(new Set());
  const [size, setSize] = useState({ w: 800, h: 600 });

  const living = useMemo(() => livingEntries(entries), [entries]);
  const byId = useMemo(() => new Map(living.map((e) => [e.id, e])), [living]);

  /** Welche Typen kommen überhaupt vor? */
  const presentTypes = useMemo(() => {
    const counts = new Map<string, number>();
    living.forEach((e) => counts.set(e.type, (counts.get(e.type) ?? 0) + 1));
    return [...counts.entries()]
      .map(([type, count]) => ({ type, count, tpl: templateFor(type) }))
      .sort((a, b) => b.count - a.count);
  }, [living]);

  /** Sichtbarer Ausschnitt: Typfilter und ggf. Fokus auf die Umgebung eines Knotens. */
  const visibleIds = useMemo(() => {
    let ids = new Set(living.filter((e) => !hiddenTypes.has(e.type)).map((e) => e.id));
    if (focusMode && selectedId && byId.has(selectedId)) {
      const near = neighbourhood(relIndex.neighbours, selectedId, 2);
      ids = new Set([...ids].filter((id) => near.has(id)));
      ids.add(selectedId);
    }
    return ids;
  }, [living, hiddenTypes, focusMode, selectedId, relIndex, byId]);

  /* ------------------------------------------------- Simulation befüllen */

  useEffect(() => {
    const sim = simRef.current;
    const nodes = living
      .filter((e) => visibleIds.has(e.id))
      .map((e) => {
        const degree = relIndex.neighbours.get(e.id)?.size ?? 0;
        const tpl = templateFor(e.type);
        return {
          id: e.id,
          r: 9 + Math.min(16, Math.sqrt(degree) * 5) + (e.favorite ? 2 : 0),
          color: tpl.accent,
          label: e.title,
          type: e.type,
        };
      });

    const edges: GraphEdge[] = relations
      .filter((r) => visibleIds.has(r.fromId) && visibleIds.has(r.toId))
      .map((r) => {
        const def = relationType(r.type);
        return { id: r.id, source: r.fromId, target: r.toId, color: def.color, label: def.label };
      });

    sim.setData(nodes, edges);
    needsFit.current = true;
    startLoop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visibleIds, relations, relIndex]);

  /* --------------------------------------------------------- Animation */

  /** Einmal nach dem Auspendeln automatisch einpassen. */
  const needsFit = useRef(true);

  const startLoop = useCallback(() => {
    if (frameRef.current !== null) return;
    const step = () => {
      const active = simRef.current.tick();
      forceRender((n) => n + 1);
      if (active) {
        frameRef.current = requestAnimationFrame(step);
      } else {
        frameRef.current = null;
        if (needsFit.current) {
          needsFit.current = false;
          fitRef.current?.();
        }
      }
    };
    frameRef.current = requestAnimationFrame(step);
  }, []);

  /** Ring auf `fitToView`, damit die Schleife sie aufrufen kann, ohne sie zu kennen. */
  const fitRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    return () => {
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    };
  }, []);

  /* ---------------------------------------------------------- Größe */

  useEffect(() => {
    const el = svgRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entriesObserved) => {
      const rect = entriesObserved[0].contentRect;
      setSize({ w: rect.width, h: rect.height });
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  /* ----------------------------------------------- Ziehen, Schieben, Zoom */

  const dragState = useRef<{
    mode: 'none' | 'pan' | 'node';
    nodeId?: string;
    startX: number;
    startY: number;
    camX: number;
    camY: number;
    moved: boolean;
    pointers: Map<number, { x: number; y: number }>;
    pinchStart?: { dist: number; zoom: number };
  }>({ mode: 'none', startX: 0, startY: 0, camX: 0, camY: 0, moved: false, pointers: new Map() });

  const toWorld = (clientX: number, clientY: number) => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    const cam = cameraRef.current;
    return {
      x: (clientX - rect.left - rect.width / 2) / cam.zoom - cam.x,
      y: (clientY - rect.top - rect.height / 2) / cam.zoom - cam.y,
    };
  };

  const applyCamera = (next: Camera) => {
    cameraRef.current = next;
    setCamera(next);
  };

  const onPointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    const state = dragState.current;
    state.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    (e.target as Element).setPointerCapture?.(e.pointerId);

    if (state.pointers.size === 2) {
      const [a, b] = [...state.pointers.values()];
      state.pinchStart = {
        dist: Math.hypot(a.x - b.x, a.y - b.y),
        zoom: cameraRef.current.zoom,
      };
      state.mode = 'none';
      return;
    }

    const nodeId = (e.target as SVGElement).getAttribute?.('data-node');
    state.startX = e.clientX;
    state.startY = e.clientY;
    state.camX = cameraRef.current.x;
    state.camY = cameraRef.current.y;
    state.moved = false;

    if (nodeId) {
      state.mode = 'node';
      state.nodeId = nodeId;
      const node = simRef.current.node(nodeId);
      if (node) node.pinned = true;
    } else {
      state.mode = 'pan';
    }
  };

  const onPointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const state = dragState.current;
    if (!state.pointers.has(e.pointerId)) return;
    state.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

    // Zwei Finger: zoomen
    if (state.pointers.size === 2 && state.pinchStart) {
      const [a, b] = [...state.pointers.values()];
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      const zoom = clamp((dist / state.pinchStart.dist) * state.pinchStart.zoom, 0.15, 3);
      applyCamera({ ...cameraRef.current, zoom });
      return;
    }

    const dx = e.clientX - state.startX;
    const dy = e.clientY - state.startY;
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) state.moved = true;

    if (state.mode === 'pan') {
      applyCamera({
        ...cameraRef.current,
        x: state.camX + dx / cameraRef.current.zoom,
        y: state.camY + dy / cameraRef.current.zoom,
      });
    } else if (state.mode === 'node' && state.nodeId) {
      const node = simRef.current.node(state.nodeId);
      if (node) {
        const world = toWorld(e.clientX, e.clientY);
        node.x = world.x;
        node.y = world.y;
        simRef.current.reheat(0.4);
        startLoop();
      }
    }
  };

  const onPointerUp = (e: React.PointerEvent<SVGSVGElement>) => {
    const state = dragState.current;
    state.pointers.delete(e.pointerId);
    if (state.pointers.size < 2) state.pinchStart = undefined;

    if (state.mode === 'node' && state.nodeId) {
      const node = simRef.current.node(state.nodeId);
      if (node) node.pinned = false;
      if (!state.moved) {
        setSelectedId(state.nodeId);
        const next = new URLSearchParams(params);
        next.set('fokus', state.nodeId);
        setParams(next, { replace: true });
      }
      simRef.current.reheat(0.3);
      startLoop();
    } else if (state.mode === 'pan' && !state.moved) {
      setSelectedId(null);
    }
    state.mode = 'none';
    state.nodeId = undefined;
  };

  const onWheel = (e: React.WheelEvent) => {
    const zoom = clamp(cameraRef.current.zoom * (e.deltaY > 0 ? 0.9 : 1.1), 0.15, 3);
    applyCamera({ ...cameraRef.current, zoom });
  };

  /** Alles ins Bild rücken. */
  const fitToView = useCallback(() => {
    const bounds = simRef.current.bounds();
    const w = Math.max(1, bounds.maxX - bounds.minX);
    const h = Math.max(1, bounds.maxY - bounds.minY);
    const zoom = clamp(Math.min((size.w - 80) / w, (size.h - 80) / h), 0.15, 1.6);
    applyCamera({
      x: -(bounds.minX + w / 2),
      y: -(bounds.minY + h / 2),
      zoom,
    });
  }, [size.w, size.h]);

  useEffect(() => {
    fitRef.current = fitToView;
  }, [fitToView]);

  /* ----------------------------------------------------------- Auswahl */

  const selected = selectedId ? byId.get(selectedId) : undefined;
  const selectedRelations = useMemo(
    () => (selected ? relationsOf(relIndex, selected.id) : []),
    [selected, relIndex],
  );
  const highlighted = useMemo(() => {
    if (!selectedId) return null;
    return neighbourhood(relIndex.neighbours, selectedId, 1);
  }, [selectedId, relIndex]);

  const sim = simRef.current;
  const totalRelations = relations.length;

  if (living.length === 0) {
    return (
      <EmptyState
        icon={Waypoints}
        title="Die Welt ist noch leer"
        message="Sobald du Einträge anlegst und verbindest, entsteht hier das Netz deiner Welt."
      />
    );
  }

  return (
    <div className="-mx-4 -mt-5 flex h-[calc(100vh-var(--sat)-var(--sab)-112px)] flex-col sm:-mx-6 lg:-mt-8 lg:h-[calc(100vh-var(--sat)-56px)]">
      {/* Kopfzeile */}
      <div className="flex flex-wrap items-center gap-2 px-4 py-3 sm:px-6">
        <div className="mr-auto">
          <h1 className="font-serif text-[24px] leading-tight text-ink sm:text-[28px]">Weltgraph</h1>
          <p className="text-[13px] text-ink-muted">
            {sim.nodes.length} Knoten · {sim.edges.length} von {totalRelations} Verbindungen
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setFocusMode((v) => !v);
            simRef.current.reheat();
            startLoop();
          }}
          className={cx('btn h-10 min-h-0 px-3 text-[14px]', focusMode ? 'btn-accent' : 'btn-ghost')}
          disabled={!selectedId}
          title="Nur die Umgebung des gewählten Knotens zeigen"
        >
          <Crosshair size={16} /> Fokus
        </button>
        <button type="button" className="btn-ghost h-10 min-h-0 px-3 text-[14px]" onClick={fitToView}>
          <Maximize2 size={16} /> Einpassen
        </button>
        <div className="flex overflow-hidden rounded-xl border border-line">
          <button
            type="button"
            className="grid h-10 w-10 place-items-center bg-cream-50 text-ink-muted hover:bg-cream-200"
            onClick={() => applyCamera({ ...cameraRef.current, zoom: clamp(cameraRef.current.zoom * 0.85, 0.15, 3) })}
            aria-label="Verkleinern"
          >
            <Minus size={16} />
          </button>
          <button
            type="button"
            className="grid h-10 w-10 place-items-center border-l border-line bg-cream-50 text-ink-muted hover:bg-cream-200"
            onClick={() => applyCamera({ ...cameraRef.current, zoom: clamp(cameraRef.current.zoom * 1.18, 0.15, 3) })}
            aria-label="Vergrößern"
          >
            <Plus size={16} />
          </button>
        </div>
      </div>

      {/* Typfilter */}
      <div className="scroll-slim flex gap-1.5 overflow-x-auto px-4 pb-2 sm:px-6">
        {presentTypes.map(({ type, count, tpl }) => {
          const active = !hiddenTypes.has(type);
          return (
            <button
              key={type}
              type="button"
              onClick={() =>
                setHiddenTypes((prev) => {
                  const next = new Set(prev);
                  if (next.has(type)) next.delete(type);
                  else next.add(type);
                  return next;
                })
              }
              className={cx(
                'inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-3 text-[13px] transition-all duration-200 ease-calm',
                active ? 'text-ink' : 'border-line bg-cream-50 text-ink-faint',
              )}
              style={active ? { borderColor: tpl.accent, background: `${tpl.accent}18` } : undefined}
            >
              <span
                className="inline-block h-2.5 w-2.5 rounded-full"
                style={{ background: active ? tpl.accent : '#D8CCB4' }}
              />
              {tpl.labelPlural} <span className="text-ink-faint">{count}</span>
            </button>
          );
        })}
      </div>

      {/* Die Fläche */}
      <div className="relative flex-1 overflow-hidden border-y border-line bg-[radial-gradient(circle_at_50%_40%,#F7F2E8_0%,#EDE5D6_100%)]">
        <svg
          ref={svgRef}
          className="h-full w-full touch-none select-none"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onWheel={onWheel}
        >
          <g transform={`translate(${size.w / 2} ${size.h / 2}) scale(${camera.zoom}) translate(${camera.x} ${camera.y})`}>
            {/* Kanten */}
            {sim.edges.map((edge) => {
              const a = sim.node(edge.source);
              const b = sim.node(edge.target);
              if (!a || !b) return null;
              const dim =
                highlighted && !(highlighted.has(edge.source) && highlighted.has(edge.target));
              return (
                <g key={edge.id} opacity={dim ? 0.12 : 0.75}>
                  <line
                    x1={a.x}
                    y1={a.y}
                    x2={b.x}
                    y2={b.y}
                    stroke={edge.color}
                    strokeWidth={dim ? 1 : 1.6}
                    strokeLinecap="round"
                  />
                  {camera.zoom > 1.05 && !dim && (
                    <text
                      x={(a.x + b.x) / 2}
                      y={(a.y + b.y) / 2 - 4}
                      textAnchor="middle"
                      fontSize={9}
                      fill={edge.color}
                      stroke="#F3EDE1"
                      strokeWidth={2.5}
                      paintOrder="stroke"
                      strokeLinejoin="round"
                      style={{ pointerEvents: 'none' }}
                    >
                      {edge.label}
                    </text>
                  )}
                </g>
              );
            })}

            {/* Knoten */}
            {sim.nodes.map((node) => {
              const dim = highlighted && !highlighted.has(node.id);
              const isSelected = node.id === selectedId;
              return (
                <g key={node.id} opacity={dim ? 0.25 : 1} style={{ cursor: 'pointer' }}>
                  {isSelected && (
                    <circle cx={node.x} cy={node.y} r={node.r + 7} fill={node.color} opacity={0.16} />
                  )}
                  <circle
                    data-node={node.id}
                    cx={node.x}
                    cy={node.y}
                    r={node.r}
                    fill={node.color}
                    stroke={isSelected ? '#3B2E23' : '#FCFAF5'}
                    strokeWidth={isSelected ? 2 : 1.5}
                  />
                  {(camera.zoom > 0.62 || isSelected) && (
                    <text
                      x={node.x}
                      y={node.y + node.r + 13}
                      textAnchor="middle"
                      fontSize={11}
                      fill="#3B2E23"
                      stroke="#F3EDE1"
                      strokeWidth={3}
                      paintOrder="stroke"
                      strokeLinejoin="round"
                      style={{ pointerEvents: 'none' }}
                    >
                      {node.label.length > 20 ? `${node.label.slice(0, 19)}…` : node.label}
                    </text>
                  )}
                </g>
              );
            })}
          </g>
        </svg>

        {/* Infokarte zum gewählten Knoten */}
        {selected && (
          <div className="pointer-events-auto absolute inset-x-3 bottom-3 rounded-2xl border border-line bg-cream-50/97 p-3 shadow-lift backdrop-blur animate-riseIn sm:inset-x-auto sm:right-4 sm:w-[320px]">
            <div className="flex items-start gap-3">
              <Thumb imageId={selected.coverImage} alt="" className="h-14 w-14 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-1.5 text-[12px] uppercase tracking-wide text-ink-muted">
                  <span
                    className="inline-block h-2 w-2 rounded-full"
                    style={{ background: templateFor(selected.type).accent }}
                  />
                  {templateFor(selected.type).label}
                </p>
                <p className="truncate font-serif text-[18px] text-ink">{selected.title}</p>
                <p className="text-[13px] text-ink-muted">
                  {selectedRelations.length} Verbindungen
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedId(null)}
                className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-ink-faint hover:bg-cream-200"
                aria-label="Auswahl aufheben"
              >
                <X size={16} />
              </button>
            </div>

            {selectedRelations.length > 0 && (
              <ul className="mt-2 max-h-[132px] space-y-0.5 overflow-y-auto">
                {selectedRelations.slice(0, 8).map((rel) => {
                  const other = byId.get(rel.otherId);
                  if (!other) return null;
                  return (
                    <li key={rel.relation.id}>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedId(other.id);
                          simRef.current.reheat(0.2);
                          startLoop();
                        }}
                        className="flex w-full items-center gap-1.5 rounded-lg px-1.5 py-1 text-left text-[13px] hover:bg-cream-200"
                      >
                        <span style={{ color: rel.color }}>{rel.label}</span>
                        <span className="truncate text-ink">{other.title}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}

            <button
              type="button"
              className="btn-accent mt-2.5 w-full"
              onClick={() => navigate(`/eintrag/${selected.id}`)}
            >
              Öffnen
            </button>
          </div>
        )}

        {sim.nodes.length === 0 && (
          <div className="absolute inset-0 grid place-items-center px-6 text-center">
            <p className="text-[15px] text-ink-muted">
              Für diese Auswahl ist nichts sichtbar. Blende oben wieder Typen ein.
            </p>
          </div>
        )}

        {totalRelations === 0 && sim.nodes.length > 0 && (
          <div className="pointer-events-none absolute inset-x-4 top-4 rounded-2xl border border-brass-500/35 bg-brass-500/10 px-4 py-3 text-center">
            <p className="flex items-center justify-center gap-1.5 text-[14px] text-ink">
              <Sparkle size={15} className="text-brass-600" />
              Noch keine Verbindungen. Öffne einen Eintrag und verbinde ihn – hier entsteht daraus ein Netz.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}
