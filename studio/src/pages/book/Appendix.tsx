/**
 * Die Anhänge.
 *
 * Hier wohnt die dritte Schicht: Produktion, Chronik, Karte, Register,
 * Kolophon. Nichts davon drängt sich vor – es steht hinten im Buch, wo man es
 * findet, wenn man es sucht.
 *
 * Der `AppendixSheet` ist ein einzelnes breites Blatt: Werkzeuge, die kein
 * Buchsatz sein wollen, dürfen hier Werkzeuge bleiben.
 */

import type { ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useStudio } from '../../store/useStudio';
import { useCurrentSpread } from '../../components/book/BookShell';
import { Spread } from '../../components/book/Spread';

interface AppendixEntry {
  to: string;
  title: string;
  note: string;
}

export function AppendixSpread() {
  const { book, spread, wear } = useCurrentSpread();
  const images = useStudio((s) => s.images);
  const boards = useStudio((s) => s.boards);
  const entries = useStudio((s) => s.entries);
  const settings = useStudio((s) => s.settings);

  const trashed = entries.filter((e) => e.deletedAt).length;
  const assets = entries.filter((e) => e.type === 'asset' && !e.deletedAt).length;

  const primary: AppendixEntry[] = [
    {
      to: '/setzerei',
      title: 'Setzerei',
      note: 'Geschriebenes einlegen – etwa aus ChatGPT – und das Buch setzt daraus eine Seite.',
    },
    {
      to: '/karte',
      title: 'Faltkarte',
      note: 'Die Ordnung der Welt als Sternkarte. Aufklappen, betrachten, zuklappen.',
    },
    {
      to: '/tafeln',
      title: 'Tafelteil',
      note: `${images.length} ${images.length === 1 ? 'Tafel' : 'Tafeln'} – Illustrationen und Referenzen in voller Größe.`,
    },
    {
      to: '/chronik',
      title: 'Chronik',
      note: `Was wann geschah. ${trashed > 0 ? `${trashed} entnommene ${trashed === 1 ? 'Seite' : 'Seiten'} liegen hier bereit.` : 'Frühere Fassungen lassen sich zurückholen.'}`,
    },
    {
      to: '/lose-blaetter',
      title: 'Lose Blätter',
      note: `${boards.length} ${boards.length === 1 ? 'Bogen' : 'Bögen'} zum Sammeln, Skizzieren und Sortieren.`,
    },
  ];

  const secondary: AppendixEntry[] = [
    {
      to: '/werkbank',
      title: 'Werkbank',
      note: `Produktionsstand von ${assets} ${assets === 1 ? 'Asset' : 'Assets'}.`,
    },
    {
      to: '/register',
      title: 'Register',
      note: 'Alle Einträge alphabetisch, mit Seitenzahl.',
    },
    {
      to: '/kolophon',
      title: 'Kolophon',
      note: 'Die Geschichte hinter dem Buch – Einstellungen, Sicherung, Import und Export.',
    },
  ];

  return (
    <Spread
      pageLeft={spread?.page ?? 6}
      wear={wear}
      left={
        <div className="py-4 lg:py-10">
          <p className="rubric">Anhänge</p>
          <h1 className="mt-3 font-serif text-[36px] leading-[1.05] text-ink sm:text-[44px]">
            Hinten im Buch
          </h1>
          <span aria-hidden className="rule-gild mt-5 block w-28 opacity-75" />

          <p className="prose-book mt-6 max-w-[46ch]">
            Was hier steht, gehört zur Werkstatt, nicht zur Erzählung. Es ist da, wenn Sie es
            brauchen – und im Weg, wenn es vorne stünde.
          </p>

          <ol className="mt-8">
            {primary.map((item) => (
              <AppendixLine key={item.to} {...item} />
            ))}
          </ol>
        </div>
      }
      right={
        <div className="py-4 lg:py-10">
          <p className="rubric mb-3">Weiteres</p>
          <ol>
            {secondary.map((item) => (
              <AppendixLine key={item.to} {...item} />
            ))}
          </ol>

          <section className="mt-12 border-t border-paper-300/70 pt-6">
            <p className="rubric mb-2">Über diesen Band</p>
            <p className="font-serif text-[14.5px] leading-relaxed text-ink-muted">
              {settings.worldName || 'Dragoncore'} umfasst derzeit {book.totalPages} Seiten in{' '}
              {book.chapters.length} {book.chapters.length === 1 ? 'Kapitel' : 'Kapiteln'}. Alles
              liegt auf diesem Gerät – nichts verlässt es, solange Sie es nicht ausdrücklich
              ausgeben.
            </p>
          </section>
        </div>
      }
    />
  );
}

function AppendixLine({ to, title, note }: AppendixEntry) {
  return (
    <li className="group border-b border-paper-300/50 last:border-b-0">
      <Link to={to} className="block py-3 no-tap-highlight">
        <p className="font-serif text-[17px] leading-snug text-ink transition-colors group-hover:text-gild-600">
          {title}
        </p>
        <p className="mt-0.5 font-serif text-[13.5px] italic leading-snug text-ink-muted">{note}</p>
      </Link>
    </li>
  );
}

/**
 * Ein einzelnes breites Blatt für die Werkzeuge des Anhangs.
 *
 * Bewusst keine Doppelseite: Eine Zeitleiste oder ein Prompt-Verzeichnis will
 * Fläche, kein Satzspiegel. Papier und Ränder bleiben trotzdem.
 */
export function AppendixSheet({
  title,
  rubric,
  children,
}: {
  title: string;
  rubric?: string;
  children: ReactNode;
}) {
  const navigate = useNavigate();

  return (
    <div className="mx-auto flex w-full max-w-[1200px] flex-1 justify-center">
      <div className="paper-sheet scroll-slim relative flex min-h-0 w-full flex-col overflow-y-auto overscroll-y-contain">
        <div className="mx-auto w-full max-w-[980px] px-6 pb-12 pt-8 sm:px-12 sm:pt-12">
          <button
            type="button"
            onClick={() => navigate('/anhang')}
            className="mb-6 inline-flex items-center gap-1.5 font-serif text-[13px] italic text-ink-faint transition-colors hover:text-gild-600 no-tap-highlight"
          >
            <ArrowLeft size={14} /> Zurück zu den Anhängen
          </button>

          <p className="rubric">{rubric ?? 'Anhang'}</p>
          <h1 className="mt-2 font-serif text-[32px] leading-tight text-ink sm:text-[40px]">
            {title}
          </h1>
          <span aria-hidden className="rule-gild mt-4 mb-8 block w-24 opacity-70" />

          {children}
        </div>
      </div>
    </div>
  );
}
