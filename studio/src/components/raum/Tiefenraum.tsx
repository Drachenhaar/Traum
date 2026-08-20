/**
 * Was in der Tiefe liegt.
 *
 * Vier Richtungen, und rechts drei Ebenen tief – der Durchstich aus dem
 * Bauplan. Alles hier ist **Lesesicht auf vorhandene Daten**: Es entsteht
 * kein Eintrag, keine Beziehung, kein Feld. Ein Raum, den man durch eine Geste
 * betritt, darf die Welt nicht anfassen; sonst wäre Erkunden gefährlich, und
 * dann erkundet niemand.
 *
 * ---
 *
 * **Warum diese Räume so wenig zeigen.**
 *
 * Die Versuchung ist groß, aus „Tiefe 3: das Verknüpfungsnetz" eine
 * Graphenansicht mit Filtern, Legende und Werkzeugleiste zu machen. Das wäre
 * dann ein Dashboard mit Umweg. Die Räume sind Orte, keine Werkzeuge: Man
 * sieht, was zusammenhängt, man kann etwas in die Mitte holen, und man geht
 * wieder. Wer arbeiten will, arbeitet in der Mitte.
 *
 * Die einzige Handlung, die es hier gibt, ist deshalb auch die einzige, die
 * etwas verändern darf: **In die Mitte holen.** Sie verschiebt den Anker – und
 * nur sie.
 */

import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRightLeft, MapPin, Sparkles } from 'lucide-react';
import { useStudio, livingEntries } from '../../store/useStudio';
import { geltendeKarte, useRaum } from '../../lib/raum/useRaum';
import { type Richtung } from '../../lib/raum/geste';
import {
  begehbar,
  stufe as stufeVon,
  type Raumkennung,
  type Tiefenweg,
} from '../../lib/raum/tiefenkarte';
import { relationsOf } from '../../lib/relations';
import { templateFor } from '../../lib/templates';
import { chapterOfType } from '../../lib/book';
import { useImageUrl } from '../images/Thumb';
import {
  RaumBeziehung,
  RaumBeziehungen,
  RaumGemeinsameGeschichte,
  RaumHerkunft,
  RaumNotizen,
  RaumWissen,
} from '../figur/Figurraeume';
import { cx } from '../../lib/utils';
import type { Entry } from '../../types';

/**
 * Welche Kapitel des Buches zu welcher Richtung gehören.
 *
 * **Aufgezählt und nicht geraten.** Hier stand zuerst
 * `chapterOfType(e.type).id === 'wesen'` – ein Kapitel dieses Namens gibt es
 * nicht, es heißt `bewohner`. Die Folge war kein Fehler und keine Meldung,
 * sondern zwei Räume, die still leer blieben und behaupteten, in diesem Buch
 * lebe noch niemand. Gefunden hat es erst ein Bild, nicht eine Prüfung: Der
 * Testlauf hatte nur die Überschriften gelesen.
 *
 * Deshalb steht die Zuordnung jetzt hier, mit den echten Kennungen aus
 * `lib/book.ts`, und ein Tippfehler fällt beim Lesen auf statt beim Benutzen.
 */
const KAPITEL: Record<'wesen' | 'welt', string[]> = {
  /* Wer lebt und spricht: Bewohner, Tiere und Kreaturen, Stimmen. */
  wesen: ['bewohner', 'tiere', 'stimmen'],
  /* Wo es liegt: Orte und Biome, Natur, Gebautes. */
  welt: ['lebendige-welt', 'natur', 'architektur'],
};

const gehoertZu = (e: Entry, wohin: 'wesen' | 'welt') =>
  KAPITEL[wohin].includes(chapterOfType(e.type).id);

/*
 * Die Überschriften standen hier einmal als feste Tabelle: `rechts:1` hieß
 * überall „Wesen in der Nähe". Das war eine globale Navigation mit Gesten
 * statt mit Knöpfen – im Romanraum bekam man dieselben vier Namen wie auf
 * einer Karte. Dann kamen sie aus einer Tabelle von Arbeitsraumklassen – und
 * das war derselbe Fehler in fünffacher Ausfertigung: immer noch das
 * Programm, das bestimmt, was rechts liegt.
 *
 * Jetzt kommen Name, Zeile und Tiefe aus der Karte, die die **sichtbare
 * Seite** angemeldet hat. Diese Datei ist die vierte Verantwortlichkeit –
 * Darstellung – und weiß nur, wie man eine Raumkennung zeigt. Was sie
 * bedeutet, hat sie nie erfahren.
 */

export function Tiefenraum() {
  const ort = useRaum((s) => s.ort);
  const tiefe = useRaum((s) => s.tiefe);
  const phase = useRaum((s) => s.phase);
  const ankerId = useRaum((s) => s.ankerId);
  const wahlPfad = useRaum((s) => s.wahlPfad);
  /*
   * `geltendeKarte` und nicht `tiefenkarte` – der Unterschied ist genau der
   * Rückfall. Wer das Fach der Seite direkt liest, bekommt auf jeder Seite
   * ohne eigene Tiefe eine leere Karte und zeigt gar nichts an. Genau das
   * stand hier zuerst: Die Geste öffnete, weil der Speicher richtig fragte,
   * und der Raum blieb leer, weil diese Zeile falsch fragte.
   */
  const tiefenkarte = useRaum(geltendeKarte);
  const entries = useStudio((s) => s.entries);
  const relIndex = useStudio((s) => s.relIndex);

  const lebende = useMemo(() => livingEntries(entries), [entries]);
  const nach = useMemo(() => new Map(lebende.map((e) => [e.id, e])), [lebende]);
  const anker = ankerId ? nach.get(ankerId) : undefined;

  if (ort === 'mitte' || tiefe === 0) return null;
  /* Ab hier ist `ort` sicher eine Richtung – die Mitte ist oben ausgeschieden. */
  const richtung = ort as Richtung;
  /*
   * Was hier liegt, sagt die Karte der sichtbaren Seite – nicht diese Datei.
   *
   * Fehlt sie (etwa unmittelbar nach einem Seitenwechsel), wird nichts
   * gezeigt statt etwas Erfundenem. Der Weg zurück bleibt trotzdem offen:
   * Der Doppeltipp hängt an keiner Karte.
   */
  const dieserWeg: Tiefenweg | undefined = tiefenkarte[richtung];
  const dieseStufe = stufeVon(tiefenkarte, richtung, tiefe);
  if (!dieserWeg || !dieseStufe) return null;

  /*
   * Wer auf dem Weg hierher gewählt wurde – die Wahl der Ebene *darüber*.
   *
   * `wahlPfad[0]` gehört zur ersten Tiefe. Wer auf Ebene 2 steht, sieht also,
   * was auf Ebene 1 gewählt wurde, und das ist genau richtig: Auf Ebene 1
   * wählt man ein Gesicht, auf Ebene 2 sieht man dieses Gesicht.
   */
  const gewaehlt = tiefe > 1 ? nach.get(wahlPfad[tiefe - 2] ?? '') : undefined;

  /*
   * Wie weit dieser Weg *begehbar* ist – nicht, wie lang er gebaut ist.
   *
   * Der Unterschied ist keine Feinheit. „Tiefe 1 von 3" ist eine Lüge,
   * solange niemand gewählt hat: Es gibt keine zweite Ebene, die man von hier
   * aus erreichen könnte. Wer die Zahl trotzdem zeigt, verspricht einen Weg,
   * den die Geste gleich verweigern wird – und dann sieht es aus, als sei die
   * Bedienung kaputt.
   */
  const weite = begehbar(tiefenkarte, richtung, wahlPfad);

  return (
    <div
      /*
       * Der Schlüssel enthält Ort und Tiefe: Bei jedem Wechsel entsteht der
       * Knoten neu, und damit läuft die Entfaltungsanimation erneut. Ohne ihn
       * wechselte nur der Text, und der Raum fühlte sich an wie eine
       * aktualisierte Liste.
       */
      key={`${ort}:${tiefe}:${gewaehlt?.id ?? ''}`}
      className={cx(
        'dc-tiefenraum flex min-h-0 flex-1 flex-col overflow-y-auto px-5 pb-8 pt-4 sm:px-8',
        phase === 'heimkehrend' ? 'dc-heimkehr' : 'dc-entfalten',
      )}
    >
      <header className="mb-5 shrink-0">
        <p className="font-serif text-[11.5px] uppercase tracking-[0.24em] text-gild-500/60">
          {dieserWeg.name}
          {' · '}
          {'Tiefe '}
          {tiefe}
          {/*
            Wie weit dieser Weg noch reicht – aber nur, wenn es überhaupt
            weitergeht. „1 von 1" ist keine Auskunft, sondern eine Zahl, die
            sich wichtig macht.
          */}
          {weite > 1 && ` von ${weite}`}
        </p>
        {/*
          Die Überschrift ist der gewählte Name, wenn einer gewählt wurde.

          Das Referenzbild zeigt es genau so: In der Beziehungsliste steht
          „BEZIEHUNGEN", eine Ebene tiefer steht „MIRAELYS". Der Titel der
          Stufe – „Diese Verbindung" – wäre dort die zweitbeste Auskunft.
          Wessen Verbindung, ist die Frage, und der Name beantwortet sie.
        */}
        <h2 className="mt-1 font-serif text-[22px] text-paper-200">
          {gewaehlt?.title ?? dieseStufe.titel}
        </h2>
        {gewaehlt && (
          <p className="font-serif text-[11px] uppercase tracking-[0.22em] text-brass-400/60">
            {dieseStufe.titel}
          </p>
        )}
        {anker && (
          /*
           * Der Anker steht sichtbar da.
           *
           * Das ist die halbe Miete des Gesetzes „Anker und sichtbare Mitte
           * sind nicht dasselbe": Wer drei Ebenen tief steht, muss sehen
           * können, wessen Umgebung er gerade betrachtet. Sonst ist Tiefe
           * dasselbe wie Verirren.
           */
          <p className="mt-1 font-serif text-[13px] italic text-paper-400/55">
            um {anker.title}
          </p>
        )}
      </header>

      <Inhalt
        raum={dieseStufe.raum}
        anker={anker}
        lebende={lebende}
        nach={nach}
        index={relIndex}
        gewaehlt={gewaehlt}
      />

      <p className="mt-8 shrink-0 text-center font-serif text-[12px] italic text-paper-400/35">
        Doppeltipp bringt dich zurück zu deinem Werk.
      </p>
    </div>
  );
}

/* --------------------------------------------------------------- Die Räume */

interface RaumProps {
  anker: Entry | undefined;
  lebende: Entry[];
  nach: Map<string, Entry>;
  index: ReturnType<typeof useStudio.getState>['relIndex'];
  /**
   * Wer auf dem Weg hierher gewählt wurde.
   *
   * Nur belegt, wenn eine Stufe eine Wahl verlangt hat. Für alle Räume, die
   * nur den Anker zeigen, bleibt es leer – und das ist der Normalfall.
   */
  gewaehlt?: Entry;
}

/**
 * Welcher Inhalt gezeigt wird – benannt, nicht aus Ort und Tiefe gerechnet.
 *
 * Vorher stand hier „rechts, Tiefe 2 ist der Zusammenhang". Das band den
 * Inhalt an eine Himmelsrichtung: Im Charakterraum liegt derselbe
 * Zusammenhang ebenfalls rechts auf Ebene zwei, im Weltraum aber gehören
 * links zwei verschiedene Räume übereinander. Jetzt sagt der Arbeitsraum,
 * *was* dort liegt, und diese Datei weiß nur noch, wie man es zeigt.
 */
function Inhalt({
  raum,
  anker,
  lebende,
  nach,
  index,
  gewaehlt,
}: RaumProps & { raum: Raumkennung }) {
  switch (raum) {
    case 'wesen':
      return <WesenNah anker={anker} lebende={lebende} nach={nach} index={index} />;
    case 'zusammenhang':
      return <Zusammenhang anker={anker} nach={nach} index={index} />;
    case 'geflecht':
      return <Geflecht anker={anker} nach={nach} index={index} />;
    case 'welt':
      return <Welt lebende={lebende} />;
    case 'wissen':
      /*
       * Zwei Räume unter einer Kennung, und das ist Absicht.
       *
       * `wissen` heißt „was hier bekannt ist". Bei einer Figur ist das ihre
       * Biografie, ihre Ziele, ihre Geheimnisse – bei einer Buchseite ohne
       * Anker sind es die offenen Fragen des Buches. Dieselbe Bedeutung,
       * verschiedene Auskunft, und der Unterschied hängt daran, ob ein Anker
       * da ist. Zwei Kennungen daraus zu machen hieße, dieselbe Bedeutung
       * zweimal zu benennen.
       */
      return anker ? <RaumWissen anker={anker} /> : <Wissen anker={anker} nach={nach} index={index} />;
    case 'notizen':
      return anker ? <RaumNotizen anker={anker} /> : <Notizen lebende={lebende} />;

    /* Die Räume der Charakterseite. */
    case 'beziehungen':
      return anker ? <RaumBeziehungen anker={anker} /> : null;
    case 'beziehung':
      return anker ? <RaumBeziehung anker={anker} gewaehlt={gewaehlt} /> : null;
    case 'gemeinsameGeschichte':
      return anker ? <RaumGemeinsameGeschichte anker={anker} gewaehlt={gewaehlt} /> : null;
    case 'herkunft':
      return anker ? <RaumHerkunft anker={anker} /> : null;
  }
}

/**
 * Rechts, Tiefe 1: die Wesen in der Nähe.
 *
 * „Nähe" heißt: direkt mit dem Werk verbunden. Ist gar nichts verbunden – und
 * das ist am Anfang der Normalfall –, stehen hier die Wesen des Buches. Kein
 * leerer Raum mit einer Aufforderung: Ein Raum, der nur sagt „hier ist nichts",
 * ist eine Sackgasse mit Aussicht.
 */
function WesenNah({ anker, lebende, nach, index }: RaumProps) {
  const wesen = useMemo(() => {
    const alleWesen = lebende.filter((e) => gehoertZu(e, 'wesen'));
    if (!anker) return alleWesen.slice(0, 24);
    const nahe = relationsOf(index, anker.id)
      .map((r) => nach.get(r.otherId))
      .filter((e): e is Entry => !!e && gehoertZu(e, 'wesen'));
    const gesehen = new Set(nahe.map((e) => e.id));
    return [...nahe, ...alleWesen.filter((e) => !gesehen.has(e.id) && e.id !== anker.id)].slice(0, 24);
  }, [anker, lebende, nach, index]);

  if (!wesen.length) return <Leer text="In diesem Buch lebt noch niemand." />;
  return (
    /*
     * Eine Spalte auf dem Telefon.
     *
     * Zu zweit nebeneinander blieben neben Bildnis und Pfeil noch neunzig
     * Punkte für den Text – „Charakter" wurde zu „CHARAKT…". Eine Liste, in
     * der die Auskunft abgeschnitten ist, ist keine Auskunft. Auf dem
     * Entwurfsblatt steht sie ebenfalls einspaltig, und das ist kein Zufall.
     */
    <ul className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
      {wesen.map((e) => (
        <Kachel key={e.id} entry={e} />
      ))}
    </ul>
  );
}

/** Rechts, Tiefe 2: wie sie zusammenhängen – nach Art der Beziehung geordnet. */
function Zusammenhang({ anker, nach, index }: Omit<RaumProps, 'lebende'>) {
  const gruppen = useMemo(() => {
    if (!anker) return [];
    const karte = new Map<string, { label: string; farbe: string; wer: Entry[] }>();
    for (const r of relationsOf(index, anker.id)) {
      const anderer = nach.get(r.otherId);
      if (!anderer) continue;
      const g = karte.get(r.label);
      if (g) g.wer.push(anderer);
      else karte.set(r.label, { label: r.label, farbe: r.color, wer: [anderer] });
    }
    return [...karte.values()];
  }, [anker, nach, index]);

  if (!anker) return <Leer text="Kein Werk in der Mitte." />;
  if (!gruppen.length) return <Leer text={`${anker.title} steht noch für sich allein.`} />;

  return (
    <div className="space-y-5">
      {gruppen.map((g) => (
        <section key={g.label}>
          <p className="mb-2 flex items-center gap-2 font-serif text-[12px] uppercase tracking-[0.18em] text-paper-400/50">
            <span className="h-2 w-2 rounded-full" style={{ background: g.farbe }} aria-hidden />
            {g.label}
          </p>
          <ul className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
            {g.wer.map((e) => (
              <Kachel key={e.id} entry={e} />
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

/**
 * Rechts, Tiefe 3: das ganze Geflecht.
 *
 * Hier stand zuerst eine Liste in Prosa – „X führt weiter zu Y, Z". Auf dem
 * Entwurfsblatt ist es ein **Rad**: das Werk in der Mitte, leuchtend, seine
 * Nachbarn ringsum, Linien dazwischen. Das ist besser, und der Grund ist nicht
 * Geschmack: Ein Geflecht ist eine *räumliche* Aussage, und ein Satz ist die
 * schlechteste Art, sie zu machen. Man liest drei Zeilen und hat kein Bild;
 * man sieht ein Rad und hat es sofort.
 *
 * **Trotzdem kein Kräftegraph.** Die Winkel stehen fest – jeder Nachbar bekommt
 * seinen Platz aus seiner Stelle in der Liste, und die Liste steht. Ein
 * Verfahren mit Kräften würde bei jedem Öffnen anders auspendeln, und dann wäre
 * dieselbe Welt zweimal ein anderes Bild. Dasselbe Gesetz wie beim Wald auf der
 * Karte: Was gleich ist, muss gleich aussehen.
 *
 * Zwei Ringe, nicht mehr. Der innere trägt Namen, der äußere nur Marken – wer
 * zwei Schritte weit weg ist, gehört zum Bild, aber nicht zur Auskunft. Drei
 * Ringe wären auf einer Handbreite Nebel.
 */
function Geflecht({ anker, nach, index }: Omit<RaumProps, 'lebende'>) {
  const rad = useMemo(() => {
    if (!anker) return null;
    /* Doppelte Kanten zum selben Nachbarn ergeben einen Speichenplatz, nicht zwei. */
    const gesehen = new Set<string>();
    const nahe: { entry: Entry; label: string; farbe: string; weiter: number }[] = [];
    for (const r of relationsOf(index, anker.id)) {
      if (gesehen.has(r.otherId)) continue;
      const e = nach.get(r.otherId);
      if (!e) continue;
      gesehen.add(r.otherId);
      const weiter = new Set(
        relationsOf(index, e.id)
          .map((z) => z.otherId)
          .filter((id) => id !== anker.id && nach.has(id)),
      );
      nahe.push({ entry: e, label: r.label, farbe: r.color, weiter: weiter.size });
    }
    /* Zwölf Speichen sind das Meiste, was auf einer Handbreite noch ein Rad ist. */
    return nahe.slice(0, 12);
  }, [anker, nach, index]);

  if (!anker) return <Leer text="Kein Werk in der Mitte." />;
  if (!rad?.length) return <Leer text={`${anker.title} steht noch für sich allein.`} />;

  const M = 100;
  const innen = 54;
  const aussen = 82;

  return (
    <div>
      <svg
        viewBox="0 0 200 200"
        className="mx-auto block w-full max-w-[22rem]"
        role="img"
        aria-label={`Das Geflecht um ${anker.title}`}
      >
        {/* Ein stiller Ring als Grund – er sagt, dass alles gleich weit weg ist. */}
        <circle cx={M} cy={M} r={innen} fill="none" stroke="currentColor" strokeOpacity="0.12" />

        {rad.map((n, i) => {
          /*
           * Ein halber Schritt Versatz.
           *
           * Ohne ihn sitzen vier Nachbarn genau auf Nord, Ost, Süd und West –
           * und ein Rad mit vier Speichen auf den Achsen liest sich als
           * Pluszeichen, also als Verzierung, nicht als Auskunft. Um einen
           * halben Schritt gedreht steht kein Knoten mehr auf einer Achse, und
           * dieselben vier Namen ergeben ein Bild statt eines Symbols.
           *
           * Fest und nicht gewürfelt: Dieselbe Welt muss zweimal gleich
           * aussehen – dasselbe Gesetz wie beim Wald auf der Karte.
           */
          const w = ((i + 0.5) / rad.length) * Math.PI * 2 - Math.PI / 2;
          const x = M + Math.cos(w) * innen;
          const y = M + Math.sin(w) * innen;
          return (
            <g key={n.entry.id}>
              <line x1={M} y1={M} x2={x} y2={y} stroke={n.farbe} strokeOpacity="0.5" strokeWidth="1" />
              {/*
                Was zwei Schritte weit liegt, steht als kleiner Punkt weiter
                draußen. Keine Namen: Dieser Ring beantwortet „es geht weiter",
                nicht „wohin".
              */}
              {Array.from({ length: Math.min(4, n.weiter) }).map((_, j, alle) => {
                const spreizung = 0.26;
                const wj = w + (j - (alle.length - 1) / 2) * spreizung;
                return (
                  <circle
                    key={j}
                    cx={M + Math.cos(wj) * aussen}
                    cy={M + Math.sin(wj) * aussen}
                    r="1.7"
                    fill={n.farbe}
                    fillOpacity="0.4"
                  />
                );
              })}
              <circle cx={x} cy={y} r="4.2" fill={n.farbe} />
            </g>
          );
        })}

        {/* Das Werk selbst – der einzige Punkt, der leuchtet. */}
        <circle cx={M} cy={M} r="11" fill="var(--dc-accent)" fillOpacity="0.16" />
        <circle cx={M} cy={M} r="5.5" fill="var(--dc-accent)" />
      </svg>

      <p className="mt-1 text-center font-serif text-[15px] text-paper-200">{anker.title}</p>

      {/*
        Die Namen stehen unter dem Rad, nicht darin.

        Zwölf Beschriftungen an einem Kreis auf einer Handbreite überlagern
        einander unweigerlich – und jede Ausweichlogik dafür macht das Bild
        unruhig. Unten stehen sie in derselben Reihenfolge wie im Rad, im
        Uhrzeigersinn ab oben, und tragen ihre Farbe.
      */}
      <ul className="mt-5 grid grid-cols-2 gap-x-4 gap-y-1.5">
        {rad.map((n) => (
          <li key={n.entry.id} className="flex items-baseline gap-2 text-[13.5px]">
            <span
              className="mt-1 h-2 w-2 shrink-0 rounded-full"
              style={{ background: n.farbe }}
              aria-hidden
            />
            <span className="min-w-0">
              <span className="block truncate font-serif text-paper-200">{n.entry.title}</span>
              <span className="block truncate text-[11px] uppercase tracking-[0.13em] text-paper-400/40">
                {n.label}
              </span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Links, Tiefe 1: die Welt – Orte und Schauplätze. */
function Welt({ lebende }: { lebende: Entry[] }) {
  const navigate = useNavigate();
  const orte = useMemo(
    () => lebende.filter((e) => gehoertZu(e, 'welt')).slice(0, 30),
    [lebende],
  );
  return (
    <div>
      <button
        type="button"
        onClick={() => navigate('/weltkarte')}
        className="mb-4 flex w-full items-center gap-3 rounded-2xl border border-gild-500/25 px-4 py-3 text-left no-tap-highlight"
      >
        <MapPin size={16} className="shrink-0 text-gild-500/70" aria-hidden />
        <span className="font-serif text-[15px] text-paper-200">Zur Weltkarte</span>
      </button>
      {orte.length ? (
        <ul className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
          {orte.map((e) => (
            <Kachel key={e.id} entry={e} />
          ))}
        </ul>
      ) : (
        <Leer text="Noch kein Ort in dieser Welt." />
      )}
    </div>
  );
}

/**
 * Oben, Tiefe 1: Wissen und Zusammenhang.
 *
 * Was über das Werk *bekannt* ist – seine Art, sein Kapitel, wie stark es
 * verbunden ist, welche Felder gefüllt sind. Ausdrücklich kein Ratgeber: Hier
 * steht, was da ist, nicht, was fehlen könnte. Das Anerbieten hat seinen
 * eigenen Ort und seine eigenen Regeln.
 */
function Wissen({ anker, nach, index }: Omit<RaumProps, 'lebende'>) {
  if (!anker) return <Leer text="Kein Werk in der Mitte." />;
  const tpl = templateFor(anker.type);
  const kanten = relationsOf(index, anker.id);
  const gefuellt = tpl.fields.filter((f) => {
    const w = anker.fields?.[f.key];
    return Array.isArray(w) ? w.length > 0 : !!w;
  });

  return (
    <dl className="space-y-3">
      <Zeile marke="Art" wert={tpl.label} />
      <Zeile marke="Kapitel" wert={chapterOfType(anker.type).title} />
      <Zeile marke="Verbindungen" wert={`${kanten.length}`} />
      <Zeile
        marke="Ausgefüllt"
        wert={`${gefuellt.length} von ${tpl.fields.length} Feldern`}
      />
      {gefuellt.length > 0 && (
        <div className="pt-2">
          <p className="mb-2 font-serif text-[12px] uppercase tracking-[0.18em] text-paper-400/50">
            Was steht
          </p>
          <ul className="flex flex-wrap gap-1.5">
            {gefuellt.map((f) => (
              <li
                key={f.key}
                className="rounded-full border border-paper-400/20 px-3 py-1 font-serif text-[12.5px] text-paper-300/70"
              >
                {f.label}
              </li>
            ))}
          </ul>
        </div>
      )}
      {kanten.length > 0 && (
        <div className="pt-2">
          <p className="mb-2 font-serif text-[12px] uppercase tracking-[0.18em] text-paper-400/50">
            Woran es hängt
          </p>
          <ul className="space-y-1">
            {kanten.slice(0, 12).map((r) => (
              <li key={r.relation.id} className="font-serif text-[13.5px] text-paper-300/75">
                <span className="text-paper-400/45">{r.label} · </span>
                {nach.get(r.otherId)?.title ?? '—'}
              </li>
            ))}
          </ul>
        </div>
      )}
    </dl>
  );
}

/** Unten, Tiefe 1: was sich angesammelt hat – zuletzt Berührtes. */
function Notizen({ lebende }: { lebende: Entry[] }) {
  const zuletzt = useMemo(
    () => [...lebende].sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 20),
    [lebende],
  );
  if (!zuletzt.length) return <Leer text="Noch nichts gesammelt." />;
  return (
    <ul className="space-y-1.5">
      {zuletzt.map((e) => (
        <Kachel key={e.id} entry={e} breit />
      ))}
    </ul>
  );
}

/* ------------------------------------------------------------- Kleinkram -- */

function Zeile({ marke, wert }: { marke: string; wert: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-paper-400/10 pb-2">
      <dt className="font-serif text-[12px] uppercase tracking-[0.18em] text-paper-400/50">
        {marke}
      </dt>
      <dd className="font-serif text-[15px] text-paper-200">{wert}</dd>
    </div>
  );
}

function Leer({ text }: { text: string }) {
  return (
    <p className="py-10 text-center font-serif text-[14px] italic text-paper-400/40">{text}</p>
  );
}

/**
 * Ein Wesen, ein Ort, eine Notiz – mit **einer** Handlung.
 *
 * Hier standen zuerst zwei Knöpfe: aufschlagen und in die Mitte holen. Das
 * war ein Widerspruch zum Ankergesetz, und zwar ein feiner. „Aufschlagen"
 * hätte die Seite in der Mitte gezeigt, während der Anker woanders lag – die
 * sichtbare Mitte und das Werk wären auseinandergefallen, und der Doppeltipp
 * hätte einen an einen Ort gebracht, den man gar nicht mehr im Kopf hatte.
 *
 * Also nur eine Handlung, und die heißt, was sie tut: **In die Mitte holen.**
 * Sie verschiebt den Anker, holt den Blick zurück und schlägt die Seite auf –
 * alles in einem, ausdrücklich, benannt, nirgends nebenbei. Wer nur schauen
 * will, schaut; wer arbeiten will, holt sich das Werk.
 */
function Kachel({ entry, breit = false }: { entry: Entry; breit?: boolean }) {
  const navigate = useNavigate();
  const setzeAnker = useRaum((s) => s.setzeAnker);
  /*
   * Das Bildnis.
   *
   * Auf dem Entwurfsblatt hat jede Figur ihr Gesicht, und das ist mehr als
   * Zierde: Eine Liste aus vier Namen liest man, eine Liste aus vier Gesichtern
   * erkennt man. Wer keins hat, bekommt keinen Platzhalter mit Fragezeichen –
   * sondern seine Anfangsbuchstaben im Ring, damit die Reihe trotzdem ruhig
   * bleibt und niemand aussieht, als fehle ihm etwas.
   */
  const bild = useImageUrl(entry.coverImage);

  return (
    <li className={breit ? 'w-full' : undefined}>
      <button
        type="button"
        onClick={() => {
          setzeAnker(entry.id);
          navigate(`/eintrag/${entry.id}`);
        }}
        title="In die Mitte holen"
        className={cx(
          'group flex w-full items-center gap-2.5 rounded-xl border border-paper-400/15 px-2.5 py-2.5 text-left transition-colors hover:border-gild-500/35 no-tap-highlight',
        )}
      >
        <span className="relative grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-full border border-gild-500/25 bg-olive-800">
          {bild ? (
            <img src={bild} alt="" className="h-full w-full object-cover" />
          ) : (
            <span className="font-serif text-[13px] text-gild-500/70">{zeichenVon(entry.title)}</span>
          )}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate font-serif text-[14.5px] text-paper-200">
            {entry.title}
          </span>
          {/*
            Was darunter steht: der Untertitel, wenn es einen gibt.

            Auf dem Entwurfsblatt steht dort „Wächter von Mooshalde" und nicht
            „Charakter". Die Art kennt man am Raum, in dem man steht – der
            Untertitel ist das, was diese Figur von den anderen unterscheidet.
            Fehlt er, tritt die Art ein, damit die Zeile nie leer bleibt.
          */}
          <span className="block truncate text-[11.5px] text-paper-400/45">
            {entry.subtitle?.trim() || templateFor(entry.type).label}
          </span>
        </span>
        <ArrowRightLeft
          size={14}
          aria-hidden
          className="shrink-0 text-paper-400/25 transition-colors group-hover:text-gild-400"
        />
      </button>
    </li>
  );
}

/** Ein oder zwei Buchstaben – aus „Der Mooswald" wird „DM", aus „Mira" ein „M". */
function zeichenVon(titel: string): string {
  const worte = titel.trim().split(/\s+/).filter(Boolean);
  if (!worte.length) return '·';
  if (worte.length === 1) return worte[0][0].toUpperCase();
  return (worte[0][0] + worte[worte.length - 1][0]).toUpperCase();
}

/** Für die Kopfzeile: ein stilles Zeichen, dass Tiefe existiert. */
export function Tiefenmarke() {
  const tiefe = useRaum((s) => s.tiefe);
  const ort = useRaum((s) => s.ort);
  /*
   * `geltendeKarte` und nicht `tiefenkarte` – der Unterschied ist genau der
   * Rückfall. Wer das Fach der Seite direkt liest, bekommt auf jeder Seite
   * ohne eigene Tiefe eine leere Karte und zeigt gar nichts an. Genau das
   * stand hier zuerst: Die Geste öffnete, weil der Speicher richtig fragte,
   * und der Raum blieb leer, weil diese Zeile falsch fragte.
   */
  const tiefenkarte = useRaum(geltendeKarte);
  if (!tiefe) return null;
  const name = ort === 'mitte' ? '' : tiefenkarte[ort]?.name ?? '';
  return (
    <span className="flex items-center gap-1.5 font-serif text-[11.5px] uppercase tracking-[0.18em] text-gild-500/60">
      <Sparkles size={11} aria-hidden />
      {name} {tiefe}
    </span>
  );
}
