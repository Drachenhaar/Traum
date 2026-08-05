/**
 * Grundgerüst der App.
 *
 * Desktop: feste Seitenleiste links, Werkzeugleiste oben, Inhalt rechts.
 * Mobil:   kompakte Kopfzeile, ausfahrbare Navigation, feste Aktionsleiste unten.
 */

import { useEffect, useMemo, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Check, Home, Images, Menu, Plus, Search, X } from 'lucide-react';
import { useStudio } from '../../store/useStudio';
import { iconByName } from '../../lib/icons';
import { cx } from '../../lib/utils';
import { GlobalSearch } from '../search/GlobalSearch';
import { QuickCreate } from '../entry/QuickCreate';

export function AppShell() {
  // Wichtig: erst den Rohwert aus dem Store holen, dann ableiten. Ein Selektor,
  // der bei jedem Aufruf ein neues Array zurückgibt, würde endlos neu rendern.
  const navItems = useStudio((s) => s.settings.nav);
  const nav = useMemo(() => navItems.filter((n) => !n.hidden), [navItems]);
  const saving = useStudio((s) => s.saving);
  const savedAt = useStudio((s) => s.savedAt);
  // Nach dem Speichern kurz „Gespeichert“ zeigen, dann wieder ausblenden.
  const [showSaved, setShowSaved] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (!savedAt) return;
    setShowSaved(true);
    const t = setTimeout(() => setShowSaved(false), 2200);
    return () => clearTimeout(t);
  }, [savedAt]);

  // Beim Seitenwechsel die mobile Navigation schließen.
  useEffect(() => setMenuOpen(false), [location.pathname]);

  // Tastenkürzel: ⌘K / Strg+K öffnet die Suche.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div className="flex h-full w-full overflow-hidden bg-cream-100">
      {/* ------------------------------------------------ Seitenleiste (Desktop) */}
      <aside className="hidden w-[248px] shrink-0 flex-col border-r border-olive-900 bg-olive-800 lg:flex">
        <Link to="/" className="block px-5 pb-4 pt-6">
          <span className="block font-serif text-[22px] leading-tight text-cream-100">Dragoncore</span>
          <span className="block text-[12px] uppercase tracking-[0.18em] text-brass-300">Studio</span>
        </Link>
        <nav className="scroll-slim flex-1 overflow-y-auto px-3 pb-6">
          {nav.map((item) => {
            const Icon = iconByName(item.icon);
            return (
              <NavLink
                key={item.id}
                to={item.path}
                end={item.path === '/'}
                className={({ isActive }) =>
                  cx(
                    'mb-0.5 flex items-center gap-3 rounded-xl px-3 py-2.5 text-[15px] transition-colors duration-200 ease-calm',
                    isActive
                      ? 'bg-olive-600 text-cream-100'
                      : 'text-cream-100/70 hover:bg-olive-700 hover:text-cream-100',
                  )
                }
              >
                <Icon size={18} strokeWidth={1.75} className="shrink-0" />
                {item.label}
              </NavLink>
            );
          })}
        </nav>
      </aside>

      {/* --------------------------------------------------------- Hauptbereich */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Werkzeugleiste */}
        <header className="z-20 flex shrink-0 items-center gap-2 border-b border-line bg-cream-100/95 px-3 pt-safe backdrop-blur sm:px-5">
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            className="touch-target grid place-items-center rounded-xl text-ink transition-colors hover:bg-cream-200 lg:hidden no-tap-highlight"
            aria-label="Navigation öffnen"
          >
            <Menu size={22} />
          </button>

          <Link to="/" className="font-serif text-[19px] text-ink lg:hidden">
            Dragoncore
          </Link>

          <button
            type="button"
            onClick={() => setSearchOpen(true)}
            className="ml-auto hidden h-11 w-full max-w-md items-center gap-2.5 rounded-xl border border-line bg-cream-50 px-3.5 text-left text-[15px] text-ink-faint transition-colors hover:border-brass-400 lg:flex"
          >
            <Search size={18} />
            <span className="flex-1">Alles durchsuchen …</span>
            <kbd className="rounded border border-line px-1.5 py-0.5 text-[11px] text-ink-faint">⌘K</kbd>
          </button>

          <div className="ml-auto flex items-center gap-1.5 lg:ml-3">
            <span
              className={cx(
                'hidden items-center gap-1.5 text-[13px] transition-opacity duration-300 sm:flex',
                saving || showSaved ? 'opacity-100' : 'opacity-0',
                showSaved && !saving ? 'text-olive-500' : 'text-ink-faint',
              )}
              aria-live="polite"
            >
              <Check size={14} /> {saving ? 'Speichert …' : 'Gespeichert'}
            </span>

            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              className="touch-target grid place-items-center rounded-xl text-ink transition-colors hover:bg-cream-200 lg:hidden no-tap-highlight"
              aria-label="Suchen"
            >
              <Search size={21} />
            </button>

            <button type="button" className="btn-accent hidden px-3.5 sm:inline-flex" onClick={() => setCreateOpen(true)}>
              <Plus size={18} /> Neu
            </button>
          </div>
        </header>

        {/* Inhalt */}
        <main className="scroll-slim flex-1 overflow-y-auto overflow-x-hidden overscroll-y-contain">
          <div className="mx-auto w-full max-w-6xl px-4 pb-32 pt-5 sm:px-6 sm:pb-16 lg:pt-8">
            <Outlet />
          </div>
        </main>

        {/* ------------------------------------------ Aktionsleiste (nur mobil) */}
        <nav className="fixed inset-x-0 bottom-0 z-30 flex items-stretch border-t border-line bg-cream-50/97 pb-safe backdrop-blur lg:hidden">
          <MobileAction icon={Home} label="Zuhause" onClick={() => navigate('/')} active={location.pathname === '/'} />
          <MobileAction icon={Search} label="Suche" onClick={() => setSearchOpen(true)} />
          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            className="flex flex-1 flex-col items-center justify-center gap-0.5 py-2 text-brass-600 no-tap-highlight"
            style={{ minHeight: 56 }}
          >
            <span className="grid h-9 w-9 place-items-center rounded-full bg-brass-500 text-cream-50 shadow">
              <Plus size={20} />
            </span>
            <span className="text-[11px]">Neu</span>
          </button>
          <MobileAction
            icon={Images}
            label="Bilder"
            onClick={() => navigate('/bilder')}
            active={location.pathname === '/bilder'}
          />
          <MobileAction icon={Menu} label="Menü" onClick={() => setMenuOpen(true)} />
        </nav>
      </div>

      {/* ------------------------------------------ Ausfahrbare Navigation (mobil) */}
      {menuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-olive-900/45 animate-fadeIn" onClick={() => setMenuOpen(false)} />
          <div className="absolute inset-y-0 left-0 flex w-[82%] max-w-[320px] flex-col bg-olive-800 shadow-panel animate-fadeIn">
            <div className="flex items-center justify-between px-5 pt-safe">
              <div className="py-4">
                <span className="block font-serif text-[22px] leading-tight text-cream-100">Dragoncore</span>
                <span className="block text-[12px] uppercase tracking-[0.18em] text-brass-300">Studio</span>
              </div>
              <button
                type="button"
                onClick={() => setMenuOpen(false)}
                className="touch-target grid place-items-center rounded-xl text-cream-100/80 hover:bg-olive-700"
                aria-label="Navigation schließen"
              >
                <X size={22} />
              </button>
            </div>
            <nav className="scroll-slim flex-1 overflow-y-auto px-3 pb-6">
              {nav.map((item) => {
                const Icon = iconByName(item.icon);
                return (
                  <NavLink
                    key={item.id}
                    to={item.path}
                    end={item.path === '/'}
                    className={({ isActive }) =>
                      cx(
                        'mb-1 flex items-center gap-3 rounded-xl px-3 text-[16px] transition-colors',
                        'min-h-[48px]',
                        isActive
                          ? 'bg-olive-600 text-cream-100'
                          : 'text-cream-100/75 hover:bg-olive-700 hover:text-cream-100',
                      )
                    }
                  >
                    <Icon size={19} strokeWidth={1.75} className="shrink-0" />
                    {item.label}
                  </NavLink>
                );
              })}
            </nav>
          </div>
        </div>
      )}

      <GlobalSearch open={searchOpen} onClose={() => setSearchOpen(false)} />
      <QuickCreate open={createOpen} onClose={() => setCreateOpen(false)} />
    </div>
  );
}

function MobileAction({
  icon: Icon,
  label,
  onClick,
  active,
}: {
  icon: typeof Home;
  label: string;
  onClick: () => void;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(
        'flex flex-1 flex-col items-center justify-center gap-1 py-2 no-tap-highlight',
        active ? 'text-brass-600' : 'text-ink-muted',
      )}
      style={{ minHeight: 56 }}
    >
      <Icon size={21} strokeWidth={1.75} />
      <span className="text-[11px]">{label}</span>
    </button>
  );
}
