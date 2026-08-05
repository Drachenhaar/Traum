/**
 * Startseite – das kreative Zuhause.
 *
 * Zeigt Zahlen, zuletzt Bearbeitetes, Favoriten, neue Bilder und
 * Schnellaktionen. Alle Karten führen irgendwohin, kein Element ist Deko.
 */

import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Bird, FileText, ImagePlus, Images, Package, Plus, Sparkles, Star, User } from 'lucide-react';
import { useStudio } from '../store/useStudio';
import { EntryCard } from '../components/entry/EntryCard';
import { Thumb } from '../components/images/Thumb';
import { EmptyState } from '../components/ui/EmptyState';
import { ImageUploadButton } from '../components/images/ImageUploadButton';
import { Lightbox } from '../components/images/Lightbox';
import { relativeTime } from '../lib/utils';
import type { EntryType } from '../types';

export function HomePage() {
  const entries = useStudio((s) => s.entries);
  const images = useStudio((s) => s.images);
  const createEntry = useStudio((s) => s.createEntry);
  const navigate = useNavigate();
  const [lightbox, setLightbox] = useState<number | null>(null);

  const recent = useMemo(
    () => [...entries].sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 8),
    [entries],
  );
  const favorites = useMemo(
    () => entries.filter((e) => e.favorite).sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 8),
    [entries],
  );
  const recentImages = useMemo(
    () => [...images].sort((a, b) => b.createdAt - a.createdAt).slice(0, 12),
    [images],
  );

  const count = (type: EntryType) => entries.filter((e) => e.type === type).length;

  const stats = [
    { label: 'Charaktere', value: count('character'), to: '/charaktere', icon: User },
    { label: 'Kreaturen', value: count('creature'), to: '/kreaturen', icon: Bird },
    { label: 'Assets', value: count('asset'), to: '/assets', icon: Package },
    { label: 'Prompts', value: count('prompt'), to: '/prompts', icon: Sparkles },
    { label: 'Bilder', value: images.length, to: '/bilder', icon: Images },
  ];

  const quickCreate = async (type: EntryType) => {
    const entry = await createEntry(type);
    navigate(`/eintrag/${entry.id}`);
  };

  return (
    <div className="space-y-8">
      {/* --------------------------------------------------------- Begrüßung */}
      <header>
        <p className="text-[13px] uppercase tracking-[0.18em] text-brass-600">Dragoncore Studio</p>
        <h1 className="mt-1 font-serif text-[32px] leading-tight text-ink sm:text-[38px]">
          Willkommen zurück
        </h1>
        <p className="mt-1.5 max-w-2xl text-[16px] leading-relaxed text-ink-muted">
          Dein Archiv und deine Art Bible – alles bleibt lokal auf diesem Gerät gespeichert.
        </p>
      </header>

      {/* ------------------------------------------------------------ Zahlen */}
      <section>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-5 sm:gap-2.5">
          {stats.map((s) => (
            <Link
              key={s.label}
              to={s.to}
              className="rounded-2xl border border-line bg-cream-50 p-3 shadow-card transition-all duration-200 ease-calm hover:-translate-y-0.5 hover:shadow-lift no-tap-highlight sm:p-4"
            >
              <s.icon size={17} className="text-brass-600" />
              <p className="mt-1.5 font-serif text-[24px] leading-none text-ink sm:mt-2 sm:text-[28px]">{s.value}</p>
              <p className="mt-1 text-[12px] text-ink-muted sm:text-[13px]">{s.label}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* ---------------------------------------------------- Schnellaktionen */}
      <section>
        <h2 className="mb-3 font-serif text-2xl text-ink">Schnellaktionen</h2>
        <div className="flex flex-wrap gap-2">
          <QuickButton icon={FileText} label="Neue Seite" onClick={() => void quickCreate('page')} />
          <QuickButton icon={User} label="Neuer Charakter" onClick={() => void quickCreate('character')} />
          <QuickButton icon={Bird} label="Neue Kreatur" onClick={() => void quickCreate('creature')} />
          <QuickButton icon={Package} label="Neues Asset" onClick={() => void quickCreate('asset')} />
          <QuickButton icon={Sparkles} label="Neuer Prompt" onClick={() => void quickCreate('prompt')} />
          <ImageUploadButton className="btn-ghost" onImported={() => navigate('/bilder')}>
            <ImagePlus size={18} /> Bilder importieren
          </ImageUploadButton>
        </div>
      </section>

      {/* --------------------------------------------------- Zuletzt bearbeitet */}
      <section>
        <div className="mb-3 flex items-baseline justify-between gap-3">
          <h2 className="font-serif text-2xl text-ink">Zuletzt bearbeitet</h2>
          {recent.length > 0 && (
            <span className="text-[13px] text-ink-faint">{relativeTime(recent[0].updatedAt)}</span>
          )}
        </div>
        {recent.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="Noch nichts angelegt"
            message="Beginne mit einer Seite, einem Charakter oder importiere ein paar Bilder."
            action={
              <button type="button" className="btn-accent" onClick={() => void quickCreate('page')}>
                <Plus size={18} /> Erste Seite anlegen
              </button>
            }
          />
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {recent.map((e) => (
              <EntryCard key={e.id} entry={e} />
            ))}
          </div>
        )}
      </section>

      {/* --------------------------------------------------------- Favoriten */}
      {favorites.length > 0 && (
        <section>
          <h2 className="mb-3 flex items-center gap-2 font-serif text-2xl text-ink">
            <Star size={19} className="text-brass-500" /> Favoriten
          </h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {favorites.map((e) => (
              <EntryCard key={e.id} entry={e} />
            ))}
          </div>
        </section>
      )}

      {/* ------------------------------------------------- Zuletzt hochgeladen */}
      <section>
        <div className="mb-3 flex items-baseline justify-between gap-3">
          <h2 className="font-serif text-2xl text-ink">Zuletzt hochgeladene Bilder</h2>
          <Link to="/bilder" className="text-[14px] text-brass-600 hover:underline">
            Alle Bilder
          </Link>
        </div>
        {recentImages.length === 0 ? (
          <EmptyState
            icon={Images}
            title="Noch keine Bilder"
            message="Importiere Bilder aus der Fotomediathek oder der Dateien-App – sie bleiben lokal gespeichert."
            action={
              <ImageUploadButton className="btn-accent" onImported={() => navigate('/bilder')}>
                <ImagePlus size={18} /> Bilder importieren
              </ImageUploadButton>
            }
          />
        ) : (
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6">
            {recentImages.map((m, i) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setLightbox(i)}
                className="overflow-hidden rounded-xl border border-line transition-all duration-200 ease-calm hover:border-brass-400 hover:shadow-card"
                title={m.title}
              >
                <Thumb imageId={m.id} alt={m.title} className="aspect-square w-full" rounded="rounded-none" />
              </button>
            ))}
          </div>
        )}
      </section>

      {lightbox !== null && (
        <Lightbox
          ids={recentImages.map((m) => m.id)}
          index={lightbox}
          onIndexChange={setLightbox}
          onClose={() => setLightbox(null)}
        />
      )}
    </div>
  );
}

function QuickButton({
  icon: Icon,
  label,
  onClick,
}: {
  icon: typeof User;
  label: string;
  onClick: () => void;
}) {
  return (
    <button type="button" className="btn-ghost" onClick={onClick}>
      <Icon size={18} /> {label}
    </button>
  );
}
