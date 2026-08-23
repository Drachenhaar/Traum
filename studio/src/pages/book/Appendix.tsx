/**
 * Die Anhänge.
 *
 * Hier wohnt die dritte Schicht: Produktion, Chronik, Karte, Register,
 * Kolophon. Nichts davon drängt sich vor – es steht hinten im Buch, wo man es
 * findet, wenn man es sucht.
 *
 * Der `AppendixSheet` ist ein einzelnes breites Blatt: Werkzeuge, die kein
 * Buchsatz sein wollen, dürfen hier Werkzeuge bleiben.
 */

import { useState, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, ChevronDown, Eye, EyeOff, Library } from 'lucide-react';
import { useStudio } from '../../store/useStudio';
import { ordne, profilVon, type Werkzeug } from '../../lib/profil';
import { geheimZeile } from '../../lib/geheim';
import { useCurrentSpread } from '../../components/book/BookShell';
import { Spread } from '../../components/book/Spread';

/**
 * Ein Anhang – und zugleich ein Werkzeug im Sinne von `lib/profil.ts`.
 *
 * `gewicht` sagt, welchen Schwerpunkten dieser Anhang dient. Es sagt
 * ausdruecklich *nicht*, welchen Zielgruppen: Der Zeitstrahl weiss nichts von
 * Spielleitern, nur etwas von Welt und Erzaehlung. Dadurch kostet ein neues
 * Profil hier keine Zeile.
 *
 * `ab` haelt zurueck, was erst mit Erfahrung Sinn ergibt – unabhaengig davon,
 * wie schwer es wiegt.
 */
interface AppendixEntry extends Werkzeug {
  id: string;
  to: string;
  title: string;
  note: string;
}

export function AppendixSpread() {
  const { book, spread, wear } = useCurrentSpread();
  const navigate = useNavigate();
  const images = useStudio((s) => s.images);
  const boards = useStudio((s) => s.boards);
  const entries = useStudio((s) => s.entries);
  const settings = useStudio((s) => s.settings);
  const updateSettings = useStudio((s) => s.updateSettings);
  const books = useStudio((s) => s.books);
  const schliesseBuch = useStudio((s) => s.schliesseBuch);

  const trashed = entries.filter((e) => e.deletedAt).length;
  const assets = entries.filter((e) => e.type === 'asset' && !e.deletedAt).length;

  const szenen = entries.filter((e) => e.type === 'szene' && !e.deletedAt).length;
  /* Die anderen Baende – nur fuer die Wortwahl, nicht fuer das Ob. */
  const andereBaende = books.filter((b) => !b.archived).length - 1;

  const profil = profilVon(settings);
  const [offen, setOffen] = useState(false);
  const verborgen = geheimZeile(entries);

  /*
   * Eine Liste, nicht zwei.
   *
   * Vorher standen hier „primary" und „secondary" – eine Einteilung, die
   * jemand einmal getroffen hatte und die fuer jeden gleich war. Wer Bilder
   * sammelt, fand die Werkbank unter „Weiteres"; wer Systeme entwirft, fand
   * die Entdeckungen zwischen Karte und Tafelteil. Jetzt entscheidet das
   * Profil, was vorn liegt – und „Weiteres" ist nicht mehr eine Restekiste,
   * sondern die zweite Haelfte derselben Ordnung.
   */
  const werkzeuge: AppendixEntry[] = [
    {
      /*
       * Der Roman steht zuoberst, weil er der einzige Anhang ist, in dem
       * etwas entsteht statt betrachtet zu werden. Alles darunter sieht die
       * Welt an; hier wird sie erzählt.
       */
      id: 'roman',
      to: '/roman',
      title: 'Manuskript',
      note:
        szenen > 0
          ? `${szenen} ${szenen === 1 ? 'Szene' : 'Szenen'} – schreiben, während die Welt danebensteht.`
          : 'Einen Roman schreiben, in dem deine Figuren deine Figuren bleiben.',
      gewicht: { schreiben: 1, spiel: 0.2 },
    },
    {
      id: 'setzerei',
      to: '/setzerei',
      title: 'Setzerei',
      note: 'Geschriebenes einlegen – etwa aus ChatGPT – und das Buch setzt daraus eine Seite.',
      gewicht: { schreiben: 0.7, welt: 0.5 },
    },
    {
      id: 'karte',
      to: '/karte',
      title: 'Faltkarte',
      note: 'Die Ordnung der Welt als Sternkarte. Aufklappen, betrachten, zuklappen.',
      gewicht: { welt: 1, spiel: 0.8, bild: 0.4, system: 0.4 },
    },
    {
      id: 'tafeln',
      to: '/tafeln',
      title: 'Tafelteil',
      note: `${images.length} ${images.length === 1 ? 'Tafel' : 'Tafeln'} – Illustrationen und Referenzen in voller Größe.`,
      gewicht: { bild: 1, welt: 0.4 },
    },
    {
      id: 'zeitstrahl',
      to: '/zeitstrahl',
      title: 'Zeitstrahl',
      note: 'Die Welt in der Zeit. Wann etwas begann, wie lange es bestand – und was zu einem gewählten Jahr existierte.',
      gewicht: { welt: 0.9, schreiben: 0.5, system: 0.4 },
    },
    {
      id: 'reise',
      to: '/reise',
      title: 'Reise',
      note: 'Deine Welt von innen: bei einer Figur beginnen und Schritt für Schritt entscheiden, wohin es weitergeht.',
      gewicht: { welt: 0.7, spiel: 0.8, schreiben: 0.4 },
      ab: 'standard',
    },
    {
      id: 'entdeckungen',
      to: '/entdeckungen',
      title: 'Entdeckungen',
      note: 'Was dem Buch an deiner Welt auffällt – Widersprüche, offene Enden, Fragen. Es liest nur; entscheiden tust du.',
      gewicht: { system: 0.9, welt: 0.6 },
      ab: 'standard',
    },
    {
      id: 'spiegel',
      to: '/spiegel',
      title: 'Der Spiegel',
      note: 'Was in deinen Welten wiederkehrt. Er betrachtet das Werk, nicht den Verfasser – und schweigt, solange er zu wenig gesehen hat.',
      gewicht: { schreiben: 0.8 },
      ab: 'tief',
    },
    {
      /*
       * Die Beschriftung stand vorher auf „Was wann geschah“ – das ist seit
       * dem Zeitstrahl irreführend. Die Chronik ist der Verlauf der eigenen
       * Arbeit, nicht der Verlauf der Welt.
       */
      id: 'chronik',
      to: '/chronik',
      title: 'Chronik',
      note: `Der Verlauf deiner Arbeit. ${trashed > 0 ? `${trashed} entnommene ${trashed === 1 ? 'Seite' : 'Seiten'} liegen hier bereit.` : 'Frühere Fassungen lassen sich zurückholen.'}`,
      gewicht: { welt: 0.4, system: 0.5 },
      ab: 'standard',
    },
    {
      id: 'lose',
      to: '/lose-blaetter',
      title: 'Lose Blätter',
      note: `${boards.length} ${boards.length === 1 ? 'Bogen' : 'Bögen'} zum Sammeln, Skizzieren und Sortieren.`,
      gewicht: { bild: 0.9, welt: 0.4, spiel: 0.5 },
    },
    {
      /*
       * Steht zuletzt, weil es der letzte Schritt ist: Alles davor arbeitet
       * am Buch, dies hier macht es fertig.
       */
      id: 'druck',
      to: '/druck',
      title: 'Druckfassung',
      note: 'Die ganze Welt gesetzt – Einband, Titelblatt, Inhalt, Kapiteltrenner, Farbtafel. Zum Drucken oder als PDF.',
      gewicht: { bild: 0.6, welt: 0.5, schreiben: 0.4 },
      ab: 'standard',
    },
    {
      id: 'werkbank',
      to: '/werkbank',
      title: 'Werkbank',
      note: `Produktionsstand von ${assets} ${assets === 1 ? 'Asset' : 'Assets'}.`,
      gewicht: { bild: 0.6, system: 0.6 },
      ab: 'tief',
    },
    {
      id: 'register',
      to: '/register',
      title: 'Register',
      note: 'Alle Einträge alphabetisch, mit Seitenzahl.',
      gewicht: { welt: 0.5, system: 0.5, spiel: 0.4 },
    },
  ];

  const { vorn, weiter } = ordne(werkzeuge, profil);

  /*
   * Das Kolophon steht ausserhalb der Ordnung.
   *
   * Nicht weil es wichtiger waere, sondern weil es nicht zum Handwerk gehoert:
   * Es ist die Rueckseite des Buches selbst – Sicherung, Einspielen, und die
   * Stelle, an der man dieses Profil wieder aendert. Ein Anhang, der die
   * Einstellungen enthaelt, darf nicht von den Einstellungen wegsortiert
   * werden koennen.
   */
  const kolophon: AppendixEntry = {
    id: 'kolophon',
    to: '/kolophon',
    title: 'Kolophon',
    note: 'Die Geschichte hinter dem Buch – Einstellungen, Sicherung, Import und Export.',
    gewicht: {},
  };

  return (
    <Spread
      pageLeft={spread?.page ?? 6}
      wear={wear}
      left={
        <div className="py-4 lg:py-10">
          <p className="rubric">Anhänge</p>
          <h1 className="mt-3 font-serif text-[36px] leading-[1.05] text-ink sm:text-[44px]">
            Hinten im Buch
          </h1>
          <span aria-hidden className="rule-gild mt-5 block w-28 opacity-75" />

          <p className="prose-book mt-6 max-w-[46ch]">
            Was hier steht, gehört zur Werkstatt, nicht zur Erzählung. Es ist da, wenn Sie es
            brauchen – und im Weg, wenn es vorne stünde.
          </p>

          <ol className="mt-8">
            {vorn.map((item) => (
              <AppendixLine key={item.to} {...item} />
            ))}
          </ol>
        </div>
      }
      right={
        <div className="py-4 lg:py-10">
          <p className="rubric mb-3">Weiteres</p>

          {/*
            Die Falte.

            Sie nennt beim Namen, was hinter ihr liegt – „Neun weitere:
            Chronik, Spiegel, Werkbank …" statt „Mehr anzeigen". Eine Falte,
            die verschweigt, was sie verbirgt, ist eine Wundertuete, und
            Wundertueten tippt niemand an.

            Bei „System" ist sie gar nicht da, weil dann nichts dahintersteht.
          */}
          {weiter.length > 0 && !offen && (
            <button
              type="button"
              onClick={() => setOffen(true)}
              className="group mb-1 flex min-h-[44px] w-full items-start gap-2.5 border-b border-line/70 py-3 text-left no-tap-highlight"
            >
              <ChevronDown
                size={15}
                className="mt-1 shrink-0 text-ink-faint/45 transition-colors group-hover:text-gold"
              />
              <span>
                <span className="block font-serif text-[17px] leading-snug text-ink transition-colors group-hover:text-gold">
                  {weiter.length} {weiter.length === 1 ? 'weiteres Werkzeug' : 'weitere Werkzeuge'}
                </span>
                <span className="mt-0.5 block font-serif text-[13.5px] italic leading-snug text-ink-muted">
                  {weiter.map((w) => w.title).join(', ')}. Alles da – nur nicht im Weg.
                </span>
              </span>
            </button>
          )}

          <ol>
            {(offen ? weiter : []).map((item) => (
              <AppendixLine key={item.to} {...item} />
            ))}
            <AppendixLine {...kolophon} />
          </ol>

          {/*
            Das Buch zuklappen.

            Kein Home-Knopf und keine Kopfzeile: Es steht hinten im Buch, dort
            wo man ein Buch auch zuschlägt.

            Diese Zeile stand zuerst nur ab dem zweiten Band – „wer eines hat,
            hat kein Regal". Das war ein Denkfehler mit Folgen: Der einzige
            Weg, ein zweites Buch zu beginnen, führt durch die Bibliothek. Wer
            eines hatte, kam nie hin und konnte deshalb nie ein zweites
            anlegen. Die Tür stand hinter sich selbst verschlossen.

            Jetzt ist sie immer da. Nur die zweite Zeile ändert sich: Bei
            einem Band lädt sie ein, bei mehreren sagt sie, wer wartet.
          */}
          {/*
            Der Tischmodus.

            Er erscheint nur, wenn dieses Buch ueberhaupt etwas verbirgt – und
            das ist die ehrlichste Form der schrittweisen Entdeckung: Nicht das
            Profil entscheidet, ob jemand ihn braucht, sondern seine Welt. Wer
            nie ein Geheimnis notiert hat, sieht diese Zeile nie; wer eines
            notiert, findet sie beim naechsten Blick in den Anhang.
          */}
          {verborgen && (
            <section className="mt-12 border-t border-line pt-6">
              <button
                type="button"
                onClick={() => updateSettings({ tischmodus: !settings.tischmodus })}
                className="group flex min-h-[44px] w-full items-start gap-2.5 text-left no-tap-highlight"
              >
                {settings.tischmodus ? (
                  <EyeOff size={15} className="mt-1 shrink-0 text-gold" />
                ) : (
                  <Eye size={15} className="mt-1 shrink-0 text-ink-faint/45 transition-colors group-hover:text-gold" />
                )}
                <span>
                  <span className="block font-serif text-[17px] leading-snug text-ink transition-colors group-hover:text-gold">
                    {settings.tischmodus ? 'Den Tischmodus beenden' : 'Für den Tisch zuklappen'}
                  </span>
                  <span className="mt-0.5 block font-serif text-[13.5px] italic leading-snug text-ink-muted">
                    {settings.tischmodus
                      ? 'Das Buch zeigt gerade nur, was alle sehen dürfen.'
                      : `${verborgen} – im Tischmodus bleibt das zu, wenn du den Bildschirm herumdrehst.`}
                  </span>
                </span>
              </button>
            </section>
          )}

          <section className="mt-12 border-t border-line pt-6">
            <button
              type="button"
              onClick={() => {
                schliesseBuch();
                navigate('/bibliothek');
              }}
              className="group flex min-h-[44px] w-full items-center gap-2.5 text-left no-tap-highlight"
              data-leitfaden="regal"
            >
              <Library
                size={15}
                className="shrink-0 text-ink-faint/45 transition-colors group-hover:text-gold"
              />
              <span>
                <span className="block font-serif text-[17px] leading-snug text-ink transition-colors group-hover:text-gold">
                  Dieses Buch zuklappen
                </span>
                <span className="mt-0.5 block font-serif text-[13.5px] italic leading-snug text-ink-muted">
                  {andereBaende > 0
                    ? `Zurück in deine Bibliothek – ${andereBaende === 1 ? 'ein weiterer Band steht' : `${andereBaende} weitere Bände stehen`} dort und ${andereBaende === 1 ? 'wartet' : 'warten'}.`
                    : 'Zurück in deine Bibliothek. Dort steht dieses Buch – und daneben ist Platz für weitere.'}
                </span>
              </span>
            </button>
          </section>

          <section className="mt-12 border-t border-line pt-6">
            <p className="rubric mb-2">Über diesen Band</p>
            <p className="font-serif text-[14.5px] leading-relaxed text-ink-muted">
              {settings.worldName || 'Dragoncore'} umfasst derzeit {book.totalPages} Seiten in{' '}
              {book.chapters.length} {book.chapters.length === 1 ? 'Kapitel' : 'Kapiteln'}. Alles
              liegt auf diesem Gerät – nichts verlässt es, solange Sie es nicht ausdrücklich
              ausgeben.
            </p>
          </section>
        </div>
      }
    />
  );
}

function AppendixLine({ to, title, note }: AppendixEntry) {
  return (
    <li className="group border-b border-line/70 last:border-b-0">
      <Link to={to} className="block py-3 no-tap-highlight" data-leitfaden={`anhang:${to}`}>
        <p className="font-serif text-[17px] leading-snug text-ink transition-colors group-hover:text-gold">
          {title}
        </p>
        <p className="mt-0.5 font-serif text-[13.5px] italic leading-snug text-ink-muted">{note}</p>
      </Link>
    </li>
  );
}

/**
 * Ein einzelnes breites Blatt für die Werkzeuge des Anhangs.
 *
 * Bewusst keine Doppelseite: Eine Zeitleiste oder ein Prompt-Verzeichnis will
 * Fläche, kein Satzspiegel. Papier und Ränder bleiben trotzdem.
 */
export function AppendixSheet({
  title,
  rubric,
  children,
}: {
  title: string;
  rubric?: string;
  children: ReactNode;
}) {
  const navigate = useNavigate();

  return (
    <div className="mx-auto flex w-full max-w-[1200px] flex-1 justify-center">
      <div className="paper-sheet scroll-slim relative flex min-h-0 w-full flex-col overflow-y-auto overscroll-y-contain">
        <div className="mx-auto w-full max-w-[980px] px-6 pb-12 pt-8 sm:px-12 sm:pt-12">
          <button
            type="button"
            onClick={() => navigate('/anhang')}
            /*
              Mindesthoehe fuer den Finger. Der Weg zurueck steht auf jedem
              Anhangsblatt und ist damit einer der meistbenutzten Knoepfe des
              Buches – als vierzehn Pixel hohe Kursivzeile war er der
              schwierigste. Die Schrift bleibt, die Flaeche waechst.
            */
            className="mb-4 -ml-1 inline-flex min-h-[40px] items-center gap-1.5 px-1 font-serif text-[13px] italic text-ink-faint transition-colors hover:text-gold no-tap-highlight"
          >
            <ArrowLeft size={14} /> Zurück zu den Anhängen
          </button>

          <p className="rubric">{rubric ?? 'Anhang'}</p>
          <h1 className="mt-2 font-serif text-[32px] leading-tight text-ink sm:text-[40px]">
            {title}
          </h1>
          <span aria-hidden className="rule-gild mt-4 mb-8 block w-24 opacity-70" />

          {children}
        </div>
      </div>
    </div>
  );
}
