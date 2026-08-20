/**
 * Die Tiefenräume einer Figur.
 *
 * Vier Richtungen und rechts drei Ebenen – der Weg aus dem Auftrag:
 *
 *     Vaelorian → Beziehungen → Miraelys → gemeinsame Geschichte
 *
 * Das ist die **vierte** Verantwortlichkeit: Darstellung. Diese Datei weiß,
 * wie ein Gesicht mit einer Zeile darunter aussieht. Sie weiß nicht, warum
 * rechts die Beziehungen liegen – das steht in `figurkarte.ts` – und sie legt
 * nichts an, ändert nichts, löscht nichts.
 *
 * ---
 *
 * **Lesen, und eine einzige Handlung.**
 *
 * Ein Raum, den man durch eine Geste betritt, darf die Welt nicht anfassen;
 * sonst wäre Erkunden gefährlich, und dann erkundet niemand. Die eine
 * Ausnahme ist „In die Mitte holen": Sie verschiebt den Anker und sonst
 * nichts. Und die Wahl einer Person, die keine Handlung an der Welt ist,
 * sondern eine am Blick.
 */

import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRightLeft, ChevronRight } from 'lucide-react';
import { useStudio } from '../../store/useStudio';
import { relationsOf } from '../../lib/relations';
import { useRaum } from '../../lib/raum/useRaum';
import {
  BEZIEHUNGSARTEN,
  FUNDSTUECKARTEN,
  HERKUNFTSARTEN,
  HERKUNFTSFELDER,
  NOTIZFELDER,
  WISSENSFELDER,
} from '../../lib/raum/figurkarte';
import { Bildnis } from './Bildnis';
import { Goldteiler, zeichenFuer } from '../../lib/zeichen/zeichen';
import { templateFor } from '../../lib/templates';
import type { Entry, Relation } from '../../types';

/* ============================================================== Bausteine == */

/**
 * Eine Zeile mit Zeichen, Titel und Beischrift.
 *
 * Die Bauform der Medaillonlisten aus dem Referenzbild – dort stehen sie um
 * das Telefon herum („Biografie · Entdecke die Vergangenheit deiner Figur").
 * Auf dem Telefon selbst werden daraus Zeilen, weil ein Raster aus
 * Medaillons auf 390 Punkten entweder winzig oder scrollend wäre.
 */
function Zeile({
  zeichen,
  titel,
  was,
  kind,
  onClick,
  weiter,
}: {
  zeichen?: string;
  titel: string;
  was?: string;
  kind?: React.ReactNode;
  onClick?: () => void;
  weiter?: boolean;
}) {
  const Z = zeichenFuer(zeichen);
  const inhalt = (
    <>
      {Z && (
        <span className="mt-0.5 shrink-0 text-gild-400/70">
          <Z groesse={18} />
        </span>
      )}
      <span className="min-w-0 flex-1">
        <span className="block font-serif text-[14.5px] leading-snug text-paper-200">{titel}</span>
        {was && (
          <span className="mt-0.5 block font-serif text-[11.5px] leading-snug text-paper-300/50">
            {was}
          </span>
        )}
        {kind}
      </span>
      {weiter && (
        <ChevronRight size={15} strokeWidth={1.4} className="mt-1 shrink-0 text-gild-500/50" />
      )}
    </>
  );

  if (!onClick) return <div className="flex gap-3 py-3">{inhalt}</div>;
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full gap-3 py-3 text-left no-tap-highlight active:opacity-70"
    >
      {inhalt}
    </button>
  );
}

/** Der Trennstrich zwischen zwei Zeilen – sehr schwach, nur ein Hauch Gold. */
const Strich = () => <div className="h-px bg-gild-600/15" aria-hidden />;

/**
 * Was nicht da ist, wird gesagt – aber nur einmal und leise.
 *
 * Ein leerer Raum mit einer Zeile „noch nichts" ist ehrlicher als ein Raum,
 * der sich mit Naheliegendem füllt. Vorkommen sollte er trotzdem selten: Die
 * Karte gibt eine Richtung gar nicht erst frei, wenn dahinter nichts liegt.
 */
const Still = ({ was }: { was: string }) => (
  <p className="py-6 text-center font-serif text-[12px] italic text-paper-300/35">{was}</p>
);

/* ---------------------------------------------------------------- Felder -- */

const text = (v: unknown) => (typeof v === 'string' ? v.trim() : '');
const liste = (v: unknown) =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string' && !!x.trim()) : [];

/**
 * Die Felder einer Vorlage unter ihren echten Beschriftungen zeigen.
 *
 * Die Beschriftung kommt aus `templateFor` und nicht aus einer Tabelle hier –
 * sonst hieße „background" auf dieser Seite anders als auf der Buchseite, und
 * man hätte zwei Wahrheiten über denselben Inhalt.
 */
function Felder({ entry, keys }: { entry: Entry; keys: string[] }) {
  const vorlage = templateFor(entry.type);
  const stuecke = keys
    .map((k) => {
      const def = vorlage.fields.find((f) => f.key === k);
      const roh = entry.fields?.[k];
      const wert = text(roh) || liste(roh).join(' · ');
      return wert && def ? { label: def.label, wert } : null;
    })
    .filter((x): x is { label: string; wert: string } => !!x);

  if (!stuecke.length) return null;
  return (
    <div className="space-y-4">
      {stuecke.map((s) => (
        <div key={s.label}>
          <p className="font-serif text-[9.5px] uppercase tracking-[0.26em] text-gild-500/55">
            {s.label}
          </p>
          <p className="mt-1 font-serif text-[13.5px] leading-[1.62] text-paper-200/85">{s.wert}</p>
        </div>
      ))}
    </div>
  );
}

/* ============================================== RECHTS 1 · Die Beziehungen = */

/**
 * Wie das Referenzbild seine Beziehungen ordnet: Familie, Verbündete,
 * Rivalen, Organisationen.
 *
 * Die Zuordnung ist Darstellung und darf deshalb hier stehen – sie sagt, wie
 * vorhandene Kanten *gebündelt* aussehen, nicht was sie bedeuten.
 */
const BUENDEL: { id: string; name: string; zeichen: string; arten: string[] }[] = [
  { id: 'familie', name: 'Familie', zeichen: 'familie', arten: ['parent_of', 'married_to', 'related'] },
  { id: 'freunde', name: 'Freunde & Verbündete', zeichen: 'freunde', arten: ['allied_with'] },
  { id: 'rivalen', name: 'Rivalen & Feinde', zeichen: 'rivalen', arten: ['opposed_to'] },
  { id: 'orden', name: 'Organisationen', zeichen: 'organisation', arten: ['member_of', 'ruled'] },
  { id: 'sonst', name: 'Weitere Verbindungen', zeichen: 'geflecht', arten: [] },
];

const VERTRAUENSWORT: Record<string, string> = {
  hoch: 'Hoch',
  mittel: 'Mittel',
  gering: 'Gering',
  feindselig: 'Feindselig',
};

interface Nachbar {
  entry: Entry;
  relation: Relation;
  /** Wie die Kante von dieser Figur aus gelesen heißt. */
  label: string;
}

export function RaumBeziehungen({ anker }: { anker: Entry }) {
  const entries = useStudio((s) => s.entries);
  const relIndex = useStudio((s) => s.relIndex);
  const waehle = useRaum((s) => s.waehle);

  const nachbarn = useMemo<Nachbar[]>(() => {
    const nach = new Map(entries.map((e) => [e.id, e]));
    return relationsOf(relIndex, anker.id)
      .filter((r) => BEZIEHUNGSARTEN.has(r.relation.type))
      .map((r) => ({ entry: nach.get(r.otherId), relation: r.relation, label: r.label }))
      .filter((n): n is Nachbar => !!n.entry);
  }, [entries, relIndex, anker.id]);

  if (!nachbarn.length) return <Still was="Von dieser Figur führt noch keine Verbindung fort." />;

  const gebuendelt = BUENDEL.map((b) => ({
    ...b,
    leute: nachbarn.filter((n) =>
      b.arten.length ? b.arten.includes(n.relation.type) : !BUENDEL.some((x) => x.arten.includes(n.relation.type)),
    ),
  })).filter((b) => b.leute.length);

  return (
    <div className="space-y-6">
      {gebuendelt.map((b) => (
        <section key={b.id}>
          <header className="flex items-center gap-2">
            {(() => {
              const Z = zeichenFuer(b.zeichen);
              return Z ? (
                <span className="text-gild-400/65">
                  <Z groesse={15} />
                </span>
              ) : null;
            })()}
            <h3 className="font-serif text-[10px] uppercase tracking-[0.26em] text-gild-500/60">
              {b.name}
            </h3>
          </header>

          <div className="mt-1">
            {b.leute.map((n, i) => (
              <div key={n.relation.id}>
                {i > 0 && <Strich />}
                {/*
                  Ein Gesicht anzutippen heißt „diese Person meine ich" – und
                  führt damit eine Ebene tiefer. Zwei Dinge in einer
                  Berührung, und mit Absicht: Eine Wahl, die nicht
                  hineinführte, wäre eine Auswahl in einer Liste.
                */}
                <button
                  type="button"
                  onClick={() => waehle(n.entry.id)}
                  className="flex w-full items-center gap-3 py-2.5 text-left no-tap-highlight active:opacity-70"
                >
                  <Bildnis
                    entry={n.entry}
                    schacht="beziehungsbildnis"
                    ecken
                    className="h-[52px] w-[46px] shrink-0 rounded-[2px]"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-serif text-[15px] text-paper-100">
                      {n.entry.title}
                    </span>
                    <span className="mt-0.5 block truncate font-serif text-[11px] text-brass-400/70">
                      {n.relation.note?.trim() || n.label}
                    </span>
                    {/*
                      Vertrauen und letzter Kontakt stehen nur da, wenn sie
                      dastehen. Kein „unbekannt", kein Mittelwert – über das
                      Verhältnis zweier Figuren schweigt das Buch lieber, als
                      zu raten.
                    */}
                    {(n.relation.vertrauen || n.relation.letzterKontakt) && (
                      <span className="mt-1 flex flex-wrap gap-x-3 font-serif text-[10px] text-paper-300/45">
                        {n.relation.vertrauen && (
                          <span>Vertrauen: {VERTRAUENSWORT[n.relation.vertrauen]}</span>
                        )}
                        {n.relation.letzterKontakt && (
                          <span>Letzter Kontakt: {n.relation.letzterKontakt}</span>
                        )}
                      </span>
                    )}
                  </span>
                  <ChevronRight size={15} strokeWidth={1.4} className="shrink-0 text-gild-500/45" />
                </button>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

/* ============================================ RECHTS 2 · Eine Beziehung === */

export function RaumBeziehung({ anker, gewaehlt }: { anker: Entry; gewaehlt: Entry | undefined }) {
  const relIndex = useStudio((s) => s.relIndex);
  const navigate = useNavigate();
  const setzeAnker = useRaum((s) => s.setzeAnker);

  const kanten = useMemo(
    () => relationsOf(relIndex, anker.id).filter((r) => r.otherId === gewaehlt?.id),
    [relIndex, anker.id, gewaehlt?.id],
  );

  if (!gewaehlt) return <Still was="Es ist noch niemand gewählt." />;

  return (
    <div className="space-y-6">
      {/* Kopf: Bildnis, Name, Art der Verbindung – wie das rechte Bild der Referenz. */}
      <div className="flex items-start gap-4">
        <Bildnis
          entry={gewaehlt}
          schacht="beziehungsbildnis"
          ecken
          className="h-[104px] w-[86px] shrink-0 rounded-[2px]"
        />
        <div className="min-w-0 flex-1 pt-1">
          <h3 className="font-serif text-[21px] leading-tight text-gild-300">{gewaehlt.title}</h3>
          <p className="mt-1 font-serif text-[11.5px] text-brass-400/75">
            {kanten.map((k) => k.relation.note?.trim() || k.label).join(' · ')}
          </p>
          <div className="mt-2 text-gild-500/40">
            <Goldteiler breite={96} />
          </div>
        </div>
      </div>

      {/* Die Angaben zur Verbindung selbst. */}
      {kanten.some((k) => k.relation.vertrauen || k.relation.letzterKontakt || k.relation.zeitnotiz) && (
        <div className="space-y-2">
          {kanten.map((k) => (
            <div key={k.relation.id} className="flex flex-wrap gap-x-5 gap-y-1">
              {k.relation.vertrauen && (
                <Angabe name="Vertrauen" wert={VERTRAUENSWORT[k.relation.vertrauen]} />
              )}
              {k.relation.letzterKontakt && (
                <Angabe name="Letzter Kontakt" wert={k.relation.letzterKontakt} />
              )}
              {k.relation.zeitnotiz && <Angabe name="Zur Zeit" wert={k.relation.zeitnotiz} />}
            </div>
          ))}
        </div>
      )}

      {/* Über sie – der eigene Text der gewählten Figur, nicht ein zweiter. */}
      {gewaehlt.description?.trim() && (
        <div>
          <p className="font-serif text-[9.5px] uppercase tracking-[0.26em] text-gild-500/55">
            Über {gewaehlt.title}
          </p>
          <p className="mt-1.5 font-serif text-[13.5px] leading-[1.62] text-paper-200/85">
            {gewaehlt.description}
          </p>
        </div>
      )}

      {/*
        Die einzige Handlung, die etwas verändern darf.

        Sie verschiebt den Anker – aus „ich sehe Miraelys an, während ich an
        Vaelorian arbeite" wird „ich arbeite an Miraelys". Deshalb steht sie
        unten und nicht oben, und deshalb ist sie benannt und nicht ein Pfeil.
      */}
      <div className="pt-1">
        <button
          type="button"
          onClick={() => {
            setzeAnker(gewaehlt.id);
            navigate(`/figur/${gewaehlt.id}`);
          }}
          className="flex items-center gap-2 rounded-lg border border-gild-600/30 px-3.5 py-2 font-serif text-[12px] text-gild-300/85 no-tap-highlight active:opacity-70"
        >
          <ArrowRightLeft size={14} strokeWidth={1.5} />
          In die Mitte holen
        </button>
      </div>
    </div>
  );
}

const Angabe = ({ name, wert }: { name: string; wert: string }) => (
  <span>
    <span className="font-serif text-[9.5px] uppercase tracking-[0.24em] text-gild-500/55">
      {name}
    </span>
    <span className="ml-1.5 font-serif text-[12.5px] text-paper-200/85">{wert}</span>
  </span>
);

/* ==================================== RECHTS 3 · Gemeinsame Geschichte === */

/**
 * Was die beiden verbindet, jenseits der Kante zwischen ihnen.
 *
 * **Abgeleitet und nicht erfunden.** Es gibt kein Feld „gemeinsame
 * Geschichte", und es soll auch keines geben – das wäre eine dritte Wahrheit
 * neben den beiden Figuren. Was hier steht, sind die Einträge, an denen
 * *beide* hängen: dieselbe Szene, derselbe Ort, dasselbe Ereignis.
 *
 * Genau das ist der Wert eines Beziehungssystems gegenüber einer Liste von
 * Namen: Die gemeinsame Geschichte war schon da, es hat nur nie jemand
 * danach gefragt.
 */
export function RaumGemeinsameGeschichte({
  anker,
  gewaehlt,
}: {
  anker: Entry;
  gewaehlt: Entry | undefined;
}) {
  const entries = useStudio((s) => s.entries);
  const relIndex = useStudio((s) => s.relIndex);
  const navigate = useNavigate();

  const gemeinsam = useMemo(() => {
    if (!gewaehlt) return [];
    const nach = new Map(entries.map((e) => [e.id, e]));
    const meine = new Map(relationsOf(relIndex, anker.id).map((r) => [r.otherId, r]));
    return relationsOf(relIndex, gewaehlt.id)
      .filter((r) => r.otherId !== anker.id && meine.has(r.otherId))
      .map((r) => {
        const e = nach.get(r.otherId);
        const meins = meine.get(r.otherId);
        return e && meins ? { entry: e, hier: meins.label, dort: r.label } : null;
      })
      .filter((x): x is { entry: Entry; hier: string; dort: string } => !!x);
  }, [entries, relIndex, anker.id, gewaehlt?.id]);

  if (!gewaehlt) return <Still was="Es ist noch niemand gewählt." />;

  const kante = relationsOf(relIndex, anker.id).find((r) => r.otherId === gewaehlt.id);

  return (
    <div className="space-y-6">
      <p className="font-serif text-[13px] leading-[1.6] text-paper-200/70">
        {anker.title} und {gewaehlt.title}
        {kante?.relation.beginn ? ` – seit ${kante.relation.beginn}` : ''}
        {kante?.relation.note?.trim() ? `. ${kante.relation.note.trim()}` : '.'}
      </p>

      {gemeinsam.length ? (
        <section>
          <h3 className="font-serif text-[10px] uppercase tracking-[0.26em] text-gild-500/60">
            Was beide berührt
          </h3>
          <div className="mt-1">
            {gemeinsam.map((g, i) => (
              <div key={g.entry.id}>
                {i > 0 && <Strich />}
                <Zeile
                  zeichen={zeichenkennungFuer(g.entry.type)}
                  titel={g.entry.title}
                  was={`${anker.title} ${g.hier} · ${gewaehlt.title} ${g.dort}`}
                  weiter
                  onClick={() => navigate(`/eintrag/${g.entry.id}`)}
                />
              </div>
            ))}
          </div>
        </section>
      ) : (
        <Still was="Noch kreuzen sich ihre Wege nirgends sonst." />
      )}
    </div>
  );
}

/** Ein grobes Zeichen nach Eintragsart – nur zur Anmutung, nie zur Bedeutung. */
function zeichenkennungFuer(typ: string): string {
  if (typ === 'location') return 'heimat';
  if (typ === 'character' || typ === 'creature') return 'familie';
  if (typ === 'event' || typ === 'scene') return 'chronik';
  if (typ === 'faction' || typ === 'organization') return 'organisation';
  return 'fundstueck';
}

/* ============================================== OBEN · Wissen · LINKS ===== */

export function RaumWissen({ anker }: { anker: Entry }) {
  const navigate = useNavigate();
  const hatGeheim = !!anker.geheim?.text?.trim();

  return (
    <div className="space-y-7">
      {anker.description?.trim() && (
        <section>
          <h3 className="font-serif text-[10px] uppercase tracking-[0.26em] text-gild-500/60">
            Biografie
          </h3>
          <p className="mt-1.5 font-serif text-[13.5px] leading-[1.62] text-paper-200/85">
            {anker.description}
          </p>
        </section>
      )}

      <Felder entry={anker} keys={WISSENSFELDER} />

      {/* Chronik – nur, wenn diese Figur überhaupt in der Zeit steht. */}
      {(anker.beginn || anker.ende) && (
        <section>
          <h3 className="font-serif text-[10px] uppercase tracking-[0.26em] text-gild-500/60">
            Chronik
          </h3>
          <p className="mt-1.5 font-serif text-[13.5px] text-paper-200/85">
            {[anker.beginn, anker.ende].filter(Boolean).join(' – ')}
          </p>
        </section>
      )}

      {hatGeheim && (
        <section>
          <h3 className="flex items-center gap-2 font-serif text-[10px] uppercase tracking-[0.26em] text-gild-500/60">
            {(() => {
              const Z = zeichenFuer('geheimnisse');
              return Z ? <Z groesse={14} /> : null;
            })()}
            Geheimnisse
          </h3>
          <p className="mt-1.5 font-serif text-[13.5px] leading-[1.62] text-paper-200/85">
            {anker.geheim?.text}
          </p>
        </section>
      )}

      {(anker.blocks?.length ?? 0) > 0 && (
        <button
          type="button"
          onClick={() => navigate(`/eintrag/${anker.id}`)}
          className="font-serif text-[12px] text-gild-400/70 underline decoration-gild-600/40 underline-offset-4"
        >
          Die ganze Buchseite lesen
        </button>
      )}
    </div>
  );
}

export function RaumHerkunft({ anker }: { anker: Entry }) {
  const entries = useStudio((s) => s.entries);
  const relIndex = useStudio((s) => s.relIndex);
  const navigate = useNavigate();

  const orte = useMemo(() => {
    const nach = new Map(entries.map((e) => [e.id, e]));
    return relationsOf(relIndex, anker.id)
      .filter((r) => HERKUNFTSARTEN.has(r.relation.type))
      .map((r) => ({ entry: nach.get(r.otherId), label: r.label, id: r.relation.id }))
      .filter((x): x is { entry: Entry; label: string; id: string } => !!x.entry);
  }, [entries, relIndex, anker.id]);

  return (
    <div className="space-y-7">
      {orte.length > 0 && (
        <section>
          <h3 className="font-serif text-[10px] uppercase tracking-[0.26em] text-gild-500/60">
            Ort und Welt
          </h3>
          <div className="mt-1">
            {orte.map((o, i) => (
              <div key={o.id}>
                {i > 0 && <Strich />}
                {/*
                  Der echte Eintrag, nicht eine Abschrift davon.
                  „Wenn der Charakter in Mooshalde lebt, soll die
                  Tiefenansicht auf den echten Mooshalde-Entry verweisen."
                */}
                <Zeile
                  zeichen={o.entry.type === 'location' ? 'heimat' : 'welt'}
                  titel={o.entry.title}
                  was={o.label}
                  weiter
                  onClick={() => navigate(`/eintrag/${o.entry.id}`)}
                />
              </div>
            ))}
          </div>
        </section>
      )}

      <Felder entry={anker} keys={HERKUNFTSFELDER} />

      {!orte.length && <Still was="Wo diese Figur herkommt, steht noch nirgends." />}
    </div>
  );
}

export function RaumNotizen({ anker }: { anker: Entry }) {
  const entries = useStudio((s) => s.entries);
  const relIndex = useStudio((s) => s.relIndex);
  const navigate = useNavigate();

  const dinge = useMemo(() => {
    const nach = new Map(entries.map((e) => [e.id, e]));
    return relationsOf(relIndex, anker.id)
      .filter((r) => FUNDSTUECKARTEN.has(r.relation.type))
      .map((r) => ({ entry: nach.get(r.otherId), label: r.label, id: r.relation.id }))
      .filter((x): x is { entry: Entry; label: string; id: string } => !!x.entry);
  }, [entries, relIndex, anker.id]);

  return (
    <div className="space-y-7">
      <Felder entry={anker} keys={NOTIZFELDER} />

      {dinge.length > 0 && (
        <section>
          <h3 className="flex items-center gap-2 font-serif text-[10px] uppercase tracking-[0.26em] text-gild-500/60">
            {(() => {
              const Z = zeichenFuer('fundstueck');
              return Z ? <Z groesse={14} /> : null;
            })()}
            Fundstücke
          </h3>
          <div className="mt-1">
            {dinge.map((d, i) => (
              <div key={d.id}>
                {i > 0 && <Strich />}
                <Zeile
                  zeichen="fundstueck"
                  titel={d.entry.title}
                  was={d.label}
                  weiter
                  onClick={() => navigate(`/eintrag/${d.entry.id}`)}
                />
              </div>
            ))}
          </div>
        </section>
      )}

      {!dinge.length && !NOTIZFELDER.some((k) => text(anker.fields?.[k]) || liste(anker.fields?.[k]).length) && (
        <Still was="Hier ist noch nichts aufbewahrt." />
      )}
    </div>
  );
}
