/** Übersicht der Concept-Art-Flächen. */

import { useNavigate } from 'react-router-dom';
import { Brush, Plus, Trash2 } from 'lucide-react';
import { useStudio } from '../store/useStudio';
import { EmptyState } from '../components/ui/EmptyState';
import { confirm } from '../components/ui/Confirm';
import { relativeTime } from '../lib/utils';

export function CanvasListPage() {
  const boards = useStudio((s) => s.boards);
  const createBoard = useStudio((s) => s.createBoard);
  const deleteBoard = useStudio((s) => s.deleteBoard);
  const navigate = useNavigate();

  const create = async () => {
    const board = await createBoard(`Fläche ${boards.length + 1}`);
    navigate(`/canvas/${board.id}`);
  };

  const sorted = [...boards].sort((a, b) => b.updatedAt - a.updatedAt);

  return (
    <div>
      <header className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-serif text-[30px] leading-tight text-ink sm:text-[34px]">Concept Canvas</h1>
          <p className="mt-1 max-w-2xl text-[15px] text-ink-muted">
            Freie Flächen zum Denken: Bilder, Notizen, Skizzen. Einträge, die in deiner Welt
            verbunden sind, verbinden sich hier von selbst.
          </p>
        </div>
        <button type="button" className="btn-accent" onClick={() => void create()}>
          <Plus size={18} /> Neue Fläche
        </button>
      </header>

      {sorted.length === 0 ? (
        <EmptyState
          icon={Brush}
          title="Noch keine Fläche"
          message="Eine unendliche Fläche zum Sammeln, Skizzieren und Sortieren – ohne Raster, ohne Reihenfolge."
          action={
            <button type="button" className="btn-accent" onClick={() => void create()}>
              <Plus size={18} /> Erste Fläche anlegen
            </button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {sorted.map((board) => {
            const counts = {
              image: board.items.filter((i) => i.kind === 'image').length,
              note: board.items.filter((i) => i.kind === 'note').length,
              entry: board.items.filter((i) => i.kind === 'entry').length,
              stroke: board.items.filter((i) => i.kind === 'stroke').length,
            };
            return (
              <article
                key={board.id}
                className="card group overflow-hidden transition-all duration-200 ease-calm hover:-translate-y-0.5 hover:shadow-lift"
              >
                <button
                  type="button"
                  onClick={() => navigate(`/canvas/${board.id}`)}
                  className="block w-full text-left"
                >
                  {/* Kleine Vorschau der Anordnung */}
                  <div
                    className="relative h-32 w-full overflow-hidden border-b border-line"
                    style={{
                      background:
                        'radial-gradient(circle at 1px 1px, rgba(124,106,87,0.16) 1px, transparent 0) 0 0/14px 14px, #F1EADC',
                    }}
                  >
                    <BoardPreview board={board} />
                  </div>
                  <div className="p-3.5">
                    <h2 className="font-serif text-lg text-ink">{board.name}</h2>
                    <p className="mt-0.5 text-[13px] text-ink-muted">
                      {board.items.length} Elemente · {relativeTime(board.updatedAt)}
                    </p>
                    <p className="mt-1 text-[13px] text-ink-faint">
                      {[
                        counts.image && `${counts.image} Bilder`,
                        counts.note && `${counts.note} Notizen`,
                        counts.entry && `${counts.entry} Einträge`,
                        counts.stroke && `${counts.stroke} Zeichnungen`,
                      ]
                        .filter(Boolean)
                        .join(' · ') || 'noch leer'}
                    </p>
                  </div>
                </button>
                <button
                  type="button"
                  className="absolute right-2 top-2 grid h-9 w-9 place-items-center rounded-lg bg-cream-50/90 text-ink-faint opacity-0 shadow transition-opacity hover:text-red-700 group-hover:opacity-100 focus:opacity-100"
                  aria-label="Fläche löschen"
                  onClick={async (e) => {
                    e.stopPropagation();
                    const ok = await confirm({
                      title: `„${board.name}“ löschen?`,
                      message: 'Die Fläche wird entfernt. Bilder und Einträge darauf bleiben erhalten.',
                      confirmLabel: 'Löschen',
                      danger: true,
                    });
                    if (ok) await deleteBoard(board.id);
                  }}
                >
                  <Trash2 size={16} />
                </button>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

/** Miniaturbild der Anordnung – ohne Bilder zu laden, nur die Formen. */
function BoardPreview({ board }: { board: { items: { x: number; y: number; w: number; h: number; kind: string; color?: string }[] } }) {
  if (!board.items.length) return null;
  const minX = Math.min(...board.items.map((i) => i.x));
  const minY = Math.min(...board.items.map((i) => i.y));
  const maxX = Math.max(...board.items.map((i) => i.x + i.w));
  const maxY = Math.max(...board.items.map((i) => i.y + i.h));
  const w = maxX - minX || 1;
  const h = maxY - minY || 1;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-full w-full" preserveAspectRatio="xMidYMid meet">
      {board.items.slice(0, 60).map((item, i) => (
        <rect
          key={i}
          x={item.x - minX}
          y={item.y - minY}
          width={item.w}
          height={item.h}
          rx={Math.min(12, item.w / 8)}
          fill={
            item.kind === 'note'
              ? item.color ?? '#E3D3AE'
              : item.kind === 'image'
                ? '#C9BFA8'
                : item.kind === 'entry'
                  ? '#FCFAF5'
                  : 'transparent'
          }
          stroke={item.kind === 'frame' ? item.color ?? '#A8853F' : '#D8CCB4'}
          strokeWidth={Math.max(1, w / 200)}
          strokeDasharray={item.kind === 'frame' ? `${w / 60} ${w / 60}` : undefined}
        />
      ))}
    </svg>
  );
}
