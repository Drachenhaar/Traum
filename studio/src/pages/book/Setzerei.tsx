/**
 * Die Setzerei.
 *
 * Man legt ein geschriebenes Blatt ein – etwa aus ChatGPT – und das Buch setzt
 * daraus eine Seite. Alles geschieht auf diesem Gerät; der Text wird nirgendwo
 * hingeschickt.
 *
 * ---
 *
 * **Was hier umgebaut wurde und was nicht.**
 *
 * Nicht angefasst: `transcribe()` liest weiter denselben Rohtext, `templates.ts`
 * beschreibt weiter dieselben Felder, `createEntry` und `addRelation` speichern
 * weiter dasselbe. Kein Feld ist verschwunden, kein Format hat sich geändert.
 *
 * Angefasst: der Weg dorthin. Vorher war es ein Formular – ein großes
 * Textfeld, darunter „Was Charakter kennt" als Liste von dreißig
 * Feldnamen samt Hinweisen wie „durch Komma getrennt", daneben eine Vorschau
 * mit einer Feldtabelle. Man pflegte einen Datensatz.
 *
 * Jetzt sind es drei Schritte:
 *
 *     MANUSKRIPT   Text einlegen. Das Buch sagt, was es erkannt hat.
 *     VEREDELN     Was fehlt, steht als Frage da – nicht als leerer Kasten.
 *     SEITE        Wie es im Buch aussehen wird. Dieselbe Setzung, nicht
 *                  eine nachgebaute.
 *
 * Die vollständige Feldliste gibt es weiterhin – unter „Alle Felder zeigen".
 * Sie ist für Strukturarbeit da, nicht für den Normalfall.
 */

import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Check,
  ChevronDown,
  ClipboardCopy,
  FileInput,
  Search,
  Wand2,
} from 'lucide-react';
import { useStudio, livingEntries } from '../../store/useStudio';
import { transcribe, promptTemplateFor, blankTemplateFor, beziehungFuer } from '../../lib/transcribe';
import { templateFor, templatesByFamily, asList, asText } from '../../lib/templates';
import type { FieldDef } from '../../lib/templates';
import { gruppiere } from '../../lib/feldgruppen';
import { weltbezugVon } from '../../lib/setzerei/darstellung';
import { relationType } from '../../lib/relations';
import { chapterOfType } from '../../lib/book';
import { Feldsatz, Marke, hatWert } from '../../components/setzerei/Feldsatz';
import { Seitentext } from '../../components/entry/Seitentext';
import { Modal } from '../../components/ui/Modal';
import { Thumb } from '../../components/images/Thumb';
import { AppendixSheet } from './Appendix';
import { cx } from '../../lib/utils';
import type { Entry, FieldValue } from '../../types';

type Schritt = 'manuskript' | 'veredeln' | 'seite';

/**
 * Die fünf Angaben, die jede Seite hat, stehen nicht in `fields`.
 *
 * Sie bekommen darum – wie schon in `angabenFor` – ein vorangestelltes
 * Rautezeichen, damit kein eigenes Feld sie versehentlich trifft.
 */
const KERNFELDER: FieldDef[] = [
  { key: '#title', label: 'Titel', kind: 'text' },
  { key: '#subtitle', label: 'Untertitel', kind: 'text' },
  { key: '#category', label: 'Kategorie', kind: 'select', options: [] },
  { key: '#description', label: 'Beschreibung', kind: 'textarea', hint: 'Worum geht es hier?' },
  { key: '#tags', label: 'Schlagworte', kind: 'tags' },
  { key: '#beginn', label: 'Beginn', kind: 'text', hint: 'Wann begann es?' },
  { key: '#ende', label: 'Ende', kind: 'text', hint: 'Wann endete es – oder besteht es fort?' },
];

export function Setzerei() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const entries = useStudio((s) => s.entries);
  const settings = useStudio((s) => s.settings);
  const createEntry = useStudio((s) => s.createEntry);
  const addRelation = useStudio((s) => s.addRelation);
  const notify = useStudio((s) => s.notify);

  const [text, setText] = useState('');
  /** Leer = der Erkennung folgen; sonst die Wahl des Nutzers. */
  const [chosenType, setChosenType] = useState<string>(params.get('typ') ?? '');
  const [schritt, setSchritt] = useState<Schritt>('manuskript');
  const [skipped, setSkipped] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [typenOffen, setTypenOffen] = useState(false);
  /** Für Strukturarbeit: jedes Feld, auch das leere, mit seinem Schlüssel. */
  const [alleFelder, setAlleFelder] = useState(false);

  /*
   * Was der Verfasser selbst gesetzt hat – und was er dabei berührt hat.
   *
   * Der Trick ist die Trennung. `eigen` hält nur die Werte, die von Hand
   * kommen; alles andere wird bei jeder Änderung am Manuskript neu aus dem
   * Text gelesen. Wer also oben weiterschreibt, sieht unten die Vorschläge
   * mitwachsen – aber was er selbst eingetragen hat, bleibt stehen.
   *
   * `beruehrt` merkt sich, was der Verfasser gesehen und entschieden hat.
   * Nur dadurch kann ein Wert aufhören, ein Vorschlag zu sein, ohne sich zu
   * ändern: „Übernehmen" heisst nicht „anders", sondern „gelesen".
   */
  const [eigen, setEigen] = useState<Record<string, FieldValue>>({});
  const [beruehrt, setBeruehrt] = useState<Set<string>>(new Set());
  /** Feldschlüssel → vorhandener Eintrag, mit dem er verbunden werden soll. */
  const [weltbezug, setWeltbezug] = useState<Record<string, string>>({});
  const [bezugswahl, setBezugswahl] = useState<FieldDef | null>(null);

  const living = useMemo(() => livingEntries(entries), [entries]);

  /*
   * Das Lesen des Manuskripts geschieht mitten im Rendern. Wirft es, reisst
   * es die ganze Setzerei mit – genau so verschwand das Buch auf aelteren
   * iPhones hinter einer leeren Seite. Ein unleserliches Manuskript ist aber
   * kein Grund, den Raum zu verlassen: Der eingegebene Text bleibt stehen,
   * und daneben steht, was schiefging.
   */
  const [result, leseFehler] = useMemo<[ReturnType<typeof transcribe> | null, string]>(() => {
    if (!text.trim()) return [null, ''];
    try {
      return [transcribe(text, living, chosenType || undefined), ''];
    } catch (err) {
      const e = err as Error;
      return [null, `${e?.name ?? 'Fehler'}: ${e?.message ?? String(err)}`];
    }
  }, [text, living, chosenType]);

  const activeType = chosenType || result?.suggestedType || 'page';
  const tpl = templateFor(activeType);
  const families = useMemo(() => templatesByFamily(), []);

  /* ------------------------------------------------------------ Der Stand */

  /** Was aus dem Manuskript kam – für alle Angaben, mit und ohne Raute. */
  const ausText = useMemo<Record<string, FieldValue>>(() => {
    if (!result) return {};
    return {
      '#title': result.title,
      '#subtitle': result.subtitle,
      '#category': result.category,
      '#description': result.description,
      '#tags': result.tags,
      '#beginn': result.beginn,
      '#ende': result.ende,
      ...result.fields,
    };
  }, [result]);

  const wertVon = (key: string): FieldValue | undefined =>
    key in eigen ? eigen[key] : ausText[key];

  const istVorschlag = (key: string): boolean =>
    !(key in eigen) && !beruehrt.has(key) && hatWert(ausText[key]);

  const setzen = (key: string, v: FieldValue) => {
    setEigen((alt) => ({ ...alt, [key]: v }));
    setBeruehrt((alt) => new Set(alt).add(key));
  };
  const uebernehmen = (key: string) => setBeruehrt((alt) => new Set(alt).add(key));
  const verwerfen = (key: string) => {
    const leer: FieldValue = Array.isArray(ausText[key]) ? [] : '';
    setEigen((alt) => ({ ...alt, [key]: leer }));
    setBeruehrt((alt) => new Set(alt).add(key));
  };

  /* -------------------------------------------------------- Die Abschnitte */

  /*
   * Bilder bleiben aussen vor – wie bisher. `angabenFor` liess sie schon
   * immer aus, und der Erkennungslauf kann ohnehin kein Bild finden. Man
   * waehlt sie auf der fertigen Seite.
   */
  const feldbar = useMemo(
    () => tpl.fields.filter((f) => !f.anderswo && f.kind !== 'images'),
    [tpl],
  );

  /*
   * Der Kern – Stammangaben und die kurzen Kennzeichen in **einem** Abschnitt.
   *
   * Beim ersten Lauf standen hier zwei Abschnitte namens „Der Kern"
   * untereinander: einer mit Titel, Kategorie, Beschreibung, einer mit Rolle
   * und Alter. Zwei gleich benannte Ueberschriften auf einer Seite sind kein
   * Schoenheitsfehler, sondern eine kaputte Gliederung – und `feldgruppen.ts`
   * hat die Gruppe `kern` genau fuer diese Angaben. Also gehoeren sie
   * zusammen, so wie es der Auftrag beschreibt: Titel, Untertitel, Kategorie,
   * Beschreibung, Rolle.
   */
  const gruppenAlle = useMemo(() => gruppiere(feldbar), [feldbar]);

  const kern = useMemo<FieldDef[]>(() => {
    const stamm = KERNFELDER.map((f) =>
      f.key === '#category' ? { ...f, options: tpl.categories } : f,
    );
    const kennzeichen = gruppenAlle.find((g) => g.gruppe.id === 'kern')?.felder ?? [];
    /*
     * Beschreibung und Weltzeit stehen hinter den Kennzeichen: Erst wer, dann
     * was daran kurz zu sagen ist, dann der Absatz darüber.
     */
    const vorn = stamm.slice(0, 3);
    const hinten = stamm.slice(3);
    return [...vorn, ...kennzeichen, ...hinten];
  }, [tpl, gruppenAlle]);

  const gruppen = useMemo(
    () => gruppenAlle.filter((g) => g.gruppe.id !== 'kern'),
    [gruppenAlle],
  );

  /* ------------------------------------------------------------- Handeln */

  const copyPrompt = async () => {
    const prompt = promptTemplateFor(activeType, settings.worldName);
    try {
      await navigator.clipboard.writeText(prompt);
      notify('Vorlage kopiert – jetzt in ChatGPT einsetzen.', 'success');
    } catch {
      notify('Kopieren nicht möglich. Die Vorlage steht unten zum Markieren.', 'error');
    }
  };

  /*
   * Das Gerüst kommt an den Anfang, der vorhandene Text bleibt darunter
   * stehen. Nichts geht verloren – auch dann nicht, wenn schon etwas
   * geschrieben war.
   */
  const insertTemplate = () => {
    const geruest = blankTemplateFor(activeType);
    setText((alt) => (alt.trim() ? `${geruest}\n\n${alt}` : `${geruest}\n\n`));
  };

  /** Der Eintrag, wie er entstehen würde – auch für die Vorschau. */
  const entwurf = useMemo<Entry>(() => {
    const fields: Record<string, FieldValue> = {};
    for (const f of feldbar) {
      const v = wertVon(f.key);
      if (v !== undefined) fields[f.key] = v;
    }
    /* Bildfelder unverändert aus dem Manuskript durchreichen. */
    for (const f of tpl.fields) {
      if (f.kind === 'images' && ausText[f.key] !== undefined) fields[f.key] = ausText[f.key];
    }
    return {
      id: 'entwurf',
      title: asText(wertVon('#title')),
      subtitle: asText(wertVon('#subtitle')),
      type: activeType,
      category: asText(wertVon('#category')),
      description: asText(wertVon('#description')),
      tags: asList(wertVon('#tags')),
      status: result?.status ?? 'Idee',
      favorite: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      linkedEntryIds: [],
      blocks: result?.blocks ?? [],
      fields,
      beginn: asText(wertVon('#beginn')),
      ende: asText(wertVon('#ende')),
    } as Entry;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [feldbar, tpl, eigen, ausText, activeType, result]);

  const commit = async () => {
    if (!entwurf.title.trim()) {
      notify('Ohne Titel lässt sich keine Seite setzen.', 'error');
      return;
    }
    setBusy(true);
    try {
      const entry = await createEntry(activeType, {
        title: entwurf.title.trim(),
        subtitle: entwurf.subtitle,
        category: entwurf.category,
        description: entwurf.description,
        beginn: entwurf.beginn,
        ende: entwurf.ende,
        tags: entwurf.tags,
        fields: entwurf.fields,
        blocks: entwurf.blocks,
        ...(result?.status ? { status: result.status } : {}),
      });

      /* Die im Text erkannten Erwähnungen – unverändert wie bisher. */
      for (const mention of result?.mentions ?? []) {
        if (skipped.has(mention.entryId)) continue;
        addRelation(entry.id, mention.entryId, mention.relationType ?? 'related');
      }

      /*
       * Und die von Hand gesetzten Weltbezüge.
       *
       * Der Text im Feld bleibt stehen – „Herkunft: Nebelwald" liest sich
       * auch dann noch, wenn jemand die Verbindung später löst. Dazu kommt
       * die echte Kante, damit das Buch von der Verbindung *weiss*: Sie
       * erscheint im Weltgraphen, auf der Gegenseite und in den Pfaden.
       *
       * ---
       *
       * **Zwei Kanten für eine Aussage – der Fehler, den erst der Gerätelauf
       * zeigte.**
       *
       * Hier stand `addRelation(entry.id, zielId, 'related')`. Am Gerät kamen
       * daraufhin zwei Kanten heraus: `Dennisse -comes_from-> Nebelwald` vom
       * Parser, der „Herkunft:" gelesen hatte, und daneben ein vages
       * `related` von hier. `addRelation` faengt Doppelungen ab – aber nur
       * bei *gleicher* Art, und diese beiden waren verschieden.
       *
       * Zwei Kanten, die dasselbe sagen, und eine davon ungenauer. Genau
       * das, was der Auftrag mit „keine Kopie erzeugen, wenn eine echte
       * Verbindung möglich ist" meint – nur eine Ebene tiefer.
       *
       * Also: Was der Parser schon verbunden hat, wird hier nicht noch
       * einmal verbunden. Und wo er nichts fand, nimmt die Setzerei
       * **dieselbe** Ableitung aus der Beschriftung, die er benutzt –
       * `beziehungFuer`, jetzt aus `transcribe.ts` ausgeliehen statt hier
       * ein zweites Mal aufgeschrieben.
       */
      const schonVerbunden = new Set(
        (result?.mentions ?? []).filter((m) => !skipped.has(m.entryId)).map((m) => m.entryId),
      );
      for (const [schluessel, zielId] of Object.entries(weltbezug)) {
        if (!zielId || zielId === entry.id || schonVerbunden.has(zielId)) continue;
        const feld = tpl.fields.find((f) => f.key === schluessel);
        addRelation(entry.id, zielId, beziehungFuer(feld?.label ?? '') ?? 'related');
      }

      notify(`„${entry.title}“ steht jetzt im Buch.`, 'success');
      navigate(`/eintrag/${entry.id}`);
    } catch (err) {
      /*
       * Ohne dieses `catch` verliess ein Fehler die Setzerei ungefangen und
       * kam erst am Fenster an – wo Safari ihn zu einem blossen
       * „Script error." verkuerzt und die Ursache verschweigt.
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
    (result ? result.mentions.filter((m) => !skipped.has(m.entryId)).length : 0) +
    Object.values(weltbezug).filter(Boolean).length;

  /** Wie viel das Buch aus dem Manuskript gelesen hat. */
  const bausteine = useMemo(() => {
    if (!result) return 0;
    return (
      Object.values(ausText).filter((v) => hatWert(v)).length + result.blocks.length
    );
  }, [ausText, result]);

  return (
    <AppendixSheet title="Setzerei" rubric="Anhang · Eine Seite einlegen">
      {/*
        Drei Schritte, ein Bildschirm.

        Auf dem Telefon gab es vorher zwei Spalten untereinander: erst das
        Manuskript samt Feldliste, dann weit darunter der Andruck. Man schrieb
        oben und haette unten nachsehen muessen. Jetzt liegt immer genau ein
        Schritt vor einem, und der Weg ist eine Reihe und kein Scrollen.
      */}
      <Schrittfolge
        jetzt={schritt}
        onWechsel={setSchritt}
        hatText={!!text.trim()}
        bausteine={bausteine}
      />

      <div className="mt-7">
        {schritt === 'manuskript' && (
          <Manuskript
            text={text}
            onText={setText}
            result={result}
            leseFehler={leseFehler}
            tpl={tpl}
            bausteine={bausteine}
            chosenType={chosenType}
            onType={setChosenType}
            typenOffen={typenOffen}
            onTypenOffen={setTypenOffen}
            families={families}
            onGeruest={insertTemplate}
            onPrompt={() => void copyPrompt()}
            onWeiter={() => setSchritt('veredeln')}
          />
        )}

        {schritt === 'veredeln' && (
          <div className="lg:grid lg:grid-cols-[minmax(0,1fr),minmax(0,22rem)] lg:gap-12">
            <div>
              <Veredeln
                kern={kern}
                gruppen={gruppen}
                wertVon={wertVon}
                istVorschlag={istVorschlag}
                setzen={setzen}
                uebernehmen={uebernehmen}
                verwerfen={verwerfen}
                entries={living}
                weltbezug={weltbezug}
                onBezugswahl={setBezugswahl}
                alleFelder={alleFelder}
                onAlleFelder={setAlleFelder}
                tplLabel={tpl.label}
              />

              <Erwaehnungen
                result={result}
                skipped={skipped}
                onSkipped={setSkipped}
              />

              <Setzknopf
                busy={busy}
                bereit={!!entwurf.title.trim()}
                verbindungen={verbindungen}
                onSetzen={() => void commit()}
                kapitel={chapterOfType(activeType).title}
              />
            </div>

            {/*
              Am Schreibtisch liegt die Seite daneben.

              Auf dem Telefon nicht – dort ist sie der dritte Schritt. Zwei
              Spalten auf einer Handbreite waren der urspruengliche Fehler.
            */}
            <aside className="mt-12 hidden lg:mt-0 lg:block">
              <p className="rubric mb-3">So wird die Seite</p>
              <div className="paper-sheet rounded-[2px] px-6 py-7 shadow-[0_2px_16px_-10px_rgba(60,44,26,0.6)]">
                <Seitenvorschau entwurf={entwurf} tplLabel={tpl.label} klein />
              </div>
            </aside>
          </div>
        )}

        {schritt === 'seite' && (
          <div>
            <div className="paper-sheet mx-auto max-w-[38rem] rounded-[2px] px-7 py-8 shadow-[0_2px_18px_-10px_rgba(60,44,26,0.6)]">
              <Seitenvorschau entwurf={entwurf} tplLabel={tpl.label} />
            </div>
            <div className="mx-auto max-w-[38rem]">
              <Setzknopf
                busy={busy}
                bereit={!!entwurf.title.trim()}
                verbindungen={verbindungen}
                onSetzen={() => void commit()}
                kapitel={chapterOfType(activeType).title}
              />
            </div>
          </div>
        )}
      </div>

      {/* Die Auswahlhilfe aus dem Weltwissen – von unten aufsteigend. */}
      <Weltwahl
        def={bezugswahl}
        onClose={() => setBezugswahl(null)}
        entries={living}
        gewaehlt={bezugswahl ? weltbezug[bezugswahl.key] : undefined}
        onWaehlen={(id) => {
          if (!bezugswahl) return;
          setWeltbezug((alt) => {
            const next = { ...alt };
            if (id) next[bezugswahl.key] = id;
            else delete next[bezugswahl.key];
            return next;
          });
          /*
           * Der Name wandert zugleich ins Feld – wenn dort noch nichts steht.
           * Das Datenmodell aendert sich nicht: Der Text bleibt Text, die
           * Kante kommt dazu. Was schon dasteht, wird nicht ueberschrieben;
           * jemand kann „im Nebelwald aufgewachsen" geschrieben haben und
           * trotzdem den Ort meinen.
           */
          const ziel = living.find((e) => e.id === id);
          if (ziel && !hatWert(wertVon(bezugswahl.key))) setzen(bezugswahl.key, ziel.title);
          setBezugswahl(null);
        }}
      />
    </AppendixSheet>
  );
}

/* ------------------------------------------------------------ Die Schritte */

function Schrittfolge({
  jetzt,
  onWechsel,
  hatText,
  bausteine,
}: {
  jetzt: Schritt;
  onWechsel: (s: Schritt) => void;
  hatText: boolean;
  bausteine: number;
}) {
  const schritte: { id: Schritt; label: string }[] = [
    { id: 'manuskript', label: 'Manuskript' },
    { id: 'veredeln', label: 'Veredeln' },
    { id: 'seite', label: 'Seite' },
  ];

  return (
    <nav className="flex items-baseline gap-6 border-b border-line pb-0">
      {schritte.map((s) => {
        const an = s.id === jetzt;
        /*
         * Veredeln und Seite bleiben still, solange kein Manuskript da ist –
         * aber nicht gesperrt. Wer ohne Text direkt schreiben will, darf das:
         * Die Setzerei ist auch ein leeres Blatt.
         */
        const leise = !hatText && s.id !== 'manuskript';
        return (
          <button
            key={s.id}
            type="button"
            onClick={() => onWechsel(s.id)}
            aria-current={an ? 'step' : undefined}
            className={cx(
              'group relative min-h-[44px] font-serif text-[16px] transition-colors no-tap-highlight',
              an ? 'text-ink' : leise ? 'text-ink-faint/60' : 'text-ink-muted hover:text-ink',
            )}
          >
            {s.label}
            {s.id === 'manuskript' && bausteine > 0 && (
              <span className="ml-1.5 font-serif text-[12.5px] italic text-ink-faint">
                {bausteine}
              </span>
            )}
            <span
              aria-hidden
              className={cx(
                'absolute inset-x-0 -bottom-px block h-px transition-colors',
                an ? 'bg-gild-500/70' : 'bg-transparent',
              )}
            />
          </button>
        );
      })}
    </nav>
  );
}

/* --------------------------------------------------------- 1 · Manuskript */

function Manuskript({
  text,
  onText,
  result,
  leseFehler,
  tpl,
  bausteine,
  chosenType,
  onType,
  typenOffen,
  onTypenOffen,
  families,
  onGeruest,
  onPrompt,
  onWeiter,
}: {
  text: string;
  onText: (t: string) => void;
  result: ReturnType<typeof transcribe> | null;
  leseFehler: string;
  tpl: ReturnType<typeof templateFor>;
  bausteine: number;
  chosenType: string;
  onType: (t: string) => void;
  typenOffen: boolean;
  onTypenOffen: (o: boolean) => void;
  families: ReturnType<typeof templatesByFamily>;
  onGeruest: () => void;
  onPrompt: () => void;
  onWeiter: () => void;
}) {
  return (
    <div className="mx-auto max-w-[40rem]">
      <h2 className="font-serif text-[24px] leading-tight text-ink">Manuskript einlegen</h2>
      <p className="mt-2 max-w-[46ch] font-serif text-[15px] italic leading-relaxed text-ink-muted">
        Füge Text aus ChatGPT, einer Notiz oder einem Dokument ein. Nichts verlässt dieses Gerät.
      </p>

      {/*
        Ein Blatt, kein Eingabefeld.

        Der Unterschied ist nicht Kosmetik: Ein Kasten mit Rahmen und
        Systemschrift sagt „Formular", ein liniertes Blatt sagt „schreib".
        Was bleibt, ist die Monoschrift – ein Manuskript mit „Feld: Wert"-
        Zeilen liest sich in gleichmaessiger Breite besser, und das Buch liest
        genau diese Zeilen.
      */}
      <div className="mt-6 rounded-[2px] border border-line/70 bg-cream-100/60 px-5 py-4 shadow-[inset_0_1px_3px_rgba(60,44,26,0.06)]">
        <textarea
          value={text}
          onChange={(e) => onText(e.target.value)}
          data-leitfaden="setzerei-feld"
          placeholder={
            'Titel: Waldkoi\nKategorie: Kreatur\nArt: Schleierkarpfen\nGröße: 40 cm\n\nDer Waldkoi zieht in kleinen Schwärmen durch den Nebelwald …'
          }
          rows={10}
          /*
            Auf dem Telefon Serifen, am Schreibtisch Monoschrift.

            Sechzehn Punkte sind die Untergrenze – darunter zoomt Safari beim
            Hineintippen, ausgerechnet in dem Feld, in das man am meisten
            tippt. Sechzehn Punkte *Monoschrift* aber brechen auf 390 Punkten
            nach vierundzwanzig Zeichen um: „Titel: Dennisse" passte, der
            erste ganze Satz nicht mehr, und ein Manuskript, das man nicht
            lesen kann, ist keins.

            Die Monoschrift war fuer die gleichmaessige Breite der
            „Feld: Wert"-Zeilen da. Auf einer Handbreite richtet sich ohnehin
            nichts aus – dort zaehlt nur, wie viel in eine Zeile passt, und
            die Serifenschrift traegt bei gleicher Groesse fast doppelt so
            viele Zeichen. Am Schreibtisch, wo die Ausrichtung etwas nuetzt,
            bleibt es bei der Monoschrift.
          */
          className="w-full resize-y border-0 bg-transparent p-0 font-serif text-[16px] leading-[1.8] text-ink outline-none placeholder:text-ink-faint/50 sm:font-mono sm:text-[13.5px] sm:leading-[1.85]"
        />
      </div>

      {/*
        Was das Buch gelesen hat – ein Satz, keine Tabelle.

        Vorher stand hier eine Liste von dreissig Feldnamen mit Haken und
        Punkten daneben. Sie war ehrlich und sie war eine Datenbankmaske.
        Diese eine Zeile sagt dasselbe: wie viel angekommen ist, und als was.
      */}
      {leseFehler ? (
        <div className="mt-5 border-l-2 border-mahnung/60 pl-4">
          <p className="font-serif text-[15px] italic leading-relaxed text-ink-muted">
            Dieses Manuskript liess sich nicht lesen. Der Text bleibt unangetastet.
          </p>
          <pre className="mt-2 whitespace-pre-wrap break-words font-mono text-[11px] leading-relaxed text-ink-faint/80">
            {leseFehler}
          </pre>
        </div>
      ) : result ? (
        <p className="mt-5 font-serif text-[15px] italic leading-relaxed text-ink-muted">
          {bausteine} {bausteine === 1 ? 'Baustein' : 'Bausteine'} erkannt
          {result.suggestedType && !chosenType && ` · ${templateFor(result.suggestedType).label} vermutet`}
          {chosenType && ` · als ${tpl.label} gesetzt`}
          {result.unmatched.length > 0 &&
            ` · ${result.unmatched.length} kommen als Notiz auf die Seite`}
        </p>
      ) : (
        <p className="mt-5 font-serif text-[15px] italic leading-relaxed text-ink-faint">
          Noch nichts eingelegt.
        </p>
      )}

      {/* Die Art – die Erkennung stimmt fast immer, also steht die Liste zu. */}
      <div className="mt-7 border-t border-line pt-5">
        <p className="rubric mb-2.5">Als was soll es gesetzt werden?</p>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <Marke an={chosenType === ''} onClick={() => onType('')} klein>
            {result?.suggestedType
              ? `Erkannt: ${templateFor(result.suggestedType).label}`
              : 'Automatisch'}
          </Marke>
          {chosenType && (
            <Marke an onClick={() => onType('')} klein>
              {tpl.label}
            </Marke>
          )}
          <button
            type="button"
            onClick={() => onTypenOffen(!typenOffen)}
            aria-expanded={typenOffen}
            className="inline-flex min-h-[38px] items-center gap-1 font-serif text-[13.5px] italic text-gold transition-colors hover:text-gold-hell no-tap-highlight"
          >
            {typenOffen ? 'Weniger' : 'Andere Art wählen'}
            <ChevronDown
              size={13}
              className={cx('transition-transform duration-300', typenOffen && 'rotate-180')}
            />
          </button>
        </div>

        {typenOffen && (
          <div className="mt-4 space-y-3.5 border-t border-line pt-4">
            {families.map((family) => (
              <section key={family.family}>
                <p className="mb-1.5 font-serif text-[12px] italic text-ink-faint">{family.label}</p>
                <div className="flex flex-wrap gap-1.5">
                  {family.items.map((item) => (
                    <Marke
                      key={item.type}
                      an={chosenType === item.type}
                      onClick={() => {
                        onType(item.type);
                        onTypenOffen(false);
                      }}
                      klein
                    >
                      {item.label}
                    </Marke>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>

      {/*
        Die zwei Helfer stehen unten und leise.

        Das Geruest schreibt die Feldnamen ins Manuskript, damit man sie
        ausfuellen kann; die Vorlage fragt dieselben Felder in ChatGPT ab.
        Beide bleiben – sie waren nie das Problem. Das Problem war, dass sie
        die halbe Seite fuellten.
      */}
      <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-line pt-4">
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

      <button
        type="button"
        onClick={onWeiter}
        className="mt-8 inline-flex min-h-[46px] w-full items-center justify-center gap-2 rounded-full border border-gild-500/50 bg-gild-400/10 px-6 font-serif text-[16px] text-gold transition-colors hover:bg-gild-400/20 no-tap-highlight"
      >
        Weiter zum Veredeln
      </button>
    </div>
  );
}

/* ----------------------------------------------------------- 2 · Veredeln */

function Veredeln({
  kern,
  gruppen,
  wertVon,
  istVorschlag,
  setzen,
  uebernehmen,
  verwerfen,
  entries,
  weltbezug,
  onBezugswahl,
  alleFelder,
  onAlleFelder,
  tplLabel,
}: {
  kern: FieldDef[];
  gruppen: { gruppe: { id: string; label: string }; felder: FieldDef[] }[];
  wertVon: (k: string) => FieldValue | undefined;
  istVorschlag: (k: string) => boolean;
  setzen: (k: string, v: FieldValue) => void;
  uebernehmen: (k: string) => void;
  verwerfen: (k: string) => void;
  entries: Entry[];
  weltbezug: Record<string, string>;
  onBezugswahl: (d: FieldDef) => void;
  alleFelder: boolean;
  onAlleFelder: (b: boolean) => void;
  tplLabel: string;
}) {
  const feld = (def: FieldDef) => (
    <Feldsatz
      key={def.key}
      def={alleFelder ? { ...def, label: `${def.label}  ·  ${def.key}` } : def}
      stand={{ wert: wertVon(def.key), vorschlag: istVorschlag(def.key) }}
      onChange={(v) => setzen(def.key, v)}
      onUebernehmen={() => uebernehmen(def.key)}
      onVerwerfen={() => verwerfen(def.key)}
      onVerweis={weltbezugVon(def.key) ? onBezugswahl : undefined}
      verknuepft={entries.find((e) => e.id === weltbezug[def.key])}
      entries={entries}
    />
  );

  return (
    <div className="mx-auto max-w-[40rem] lg:mx-0">
      <h2 className="font-serif text-[24px] leading-tight text-ink">Veredeln</h2>
      <p className="mt-2 max-w-[46ch] font-serif text-[15px] italic leading-relaxed text-ink-muted">
        Was das Buch gelesen hat, steht als Vorschlag da. Was fehlt, steht als Frage.
      </p>

      {/* Der Kern steht immer offen – ohne Titel gibt es keine Seite. */}
      <Abschnitt titel="Der Kern" offen zaehlung={fuellstand(kern, wertVon)}>
        {kern.map(feld)}
      </Abschnitt>

      {gruppen.map(({ gruppe, felder }) => (
        <Abschnitt
          key={gruppe.id}
          titel={gruppe.label || tplLabel}
          /*
           * Offen ist, was schon etwas traegt. Alles andere ist zu – und das
           * ist der ganze Unterschied zwischen einer Seite, ueber die man
           * nachdenkt, und einer Wand aus Kaesten.
           */
          offen={alleFelder || felder.some((f) => hatWert(wertVon(f.key)))}
          zaehlung={fuellstand(felder, wertVon)}
        >
          {felder.map(feld)}
        </Abschnitt>
      ))}

      {/*
        Die vollstaendige Feldliste – fuer Strukturarbeit, nicht fuer den
        Normalfall. Sie oeffnet jeden Abschnitt und schreibt den technischen
        Schluessel neben die Beschriftung. Wer eine Vorlage baut oder einen
        Importfehler sucht, braucht genau das; wer eine Figur setzt, nie.
      */}
      <button
        type="button"
        onClick={() => onAlleFelder(!alleFelder)}
        aria-pressed={alleFelder}
        className="mt-6 inline-flex min-h-[40px] items-center gap-1.5 font-serif text-[13px] italic text-ink-faint transition-colors hover:text-gold no-tap-highlight"
      >
        <ChevronDown size={13} className={cx('transition-transform', alleFelder && 'rotate-180')} />
        {alleFelder ? 'Wieder ruhig zeigen' : 'Alle Felder des Gerüsts anzeigen'}
      </button>
    </div>
  );
}

function fuellstand(felder: FieldDef[], wertVon: (k: string) => FieldValue | undefined): string {
  const voll = felder.filter((f) => hatWert(wertVon(f.key))).length;
  return voll > 0 ? `${voll} von ${felder.length}` : '';
}

/**
 * Ein Abschnitt.
 *
 * Die Zahl daneben ist kein Fortschrittsbalken, sondern eine Auskunft: Wer
 * zuklappt, soll wissen, ob darunter etwas steht. Ohne sie wäre jedes
 * geschlossene Dreieck eine Frage.
 */
function Abschnitt({
  titel,
  offen,
  zaehlung,
  children,
}: {
  titel: string;
  offen: boolean;
  zaehlung: string;
  children: React.ReactNode;
}) {
  const [auf, setAuf] = useState(offen);
  return (
    <section className="mt-7 border-t border-line pt-4 first:mt-8">
      <button
        type="button"
        onClick={() => setAuf((o) => !o)}
        aria-expanded={auf}
        className="flex min-h-[42px] w-full items-baseline gap-3 text-left no-tap-highlight"
      >
        <span className="flex-1 font-serif text-[17px] text-ink">{titel}</span>
        {zaehlung && (
          <span className="shrink-0 font-serif text-[12.5px] italic text-ink-faint">{zaehlung}</span>
        )}
        <ChevronDown
          size={14}
          className={cx(
            'shrink-0 text-ink-faint/60 transition-transform duration-300',
            !auf && '-rotate-90',
          )}
        />
      </button>
      {auf && <div className="pb-1 pt-1">{children}</div>}
    </section>
  );
}

/* ------------------------------------------------------- Die Erwähnungen */

function Erwaehnungen({
  result,
  skipped,
  onSkipped,
}: {
  result: ReturnType<typeof transcribe> | null;
  skipped: Set<string>;
  onSkipped: (s: Set<string>) => void;
}) {
  if (!result || result.mentions.length === 0) return null;

  return (
    <section className="mt-10 border-t border-line pt-5">
      <p className="rubric mb-1">Im Text erwähnt</p>
      <p className="mb-3 font-serif text-[13.5px] italic text-ink-muted">
        Diese Seiten gibt es bereits. Angehakte werden mit der neuen verbunden.
      </p>
      <ul className="space-y-0.5">
        {result.mentions.map((mention) => {
          const on = !skipped.has(mention.entryId);
          const rel = relationType(mention.relationType ?? 'related');
          return (
            <li key={mention.entryId}>
              <button
                type="button"
                onClick={() => {
                  const next = new Set(skipped);
                  if (on) next.add(mention.entryId);
                  else next.delete(mention.entryId);
                  onSkipped(next);
                }}
                className="flex w-full items-baseline gap-2.5 py-1.5 text-left no-tap-highlight"
              >
                <span
                  className={cx(
                    'mt-[3px] grid h-[15px] w-[15px] shrink-0 place-items-center rounded-[2px] border transition-colors',
                    on ? 'border-gild-500/70 bg-gild-400/25 text-gold' : 'border-lineStrong',
                  )}
                >
                  {on && <Check size={11} strokeWidth={3} />}
                </span>
                <span className="min-w-0">
                  <span className="font-serif text-[15px] text-ink">{mention.title}</span>
                  <span className="ml-2 font-serif text-[12.5px] italic text-ink-faint">
                    {rel.label} · {mention.via}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/* ------------------------------------------------------------- 3 · Seite */

function Seitenvorschau({
  entwurf,
  tplLabel,
  klein,
}: {
  entwurf: Entry;
  tplLabel: string;
  klein?: boolean;
}) {
  if (!entwurf.title.trim()) {
    return (
      <div className="py-10 text-center">
        <FileInput size={22} className="mx-auto mb-3 text-ink-faint/50" strokeWidth={1.5} />
        <p className="font-serif text-[15px] italic text-ink-muted">
          Sobald ein Titel dasteht, erscheint hier die Seite.
        </p>
      </div>
    );
  }

  return (
    <div className={cx(klein && 'text-[0.86em] [&_h1]:text-[26px] sm:[&_h1]:text-[26px]')}>
      <p className="rubric mb-1">{tplLabel}</p>
      {/*
        Dieselbe Setzung wie im Buch – nicht eine nachgebaute.

        `Seitentext` ist der Rumpf, der auch `EntrySpread` traegt: Initiale,
        Grade, Fragen ueber den Abschnitten, Randnotizen. Vorher stand hier
        eine eigene kleine Seite mit einer Feldtabelle, und die sah dem Buch
        nur aehnlich. „Ungefaehr so wird es aussehen" ist keine Vorschau.
      */}
      <Seitentext entry={entwurf} verweise={false} />
    </div>
  );
}

function Setzknopf({
  busy,
  bereit,
  verbindungen,
  onSetzen,
  kapitel,
}: {
  busy: boolean;
  bereit: boolean;
  verbindungen: number;
  onSetzen: () => void;
  kapitel: string;
}) {
  return (
    <div className="mt-10 border-t border-line pt-6">
      <button
        type="button"
        onClick={onSetzen}
        disabled={busy || !bereit}
        className="inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-full border border-gild-500/50 bg-gild-400/10 px-6 font-serif text-[16px] text-gold transition-colors hover:bg-gild-400/20 disabled:opacity-40 no-tap-highlight"
      >
        <Wand2 size={17} />
        {busy ? 'Wird gesetzt …' : 'Ins Buch übernehmen'}
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
                  className="flex w-full items-center gap-3 py-2.5 text-left no-tap-highlight"
                >
                  <Thumb imageId={e.coverImage} alt="" className="h-10 w-10 shrink-0" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-serif text-[15.5px] text-ink">
                      {e.title}
                    </span>
                    <span className="block truncate font-serif text-[13px] italic text-ink-faint">
                      {templateFor(e.type).label}
                      {e.category ? ` · ${e.category}` : ''} · bereits vorhanden
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
