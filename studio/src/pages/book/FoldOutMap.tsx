/**
 * Die Faltkarte.
 *
 * Der Weltgraph, aber nicht mehr als Werkzeug: als Himmel, in dem man steht.
 * Die Sterne hängen ringsum, man sieht den Ausschnitt, in den man gerade
 * schaut, und sieht sich um, indem man wischt.
 *
 * Entscheidend ist, was hier *nicht* passiert: **die Anordnung wird einmal
 * berechnet und dann eingefroren.** Ein Sternbild ordnet sich nicht um,
 * während man es betrachtet. Den Kopf zu drehen ist etwas anderes – dabei
 * bleibt jeder Stern, wo er ist, und nur der Blick geht.
 */

import { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X } from 'lucide-react';
import { useStudio, livingEntries } from '../../store/useStudio';
import { GraphSimulation } from '../../lib/graph';
import {
  achsen,
  anDenHimmel,
  aufDenSchirm,
  begrenzen,
  brennweite,
  imBild,
  milchstrasse,
  nachHelligkeit,
  punktePfad,
  saatAus,
  sternenhimmel,
  verblassen,
  SICHTFELD,
  type Blick,
  type Richtung,
} from '../../lib/himmel';
import {
  einpassen,
  namenSetzen,
  FALTKARTE,
  SPERRUNG,
  type Namenszug,
} from '../../lib/sternkarte';
import { relationType } from '../../lib/relations';
import { templateFor } from '../../lib/templates';
import { chapterOfType } from '../../lib/book';
import { datiere, spanne, weltzustand } from '../../lib/chronik/zustand';
import { ausOrdnung, schreibeJahr } from '../../lib/chronik/zeit';
import { epocheBei, epochen } from '../../lib/welt/epochen';
import { weltsicht } from '../../lib/welt/abfrage';
import { cx } from '../../lib/utils';

/** So oft wird gerechnet, bis die Karte ruhig liegt. Danach nie wieder. */
const SETTLE_TICKS = 420;

/**
 * Wie viele Sterne die Karte hoechstens zeichnet.
 *
 * Nicht aus Bequemlichkeit, sondern weil es die einzige ehrliche Zahl ist:
 * Fuenftausend Punkte auf einer Handbreite sind kein Sternbild, sondern
 * Nebel. Man erkennt nichts, kann nichts treffen, und das Rechnen dafuer
 * legte den ganzen Bildschirm fuer zwoelf Sekunden still – gemessen bei
 * zweitausend Eintraegen.
 *
 * Gezeichnet werden die am staerksten verbundenen. Das ist keine willkuerliche
 * Auswahl: Auf einer Karte, die Zusammenhang zeigen soll, sind das genau die
 * Orte, an denen etwas zusammenhaengt. Und es steht auf der Karte, dass es
 * eine Auswahl ist – eine stille Kuerzung waere eine zweite Wahrheit.
 */
const MAX_STERNE = 400;

/**
 * Die Schriftgrösse der Namen, in Bildschirmpunkten.
 *
 * Punkte, nicht Karteneinheiten – und das geht hier auf, weil der Ausschnitt
 * genauso gross gewählt ist wie das Bildfeld: eine Zeicheneinheit ist ein
 * Bildpunkt. Vorher war das anders und musste umgerechnet werden; dabei kam
 * auf einem Telefon jedes Mal etwa vier Punkte heraus, und der Text war
 * zwar da, aber nicht zu lesen.
 */
const SCHRIFT = 11.5;

/**
 * Wie viele namenlose Sterne hinter den benannten stehen – auf der ganzen
 * Kugel, nicht im Bild.
 *
 * Gezeichnet wird nur, was gerade im Ausschnitt liegt: bei diesen Zahlen
 * rund 870 Punkte. Die Zahl hier ist also die Dichte des Himmels, nicht die
 * Zahl der Punkte auf dem Schirm.
 *
 * Nachgemessen, wie teuer ein Bildwechsel beim Wischen ist:
 *
 *     2600 + 1800  →  275 Punkte im Bild  ·  0.3 ms
 *     9000 + 6000  →  869 Punkte im Bild  ·  0.3 ms
 *    18000 + 12000 → 1796 Punkte im Bild  ·  0.3 ms, im schlimmsten Fall 12.6
 *
 * Das Rechnen über alle Sterne kostet fast nichts – es sind ein paar
 * Multiplikationen je Stern. Teuer wird erst das Bauen der Pfade für die
 * sichtbaren, und dort fängt es bei knapp zweitausend an zu zucken. Bei
 * neuntausend ist der Himmel dicht und die Bewegung ruhig.
 */
const HIMMELSSTERNE = 9000;

/** Und wie viele davon im Band stehen. */
const BANDSTERNE = 6000;

/**
 * Wie stark die Verbindungslinien im Ruhezustand stehen.
 *
 * Der Wert ist klein, und er ist es mit Absicht: Im Bild liegen leicht
 * achtzig Linien, und in voller Stärke bilden sie ein Netz, durch das man
 * die Sterne nicht mehr sieht. So schwach sind sie ein Gewebe im
 * Hintergrund – man sieht, *dass* da Ordnung ist, ohne sie lesen zu
 * müssen. Wer sie lesen will, tippt einen Stern an.
 */
const LINIE_RUHT = 0.16;

/** Wie weit ein Finger wandern darf, damit es noch ein Antippen ist. */
const TIPP_WEITE = 7;

/** Wie weit eine Pfeiltaste den Blick dreht. */
const TASTENSCHRITT = (7 * Math.PI) / 180;

export function FoldOutMap() {
  const navigate = useNavigate();
  const entries = useStudio((s) => s.entries);
  const relations = useStudio((s) => s.relations);
  const relIndex = useStudio((s) => s.relIndex);
  const [selected, setSelected] = useState<string | null>(null);
  /** Kein Jahr gewählt: die Karte zeigt alle Zeiten zugleich. */
  const [jahr, setJahr] = useState<number | null>(null);
  /** Ob die Welt überhaupt Sterne hat – der leere Rahmen sagt es sonst zu früh. */
  const leer = useMemo(() => livingEntries(entries).length === 0, [entries]);

  /*
   * Das Bildfeld wird gemessen, nicht geraten.
   *
   * Daran hängt alles: die Form, in die sich die Sterne setzen, die
   * Brennweite, und wie weit ein Wisch den Blick dreht.
   */
  const feldRef = useRef<HTMLDivElement>(null);
  const [rahmen, setRahmen] = useState<{ breite: number; hoehe: number } | null>(null);

  useLayoutEffect(() => {
    const feld = feldRef.current;
    if (!feld) return;
    /*
     * `offsetWidth` und nicht `getBoundingClientRect`.
     *
     * Der Unterschied: Das eine misst den Kasten, das andere das Bild.
     * Die Faltkarte klappt beim Aufschlagen mit `scale(0.94)` auf, und
     * `getBoundingClientRect` rechnet diese Verkleinerung mit. Wer während
     * der Bewegung misst, misst 363 statt 390 Punkte – und weil sich der
     * Kasten danach nicht ändert, sondern nur die Verkleinerung ausläuft,
     * meldet sich der Beobachter nie wieder. Die Karte blieb für einen
     * Rahmen gesetzt, den es nie gab.
     */
    const messen = () => {
      const breite = feld.offsetWidth;
      const hoehe = feld.offsetHeight;
      if (breite > 0 && hoehe > 0) {
        setRahmen((alt) =>
          alt && alt.breite === breite && alt.hoehe === hoehe ? alt : { breite, hoehe },
        );
      }
    };
    messen();
    const beobachter = new ResizeObserver(messen);
    beobachter.observe(feld);
    return () => beobachter.disconnect();
  }, []);

  /*
   * Die Form, in die die Anordnung eingepasst wird – gestuft, damit nicht
   * jeder Bildpunkt eine neue Simulation auslöst.
   */
  const form = rahmen ? Math.round((rahmen.hoehe / rahmen.breite) * 20) / 20 : null;

  /*
   * Einmal rechnen, dann stehen lassen. Kein Animationsrahmen, kein Nachfedern –
   * deshalb wirkt die Karte gezeichnet statt simuliert.
   */
  const layout = useMemo(() => {
    if (form === null) return null;
    const alleLebenden = livingEntries(entries);
    if (alleLebenden.length === 0) return null;

    /*
     * Bei grossen Welten nur die am staerksten verbundenen zeichnen.
     * Bei gleichem Grad entscheidet der Titel – sonst saehe dieselbe Welt bei
     * jedem Aufschlagen anders aus.
     */
    const grad = (e: (typeof alleLebenden)[number]) => relIndex.neighbours.get(e.id)?.size ?? 0;
    const gekuerzt = alleLebenden.length > MAX_STERNE;
    const living = gekuerzt
      ? [...alleLebenden]
          .sort((a, b) => grad(b) - grad(a) || a.title.localeCompare(b.title, 'de'))
          .slice(0, MAX_STERNE)
      : alleLebenden;

    /*
     * Ein Set statt zweimal `some` je Kante.
     *
     * Vorher war das Aussortieren der Kanten O(Kanten x Eintraege): bei
     * zweitausend von jedem waren es acht Millionen Vergleiche, nur um
     * festzustellen, dass fast alle Kanten dazugehoeren.
     */
    const sichtbarkeit = new Set(living.map((e) => e.id));

    /*
     * Weit auseinander: ein Sternbild braucht Schwarz zwischen den Sternen.
     * Und in der Form des Bildfeldes, nicht rund – dann steht die Welt am
     * Himmel so hoch, wie das Fenster hoch ist.
     */
    const sim = new GraphSimulation({
      linkDistance: 210,
      charge: 6200,
      gravity: 0.008,
      streckung: form,
    });
    sim.setData(
      living.map((e) => ({
        id: e.id,
        r: 4 + Math.min(7, grad(e) * 1.1),
        color: templateFor(e.type).accent,
        label: e.title,
        type: e.type,
      })),
      relations
        .filter((r) => sichtbarkeit.has(r.fromId) && sichtbarkeit.has(r.toId))
        .map((r) => ({
          id: r.id,
          source: r.fromId,
          target: r.toId,
          color: relationType(r.type).color,
          label: relationType(r.type).label,
        })),
    );

    einpassen(sim, form, { ...FALTKARTE, setzen: SETTLE_TICKS });

    /*
     * Und dann an den Himmel.
     *
     * Erst setzen lassen, dann aufhängen – nicht umgekehrt. Die Simulation
     * rechnet in der Ebene mit Abständen; auf einer Kugel wären das nicht
     * mehr die Abstände, die sie meint. Das Aufhängen ist eine Projektion,
     * die ganz zum Schluss kommt, so wie ein Kartograf sein Netz zuletzt
     * wählt.
     */
    const { richtungen, weite } = anDenHimmel(sim.nodes);

    const sterne = sim.nodes.map((n, i) => ({
      id: n.id,
      d: richtungen[i],
      r: n.r,
      label: n.label,
      rang: relIndex.neighbours.get(n.id)?.size ?? 0,
    }));

    return {
      sterne,
      kanten: sim.edges,
      amHimmel: new Map(sterne.map((s) => [s.id, s.d])),
      weite,
      /* Jede Welt bekommt ihren eigenen Himmel – und zwar immer denselben. */
      saat: saatAus(living[0]?.bookId ?? 'himmel'),
      /* Wurde gekuerzt? Dann muss es dastehen. */
      gezeigt: living.length,
      gesamt: alleLebenden.length,
    };
  }, [entries, relations, relIndex, form]);

  /*
   * Der Himmel dahinter – einmal je Welt, unabhängig vom Blickwinkel.
   *
   * Er hängt an der Kugel, nicht am Ausschnitt: Beim Umsehen werden dieselben
   * Sterne nur anders projiziert. Deshalb steht er hier und nicht im
   * Zeichnen.
   */
  const himmel = useMemo(
    () =>
      layout
        ? {
            sterne: sternenhimmel(layout.saat, HIMMELSSTERNE),
            band: milchstrasse(layout.saat, BANDSTERNE),
          }
        : null,
    [layout],
  );

  /* ------------------------------------------------------------ Umsehen -- */

  const [blick, setBlick] = useState<Blick>({ gier: 0, neigung: 0 });
  /** Wo der Blick zuletzt zur Ruhe kam – dort werden die Namen gesetzt. */
  const [ruhe, setRuhe] = useState<Blick>({ gier: 0, neigung: 0 });
  const [zieht, setZieht] = useState(false);
  /** Ob seit dem Aufsetzen des Fingers wirklich gezogen wurde. */
  const gezogen = useRef(false);
  const start = useRef<{ x: number; y: number; blick: Blick } | null>(null);

  /*
   * Wie weit ein Bildpunkt den Blick dreht.
   *
   * Ein Wisch über die ganze Höhe des Bildfeldes dreht um genau ein
   * Sichtfeld. Damit wandert der Stern unter dem Finger mit dem Finger –
   * in der Mitte des Bildes genau, zum Rand hin etwas gedehnt, weil die
   * Zentralprojektion dort dehnt. Das ist die Bewegung, die sich anfühlt,
   * als griffe man in den Himmel und nicht an einen Regler.
   */
  const jeSchritt = rahmen ? SICHTFELD / rahmen.hoehe : 0;

  const dreh = useCallback(
    (dGier: number, dNeigung: number) => {
      if (!layout) return;
      setBlick((alt) =>
        begrenzen({ gier: alt.gier + dGier, neigung: alt.neigung + dNeigung }, layout.weite),
      );
    },
    [layout],
  );

  /*
   * Der Zeiger wird **erst beim Ziehen** eingefangen, nicht beim Aufsetzen.
   *
   * Das ist kein Feinschliff, sondern die Antwort auf einen gemessenen
   * Fehler: `setPointerCapture` leitet auch das darauffolgende `click`
   * um – nicht mehr an den Stern unter dem Finger, sondern an das Feld,
   * das eingefangen hat. Beim Aufsetzen eingefangen liess sich deshalb
   * **kein einziger Stern mehr antippen**. Am Standbild war davon nichts
   * zu sehen; erst der Lauf, der Wischen und Antippen nacheinander
   * ausprobiert hat, brachte es heraus.
   *
   * Solange nicht gezogen wird, braucht es das Einfangen ohnehin nicht.
   */
  const aufsetzen = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!layout) return;
    gezogen.current = false;
    start.current = { x: e.clientX, y: e.clientY, blick };
  };

  const bewegen = (e: React.PointerEvent<SVGSVGElement>) => {
    const s = start.current;
    if (!s || !layout) return;
    const dx = e.clientX - s.x;
    const dy = e.clientY - s.y;
    if (!gezogen.current && Math.hypot(dx, dy) < TIPP_WEITE) return;
    if (!gezogen.current) {
      gezogen.current = true;
      setZieht(true);
      /* Ab jetzt gehören die Ereignisse dem Feld, auch ausserhalb davon. */
      e.currentTarget.setPointerCapture(e.pointerId);
    }
    /*
     * Die Vorzeichen: Man greift in den Himmel und zieht ihn. Wer einen
     * Stern von rechts in die Mitte zieht, hat nach rechts geschaut; wer
     * ihn von oben herunterzieht, hat nach oben geschaut.
     */
    setBlick(
      begrenzen(
        { gier: s.blick.gier - dx * jeSchritt, neigung: s.blick.neigung + dy * jeSchritt },
        layout.weite,
      ),
    );
  };

  const absetzen = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!start.current) return;
    start.current = null;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    if (gezogen.current) {
      setZieht(false);
      setRuhe(blick);
    }
  };

  const taste = (e: React.KeyboardEvent<SVGSVGElement>) => {
    const schritt: Record<string, [number, number]> = {
      ArrowLeft: [-TASTENSCHRITT, 0],
      ArrowRight: [TASTENSCHRITT, 0],
      ArrowUp: [0, TASTENSCHRITT],
      ArrowDown: [0, -TASTENSCHRITT],
    };
    const s = schritt[e.key];
    if (!s) return;
    e.preventDefault();
    dreh(s[0], s[1]);
  };

  /* Nach dem Drehen per Taste kommt der Blick sofort zur Ruhe. */
  useLayoutEffect(() => {
    if (!zieht) setRuhe(blick);
  }, [blick, zieht]);

  /* -------------------------------------------------------- Projizieren -- */

  const f = rahmen ? brennweite(rahmen.hoehe / 2) : 1;
  /* Das Mass, an dem sich »lang« bemisst. */
  const diagonale = rahmen ? Math.hypot(rahmen.breite, rahmen.hoehe) : 1;
  const sichtachsen = useMemo(() => achsen(blick), [blick]);

  /** Die Sterne der Welt, wie sie jetzt im Bild stehen. */
  const imBlick = useMemo(() => {
    if (!layout || !rahmen) return [];
    return layout.sterne
      .map((s) => ({ ...s, lage: aufDenSchirm(s.d, sichtachsen, f) }))
      .filter((s): s is typeof s & { lage: { x: number; y: number } } => s.lage !== null);
  }, [layout, rahmen, sichtachsen, f]);

  /** Der gemalte Himmel, für diesen Blickwinkel. */
  const grund = useMemo(() => {
    if (!himmel || !rahmen) return null;
    return {
      sterne: nachHelligkeit(imBild(himmel.sterne, sichtachsen, f, rahmen), 4),
      band: nachHelligkeit(imBild(himmel.band, sichtachsen, f, rahmen), 3),
    };
  }, [himmel, rahmen, sichtachsen, f]);

  /**
   * Wer einen Namen trägt – gesetzt für den ruhenden Blick.
   *
   * Nicht bei jedem Bildwechsel: Das Setzen wägt jeden Namen gegen jeden
   * schon gesetzten ab, und das ist zu viel Arbeit für sechzig Bilder in der
   * Sekunde. Beim Wischen treten die Namen deshalb zurück und kommen
   * wieder, sobald der Blick steht – so, wie man beim Umsehen auch erst
   * liest, wenn man hinsieht.
   */
  const namen = useMemo(() => {
    if (!layout || !rahmen) return new Map<string, Namenszug>();
    const b = achsen(ruhe);
    const fr = brennweite(rahmen.hoehe / 2);
    const sichtbare = layout.sterne
      .map((s) => {
        const lage = aufDenSchirm(s.d, b, fr);
        return lage ? { id: s.id, x: lage.x, y: lage.y, r: s.r, label: s.label, rang: s.rang } : null;
      })
      .filter((s): s is NonNullable<typeof s> => s !== null);
    return namenSetzen(sichtbare, {
      groesse: SCHRIFT,
      luft: SCHRIFT * 0.14,
      laenge: 22,
      feld: {
        kasten: {
          l: -rahmen.breite / 2,
          o: -rahmen.hoehe / 2,
          r: rahmen.breite / 2,
          u: rahmen.hoehe / 2,
        },
      },
    });
  }, [layout, rahmen, ruhe]);

  /* ------------------------------------------------------------- Zeit ---- */

  /*
   * Die Zeit verschiebt keine Sterne.
   *
   * Naheliegend waere, bei einem gewaehlten Jahr nur die damals bestehenden
   * Eintraege in die Berechnung zu geben. Das waere falsch: Der Lageplan
   * wuerde sich bei jeder Bewegung neu setzen, und das Sternbild spraenge
   * umher. Eine Karte, die sich unter der Hand umordnet, ist keine Karte.
   *
   * Also bleibt die Lage fuer alle Zeiten dieselbe, und das Jahr entscheidet
   * nur, was leuchtet. Zeit als Licht, nicht als Umzug.
   */
  const datierte = useMemo(() => datiere(livingEntries(entries)), [entries]);

  const spanneDerWelt = useMemo(() => spanne(datierte), [datierte]);

  /*
   * Die Zeitalter dieser Welt.
   *
   * Sie kosten nichts, wenn es keine gibt – dann ist die Liste leer und der
   * Regler zeigt weiterhin die Jahreszahl. Wer welche angelegt hat, liest
   * beim Ziehen ihren Namen statt einer Zahl, die ihm nichts sagt.
   */
  const zeitalter = useMemo(() => epochen(weltsicht(entries, relations)), [entries, relations]);
  const jetzigeEpoche = jahr === null ? undefined : epocheBei(zeitalter, jahr);

  const sichtbar = useMemo(() => {
    if (jahr === null) return null;
    const z = weltzustand(datierte, relations, jahr);
    return {
      sterne: new Set(z.bestand.map((d) => d.entry.id)),
      /* Zeitlose Eintraege bleiben stehen: Eine Sprache oder eine Regel der
         Welt hat oft kein Datum, und sie auszublenden waere eine Behauptung. */
      zeitlos: new Set([...z.zeitlos, ...z.unlesbar].map((d) => d.entry.id)),
      linien: new Set(z.relationen.map((r) => r.id)),
    };
  }, [jahr, datierte, relations]);

  /** Wie hell ein Stern in diesem Jahr steht. */
  const glanz = (id: string): number => {
    if (!sichtbar) return 1;
    if (sichtbar.sterne.has(id)) return 1;
    if (sichtbar.zeitlos.has(id)) return 0.5;
    return 0.08;
  };

  const close = () => navigate('/anhang');

  const sicht = rahmen
    ? `${-rahmen.breite / 2} ${-rahmen.hoehe / 2} ${rahmen.breite} ${rahmen.hoehe}`
    : '0 0 1 1';

  return (
    <div className="animate-bookOpen flex min-h-0 w-full flex-1 flex-col">
      <div
        className="relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-[2px]"
        style={{
          background:
            'radial-gradient(120% 100% at 50% 0%, #1c2436 0%, #131a28 45%, #0c1018 100%)',
          boxShadow: 'inset 0 0 120px rgba(0,0,0,0.7)',
        }}
      >
        {/* Faltkanten – die Karte lag lange zusammengelegt im Buchdeckel. */}
        <div aria-hidden className="pointer-events-none absolute inset-0 z-10">
          {[25, 50, 75].map((x) => (
            <span
              key={x}
              className="absolute top-0 h-full w-px"
              style={{
                left: `${x}%`,
                background:
                  'linear-gradient(180deg, transparent, rgba(255,255,255,0.055) 20%, rgba(255,255,255,0.055) 80%, transparent)',
              }}
            />
          ))}
          <span
            className="absolute left-0 top-1/2 h-px w-full"
            style={{
              background:
                'linear-gradient(90deg, transparent, rgba(255,255,255,0.05) 15%, rgba(255,255,255,0.05) 85%, transparent)',
            }}
          />
        </div>

        {/* Kopf */}
        <div className="relative z-20 flex items-start justify-between gap-4 px-6 pt-6 sm:px-9 sm:pt-8">
          <div>
            <p className="rubric text-gild-400/80">Anhang · Faltkarte</p>
            <h1 className="mt-1.5 font-serif text-[26px] leading-tight text-paper-100 sm:text-[32px]">
              Die Welt
            </h1>
            <p className="mt-1 font-serif text-[12.5px] italic text-paper-400/50">
              {sichtbar
                ? jetzigeEpoche
                  ? `${sichtbar.sterne.size} Sterne · ${jetzigeEpoche.entry.title}`
                  : `${sichtbar.sterne.size} Sterne im Jahr ${schreibeJahr(ausOrdnung(jahr!).jahr)}`
                : `${layout?.sterne.length ?? 0} Sterne · ${layout?.kanten.length ?? 0} Linien`}
            </p>
            {/*
              Wenn gekürzt wurde, steht es hier. Eine Karte, die schweigend
              vier Fünftel der Welt weglässt, ist eine zweite Wahrheit.
            */}
            {layout && layout.gezeigt < layout.gesamt && (
              <p className="mt-0.5 font-serif text-[12px] italic text-paper-400/40">
                die {layout.gezeigt} am stärksten verbundenen von {layout.gesamt} – im Register
                stehen alle
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={close}
            aria-label="Karte zusammenlegen"
            className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-gild-500/25 text-gild-400/70 transition-colors hover:border-gild-400/60 hover:text-gild-300 no-tap-highlight"
          >
            <X size={17} />
          </button>
        </div>

        {/*
          Der Himmel.

          Der Rahmen steht immer, auch wenn noch nichts darin ist – nur so
          lässt er sich messen, und ohne sein Mass wüsste weder die
          Anordnung noch die Brennweite, wie gross sie werden darf.
        */}
        <div ref={feldRef} className="relative z-10 min-h-0 w-full flex-1">
          {layout && rahmen ? (
            <svg
              viewBox={sicht}
              /*
                `outline-none` mit `focus-visible` daneben, nicht ohne.
                Das Feld ist mit der Tastatur bedienbar und braucht dafür eine
                sichtbare Marke – aber nur dann. Ohne die Unterscheidung legte
                sich beim ersten Wischen ein Rahmen um den ganzen Himmel und
                blieb dort stehen; das war am Gerät deutlich zu sehen.
              */
              className={cx(
                'h-full w-full touch-none outline-none',
                'focus-visible:outline focus-visible:outline-1 focus-visible:-outline-offset-2 focus-visible:outline-gild-400/50',
                zieht ? 'cursor-grabbing' : 'cursor-grab',
              )}
              preserveAspectRatio="xMidYMid slice"
              role="application"
              aria-label="Der Himmel dieser Welt. Wischen oder Pfeiltasten, um sich umzusehen."
              tabIndex={0}
              onPointerDown={aufsetzen}
              onPointerMove={bewegen}
              onPointerUp={absetzen}
              onPointerCancel={absetzen}
              onKeyDown={taste}
            >
              {/*
                Der gemalte Himmel.

                Er bedeutet nichts – nicht antippbar, ohne Namen, ohne
                Reaktion auf das Jahr. Wer auf dieser Seite einen Punkt
                antippen kann, tippt einen Eintrag an.
              */}
              {grund && (
                <g aria-hidden className="pointer-events-none">
                  {/* Das Band zuerst: Es liegt hinter allem Einzelnen. */}
                  {grund.band.map((lage, i) => (
                    <path key={`b${i}`} d={punktePfad(lage.punkte)} fill="#C6D2EA" opacity={lage.helle} />
                  ))}
                  {grund.sterne.map((lage, i) => (
                    <path key={`h${i}`} d={punktePfad(lage.punkte)} fill="#DCE4F5" opacity={lage.helle} />
                  ))}
                </g>
              )}

              {/*
                Die Verbindungen.

                Sehr zurückhaltend, und das ist der Punkt: Achtundsiebzig
                Linien in voller Stärke waren ein Netz, durch das man die
                Sterne nicht mehr sah. Sie ganz wegzulassen wäre die andere
                Möglichkeit gewesen – dann zeigt die Karte aber keinen
                Zusammenhang mehr, und genau dafür ist sie da. Also so
                schwach, dass man sie erst sieht, wenn man hinsieht, und in
                voller Stärke erst, wenn man einen Stern antippt.

                Lange Linien verblassen zusätzlich: Eine Verbindung zu einem
                Stern weit ausserhalb des Bildes durchquert das ganze Feld,
                ohne dass beide Enden zu sehen wären. Sie zeigt dann nichts
                mehr, sie streift nur.

                Gerade Strecken, und das ist nicht die bequeme Näherung,
                sondern genau richtig: Die Zentralprojektion bildet einen
                Grosskreis – und ein Grosskreisbogen *ist* die Verbindung
                zweier Sterne am Himmel – auf eine Gerade ab.
              */}
              <g className="pointer-events-none">
                {layout.kanten.map((kante) => {
                  const a = layout.amHimmel.get(kante.source);
                  const b = layout.amHimmel.get(kante.target);
                  if (!a || !b) return null;
                  const la = aufDenSchirm(a as Richtung, sichtachsen, f);
                  const lb = aufDenSchirm(b as Richtung, sichtachsen, f);
                  if (!la || !lb) return null;
                  const aktiv = selected && (kante.source === selected || kante.target === selected);
                  /* Eine Linie gilt im gewählten Jahr – oder sie verblasst. */
                  const zeitlich = !sichtbar || sichtbar.linien.has(kante.id) ? 1 : 0.06;
                  const deckung = aktiv
                    ? 0.85
                    : selected
                      ? 0
                      : LINIE_RUHT * verblassen(Math.hypot(lb.x - la.x, lb.y - la.y), diagonale);
                  if (deckung < 0.005) return null;
                  return (
                    <line
                      key={kante.id}
                      x1={la.x}
                      y1={la.y}
                      x2={lb.x}
                      y2={lb.y}
                      stroke={aktiv ? '#E3C878' : '#9FB0CE'}
                      strokeWidth={aktiv ? 1.5 : 0.7}
                      opacity={deckung * zeitlich}
                    />
                  );
                })}
              </g>

              {/* Die Sterne der Welt */}
              <g>
                {imBlick.map((stern) => {
                  const aktiv = selected === stern.id;
                  const matt =
                    selected && !aktiv && !relIndex.neighbours.get(selected)?.has(stern.id);
                  return (
                    <g
                      key={stern.id}
                      opacity={(matt ? 0.22 : 1) * glanz(stern.id)}
                      className="cursor-pointer"
                      onClick={() => {
                        /* Ein Wisch ist kein Antippen. */
                        if (gezogen.current) return;
                        setSelected(aktiv ? null : stern.id);
                      }}
                      onDoubleClick={() => navigate(`/eintrag/${stern.id}`)}
                    >
                      {/* Der Schein um helle Sterne */}
                      <circle
                        cx={stern.lage.x}
                        cy={stern.lage.y}
                        r={stern.r * 2.6}
                        fill="#D4AF37"
                        opacity={aktiv ? 0.22 : 0.09}
                      />
                      <circle
                        cx={stern.lage.x}
                        cy={stern.lage.y}
                        r={stern.r}
                        fill={aktiv ? '#F0DFA8' : '#E3C878'}
                      />
                    </g>
                  );
                })}
              </g>

              {/*
                Die Namen – in einer eigenen Lage über allen Sternen.

                Nicht jeder Stern trägt einen: Es bekommt ihn, wer am besten
                verbunden ist und wessen Name noch irgendwo hinpasst. So sind
                Sternkarten immer gesetzt worden – die hellen sind benannt,
                die schwachen nicht, und genau deshalb kann man sie lesen.
                Wer keinen trägt, sagt seinen beim Antippen.

                Beim Wischen treten sie zurück: Ihre Lagen gelten für den
                ruhenden Blick, und sie jedem Bildwechsel neu abzuwägen wäre
                zu viel Arbeit für eine flüssige Bewegung.
              */}
              <g
                className="pointer-events-none"
                opacity={zieht ? 0 : 1}
                style={{ transition: 'opacity 220ms ease' }}
              >
                {imBlick.map((stern) => {
                  const aktiv = selected === stern.id;
                  const nachbar = selected
                    ? relIndex.neighbours.get(selected)?.has(stern.id) === true
                    : false;
                  const gesetzt = namen.get(stern.id);
                  /* Angetippt sagt auch ein namenloser Stern, wie er heisst. */
                  const zug =
                    gesetzt ??
                    (aktiv || nachbar
                      ? {
                          x: stern.lage.x,
                          y: stern.lage.y + stern.r + SCHRIFT * 1.1,
                          anker: 'middle' as const,
                        }
                      : null);
                  if (!zug) return null;
                  const matt = selected && !aktiv && !nachbar;
                  return (
                    <text
                      key={stern.id}
                      x={zug.x}
                      y={zug.y}
                      textAnchor={zug.anker}
                      opacity={(matt ? 0.18 : 1) * glanz(stern.id)}
                      className="select-none"
                      style={{
                        fontFamily: "'Iowan Old Style', Georgia, serif",
                        fontSize: SCHRIFT,
                        fill: aktiv ? '#F5EACB' : '#C3CCDE',
                        letterSpacing: `${SPERRUNG}em`,
                        /* Dunkler Saum, damit Namen auch über Linien lesbar bleiben */
                        paintOrder: 'stroke',
                        stroke: '#0d1119',
                        strokeWidth: SCHRIFT * 0.32,
                        strokeLinejoin: 'round',
                      }}
                    >
                      {stern.label.length > 22 ? `${stern.label.slice(0, 21)}…` : stern.label}
                    </text>
                  );
                })}
              </g>
            </svg>
          ) : (
            <div className="grid h-full place-items-center px-8">
              {leer && (
                <p className="max-w-[36ch] text-center font-serif text-[15px] italic leading-relaxed text-paper-400/60">
                  Noch keine Sterne. Sobald die Welt Einträge und Verbindungen hat, zeichnet sich
                  hier ihre Ordnung.
                </p>
              )}
            </div>
          )}
        </div>

        {/*
          Die Zeit über der Karte.
          Erscheint nur, wenn es überhaupt etwas zu datieren gibt – sonst wäre
          es ein Regler ohne Wirkung.
        */}
        {spanneDerWelt && (
          <div className="relative z-20 flex items-center gap-3 px-6 pb-1 sm:px-9">
            <button
              type="button"
              onClick={() => setJahr(jahr === null ? spanneDerWelt.bis : null)}
              /*
                Der Wegweiser zeigt auf die Tuer, nicht auf den Raum dahinter:
                Der Regler erscheint erst nach diesem Klick, und auf etwas zu
                zeigen, das noch nicht da ist, kann der Leitfaden nicht.
              */
              data-leitfaden="karte-zeit"
              className="shrink-0 font-serif text-[12.5px] italic text-gild-400/75 transition-colors hover:text-gild-300 no-tap-highlight"
            >
              {jahr === null ? 'Ein Jahr wählen' : 'Alle Zeiten'}
            </button>
            {jahr !== null && (
              <input
                type="range"
                min={spanneDerWelt.von}
                max={spanneDerWelt.bis}
                step={Math.max(1, (spanneDerWelt.bis - spanneDerWelt.von) / 1500)}
                value={jahr}
                onChange={(e) => setJahr(Number(e.target.value))}
                aria-label="Jahr wählen"
                className="h-11 flex-1 cursor-pointer touch-none accent-gild-400"
              />
            )}
            {/*
              Steht ein Zeitalter im Kopf, gehoert die Jahreszahl trotzdem
              hierher – klein. Beides zusammen ist mehr als eines allein: Der
              Name sagt, *wann* man ist, die Zahl, *wie weit* man gezogen hat.
            */}
            {jahr !== null && jetzigeEpoche && (
              <span className="shrink-0 font-serif text-[11.5px] tabular-nums text-paper-400/45">
                {schreibeJahr(ausOrdnung(jahr).jahr)}
              </span>
            )}
          </div>
        )}

        {/*
          Legende und Hinweis.

          Die innere Lage hält zwei Zeilen frei, und zwar immer. Nicht
          Kosmetik: Der Hinweis bricht auf einem Telefon auf zwei Zeilen, die
          Angabe zum gewählten Stern braucht nur eine. Dadurch wuchs das
          Bildfeld beim Antippen um zehneinhalb Punkte, und das ganze
          Sternbild sprang leise um knapp zwei Prozent. Gemessen: Fuss 60 →
          49.5, Feld 622.25 → 632.75.

          Das Mass sitzt auf der *inneren* Lage, nicht auf der äusseren:
          `min-height` rechnet die Polsterung mit, und aussen angeschrieben
          war es wirkungslos, weil die Polsterung allein schon höher war.
        */}
        <div className="relative z-20 px-6 pb-6 sm:px-9 sm:pb-8">
          <div className="flex min-h-[36px] flex-wrap items-center gap-x-5 gap-y-2">
            {selected ? (
              <SelectedNote id={selected} onOpen={() => navigate(`/eintrag/${selected}`)} />
            ) : (
              /*
                Der Hinweis sagt nur, was auch geht. Bei einem einzigen Stern
                spannt die Welt keinen Winkel auf, der Blick ist auf der
                Stelle festgeklemmt – und dann wäre »Wischen, um sich
                umzusehen« eine Aufforderung ins Leere.
              */
              <p className="font-serif text-[12px] italic text-paper-400/45">
                {layout && layout.weite.waagerecht > 0.05 ? 'Wischen, um sich umzusehen. Einen' : 'Einen'}{' '}
                Stern antippen für seine Linien, zweimal für die Seite.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function SelectedNote({ id, onOpen }: { id: string; onOpen: () => void }) {
  const entry = useStudio((s) => s.entries.find((e) => e.id === id));
  if (!entry) return null;
  const tpl = templateFor(entry.type);
  const chapter = chapterOfType(entry.type);

  return (
    <div className="flex min-w-0 flex-wrap items-baseline gap-x-3 gap-y-1">
      <span className="rubric text-gild-400/70">{tpl.label}</span>
      <button
        type="button"
        onClick={onOpen}
        className={cx(
          'font-serif text-[17px] text-paper-100 underline decoration-gild-500/40 underline-offset-4',
          'transition-colors hover:text-gild-300 no-tap-highlight',
        )}
      >
        {entry.title}
      </button>
      <span className="font-serif text-[12.5px] italic text-paper-400/50">
        Kapitel {chapter.title}
      </span>
    </div>
  );
}
