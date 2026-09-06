/**
 * Die Faltkarte.
 *
 * Der Weltgraph, aber nicht mehr als Werkzeug: als Sternkarte, die hinten im
 * Buch eingeklebt ist. Man klappt sie auf, sieht die Ordnung der Welt, und
 * klappt sie wieder zu.
 *
 * Entscheidend ist, was hier *nicht* passiert: nichts wackelt. Die Anordnung
 * wird einmal berechnet und dann eingefroren. Ein Sternbild bewegt sich nicht,
 * während man es betrachtet.
 */

import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X } from 'lucide-react';
import { useStudio, livingEntries } from '../../store/useStudio';
import { GraphSimulation } from '../../lib/graph';
import {
  aufKuppel,
  milchstrasse,
  nachHelligkeit,
  punktePfad,
  OEFFNUNG,
  saatAus,
  sternenhimmel,
} from '../../lib/himmel';
import {
  einpassen,
  kartenbild,
  FALTKARTE,
  SPERRUNG,
  type Rahmen,
  type Stern,
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
 * Wie gross die Namen auf dem Schirm stehen, in Punkten.
 *
 * Vorher hing die Zahl an der Breite des Ausschnitts und war auf sieben bis
 * fünfzehn Karteneinheiten gedeckelt. Auf einem Telefon ergab das jedes Mal
 * ungefähr vier Punkte – nachgerechnet 4.16 für eine Welt aus fünfzig
 * Sternen und 3.61 für eine aus vierhundert. Der Text stand da, richtig
 * gesetzt, und war nicht zu lesen.
 */
const SCHRIFT_PUNKTE = 11.5;

/**
 * In welchen Schritten die Form des Rahmens überhaupt zählt.
 *
 * Der Lageplan hängt am Seitenverhältnis des Bildfeldes – aber jede
 * Handbreite Grössenänderung eine Simulation über vierhundert Schritte neu
 * zu rechnen wäre unsinnig. Auf ein Zwanzigstel gerundet bleibt die Karte
 * beim Drehen des Geräts stehen und richtet sich nur dann neu, wenn sich
 * wirklich die Form geändert hat.
 */
const FORM_STUFE = 20;

/**
 * Wie viele namenlose Sterne hinter den benannten stehen.
 *
 * Weniger als dreihundert und der Himmel wirkt gesprenkelt statt tief;
 * deutlich mehr kostet nur noch Rechenzeit, weil die schwächsten auf einem
 * Telefon ohnehin in einem halben Bildpunkt verschwinden.
 */
const HIMMELSSTERNE = 420;

/** Und wie viele davon im Band stehen. */
const BANDSTERNE = 520;

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
   * Beides hängt daran: die Form, in die sich die Sterne setzen sollen, und
   * die Schriftgrösse, damit die Namen auf dem Schirm lesbar ankommen. Ohne
   * die wirkliche Grösse ist beides Rechnen ins Blaue.
   */
  const feldRef = useRef<HTMLDivElement>(null);
  const [rahmen, setRahmen] = useState<Rahmen | null>(null);

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
     * Rahmen gesetzt, den es nie gab: Die Schrift stand sieben Prozent zu
     * gross, und der Ausschnitt hatte die falsche Form.
     *
     * Ganze Punkte statt Bruchteile ist dabei kein Verlust: Ein Achtel
     * Punkt ändert weder die Form noch die Schriftgrösse sichtbar, aber es
     * würde jedes Mal eine neue Rechnung anwerfen.
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
   * Die Form, in die eingepasst wird – gestuft, damit nicht jeder Pixel
   * eine neue Simulation auslöst.
   */
  const form = rahmen
    ? Math.round((rahmen.hoehe / rahmen.breite) * FORM_STUFE) / FORM_STUFE
    : null;

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
    const sichtbar = new Set(living.map((e) => e.id));

    /*
     * Weit auseinander: ein Sternbild braucht Schwarz zwischen den Sternen.
     * Und in der Form des Blattes, nicht rund – `streckung` gibt der Spirale
     * schon die richtige Gestalt, `einpassen` misst sie hinterher nach.
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
        .filter((r) => sichtbar.has(r.fromId) && sichtbar.has(r.toId))
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
     * Und dann auf die Kuppel.
     *
     * Erst setzen lassen, dann wölben – nicht umgekehrt. Die Simulation
     * rechnet mit Abständen; auf einer gewölbten Fläche wären das nicht mehr
     * die Abstände, die sie meint. Die Wölbung ist eine Projektion, die
     * ganz zum Schluss kommt, so wie ein Kartograf sein Netz zuletzt wählt.
     */
    const { lagen, horizont } = aufKuppel(sim.nodes);
    sim.nodes.forEach((n, i) => {
      n.x = lagen[i].x;
      n.y = lagen[i].y;
    });

    return {
      nodes: sim.nodes,
      edges: sim.edges,
      horizont,
      byId: new Map(sim.nodes.map((n) => [n.id, n])),
      /* Für das Setzen der Namen: hell heisst hier »gut verbunden«. */
      sterne: sim.nodes.map(
        (n): Stern => ({
          id: n.id,
          x: n.x,
          y: n.y,
          r: n.r,
          label: n.label,
          rang: relIndex.neighbours.get(n.id)?.size ?? 0,
        }),
      ),
      /* Jede Welt bekommt ihren eigenen Himmel – und zwar immer denselben. */
      saat: saatAus(living[0]?.bookId ?? 'himmel'),
      /* Wurde gekuerzt? Dann muss es dastehen. */
      gezeigt: living.length,
      gesamt: alleLebenden.length,
    };
  }, [entries, relations, relIndex, form]);


  /*
   * Ausschnitt, Schriftgrösse und die Namen, die wirklich Platz haben.
   *
   * Eigene Rechnung, weil sie an der genauen Grösse des Bildfeldes hängt –
   * und die ändert sich beim Drehen des Geräts, ohne dass sich der Lageplan
   * ändern müsste. Sie kostet Millisekunden statt Hunderter.
   */
  const bild = useMemo(
    () =>
      layout && rahmen
        ? kartenbild(layout.sterne, rahmen, {
            schriftPunkte: SCHRIFT_PUNKTE,
            laenge: 22,
            luft: 0.14,
            /* Der Horizont gehört mit ins Bild, sonst wird er angeschnitten. */
            umschliesst: {
              l: layout.horizont.mx - layout.horizont.ax,
              o: layout.horizont.my - layout.horizont.ay,
              r: layout.horizont.mx + layout.horizont.ax,
              u: layout.horizont.my + layout.horizont.ay,
            },
            /* Und kein Name steht ausserhalb davon. */
            rund: layout.horizont,
          })
        : null,
    [layout, rahmen],
  );

  /*
   * Der Himmel hinter den Sternen.
   *
   * Er hängt nur an der Kuppel, nicht an der Zeit und nicht an der Auswahl –
   * gerechnet wird er deshalb genau einmal je Anordnung.
   */
  const himmel = useMemo(() => {
    if (!layout || !bild) return null;
    const h = layout.horizont;
    /*
     * Wie viele Karteneinheiten ein Bildschirmpunkt misst.
     *
     * Ohne dieses Mass waren die Hintergrundsterne beim ersten Versuch
     * unsichtbar: Ihre Radien standen in Karteneinheiten, und eine
     * Karteneinheit ist auf einem Telefon etwa ein Drittel Punkt. Es
     * standen also Sterne von einem drittel Bildpunkt Durchmesser da, bei
     * halber Deckkraft. Alles richtig gerechnet, nichts zu sehen.
     */
    const einheit = bild.groesse / SCHRIFT_PUNKTE;
    return {
      sterne: nachHelligkeit(sternenhimmel(layout.saat, HIMMELSSTERNE, h, OEFFNUNG, einheit), 4),
      band: nachHelligkeit(milchstrasse(layout.saat, BANDSTERNE, h, OEFFNUNG, einheit), 3),
    };
  }, [layout, bild]);

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
  const zeitalter = useMemo(
    () => epochen(weltsicht(entries, relations)),
    [entries, relations],
  );
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
                : `${layout?.nodes.length ?? 0} Sterne · ${layout?.edges.length ?? 0} Linien`}
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
          Die Karte.

          Der Rahmen steht immer, auch wenn noch nichts darin ist – nur so
          lässt er sich messen, und ohne sein Mass wüsste weder die Anordnung
          noch die Schrift, wie gross sie werden darf.
        */}
        <div ref={feldRef} className="relative z-10 min-h-0 w-full flex-1">
          {layout && bild ? (
          <svg
            viewBox={bild.view}
            className="h-full w-full"
            preserveAspectRatio="xMidYMid meet"
          >
            {/*
              Die Kuppel und der Himmel darin.

              Alles hier bedeutet nichts: Es ist gemalt, nicht gemessen. Es
              ist deshalb `aria-hidden`, nicht antippbar und trägt keine
              Namen. Wer auf dieser Seite einen Punkt antippen kann, tippt
              einen Eintrag an – ohne Ausnahme.
            */}
            {himmel && (
              <g aria-hidden className="pointer-events-none">
                <defs>
                  <radialGradient id="dc-kuppel">
                    <stop offset="0%" stopColor="#26314a" />
                    <stop offset="55%" stopColor="#171f31" />
                    <stop offset="100%" stopColor="#090c14" />
                  </radialGradient>
                </defs>
                <ellipse
                  cx={layout.horizont.mx}
                  cy={layout.horizont.my}
                  rx={layout.horizont.ax}
                  ry={layout.horizont.ay}
                  fill="url(#dc-kuppel)"
                />
                {/* Das Band zuerst: Es liegt hinter allem, was einzeln zu sehen ist. */}
                {himmel.band.map((lage, i) => (
                  <path
                    key={`b${i}`}
                    d={punktePfad(lage.punkte)}
                    fill="#C6D2EA"
                    opacity={lage.helle}
                  />
                ))}
                {himmel.sterne.map((lage, i) => (
                  <path
                    key={`h${i}`}
                    d={punktePfad(lage.punkte)}
                    fill="#DCE4F5"
                    opacity={lage.helle}
                  />
                ))}
                {/* Der Horizont – die einzige Linie, die die Kuppel selbst zeichnet. */}
                <ellipse
                  cx={layout.horizont.mx}
                  cy={layout.horizont.my}
                  rx={layout.horizont.ax}
                  ry={layout.horizont.ay}
                  fill="none"
                  stroke="#D4AF37"
                  strokeOpacity={0.2}
                  strokeWidth={1}
                  vectorEffect="non-scaling-stroke"
                />
              </g>
            )}

            {/* Linien zuerst – sie liegen hinter den Sternen */}
            <g>
              {layout.edges.map((edge) => {
                const a = layout.byId.get(edge.source);
                const b = layout.byId.get(edge.target);
                if (!a || !b) return null;
                const active =
                  selected && (edge.source === selected || edge.target === selected);
                /* Eine Linie gilt im gewählten Jahr – oder sie verblasst. */
                const zeitlich = !sichtbar || sichtbar.linien.has(edge.id) ? 1 : 0.06;
                return (
                  <line
                    key={edge.id}
                    x1={a.x}
                    y1={a.y}
                    x2={b.x}
                    y2={b.y}
                    stroke={active ? '#E3C878' : '#9FB0CE'}
                    strokeWidth={active ? 1.6 : 0.9}
                    opacity={(selected ? (active ? 0.9 : 0.1) : 0.42) * zeitlich}
                    style={{ transition: 'opacity 320ms ease' }}
                  />
                );
              })}
            </g>

            {/* Sterne */}
            <g>
              {layout.nodes.map((node) => {
                const active = selected === node.id;
                const dimmed =
                  selected && !active && !relIndex.neighbours.get(selected)?.has(node.id);
                return (
                  <g
                    key={node.id}
                    opacity={(dimmed ? 0.22 : 1) * glanz(node.id)}
                    style={{ transition: 'opacity 320ms ease' }}
                    className="cursor-pointer transition-opacity duration-500"
                    onClick={() => setSelected(active ? null : node.id)}
                    onDoubleClick={() => navigate(`/eintrag/${node.id}`)}
                  >
                    {/* Der Schein um helle Sterne */}
                    <circle
                      cx={node.x}
                      cy={node.y}
                      r={node.r * 2.6}
                      fill="#D4AF37"
                      opacity={active ? 0.22 : 0.09}
                    />
                    <circle
                      cx={node.x}
                      cy={node.y}
                      r={node.r}
                      fill={active ? '#F0DFA8' : '#E3C878'}
                    />
                  </g>
                );
              })}
            </g>

            {/*
              Die Namen – in einer eigenen Lage über allen Sternen.

              Zwei Dinge stehen dahinter. Erstens trägt nicht jeder Stern
              einen Namen: Es bekommt ihn, wer am besten verbunden ist und
              wessen Name noch irgendwo hinpasst. So sind Sternkarten immer
              gesetzt worden – die hellen sind benannt, die schwachen nicht,
              und genau deshalb kann man sie lesen. Wer keinen trägt, sagt
              seinen beim Antippen.

              Zweitens liegt die Lage über allen Sternen und nicht bei
              jedem einzelnen. Sonst deckte die Scheibe des nächsten Sterns
              den Namen des vorigen zu.
            */}
            <g>
              {layout.nodes.map((node) => {
                const active = selected === node.id;
                const nachbar = selected
                  ? relIndex.neighbours.get(selected)?.has(node.id) === true
                  : false;
                const gesetzt = bild.namen.get(node.id);
                /* Angetippt sagt auch ein namenloser Stern, wie er heisst. */
                const zug =
                  gesetzt ??
                  (active || nachbar
                    ? {
                        x: node.x,
                        y: node.y + node.r + bild.groesse * 1.1,
                        anker: 'middle' as const,
                      }
                    : null);
                if (!zug) return null;
                const dimmed = selected && !active && !nachbar;
                return (
                  <text
                    key={node.id}
                    x={zug.x}
                    y={zug.y}
                    textAnchor={zug.anker}
                    opacity={(dimmed ? 0.18 : 1) * glanz(node.id)}
                    className="pointer-events-none select-none"
                    style={{
                      fontFamily: "'Iowan Old Style', Georgia, serif",
                      fontSize: bild.groesse,
                      fill: active ? '#F5EACB' : '#C3CCDE',
                      letterSpacing: `${SPERRUNG}em`,
                      /* Dunkler Saum, damit Namen auch über Linien lesbar bleiben */
                      paintOrder: 'stroke',
                      stroke: '#0d1119',
                      strokeWidth: bild.groesse * 0.32,
                      strokeLinejoin: 'round',
                      transition: 'opacity 320ms ease',
                    }}
                  >
                    {node.label.length > 22 ? `${node.label.slice(0, 21)}…` : node.label}
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
          Legende: die Kapitel als Himmelsregionen.

          Die innere Lage hält zwei Zeilen frei, und zwar immer.

          Nicht Kosmetik: Der Hinweis »Einen Stern antippen …« bricht auf
          einem Telefon auf zwei Zeilen, die Angabe zum gewählten Stern
          braucht nur eine. Dadurch wuchs das Bildfeld beim Antippen um
          zehneinhalb Punkte, die Karte rechnete ihren Ausschnitt neu, und
          das ganze Sternbild sprang leise um knapp zwei Prozent. Gemessen:
          Fuss 60 → 49.5, Feld 622.25 → 632.75. Oben in dieser Datei steht,
          dass sich ein Sternbild nicht bewegt, während man es betrachtet –
          dann darf auch der Fuss darunter seine Höhe nicht ändern.

          Das Mass sitzt auf der *inneren* Lage, nicht auf der äusseren.
          `min-height` rechnet die Polsterung mit: Aussen angeschrieben war
          es wirkungslos, weil die Polsterung allein schon höher war als das
          Mass. Nachgemessen: derselbe Sprung wie vorher.
        */}
        <div className="relative z-20 px-6 pb-6 sm:px-9 sm:pb-8">
          <div className="flex min-h-[36px] flex-wrap items-center gap-x-5 gap-y-2">
            {selected ? (
              <SelectedNote id={selected} onOpen={() => navigate(`/eintrag/${selected}`)} />
            ) : (
              <p className="font-serif text-[12px] italic text-paper-400/45">
                Einen Stern antippen, um seine Linien zu sehen. Zweimal, um die Seite aufzuschlagen.
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
