/**
 * Die Setzerei.
 *
 * Man legt ein geschriebenes Blatt ein – etwa aus ChatGPT – und das Buch setzt
 * daraus eine Seite. Alles geschieht auf diesem Gerät; der Text wird nirgendwo
 * hingeschickt.
 *
 *     MANUSKRIPT   Text einlegen. Das Buch sagt, was es darin erkennt.
 *     VEREDELN     Die fast gesetzte Seite, an der Stelle angefasst, die man
 *                  antippt.
 *     SEITE        Wie sie im Buch aussehen wird – dieselbe Setzung, nicht
 *                  eine nachgebaute.
 *
 * ---
 *
 * **Was diese Datei ist und was nicht.**
 *
 * Sie hält den Zustand und verteilt ihn. Die Setzarbeit steckt in den
 * Bauteilen unter `components/setzerei/`, das Maß in `lib/setzerei/`. Als
 * hier noch alles beieinander stand, waren es fünfhundert Zeilen, in denen
 * eine Textfläche, eine Typenliste, ein Feldsatz und eine Vorschau um
 * dieselbe Aufmerksamkeit rangen.
 *
 * **Kein Eintrag entsteht vor der letzten Handlung.** `createEntry` steht
 * genau einmal in dieser Datei, in `insBuch()`. Wer die Setzerei zwischendurch
 * verlässt, hinterlässt nichts – kein Bruchstück, keinen halben Titel, keine
 * Karteileiche zwischen den echten Seiten. Der Entwurf lebt im Arbeitsspeicher
 * und sonst nirgends; siehe `lib/setzerei/draft.ts`.
 */

import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Check, ClipboardCopy, Eye, Search, Wand2 } from 'lucide-react';
import { useStudio, livingEntries } from '../../store/useStudio';
import {
  transcribe,
  promptTemplateFor,
  blankTemplateFor,
  beziehungFuer,
} from '../../lib/transcribe';
import { templateFor, asText } from '../../lib/templates';
import type { FieldDef } from '../../lib/templates';
import { weltbezugVon } from '../../lib/setzerei/darstellung';
import {
  alsEntry,
  artikelFuer,
  bausteineIn,
  draftAus,
  draftAuffrischen,
  draftBloecke,
  draftSetzen,
  erkanntesInWorten,
  type SetzereiDraft,
  type SetzereiPhase,
} from '../../lib/setzerei/draft';
import { chapterOfType } from '../../lib/book';
import { ManuskriptBlatt, Erkennungszeile } from '../../components/setzerei/ManuskriptBlatt';
import { TypVorschlag } from '../../components/setzerei/TypVorschlag';
import { TypenBogen } from '../../components/setzerei/TypenBogen';
import { VeredelBlatt } from '../../components/setzerei/VeredelBlatt';
import { SetzereiSchritte } from '../../components/setzerei/SetzereiSchritte';
import { Seitentext } from '../../components/entry/Seitentext';
import { Still } from '../../components/setzerei/Setzerei';
import { Modal } from '../../components/ui/Modal';
import { Thumb } from '../../components/images/Thumb';
import { AppendixSheet } from './Appendix';
import { cx } from '../../lib/utils';
import type { Entry } from '../../types';

export function Setzerei() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const entries = useStudio((s) => s.entries);
  const settings = useStudio((s) => s.settings);
  const createEntry = useStudio((s) => s.createEntry);
  const addRelation = useStudio((s) => s.addRelation);
  const notify = useStudio((s) => s.notify);

  const [text, setText] = useState('');
  /** Leer = der Erkennung folgen; sonst die Wahl des Verfassers. */
  const [gewaehlterTyp, setGewaehlterTyp] = useState<string>(params.get('typ') ?? '');
  const [phase, setPhase] = useState<SetzereiPhase>('manuskript');
  const [bogenOffen, setBogenOffen] = useState(false);
  const [busy, setBusy] = useState(false);

  /** Der Entwurf. Existiert erst nach „So setzen", und nie in der Datenbank. */
  const [draft, setDraft] = useState<SetzereiDraft | null>(null);
  /** Feldschlüssel → vorhandener Eintrag, mit dem verbunden werden soll. */
  const [weltbezuege, setWeltbezuege] = useState<Record<string, string>>({});
  const [bezugswahl, setBezugswahl] = useState<FieldDef | null>(null);

  const living = useMemo(() => livingEntries(entries), [entries]);

  /*
   * Das Lesen des Manuskripts geschieht mitten im Rendern. Wirft es, reisst
   * es die ganze Setzerei mit – genau so verschwand das Buch auf älteren
   * iPhones hinter einer leeren Seite. Ein unleserliches Manuskript ist aber
   * kein Grund, den Raum zu verlassen: Der eingegebene Text bleibt stehen,
   * und daneben steht, was schiefging.
   */
  const [gelesen, leseFehler] = useMemo<[ReturnType<typeof transcribe> | null, string]>(() => {
    if (!text.trim()) return [null, ''];
    try {
      return [transcribe(text, living, gewaehlterTyp || undefined), ''];
    } catch (err) {
      const e = err as Error;
      return [null, `${e?.name ?? 'Fehler'}: ${e?.message ?? String(err)}`];
    }
  }, [text, living, gewaehlterTyp]);

  const typ = gewaehlterTyp || gelesen?.suggestedType || 'page';
  const tpl = templateFor(typ);

  /* --------------------------------------------------------- Die Handgriffe */

  /**
   * „So setzen" – aus dem Manuskript wird ein Entwurf.
   *
   * Beim zweiten Mal wird aufgefrischt statt ersetzt: Wer zurückgeht, eine
   * Zeile ergänzt und erneut setzt, behält alles, was er im Veredeln selbst
   * geschrieben hat. Ohne das wäre „zurück zum Manuskript" eine Falle.
   */
  const soSetzen = () => {
    if (!gelesen) return;
    setDraft((alt) => (alt ? draftAuffrischen(alt, gelesen, typ) : draftAus(gelesen, typ)));
    setPhase('veredeln');
  };

  const kopierePrompt = async () => {
    try {
      await navigator.clipboard.writeText(promptTemplateFor(typ, settings.worldName));
      notify('Vorlage kopiert – jetzt in ChatGPT einsetzen.', 'success');
    } catch {
      notify('Kopieren nicht möglich.', 'error');
    }
  };

  /*
   * Das Gerüst kommt an den Anfang, der vorhandene Text bleibt darunter
   * stehen. Nichts geht verloren – auch dann nicht, wenn schon etwas
   * geschrieben war.
   */
  const geruestEinsetzen = () => {
    const geruest = blankTemplateFor(typ);
    setText((alt) => (alt.trim() ? `${geruest}\n\n${alt}` : `${geruest}\n\n`));
  };

  /**
   * Ins Buch – der einzige Ort, an dem etwas gespeichert wird.
   */
  const insBuch = async () => {
    if (!draft || !draft.title.trim()) {
      notify('Ohne Titel lässt sich keine Seite setzen.', 'error');
      return;
    }
    setBusy(true);
    try {
      const entry = await createEntry(draft.type, {
        title: draft.title.trim(),
        subtitle: draft.subtitle,
        category: draft.category,
        description: draft.description,
        beginn: draft.beginn,
        ende: draft.ende,
        tags: draft.tags,
        fields: draft.fields,
        blocks: draft.blocks,
        ...(draft.status ? { status: draft.status } : {}),
      });

      /* Die im Text erkannten Erwähnungen – mit der Art, die der Parser fand. */
      const verbunden = new Set<string>();
      for (const m of draft.mentions) {
        if (!draft.verbinden.includes(m.entryId)) continue;
        addRelation(entry.id, m.entryId, m.relationType ?? 'related');
        verbunden.add(m.entryId);
      }

      /*
       * Und die von Hand gesetzten Weltbezüge.
       *
       * Was der Parser schon verbunden hat, wird hier nicht noch einmal
       * verbunden – sonst stünden zwei Kanten für eine Aussage im Graphen,
       * und eine davon wäre die ungenauere. `addRelation` fängt nur
       * Doppelungen *gleicher* Art ab; die Arten unterschieden sich.
       *
       * Wo der Parser nichts fand, nimmt die Setzerei **dieselbe** Ableitung
       * aus der Beschriftung, die er benutzt.
       */
      for (const [schluessel, zielId] of Object.entries(weltbezuege)) {
        if (!zielId || zielId === entry.id || verbunden.has(zielId)) continue;
        const feld = tpl.fields.find((f) => f.key === schluessel);
        addRelation(entry.id, zielId, beziehungFuer(feld?.label ?? '') ?? 'related');
      }

      notify(`„${entry.title}“ steht jetzt im Buch.`, 'success');
      navigate(`/eintrag/${entry.id}`);
    } catch (err) {
      /*
       * Ohne dieses `catch` verliesse ein Fehler die Setzerei ungefangen und
       * käme erst am Fenster an – wo Safari ihn zu einem blossen
       * „Script error." verkürzt und die Ursache verschweigt.
       */
      const e = err as Error;
      notify(
        `Die Seite liess sich nicht setzen: ${e?.name ?? 'Fehler'} – ${e?.message ?? String(err)}`,
        'error',
      );
    } finally {
      setBusy(false);
    }
  };

  const verbindungen =
    (draft?.verbinden.length ?? 0) +
    Object.entries(weltbezuege).filter(
      ([, id]) => id && !draft?.verbinden.includes(id),
    ).length;

  return (
    <AppendixSheet
      title="Setzerei"
      rubric="Anhang · Aus Rohmaterial wird eine Buchseite"
      /*
       * Die Schrittfolge gehört an den unteren Rand des Blattes und nicht
       * ans Ende des Inhalts. Sie steht deshalb hier und nicht unten im
       * Fluss – siehe `fussleiste` in `AppendixSheet`.
       */
      fussleiste={
        <SetzereiSchritte jetzt={phase} onWechsel={setPhase} bereit={!!draft} />
      }
    >
      {phase === 'manuskript' && (
        <Manuskriptphase
          text={text}
          onText={setText}
          gelesen={gelesen}
          leseFehler={leseFehler}
          typ={typ}
          gewaehlt={!!gewaehlterTyp}
          onSoSetzen={soSetzen}
          onAndersSetzen={() => setBogenOffen(true)}
          onGeruest={geruestEinsetzen}
          onPrompt={() => void kopierePrompt()}
          hatEntwurf={!!draft}
        />
      )}

      {phase === 'veredeln' && draft && (
        <div className="lg:grid lg:grid-cols-[minmax(0,1fr),minmax(0,21rem)] lg:gap-12">
          <div>
            <Zurueck onClick={() => setPhase('manuskript')} label="Zurück zum Manuskript">
              <button
                type="button"
                onClick={() => setPhase('seite')}
                className="inline-flex min-h-[36px] items-center gap-1.5 font-serif text-[13px] italic text-ink-faint transition-colors hover:text-gold no-tap-highlight lg:hidden"
              >
                Vorschau der Seite <Eye size={13} />
              </button>
            </Zurueck>

            <VeredelBlatt
              draft={draft}
              onSetzen={(key, wert) => setDraft((d) => (d ? draftSetzen(d, key, wert) : d))}
              onBloecke={(blocks) => setDraft((d) => (d ? draftBloecke(d, blocks) : d))}
              onVerbinden={(id) =>
                setDraft((d) =>
                  d
                    ? {
                        ...d,
                        verbinden: d.verbinden.includes(id)
                          ? d.verbinden.filter((x) => x !== id)
                          : [...d.verbinden, id],
                      }
                    : d,
                )
              }
              entries={living}
              weltbezuege={weltbezuege}
              onWeltbezug={setBezugswahl}
            />

            <Setzknopf
              busy={busy}
              bereit={!!draft.title.trim()}
              verbindungen={verbindungen}
              kapitel={chapterOfType(draft.type).title}
              onSetzen={() => void insBuch()}
            />
          </div>

          {/*
            Am Schreibtisch liegt die Seite daneben. Auf dem Telefon nicht –
            dort ist sie der dritte Schritt. Zwei Spalten auf einer Handbreite
            waren der ursprüngliche Fehler.

            **Und sie bleibt stehen.** Ohne `sticky` stand die Vorschau oben
            im Raster, und sobald man beim Veredeln nach unten arbeitete, war
            die rechte Bildschirmhälfte leer – eine halbe Seite Nichts neben
            der Arbeit. Eine Vorschau, die man nicht sieht, während man das
            ändert, was sie zeigen soll, ist keine.
          */}
          <aside className="hidden lg:sticky lg:top-4 lg:block lg:max-h-[calc(100vh-8rem)] lg:self-start lg:overflow-y-auto">
            <p className="rubric mb-3">So wird die Seite</p>
            <div className="paper-sheet rounded-[2px] px-6 py-7 shadow-[0_2px_16px_-10px_rgba(60,44,26,0.6)]">
              <Seitentext entry={alsEntry(draft)} verweise={false} />
            </div>
          </aside>
        </div>
      )}

      {phase === 'seite' && draft && (
        <div className="mx-auto max-w-[38rem]">
          <Zurueck onClick={() => setPhase('veredeln')} label="Zurück zum Veredeln" />
          <div className="paper-sheet satz-eintritt rounded-[2px] px-7 py-8 shadow-[0_2px_18px_-10px_rgba(60,44,26,0.6)]">
            <p className="rubric mb-1">{templateFor(draft.type).label}</p>
            <Seitentext entry={alsEntry(draft)} verweise={false} />
          </div>
          <Setzknopf
            busy={busy}
            bereit={!!draft.title.trim()}
            verbindungen={verbindungen}
            kapitel={chapterOfType(draft.type).title}
            onSetzen={() => void insBuch()}
          />
        </div>
      )}

      {/* Ohne Entwurf gibt es nichts zu veredeln – und das steht da, statt leer zu bleiben. */}
      {phase !== 'manuskript' && !draft && (
        <Still was="Noch ist nichts eingelegt. Zurück zum Manuskript, dort beginnt es." />
      )}

      <TypenBogen
        offen={bogenOffen}
        onClose={() => setBogenOffen(false)}
        gewaehlt={gewaehlterTyp}
        vorschlag={gelesen?.suggestedType}
        onWaehlen={setGewaehlterTyp}
      />

      <Weltwahl
        def={bezugswahl}
        onClose={() => setBezugswahl(null)}
        entries={living}
        gewaehlt={bezugswahl ? weltbezuege[bezugswahl.key] : undefined}
        onWaehlen={(id) => {
          if (!bezugswahl) return;
          setWeltbezuege((alt) => {
            const next = { ...alt };
            if (id) next[bezugswahl.key] = id;
            else delete next[bezugswahl.key];
            return next;
          });
          /*
           * Der Name wandert zugleich ins Feld – wenn dort noch nichts steht.
           * Das Datenmodell ändert sich nicht: Der Text bleibt Text, die
           * Kante kommt dazu. Was schon dasteht, wird nicht überschrieben;
           * jemand kann „im Nebelwald aufgewachsen" geschrieben haben und
           * trotzdem den Ort meinen.
           */
          const ziel = living.find((e) => e.id === id);
          setDraft((d) => {
            if (!d || !ziel) return d;
            const jetzt = asText(d.fields[bezugswahl.key]);
            return jetzt.trim() ? d : draftSetzen(d, bezugswahl.key, ziel.title);
          });
          setBezugswahl(null);
        }}
      />
    </AppendixSheet>
  );
}

/* --------------------------------------------------------- 1 · Manuskript */

function Manuskriptphase({
  text,
  onText,
  gelesen,
  leseFehler,
  typ,
  gewaehlt,
  onSoSetzen,
  onAndersSetzen,
  onGeruest,
  onPrompt,
  hatEntwurf,
}: {
  text: string;
  onText: (t: string) => void;
  gelesen: ReturnType<typeof transcribe> | null;
  leseFehler: string;
  typ: string;
  gewaehlt: boolean;
  onSoSetzen: () => void;
  onAndersSetzen: () => void;
  onGeruest: () => void;
  onPrompt: () => void;
  hatEntwurf: boolean;
}) {
  const tpl = templateFor(typ);

  return (
    <div className="mx-auto max-w-[40rem]">
      <h2 className="font-serif text-[24px] leading-tight text-ink">Manuskript einlegen</h2>
      <p className="mt-1.5 font-serif text-[15px] italic leading-relaxed text-ink-muted">
        Lege hier deine Worte auf das Blatt.
      </p>

      <div className="mt-6">
        <ManuskriptBlatt text={text} onText={onText} />
      </div>

      <p className="mt-3 font-serif text-[12.5px] italic text-ink-faint">
        Text aus ChatGPT, einer Notiz oder einem Dokument. Nichts verlässt dieses Gerät.
      </p>

      {leseFehler ? (
        <div className="mt-6 border-l-2 border-mahnung/60 pl-4">
          <p className="font-serif text-[15px] italic leading-relaxed text-ink-muted">
            Dieses Manuskript liess sich nicht lesen. Der Text bleibt unangetastet.
          </p>
          <pre className="mt-2 whitespace-pre-wrap break-words font-mono text-[11px] leading-relaxed text-ink-faint/80">
            {leseFehler}
          </pre>
        </div>
      ) : gelesen ? (
        <>
          <Erkennungszeile
            bausteine={bausteineIn(gelesen)}
            typLabel={tpl.label}
            artikel={artikelFuer(typ)}
            satz={erkanntesInWorten(gelesen, typ)}
            vermutet={!gewaehlt}
          />
          <TypVorschlag
            type={typ}
            gewaehlt={gewaehlt}
            onSetzen={onSoSetzen}
            onAndersSetzen={onAndersSetzen}
          />
          {hatEntwurf && (
            <p className="mt-3 font-serif text-[12.5px] italic leading-relaxed text-ink-faint">
              Ein Entwurf liegt bereits vor. Erneutes Setzen frischt ihn auf und lässt stehen, was
              du selbst geschrieben hast.
            </p>
          )}
        </>
      ) : (
        <p className="mt-6 font-serif text-[15px] italic text-ink-faint">Noch nichts eingelegt.</p>
      )}

      {/*
        Die zwei Helfer stehen unten und leise.

        Das Gerüst schreibt die Feldnamen ins Manuskript, damit man sie
        ausfüllen kann; die Vorlage fragt dieselben Felder in ChatGPT ab. Beide
        bleiben – sie waren nie das Problem. Das Problem war, dass sie die
        halbe Seite füllten.
      */}
      <div className="mt-9 flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-line pt-4">
        <button
          type="button"
          onClick={onGeruest}
          className="inline-flex min-h-[40px] items-center gap-1.5 font-serif text-[14px] italic text-gold transition-colors hover:text-gold-hell no-tap-highlight"
        >
          <Wand2 size={14} /> Gerüst einsetzen
        </button>
        <button
          type="button"
          onClick={onPrompt}
          className="inline-flex min-h-[40px] items-center gap-1.5 font-serif text-[14px] italic text-gold transition-colors hover:text-gold-hell no-tap-highlight"
        >
          <ClipboardCopy size={14} /> Vorlage für ChatGPT kopieren
        </button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------- Gemeinsames */

function Zurueck({
  onClick,
  label,
  children,
}: {
  onClick: () => void;
  label: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="mb-5 flex items-center justify-between gap-4">
      <button
        type="button"
        onClick={onClick}
        className="inline-flex min-h-[36px] items-center gap-1.5 font-serif text-[13px] italic text-ink-faint transition-colors hover:text-gold no-tap-highlight"
      >
        <ArrowLeft size={13} /> {label}
      </button>
      {children}
    </div>
  );
}

function Setzknopf({
  busy,
  bereit,
  verbindungen,
  kapitel,
  onSetzen,
}: {
  busy: boolean;
  bereit: boolean;
  verbindungen: number;
  kapitel: string;
  onSetzen: () => void;
}) {
  return (
    <div className="mt-10 border-t border-line pt-6">
      <button
        type="button"
        onClick={onSetzen}
        disabled={busy || !bereit}
        data-leitfaden="setzerei-ins-buch"
        className="inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-full border border-gild-500/50 bg-gild-400/10 px-6 font-serif text-[16px] text-gold transition-colors duration-300 hover:bg-gild-400/20 disabled:opacity-40 no-tap-highlight"
      >
        <Wand2 size={17} />
        {busy ? 'Wird gesetzt …' : 'Ins Buch setzen'}
        {verbindungen > 0 && !busy && (
          <span className="text-[13px] italic">
            · {verbindungen} {verbindungen === 1 ? 'Verbindung' : 'Verbindungen'}
          </span>
        )}
      </button>
      <p className="mt-2.5 text-center font-serif text-[13px] italic text-ink-faint">
        Kommt ins Kapitel „{kapitel}".
      </p>
    </div>
  );
}

/* ------------------------------------------------ Weltwissen als Auswahl */

/**
 * Was es schon gibt.
 *
 * `Modal` ist auf dem Telefon ein von unten aufsteigendes Blatt und am
 * Schreibtisch ein Dialog – gebaut, geprüft, überall im Buch im Einsatz. Ein
 * zweites Sheet danebenzustellen wäre ein zweiter Ort für dieselbe Bewegung.
 */
function Weltwahl({
  def,
  onClose,
  entries,
  gewaehlt,
  onWaehlen,
}: {
  def: FieldDef | null;
  onClose: () => void;
  entries: Entry[];
  gewaehlt: string | undefined;
  onWaehlen: (id: string | null) => void;
}) {
  const [suche, setSuche] = useState('');
  const typen = def ? weltbezugVon(def.key) : undefined;

  const treffer = useMemo(() => {
    const q = suche.trim().toLowerCase();
    return entries
      .filter((e) => !typen?.length || typen.includes(e.type))
      .filter((e) =>
        !q ? true : [e.title, e.subtitle, e.category, ...e.tags].join(' ').toLowerCase().includes(q),
      )
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .slice(0, 40);
  }, [entries, typen, suche]);

  if (!def) return null;

  return (
    <Modal open onClose={onClose} title={def.label} size="md">
      <p className="mb-4 font-serif text-[14px] italic leading-relaxed text-ink-muted">
        Was es in deiner Welt schon gibt. Wird eines gewählt, entsteht eine echte Verbindung – der
        Name bleibt trotzdem im Feld stehen.
      </p>

      <div className="relative mb-4">
        <Search
          size={16}
          className="pointer-events-none absolute left-0 top-1/2 -translate-y-1/2 text-ink-faint"
        />
        <input
          value={suche}
          onChange={(e) => setSuche(e.target.value)}
          placeholder="Suchen"
          className="w-full border-0 border-b border-line bg-transparent pb-1.5 pl-6 font-serif text-[16px] text-ink outline-none transition-colors placeholder:text-ink-faint/50 focus:border-gild-500/50"
        />
      </div>

      {treffer.length === 0 ? (
        <p className="py-6 text-center font-serif text-[15px] italic text-ink-muted">
          Dazu gibt es noch keine Seite. Der Text im Feld bleibt trotzdem stehen – die Verbindung
          lässt sich später nachtragen.
        </p>
      ) : (
        <ul className="divide-y divide-line">
          {treffer.map((e) => {
            const an = e.id === gewaehlt;
            return (
              <li key={e.id}>
                <button
                  type="button"
                  onClick={() => onWaehlen(an ? null : e.id)}
                  className={cx(
                    'flex w-full items-center gap-3 py-2.5 text-left no-tap-highlight',
                  )}
                >
                  <Thumb imageId={e.coverImage} alt="" className="h-10 w-10 shrink-0" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-serif text-[15.5px] text-ink">
                      {e.title}
                    </span>
                    <span className="block truncate font-serif text-[13px] italic text-ink-faint">
                      {templateFor(e.type).label}
                      {e.category ? ` · ${e.category}` : ''} · bereits in deiner Welt
                    </span>
                  </span>
                  {an && <Check size={16} className="shrink-0 text-gold" />}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </Modal>
  );
}
