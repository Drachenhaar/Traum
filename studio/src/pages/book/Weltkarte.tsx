/**
 * Die Weltkarte als Buchseite.
 *
 * Diese Datei hält alles, was nicht Geometrie ist: welche Karte offen liegt,
 * was gewählt ist, was rückgängig gemacht werden kann, und die eine Frage, die
 * eine Karte in Dragoncore erst zu einer Dragoncore-Karte macht –
 *
 *   *Gehört diese Fläche zu einer Seite im Buch?*
 *
 * Sie darf unbeantwortet bleiben. Eine namenlose Landschaft ist kein
 * unfertiger Zustand, sondern der übliche: Man malt eine Küste, weil man eine
 * Küste sieht, nicht weil man schon weiß, wie sie heißt. Nichts auf dieser
 * Seite mahnt deshalb, und nichts zählt, wie viele Flächen noch keinen Namen
 * haben.
 *
 * ---
 *
 * **Das Rückgängig.**
 *
 * Es liegt hier und nicht im Bauteil, weil es eine Frage der Bedeutung ist und
 * keine der Darstellung. Ein Schritt ist: eine Fläche entstand, eine Fläche
 * verschwand, eine Fläche bedeutet jetzt etwas anderes, eine Fläche gehört
 * jetzt zu einer Seite. Verschieben und Zoomen sind keine Schritte – wer die
 * Karte bewegt hat und „Zurück" drückt, will seinen letzten *Strich* zurück,
 * nicht seinen letzten Blick.
 */

import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Trash2 } from 'lucide-react';
import { AppendixSheet } from './Appendix';
import { useStudio, livingEntries } from '../../store/useStudio';
import { Weltkarte, Werkzeugleiste, type Werkzeug } from '../../components/karte/Weltkarte';
import { Relief } from '../../components/karte/Relief';
import { stilImBand } from '../../lib/karte/stil';
import { useBand } from '../../lib/raum/band';
import {
  BEDEUTUNGEN,
  neueKarte,
  type Bedeutung,
  type Kartendokument,
  type Kartenfeature,
  type Kartenmarke,
  type Staettenobjekt,
  type Gebirgskamm,
} from '../../lib/karte/modell';
import { SIEDLUNGEN, type Siedlung } from '../../lib/karte/siedlung';
import { BAUFORMEN, type Bauform } from '../../lib/kartenwerk/staettenwerk';
import { cx } from '../../lib/utils';

export function WeltkarteSheet() {
  return (
    <AppendixSheet title="Weltkarte" rubric="Anhang · Die Länder">
      <Karte />
    </AppendixSheet>
  );
}

/** Wie viele Schritte zurückgenommen werden können. */
const SCHRITTE = 24;

/**
 * Wie lange sich die Karte aufrichtet.
 *
 * **Dieselbe Zahl steht in `index.css` als `--dc-karte-ms`**, und sie muss es
 * auch: Hier wird gezählt, wann beide Ansichten wieder auseinandergehen
 * dürfen; dort wird gezeichnet. Läuft die Zählung zu früh ab, verschwindet
 * die abgehende Ansicht mitten in der Bewegung; läuft sie zu spät, steht eine
 * unsichtbare Fläche über der Karte und fängt Finger ab.
 *
 * Dieselbe Bindung wie `UEBERGANG_MS` im BookShell, aus demselben Grund.
 */
const KARTE_MS = 560;

/**
 * Ein Schritt im Rückgängig.
 *
 * **Flächen und Marken zusammen, nicht nur Flächen.**
 *
 * Hier stand `Kartenfeature[][]` – der Verlauf merkte sich die Flächen und
 * sonst nichts. Mit den Siedlungen wäre das still falsch geworden: Wer ein
 * Dorf setzt und „Zurücknehmen" drückt, bekäme sein Dorf nicht weg, und wer
 * danach eine Küste zurücknimmt, bekäme die Flächen von vorher und die
 * Marken von jetzt – zwei Zeitpunkte in einem Bild.
 *
 * Ein Schritt ist deshalb der ganze Zustand, den eine Handlung ändern kann.
 */
type Schritt = {
  features: Kartenfeature[];
  marken: Kartenmarke[];
  /*
   * Und die Gebirge dazu. Dieselbe Überlegung wie bei den Marken, und
   * derselbe stille Fehler, wenn sie fehlten: Wer einen Kamm zieht und
   * „Zurücknehmen" drückt, bekäme ihn nicht weg – und wer danach eine Küste
   * zurücknähme, bekäme Flächen von vorhin und Gebirge von jetzt.
   */
  kaemme: Gebirgskamm[];
  staetten: Staettenobjekt[];
};

function Karte() {
  const entries = useStudio((s) => s.entries);
  const karten = useStudio((s) => s.karten);
  const activeBookId = useStudio((s) => s.activeBookId);
  const speichereKarte = useStudio((s) => s.speichereKarte);

  /*
   * Die Karte entsteht erst beim Malen.
   *
   * Bis dahin liegt sie nur im Speicher. Eine leere Karte in die Datenbank zu
   * schreiben, weil jemand die Seite aufgeschlagen hat, hiesse zu behaupten,
   * dieses Buch habe eine Karte – und in jeder Sicherung stünde von da an ein
   * leeres Kartendokument, das niemand gewollt hat.
   */
  const [entwurf, setEntwurf] = useState<Kartendokument | null>(null);
  const karte = karten[0] ?? entwurf ?? neueKarte(activeBookId ?? '');

  const [werkzeug, setWerkzeug] = useState<Werkzeug>('land');
  /**
   * Flach oder erhoben.
   *
   * Nicht gespeichert, und das ist Absicht: Die Frage „wie sehe ich sie
   * gerade an" gehört zu diesem Augenblick, nicht zur Karte. Wer sie
   * speicherte, bekäme sein Zeichenwerkzeug beim nächsten Aufschlagen unter
   * einer Ansicht, in der man nicht zeichnen kann.
   */
  const [erhoben, setErhoben] = useState(false);
  /**
   * Was gerade in Bewegung ist.
   *
   * `'hebt'` – das Relief richtet sich aus der flachen Karte auf.
   * `'senkt'` – es legt sich wieder hin.
   *
   * Solange einer der beiden läuft, hängen **beide** Ansichten im Baum: Eine
   * Bewegung braucht ein Davor und ein Danach. Ohne diesen Zustand wurde die
   * eine im selben Bild ersetzt, in dem die andere erschien – gemessen als
   * „keine Bewegung", während jede Buchseite daneben eine hatte.
   */
  const [wandel, setWandel] = useState<'hebt' | 'senkt' | null>(null);
  /*
   * Und nach der Bewegung gehen die beiden wieder auseinander.
   *
   * Ohne dieses Aufräumen bliebe die abgehende Ansicht für immer im Baum
   * stehen – unsichtbar, aber vorhanden, und auf der flachen Karte hiesse das
   * eine unsichtbare Malfläche über dem Relief.
   */
  useEffect(() => {
    if (!wandel) return;
    const t = window.setTimeout(() => setWandel(null), KARTE_MS);
    return () => window.clearTimeout(t);
  }, [wandel]);

  const dunkel = useBand();
  const stil = stilImBand(karte?.styleId, dunkel);
  const [gewaehlt, setGewaehlt] = useState<string | undefined>();
  const [verlauf, setVerlauf] = useState<Schritt[]>([]);

  const lebende = useMemo(() => livingEntries(entries), [entries]);

  /**
   * Dieselben Seiten, nur andersherum sortiert: erst die ohne Ort.
   *
   * Die schon auf der Karte liegen, verschwinden nicht – sie rutschen nach
   * unten. Eine Seite zweimal zu setzen ist erlaubt (ein Reich hat mehrere
   * Inseln), es ist nur selten gemeint.
   */
  const geordnet = useMemo(() => {
    /*
     * „Liegt schon auf der Karte" heisst: als Fläche **oder** als Siedlung.
     *
     * Beides ist ein Ort. Zählte nur die Fläche, stünde eine Seite, deren
     * Dorf längst steht, weiter oben unter „hat noch keinen Ort" – und die
     * Reihenfolge behauptete etwas Falsches über das Buch.
     */
    const belegt = new Set(
      [
        ...karte.features.map((f) => f.entryId),
        ...(karte.marken ?? []).map((m) => m.entryId),
        ...(karte.staetten ?? []).map((s) => s.entryId),
      ].filter((id): id is string => !!id),
    );
    const ohne = lebende.filter((e) => !belegt.has(e.id));
    const mit = lebende.filter((e) => belegt.has(e.id));
    return [...ohne, ...mit];
  }, [lebende, karte.features, karte.marken, karte.staetten]);
  /*
   * Die Namen kommen aus dem Buch, nicht aus der Karte.
   *
   * Deshalb reicht der Karte eine Zuordnung von Kennung auf Titel. Wer eine
   * Seite umbenennt, hat damit die Karte umbenannt – ohne dass irgendwo etwas
   * abgeglichen werden müsste, weil es nur eine Wahrheit gibt.
   */
  const namen = useMemo(
    () => new Map(lebende.map((e) => [e.id, e.title])),
    [lebende],
  );

  /** Jede bedeutungstragende Änderung geht hier durch – und nur hier. */
  const aendere = (naechste: Kartendokument) => {
    setVerlauf((v) => [
      ...v.slice(-(SCHRITTE - 1)),
      { features: karte.features, marken: karte.marken ?? [], kaemme: karte.kaemme ?? [], staetten: karte.staetten ?? [] },
    ]);
    setEntwurf(naechste);
    void speichereKarte(naechste);
  };

  const zurueck = () => {
    const vorher = verlauf[verlauf.length - 1];
    if (!vorher) return;
    setVerlauf((v) => v.slice(0, -1));
    const naechste = {
      ...karte,
      features: vorher.features,
      marken: vorher.marken,
      kaemme: vorher.kaemme,
      staetten: vorher.staetten,
    };
    setEntwurf(naechste);
    setGewaehlt(undefined);
    void speichereKarte(naechste);
  };

  const flaeche = karte.features.find((f) => f.id === gewaehlt);

  const setzeArt = (art: Bedeutung) => {
    if (!flaeche) return;
    aendere({
      ...karte,
      features: karte.features.map((f) => (f.id === flaeche.id ? { ...f, art } : f)),
    });
  };

  const setzeEintrag = (entryId: string) => {
    if (!flaeche) return;
    aendere({
      ...karte,
      features: karte.features.map((f) =>
        f.id === flaeche.id ? { ...f, entryId: entryId || undefined } : f,
      ),
    });
  };

  const loesche = () => {
    if (!flaeche) return;
    aendere({ ...karte, features: karte.features.filter((f) => f.id !== flaeche.id) });
    setGewaehlt(undefined);
  };

  /*
   * Und dasselbe nochmal für die Siedlungen.
   *
   * **Warum nicht ein gemeinsames Bedienfeld.** Der Gedanke lag nahe: Beides
   * hat eine Art, eine Seite und ein „entfernen". Er ist falsch, weil die
   * *Arten* nicht zusammengehören. „Land, Wasser, Wald, Hütte, Dorf, Burg" in
   * einer Reihe liest sich wie sechs gleichwertige Wahlmöglichkeiten – und
   * dann tippt jemand auf seiner Küste „Burg" und sie verschwindet. Eine
   * Fläche kann keine Burg werden; sie hat einen Umriss, keinen Ort.
   *
   * Zwei Bedienfelder, von denen immer nur eines dasteht, sagen die Wahrheit:
   * Was gewählt ist, bestimmt, was man damit tun kann.
   */
  const marke = (karte.marken ?? []).find((m) => m.id === gewaehlt);
  const staette = (karte.staetten ?? []).find((s) => s.id === gewaehlt);
  const setzeStaette = (teil: Partial<Staettenobjekt>) => {
    if (!staette) return;
    aendere({ ...karte, staetten: (karte.staetten ?? []).map((s) =>
      s.id === staette.id ? { ...s, ...teil } : s) });
  };
  const loescheStaette = () => {
    if (!staette) return;
    aendere({ ...karte, staetten: (karte.staetten ?? []).filter((s) => s.id !== staette.id) });
    setGewaehlt(undefined);
  };

  /*
   * Und ein drittes Bedienfeld, aus demselben Grund wie das zweite.
   *
   * Ein Gebirge hat keine Bedeutung zum Umschalten – es *ist* ein Gebirge.
   * Es hat stattdessen drei Zahlen, und die sind der eigentliche Grund für
   * ein eigenes Feld: Was gewählt ist, bestimmt, was man damit tun kann.
   */
  const kamm = (karte.kaemme ?? []).find((g) => g.id === gewaehlt);

  const mitKaemmen = (naechste: Gebirgskamm[]) => aendere({ ...karte, kaemme: naechste });

  const setzeKamm = (teil: Partial<Gebirgskamm>) => {
    if (!kamm) return;
    mitKaemmen((karte.kaemme ?? []).map((g) => (g.id === kamm.id ? { ...g, ...teil } : g)));
  };

  const loescheKamm = () => {
    if (!kamm) return;
    mitKaemmen((karte.kaemme ?? []).filter((g) => g.id !== kamm.id));
    setGewaehlt(undefined);
  };

  const mitMarken = (naechste: Kartenmarke[]) =>
    aendere({ ...karte, marken: naechste });

  const setzeMarkenArt = (art: Siedlung) => {
    if (!marke) return;
    mitMarken((karte.marken ?? []).map((m) => (m.id === marke.id ? { ...m, art } : m)));
  };

  const setzeMarkenEintrag = (entryId: string) => {
    if (!marke) return;
    mitMarken(
      (karte.marken ?? []).map((m) =>
        m.id === marke.id ? { ...m, entryId: entryId || undefined } : m,
      ),
    );
  };

  const loescheMarke = () => {
    if (!marke) return;
    mitMarken((karte.marken ?? []).filter((m) => m.id !== marke.id));
    setGewaehlt(undefined);
  };

  return (
    <div className="mx-auto max-w-2xl">
      <p className="mb-4 text-sm text-ink-muted">
        Male grob, was wo ist. Land, Wasser, Wald – mehr Bedeutungen gibt es noch nicht, und
        mehr braucht eine Küste nicht, um eine zu sein. Zwei Wörter formen um, was schon
        dasteht: Die <em>Bucht</em> frisst sich ins Land, die <em>Landzunge</em> wächst aus
        der Küste hinaus – beide genau dort, wo du sie ziehst. Und <em>Hütte</em>,{' '}
        <em>Dorf</em> und <em>Burg</em> werden nicht gemalt, sondern getippt: Sie stehen
        genau da, wo du hintippst, und nirgends sonst. Ein <em>Haus</em>, <em>Turm</em>
        oder eine <em>Brücke</em> ist dagegen ein einzelnes Bauwerk: Zum Verschieben
        „Ansehen“ wählen und das Bauwerk mit dem Finger ziehen.
      </p>

      {/*
        Beide Ansichten übereinander – aber nur, solange sich etwas bewegt.

        Die Bedingungen fragen **nicht** nach dem Zielzustand, sondern nach
        „bin ich gerade da oder gehe ich gerade". Der erste Anlauf hatte sie
        vertauscht: `!erhoben || wandel === 'senkt'` für die flache Karte. Beim
        Aufrichten ist `erhoben` aber schon `true` und `wandel` ist `'hebt'` –
        also war die flache Karte im selben Bild ausgehängt, in dem das Relief
        erschien. Die halbe Bewegung fehlte, und im Bild sah es beinahe richtig
        aus; gefunden wurde es daran, dass `getAnimations()` `dcKarteLegtSich`
        nie meldete.

        Siehe `Blickwechsel` weiter unten und `.karte-hebt` im Stilblatt.
      */}
      <div className="relative">
        {(!erhoben || wandel === 'hebt') && (
          <div
            className={cx(
              wandel === 'hebt' && 'karte-legt-sich',
              wandel === 'senkt' && 'karte-kehrt-zurueck',
              /*
               * Die abgehende Ansicht wird aus dem Fluss genommen, damit sie
               * die Höhe nicht mehr bestimmt – die ankommende tut das. Beide
               * Rahmen sind quadratisch, also steht der Kasten dabei still.
               */
              wandel === 'hebt' && 'absolute inset-0',
            )}
          >
            <Weltkarte
              karte={karte}
              onChange={aendere}
              werkzeug={werkzeug}
              gewaehlt={gewaehlt}
              onWaehle={setGewaehlt}
              namen={namen}
              kannZurueck={verlauf.length > 0}
              onZurueck={zurueck}
            />
          </div>
        )}
        {(erhoben || wandel === 'senkt') && (
          <div
            className={cx(
              wandel === 'hebt' && 'karte-hebt',
              wandel === 'senkt' && 'karte-senkt-sich',
              wandel === 'senkt' && 'absolute inset-0',
            )}
          >
            <Relief karte={karte} stil={stil} namen={namen} />
          </div>
        )}
      </div>

      {/*
        Der Schalter steht **über** der Werkzeugleiste und nicht darin.

        In der Leiste wäre er ein Werkzeug unter Werkzeugen – aber er malt
        nicht, er ändert nichts, er wechselt die Ansicht. Ein Knopf, der neben
        „Land", „Wasser" und „Wald" steht und etwas völlig anderes tut, wird
        genau einmal aus Versehen gedrückt.
      */}
      <Blickwechsel
        erhoben={erhoben}
        onWechsel={(an) => {
          if (an === erhoben) return;
          setWandel(an ? 'hebt' : 'senkt');
          setErhoben(an);
          /*
           * Beim Erheben die Auswahl fallen lassen.
           *
           * Sonst blieb die Karte „Diese Fläche" unter dem Relief stehen –
           * mit Bedeutung, Seitenzuordnung und „Fläche entfernen", während
           * oben nichts hervorgehoben war und man auch nichts wählen konnte.
           * Ein Bedienfeld über einer Auswahl, die man nicht sieht, ist eine
           * Falle: Der nächste Tipp auf „entfernen" trifft etwas, von dem man
           * nicht weiss, was es ist.
           */
          if (an) setGewaehlt(undefined);
        }}
      />

      {/*
        Gemalt wird nur flach.

        Auf einer isometrischen Ansicht zu zeichnen hiesse, den Finger in einer
        Ebene zu führen und den Strich in einer anderen entstehen zu sehen. Die
        Leiste verschwindet deshalb, statt wirkungslos dazustehen – ein
        Werkzeug, das nichts tut, ist schlimmer als keines.
      */}
      {!erhoben && (
        <Werkzeugleiste
          werkzeug={werkzeug}
          onWerkzeug={(w) => {
            setWerkzeug(w);
            if (w !== 'waehlen') setGewaehlt(undefined);
          }}
        />
      )}

      {flaeche && (
        <section className="card mt-4 p-4">
          <h2 className="font-serif text-lg">Diese Fläche</h2>

          <div className="mt-3 flex flex-wrap gap-2">
            {BEDEUTUNGEN.map((b) => (
              <button
                key={b.id}
                type="button"
                onClick={() => setzeArt(b.id)}
                aria-pressed={flaeche.art === b.id}
                className={cx(
                  'touch-target rounded-full border px-4 text-sm',
                  flaeche.art === b.id
                    ? 'border-brass-500 bg-brass-500 text-paper-50'
                    : 'border-line bg-cream-50 text-ink-muted',
                )}
              >
                {b.name}
              </button>
            ))}
          </div>

          <label className="mt-4 block text-sm text-ink-muted" htmlFor="karte-eintrag">
            Gehört zu einer Seite
          </label>
          <select
            id="karte-eintrag"
            className="input-base mt-1 w-full"
            value={flaeche.entryId ?? ''}
            onChange={(e) => setzeEintrag(e.target.value)}
          >
            <option value="">— namenlos —</option>
            {/*
              * Wer noch keinen Ort hat, steht oben.
              *
              * **Gesetzt wird trotzdem nichts von selbst.** Eine Karte, die
              * sich aus dem Buch füllt, erfindet Geografie – fünfzig Seiten
              * landeten irgendwo, und „irgendwo" ist eine Behauptung über
              * die Welt, die niemand aufgestellt hat (Gesetz 4). Jede Fläche
              * bekommt ihre Seite durch eine Wahl.
              *
              * Geändert ist nur die **Reihenfolge**, nicht die Auswahl – wie
              * bei den Registerblättern. Wer gerade eine Küste gemalt hat,
              * sucht mit hoher Wahrscheinlichkeit eine Seite, die noch
              * nirgends liegt; die steht jetzt vorn statt irgendwo zwischen
              * neunzig anderen.
              *
              * Und es mahnt nicht: Kein Zähler, kein Hinweis, keine Trennung
              * in „fehlt" und „erledigt". Nur zuerst, was näher liegt.
              */}
            {geordnet.map((e) => (
              <option key={e.id} value={e.id}>
                {e.title}
              </option>
            ))}
          </select>
          {/*
            Kein Hinweis, keine Mahnung, kein Zähler.

            „Namenlos" steht als gleichwertige Wahl in der Liste und nicht als
            Leerzustand darüber – eine Landschaft ohne Namen ist nichts, was
            noch fehlt.
          */}
          {flaeche.entryId && (
            <p className="mt-2 text-sm">
              <Link className="text-brass-600 underline" to={`/eintrag/${flaeche.entryId}`}>
                {namen.get(flaeche.entryId) ?? 'Zur Seite'}
              </Link>
            </p>
          )}

          <button
            type="button"
            onClick={loesche}
            className="touch-target mt-4 flex items-center gap-2 text-sm text-ink-muted"
          >
            <Trash2 size={16} aria-hidden />
            Fläche entfernen
          </button>
        </section>
      )}

      {kamm && (
        <section className="card mt-4 p-4">
          <h2 className="font-serif text-lg">Dieses Gebirge</h2>
          {/*
            * Drei Regler und kein Formular.
            *
            * Die Zahlen dahinter – 8 bis 320 Karteneinheiten, 0 bis 1 – sagen
            * niemandem etwas, und sie stünden auch nirgends richtig: Wie breit
            * „breit" ist, hängt davon ab, wie gross die Karte daneben ist. Ein
            * Regler beantwortet die einzige Frage, die hier zählt, nämlich
            * „mehr oder weniger als jetzt", und er beantwortet sie, während
            * man zusieht.
            */}
          {(
            [
              ['breite', 'Breite', 8, 320, 2],
              ['hoehe', 'Höhe', 0.05, 1, 0.01],
              ['zerkluftung', 'Zerklüftung', 0, 1, 0.01],
            ] as const
          ).map(([feld, name, min, max, schritt]) => (
            <label key={feld} className="mt-3 block text-sm text-ink-muted">
              {name}
              <input
                type="range"
                className="mt-1 w-full"
                min={min}
                max={max}
                step={schritt}
                value={kamm[feld]}
                onChange={(e) => setzeKamm({ [feld]: Number(e.target.value) })}
              />
            </label>
          ))}

          <label className="mt-4 block text-sm text-ink-muted" htmlFor="karte-kamm-eintrag">
            Gehört zu einer Seite
          </label>
          <select
            id="karte-kamm-eintrag"
            className="input-base mt-1 w-full"
            value={kamm.entryId ?? ''}
            onChange={(e) => setzeKamm({ entryId: e.target.value || undefined })}
          >
            <option value="">— namenlos —</option>
            {geordnet.map((e) => (
              <option key={e.id} value={e.id}>
                {e.title}
              </option>
            ))}
          </select>
          {kamm.entryId && (
            <p className="mt-2 text-sm">
              <Link className="text-brass-600 underline" to={`/eintrag/${kamm.entryId}`}>
                {namen.get(kamm.entryId) ?? 'Zur Seite'}
              </Link>
            </p>
          )}

          <button
            type="button"
            onClick={loescheKamm}
            className="touch-target mt-4 flex items-center gap-2 text-sm text-ink-muted"
          >
            <Trash2 size={16} aria-hidden />
            Gebirge entfernen
          </button>
        </section>
      )}

      {staette && (
        <section className="card mt-4 p-4">
          <h2 className="font-serif text-lg">Dieses Bauwerk</h2>
          <p className="mt-1 text-sm text-ink-muted">Mit „Ansehen“ lässt es sich auf der Karte verschieben.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {BAUFORMEN.map((b) => (
              <button
                key={b.id} type="button"
                onClick={() => setzeStaette({ bauform: b.id as Bauform })}
                aria-pressed={staette.bauform === b.id}
                className={cx('touch-target rounded-full border px-4 text-sm',
                  staette.bauform === b.id
                    ? 'border-brass-500 bg-brass-500 text-paper-50'
                    : 'border-line bg-cream-50 text-ink-muted')}
              >{b.name}</button>
            ))}
          </div>
          <label htmlFor="karte-staette-eintrag" className="mt-4 block text-sm text-ink-muted">
            Gehört zu einer Seite
          </label>
          <select id="karte-staette-eintrag" className="input-base mt-1 w-full"
            value={staette.entryId ?? ''}
            onChange={(e) => setzeStaette({ entryId: e.target.value || undefined })}>
            <option value="">— namenlos —</option>
            {geordnet.map((e) => <option key={e.id} value={e.id}>{e.title}</option>)}
          </select>
          {staette.entryId && (
            <p className="mt-2 text-sm">
              <Link className="text-brass-600 underline" to={`/eintrag/${staette.entryId}`}>
                {namen.get(staette.entryId) ?? 'Zur Seite'}
              </Link>
            </p>
          )}
          <button type="button" onClick={loescheStaette}
            className="touch-target mt-4 flex items-center gap-2 text-sm text-ink-muted">
            <Trash2 size={16} aria-hidden />Bauwerk entfernen
          </button>
        </section>
      )}

      {marke && (
        <section className="card mt-4 p-4">
          <h2 className="font-serif text-lg">Diese Siedlung</h2>

          <div className="mt-3 flex flex-wrap gap-2">
            {SIEDLUNGEN.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setzeMarkenArt(s.id)}
                aria-pressed={marke.art === s.id}
                className={cx(
                  'touch-target rounded-full border px-4 text-sm',
                  marke.art === s.id
                    ? 'border-brass-500 bg-brass-500 text-paper-50'
                    : 'border-line bg-cream-50 text-ink-muted',
                )}
              >
                {s.name}
              </button>
            ))}
          </div>

          <label className="mt-4 block text-sm text-ink-muted" htmlFor="karte-marke-eintrag">
            Gehört zu einer Seite
          </label>
          <select
            id="karte-marke-eintrag"
            className="input-base mt-1 w-full"
            value={marke.entryId ?? ''}
            onChange={(e) => setzeMarkenEintrag(e.target.value)}
          >
            <option value="">— namenlos —</option>
            {geordnet.map((e) => (
              <option key={e.id} value={e.id}>
                {e.title}
              </option>
            ))}
          </select>
          {marke.entryId && (
            <p className="mt-2 text-sm">
              <Link className="text-brass-600 underline" to={`/eintrag/${marke.entryId}`}>
                {namen.get(marke.entryId) ?? 'Zur Seite'}
              </Link>
            </p>
          )}

          <button
            type="button"
            onClick={loescheMarke}
            className="touch-target mt-4 flex items-center gap-2 text-sm text-ink-muted"
          >
            <Trash2 size={16} aria-hidden />
            Siedlung entfernen
          </button>
        </section>
      )}
    </div>
  );
}

/* ------------------------------------------------------- Der Blickwechsel -- */

/**
 * Flach oder erhoben.
 *
 * Zwei Wörter, eine Linie darunter – dieselbe Bauart wie die Schrittfolge der
 * Setzerei. Kein Schieberegler und kein Augensymbol: Ein Schieberegler
 * verspricht ein Dazwischen, das es nicht gibt, und ein Auge sagt „ansehen",
 * wo „so sehe ich sie gerade" gemeint ist.
 *
 * Und beide Wörter stehen immer da, auch das gerade gültige. Ein Knopf, der
 * nur das *andere* zeigt, zwingt zum Nachdenken darüber, ob er den Zustand
 * nennt oder das Ziel – die häufigste Art, einen Schalter unlesbar zu machen.
 */
function Blickwechsel({
  erhoben,
  onWechsel,
}: {
  erhoben: boolean;
  onWechsel: (an: boolean) => void;
}) {
  return (
    <div className="mt-3 flex items-center justify-center gap-1">
      {[
        { an: false, wort: 'Flach' },
        { an: true, wort: 'Erhoben' },
      ].map(({ an, wort }) => (
        <button
          key={wort}
          type="button"
          onClick={() => onWechsel(an)}
          aria-pressed={erhoben === an}
          data-blick={an ? 'erhoben' : 'flach'}
          className={cx(
            'min-h-[40px] border-b px-4 font-serif text-[14.5px] transition-colors no-tap-highlight',
            erhoben === an
              ? 'border-gild-500/70 text-gold'
              : 'border-transparent text-ink-faint hover:text-ink-muted',
          )}
        >
          {wort}
        </button>
      ))}
    </div>
  );
}
