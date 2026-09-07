/**
 * Der Charakterbaukasten.
 *
 * Ein eigener Raum, kein Buchblatt: Man betritt ihn, baut ein Bildnis, und
 * es schlägt sich danach auf der Figurenseite auf.
 *
 * ---
 *
 * **Die Anforderung, an der so etwas sonst scheitert.**
 *
 * Ein Baukasten, der erst mit fünfhundert Zeichnungen etwas taugt, taugt am
 * ersten Tag nichts – und dann zeichnet niemand die fünfhundert. Diese Seite
 * ist deshalb so gebaut, dass sie **ohne eine einzige eigene Zeichnung**
 * benutzbar ist und mit jeder besser wird:
 *
 * - Eingebaute Grundformen füllen die wichtigsten Schichten. Sie sind
 *   Silhouetten und geben sich auch als solche zu erkennen.
 * - Jede Schicht hat Farbe, Spiegelung, Versatz und Grösse. Aus wenigen
 *   Zeichnungen werden dadurch sehr viele Gesichter – die Zahl steht unten
 *   auf der Seite, damit man sieht, was die nächste Zeichnung einbringt.
 * - Zeichnungen kommen über dieselbe Ablage herein wie alle Bilder des
 *   Buches und werden einer Schicht zugewiesen.
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
import { Dices, Plus, Trash2, X } from 'lucide-react';
import { useStudio } from '../../store/useStudio';
import { AppendixSheet } from '../book/Appendix';
import { Bildniswerk } from '../../components/baukasten/Bildniswerk';
import { Grundformbild } from '../../components/baukasten/Grundformen';
import { useVorrat } from '../../components/baukasten/vorrat';
import { importImageFiles } from '../../lib/images';
import {
  ANSICHTEN,
  KOPF_AUF_KOERPER,
  SCHICHTEN,
  ansichtVon,
  kopflageVon,
  ansichtenVon,
  hatEigeneZeichnung,
  moeglichkeiten,
  nachSchichten,
  wuerfle,
  bedeutungen,
  zeichnungFuer,
  LEERER_BAU,
  WURF,
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
  const teilAnlegen = useStudio((s) => s.teilAnlegen);
  const teilAendern = useStudio((s) => s.teilAendern);
  const teilLoeschen = useStudio((s) => s.teilLoeschen);
  const updateEntry = useStudio((s) => s.updateEntry);
  const addImages = useStudio((s) => s.addImages);
  const notify = useStudio((s) => s.notify);

  const entry = entries.find((e) => e.id === id);

  /* Die eigenen Zeichnungen und die eingebauten Grundformen – siehe `vorrat.ts`. */
  const vorrat = useVorrat();
  const eigeneTeile = useStudio((s) => s.teile);

  const bau: Bildbau = entry?.bildbau ?? LEERER_BAU;
  const ansicht = ansichtVon(bau);
  const kopf = kopflageVon(bau);
  const gefaecher = useMemo(() => nachSchichten(vorrat), [vorrat]);
  const [offeneSchicht, setOffeneSchicht] = useState<SchichtName | null>('kopf');

  /*
   * Woran gerade gearbeitet wird.
   *
   * Am Gesicht arbeitet man im Kopffeld – dort ist es gross genug, um ein Auge
   * um eine Kleinigkeit zu verschieben. Die Ganzfigur zeigt, ob es zusammen
   * passt. Beides ist dasselbe Bildnis, nur anders angesehen; deshalb ist es
   * ein Umschalter der Ansicht und keine Angabe am Bildbau.
   */
  const [darstellung, setDarstellung] = useState<Darstellung>('ganzfigur');

  const setzeKopf = (patch: Partial<Kopflage>) => setzeBau({ ...bau, kopf: { ...kopf, ...patch } });

  /** Ob ein Teil aus der Ablage kommt – nur solche lassen sich ändern und löschen. */
  const istEigenes = (teilId: string) => eigeneTeile.some((t) => t.id === teilId);

  const setzeBau = (naechster: Bildbau) => {
    if (!entry) return;
    void updateEntry(entry.id, { bildbau: naechster });
  };

  const setzeLage = (schicht: SchichtName, patch: Partial<Lage>) => {
    const vorher = bau.lagen[schicht] ?? {};
    setzeBau({ lagen: { ...bau.lagen, [schicht]: { ...vorher, ...patch } } });
  };

  const leereSchicht = (schicht: SchichtName) => {
    const lagen = { ...bau.lagen };
    delete lagen[schicht];
    setzeBau({ lagen });
  };

  /* ------------------------------------------------------- Zeichnungen -- */

  const dateiRef = useRef<HTMLInputElement>(null);
  const [zielschicht, setZielschicht] = useState<SchichtName>('kopf');
  const [zielansicht, setZielansicht] = useState<Ansicht>('vorn');
  const [laedt, setLaedt] = useState(false);

  /**
   * Neue Teile anlegen.
   *
   * Die Zeichnung gilt für **eine** Ansicht – die gewählte. Sie stillschweigend
   * für alle gelten zu lassen wäre bequem und falsch: Eine Vorderansicht ist
   * keine Seitenansicht, und ein Baukasten, der das behauptet, zeigt in jeder
   * Richtung dasselbe Gesicht. Genau das soll er ja nicht.
   */
  const dateienNehmen = async (dateien: FileList | null) => {
    if (!dateien?.length) return;
    setLaedt(true);
    try {
      const { metas, errors } = await importImageFiles([...dateien]);
      addImages(metas);
      for (const meta of metas) {
        await teilAnlegen({
          schicht: zielschicht,
          name: meta.title || 'Ohne Namen',
          ansichten: { [zielansicht]: { art: 'bild', bildId: meta.id } },
          /*
           * Neue Zeichnungen gelten zunächst als **nicht** tönbar.
           *
           * Andersherum wäre es die schlechtere Vorgabe: Eine bunte
           * Zeichnung einzufärben ergibt Matsch, und wer das einmal sieht,
           * hält den Baukasten für kaputt. Wer in einem Ton zeichnet, sagt
           * es mit einem Klick.
           */
          toenbar: false,
        });
      }
      for (const fehler of errors) notify(fehler, 'error');
      if (metas.length) {
        notify(
          `${metas.length} ${metas.length === 1 ? 'Zeichnung' : 'Zeichnungen'} in „${
            SCHICHTEN.find((s) => s.name === zielschicht)?.label
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
   * von der Seite sind nicht zwei Frisuren, sondern eine. Gäbe es nur den
   * Weg oben, entstünden zwei Teile, und beim Ansichtswechsel müsste man jede
   * Schicht neu wählen – dieselbe Figur wäre in zwei Ansichten zwei Figuren.
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
      if (!meta) return;
      const teil = eigeneTeile.find((t) => t.id === ziel.teilId);
      if (!teil) return;
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

  /*
   * Die Linie zu einer vorhandenen Fläche legen.
   *
   * Sie hängt an *dieser* Ansicht, nicht am Teil: Ein Kopf von vorn und
   * derselbe Kopf von der Seite haben verschiedene Tusche. Die Fläche muss
   * schon da sein – eine Linie ohne Fläche wäre eine Zeichnung, die sich
   * nicht einfärben lässt, und dafür braucht es die Trennung gar nicht.
   */
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
      if (!meta) return;
      const teil = eigeneTeile.find((t) => t.id === ziel.teilId);
      const vorhanden = teil?.ansichten?.[ziel.ansicht];
      if (!teil || vorhanden?.art !== 'bild') return;
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

  /** Die Linie wieder abnehmen – dann färbt die Maske wieder alles. */
  const linieAbnehmen = async (teilId: string, fuer: Ansicht) => {
    const teil = eigeneTeile.find((t) => t.id === teilId);
    const vorhanden = teil?.ansichten?.[fuer];
    if (!teil || vorhanden?.art !== 'bild') return;
    const { linieId: _weg, ...ohneLinie } = vorhanden;
    void _weg;
    await teilAendern(teil.id, {
      ansichten: { ...(teil.ansichten ?? {}), [fuer]: ohneLinie },
    });
  };

  /** Dieselbe Zeichnung in allen Ansichten gelten lassen – für Grund und Beiwerk. */
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

  const wege = moeglichkeiten(vorrat, ansicht);
  const wegeGesamt = moeglichkeiten(vorrat);
  const traegtBedeutung = bedeutungen(bau, vorrat);

  return (
    <AppendixSheet title={entry.title} rubric="Anhang · Der Baukasten">
      <div className="grid gap-8 lg:grid-cols-[minmax(0,320px)_minmax(0,1fr)]">
        {/* Das Bildnis */}
        <div className="lg:sticky lg:top-4 lg:self-start">
          {/*
            `text-ink-faint` ohne Durchsichtigkeit.

            Vorher stand hier `/25`, und ungetönte Grundformen zeichnen mit
            `currentColor`: Zwei Silhouetten übereinander dunkelten sich an der
            Überlappung gegenseitig ab, und aus Kopf und Schultern wurde ein
            Fleck mit einem Rand mitten im Gesicht. Eine Silhouette ist eine
            Fläche und keine Folie.
          */}
          <div className="relative overflow-hidden rounded-[3px] border border-line bg-paper-200 text-ink-faint">
            <Bildniswerk bau={bau} vorrat={vorrat} darstellung={darstellung} className="w-full" />
          </div>

          {/*
            Ganzfigur oder Kopf.

            Kein Bearbeitungsmodus, sondern ein Blick: Dieselben Daten, einmal
            zusammengesetzt und einmal das Kopffeld allein. Am Gesicht arbeitet
            man im Kopffeld, weil ein Auge dort gross genug ist, um es um eine
            Kleinigkeit zu verschieben – in der Ganzfigur wäre es zwanzig
            Punkte breit.
          */}
          <div className="mt-3 flex rounded-full border border-line p-0.5">
            {(
              [
                ['ganzfigur', 'Ganze Figur'],
                ['kopf', 'Nur der Kopf'],
              ] as const
            ).map(([wert, label]) => (
              <button
                key={wert}
                type="button"
                onClick={() => setDarstellung(wert)}
                className={cx(
                  'min-h-[34px] flex-1 rounded-full px-2 font-serif text-[13px] transition-colors no-tap-highlight',
                  darstellung === wert ? 'bg-gild-400/15 text-gold' : 'text-ink-faint hover:text-gold',
                )}
              >
                {label}
              </button>
            ))}
          </div>

          {/*
            Die Ansicht.

            Sie steht direkt unter dem Bildnis und nicht bei den Schichten:
            Sie ändert nicht *woraus* die Figur besteht, sondern *wie man sie
            ansieht. Alle Schichten, Farben und Versätze bleiben stehen –
            gewechselt wird nur die Zeichnung, die jedes Teil für diese
            Richtung mitbringt.
          */}
          <div className="mt-3 flex rounded-full border border-line p-0.5">
            {ANSICHTEN.map((a) => (
              <button
                key={a.name}
                type="button"
                title={a.hinweis}
                onClick={() => setzeBau({ ...bau, ansicht: a.name })}
                className={cx(
                  'min-h-[34px] flex-1 rounded-full px-2 font-serif text-[13px] transition-colors no-tap-highlight',
                  ansicht === a.name
                    ? 'bg-gild-400/15 text-gold'
                    : 'text-ink-faint hover:text-gold',
                )}
              >
                {a.label}
              </button>
            ))}
          </div>

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
              onClick={() => setzeBau({ ansicht, lagen: {} })}
              className="min-h-[38px] font-serif text-[13px] italic text-ink-faint transition-colors hover:text-gold no-tap-highlight"
            >
              Alles ablegen
            </button>
          </div>

          {/*
            Die Zahl, die zeigt, was die nächste Zeichnung einbringt.
            Sie ist der Grund, weiterzuzeichnen – und sie ist ehrlich: Sie
            zählt nur die Teile, nicht Farbe und Versatz.
          */}
          <p className="mt-3 font-serif text-[12.5px] italic text-ink-faint">
            {wegeGesamt === 0
              ? 'Noch keine Teile – lege unten eine Zeichnung hinein.'
              : `${wegeGesamt.toLocaleString('de')} Bildnisse sind aus diesen Teilen zu bauen, ${
                  wege.toLocaleString('de')
                } davon in dieser Ansicht.`}
          </p>

          {/*
            Wo der Kopf sitzt.

            Der Anker in Reglerform – und der Grund, warum das hier steht und
            nicht bei den Schichten: Es ist keine Eigenschaft einer Schicht,
            sondern die Naht zwischen den beiden Feldern. Wer daran zieht,
            bewegt Augen, Mund und Haar mit, denn sie hängen am Kopffeld.

            Nur bei der Ganzfigur zu sehen: Im Kopffeld allein hat die Naht
            keine Wirkung, und ein Regler ohne Wirkung ist ein Regler, der lügt.
          */}
          {darstellung === 'ganzfigur' && (
            <div className="mt-5 border-t border-line pt-4">
              <p className="rubric text-gild-400/70">Wo der Kopf sitzt</p>
              <div className="mt-2 grid grid-cols-2 gap-3">
                <Schieber
                  label="Grösse"
                  wert={kopf.groesse}
                  min={0.12}
                  max={0.6}
                  schritt={0.005}
                  onWert={(v) => setzeKopf({ groesse: v })}
                />
                <Schieber
                  label="Neigung"
                  wert={kopf.drehung}
                  min={-15}
                  max={15}
                  schritt={0.5}
                  onWert={(v) => setzeKopf({ drehung: v })}
                />
                <Schieber
                  label="Nach rechts"
                  wert={kopf.versatzX}
                  min={-25}
                  max={25}
                  schritt={0.5}
                  onWert={(v) => setzeKopf({ versatzX: v })}
                />
                <Schieber
                  label="Nach unten"
                  wert={kopf.versatzY}
                  min={-75}
                  max={-25}
                  schritt={0.5}
                  onWert={(v) => setzeKopf({ versatzY: v })}
                />
              </div>
              <button
                type="button"
                onClick={() => setzeBau({ ...bau, kopf: { ...KOPF_AUF_KOERPER } })}
                className="mt-2 font-serif text-[12.5px] italic text-ink-faint transition-colors hover:text-gold no-tap-highlight"
              >
                Auf das übliche Mass zurück
              </button>
            </div>
          )}

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

        {/* Die Schichten */}
        <div>
          <div className="space-y-1">
            {SCHICHTEN.map((schicht) => {
              const fach = gefaecher.get(schicht.name) ?? [];
              const lage = bau.lagen[schicht.name];
              const gewaehlt = fach.find((t) => t.id === lage?.teilId);
              const offen = offeneSchicht === schicht.name;
              return (
                <div key={schicht.name} className="border-b border-line/70">
                  <button
                    type="button"
                    onClick={() => setOffeneSchicht(offen ? null : schicht.name)}
                    className="flex min-h-[46px] w-full items-center justify-between gap-3 text-left no-tap-highlight"
                  >
                    <span className="flex items-baseline gap-3">
                      <span className="rubric text-gild-400/70">{schicht.label}</span>
                      <span className="font-serif text-[14px] text-ink">
                        {gewaehlt?.name ?? <span className="text-ink-faint/60">—</span>}
                      </span>
                    </span>
                    <span className="shrink-0 font-serif text-[12px] italic text-ink-faint">
                      {fach.length === 0 ? 'leer' : `${fach.length}`}
                    </span>
                  </button>

                  {offen && (
                    <div className="pb-4">
                      <p className="mb-2 font-serif text-[12.5px] italic text-ink-faint">
                        {schicht.hinweis}
                      </p>

                      {fach.length === 0 ? (
                        <p className="font-serif text-[13px] italic text-ink-faint/70">
                          Für diese Schicht gibt es noch nichts.
                        </p>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          <TeilKnopf
                            aktiv={!lage?.teilId}
                            onClick={() => leereSchicht(schicht.name)}
                            label="nichts"
                          />
                          {fach.map((teil) => (
                            <TeilKnopf
                              key={teil.id}
                              aktiv={lage?.teilId === teil.id}
                              onClick={() => setzeLage(schicht.name, { teilId: teil.id })}
                              label={teil.name}
                              teil={teil}
                              ansicht={ansicht}
                            />
                          ))}
                        </div>
                      )}

                      {gewaehlt && (
                        <Regler
                          teil={gewaehlt}
                          lage={lage ?? {}}
                          ansicht={ansicht}
                          eigenes={istEigenes(gewaehlt.id)}
                          onLage={(patch) => setzeLage(schicht.name, patch)}
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
                                  leereSchicht(schicht.name);
                                  void teilLoeschen(gewaehlt.id);
                                }
                              : undefined
                          }
                        />
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Zeichnungen hereinlegen */}
          <div className="mt-8 border-t border-line pt-5">
            <p className="rubric text-gild-400/70">Eigene Zeichnungen</p>
            <p className="mt-1.5 font-serif text-[13px] italic text-ink-faint">
              Ein Bild wird ein Teil, sobald du sagst, in welche Schicht und in welche Ansicht es
              gehört. Am besten mit durchsichtigem Grund und in demselben quadratischen Ausschnitt –
              dann passen alle Teile aufeinander.
            </p>
            <p className="mt-1 font-serif text-[13px] italic text-ink-faint">
              Gehört eine Zeichnung zu einem Teil, das es schon gibt – dieselbe Frisur, nur von der
              Seite –, dann wähle das Teil oben aus und lege sie dort unter „Ansichten dieses Teils“
              hinein. Nur so bleibt es <em>eine</em> Frisur.
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <select
                value={zielschicht}
                onChange={(e) => setZielschicht(e.target.value as SchichtName)}
                aria-label="In welche Schicht"
                className="input-base min-h-[38px] w-auto"
              >
                {SCHICHTEN.map((s) => (
                  <option key={s.name} value={s.name}>
                    {s.label}
                  </option>
                ))}
              </select>
              <select
                value={zielansicht}
                onChange={(e) => setZielansicht(e.target.value as Ansicht)}
                aria-label="In welche Ansicht"
                className="input-base min-h-[38px] w-auto"
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
                className="inline-flex min-h-[38px] items-center gap-1.5 rounded-full border border-gild-500/40 px-4 font-serif text-[14px] text-gold transition-colors hover:bg-gild-400/10 disabled:opacity-50 no-tap-highlight"
              >
                <Plus size={15} /> {laedt ? 'Wird gelegt …' : 'Zeichnungen wählen'}
              </button>
              <input
                ref={dateiRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => void dateienNehmen(e.target.files)}
              />
              {/*
                Der zweite Weg herein: eine Zeichnung an ein vorhandenes Teil.
                Der Knopf dazu steht beim Teil, nicht hier – hier liegt nur
                das Feld, das die Datei entgegennimmt.
              */}
              <input
                ref={nachtragRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => void zeichnungNachtragen(e.target.files)}
              />
              <input
                ref={linieRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => void linieNachtragen(e.target.files)}
              />
            </div>
          </div>
        </div>
      </div>
    </AppendixSheet>
  );
}

/* ------------------------------------------------------------- Bausteine -- */

function TeilKnopf({
  aktiv,
  onClick,
  label,
  teil,
  ansicht,
}: {
  aktiv: boolean;
  onClick: () => void;
  label: string;
  teil?: Teil;
  ansicht?: Ansicht;
}) {
  /*
   * Gezeigt wird, was dieses Teil **in dieser Ansicht** zeigen würde.
   *
   * Ein Teil ohne Zeichnung für die Richtung bleibt in der Auswahl stehen und
   * sagt es. Es zu verstecken wäre die schlechtere Lösung: Dann verschwände
   * die Hälfte des Vorrats beim Umschalten, und niemand wüsste, dass es die
   * Frisur gibt – nur eben noch nicht von der Seite. So ist die Lücke
   * sichtbar, und daneben steht, wie man sie schliesst.
   */
  const zeichnung = teil && ansicht ? zeichnungFuer(teil, ansicht) : null;
  const fehlt = !!teil && !!ansicht && !zeichnung;

  return (
    <button
      type="button"
      onClick={onClick}
      title={fehlt ? `${label} – für diese Ansicht noch nicht gezeichnet` : label}
      className={cx(
        'grid h-16 w-16 place-items-center rounded-[3px] border transition-colors no-tap-highlight',
        aktiv ? 'border-gild-500/70 bg-gild-400/10' : 'border-line hover:border-gild-500/40',
        fehlt && 'border-dashed opacity-45',
      )}
    >
      {zeichnung?.quelle.art === 'grundform' ? (
        <Grundformbild
          form={zeichnung.quelle.form}
          className={cx('h-11 w-11 text-ink-faint/50', zeichnung.gespiegelt && '-scale-x-100')}
        />
      ) : (
        <span className="px-1 text-center font-serif text-[10.5px] leading-tight text-ink-faint">
          {label.slice(0, 18)}
        </span>
      )}
    </button>
  );
}

function Regler({
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
    <div className="mt-4 space-y-3 border-l-2 border-gild-500/25 pl-4">
      {/*
        Die Ansichten dieses Teils.

        Das Herzstück: Hier sieht man auf einen Blick, was von dieser Sache
        schon gezeichnet ist und was noch nicht – und schliesst die Lücke an
        Ort und Stelle, statt ein zweites Teil anzulegen.
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
            {eigen
              ? '↔ heisst: von der anderen Seite gespiegelt. + heisst: fehlt noch.'
              : vorhanden.includes(ansicht)
                ? 'In dieser Ansicht wird die Gegenseite gespiegelt gezeigt.'
                : 'In dieser Ansicht zeigt dieses Teil noch nichts.'}
          </p>
          {eigen && (
            <button
              type="button"
              onClick={onUeberall}
              className="mt-1.5 font-serif text-[12.5px] italic text-ink-faint transition-colors hover:text-gold no-tap-highlight"
            >
              Diese Zeichnung für jede Ansicht gelten lassen
            </button>
          )}
        </div>
      )}

      {/*
        Linie und Fläche.

        Der Unterschied zwischen Spielgrafik und Artbook, und er steht hier
        neben der Farbwahl, weil er nur dort etwas bedeutet: Ohne Tönung
        liegt die Zeichnung ohnehin unverändert da, mit Tönung entscheidet
        die Linie darüber, ob eine Frisur eine Frisur bleibt oder ein Fleck
        wird.

        Nur bei eigenen Teilen und nur, wo für diese Ansicht eine eigene
        Fläche liegt – eine Linie zu einer geliehenen Gegenseite wäre eine
        Angabe am falschen Ort.
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
              <button
                type="button"
                onClick={onLinieWeg}
                className="font-serif text-[12.5px] italic text-ink-faint transition-colors hover:text-gold no-tap-highlight"
              >
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

      {/* Farbe – nur wo sie hingehört. */}
      <div>
        {/*
          Das Häkchen gehört dem Teil, die Farbe der Lage.
          Bei einer eingebauten Grundform ist es deshalb nicht zu sehen: Sie
          ist immer tönbar, und ein Häkchen, das sich nicht abwählen lässt,
          wäre ein Schalter, der lügt. Die Farbwahl bleibt trotzdem stehen –
          sie steht im Bildnis und nicht im Teil.
        */}
        {eigenes && (
          <label className="flex items-center gap-2 font-serif text-[13px] text-ink">
            <input
              type="checkbox"
              checked={teil.toenbar === true}
              onChange={(e) => onToenbar(e.target.checked)}
              className="accent-gild-400"
            />
            In einem Ton gezeichnet – einfärbbar
          </label>
        )}
        {teil.toenbar && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => onLage({ farbe: undefined })}
              aria-label="Ohne Farbe"
              className={cx(
                'grid h-7 w-7 place-items-center rounded-full border',
                lage.farbe ? 'border-line' : 'border-gild-500/70',
              )}
            >
              <X size={12} className="text-ink-faint" />
            </button>
            {PALETTE.map((farbe) => (
              <button
                key={farbe}
                type="button"
                onClick={() => onLage({ farbe })}
                aria-label={farbe}
                style={{ backgroundColor: farbe }}
                className={cx(
                  'h-7 w-7 rounded-full border-2',
                  lage.farbe === farbe ? 'border-gold' : 'border-transparent',
                )}
              />
            ))}
          </div>
        )}
      </div>

      {/* Lage und Grösse */}
      <div className="grid grid-cols-2 gap-3">
        <Schieber label="Nach rechts" wert={lage.versatzX ?? 0} min={-25} max={25} schritt={0.5}
          onWert={(v) => onLage({ versatzX: v })} />
        <Schieber label="Nach unten" wert={lage.versatzY ?? 0} min={-25} max={25} schritt={0.5}
          onWert={(v) => onLage({ versatzY: v })} />
        <Schieber label="Grösse" wert={lage.groesse ?? 1} min={0.6} max={1.6} schritt={0.01}
          onWert={(v) => onLage({ groesse: v })} />
        <label className="flex items-end gap-2 pb-1 font-serif text-[13px] text-ink">
          <input
            type="checkbox"
            checked={lage.spiegel === true}
            onChange={(e) => onLage({ spiegel: e.target.checked })}
            className="accent-gild-400"
          />
          Gespiegelt
        </label>
      </div>

      {/*
        Die Bedeutung – der Unterschied zum Ankleidespiel.
        Sie gehört dem Teil und nicht dem Bildnis: Wer dieselbe Narbe zweimal
        verwendet, hat zweimal dieselbe Geschichte, und das ist richtig so.
      */}
      {eigenes && (
        <div>
          <label className="rubric text-gild-400/70">Was dieses Teil bedeutet</label>
          <input
            type="text"
            defaultValue={teil.bedeutung ?? ''}
            onBlur={(e) => onBedeutung(e.target.value)}
            placeholder="Von der Seilerbahn, im dritten Winter."
            className="input-base mt-1"
          />
        </div>
      )}

      {onLoeschen && (
        <button
          type="button"
          onClick={onLoeschen}
          className="inline-flex min-h-[34px] items-center gap-1.5 font-serif text-[12.5px] italic text-ink-faint transition-colors hover:text-red-700 no-tap-highlight"
        >
          <Trash2 size={13} /> Aus dem Baukasten nehmen
        </button>
      )}
    </div>
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
