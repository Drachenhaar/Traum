/**
 * Die Bibliothek.
 *
 * Der Ort, an dem die Bücher stehen – und ausdrücklich kein Dashboard. Sie
 * beantwortet eine einzige Frage: *Welches Buch möchte ich öffnen?* Alles
 * andere ist zweitrangig und liegt deshalb unter „Mehr“.
 *
 * Was hier bewusst fehlt: Fortschrittsbalken, Wortzählerstände, Tabellen,
 * Projektstatus, ein Raster aus Karten mit Aktionsleisten. Ein Regal zeigt
 * Buchrücken, keine Kennzahlen. Wer wissen will, wie weit ein Buch ist,
 * schlägt es auf – das ist keine fehlende Funktion, das ist die Antwort.
 *
 * Die Gestaltung bleibt vorerst ruhig und flach: eine Fläche, darauf die
 * Bände. Kein Regalbrett, kein Licht, keine Perspektive, keine Kamerafahrt.
 * Das kommt in der Designphase; hier zählt, dass die Architektur darunter
 * trägt.
 */

import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Archive,
  ArchiveRestore,
  BookPlus,
  Copy,
  Download,
  PenLine,
  Search,
  Trash2,
} from 'lucide-react';
import { useStudio } from '../../store/useStudio';
import { ClosedBook } from '../../components/book/CoverBoard';
import { Mehr, type MehrEintrag } from '../../components/ui/Mehr';
import { confirm } from '../../components/ui/Confirm';
import { imArchiv, imRegal, zuletztOffen } from '../../lib/bibliothek';
import { deskStyle } from '../../lib/textures';
import { cx, downloadFile } from '../../lib/utils';
import { backupFileName, buildBookBackup } from '../../lib/portability';
import type { LibraryBook } from '../../types';

/** Ab wie vielen Bänden ein Suchfeld mehr hilft als es stört. */
const SUCHE_AB = 8;

export function Bibliothek() {
  const navigate = useNavigate();
  const books = useStudio((s) => s.books);
  const oeffneBuch = useStudio((s) => s.oeffneBuch);
  const archiviereBuch = useStudio((s) => s.archiviereBuch);
  const dupliziereBuch = useStudio((s) => s.dupliziereBuch);
  const loescheBuch = useStudio((s) => s.loescheBuch);
  const notify = useStudio((s) => s.notify);

  const [frage, setFrage] = useState('');
  const [archivOffen, setArchivOffen] = useState(false);

  const regal = useMemo(() => imRegal(books), [books]);
  const archiv = useMemo(() => imArchiv(books), [books]);

  const gesucht = useMemo(() => {
    const q = frage.trim().toLowerCase();
    if (!q) return regal;
    return regal.filter(
      (b) =>
        b.title.toLowerCase().includes(q) ||
        (b.subtitle ?? '').toLowerCase().includes(q) ||
        (b.worldName ?? '').toLowerCase().includes(q),
    );
  }, [regal, frage]);

  /*
   * Das vorderste Buch steht für sich.
   *
   * Nicht hervorgehoben, nicht mit einem Abzeichen versehen – einfach größer
   * und zuerst, wie ein Band, den man gerade weggelegt hat und der noch nicht
   * wieder eingeräumt ist. Auf dem Telefon ist das der ganze erste Bildschirm;
   * zehn winzige Bücher nebeneinander wären dort niemandes Bibliothek.
   */
  const sucht = frage.trim().length > 0;
  const vorn: LibraryBook | undefined = sucht ? undefined : gesucht[0];
  const hinten: LibraryBook[] = sucht ? gesucht : gesucht.slice(1);

  const oeffnen = async (buch: LibraryBook) => {
    await oeffneBuch(buch.id);
    navigate('/');
  };

  const aktionen = (buch: LibraryBook): MehrEintrag[] => [
    {
      label: 'Aufschlagen',
      onClick: () => void oeffnen(buch),
    },
    {
      label: 'Einband ändern',
      icon: <PenLine size={14} />,
      onClick: () =>
        void oeffneBuch(buch.id).then(() => navigate('/neu-binden')),
    },
    {
      label: 'Abschreiben',
      icon: <Copy size={14} />,
      onClick: () => void dupliziereBuch(buch.id),
    },
    {
      label: 'Aus dem Haus lassen',
      icon: <Download size={14} />,
      onClick: () => {
        void (async () => {
          try {
            const json = await buildBookBackup(buch.id, true);
            downloadFile(backupFileName(`dragoncore-${buch.id}`), json, 'application/json');
            notify(`„${buch.title}“ liegt als Datei bereit.`, 'success');
          } catch (err) {
            notify(`Sicherung fehlgeschlagen: ${(err as Error).message}`, 'error');
          }
        })();
      },
    },
    {
      label: buch.archived ? 'Zurück ins Regal' : 'Ins Archiv stellen',
      icon: buch.archived ? <ArchiveRestore size={14} /> : <Archive size={14} />,
      abgesetzt: true,
      onClick: () => void archiviereBuch(buch.id, !buch.archived),
    },
    {
      label: 'Aus der Bibliothek nehmen',
      icon: <Trash2 size={14} />,
      gefaehrlich: true,
      onClick: () => {
        void (async () => {
          /*
           * Die zweite, ausdrueckliche Handlung. Was hier verschwindet, sind
           * unter Umstaenden Jahre – deshalb steht im Text, wie viel es ist,
           * und nicht bloss „wirklich loeschen?".
           */
          const ok = await confirm({
            title: `„${buch.title}“ aus der Bibliothek nehmen?`,
            message:
              'Alle Seiten, Verbindungen, Bilder und Fassungen dieses Buches werden endgültig entfernt. Das lässt sich nicht zurückholen – anders als das Archiv, aus dem ein Buch jederzeit wiederkommt.',
            confirmLabel: 'Endgültig entfernen',
            danger: true,
          });
          if (ok) await loescheBuch(buch.id);
        })();
      },
    },
  ];

  return (
    <div
      className="scroll-slim h-full w-full overflow-y-auto overscroll-y-contain"
      style={deskStyle}
    >
      <div className="mx-auto w-full max-w-[68rem] px-6 pb-16 pt-[calc(2.25rem+env(safe-area-inset-top))] sm:px-10">
        <p className="rubric text-gild-500/60">Dragoncore</p>
        <h1 className="mt-2 font-serif text-[30px] leading-tight text-paper-200 sm:text-[38px]">
          Deine Bibliothek
        </h1>
        <span aria-hidden className="rule-gild mt-4 block w-24 opacity-60" />

        {books.length === 0 ? (
          <LeeresRegal onNeu={() => navigate('/neues-buch')} />
        ) : (
          <>
            {regal.length >= SUCHE_AB && (
              <label className="mt-7 flex items-center gap-2 border-b border-paper-400/15 pb-2">
                <Search size={14} className="shrink-0 text-paper-400/40" />
                <input
                  value={frage}
                  onChange={(e) => setFrage(e.target.value)}
                  placeholder="Ein Buch suchen"
                  /* 16px, sonst zoomt iOS beim Hineintippen. */
                  className="w-full border-0 bg-transparent p-0 font-serif text-[16px] text-paper-200 outline-none placeholder:text-paper-400/35"
                />
              </label>
            )}

            {vorn && <Vorderstes buch={vorn} onOeffnen={() => void oeffnen(vorn)} aktionen={aktionen(vorn)} />}

            {hinten.length > 0 && (
              <section className="mt-12">
                <p className="rubric text-paper-400/45">{vorn ? 'Daneben' : 'Gefunden'}</p>
                <div className="mt-5 grid grid-cols-2 gap-x-5 gap-y-9 sm:grid-cols-3 lg:grid-cols-4">
                  {hinten.map((b) => (
                    <ImRegal
                      key={b.id}
                      buch={b}
                      onOeffnen={() => void oeffnen(b)}
                      aktionen={aktionen(b)}
                    />
                  ))}
                </div>
              </section>
            )}

            {frage.trim() && gesucht.length === 0 && (
              <p className="mt-10 font-serif text-[15px] italic text-paper-400/45">
                Kein Buch dieses Namens steht im Regal.
              </p>
            )}

            {/* ------------------------------------------- Ein neues Buch */}
            <button
              type="button"
              onClick={() => navigate('/neues-buch')}
              className="mt-14 inline-flex min-h-[44px] items-center gap-2 font-serif text-[15px] text-gild-500/70 transition-colors hover:text-gild-400 no-tap-highlight"
              data-leitfaden="neues-buch"
            >
              <BookPlus size={16} /> Ein neues Buch beginnen
            </button>

            {/* ----------------------------------------------- Das Archiv */}
            {archiv.length > 0 && (
              <section className="mt-14 border-t border-paper-400/10 pt-6">
                <button
                  type="button"
                  onClick={() => setArchivOffen((o) => !o)}
                  aria-expanded={archivOffen}
                  className="min-h-[40px] font-serif text-[13.5px] italic text-paper-400/45 transition-colors hover:text-gold-hell no-tap-highlight"
                >
                  {archiv.length} {archiv.length === 1 ? 'Band' : 'Bände'} im Archiv
                  {archivOffen ? ' – zuklappen' : ' – ansehen'}
                </button>
                {archivOffen && (
                  <div className="mt-6 grid grid-cols-2 gap-x-5 gap-y-9 sm:grid-cols-3 lg:grid-cols-4">
                    {archiv.map((b) => (
                      <ImRegal
                        key={b.id}
                        buch={b}
                        gedaempft
                        onOeffnen={() => void oeffnen(b)}
                        aktionen={aktionen(b)}
                      />
                    ))}
                  </div>
                )}
              </section>
            )}
          </>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------- Das vorderste ---- */

function Vorderstes({
  buch,
  onOeffnen,
  aktionen,
}: {
  buch: LibraryBook;
  onOeffnen: () => void;
  aktionen: MehrEintrag[];
}) {
  return (
    <section className="mt-9 flex items-start gap-6 sm:gap-9">
      <button
        type="button"
        onClick={onOeffnen}
        aria-label={`„${buch.title}“ aufschlagen`}
        className="shrink-0 transition-transform duration-500 ease-out hover:-translate-y-1 no-tap-highlight"
      >
        <ClosedBook identity={buch} width={148} height={202} />
      </button>

      <div className="min-w-0 flex-1 pt-1">
        <button
          type="button"
          onClick={onOeffnen}
          className="block max-w-full text-left no-tap-highlight"
        >
          <h2 className="truncate font-serif text-[24px] leading-snug text-paper-200 sm:text-[30px]">
            {buch.title}
          </h2>
          {buch.subtitle?.trim() && (
            <p className="mt-1 font-serif text-[14.5px] italic leading-snug text-paper-400/55">
              {buch.subtitle}
            </p>
          )}
        </button>
        <p className="mt-3 font-serif text-[12.5px] text-paper-400/40">{zuletztOffen(buch)}</p>

        <div className="mt-5 flex items-center gap-2">
          <button
            type="button"
            onClick={onOeffnen}
            className="inline-flex min-h-[42px] items-center rounded-full border border-gild-500/40 px-5 font-serif text-[15px] text-gild-500/90 transition-colors hover:bg-gild-400/10 no-tap-highlight"
          >
            Aufschlagen
          </button>
          <Mehr eintraege={aktionen} ausrichtung="links" />
        </div>
      </div>
    </section>
  );
}

/* ---------------------------------------------------------- Im Regal ------ */

function ImRegal({
  buch,
  onOeffnen,
  aktionen,
  gedaempft,
}: {
  buch: LibraryBook;
  onOeffnen: () => void;
  aktionen: MehrEintrag[];
  gedaempft?: boolean;
}) {
  return (
    <div className={cx('flex flex-col items-start', gedaempft && 'opacity-55')}>
      <button
        type="button"
        onClick={onOeffnen}
        aria-label={`„${buch.title}“ aufschlagen`}
        className="transition-transform duration-500 ease-out hover:-translate-y-1 no-tap-highlight"
      >
        <ClosedBook identity={buch} width={104} height={142} />
      </button>
      <div className="mt-3 flex w-full items-start gap-1">
        <button type="button" onClick={onOeffnen} className="min-w-0 flex-1 text-left no-tap-highlight">
          <p className="truncate font-serif text-[14.5px] leading-snug text-paper-200/90">
            {buch.title}
          </p>
          <p className="mt-0.5 truncate font-serif text-[11.5px] text-paper-400/35">
            {zuletztOffen(buch)}
          </p>
        </button>
        <Mehr eintraege={aktionen} />
      </div>
    </div>
  );
}

/* --------------------------------------------------------- Leeres Regal ---- */

function LeeresRegal({ onNeu }: { onNeu: () => void }) {
  return (
    <div className="mt-16 max-w-[42ch]">
      <p className="font-serif text-[16px] italic leading-relaxed text-paper-400/55">
        Hier steht noch kein Band. Ein Buch in Dragoncore ist kein Projekt – es ist ein Ort, an dem
        eine Welt entsteht und bleibt.
      </p>
      <button
        type="button"
        onClick={onNeu}
        className="mt-7 inline-flex min-h-[44px] items-center gap-2 rounded-full border border-gild-500/40 px-5 font-serif text-[15px] text-gild-500/90 transition-colors hover:bg-gild-400/10 no-tap-highlight"
      >
        <BookPlus size={16} /> Das erste Buch beginnen
      </button>
    </div>
  );
}
