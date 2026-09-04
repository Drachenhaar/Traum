/**
 * Der Einband.
 *
 * Das Buch liegt geschlossen auf dem Tisch. Nichts blinkt, nichts fordert.
 * Es zeigt nur, was wahr ist: wie dick es geworden ist, welche Kapitel ein
 * Lesezeichen tragen und wo zuletzt aufgehört wurde.
 *
 * Beim Antippen schlägt es auf – der Deckel schwingt um den Rücken, darunter
 * kommt Papier zum Vorschein. Weil aus dem Vorderdeckel dabei die linke Seite
 * wird, rückt das Buch nach rechts; genau das tut ein echtes Buch auch, und es
 * verhindert nebenbei, dass der Deckel auf schmalen Geräten aus dem Bild
 * schwingt.
 *
 * Die Bewegung ist bewusst schwer: langsam los, kein Nachfedern, kein Curl.
 *
 * ---
 *
 * **Was sich mit dem Living Book geändert hat.**
 *
 * Vorher standen hier drei Zahlen fest im Code: 300 Millisekunden Aufrichten,
 * 900 Millisekunden Schwung, 168 Grad Endwinkel. Jetzt kommen alle drei aus
 * der Konfiguration, weil man ein Gefühl nicht ausrechnen, sondern nur
 * ausprobieren kann – und ausprobieren heißt: am Gerät drehen, nicht neu
 * bauen.
 *
 * Und der Deckel läuft nicht mehr an einer Bézierkurve, sondern an
 * `deckelverlauf` – der Kurve mit dem Kipppunkt. Der Unterschied ist genau
 * das, was ein Einband tut: Er wehrt sich, er kippt, er kommt an. Das kostet
 * eine Bildschleife, und sie läuft nur, solange sich der Deckel bewegt.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import type { BookStructure } from '../../lib/book';
import { spineThickness } from '../../lib/book';
import type { BookIdentity } from '../../types';
import { deskStyle } from '../../lib/textures';
import { coverSurface, CoverFace } from './CoverBoard';
import { cx } from '../../lib/utils';
import { beiKonfig, konfig } from '../../lib/raum/konfig';
import { haptik } from '../../lib/raum/haptik';
import { beruehrung, dauer, deckelverlauf, deckelwinkel } from '../../lib/buch/koerper';

/**
 * Wie schnell das Buch auf eine Berührung antwortet.
 *
 * Bewusst keine eigene Stellschraube: Eine Antwort, die man einstellen kann,
 * ist keine Antwort mehr, sondern eine Animation. Was sich einstellen lässt,
 * ist das Gewicht – und `dauer` macht daraus die Zeit.
 */
const ANTWORT_MS = 150;

type Phase = 'zu' | 'richtet' | 'oeffnet';

export function Cover({
  book,
  identity,
  tagline,
  resumePage,
  resumeLabel,
  onOpen,
  onRegal,
}: {
  book: BookStructure;
  /** Der Einband, wie ihn der Verfasser erschaffen hat. */
  identity: BookIdentity;
  tagline: string;
  resumePage?: number;
  resumeLabel?: string;
  /**
   * Aufgeschlagen – und **wo** die erste Seite dabei zuletzt stand.
   *
   * Ohne dieses Rechteck kann das Buchinnere nur an seiner eigenen Stelle
   * erscheinen, und das ist der Schnitt, den es hier zu vermeiden gilt: Die
   * Umschlagseite ist buchförmig (286 auf 390), die Buchseite
   * bildschirmförmig (390 auf 784). Zwei verschiedene Seitenverhältnisse –
   * keine Skalierung der Welt bringt sie zur Deckung. Also übergibt der
   * Umschlag seine Messung, und das Innere wächst von dort in seine Form.
   */
  /*
   * Das zweite Rechteck: der aufgeschlagene Deckel daneben.
   *
   * Im Augenblick der Übergabe stehen **zwei** helle Flächen auf dem Schirm –
   * die aufgedeckte Seite rechts und das Vorsatzpapier des offenen Deckels
   * links. Das Innere übernimmt nur die erste; die zweite verschwand bisher in
   * einem einzigen Bild. Gemessen: Die linke Bildschirmhälfte fiel von
   * Helligkeit 172 auf 47, ohne Zwischenschritt. Genau dieses Loch liest das
   * Auge als „Klatsch" – nicht die Seite, sondern das, was neben ihr fehlt.
   *
   * Also reicht der Umschlag auch dieses Rechteck weiter, und das Innere lässt
   * den Deckel dort ausklingen, während die Seite nach vorn kommt.
   */
  onOpen: (
    von?: { x: number; y: number; breite: number; hoehe: number },
    vorsatz?: { x: number; y: number; breite: number; hoehe: number },
  ) => void;
  /**
   * Zurueck ins Regal.
   *
   * Fehlt, wenn dieses Geraet nur dieses eine Buch kennt: Ein Regal mit einem
   * Band darin ist kein Regal, und ein Verweis darauf waere ein Umweg zu
   * nichts. Erst ab dem zweiten Buch steht die Zeile hier.
   */
  onRegal?: () => void;
}) {
  const [phase, setPhase] = useState<Phase>('zu');
  /** Zustand B: Ein Finger liegt auf dem Einband, mehr nicht. */
  const [beruehrt, setBeruehrt] = useState(false);
  const timers = useRef<number[]>([]);
  const deckel = useRef<HTMLDivElement>(null);
  /** Die aufgedeckte erste Seite – der Anfangspunkt des Übergangs. */
  const aufgedeckteSeite = useRef<HTMLDivElement>(null);
  /** Das Vorsatzpapier im offenen Deckel – die Fläche, die daneben stehenbleibt. */
  const vorsatzpapier = useRef<HTMLDivElement>(null);
  const bild = useRef<number | null>(null);

  /*
   * Die Konfiguration wird gelesen, nicht abonniert – außer im Stimmzimmer,
   * wo sie sich im Betrieb ändert. Ein Zustand mit einem Abmelder kostet
   * hier vier Zeilen und erspart die Frage, warum das Drehen am Regler erst
   * nach dem Neuladen wirkt.
   */
  const [k, setK] = useState(konfig);
  useEffect(() => beiKonfig(() => setK(konfig())), []);

  /*
   * Der Buchzustand steht am Wurzelelement.
   *
   * Kein Debugwert in der Oberfläche – ein Attribut, das niemand sieht. Es
   * gibt genau eine Stelle, an der „wie steht das Buch gerade" ablesbar sein
   * muss, und ein Zustandsspeicher dafür wäre ein zweiter Ort für eine
   * Wahrheit, die schon im DOM steht.
   */
  useEffect(() => {
    document.documentElement.dataset.buch =
      phase !== 'zu' ? 'oeffnet' : beruehrt ? 'beruehrt' : 'geschlossen';
    return () => {
      delete document.documentElement.dataset.buch;
    };
  }, [phase, beruehrt]);

  const thickness = spineThickness(book.totalPages);
  const blockWidth = 10 + thickness * 30;
  const ribbons = book.chapters.slice(0, 8);

  const antwort = beruehrung(k);
  const richtenMs = dauer(k.buch.einrastenMs, k);
  const schwungMs = dauer(k.buch.oeffnenMs, k);

  useEffect(
    () => () => {
      timers.current.forEach(window.clearTimeout);
      if (bild.current !== null) cancelAnimationFrame(bild.current);
    },
    [],
  );

  /**
   * Der Deckel, Bild für Bild.
   *
   * Warum nicht als Übergang: Eine CSS-Kurve hat vier Zahlen, und keine
   * Kombination davon ergibt „erst zäh, dann kippen, dann ankommen" – die
   * Bézierkurve kann nicht zweimal die Richtung ihrer Beschleunigung ändern.
   * `deckelverlauf` kann es, und ist außerdem die Stelle, an der man den
   * Widerstand dreht, ohne eine Kurve neu zu erfinden.
   *
   * Die Schleife läuft ausschließlich während des Öffnens und hört von selbst
   * auf. Nichts davon geht durch React.
   */
  const schwinge = useCallback(
    (kf: typeof k, ms: number, fertig: () => void) => {
      const t0 = performance.now();
      const lauf = () => {
        const t = Math.min(1, (performance.now() - t0) / ms);
        const el = deckel.current;
        if (el) {
          el.style.transform = `rotateY(${deckelwinkel(t, kf)}deg)`;
          /* Der Deckel dreht sich vom Licht weg – am Verlauf, nicht an der Zeit. */
          el.style.setProperty('--dc-deckel', String(deckelverlauf(t, kf.buch.deckelwiderstand)));
        }
        document.documentElement.style.setProperty('--dc-buch-fortschritt', String(t));
        if (t < 1) {
          bild.current = requestAnimationFrame(lauf);
        } else {
          bild.current = null;
          fertig();
        }
      };
      bild.current = requestAnimationFrame(lauf);
    },
    [],
  );

  const open = () => {
    if (phase !== 'zu') return;
    setBeruehrt(false);

    /* Wer Bewegung reduziert haben möchte, bekommt sie nicht aufgezwungen. */
    const still = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (still) {
      /* Weniger Bewegung heißt nicht weniger Rückmeldung. */
      haptik.oeffnen();
      onOpen();
      return;
    }

    setPhase('richtet');
    timers.current.push(
      window.setTimeout(() => {
        setPhase('oeffnet');
        haptik.oeffnen();
        schwinge(k, schwungMs, () => {
          /*
           * Gemessen im letzten Bild vor der Übergabe – dann, wenn die
           * Stellung `book-offen` fertig gewirkt hat. Eine Zahl aus dem
           * Stylesheet nachzurechnen wäre eine zweite Wahrheit über
           * dasselbe und beim nächsten Regler falsch.
           */
          const messe = (e: HTMLDivElement | null) => {
            const r = e?.getBoundingClientRect();
            return r && r.width > 4 && r.height > 4
              ? { x: r.x, y: r.y, breite: r.width, hoehe: r.height }
              : undefined;
          };
          onOpen(messe(aufgedeckteSeite.current), messe(vorsatzpapier.current));
        });
      }, richtenMs),
    );
  };

  /**
   * Die Antwort auf den Finger.
   *
   * Nur im geschlossenen Zustand – wenn der Deckel schon schwingt, wäre ein
   * Anheben kein Zeichen mehr, sondern ein Ruckeln. Und `onPointerCancel`
   * gehört genauso dazu wie `onPointerUp`: Wer den Finger vom Einband zieht,
   * um zu scrollen, soll kein angehobenes Buch zurücklassen.
   */
  const anfassen = () => {
    if (phase !== 'zu') return;
    setBeruehrt(true);
    haptik.beruehrung();
  };
  const loslassen = () => setBeruehrt(false);

  const opening = phase === 'oeffnet';

  return (
    <div
      className="flex h-full w-full flex-col items-center justify-center overflow-hidden px-6 py-10"
      style={
        {
          ...deskStyle,
          /* Die beiden Dauern, die das Stylesheet für die Stellungen braucht. */
          '--dc-buch-richten': `${richtenMs}ms`,
          '--dc-buch-oeffnen': `${schwungMs}ms`,
        } as React.CSSProperties
      }
    >
      {/*
        Hier lag die eigentliche Naht.
        ---
        Dieser Kasten trug `opacity: opening ? 0 : 1` – und er enthält **auch
        das Buch**. Die ganze Szene blendete also kurz vor der Übergabe auf
        null aus, und weil das Buchinnere danach seinerseits bei null anfängt,
        sah der Leser dazwischen für einen Augenblick nur den dunklen Tisch.
        Kein Sprung, ein Loch – und ein Loch fällt mehr auf als ein Schnitt.
        Gemeldet wurde es als „der Wechsel ist nicht sehr smooth".
        Jetzt bleibt das Buch bis zuletzt beleuchtet; nur das, was **um** das
        Buch herum steht, tritt ab. Übergeben wird ein volles Bild an ein
        volles Bild.
      */}
      <div className="flex flex-col items-center">
        {/* ------------------------------------------------------ Das Buch */}
        <button
          type="button"
          onClick={open}
          onPointerDown={anfassen}
          onPointerUp={loslassen}
          onPointerCancel={loslassen}
          onPointerLeave={loslassen}
          aria-label={`${identity.title || 'Das Buch'} aufschlagen`}
          className="group relative no-tap-highlight"
          style={{ perspective: '2200px' }}
        >
          {/* Geschlossen angeschnitten, dann gerade, dann aufgeschlagen und
              zur Seite gerückt – die Stellungen stehen in index.css, weil sie
              auf schmalen Geräten zusätzlich verkleinert werden müssen. */}
          <div
            className={cx(
              'book-stage relative',
              phase === 'zu' && 'book-zu',
              phase === 'richtet' && 'book-gerade',
              opening && 'book-offen',
            )}
            style={{ transformStyle: 'preserve-3d' }}
          >
            {/*
              Zustand B liegt hier und nicht an der Bühne darüber: Die Bühne
              trägt schon die Drehung aus `book-zu`, und zwei Quellen für
              dieselbe Eigenschaft ergeben immer die eine, die gewinnt. Ein
              Hub von wenigen Punkten – man sieht ihn nicht, man merkt ihn.
            */}
            <div
              className="relative h-[390px] w-[286px] sm:h-[476px] sm:w-[348px]"
              style={{
                transformStyle: 'preserve-3d',
                transform: beruehrt
                  ? `translateY(${-antwort.hub}px) scale(${antwort.skala})`
                  : 'translateY(0px) scale(1)',
                transition: `transform ${dauer(ANTWORT_MS, k)}ms cubic-bezier(0.22, 0.61, 0.36, 1)`,
              }}
            >
              {/* Lesezeichen – sie gehören zum Buchblock, nicht zum Deckel */}
              <div className="absolute -top-3 right-8 z-30 flex gap-1.5">
                {ribbons.map(({ chapter, complete }) => (
                  <span
                    key={chapter.id}
                    className="block h-4 w-[7px] rounded-t-[2px]"
                    style={{
                      background: complete ? '#D4AF37' : chapter.ribbon,
                      boxShadow: complete ? '0 0 7px rgba(212,175,55,0.55)' : 'none',
                    }}
                  />
                ))}
              </div>

              {/* Der Buchblock: sichtbare Seitenkanten an der rechten Kante */}
              <div
                aria-hidden
                className="absolute right-0 top-[7px] z-0 h-[calc(100%-14px)] translate-x-[calc(100%-3px)] rounded-r-[2px]"
                style={{
                  width: blockWidth,
                  background:
                    'repeating-linear-gradient(90deg, #cbbc9c 0px, #e6dbc0 1.5px, #bfae8c 2.5px, #ddd1b4 4px)',
                  boxShadow:
                    'inset -8px 0 12px -7px rgba(0,0,0,0.65), inset 0 8px 10px -8px rgba(0,0,0,0.4), inset 0 -8px 10px -8px rgba(0,0,0,0.4)',
                }}
              />

              {/*
                Die erste Seite – liegt unter dem Deckel und wird beim Öffnen
                frei.

                Sie trägt den Griff für den durchgehenden Übergang: Wo *diese*
                Fläche im Augenblick der Übergabe steht, dort setzt das
                Buchinnere an. Gemessen wird sie und nicht der Kasten darum –
                der Leser sieht Papier, keine Kästen.
              */}
              <div
                ref={aufgedeckteSeite}
                aria-hidden
                className="paper-sheet absolute inset-0 z-[1] rounded-[3px]"
                style={{ boxShadow: 'inset 14px 0 26px -18px rgba(60,44,26,0.75)' }}
              />

              {/* --------------------------------------------------- Der Deckel */}
              <div
                ref={deckel}
                className="absolute inset-0 z-10"
                style={{
                  transformStyle: 'preserve-3d',
                  transformOrigin: 'left center',
                  /*
                   * Kein Übergang. Der Winkel kommt Bild für Bild aus
                   * `schwinge`; eine Dauer daneben würde die Kurve, um die es
                   * hier geht, wieder glattbügeln.
                   */
                  transform: 'rotateY(0deg)',
                }}
              >
                {/*
                  Aussenseite: der Einband, den der Verfasser erschaffen hat.
                  Material, Farbe, Zeichen und Titel kommen aus derselben
                  Quelle wie bei der Erschaffung – das Buch, das man hier
                  aufschlaegt, ist genau das, das man dort gebunden hat.
                */}
                <div
                  className="absolute inset-0 overflow-hidden rounded-[4px]"
                  style={{
                    backfaceVisibility: 'hidden',
                    WebkitBackfaceVisibility: 'hidden',
                    ...coverSurface(identity),
                    boxShadow:
                      '0 40px 70px -22px rgba(0,0,0,0.9), inset 0 1px 0 rgba(226,196,120,0.22), inset -14px 0 26px -18px rgba(0,0,0,0.8), inset 0 0 70px rgba(0,0,0,0.3)',
                    /*
                      Der Deckel dreht sich vom Licht weg und wird dunkler –
                      und zwar an derselben Kurve wie die Drehung selbst, weil
                      `schwinge` `--dc-deckel` mitschreibt. Vorher lief das
                      Licht an einer eigenen Zeit und war in der Mitte der
                      Bewegung schon dunkler, als der Winkel es hergab.
                    */
                    filter: 'brightness(calc(1 - 0.45 * var(--dc-deckel, 0)))',
                  }}
                >
                  <CoverFace identity={identity} />
                </div>

                {/* Innenseite des Deckels: das Vorsatzpapier */}
                <div
                  ref={vorsatzpapier}
                  aria-hidden
                  className="paper-sheet absolute inset-0 rounded-[4px]"
                  style={{
                    backfaceVisibility: 'hidden',
                    WebkitBackfaceVisibility: 'hidden',
                    transform: 'rotateY(180deg)',
                    boxShadow: 'inset -16px 0 30px -18px rgba(60,44,26,0.8)',
                    filter: 'brightness(0.86)',
                  }}
                />
              </div>
            </div>
          </div>

          {/* Schatten auf dem Tisch */}
          <div
            aria-hidden
            className="absolute -bottom-5 left-1/2 h-8 w-[86%] rounded-[50%] blur-xl"
            style={{
              background: 'rgba(0,0,0,0.6)',
              /*
                Hebt das Buch an, wandert der Schatten nach unten und wird
                weicher. Das ist der Teil der Berührung, den man tatsächlich
                sieht – der Hub selbst ist zu klein dafür.
              */
              transform: `translateX(-50%) translateY(${beruehrt ? antwort.schattenweg : 0}px) scale(${
                beruehrt ? 1.04 : 1
              })`,
              opacity: opening ? 0.35 : beruehrt ? 0.74 : 1,
              transition: `transform ${dauer(ANTWORT_MS, k)}ms cubic-bezier(0.22, 0.61, 0.36, 1), opacity ${
                opening ? 700 : dauer(ANTWORT_MS, k)
              }ms ease-out`,
            }}
          />
        </button>

        {/* --------------------------------------------------------- Text */}
        {/*
          Titel, Knopf und Regalzeile treten ab, sobald der Deckel schwingt.
          Sie haben ihre Arbeit getan, und ein Knopf, der beim Aufschlagen
          noch dasteht, lädt zum zweiten Tippen ein.
        */}
        <div
          className="mt-14 max-w-md text-center"
          style={{
            opacity: opening ? 0 : 1,
            transition: `opacity 260ms ease-in ${Math.max(0, Math.round(schwungMs * 0.15))}ms`,
          }}
        >
          <p className="font-serif text-[13px] italic leading-relaxed text-paper-400/70">
            {tagline || 'Ein lebendiges Buch. Deine Welt. Deine Geschichte.'}
          </p>

          <button
            type="button"
            onClick={open}
            className="mt-5 inline-flex min-h-[44px] items-center gap-2.5 rounded-full border border-gild-500/35 px-6 font-serif text-[15px] text-gild-300 transition-colors duration-300 hover:border-gild-400/70 hover:text-gild-300 no-tap-highlight"
          >
            {resumePage ? `Weiterlesen auf Seite ${resumePage}` : 'Das Buch aufschlagen'}
          </button>

          {resumeLabel && (
            <p className="mt-3 font-serif text-[12.5px] italic text-paper-400/50">{resumeLabel}</p>
          )}

          {onRegal && (
            <div className="mt-7">
              <button
                type="button"
                onClick={onRegal}
                className="min-h-[40px] font-serif text-[13px] italic text-paper-400/45 transition-colors hover:text-gild-400 no-tap-highlight"
              >
                Deine anderen Bücher
              </button>
            </div>
          )}

          <p className="mt-8 font-serif text-[11.5px] tracking-[0.18em] text-paper-400/35">
            {book.totalPages} Seiten · {book.chapters.length} Kapitel
          </p>
        </div>
      </div>
    </div>
  );
}
