/**
 * Das Romanblatt – die Uebersicht ueber ein Manuskript.
 *
 * Kein Plot-Raster, keine Korkwand, keine Karteikarten. Ein Inhaltsverzeichnis,
 * wie es hinten im Buch steht: Kapitel, darunter Szenen, daneben ihr Umfang.
 * Wer plant, plant hier; wer schreibt, ist zwei Tippser vom Text entfernt.
 *
 * Umsortiert wird mit Pfeilen statt mit Ziehen. Das ist die unspektakulaerere
 * Loesung und auf einem Telefon die einzige, die zuverlaessig funktioniert:
 * Ziehen und Scrollen streiten sich dort um denselben Finger.
 */

import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ChevronDown, ChevronUp, Download, Plus, Printer } from 'lucide-react';
import { useStudio, livingEntries } from '../../store/useStudio';
import {
  neuNummerieren,
  roemisch,
  romanBaum,
  signatur,
  szeneKontext,
  szeneWoerter,
  verschiebe,
  woerter,
  type RomanBaum,
} from '../../lib/roman/struktur';
import { alsDocx, alsDruckHtml, alsMarkdown, alsText, dateiname, umfang } from '../../lib/roman/ausgabe';
import { asText } from '../../lib/templates';
import { StatusPill } from '../../components/entry/StatusPill';
import { EmptyState } from '../../components/ui/EmptyState';
import { BookMarked } from 'lucide-react';
import { cx, downloadFile } from '../../lib/utils';

/* ------------------------------------------------------------- Das Regal */

/** Alle Romane des Buches. Meist einer – dann fuehrt der Weg direkt hinein. */
export function RomanRegal() {
  const alleEintraege = useStudio((s) => s.entries);
  const createEntry = useStudio((s) => s.createEntry);
  const relIndex = useStudio((s) => s.relIndex);
  const navigate = useNavigate();

  const entries = useMemo(() => livingEntries(alleEintraege), [alleEintraege]);
  const byId = useMemo(() => new Map(entries.map((e) => [e.id, e])), [entries]);
  const romane = useMemo(
    () => entries.filter((e) => e.type === 'roman').sort((a, b) => b.updatedAt - a.updatedAt),
    [entries],
  );

  const anlegen = () => {
    void createEntry('roman', { title: 'Neuer Roman' }).then((r) => navigate(`/roman/${r.id}`));
  };

  if (romane.length === 0) {
    return (
      <div className="mx-auto w-full max-w-[42rem] px-6 py-14">
        <EmptyState
          icon={BookMarked}
          title="Hier steht noch kein Manuskript"
          message="Ein Roman in Dragoncore ist kein zweiter Ort für deine Welt. Seine Figuren sind deine Figuren, seine Orte deine Orte – nur erzählt statt beschrieben."
          action={
            <button
              type="button"
              onClick={anlegen}
              className="inline-flex min-h-[42px] items-center gap-1.5 rounded-full border border-gild-500/40 px-5 font-serif text-[15px] text-gold transition-colors hover:bg-gild-400/10 no-tap-highlight"
            >
              <Plus size={15} /> Einen Roman beginnen
            </button>
          }
        />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[42rem] px-6 py-10">
      <p className="rubric">Manuskripte</p>
      <div className="mt-5">
        {romane.map((r) => {
          const baum = romanBaum(relIndex, byId, r.id);
          return (
            <Link
              key={r.id}
              to={`/roman/${r.id}`}
              className="block border-b border-line py-4 no-tap-highlight last:border-0"
            >
              <h2 className="font-serif text-[22px] leading-snug text-ink">{r.title}</h2>
              {asText(r.fields.logline).trim() && (
                <p className="mt-1 font-serif text-[14.5px] italic leading-relaxed text-ink-muted">
                  {asText(r.fields.logline)}
                </p>
              )}
              <p className="mt-1.5 font-serif text-[12.5px] text-ink-faint">
                {baum ? umfang(baum) : '—'}
              </p>
            </Link>
          );
        })}
      </div>
      <button
        type="button"
        onClick={anlegen}
        className="mt-8 inline-flex min-h-[40px] items-center gap-1.5 font-serif text-[14.5px] text-ink-faint transition-colors hover:text-gold no-tap-highlight"
      >
        <Plus size={14} /> Noch einen Roman
      </button>
    </div>
  );
}

/* ------------------------------------------------------------ Ein Roman */

export function RomanBlatt() {
  const { id } = useParams();
  const navigate = useNavigate();

  const alleEintraege = useStudio((s) => s.entries);
  const relIndex = useStudio((s) => s.relIndex);
  const createUnter = useStudio((s) => s.createUnter);
  const updateEntry = useStudio((s) => s.updateEntry);
  const ordneNeu = useStudio((s) => s.ordneNeu);

  const entries = useMemo(() => livingEntries(alleEintraege), [alleEintraege]);
  const byId = useMemo(() => new Map(entries.map((e) => [e.id, e])), [entries]);
  const baum = useMemo(() => (id ? romanBaum(relIndex, byId, id) : null), [relIndex, byId, id]);

  if (!baum) {
    return (
      <div className="mx-auto w-full max-w-[42rem] px-6 py-14 text-center">
        <p className="font-serif text-[16px] italic text-ink-faint">
          Dieser Roman steht nicht mehr im Buch.
        </p>
        <Link to="/roman" className="mt-3 inline-block font-serif text-[14px] text-gold hover:underline">
          Zurück zu den Manuskripten
        </Link>
      </div>
    );
  }

  const ziel = Number(asText(baum.roman.fields.zielWoerter));
  const geschrieben = baum.kapitel
    .flatMap((k) => k.szenen)
    .concat(baum.lose)
    .reduce((s, e) => s + szeneWoerter(e), 0);

  const kapitelUmordnen = (von: number, nach: number) => {
    ordneNeu(neuNummerieren(verschiebe(baum.kapitel.map((k) => k.kapitel), von, nach)));
  };

  return (
    <div className="mx-auto w-full max-w-[42rem] px-6 py-10">
      <p className="rubric">Roman</p>
      <input
        value={baum.roman.title}
        onChange={(e) => updateEntry(baum.roman.id, { title: e.target.value })}
        aria-label="Titel des Romans"
        className="mt-1.5 w-full border-0 bg-transparent p-0 font-serif text-[30px] leading-tight text-ink outline-none placeholder:text-ink-faint/35"
        placeholder="Ohne Titel"
      />
      <p className="mt-2 font-serif text-[13px] text-ink-faint">{umfang(baum)}</p>

      {ziel > 0 && (
        <p className="mt-1 font-serif text-[13px] text-ink-faint">
          {Math.min(100, Math.round((geschrieben / ziel) * 100))} % von{' '}
          {ziel.toLocaleString('de-DE')} Wörtern
        </p>
      )}

      <span aria-hidden className="rule-gild mt-6 block w-24 opacity-70" />

      {/* --------------------------------------------------------- Kapitel */}
      <div className="mt-7">
        {baum.kapitel.length === 0 && baum.lose.length === 0 && (
          <p className="py-6 font-serif text-[15px] italic leading-relaxed text-ink-faint">
            Dieses Manuskript wartet noch auf sein erstes Kapitel.
          </p>
        )}

        {baum.kapitel.map(({ kapitel, szenen }, i) => (
          <section key={kapitel.id} className="mb-8">
            <div className="flex items-baseline gap-2">
              <span className="rubric shrink-0">Kapitel {roemisch(i + 1)}</span>
              <span className="flex-1" />
              <Umordner
                obenMoeglich={i > 0}
                untenMoeglich={i < baum.kapitel.length - 1}
                onHoch={() => kapitelUmordnen(i, i - 1)}
                onRunter={() => kapitelUmordnen(i, i + 1)}
              />
            </div>

            <input
              value={kapitel.title}
              onChange={(e) => updateEntry(kapitel.id, { title: e.target.value })}
              aria-label={`Titel von Kapitel ${i + 1}`}
              className="mt-0.5 w-full border-0 bg-transparent p-0 font-serif text-[20px] leading-snug text-ink outline-none placeholder:text-ink-faint/35"
              placeholder="Ohne Titel"
            />

            <Szenenliste
              szenen={szenen}
              baum={baum}
              relIndex={relIndex}
              byId={byId}
              onUmordnen={(von, nach) => ordneNeu(neuNummerieren(verschiebe(szenen, von, nach)))}
            />

            <button
              type="button"
              onClick={() => void createUnter(kapitel.id, 'szene').then((s) => navigate(`/schreiben/${s.id}`))}
              className="mt-2 inline-flex min-h-[38px] items-center gap-1.5 font-serif text-[14px] text-ink-faint transition-colors hover:text-gold no-tap-highlight"
            >
              <Plus size={13} /> Szene
            </button>
          </section>
        ))}

        {baum.lose.length > 0 && (
          <section className="mb-8">
            <p className="rubric">Ohne Kapitel</p>
            <Szenenliste
              szenen={baum.lose}
              baum={baum}
              relIndex={relIndex}
              byId={byId}
              onUmordnen={(von, nach) => ordneNeu(neuNummerieren(verschiebe(baum.lose, von, nach)))}
            />
          </section>
        )}
      </div>

      <button
        type="button"
        onClick={() =>
          void createUnter(
            baum.roman.id,
            'kapitel',
            `Kapitel ${baum.kapitel.length + 1}`,
          )
        }
        className="inline-flex min-h-[40px] items-center gap-1.5 rounded-full border border-gild-500/40 px-4 font-serif text-[14.5px] text-gold transition-colors hover:bg-gild-400/10 no-tap-highlight"
      >
        <Plus size={14} /> Kapitel
      </button>

      <Ausgabe baum={baum} />
    </div>
  );
}

/* ------------------------------------------------------------- Bausteine */

function Szenenliste({
  szenen,
  relIndex,
  byId,
  onUmordnen,
}: {
  szenen: import('../../types').Entry[];
  baum: RomanBaum;
  relIndex: import('../../lib/relations').RelationIndex;
  byId: Map<string, import('../../types').Entry>;
  onUmordnen: (von: number, nach: number) => void;
}) {
  if (szenen.length === 0) {
    return (
      <p className="mt-2 font-serif text-[14px] italic text-ink-faint/75">
        Noch keine Szene in diesem Kapitel.
      </p>
    );
  }
  return (
    <ul className="mt-3">
      {szenen.map((szene, i) => {
        const zeichen = signatur(szeneKontext(relIndex, byId, szene.id), szene);
        const w = szeneWoerter(szene);
        return (
          <li key={szene.id} className="flex items-start gap-2 border-b border-line/70 last:border-0">
            <Link to={`/schreiben/${szene.id}`} className="min-w-0 flex-1 py-2.5 no-tap-highlight">
              <span className="block truncate font-serif text-[16px] text-ink">{szene.title}</span>
              {zeichen && (
                <span className="mt-0.5 block truncate font-serif text-[12.5px] text-ink-faint">
                  {zeichen}
                </span>
              )}
            </Link>
            <span className="shrink-0 pt-3.5 text-[11.5px] tabular-nums text-ink-faint/60">
              {w > 0 ? w.toLocaleString('de-DE') : '—'}
            </span>
            {szene.status !== 'Idee' && (
              <StatusPill status={szene.status} className="mt-3 hidden shrink-0 sm:inline-flex" />
            )}
            <span className="shrink-0 pt-1.5">
              <Umordner
                obenMoeglich={i > 0}
                untenMoeglich={i < szenen.length - 1}
                onHoch={() => onUmordnen(i, i - 1)}
                onRunter={() => onUmordnen(i, i + 1)}
              />
            </span>
          </li>
        );
      })}
    </ul>
  );
}

function Umordner({
  obenMoeglich,
  untenMoeglich,
  onHoch,
  onRunter,
}: {
  obenMoeglich: boolean;
  untenMoeglich: boolean;
  onHoch: () => void;
  onRunter: () => void;
}) {
  return (
    <span className="flex shrink-0">
      <button
        type="button"
        onClick={onHoch}
        disabled={!obenMoeglich}
        aria-label="Nach oben"
        className="grid h-8 w-7 place-items-center text-ink-faint/35 transition-colors hover:text-gold-hell disabled:opacity-0 no-tap-highlight"
      >
        <ChevronUp size={14} />
      </button>
      <button
        type="button"
        onClick={onRunter}
        disabled={!untenMoeglich}
        aria-label="Nach unten"
        className="grid h-8 w-7 place-items-center text-ink-faint/35 transition-colors hover:text-gold-hell disabled:opacity-0 no-tap-highlight"
      >
        <ChevronDown size={14} />
      </button>
    </span>
  );
}

/**
 * Vier Wege aus dem Haus.
 *
 * Sie stehen ganz unten und nicht oben, weil man einmal exportiert und
 * hundertmal schreibt.
 */
function Ausgabe({ baum }: { baum: RomanBaum }) {
  const notify = useStudio((s) => s.notify);
  const [offen, setOffen] = useState(false);
  const leer = woerter(alsText(baum)) < 5;

  const drucke = () => {
    const w = window.open('', '_blank');
    if (!w) {
      notify('Der Browser hat das Druckfenster blockiert.', 'error');
      return;
    }
    w.document.write(alsDruckHtml(baum));
    w.document.close();
    /* Erst schreiben lassen, dann drucken – sonst ist die Seite noch leer. */
    w.setTimeout(() => w.print(), 300);
  };

  const laden = (blob: Blob, name: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  };

  return (
    <section className="mt-14 border-t border-line pt-5">
      {!offen ? (
        <button
          type="button"
          onClick={() => setOffen(true)}
          className="inline-flex min-h-[38px] items-center gap-1.5 font-serif text-[14px] text-ink-faint transition-colors hover:text-gold no-tap-highlight"
        >
          <Download size={13} /> Aus dem Haus lassen
        </button>
      ) : (
        <div className="animate-fadeIn">
          <p className="rubric mb-3">Ausgabe</p>
          {leer ? (
            <p className="font-serif text-[14px] italic leading-relaxed text-ink-faint">
              Noch ist nichts geschrieben, das sich ausgeben ließe.
            </p>
          ) : (
            <>
              <div className="flex flex-wrap gap-2">
                <Knopf
                  onClick={() =>
                    downloadFile(dateiname(baum.roman.title, 'md'), alsMarkdown(baum), 'text/markdown')
                  }
                >
                  Markdown
                </Knopf>
                <Knopf
                  onClick={() =>
                    downloadFile(dateiname(baum.roman.title, 'txt'), alsText(baum), 'text/plain')
                  }
                >
                  Text
                </Knopf>
                <Knopf onClick={() => laden(alsDocx(baum), dateiname(baum.roman.title, 'docx'))}>
                  Word
                </Knopf>
                <Knopf onClick={drucke}>
                  <Printer size={13} /> Drucken · PDF
                </Knopf>
              </div>
              <p className="mt-3 font-serif text-[12.5px] italic leading-relaxed text-ink-faint">
                Kapitel und Szenentrenner kommen mit, Weltdaten nicht – ein Manuskript
                ist ein Manuskript. PDF entsteht im Druckdialog des Browsers.
              </p>
            </>
          )}
        </div>
      )}
    </section>
  );
}

function Knopf({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(
        'inline-flex min-h-[38px] items-center gap-1.5 rounded-full border border-lineStrong px-4',
        'font-serif text-[14px] text-ink-muted transition-colors hover:border-gild-500/40 hover:text-gold no-tap-highlight',
      )}
    >
      {children}
    </button>
  );
}
