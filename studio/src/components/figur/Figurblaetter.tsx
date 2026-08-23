/**
 * Was auf den Registerblättern einer Figur steht.
 *
 * Gebaut nach dem Dennisse-Bild. Alles hier ist **Lesesicht auf vorhandene
 * Felder** – es entsteht kein Eintrag, kein Feld, keine Kante. Wer schreiben
 * will, geht auf die Buchseite; dort steht der Stift.
 *
 * ---
 *
 * **Das Bild ist eine Doppelseite. Das Telefon ist es nicht.**
 *
 * Im Referenzbild stehen Wesen und Fähigkeiten nebeneinander, die
 * Vergangenheit hat eine Illustration daneben, und unten läuft ein Band über
 * die ganze Breite. Auf 390 Punkten wäre jede dieser Spalten hundertsiebzig
 * Punkte breit – für Fließtext ist das eine Zeitungsspalte von 1890.
 *
 * Also fließt es auf dem Telefon untereinander, und die Zweispaltigkeit
 * kommt zurück, sobald Platz da ist (`sm:`). Das ist kein Kompromiss, sondern
 * dasselbe Gesetz wie beim Buchsatz: Die Zeilenlänge bestimmt die Spalte, und
 * nicht umgekehrt.
 */

import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStudio } from '../../store/useStudio';
import { relationsOf } from '../../lib/relations';
import { zeichenFuer } from '../../lib/zeichen/zeichen';
import { Bildnis } from './Bildnis';
import { Buchmarke, Drachenschatten } from '../../lib/zeichen/embleme';
import {
  Absatz,
  Abschnitt,
  Angabe,
  Angaben,
  Bildunterschrift,
  Fliesstext,
  Haarlinie,
  Handnotiz,
  Randnotiz,
  Rubrik as SatzRubrik,
  Still as SatzStill,
  Trenner,
  Zitat,
} from '../setzerei/Setzerei';
import { cx } from '../../lib/utils';
import type { Entry } from '../../types';

/* ------------------------------------------------------------ Bausteine --- */

const text = (v: unknown) => (typeof v === 'string' ? v.trim() : '');
const liste = (v: unknown): string[] =>
  Array.isArray(v)
    ? v.filter((x): x is string => typeof x === 'string' && !!x.trim())
    : text(v)
      ? text(v)
          .split(/\r?\n|·|,/)
          .map((s) => s.trim())
          .filter(Boolean)
      : [];

/*
 * Die vier Grundbausteine ziehen ihr Mass aus der Setzerei.
 *
 * Vorher standen hier vier eigene Groessen – 10,5 Punkt fuer die Rubrik,
 * 13,5 fuer den Satz, 12 fuer die Stille, 9,5 fuer die Bezeichnung einer
 * Angabe. Vier Zahlen, die niemand mehr mit den Zahlen anderer Seiten
 * vergleichen konnte, und genau daran erkennt man eine Seite, die
 * zusammengeschoben und nicht gesetzt wurde.
 *
 * Sie bleiben als Namen stehen, weil die Blaetter darunter sie benutzen –
 * aber sie entscheiden nichts mehr selbst. Wer die Groesse des Lesetextes
 * aendern will, aendert sie in `lib/setzerei/mass.ts`, und sie aendert sich
 * im ganzen Buch.
 */

/** Eine Abschnittsüberschrift in Gold, wie im Bild. */
export function Rubrik({ children }: { children: React.ReactNode }) {
  return <SatzRubrik className="text-gild-400/80">{children}</SatzRubrik>;
}

/**
 * Ein Absatz Buchtext.
 *
 * `mittig` schaltet zusaetzlich den Erstzeileneinzug ab: Ein zentrierter
 * Absatz mit eingerueckter erster Zeile sieht aus, als waere die Zentrierung
 * misslungen.
 */
const Satz = ({ children, mittig }: { children: React.ReactNode; mittig?: boolean }) =>
  mittig ? (
    <p className="satz-fliess text-center text-paper-200/85">{children}</p>
  ) : (
    <Absatz className="text-paper-200/85">{children}</Absatz>
  );

const Still = ({ was }: { was: string }) => (
  <SatzStill was={was} className="py-6 text-center text-paper-300/40" />
);

/** Die feine Goldlinie zwischen den Blöcken des Referenzbildes. */
const Linie = () => <Haarlinie className="text-gild-500" />;

/* ------------------------------------------------------- Die Kopfangaben -- */

/**
 * Die fünf Zeilen unter dem Namen: Alter, Herkunft, Volk, Rolle, Zugehörigkeit.
 *
 * **Zugehörigkeit fragt erst die Kante, dann das Feld.** Wer einem Orden
 * angehört, hat dafür eine `member_of`-Verbindung, und die ist die bessere
 * Wahrheit: Sie verbindet zwei Seiten, statt einen Namen zweimal zu
 * schreiben. Steht dort ein Eintrag, wird er verlinkt; steht dort nichts,
 * gilt das Feld – für Fälle wie „keine feste", die keine eigene Seite
 * verdienen.
 *
 * Dasselbe gilt für die Herkunft: Ein `lives_in` auf einen echten Ort schlägt
 * jeden getippten Ortsnamen.
 */
function Kopfangaben({ entry }: { entry: Entry }) {
  const entries = useStudio((s) => s.entries);
  const relIndex = useStudio((s) => s.relIndex);
  const navigate = useNavigate();

  const ausKante = useMemo(() => {
    const nach = new Map(entries.map((e) => [e.id, e]));
    const kanten = relationsOf(relIndex, entry.id);
    const finde = (art: string) => {
      const k = kanten.find((r) => r.relation.type === art && nach.has(r.otherId));
      return k ? nach.get(k.otherId) : undefined;
    };
    return { ort: finde('lives_in'), orden: finde('member_of') };
  }, [entries, relIndex, entry.id]);

  const zeilen: { name: string; wert: string; ziel?: Entry }[] = [
    { name: 'Alter', wert: text(entry.fields?.age) },
    {
      name: 'Herkunft',
      wert: ausKante.ort?.title ?? text(entry.fields?.herkunft),
      ziel: ausKante.ort,
    },
    { name: 'Volk', wert: text(entry.fields?.volk) },
    { name: 'Rolle', wert: text(entry.fields?.role) },
    {
      name: 'Zugehörigkeit',
      wert: ausKante.orden?.title ?? text(entry.fields?.zugehoerigkeit),
      ziel: ausKante.orden,
    },
  ].filter((z) => z.wert);

  if (!zeilen.length) return null;

  /*
   * Der Verweis wird erst beim Beruehren sichtbar (§21).
   *
   * Vorher stand unter jedem verknuepften Namen ein Unterstrich. Fuenf Zeilen
   * mit drei Unterstrichen sehen aus wie ein Formular mit Links – und das
   * Buch soll im Ruhezustand ein Buch sein. Der Name traegt jetzt nur eine
   * sehr feine goldene Tonung; der Unterstrich kommt beim Antippen.
   */
  return (
    <Angaben>
      {zeilen.map((z) => (
        <Angabe key={z.name} name={z.name}>
          {z.ziel ? (
            <button
              type="button"
              onClick={() => navigate(`/eintrag/${z.ziel!.id}`)}
              className={cx(
                'text-left text-gild-200 decoration-gild-500/50 underline-offset-[5px]',
                'no-tap-highlight hover:underline active:underline active:opacity-70',
              )}
            >
              {z.wert}
            </button>
          ) : (
            <span className="text-paper-100">{z.wert}</span>
          )}
        </Angabe>
      ))}
    </Angaben>
  );
}

/**
 * Eine gemalte Szene neben einem Abschnitt – oder eine Prägung, wo keine ist.
 *
 * Das Referenzbild hat hier zwei Bilder: das Mädchen an der Schnauze des
 * Drachen, den aufgeschlagenen Band. Beide sind gemalt, und was gemalt ist,
 * kann kein Pfad ersetzen – der Versuch, wenigstens den Drachen zu zeichnen,
 * hat drei Anläufe gekostet und ist gescheitert (siehe `embleme.tsx`).
 *
 * Also derselbe Umgang wie beim Bildnis: ein Schacht, und solange er leer
 * ist, etwas, das nicht nach Fehler aussieht.
 */
function Szenenbild({
  bildId,
  marke,
  nummer,
  unterschrift,
  zusatz,
}: {
  bildId?: string;
  marke: 'buch' | 'drache';
  nummer?: number;
  unterschrift?: string;
  zusatz?: string;
}) {
  /*
   * Die Bildunterschrift steht nur unter einem **echten** Bild.
   *
   * Der leere Schacht traegt eine Praegung, damit die Seite nicht nach Fehler
   * aussieht – aber „Abb. 01 — Dennisse" unter einer Praegung waere eine
   * Bildunterschrift ohne Bild, und das ist schlimmer als keine.
   */
  if (bildId)
    return (
      <figure className="shrink-0">
        <Bildnis
          bildId={bildId}
          schacht="beziehungsbildnis"
          ecken
          className="h-[104px] w-[124px] rounded-[2px]"
        />
        {unterschrift && (
          <Bildunterschrift nummer={nummer} zusatz={zusatz} className="max-w-[124px] text-paper-300/70">
            {unterschrift}
          </Bildunterschrift>
        )}
      </figure>
    );
  return (
    <div
      className="grid h-[104px] w-[124px] shrink-0 place-items-center rounded-[2px] text-gild-500/20"
      style={{ boxShadow: 'inset 0 0 0 1px rgba(184,134,11,0.10)' }}
      data-szene="leer"
      aria-hidden
    >
      {marke === 'buch' ? <Buchmarke groesse={52} /> : <Drachenschatten groesse={64} />}
    </div>
  );
}

const erstesBild = (v: unknown): string | undefined => liste(v)[0];

/* ------------------------------------------------------------- Die Blätter */

export function BlattUebersicht({ entry }: { entry: Entry }) {
  const zitat = text(entry.fields?.zitat);
  const beschreibung = text(entry.description);
  const rand = text(entry.fields?.randbemerkung);

  /*
   * Die Reihenfolge folgt dem Referenzbild und nicht dem Datensatz.
   *
   * Dort steht unter dem Namen zuerst das Zitat – kursiv, zentriert, mit
   * Luft –, dann die fuenf Angaben des Nachschlagewerks, dann erst der
   * beschreibende Absatz. Ein Formular haette die umgekehrte Ordnung: erst
   * die Felder, dann der Freitext. Ein Buch beginnt mit dem, was einen
   * Menschen kenntlich macht.
   */
  if (!zitat && !beschreibung && !rand)
    return <Still was="Über diese Figur steht noch nichts geschrieben." />;

  return (
    <div>
      {zitat && (
        <p className="satz-fliess mb-1 text-center italic text-paper-100/80">„{zitat}“</p>
      )}

      <Kopfangaben entry={entry} />

      {beschreibung && (
        <>
          <Linie />
          {/*
            Der beschreibende Absatz steht linksbuendig und nicht zentriert.

            Zentrierter Fliesstext hat auf beiden Seiten eine ausgefranste
            Kante; das Auge findet den Zeilenanfang nicht mehr blind und
            muss ihn jedes Mal suchen. Fuer drei Worte unter einem Titel ist
            das schoen, fuer fuenf Zeilen Text ist es anstrengend. Zentriert
            bleiben deshalb nur Zitat und Titel.
          */}
          <div className="text-paper-200/85">
            <Fliesstext text={beschreibung} />
          </div>
        </>
      )}

      {/*
        Die spaetere Eintragung von Hand (§18).

        Sie steht am Ende der Uebersicht und nirgends sonst. Eine
        handschriftliche Notiz auf jedem Registerblatt waere keine zweite
        Ebene mehr, sondern die erste in anderer Schrift.
      */}
      {rand && <Handnotiz className="mt-7 text-gild-400/80">{rand}</Handnotiz>}
    </div>
  );
}

export function BlattAussehen({ entry }: { entry: Entry }) {
  const stuecke = [
    { name: 'Gesicht', wert: text(entry.fields?.face) },
    { name: 'Haare', wert: text(entry.fields?.hair) },
    { name: 'Kleidung', wert: text(entry.fields?.clothing) },
  ].filter((s) => s.wert);

  if (!stuecke.length) return <Still was="Wie sie aussieht, steht noch nicht geschrieben." />;

  return (
    <div className="space-y-5">
      {stuecke.map((s) => (
        <section key={s.name}>
          <Rubrik>{s.name}</Rubrik>
          <div className="mt-1.5">
            <Satz>{s.wert}</Satz>
          </div>
        </section>
      ))}
    </div>
  );
}

/**
 * Wesen und Fähigkeiten – im Bild zwei Spalten mit einem Drachen dazwischen.
 *
 * Die beiden Listen sind bewusst **verschieden gesetzt**: Wesen mit Rauten,
 * Fähigkeiten mit Gedankenstrichen, genau wie im Referenzbild. Das ist keine
 * Spielerei – es sind zwei verschiedene Sorten Aussage. Das eine ist, wie
 * jemand *ist*, das andere, was jemand *kann*, und man soll beim Überfliegen
 * nicht erst lesen müssen, um zu wissen, welche Spalte man vor sich hat.
 */
export function BlattWesen({ entry }: { entry: Entry }) {
  const wesen = liste(entry.fields?.wesen).length
    ? liste(entry.fields?.wesen)
    : liste(entry.fields?.quirks);
  const koennen = liste(entry.fields?.faehigkeiten);
  const persoenlich = text(entry.fields?.personality);

  if (!wesen.length && !koennen.length && !persoenlich)
    return <Still was="Wer sie ist, steht noch nicht geschrieben." />;

  return (
    <div className="relative space-y-6">
      {/*
        Das Wasserzeichen hinter den Listen – wie im Referenzbild.

        Sehr schwach und ohne eigene Aussage: Es soll verhindern, dass eine
        große dunkle Fläche neben zwei kurzen Listen leer wirkt. Dieselbe
        Aufgabe, die auf dem Grund der Seite das Korn übernimmt.
      */}
      <div
        className="pointer-events-none absolute -right-4 top-8 text-gild-500/[0.06]"
        aria-hidden
      >
        <Drachenschatten groesse={168} />
      </div>

      {persoenlich && <Satz>{persoenlich}</Satz>}

      <div className="relative grid gap-6 sm:grid-cols-2">
        {wesen.length > 0 && (
          <section>
            <Rubrik>Wesen</Rubrik>
            <ul className="mt-2 space-y-1.5">
              {wesen.map((w) => (
                <li key={w} className="flex gap-2 font-serif text-[13.5px] text-paper-200/85">
                  <span className="mt-[7px] h-[5px] w-[5px] shrink-0 rotate-45 bg-gild-500/60" aria-hidden />
                  {w}
                </li>
              ))}
            </ul>
          </section>
        )}

        {koennen.length > 0 && (
          <section>
            <Rubrik>Fähigkeiten</Rubrik>
            <ul className="mt-2 space-y-1.5">
              {koennen.map((f) => (
                <li key={f} className="flex gap-2 font-serif text-[13.5px] text-paper-200/85">
                  <span className="shrink-0 text-gild-500/60" aria-hidden>
                    –
                  </span>
                  {f}
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </div>
  );
}

export function BlattVergangenheit({ entry }: { entry: Entry }) {
  const was = text(entry.fields?.background);
  const erinnerung = text(entry.fields?.memories);
  const zeit = [entry.beginn, entry.ende].filter(Boolean).join(' – ');

  /*
   * Die Randnotiz ist **abgeleitet und nicht erfunden** (§8).
   *
   * „siehe Nebeltal" darf nur dastehen, wenn es das Nebeltal in diesem Buch
   * wirklich gibt und diese Figur wirklich dorthin gehoert. Die Kante
   * `lives_in` weiss das; ein getippter Ortsname wuesste es nicht. Gibt es
   * keine Kante, steht keine Randnotiz da – ein Verweis ins Leere ist
   * schlimmer als eine leere Spalte.
   */
  const entries = useStudio((s) => s.entries);
  const relIndex = useStudio((s) => s.relIndex);
  const navigate = useNavigate();
  const ort = useMemo(() => {
    const nach = new Map(entries.map((e) => [e.id, e]));
    const k = relationsOf(relIndex, entry.id).find(
      (r) => r.relation.type === 'lives_in' && nach.has(r.otherId),
    );
    return k ? nach.get(k.otherId) : undefined;
  }, [entries, relIndex, entry.id]);

  if (!was && !erinnerung && !zeit)
    return <Still was="Was vor ihr liegt, ist noch nicht aufgeschrieben." />;

  return (
    <div className="space-y-6">
      {zeit && (
        <section>
          <Rubrik>Chronik</Rubrik>
          <p className="mt-1.5 font-serif text-[14px] text-paper-100">{zeit}</p>
        </section>
      )}
      {was && (
        <section>
          <Rubrik>Vergangenheit</Rubrik>
          {/*
            Bild und Text nebeneinander wie im Bild – aber erst, wenn Platz
            ist. Auf 334 Punkten neben einem 124 Punkte breiten Bild blieben
            dem Text zweihundert, und das sind vier Woerter je Zeile.
          */}
          <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-start">
            <Szenenbild
              bildId={erstesBild(entry.fields?.bildVergangenheit)}
              marke="drache"
              nummer={1}
              unterschrift={`${entry.title}, aus früherer Zeit`}
            />
            <div className="min-w-0 flex-1">
              <Satz>{was}</Satz>
            </div>
          </div>
          {ort && (
            <Randnotiz className="text-paper-300/70">
              <button
                type="button"
                onClick={() => navigate(`/eintrag/${ort.id}`)}
                className="text-left no-tap-highlight active:opacity-70"
              >
                siehe {ort.title}
              </button>
            </Randnotiz>
          )}
        </section>
      )}
      {erinnerung && (
        <section>
          <Rubrik>Erinnerungen</Rubrik>
          <div className="mt-1.5">
            <Satz>{erinnerung}</Satz>
          </div>
        </section>
      )}
    </div>
  );
}

export function BlattFaehigkeiten({ entry }: { entry: Entry }) {
  const koennen = liste(entry.fields?.faehigkeiten);
  const gewohnheit = liste(entry.fields?.habits);
  const ziele = text(entry.fields?.goals);

  if (!koennen.length && !gewohnheit.length && !ziele)
    return <Still was="Was sie kann, steht noch nicht geschrieben." />;

  return (
    <div className="space-y-6">
      {koennen.length > 0 && (
        <section>
          <Rubrik>Besondere Fähigkeiten</Rubrik>
          <ul className="mt-2 space-y-2">
            {koennen.map((f) => (
              <li key={f} className="flex gap-2.5 font-serif text-[14px] text-paper-200/90">
                <span className="shrink-0 text-gild-500/60" aria-hidden>
                  –
                </span>
                {f}
              </li>
            ))}
          </ul>
        </section>
      )}
      {gewohnheit.length > 0 && (
        <section>
          <Rubrik>Gewohnheiten</Rubrik>
          <p className="mt-1.5 font-serif text-[13.5px] text-paper-200/80">
            {gewohnheit.join(' · ')}
          </p>
        </section>
      )}
      {ziele && (
        <section>
          <Rubrik>Ziele</Rubrik>
          <div className="mt-1.5">
            <Satz>{ziele}</Satz>
          </div>
        </section>
      )}
    </div>
  );
}

/**
 * Der charakteristische Buchauftritt und das große Zitat.
 *
 * Im Referenzbild ist das das Band ganz unten, über die volle Breite – und
 * es ist der Teil, den kein anderes Weltbuch hat. Deshalb bekommt es hier ein
 * eigenes Blatt statt einer Zeile unter „Weiteres".
 */
export function BlattZitat({ entry }: { entry: Entry }) {
  const auftritt = text(entry.fields?.buchauftritt);
  const zitat = text(entry.fields?.zitat);
  const entries = useStudio((s) => s.entries);
  const relIndex = useStudio((s) => s.relIndex);
  const navigate = useNavigate();

  const ersteSzene = useMemo(() => {
    const nach = new Map(entries.map((e) => [e.id, e]));
    const treffer = relationsOf(relIndex, entry.id)
      .map((k) => nach.get(k.otherId))
      .filter((e): e is Entry => !!e && e.type === 'szene');
    return treffer[0];
  }, [entries, relIndex, entry.id]);

  if (!auftritt && !zitat)
    return <Still was="Wie sie zum ersten Mal erscheint, steht noch nicht geschrieben." />;

  /*
   * Woher der erste Auftritt stammt – falls es dazu eine Szene gibt.
   *
   * Die Zeile „Erster Auftritt · Kapitel III" aus dem Auftrag ist keine
   * Erfindung fuer die Anzeige: Sie steht schon im Buch, als Kante zu einer
   * Szene. Gibt es keine, bleibt die Zeile weg – eine erfundene Herkunft
   * waere schlimmer als gar keine.
   */
  return (
    <div className="space-y-10">
      {auftritt && (
        <section>
          {/*
            Abschnittstitel mit Haarlinien statt einer blossen Rubrik.

            Das Referenzbild setzt genau hier den einzigen zentrierten Titel
            der Seite – der Buchauftritt ist der literarische Teil, und er
            bekommt seinen eigenen Eingang.
          */}
          <Abschnitt>Charakteristischer Buchauftritt</Abschnitt>

          {/*
            Das Bild steht im Text und nicht daneben (§13).

            `float` laesst den Absatz um die Illustration fliessen, wie auf
            einer gesetzten Seite. Auf dem Telefon ist dafuer kein Platz –
            eine Spalte von hundertzwanzig Punkten neben einem Bild ergaebe
            Zeilen aus drei Woertern. Dort steht das Bild deshalb ueber dem
            Text, und das Fliessen beginnt erst, wenn Breite da ist.
          */}
          <div className="sm:float-right sm:ml-5 sm:mb-3">
            <Szenenbild
              bildId={erstesBild(entry.fields?.bildAuftritt)}
              marke="buch"
              nummer={2}
              unterschrift={`${entry.title} bei ihrem ersten Auftritt`}
            />
          </div>
          <div className="text-paper-200/85">
            <Fliesstext text={auftritt} initial />
          </div>
          {ersteSzene && (
            <p className="clear-both pt-4">
              <button
                type="button"
                onClick={() => navigate(`/eintrag/${ersteSzene.id}`)}
                className="satz-bildunter uppercase text-gild-500/70 no-tap-highlight active:opacity-70"
                style={{ letterSpacing: '0.16em' }}
              >
                Erster Auftritt · {ersteSzene.title}
              </button>
            </p>
          )}
          <div className="clear-both" />
        </section>
      )}

      {zitat && (
        <section>
          {/*
            Viel leerer Raum ringsum – das ist im Bild die halbe Wirkung.
            Ein Zitat, das eng steht, ist eine Bildunterschrift.

            Vorher stand es zwischen **zwei** Goldteilern. Zwei Linien um
            einen Text herum sind ein Kasten, auch wenn die Seiten fehlen –
            und ein Kasten ist genau das, was ein Zitat nicht sein soll. Jetzt
            steht ein Teiler davor, und darunter traegt die Luft allein.
          */}
          <Trenner breite={110} />
          <div className="text-paper-200">
            <Zitat von={entry.title}>{zitat}</Zitat>
          </div>
        </section>
      )}
    </div>
  );
}

/* ------------------------------------------------------------- Zuordnung -- */

/**
 * Welches Blatt was zeigt – und ob es überhaupt etwas zu zeigen hat.
 *
 * Die Füllung wird gebraucht, um leere Reiter *stiller* zu zeichnen. Sie
 * verschwinden nicht: Ein Register, bei dem Reiter kommen und gehen, ist kein
 * Register mehr. Siehe `Register.ts`.
 */
export function blattfuellung(entry: Entry): Record<string, boolean> {
  const da = (...w: unknown[]) => w.some((x) => text(x) || liste(x).length);
  return {
    uebersicht: da(entry.description, entry.fields?.zitat, entry.fields?.age, entry.fields?.role),
    aussehen: da(entry.fields?.face, entry.fields?.hair, entry.fields?.clothing),
    wesen: da(entry.fields?.wesen, entry.fields?.quirks, entry.fields?.personality),
    vergangenheit: da(entry.fields?.background, entry.fields?.memories, entry.beginn, entry.ende),
    faehigkeiten: da(entry.fields?.faehigkeiten, entry.fields?.habits, entry.fields?.goals),
    /* Beziehungen führt hinaus – die Füllung entscheidet die Tiefenkarte. */
    beziehungen: true,
    zitat: da(entry.fields?.buchauftritt, entry.fields?.zitat),
  };
}

export function Blattinhalt({ blatt, entry }: { blatt: string; entry: Entry }) {
  switch (blatt) {
    case 'uebersicht':
      return <BlattUebersicht entry={entry} />;
    case 'aussehen':
      return <BlattAussehen entry={entry} />;
    case 'wesen':
      return <BlattWesen entry={entry} />;
    case 'vergangenheit':
      return <BlattVergangenheit entry={entry} />;
    case 'faehigkeiten':
      return <BlattFaehigkeiten entry={entry} />;
    case 'zitat':
      return <BlattZitat entry={entry} />;
    default:
      return null;
  }
}

/** Das kleine Brustbild oben rechts im Referenzbild. */
export function Kopfbildnis({ entry }: { entry: Entry }) {
  return (
    <Bildnis
      entry={entry}
      schacht="beziehungsbildnis"
      ecken
      className="h-[112px] w-[92px] shrink-0 rounded-[2px]"
    />
  );
}

export const zeichenAus = zeichenFuer;
