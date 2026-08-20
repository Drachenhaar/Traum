/**
 * Die Charakterseite – die Mitte.
 *
 * Das Erfolgskriterium des Auftrags steht in einem Satz, und er ist kein
 * Gestaltungswunsch, sondern eine Abnahmebedingung:
 *
 *   Nicht „Ich sehe ein Charakterformular."
 *   Sondern „Da ist diese Person."
 *
 * Alles hier folgt daraus. Das Bildnis bekommt den Platz, den ein Gesicht
 * braucht; der Name steht darüber wie auf einem Titelblatt; die vier
 * Bedeutungsrichtungen sind zu sehen und trotzdem keine Leiste. Was ein
 * Formular ausmacht – Feldnamen, Rahmen, Knöpfe, gleich große Kästen – kommt
 * nicht vor.
 *
 * ---
 *
 * **Was hier bewusst fehlt: die untere Symbolleiste des Referenzbildes.**
 *
 * Im Bild steht unten eine Reihe – Überblick, Wissen, Beziehungen, Notizen,
 * Mehr. Sie sieht gut aus und sie ist der Punkt, an dem das Bild seiner
 * eigenen Idee widerspricht: Dieselben vier Bedeutungen, die man durch Ziehen
 * erreicht, noch einmal als Registerkarten. Damit wäre Living Depth eine
 * Verzierung über einer gewöhnlichen App mit vier Tabs, und der Auftrag sagt
 * das auch selbst: „Keine Rückkehr zu klassischer Tab-App-Navigation."
 *
 * Also nicht übernommen – ausdrücklich, nicht aus Versehen.
 *
 * ---
 *
 * **Und die Tiefe ist zu sehen.**
 *
 * Der Auftrag nennt es das Beste an der Referenz: dass man die Tiefe schon
 * ahnt, bevor man sie öffnet. Auf einem Poster ist das leicht – dort ist alles
 * gleichzeitig da. Auf einem Telefon ist genau das unmöglich, und die
 * Versuchung wäre, die Ahnung durch kleine Menüs zu ersetzen.
 *
 * Stattdessen stehen an den vier Kanten Marken: ein Zeichen, ein Wort, ein
 * Wegepunkt, sehr leise. Sie sind nicht anfassbar – wer sie antippen könnte,
 * hätte wieder Knöpfe. Sie sagen nur: hier ist eine Kante, und dahinter ist
 * etwas. Das ist die ganze Auskunft, und sie genügt.
 */

import { useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft, MoreHorizontal, Star } from 'lucide-react';
import { useStudio, livingEntries } from '../../store/useStudio';
import { relationsOf } from '../../lib/relations';
import { useRaum } from '../../lib/raum/useRaum';
import { useTiefe } from '../../components/raum/useTiefe';
import { figurkarte, type Figurlage } from '../../lib/raum/figurkarte';
import { richtungen, type Tiefenkarte } from '../../lib/raum/tiefenkarte';
import { type Richtung } from '../../lib/raum/geste';
import { konfig } from '../../lib/raum/konfig';
import { Bildnis } from '../../components/figur/Bildnis';
import { Goldteiler, Wegepunkt, zeichenFuer } from '../../lib/zeichen/zeichen';
import { cx } from '../../lib/utils';
import { ganzVerborgen, zeigtGeheimes } from '../../lib/geheim';
import type { Entry } from '../../types';

/**
 * Welches Zeichen und welches Wort an welcher Kante stehen.
 *
 * Die Tabelle ist Darstellung, nicht Bedeutung: *Dass* rechts die Beziehungen
 * liegen, sagt die Karte der Figur. Wie das Wort dorthin gemalt wird, steht
 * hier. Der Name kommt trotzdem aus der Karte und nicht von hier – sonst
 * stünde an einer Kante „Beziehungen", wo die Seite „Beteiligte" meint.
 */
const KANTENZEICHEN: Record<Richtung, string> = {
  oben: 'wissen',
  links: 'herkunft',
  rechts: 'beziehungen',
  unten: 'notizen',
};

/** Die Marke an einer Kante – ein Zeichen, ein Wort, ein Punkt. */
function Kantenmarke({
  richtung,
  name,
  staerke,
}: {
  richtung: Richtung;
  name: string;
  staerke: number;
}) {
  const Zeichen = zeichenFuer(KANTENZEICHEN[richtung]);
  const senkrecht = richtung === 'oben' || richtung === 'unten';

  return (
    <div
      className={cx(
        'pointer-events-none absolute flex items-center gap-1.5 text-gild-400',
        senkrecht ? 'left-1/2 -translate-x-1/2 flex-col' : 'top-1/2 -translate-y-1/2 flex-col',
        richtung === 'oben' && 'top-0',
        richtung === 'unten' && 'bottom-0 flex-col-reverse',
        richtung === 'links' && 'left-0',
        richtung === 'rechts' && 'right-0',
      )}
      /*
       * Die Stärke kommt aus der Konfiguration und ist im Stimmzimmer
       * einstellbar – „Depth-Hint-Stärke" aus dem Auftrag. Sie sitzt hier als
       * Deckkraft und nicht als Farbe: Eine zweite Goldstufe wäre eine zweite
       * Farbe im Buch, und davon gibt es schon genug.
       */
      style={{ opacity: staerke }}
      data-kante={richtung}
      aria-hidden
    >
      {Zeichen && <Zeichen groesse={14} />}
      <span
        className="font-serif text-[8.5px] uppercase tracking-[0.3em] text-gild-400/85"
        style={senkrecht ? undefined : { writingMode: 'vertical-rl' }}
      >
        {name}
      </span>
      <Wegepunkt groesse={9} className="text-gild-500/70" />
    </div>
  );
}

export function Charakterseite() {
  const { id } = useParams();
  const navigate = useNavigate();
  const entries = useStudio((s) => s.entries);
  const relIndex = useStudio((s) => s.relIndex);
  const settings = useStudio((s) => s.settings);
  const toggleFavorite = useStudio((s) => s.toggleFavorite);
  const setzeAnker = useRaum((s) => s.setzeAnker);

  const lebende = useMemo(() => livingEntries(entries), [entries]);
  const nach = useMemo(() => new Map(lebende.map((e) => [e.id, e])), [lebende]);
  const entry = id ? nach.get(id) : undefined;

  /* Wen dieses Buch sonst kennt – nur für den Fall, dass die Kennung ins Leere zeigt. */
  const figuren = useMemo(
    () =>
      lebende
        .filter((e) => e.type === 'character')
        .sort((a, b) => a.title.localeCompare(b.title, 'de'))
        .slice(0, 24),
    [lebende],
  );

  const lage: Figurlage | undefined = useMemo(() => {
    if (!entry) return undefined;
    return {
      entry,
      kanten: relationsOf(relIndex, entry.id).map((r) => ({
        relation: r.relation,
        otherId: r.otherId,
      })),
      /*
       * Eine Kante auf eine Seite, die am Tisch verborgen ist, zählt nicht.
       *
       * Sonst stünde im Beziehungsraum ein Gesicht, das sich nicht öffnen
       * lässt – oder schlimmer: Die bloße Anwesenheit einer Zeile verriete,
       * dass es diese Figur gibt. Der Tischmodus wäre damit gebrochen, und
       * zwar an genau der Stelle, an der man am wenigsten damit rechnet.
       */
      kennt: (x: string) => {
        const e = nach.get(x);
        return !!e && (zeigtGeheimes(settings) || !ganzVerborgen(e));
      },
    };
  }, [entry, relIndex, nach, settings]);

  const karte: Tiefenkarte = useMemo(() => (lage ? figurkarte(lage) : {}), [lage]);

  /*
   * Die Seite meldet ihre Tiefe selbst an – und zwar als **eigene** Karte,
   * nicht als Rückfall. Das ist der ganze Unterschied, um den es in der
   * Korrektur ging: Nicht die Gattung „Charakter" bestimmt, was rechts liegt,
   * sondern diese Figur mit diesen Kanten.
   */
  useTiefe(karte);

  /* Wer diese Seite öffnet, arbeitet an dieser Figur. Der Anker folgt. */
  useEffect(() => {
    if (entry) setzeAnker(entry.id);
  }, [entry?.id, setzeAnker]);

  if (!entry) return <KeineFigur figuren={figuren} />;

  const k = konfig();
  const f = k.figur;
  const offen = richtungen(karte);
  const rolle = [entry.fields?.role, entry.category].filter(
    (x): x is string => typeof x === 'string' && !!x.trim(),
  );
  /* Die Zeile unter dem Namen: „DRACHENBLUT · WEISER · HÜTER ALTER PAKTE". */
  const beiwort = (rolle.length ? rolle : entry.subtitle ? [entry.subtitle] : []).join(' · ');

  return (
    <div
      className="dc-figur relative flex min-h-full flex-col overflow-hidden bg-desk-900"
      data-figur={entry.id}
      style={
        {
          '--dc-figur-gold': String(f.goldstaerke),
          '--dc-figur-linie': String(f.linienstaerke),
          '--dc-figur-korn': String(f.kornstaerke * 2),
        } as React.CSSProperties
      }
    >
      {/*
        Der Grund.

        Zwei Schichten und keine Bilddatei: ein sehr weiter, sehr dunkler
        Lichtkegel und ein feines Korn. Das Referenzbild lebt genau davon –
        fast schwarz, aber nirgends flach. Eine flache Fläche sieht aus wie
        ein Bildschirm, eine ungleichmäßige wie Material.
      */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: `radial-gradient(120% 78% at 50% ${18 + f.grundtiefe * 26}%, #1c1712 0%, #120f0c 46%, #0a0806 100%)`,
        }}
        aria-hidden
      />
      <div className="dc-korn pointer-events-none absolute inset-0" aria-hidden />

      {/* ---------------------------------------------------------- Kopf --- */}
      <header className="relative z-10 flex items-center justify-between px-4 pt-2">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="dc-chrome flex items-center gap-1 rounded-lg px-2 py-1.5 font-serif text-[13px] text-paper-300/70"
        >
          <ChevronLeft size={16} strokeWidth={1.5} />
          Zurück
        </button>

        {/* Das Zeichen der Figur – die Mitte des Kopfes, wie im Referenzbild. */}
        <div className="text-gild-400/70">
          {(() => {
            const Z = zeichenFuer('wissen');
            return Z ? <Z groesse={18} /> : null;
          })()}
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => toggleFavorite(entry.id)}
            className="dc-chrome rounded-lg p-1.5 text-gild-400/70"
            aria-label={entry.favorite ? 'Nicht mehr merken' : 'Merken'}
          >
            <Star
              size={17}
              strokeWidth={1.4}
              fill={entry.favorite ? 'currentColor' : 'none'}
            />
          </button>
          <button
            type="button"
            onClick={() => navigate(`/eintrag/${entry.id}`)}
            className="dc-chrome rounded-lg p-1.5 text-paper-300/60"
            aria-label="Zur Buchseite"
          >
            <MoreHorizontal size={17} strokeWidth={1.5} />
          </button>
        </div>
      </header>

      {/* ---------------------------------------------------------- Name --- */}
      <div className="relative z-10 mt-3 px-6 text-center">
        <h1
          className="font-serif text-gild-300"
          style={{
            fontSize: `${f.namensgroesse}px`,
            letterSpacing: '0.13em',
            lineHeight: 1.06,
            /* Nicht `uppercase` im Stylesheet: Kapitälchen sehen anders aus
             * als Großbuchstaben, und der Name soll geprägt wirken. */
            textTransform: 'uppercase',
            textShadow: '0 1px 18px rgba(212,175,55,0.16)',
          }}
        >
          {entry.title}
        </h1>
        {beiwort && (
          <p className="mt-1.5 font-serif text-[9.5px] uppercase tracking-[0.28em] text-brass-400/75">
            {beiwort}
          </p>
        )}
        <div className="mt-2 flex justify-center text-gild-500/45">
          <Goldteiler breite={132} />
        </div>
      </div>

      {/* -------------------------------------------------------- Bildnis --- */}
      {/*
        Die Höhe des Bildnisses.

        Hier stand `flex-1` mit `min-h-0`, und gemessen war das Bildnis
        350 × **0** Punkte breit und hoch – es war nicht da. Der Grund ist der
        übliche: Ein Flex-Kind mit `min-h-0` darf auf null schrumpfen, und
        weil das Bild selbst absolut liegt, trägt es nichts zur Höhe bei. Der
        Kasten hatte also nichts, woran er sich hätte aufrichten können.

        `aspect-[3/4]` gibt ihm eine eigene Form statt einer geliehenen. Das
        ist auch inhaltlich richtig: Ein Porträt hat ein Seitenverhältnis, und
        es soll auf einem kleinen Telefon nicht anders aussehen als auf einem
        großen. `flex-1` bleibt daneben stehen, damit es den Platz *nimmt*, den
        es bekommen kann – aber die Untergrenze ist jetzt eine Form und keine
        Null.
      */}
      <div className="relative z-10 mt-3 flex min-h-0 flex-1 items-stretch px-5">
        {/*
          `min-h` statt `aspect` – gemessen am Bildschirmfoto.

          Mit `aspect-[3/4]` sass das Bildnis mit 350 × 467 in einem 595 Punkte
          hohen Bereich, und darueber klaffte ein Loch von hundert Punkten. Ein
          festes Seitenverhaeltnis ist auf einem Telefon die falsche Regel: Das
          Geraet gibt vor, wie viel Platz da ist, und ein Bildnis soll ihn
          nehmen. Der Zuschnitt sitzt ohnehin im Bild (`object-cover`) und
          nicht im Rahmen.

          Die Untergrenze bleibt, damit auf einem sehr kleinen Bildschirm kein
          Streifen daraus wird.
        */}
        <div className="relative min-h-[240px] w-full">
          {/*
            `h-full w-full` und nicht `absolute inset-0`.

            Das Bildnis bringt sein eigenes `relative` mit – es braucht es für
            Bild, Schleier und Rahmenecken darin. Wer ihm von außen `absolute`
            mitgibt, setzt zwei Positionsklassen auf ein Element; welche
            gewinnt, entscheidet die Reihenfolge im Stylesheet und nicht die
            Absicht. Hier gewann `relative`, `inset-0` verpuffte, und der
            Kasten war 350 Punkte breit und **null** hoch.

            Der Rahmen daneben hatte die richtigen 350 × 467 – der Fehler saß
            eine Ebene tiefer, als er aussah. Gefunden wurde er, indem die
            ganze Kette vermessen wurde statt der Verdächtige allein.
          */}
          <Bildnis entry={entry} schacht="hauptbildnis" ecken className="h-full w-full rounded-[2px]" />

          {/*
            Die vier Marken liegen **auf** dem Bildnis und nicht daneben.

            Daneben hätten sie eigene Zeilen gebraucht, und vier Zeilen um ein
            Bild herum sind ein Rahmen aus Beschriftungen – wieder ein
            Formular. Auf dem Bild sind sie das, was sie sein sollen: Kanten,
            an denen die Seite aufhört und etwas anderes anfängt.
          */}
          <div className="pointer-events-none absolute inset-0 p-1.5">
            {offen.map((r) => (
              <Kantenmarke
                key={r}
                richtung={r}
                name={karte[r]?.name ?? ''}
                staerke={f.hinweisstaerke}
              />
            ))}
          </div>
        </div>
      </div>

      {/* --------------------------------------------------------- Zitat --- */}
      {entry.description?.trim() && (
        <div className="relative z-10 shrink-0 px-8 pb-1 pt-3 text-center">
          <p className="font-serif text-[12.5px] italic leading-[1.5] text-paper-300/60">
            {kurz(entry.description, 128)}
          </p>
        </div>
      )}

      {/*
        Unten steht die Anleitung – und nur, solange sie gebraucht wird.

        Sie ist der einzige Text auf dieser Seite, der über die Bedienung
        spricht, und sie verschwindet, sobald jemand einmal in die Tiefe
        gegangen ist. Eine dauerhafte Bedienungsanleitung am Bildrand wäre das
        Eingeständnis, dass die Geste sich nicht von selbst erschließt.
      */}
      <div className="relative z-10 shrink-0 px-6 pb-3 pt-2 text-center">
        {offen.length > 0 ? (
          <p className="dc-chrome font-serif text-[9px] uppercase tracking-[0.26em] text-gild-500/40">
            Vom Rand nach innen ziehen
          </p>
        ) : (
          <p className="font-serif text-[10px] tracking-[0.08em] text-paper-300/35">
            Um diese Figur herum ist es noch still.
          </p>
        )}
      </div>
    </div>
  );
}

/**
 * Wenn die Kennung ins Leere zeigt.
 *
 * ---
 *
 * **Hier stand ein Satz und sonst nichts:** „Diese Figur steht nicht in
 * diesem Buch." Richtig, unbrauchbar und – das ist der Punkt – der einzige
 * Bildschirm im ganzen Programm, den man erreichen kann, ohne etwas falsch
 * gemacht zu haben. Es genügt eine Adresse mit einer alten Kennung, ein
 * Lesezeichen auf eine gelöschte Figur, ein weitergegebener Link. Ich habe
 * diesen Zustand selbst ausgelöst, indem ich eine Adresse mit einem
 * Platzhalter aufgeschrieben habe.
 *
 * Ein Raum, der nur sagt „hier ist nichts", ist eine Sackgasse mit Aussicht –
 * derselbe Satz steht in `Tiefenraum.tsx`, und er galt hier genauso. Also
 * steht jetzt da, wen dieses Buch stattdessen kennt. Das ist keine
 * Fehlermeldung mehr, sondern eine Tür.
 *
 * Und wenn das Buch wirklich noch niemanden kennt, wird auch das gesagt –
 * ohne die Behauptung, es sei etwas schiefgegangen.
 */
function KeineFigur({ figuren }: { figuren: Entry[] }) {
  const navigate = useNavigate();
  return (
    <div className="flex min-h-full flex-col bg-desk-900 px-7 pb-10 pt-16">
      <div className="text-center">
        <p className="font-serif text-[15px] text-paper-300/70">
          Diese Kennung führt zu keiner Figur.
        </p>
        <div className="mt-3 flex justify-center text-gild-500/40">
          <Goldteiler breite={120} />
        </div>
      </div>

      {figuren.length > 0 ? (
        <div className="mt-8">
          <h2 className="font-serif text-[10px] uppercase tracking-[0.26em] text-gild-500/55">
            Wen dieses Buch kennt
          </h2>
          <div className="mt-2">
            {figuren.map((f, i) => (
              <div key={f.id}>
                {i > 0 && <div className="h-px bg-gild-600/15" aria-hidden />}
                <button
                  type="button"
                  onClick={() => navigate(`/figur/${f.id}`, { replace: true })}
                  className="flex w-full items-center gap-3 py-2.5 text-left no-tap-highlight active:opacity-70"
                >
                  <Bildnis
                    entry={f}
                    schacht="beziehungsbildnis"
                    ecken
                    className="h-[46px] w-[40px] shrink-0 rounded-[2px]"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-serif text-[15px] text-paper-100">
                      {f.title}
                    </span>
                    {(f.fields?.role || f.subtitle) && (
                      <span className="mt-0.5 block truncate font-serif text-[11px] text-brass-400/70">
                        {typeof f.fields?.role === 'string' && f.fields.role ? f.fields.role : f.subtitle}
                      </span>
                    )}
                  </span>
                </button>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <p className="mt-8 text-center font-serif text-[12.5px] italic text-paper-300/40">
          In diesem Buch lebt noch niemand.
        </p>
      )}
    </div>
  );
}

/** Auf Satzgrenze kürzen, nicht auf Zeichen – ein abgeschnittenes Wort ist ein Fehler. */
function kurz(s: string, max: number): string {
  const t = s.trim();
  if (t.length <= max) return t;
  const schnitt = t.slice(0, max);
  const punkt = Math.max(schnitt.lastIndexOf('. '), schnitt.lastIndexOf('! '), schnitt.lastIndexOf('? '));
  if (punkt > max * 0.5) return schnitt.slice(0, punkt + 1);
  const luecke = schnitt.lastIndexOf(' ');
  return `${schnitt.slice(0, luecke > 0 ? luecke : max)} …`;
}
