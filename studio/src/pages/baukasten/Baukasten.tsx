/**
 * Der Charakterbaukasten – die Seite „Aussehen".
 *
 * Nach dem Entwurf gebaut: eine Leiste mit sechs Gruppen an der linken Kante,
 * das Bildnis in der Mitte, die Varianten als Spalte rechts, die Farben
 * darunter.
 *
 * ---
 *
 * **Die Varianten zeigen die eigene Figur, nicht ein Symbol.**
 *
 * Jede Kachel rechts ist ein vollständiges Bildnis – dasselbe wie in der
 * Mitte, nur mit *dieser einen* Schicht ausgetauscht. Man sieht die Frisur
 * also am eigenen Kopf, mit der eigenen Farbe, in der eigenen Ansicht, und
 * nicht als freigestelltes Bildchen.
 *
 * Das ist teurer als ein Vorschaubild und es ist den Preis wert: Bei einem
 * Baukasten ist die Frage nie „wie sieht dieses Teil aus", sondern „wie sieht
 * es *an ihr* aus". Ein Symbol beantwortet die erste Frage; nur der Vergleich
 * beantwortet die zweite.
 *
 * ---
 *
 * **Was diese Seite ohne eine einzige eigene Zeichnung kann.**
 *
 * Alles. Die eingebauten Silhouetten füllen Kopf und Körper, die Farben
 * stammen aus dem Buch, das Würfeln funktioniert, und die Zahl unten sagt,
 * was die nächste Zeichnung einbringt. Ein Baukasten, der erst mit
 * fünfhundert Zeichnungen etwas taugt, taugt am ersten Tag nichts – und dann
 * zeichnet niemand die fünfhundert.
 *
 * ---
 *
 * **Was diesen Baukasten von einem Ankleidespiel unterscheidet.**
 *
 * Ein Teil darf eine **Bedeutung** tragen: nicht „Narbe 3", sondern „von der
 * Seilerbahn, im dritten Winter". Was so beschriftet ist, steht danach bei
 * der Figur – das Bildnis erzählt dann etwas über die Person und ist nicht
 * bloss ihr Anstrich.
 */

import { useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Dices,
  PersonStanding,
  Plus,
  Scissors,
  Shirt,
  Smile,
  Sparkles,
  Sword,
  Trash2,
  X,
} from 'lucide-react';
import { useStudio } from '../../store/useStudio';
import { AppendixSheet } from '../book/Appendix';
import { Bildniswerk } from '../../components/baukasten/Bildniswerk';
import { useVorrat } from '../../components/baukasten/vorrat';
import { GRUPPEN, type Gruppe, type Gruppenzeichen } from '../../components/baukasten/gruppen';
import { importImageFiles } from '../../lib/images';
import {
  ANSICHTEN,
  KOPF_AUF_KOERPER,
  SCHICHTEN,
  WURF,
  ansichtVon,
  ansichtenVon,
  bedeutungen,
  hatEigeneZeichnung,
  kopflageVon,
  moeglichkeiten,
  nachSchichten,
  schichtVon,
  wuerfle,
  type Ansicht,
  type Bildbau,
  type Darstellung,
  type Kopflage,
  type Lage,
  type SchichtName,
  type Teil,
} from '../../lib/baukasten';
import { cx } from '../../lib/utils';

/**
 * Die Farben, die zur Auswahl stehen.
 *
 * Die des Buches und keine Regenbogenwahl. Ein freier Farbwähler erzeugt
 * Figuren, die neben der Seite stehen, auf der sie gedruckt werden – und die
 * Seite ist nun einmal aus Papier, Tinte und Gold.
 */
const PALETTE = [
  '#2B2622', '#6B5B44', '#A8853F', '#C8A24C', '#E3C878',
  '#7C4A3A', '#A65A3E', '#D08C5A', '#E8C9A0', '#F2E4CE',
  '#3E5545', '#5E7A5C', '#8FA37C', '#43536B', '#7B8CA6',
];

/** Die Zeichen der Gruppenleiste. */
const GRUPPENZEICHEN: Record<Gruppenzeichen, typeof PersonStanding> = {
  koerper: PersonStanding,
  gesicht: Smile,
  haare: Scissors,
  kleidung: Shirt,
  ausruestung: Sword,
  merkmale: Sparkles,
};

/** Eine Zahl aus einer Kennung – damit dieselbe Figur denselben Wurf bekommt. */
function saatAus(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h | 0;
}

export function Baukasten() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const entries = useStudio((s) => s.entries);
  const eigeneTeile = useStudio((s) => s.teile);
  const teilAnlegen = useStudio((s) => s.teilAnlegen);
  const teilAendern = useStudio((s) => s.teilAendern);
  const teilLoeschen = useStudio((s) => s.teilLoeschen);
  const updateEntry = useStudio((s) => s.updateEntry);
  const addImages = useStudio((s) => s.addImages);
  const notify = useStudio((s) => s.notify);

  const entry = entries.find((e) => e.id === id);
  const vorrat = useVorrat();

  const bau: Bildbau = entry?.bildbau ?? { lagen: {} };
  const ansicht = ansichtVon(bau);
  const kopf = kopflageVon(bau);
  const gefaecher = useMemo(() => nachSchichten(vorrat), [vorrat]);

  /* Welche Gruppe offen ist und welche Schicht darin – die zwei Ebenen links. */
  const [gruppe, setGruppe] = useState<Gruppe>(GRUPPEN[1]);
  const [schichtName, setSchichtName] = useState<SchichtName>('kopf');
  const schicht = schichtVon(schichtName) ?? SCHICHTEN[0];

  /*
   * Woran gerade gearbeitet wird.
   *
   * Am Gesicht arbeitet man im Kopffeld – dort ist es gross genug, um ein Auge
   * um eine Kleinigkeit zu verschieben. Die Ganzfigur zeigt, ob es zusammen
   * passt.
   */
  const [darstellung, setDarstellung] = useState<Darstellung>('ganzfigur');

  const istEigenes = (teilId: string) => eigeneTeile.some((t) => t.id === teilId);

  const setzeBau = (naechster: Bildbau) => {
    if (!entry) return;
    void updateEntry(entry.id, { bildbau: naechster });
  };

  const setzeLage = (fuer: SchichtName, patch: Partial<Lage>) => {
    const vorher = bau.lagen[fuer] ?? {};
    setzeBau({ ...bau, lagen: { ...bau.lagen, [fuer]: { ...vorher, ...patch } } });
  };

  const leereSchicht = (fuer: SchichtName) => {
    const lagen = { ...bau.lagen };
    delete lagen[fuer];
    setzeBau({ ...bau, lagen });
  };

  const setzeKopf = (patch: Partial<Kopflage>) => setzeBau({ ...bau, kopf: { ...kopf, ...patch } });

  /**
   * Eine Gruppe wählen – und darin die erste Schicht, die etwas anzubieten hat.
   *
   * Wer „Gesicht" antippt, will nicht auf einer leeren Ohrenschicht landen,
   * nur weil sie in der Liste zufällig vorn steht. Gibt es nirgends etwas,
   * bleibt es bei der ersten – dann ist die Gruppe eben noch leer, und das
   * soll man auch sehen.
   */
  const waehleGruppe = (g: Gruppe) => {
    setGruppe(g);
    const belegt = g.schichten.find((s) => (gefaecher.get(s)?.length ?? 0) > 0);
    setSchichtName(belegt ?? g.schichten[0]);
  };

  /* ------------------------------------------------------- Zeichnungen -- */

  const dateiRef = useRef<HTMLInputElement>(null);
  const [zielansicht, setZielansicht] = useState<Ansicht>('vorn');
  const [laedt, setLaedt] = useState(false);

  /**
   * Neue Teile anlegen – in die **gerade gewählte** Schicht.
   *
   * Vorher stand hier eine eigene Auswahlliste für die Zielschicht. Sie war
   * überflüssig und gefährlich zugleich: Man wählt links ohnehin schon eine
   * Schicht aus, und zwei Angaben für dieselbe Sache gehen irgendwann
   * auseinander – dann liegt die Zeichnung in einer anderen Schicht als der,
   * die man vor sich sieht.
   *
   * Die Ansicht bleibt eine eigene Angabe: Sie ist nicht dieselbe Sache. Eine
   * Zeichnung gilt für **eine** Richtung, und sie stillschweigend für alle
   * gelten zu lassen hiesse, in jeder Richtung dasselbe Gesicht zu zeigen.
   */
  const dateienNehmen = async (dateien: FileList | null) => {
    if (!dateien?.length) return;
    setLaedt(true);
    try {
      const { metas, errors } = await importImageFiles([...dateien]);
      addImages(metas);
      for (const meta of metas) {
        await teilAnlegen({
          schicht: schichtName,
          name: meta.title || 'Ohne Namen',
          ansichten: { [zielansicht]: { art: 'bild', bildId: meta.id } },
          /*
           * Neue Zeichnungen gelten zunächst als **nicht** tönbar. Eine bunte
           * Zeichnung einzufärben ergibt Matsch, und wer das einmal sieht,
           * hält den Baukasten für kaputt. Wer in einem Ton zeichnet, sagt es
           * mit einem Klick.
           */
          toenbar: false,
        });
      }
      for (const fehler of errors) notify(fehler, 'error');
      if (metas.length) {
        notify(
          `${metas.length} ${metas.length === 1 ? 'Zeichnung' : 'Zeichnungen'} in „${
            schicht.label
          }“ gelegt – ${ANSICHTEN.find((a) => a.name === zielansicht)?.label.toLowerCase()}.`,
          'success',
        );
      }
    } finally {
      setLaedt(false);
      if (dateiRef.current) dateiRef.current.value = '';
    }
  };

  /*
   * Eine Zeichnung an ein **vorhandenes** Teil hängen.
   *
   * Der zweite Weg herein, und der wichtigere: „Locken" von vorn und „Locken"
   * von der Seite sind nicht zwei Frisuren, sondern eine.
   */
  const nachtragRef = useRef<HTMLInputElement>(null);
  const [nachtrag, setNachtrag] = useState<{ teilId: string; ansicht: Ansicht } | null>(null);

  const zeichnungNachtragen = async (dateien: FileList | null) => {
    const ziel = nachtrag;
    if (!dateien?.length || !ziel) return;
    setLaedt(true);
    try {
      const { metas, errors } = await importImageFiles([dateien[0]]);
      addImages(metas);
      for (const fehler of errors) notify(fehler, 'error');
      const meta = metas[0];
      const teil = eigeneTeile.find((t) => t.id === ziel.teilId);
      if (!meta || !teil) return;
      await teilAendern(teil.id, {
        ansichten: { ...(teil.ansichten ?? {}), [ziel.ansicht]: { art: 'bild', bildId: meta.id } },
      });
      notify(
        `„${teil.name}“ hat jetzt eine Zeichnung ${ANSICHTEN.find(
          (a) => a.name === ziel.ansicht,
        )?.label.toLowerCase()}.`,
        'success',
      );
    } finally {
      setLaedt(false);
      setNachtrag(null);
      if (nachtragRef.current) nachtragRef.current.value = '';
    }
  };

  /* Die Tusche zu einer vorhandenen Fläche. */
  const linieRef = useRef<HTMLInputElement>(null);
  const [linienziel, setLinienziel] = useState<{ teilId: string; ansicht: Ansicht } | null>(null);

  const linieNachtragen = async (dateien: FileList | null) => {
    const ziel = linienziel;
    if (!dateien?.length || !ziel) return;
    setLaedt(true);
    try {
      const { metas, errors } = await importImageFiles([dateien[0]]);
      addImages(metas);
      for (const fehler of errors) notify(fehler, 'error');
      const meta = metas[0];
      const teil = eigeneTeile.find((t) => t.id === ziel.teilId);
      const vorhanden = teil?.ansichten?.[ziel.ansicht];
      if (!meta || !teil || vorhanden?.art !== 'bild') return;
      await teilAendern(teil.id, {
        ansichten: {
          ...(teil.ansichten ?? {}),
          [ziel.ansicht]: { ...vorhanden, linieId: meta.id },
        },
      });
      notify(`„${teil.name}“ hat jetzt eine Linie.`, 'success');
    } finally {
      setLaedt(false);
      setLinienziel(null);
      if (linieRef.current) linieRef.current.value = '';
    }
  };

  const linieAbnehmen = async (teilId: string, fuer: Ansicht) => {
    const teil = eigeneTeile.find((t) => t.id === teilId);
    const vorhanden = teil?.ansichten?.[fuer];
    if (!teil || vorhanden?.art !== 'bild') return;
    const { linieId: _weg, ...ohneLinie } = vorhanden;
    void _weg;
    await teilAendern(teil.id, { ansichten: { ...(teil.ansichten ?? {}), [fuer]: ohneLinie } });
  };

  const fuerAlleAnsichten = async (teilId: string, von: Ansicht) => {
    const teil = eigeneTeile.find((t) => t.id === teilId);
    const quelle = teil?.ansichten?.[von];
    if (!teil || !quelle) return;
    await teilAendern(teil.id, {
      ansichten: Object.fromEntries(ANSICHTEN.map((a) => [a.name, quelle])),
    });
    notify(`„${teil.name}“ gilt jetzt in jeder Ansicht.`, 'success');
  };

  /* ------------------------------------------------------------ Anzeige -- */

  if (!entry) {
    return (
      <AppendixSheet title="Der Baukasten" rubric="Anhang">
        <p className="prose-book">
          Diese Figur gibt es nicht.{' '}
          <button type="button" onClick={() => navigate('/register')} className="text-gold underline">
            Zum Register
          </button>
        </p>
      </AppendixSheet>
    );
  }

  const fach = gefaecher.get(schichtName) ?? [];
  const lage = bau.lagen[schichtName];
  const gewaehlt = fach.find((t) => t.id === lage?.teilId);
  const wege = moeglichkeiten(vorrat, ansicht);
  const wegeGesamt = moeglichkeiten(vorrat);
  const traegtBedeutung = bedeutungen(bau, vorrat);

  return (
    <AppendixSheet title={entry.title} rubric="Anhang · Aussehen">
      <p className="-mt-2 mb-6 font-serif text-[15px] italic text-ink-faint">
        Forme, was man sehen kann.
      </p>

      <div className="grid gap-6 lg:grid-cols-[92px_minmax(0,1fr)_minmax(0,320px)]">
        {/* ---------------------------------------------- Die Gruppen --- */}
        <nav
          aria-label="Gruppen"
          className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1 lg:mx-0 lg:flex-col lg:overflow-visible lg:px-0"
        >
          {GRUPPEN.map((g) => {
            const Zeichen = GRUPPENZEICHEN[g.id];
            const aktiv = gruppe.id === g.id;
            /* Wie viel in dieser Gruppe überhaupt zur Wahl steht. */
            const menge = g.schichten.reduce((n, s) => n + (gefaecher.get(s)?.length ?? 0), 0);
            return (
              <button
                key={g.id}
                type="button"
                title={g.hinweis}
                onClick={() => waehleGruppe(g)}
                aria-current={aktiv}
                className={cx(
                  'group flex shrink-0 flex-col items-center gap-1 rounded-[3px] border px-2 py-2.5 transition-colors no-tap-highlight lg:w-full',
                  aktiv
                    ? 'border-gild-500/60 bg-gild-400/10 text-gold'
                    : 'border-transparent text-ink-faint hover:text-gold',
                )}
              >
                <Zeichen size={20} strokeWidth={1.4} />
                <span className="text-center font-serif text-[10.5px] leading-tight">
                  {g.label}
                </span>
                <span className="font-serif text-[10px] italic text-ink-faint/60">
                  {menge === 0 ? '—' : menge}
                </span>
              </button>
            );
          })}
        </nav>

        {/* ---------------------------------------------- Das Bildnis --- */}
        <div className="lg:sticky lg:top-4 lg:self-start">
          {/*
            `text-ink-faint` ohne Durchsichtigkeit: Ungetönte Grundformen
            zeichnen mit `currentColor`, und zwei durchsichtige Silhouetten
            übereinander dunkeln sich an der Überlappung gegenseitig ab. Eine
            Silhouette ist eine Fläche und keine Folie.
          */}
          <div className="relative overflow-hidden rounded-[3px] border border-line bg-paper-200 text-ink-faint">
            <Bildniswerk bau={bau} vorrat={vorrat} darstellung={darstellung} className="w-full" />
          </div>

          <Umschalter
            wert={darstellung}
            werte={[
              ['ganzfigur', 'Ganze Figur'],
              ['kopf', 'Nur der Kopf'],
            ]}
            onWert={setDarstellung}
          />

          {/*
            Die Ansicht ändert nicht, *woraus* die Figur besteht, sondern *wie
            man sie ansieht*. Alle Schichten, Farben und Versätze bleiben
            stehen; gewechselt wird nur die Zeichnung, die jedes Teil für diese
            Richtung mitbringt.
          */}
          <Umschalter
            wert={ansicht}
            werte={ANSICHTEN.map((a) => [a.name, a.label] as const)}
            onWert={(a) => setzeBau({ ...bau, ansicht: a })}
          />

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() =>
                setzeBau(wuerfle(saatAus(entry.id + Date.now()), vorrat, PALETTE, WURF, ansicht))
              }
              className="inline-flex min-h-[38px] items-center gap-1.5 rounded-full border border-gild-500/40 px-4 font-serif text-[14px] text-gold transition-colors hover:bg-gild-400/10 no-tap-highlight"
            >
              <Dices size={15} /> Würfeln
            </button>
            <button
              type="button"
              onClick={() => setzeBau({ ansicht, kopf, lagen: {} })}
              className="min-h-[38px] font-serif text-[13px] italic text-ink-faint transition-colors hover:text-gold no-tap-highlight"
            >
              Alles ablegen
            </button>
          </div>

          {/*
            Wo der Kopf sitzt – die Naht zwischen den beiden Feldern und keine
            Eigenschaft einer Schicht. Wer daran zieht, bewegt Augen, Mund und
            Haar mit, denn sie hängen am Kopffeld.

            Nur bei der Ganzfigur zu sehen: Im Kopffeld allein hat die Naht
            keine Wirkung, und ein Regler ohne Wirkung ist ein Regler, der lügt.
          */}
          {darstellung === 'ganzfigur' && (
            <details className="mt-4 border-t border-line pt-3">
              <summary className="cursor-pointer list-none font-serif text-[13px] italic text-ink-faint transition-colors hover:text-gold no-tap-highlight">
                Wo der Kopf sitzt …
              </summary>
              <div className="mt-2 grid grid-cols-2 gap-3">
                <Schieber label="Grösse" wert={kopf.groesse} min={0.12} max={0.6} schritt={0.005}
                  onWert={(v) => setzeKopf({ groesse: v })} />
                <Schieber label="Neigung" wert={kopf.drehung} min={-15} max={15} schritt={0.5}
                  onWert={(v) => setzeKopf({ drehung: v })} />
                <Schieber label="Nach rechts" wert={kopf.versatzX} min={-25} max={25} schritt={0.5}
                  onWert={(v) => setzeKopf({ versatzX: v })} />
                <Schieber label="Nach unten" wert={kopf.versatzY} min={-75} max={-25} schritt={0.5}
                  onWert={(v) => setzeKopf({ versatzY: v })} />
              </div>
              <button
                type="button"
                onClick={() => setzeBau({ ...bau, kopf: { ...KOPF_AUF_KOERPER } })}
                className="mt-2 font-serif text-[12.5px] italic text-ink-faint transition-colors hover:text-gold no-tap-highlight"
              >
                Auf das übliche Mass zurück
              </button>
            </details>
          )}

          <p className="mt-4 font-serif text-[12.5px] italic text-ink-faint">
            {wegeGesamt === 0
              ? 'Noch keine Teile – lege rechts eine Zeichnung hinein.'
              : `${wegeGesamt.toLocaleString('de')} Bildnisse sind aus diesen Teilen zu bauen, ${wege.toLocaleString('de')} davon in dieser Ansicht.`}
          </p>

          {traegtBedeutung.length > 0 && (
            <div className="mt-4 border-t border-line pt-3">
              <p className="rubric text-gild-400/70">Was dieses Bildnis erzählt</p>
              <ul className="mt-2 space-y-1">
                {traegtBedeutung.map((b, i) => (
                  <li key={i} className="font-serif text-[13.5px] italic text-ink">
                    {b}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* --------------------------------------------- Die Varianten --- */}
        <div className="min-w-0">
          <p className="rubric text-gild-400/70">{gruppe.label}</p>
          <p className="mt-1 font-serif text-[12.5px] italic text-ink-faint">{gruppe.hinweis}</p>

          {/*
            Die Schichten der Gruppe.

            Bei einer einzigen Schicht wäre die Reihe eine Zeile, die nichts
            sagt – dann steht sie nicht da. Eine Auswahl mit genau einem Eintrag
            ist keine Auswahl.
          */}
          {gruppe.schichten.length > 1 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {gruppe.schichten.map((s) => {
                const sch = schichtVon(s);
                const belegt = !!bau.lagen[s]?.teilId;
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setSchichtName(s)}
                    className={cx(
                      'min-h-[30px] rounded-full border px-3 font-serif text-[12.5px] transition-colors no-tap-highlight',
                      schichtName === s
                        ? 'border-gild-500/60 bg-gild-400/10 text-gold'
                        : 'border-line text-ink-faint hover:text-gold',
                    )}
                  >
                    {sch?.label}
                    {belegt && <span className="text-gold"> ·</span>}
                  </button>
                );
              })}
            </div>
          )}

          <p className="mt-3 font-serif text-[12.5px] italic text-ink-faint">{schicht.hinweis}</p>

          {/*
            Die Kacheln zeigen das ganze Bildnis mit ausgetauschter Schicht –
            die Frisur am eigenen Kopf und nicht als freigestelltes Bildchen.
          */}
          <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-3">
            <Variantenkachel
              bau={{ ...bau, lagen: leerGemacht(bau, schichtName) }}
              vorrat={vorrat}
              feld={schicht.feld}
              aktiv={!lage?.teilId}
              label="nichts"
              onClick={() => leereSchicht(schichtName)}
            />
            {fach.map((teil) => (
              <Variantenkachel
                key={teil.id}
                bau={{
                  ...bau,
                  lagen: { ...bau.lagen, [schichtName]: { ...(lage ?? {}), teilId: teil.id } },
                }}
                vorrat={vorrat}
                feld={schicht.feld}
                aktiv={lage?.teilId === teil.id}
                label={teil.name}
                fehlt={!ansichtenVon(teil).includes(ansicht)}
                onClick={() => setzeLage(schichtName, { teilId: teil.id })}
              />
            ))}
          </div>

          {fach.length === 0 && (
            <p className="mt-2 font-serif text-[13px] italic text-ink-faint/70">
              Für „{schicht.label}“ gibt es noch keine Zeichnung.
            </p>
          )}

          {/* Die Farben – zur Lage, nicht zum Teil. */}
          {gewaehlt?.toenbar && (
            <div className="mt-4">
              <p className="rubric text-gild-400/70">Farbe</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => setzeLage(schichtName, { farbe: undefined })}
                  aria-label="Ohne Farbe"
                  className={cx(
                    'grid h-7 w-7 place-items-center rounded-full border',
                    lage?.farbe ? 'border-line' : 'border-gild-500/70',
                  )}
                >
                  <X size={12} className="text-ink-faint" />
                </button>
                {PALETTE.map((farbe) => (
                  <button
                    key={farbe}
                    type="button"
                    onClick={() => setzeLage(schichtName, { farbe })}
                    aria-label={farbe}
                    style={{ backgroundColor: farbe }}
                    className={cx(
                      'h-7 w-7 rounded-full border-2',
                      lage?.farbe === farbe ? 'border-gold' : 'border-transparent',
                    )}
                  />
                ))}
              </div>
            </div>
          )}

          {gewaehlt && (
            <Feinregler
              teil={gewaehlt}
              lage={lage ?? {}}
              ansicht={ansicht}
              eigenes={istEigenes(gewaehlt.id)}
              onLage={(patch) => setzeLage(schichtName, patch)}
              onToenbar={(wert) => void teilAendern(gewaehlt.id, { toenbar: wert })}
              onBedeutung={(text) => void teilAendern(gewaehlt.id, { bedeutung: text })}
              onZeichnung={(fuer) => {
                setNachtrag({ teilId: gewaehlt.id, ansicht: fuer });
                nachtragRef.current?.click();
              }}
              onUeberall={() => void fuerAlleAnsichten(gewaehlt.id, ansicht)}
              onLinie={() => {
                setLinienziel({ teilId: gewaehlt.id, ansicht });
                linieRef.current?.click();
              }}
              onLinieWeg={() => void linieAbnehmen(gewaehlt.id, ansicht)}
              onLoeschen={
                istEigenes(gewaehlt.id)
                  ? () => {
                      leereSchicht(schichtName);
                      void teilLoeschen(gewaehlt.id);
                    }
                  : undefined
              }
            />
          )}

          {/* --------------------------------------- Zeichnungen herein --- */}
          <div className="mt-6 border-t border-line pt-4">
            <p className="rubric text-gild-400/70">Zeichnung hinzufügen</p>
            <p className="mt-1.5 font-serif text-[12.5px] italic text-ink-faint">
              Kommt in „{schicht.label}“ – die Schicht, die links gewählt ist. Am besten mit
              durchsichtigem Grund und im selben quadratischen Ausschnitt wie alle anderen.
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <select
                value={zielansicht}
                onChange={(e) => setZielansicht(e.target.value as Ansicht)}
                aria-label="In welche Ansicht"
                className="input-base min-h-[36px] w-auto"
              >
                {ANSICHTEN.map((a) => (
                  <option key={a.name} value={a.name}>
                    {a.label}
                  </option>
                ))}
              </select>
              <button
                type="button"
                disabled={laedt}
                onClick={() => dateiRef.current?.click()}
                className="inline-flex min-h-[36px] items-center gap-1.5 rounded-full border border-gild-500/40 px-4 font-serif text-[13.5px] text-gold transition-colors hover:bg-gild-400/10 disabled:opacity-50 no-tap-highlight"
              >
                <Plus size={15} /> {laedt ? 'Wird gelegt …' : 'Wählen'}
              </button>
              <input ref={dateiRef} type="file" accept="image/*" multiple className="hidden"
                onChange={(e) => void dateienNehmen(e.target.files)} />
              <input ref={nachtragRef} type="file" accept="image/*" className="hidden"
                onChange={(e) => void zeichnungNachtragen(e.target.files)} />
              <input ref={linieRef} type="file" accept="image/*" className="hidden"
                onChange={(e) => void linieNachtragen(e.target.files)} />
            </div>
          </div>
        </div>
      </div>
    </AppendixSheet>
  );
}

/** Die Lagen ohne diese eine – für die Kachel „nichts". */
function leerGemacht(bau: Bildbau, ohne: SchichtName): Bildbau['lagen'] {
  const lagen = { ...bau.lagen };
  delete lagen[ohne];
  return lagen;
}

/* ------------------------------------------------------------- Bausteine -- */

/** Eine Reihe, aus der genau eines gilt. */
function Umschalter<T extends string>({
  wert,
  werte,
  onWert,
}: {
  wert: T;
  werte: readonly (readonly [T, string])[];
  onWert: (w: T) => void;
}) {
  return (
    <div className="mt-3 flex rounded-full border border-line p-0.5">
      {werte.map(([w, label]) => (
        <button
          key={w}
          type="button"
          onClick={() => onWert(w)}
          className={cx(
            'min-h-[34px] flex-1 rounded-full px-2 font-serif text-[13px] transition-colors no-tap-highlight',
            wert === w ? 'bg-gild-400/15 text-gold' : 'text-ink-faint hover:text-gold',
          )}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

/**
 * Eine Variante, gezeigt am eigenen Bildnis.
 *
 * `feld` entscheidet den Ausschnitt: Eine Frisur beurteilt man am Kopf, ein
 * Gewand an der ganzen Gestalt. Dieselbe Kachel für beides zu nehmen hiesse,
 * Frisuren in Briefmarkengrösse zu vergleichen.
 */
function Variantenkachel({
  bau,
  vorrat,
  feld,
  aktiv,
  label,
  fehlt = false,
  onClick,
}: {
  bau: Bildbau;
  vorrat: readonly Teil[];
  feld: 'kopf' | 'koerper';
  aktiv: boolean;
  label: string;
  /** Für diese Ansicht nicht gezeichnet – die Kachel bleibt, sagt es aber. */
  fehlt?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={fehlt ? `${label} – für diese Ansicht noch nicht gezeichnet` : label}
      className={cx(
        'group overflow-hidden rounded-[3px] border text-left transition-colors no-tap-highlight',
        aktiv ? 'border-gild-500/70 bg-gild-400/10' : 'border-line hover:border-gild-500/40',
        fehlt && 'border-dashed opacity-50',
      )}
    >
      <div className="bg-paper-200 text-ink-faint">
        {/*
          Die kleine Fassung – die Kachel ist neunzig Punkte breit.

          Nachgemessen: acht Kacheln mit je einem 1600er Bild holten 17 MB,
          wo 512 kB dasselbe zeigen. Sichtbar ist der Unterschied auf dieser
          Fläche nicht; spürbar war er, sobald ein Buch echte Bilder trug.
        */}
        <Bildniswerk
          bau={bau}
          vorrat={vorrat}
          darstellung={feld === 'kopf' ? 'kopf' : 'ganzfigur'}
          fassung="thumb"
          className="w-full"
        />
      </div>
      <span className="block truncate px-1.5 py-1 font-serif text-[10.5px] leading-tight text-ink-faint">
        {label}
      </span>
    </button>
  );
}

function Feinregler({
  teil,
  lage,
  ansicht,
  eigenes,
  onLage,
  onToenbar,
  onBedeutung,
  onZeichnung,
  onUeberall,
  onLinie,
  onLinieWeg,
  onLoeschen,
}: {
  teil: Teil;
  lage: Lage;
  ansicht: Ansicht;
  /** Eingebaute Grundformen lassen sich nicht ändern – nur eigene Teile. */
  eigenes: boolean;
  onLage: (patch: Partial<Lage>) => void;
  onToenbar: (wert: boolean) => void;
  onBedeutung: (text: string) => void;
  onZeichnung: (fuer: Ansicht) => void;
  onUeberall: () => void;
  onLinie: () => void;
  onLinieWeg: () => void;
  onLoeschen?: () => void;
}) {
  const vorhanden = ansichtenVon(teil);
  const eigen = hatEigeneZeichnung(teil, ansicht);
  const hier = teil.ansichten[ansicht];
  const hatLinie = hier?.art === 'bild' && !!hier.linieId;

  return (
    <details className="mt-4 border-t border-line pt-3" open>
      <summary className="cursor-pointer list-none rubric text-gild-400/70 no-tap-highlight">
        „{teil.name}“ einstellen
      </summary>

      <div className="mt-3 space-y-4 border-l-2 border-gild-500/25 pl-4">
        {/* Lage und Grösse – gelten für dieses Bildnis, nicht für das Teil. */}
        <div className="grid grid-cols-2 gap-3">
          <Schieber label="Nach rechts" wert={lage.versatzX ?? 0} min={-25} max={25} schritt={0.5}
            onWert={(v) => onLage({ versatzX: v })} />
          <Schieber label="Nach unten" wert={lage.versatzY ?? 0} min={-25} max={25} schritt={0.5}
            onWert={(v) => onLage({ versatzY: v })} />
          <Schieber label="Grösse" wert={lage.groesse ?? 1} min={0.6} max={1.6} schritt={0.01}
            onWert={(v) => onLage({ groesse: v })} />
          <label className="flex items-end gap-2 pb-1 font-serif text-[13px] text-ink">
            <input type="checkbox" checked={lage.spiegel === true}
              onChange={(e) => onLage({ spiegel: e.target.checked })} className="accent-gild-400" />
            Gespiegelt
          </label>
        </div>

        {/*
          Die Ansichten dieses Teils.

          Hier sieht man, was von dieser Sache schon gezeichnet ist – und
          schliesst die Lücke an Ort und Stelle, statt ein zweites Teil
          anzulegen.
        */}
        {eigenes && (
          <div>
            <p className="rubric text-gild-400/70">Ansichten dieses Teils</p>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {ANSICHTEN.map((a) => {
                const hatEigen = hatEigeneZeichnung(teil, a.name);
                const geerbt = !hatEigen && vorhanden.includes(a.name);
                return (
                  <button
                    key={a.name}
                    type="button"
                    onClick={() => onZeichnung(a.name)}
                    title={
                      hatEigen
                        ? `${a.label}: gezeichnet – ersetzen`
                        : geerbt
                          ? `${a.label}: von der Gegenseite gespiegelt – eigene Zeichnung wählen`
                          : `${a.label}: fehlt – Zeichnung wählen`
                    }
                    className={cx(
                      'min-h-[30px] rounded-full border px-3 font-serif text-[12.5px] transition-colors no-tap-highlight',
                      hatEigen
                        ? 'border-gild-500/50 text-gold'
                        : geerbt
                          ? 'border-line text-ink-faint'
                          : 'border-dashed border-line text-ink-faint/60',
                    )}
                  >
                    {a.label}
                    {hatEigen ? ' ·' : geerbt ? ' ↔' : ' +'}
                  </button>
                );
              })}
            </div>
            <p className="mt-1.5 font-serif text-[12px] italic text-ink-faint/80">
              ↔ heisst: von der anderen Seite gespiegelt. + heisst: fehlt noch.
            </p>
            {eigen && (
              <button type="button" onClick={onUeberall}
                className="mt-1.5 font-serif text-[12.5px] italic text-ink-faint transition-colors hover:text-gold no-tap-highlight">
                Diese Zeichnung für jede Ansicht gelten lassen
              </button>
            )}
          </div>
        )}

        {/*
          Linie und Fläche – der Unterschied zwischen Spielgrafik und Artbook.
          Ohne Tusche färbt die Farbe die ganze Zeichnung ein: Was hell ist,
          wird durchsichtig, und aus einer Frisur mit Schraffur wird ein Fleck.
        */}
        {eigenes && eigen && hier?.art === 'bild' && (
          <div>
            <p className="rubric text-gild-400/70">Tusche</p>
            <div className="mt-1.5 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={onLinie}
                className={cx(
                  'inline-flex min-h-[30px] items-center gap-1.5 rounded-full border px-3 font-serif text-[12.5px] transition-colors no-tap-highlight',
                  hatLinie ? 'border-gild-500/50 text-gold' : 'border-dashed border-line text-ink-faint',
                )}
              >
                {hatLinie ? 'Linie ersetzen' : 'Linie hinzufügen'}
              </button>
              {hatLinie && (
                <button type="button" onClick={onLinieWeg}
                  className="font-serif text-[12.5px] italic text-ink-faint transition-colors hover:text-gold no-tap-highlight">
                  Linie abnehmen
                </button>
              )}
            </div>
            <p className="mt-1.5 font-serif text-[12px] italic text-ink-faint/80">
              {hatLinie
                ? 'Die Fläche wird eingefärbt, die Tusche bleibt darüber stehen.'
                : 'Ohne Linie färbt die Farbe die ganze Zeichnung ein – gut für flache Teile, schlecht für schraffierte.'}
            </p>
          </div>
        )}

        {/*
          Das Häkchen gehört dem Teil, die Farbe der Lage. Bei einer
          eingebauten Grundform ist es nicht zu sehen: Sie ist immer tönbar,
          und ein Häkchen, das sich nicht abwählen lässt, wäre ein Schalter,
          der lügt.
        */}
        {eigenes && (
          <label className="flex items-center gap-2 font-serif text-[13px] text-ink">
            <input type="checkbox" checked={teil.toenbar === true}
              onChange={(e) => onToenbar(e.target.checked)} className="accent-gild-400" />
            In einem Ton gezeichnet – einfärbbar
          </label>
        )}

        {/*
          Die Bedeutung – der Unterschied zum Ankleidespiel. Sie gehört dem
          Teil und nicht dem Bildnis: Wer dieselbe Narbe zweimal verwendet, hat
          zweimal dieselbe Geschichte, und das ist richtig so.
        */}
        {eigenes && (
          <div>
            <label className="rubric text-gild-400/70">Was dieses Teil bedeutet</label>
            <input type="text" defaultValue={teil.bedeutung ?? ''}
              onBlur={(e) => onBedeutung(e.target.value)}
              placeholder="Von der Seilerbahn, im dritten Winter."
              className="input-base mt-1" />
          </div>
        )}

        {onLoeschen && (
          <button type="button" onClick={onLoeschen}
            className="inline-flex min-h-[34px] items-center gap-1.5 font-serif text-[12.5px] italic text-ink-faint transition-colors hover:text-red-700 no-tap-highlight">
            <Trash2 size={13} /> Aus dem Baukasten nehmen
          </button>
        )}
      </div>
    </details>
  );
}

function Schieber({
  label,
  wert,
  min,
  max,
  schritt,
  onWert,
}: {
  label: string;
  wert: number;
  min: number;
  max: number;
  schritt: number;
  onWert: (v: number) => void;
}) {
  return (
    <label className="block">
      <span className="rubric text-gild-400/70">{label}</span>
      <input
        type="range"
        min={min}
        max={max}
        step={schritt}
        value={wert}
        onChange={(e) => onWert(Number(e.target.value))}
        className="h-9 w-full cursor-pointer touch-none accent-gild-400"
      />
    </label>
  );
}
