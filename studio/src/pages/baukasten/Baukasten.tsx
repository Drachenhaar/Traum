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
  SCHICHTEN,
  moeglichkeiten,
  nachSchichten,
  wuerfle,
  bedeutungen,
  LEERER_BAU,
  type Bildbau,
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

  const bau: Bildbau = entry?.bildbau ?? LEERER_BAU;
  const gefaecher = useMemo(() => nachSchichten(vorrat), [vorrat]);
  const [offeneSchicht, setOffeneSchicht] = useState<SchichtName | null>('kopf');

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
  const [laedt, setLaedt] = useState(false);

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
          quelle: { art: 'bild', bildId: meta.id },
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
          }“ gelegt.`,
          'success',
        );
      }
    } finally {
      setLaedt(false);
      if (dateiRef.current) dateiRef.current.value = '';
    }
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

  const wege = moeglichkeiten(vorrat);
  const traegtBedeutung = bedeutungen(bau, vorrat);

  return (
    <AppendixSheet title={entry.title} rubric="Anhang · Der Baukasten">
      <div className="grid gap-8 lg:grid-cols-[minmax(0,320px)_minmax(0,1fr)]">
        {/* Das Bildnis */}
        <div className="lg:sticky lg:top-4 lg:self-start">
          <div className="relative overflow-hidden rounded-[3px] border border-line bg-paper-200 text-ink-faint/25">
            <Bildniswerk bau={bau} vorrat={vorrat} className="w-full" />
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setzeBau(wuerfle(saatAus(entry.id + Date.now()), vorrat, PALETTE))}
              className="inline-flex min-h-[38px] items-center gap-1.5 rounded-full border border-gild-500/40 px-4 font-serif text-[14px] text-gold transition-colors hover:bg-gild-400/10 no-tap-highlight"
            >
              <Dices size={15} /> Würfeln
            </button>
            <button
              type="button"
              onClick={() => setzeBau(LEERER_BAU)}
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
            {wege === 0
              ? 'Noch keine Teile – lege unten eine Zeichnung hinein.'
              : `${wege.toLocaleString('de')} Bildnisse sind aus diesen Teilen zu bauen.`}
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
                            />
                          ))}
                        </div>
                      )}

                      {gewaehlt && (
                        <Regler
                          teil={gewaehlt}
                          lage={lage ?? {}}
                          onLage={(patch) => setzeLage(schicht.name, patch)}
                          onToenbar={(wert) => void teilAendern(gewaehlt.id, { toenbar: wert })}
                          onBedeutung={(text) => void teilAendern(gewaehlt.id, { bedeutung: text })}
                          onLoeschen={
                            gewaehlt.quelle.art === 'bild'
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
              Ein Bild wird ein Teil, sobald du sagst, in welche Schicht es gehört. Am besten mit
              durchsichtigem Grund und in demselben quadratischen Ausschnitt – dann passen alle
              Teile aufeinander.
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
}: {
  aktiv: boolean;
  onClick: () => void;
  label: string;
  teil?: Teil;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      className={cx(
        'grid h-16 w-16 place-items-center rounded-[3px] border transition-colors no-tap-highlight',
        aktiv ? 'border-gild-500/70 bg-gild-400/10' : 'border-line hover:border-gild-500/40',
      )}
    >
      {teil?.quelle.art === 'grundform' ? (
        <Grundformbild form={teil.quelle.form} className="h-11 w-11 text-ink-faint/50" />
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
  onLage,
  onToenbar,
  onBedeutung,
  onLoeschen,
}: {
  teil: Teil;
  lage: Lage;
  onLage: (patch: Partial<Lage>) => void;
  onToenbar: (wert: boolean) => void;
  onBedeutung: (text: string) => void;
  onLoeschen?: () => void;
}) {
  return (
    <div className="mt-4 space-y-3 border-l-2 border-gild-500/25 pl-4">
      {/* Farbe – nur wo sie hingehört. */}
      <div>
        <label className="flex items-center gap-2 font-serif text-[13px] text-ink">
          <input
            type="checkbox"
            checked={teil.toenbar === true}
            onChange={(e) => onToenbar(e.target.checked)}
            className="accent-gild-400"
          />
          In einem Ton gezeichnet – einfärbbar
        </label>
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
