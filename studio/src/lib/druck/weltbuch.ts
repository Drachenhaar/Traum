/**
 * Die Druckfassung.
 *
 * Kein exportiertes Webinterface. Ein Buch.
 *
 * Der Unterschied steckt in Dingen, die man einzeln kaum bemerkt und zusammen
 * sofort sieht: ein Satzspiegel, der auf jeder Seite gleich steht. Ein
 * Kolumnentitel über und eine Seitenzahl unter jeder Seite. Überschriften, die
 * nicht allein am Fuß einer Seite zurückbleiben. Bilder, die nicht mitten
 * durch den Umbruch fallen. Und Weiß – viel mehr Weiß, als sich auf einem
 * Bildschirm je richtig anfühlen würde.
 *
 * Erzeugt wird eine einzelne, in sich geschlossene HTML-Datei mit CSS Paged
 * Media. Der Browser druckt sie, und daraus wird ein PDF. Das ist kein
 * Notbehelf: `@page`, `break-inside`, `orphans` und `widows` sind genau die
 * Werkzeuge, die ein Setzer braucht, und sie stehen in jedem Browser bereit.
 *
 * Zwei Werkzeuge stehen dort allerdings *nicht* bereit, und beide sind mir
 * erst im fertigen PDF aufgefallen, nicht im Quelltext: `string-set` für
 * mitlaufende Kapitelnamen und `target-counter` für echte Seitenzahlen im
 * Inhaltsverzeichnis. Beides sieht im Stylesheet vollkommen richtig aus und
 * tut in Chromium nichts. Wer hier etwas ergänzt, drucke es einmal aus.
 *
 * Was hier **nicht** vorkommt: Knöpfe, Eingabefelder, Navigation, Verweise,
 * Farben aus der Oberfläche, Schatten. Eine gedruckte Seite hat keinen
 * Hover-Zustand.
 */

import type { Entry, LibraryBook } from '../../types';
import { db } from '../../db/db';
import { blobToDataUrl } from '../images';
import { CHAPTERS, chapterOfType } from '../book';
import { asBool, asList, asText, templateFor } from '../templates';
import { relationsOf, type RelationIndex } from '../relations';
import { colorById } from '../bookIdentity';
import { escapeHtml } from '../utils';

/* ------------------------------------------------------------- Formate ---- */

export interface Format {
  id: string;
  name: string;
  /** Was es ist, in einem Satz – für die Wahl. */
  note: string;
  seite: string;
  /** Ränder: oben, außen, unten, innen. Innen mehr, weil dort gebunden wird. */
  rand: { oben: string; aussen: string; unten: string; innen: string };
  /** Grundschrift und Zeilenabstand. */
  schrift: string;
  zeile: number;
}

export const FORMATE: Format[] = [
  {
    id: 'a4-hoch',
    name: 'A4 hoch',
    note: 'Das übliche Maß. Passt in jeden Drucker und jede Mappe.',
    seite: 'A4 portrait',
    rand: { oben: '24mm', aussen: '20mm', unten: '22mm', innen: '26mm' },
    schrift: '10.5pt',
    zeile: 1.62,
  },
  {
    id: 'a4-quer',
    name: 'A4 quer',
    note: 'Für Welten, die breiter sind als hoch – Karten, Panoramen, Tafeln.',
    seite: 'A4 landscape',
    rand: { oben: '18mm', aussen: '22mm', unten: '18mm', innen: '26mm' },
    schrift: '10.5pt',
    zeile: 1.6,
  },
  {
    id: 'tafelband',
    name: 'Tafelband',
    note: 'Quadratisch, großzügig, für den Tisch. Viel Weiß, große Bilder.',
    seite: '240mm 240mm',
    rand: { oben: '26mm', aussen: '24mm', unten: '26mm', innen: '30mm' },
    schrift: '11pt',
    zeile: 1.7,
  },
];

export function formatById(id: string): Format {
  return FORMATE.find((f) => f.id === id) ?? FORMATE[0];
}

export interface Druckauftrag {
  buch: LibraryBook;
  entries: Entry[];
  index: RelationIndex;
  format: Format;
  /** Bilder einbetten? Ohne sie ist die Datei klein und die Seiten leer. */
  mitBildern: boolean;
  /**
   * Kommt mit, was am Tisch nicht steht?
   *
   * Ausdrücklich ein eigener Schalter und nicht der Tischmodus des Geräts.
   * Ein Ausdruck verlässt den Bildschirm: Er wird weitergereicht, liegt auf
   * einem Tisch, wird vergessen. Was darauf steht, muss beim Drucken
   * entschieden worden sein und nicht davon abhängen, wie das Gerät gerade
   * eingestellt war.
   */
  mitGeheimem: boolean;
}

/* --------------------------------------------------------------- Bilder ---- */

/**
 * Die Bilder, die wirklich gedruckt werden.
 *
 * Nur Titelbilder – ein Buch mit jeder Galerie jedes Eintrags wäre nicht mehr
 * zu handhaben, weder als Datei noch als Papier. Und in voller Auflösung, nicht
 * als Vorschau: Was für den Bildschirm reicht, ist auf Papier ein Raster.
 */
async function bilderLaden(entries: Entry[], mit: boolean): Promise<Map<string, string>> {
  const karte = new Map<string, string>();
  if (!mit) return karte;
  for (const e of entries) {
    if (!e.coverImage || karte.has(e.coverImage)) continue;
    const eintrag = await db.imageBlobs.get(e.coverImage);
    if (eintrag) karte.set(e.coverImage, await blobToDataUrl(eintrag.full));
  }
  return karte;
}

/* ---------------------------------------------------------- Der Satz ------ */

/**
 * Die Felder eines Eintrags, in Buchsprache.
 *
 * Leere Felder fallen weg – ein gedrucktes Buch zeigt keine leeren Zeilen mit
 * Beschriftung. Und Listen werden zu Sätzen mit Semikolon: Aufzählungszeichen
 * sind ein Bildschirmmittel.
 *
 * Entscheidend ist aber die Fallunterscheidung nach `kind`, und die hat hier
 * zuerst gefehlt. Jedes Feld wurde stumpf als Text ausgegeben – was für
 * Fließtext richtig ist und für alles andere falsch:
 *
 *   Eine Farbpalette erschien als `#3a5f2b|Moosgrün; #c9bda8|Nebelsand`.
 *   Ein Verweis auf eine andere Seite erschien als ihre Id.
 *   Eine Bildliste erschien als `img_k3f9x2`.
 *
 * Auf dem Bildschirm wäre das aufgefallen, weil man dort weiterklickt. Auf
 * Papier steht es einfach da – gedruckt, gebunden, für immer. Deshalb wird
 * hier lieber ein Feld zu viel weggelassen als eine Id zu viel gesetzt.
 */
function felder(entry: Entry, byId: Map<string, Entry>): string {
  const tpl = templateFor(entry.type);
  const zeilen = tpl.fields
    .map((f) => {
      const roh = entry.fields[f.key];
      let wert: string;

      switch (f.kind) {
        case 'images':
          /* Nur das Titelbild wird gedruckt; der Rest wäre eine Liste von Ids. */
          return '';
        case 'palette':
          /* Die Namen, nicht die Zahlen – die Zahlen stehen hinten in der Farbtafel. */
          wert = asList(roh)
            .map((s) => s.split('|').slice(1).join('|').trim())
            .filter(Boolean)
            .join('; ');
          break;
        case 'entries':
          /* Ids in Titel übersetzen. Was nicht mitgedruckt wird, fällt weg. */
          wert = asList(roh)
            .map((id) => byId.get(id)?.title ?? '')
            .filter(Boolean)
            .join('; ');
          break;
        case 'boolean':
          /* Nur wenn es zutrifft. „Nein" ist keine Auskunft, sondern eine Zeile. */
          wert = asBool(roh) ? 'Ja' : '';
          break;
        default:
          wert = Array.isArray(roh) ? roh.filter(Boolean).join('; ') : asText(roh);
      }

      if (!wert.trim()) return '';
      return `<div class="feld"><dt>${escapeHtml(f.label)}</dt><dd>${escapeHtml(wert).replace(/\n/g, '<br />')}</dd></div>`;
    })
    .filter(Boolean);
  return zeilen.length ? `<dl class="felder">${zeilen.join('')}</dl>` : '';
}

/**
 * Die Verbindungen eines Eintrags.
 *
 * Als fortlaufender Satz, nicht als Liste: „Lebt in Mooshalde. Besteht aus
 * Nebeleichenholz." Ein Beziehungsdiagramm auf Papier wäre ein Schaubild ohne
 * Interaktion, also ein Rätsel.
 */
function verbindungen(entry: Entry, index: RelationIndex, byId: Map<string, Entry>): string {
  const liste = relationsOf(index, entry.id)
    .map((r) => {
      const anderes = byId.get(r.otherId);
      if (!anderes) return '';
      return `${escapeHtml(r.label)} <span class="ziel">${escapeHtml(anderes.title)}</span>`;
    })
    .filter(Boolean);
  if (!liste.length) return '';
  return `<p class="verbindungen">${liste.join(' · ')}</p>`;
}

/* ------------------------------------------------------------ Farbtafel ---- */

/**
 * Die Farben der Welt, gesammelt.
 *
 * Jede Farbe, die irgendwo in einer Palette oder auf einem Materialblock
 * steht, mit der Zahl ihrer Vorkommen. Was am häufigsten auftaucht, steht
 * vorn – so entsteht ohne Zutun eine Farbtafel, die tatsächlich beschreibt,
 * wie die Welt aussieht, und nicht, welche Farbe zuletzt gewählt wurde.
 *
 * Auf Papier ist das die klassische Farbtafel hinten im Band. Auf dem
 * Bildschirm wäre sie eine Spielerei; gedruckt ist sie ein Werkzeug, weil man
 * sie neben eine Zeichnung legen kann.
 */
interface Farbfeld {
  color: string;
  name: string;
  count: number;
}

function farbtafel(entries: Entry[]): Farbfeld[] {
  const gefunden = new Map<string, Farbfeld>();
  const merke = (color: string, name: string) => {
    /* Nur echte Hex-Werte – alles andere landete sonst als Textfarbe im Satz. */
    if (!/^#[0-9a-f]{6}$/i.test(color)) return;
    const key = color.toLowerCase();
    const treffer = gefunden.get(key);
    if (treffer) treffer.count += 1;
    else gefunden.set(key, { color, name: name.trim(), count: 1 });
  };

  for (const entry of entries) {
    asList(entry.fields.palette).forEach((roh) => {
      const [color, ...rest] = roh.split('|');
      merke(color, rest.join('|'));
    });
    entry.blocks.forEach((b) => {
      b.data.swatches?.forEach((s) => merke(s.color, s.name));
      b.data.materials?.forEach((m) => merke(m.color, m.name));
    });
  }

  return [...gefunden.values()].sort((a, b) => b.count - a.count).slice(0, 40);
}

function eintragSeite(
  entry: Entry,
  index: RelationIndex,
  byId: Map<string, Entry>,
  bilder: Map<string, string>,
  mitGeheimem: boolean,
): string {
  const tpl = templateFor(entry.type);
  const bild = entry.coverImage ? bilder.get(entry.coverImage) : undefined;
  const zeit =
    entry.beginn?.trim() || entry.ende?.trim()
      ? `<p class="zeit">${escapeHtml(
          [entry.beginn?.trim(), entry.ende?.trim()].filter(Boolean).join(' – '),
        )}</p>`
      : '';

  return `<article class="eintrag">
  <p class="rubrik">${escapeHtml(tpl.label)}${entry.category ? ` · ${escapeHtml(entry.category)}` : ''}</p>
  <h3>${escapeHtml(entry.title)}</h3>
  ${entry.subtitle?.trim() ? `<p class="unter">${escapeHtml(entry.subtitle)}</p>` : ''}
  ${zeit}
  ${bild ? `<figure><img src="${bild}" alt="" />${entry.subtitle?.trim() ? `<figcaption>${escapeHtml(entry.title)}</figcaption>` : ''}</figure>` : ''}
  ${entry.description?.trim() ? `<p class="lauf">${escapeHtml(entry.description).replace(/\n\n+/g, '</p><p class="lauf">').replace(/\n/g, '<br />')}</p>` : ''}
  ${felder(entry, byId)}
  ${
    mitGeheimem && entry.geheim?.text?.trim()
      ? `<aside class="geheim"><p class="rubrik">Nur für die Leitung</p>${entry.geheim.text
          .split(/\n\n+/)
          .map((abs) => `<p>${escapeHtml(abs).replace(/\n/g, '<br />')}</p>`)
          .join('')}</aside>`
      : ''
  }
  ${verbindungen(entry, index, byId)}
</article>`;
}

/**
 * Ein Text, der in `content: "…"` stehen darf.
 *
 * Der Kolumnentitel ist die einzige Stelle, an der Buchtext in *CSS* landet
 * statt in HTML – und dort schützt `escapeHtml` nicht. Ein Buch namens
 * `Der "Nebelwald"` beendete die Zeichenkette mitten im Stylesheet und nähme
 * alles Folgende mit: Satzspiegel, Umbrüche, Farben. Zwei Zeichen sind zu
 * maskieren, und beide sind hier gemeint.
 */
function cssText(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

/* ------------------------------------------------------------ Das Ganze ---- */

export async function druckfassung(auftrag: Druckauftrag): Promise<string> {
  const { buch, entries, index, format, mitBildern, mitGeheimem } = auftrag;
  /*
   * Ohne Geheimes faellt eine ganz verborgene Seite hier heraus – vor dem
   * Inhaltsverzeichnis, vor der Seitenzaehlung, vor allem. Sie erst beim
   * Setzen zu ueberspringen haette sie im Inhalt stehen lassen.
   */
  const lebende = entries.filter(
    (e) => !e.deletedAt && (mitGeheimem || !e.geheim?.ganzeSeite),
  );
  const byId = new Map(lebende.map((e) => [e.id, e]));
  const bilder = await bilderLaden(lebende, mitBildern);
  const farbe = colorById(buch.coverColor);
  const tafel = farbtafel(lebende);

  /* Nach Kapiteln, in der Reihenfolge des Buches. Leere Kapitel fallen weg. */
  const kapitel = CHAPTERS.map((k) => ({
    def: k,
    eintraege: lebende
      .filter((e) => chapterOfType(e.type).id === k.id)
      .sort((a, b) =>
        (a.category || '').localeCompare(b.category || '', 'de') ||
        a.title.localeCompare(b.title, 'de'),
      ),
  })).filter((k) => k.eintraege.length > 0);

  const jahr = new Date().getFullYear();
  const kolumne = cssText(buch.title);

  return `<!doctype html>
<html lang="de">
<head>
<meta charset="utf-8" />
<title>${escapeHtml(buch.title)}</title>
<style>
/* ------------------------------------------------------------ Der Bogen */

@page {
  size: ${format.seite};
  margin: ${format.rand.oben} ${format.rand.aussen} ${format.rand.unten} ${format.rand.innen};

  /*
   * Kolumnentitel und Seitenzahl.
   *
   * Hier stand der Kapitelname, gesetzt ueber »string-set« und ausgelesen mit
   * »content: string(kapitel)«. Das ist die richtige Loesung – jede Seite
   * wuesste selbst, in welchem Kapitel sie steht – und sie stand vier Stunden
   * lang im Buch, ohne je etwas anzuzeigen: Chromium kennt »string-set« nicht.
   * Kein Fehler, keine Meldung, nur eine leere Zeile ueber jeder Seite.
   *
   * Jetzt steht der Buchtitel dort, fest eingesetzt. Das ist ein Kolumnentitel,
   * wie ihn die meisten Baende tragen, und er erscheint tatsaechlich. Ein
   * schlechterer Kolumnentitel, den man sieht, ist besser als ein besserer,
   * den es nicht gibt.
   */
  @top-center {
    content: "${kolumne}";
    font-family: Georgia, 'Times New Roman', serif;
    font-size: 8pt;
    font-style: italic;
    letter-spacing: 0.08em;
    color: #8a7a63;
  }
  @bottom-center {
    content: counter(page);
    font-family: Georgia, 'Times New Roman', serif;
    font-size: 9pt;
    color: #8a7a63;
  }
}

/*
 * Der Umschlag: randlos, ohne Kolumne, ohne Seitenzahl.
 *
 * Diese elf Zeilen haben zwei Anlaeufe gebraucht, und der erste sah im
 * Quelltext richtiger aus als der zweite. Er lautete »@page umschlag, :blank«
 * – der Gedanke war, Leerseiten gleich mitzunehmen. Chromium kennt »:blank«
 * nicht, und ein Browser, der ein Glied einer Auswahlliste nicht versteht,
 * verwirft die *ganze* Regel. Wortlos. Das Ergebnis war ein Einband, der im
 * Satzspiegel schwebte, mit einer goldenen Eins darunter.
 *
 * Deshalb steht hier nur, was jeder Browser sicher versteht. Eine Regel, die
 * still ausfaellt, ist schlimmer als eine, die fehlt.
 */
@page umschlag {
  margin: 0;
  @top-center { content: ''; }
  @bottom-center { content: ''; }
}

/*
 * Kapitelanfaenge tragen keinen Kolumnentitel.
 *
 * Alte Setzerregel, und sie hat einen Grund: Der Kolumnentitel sagt, wo man
 * ist. Auf einer Seite, die den Kapitelnamen in Vierundzwanzig-Punkt traegt,
 * sagt er nichts mehr. Die Seitenzahl bleibt – die braucht man auch dort.
 */
@page kapitelanfang {
  @top-center { content: ''; }
}

/* --------------------------------------------------------------- Grund */

html { font-family: Georgia, 'Times New Roman', serif; }
body {
  margin: 0;
  font-size: ${format.schrift};
  line-height: ${format.zeile};
  color: #23201c;
  text-align: left;
}

/*
 * Blocksatz nur fuer den Lauftext.
 *
 * Zuerst stand er auf »body« und galt damit auch fuer Kapitelvorspann,
 * Fragenlisten und Kolophon – kurze Absaetze in schmalem Satz. Genau dort
 * reisst Blocksatz die Loecher, die man ihm nachsagt: »Die  Farben,  die  in
 * dieser  Welt«. Ein langer Absatz vertraegt ihn, drei Zeilen vertragen ihn
 * nicht.
 *
 * Die Silbentrennung gehoert dazu und nicht daneben: Blocksatz ohne Trennung
 * ist der Grund, warum Blocksatz einen schlechten Ruf hat.
 */
.lauf {
  text-align: justify;
  hyphens: auto;
  -webkit-hyphens: auto;
}

/*
 * Keine Schusterjungen, keine Hurenkinder.
 *
 * Zwei Zeilen bleiben immer beisammen – eine einzelne Zeile, die allein auf
 * die naechste Seite rutscht, ist der sichtbarste Unterschied zwischen
 * gesetzt und ausgedruckt.
 */
p { orphans: 2; widows: 2; margin: 0 0 0.62em; }

/* --------------------------------------------------------- Der Umschlag */

.umschlag {
  page: umschlag;
  break-after: page;
  height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  background: ${farbe.tint};
  color: ${farbe.foil};
}
.umschlag h1 {
  font-size: 32pt;
  font-weight: normal;
  letter-spacing: 0.02em;
  margin: 0 2cm;
  line-height: 1.2;
}
.umschlag .linie {
  width: 4cm;
  height: 1px;
  background: ${farbe.foil};
  opacity: 0.65;
  margin: 1.2cm 0;
}
.umschlag p { font-size: 11pt; font-style: italic; opacity: 0.8; margin: 0 3cm; text-align: center; }

/* ------------------------------------------------------- Das Titelblatt */

.titelblatt {
  page: umschlag;
  break-after: page;
  height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 0 3cm;
}
.titelblatt h1 { font-size: 26pt; font-weight: normal; margin: 0 0 0.4cm; }
.titelblatt p { text-align: center; font-style: italic; color: #6b6055; }
.titelblatt .fuss { margin-top: 3cm; font-size: 9pt; font-style: normal; color: #8a7a63; }

/* ------------------------------------------------- Das Inhaltsverzeichnis */

.inhalt { break-after: page; }
.inhalt h2 { font-size: 15pt; font-weight: normal; margin: 0 0 1cm; letter-spacing: 0.1em; text-transform: uppercase; }
.inhalt ol { list-style: none; padding: 0; margin: 0; }
.inhalt li {
  display: flex;
  align-items: baseline;
  gap: 0.4em;
  margin-bottom: 0.5em;
  text-align: left;
}
.inhalt .punkte { flex: 1; border-bottom: 1px dotted #c9bda8; transform: translateY(-0.25em); }
.inhalt .zahl { color: #8a7a63; font-size: 9.5pt; }

/* ------------------------------------------------------ Der Kapiteltrenner */

.trenner {
  page: kapitelanfang;
  break-before: page;
  break-after: page;
  height: 78vh;
  display: flex;
  flex-direction: column;
  justify-content: center;
  text-align: left;
}
.trenner .zahl { font-size: 9pt; letter-spacing: 0.22em; text-transform: uppercase; color: #8a7a63; }
.trenner h2 { font-size: 24pt; font-weight: normal; margin: 0.3cm 0 0; }
.trenner .strich { width: 3cm; height: 1px; background: ${farbe.edge}; opacity: 0.6; margin: 0.8cm 0; }
.trenner .intro { max-width: 34em; font-style: italic; color: #4a4239; }
/*
 * Die Fragen ohne Aufzaehlungszeichen.
 *
 * Ein Punkt vor jeder Zeile macht aus Fragen eine Checkliste, und eine
 * Checkliste will abgehakt werden. Diese Fragen will niemand abhaken.
 */
.trenner .fragen { margin-top: 1.2cm; max-width: 32em; font-size: 9.5pt; color: #6b6055; list-style: none; padding: 0; }
.trenner .fragen li { margin-bottom: 0.5em; }

/* ------------------------------------------------------------ Die Einträge */

/*
 * Der wichtigste Absatz dieses Stylesheets.
 *
 * »break-inside: avoid« haelt einen Eintrag zusammen – er ist eine Einheit,
 * kein Textstrom. Faellt er nicht ganz auf die Seite, rutscht er als Ganzes
 * auf die naechste. Das kostet Weiss und ist genau richtig: Ein Eintrag, der
 * ueber den Umbruch zerrissen wird, ist zwei halbe Eintraege.
 */
.eintrag {
  break-inside: avoid;
  margin-bottom: 1.1cm;
  padding-bottom: 0.8cm;
  border-bottom: 1px solid #e6dcc8;
}
.eintrag:last-child { border-bottom: 0; }
.eintrag h3 {
  font-size: 14pt;
  font-weight: normal;
  margin: 0.1cm 0 0;
  break-after: avoid;   /* Keine Ueberschrift allein am Seitenfuss. */
  text-align: left;
}
.rubrik {
  font-size: 8pt;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: #8a7a63;
  margin: 0;
  text-align: left;
}
.unter { font-style: italic; color: #6b6055; margin: 0.1cm 0 0; text-align: left; }
.zeit { font-size: 9pt; color: #8a7a63; margin: 0.15cm 0 0; text-align: left; }
.lauf { margin-top: 0.4cm; }

figure { margin: 0.5cm 0; break-inside: avoid; text-align: center; }
figure img { max-width: 100%; max-height: 11cm; object-fit: contain; }
figcaption { font-size: 8.5pt; font-style: italic; color: #8a7a63; margin-top: 0.2cm; text-align: center; }

.felder { margin: 0.45cm 0 0; }
.feld { break-inside: avoid; margin-bottom: 0.28em; display: flex; gap: 0.6em; }
.feld dt {
  flex: 0 0 26%;
  font-size: 8.5pt;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: #8a7a63;
  text-align: left;
}
.feld dd { flex: 1; margin: 0; text-align: left; }

.verbindungen {
  margin-top: 0.4cm;
  font-size: 9pt;
  color: #6b6055;
  text-align: left;
}
.verbindungen .ziel { color: #23201c; }

/* ------------------------------------------------------------ Die Farbtafel */

.farbtafel { break-before: page; }
.farbtafel h2 { font-size: 13pt; font-weight: normal; letter-spacing: 0.1em; text-transform: uppercase; margin: 0 0 0.3cm; }
.farbtafel .vorspann { max-width: 28em; color: #6b6055; font-size: 9.5pt; margin-bottom: 0.9cm; }
.tafel { display: grid; grid-template-columns: repeat(4, 1fr); gap: 0.5cm; }
/* »figure« traegt oben Rand und Mittelachse – beides ist hier falsch. */
.farbe { break-inside: avoid; margin: 0; text-align: left; }
/*
 * Der Rahmen ist kein Zierat.
 *
 * Ein sehr helles Feld waere auf weissem Papier randlos – man saehe die
 * Flaeche nicht, nur die Beschriftung darunter. Eine duenne graue Linie kostet
 * nichts und macht jedes Feld zu einem Feld.
 */
.farbe .flaeche { height: 2.2cm; border: 0.4pt solid #d8cfbc; }
.farbe .name { font-size: 8pt; margin: 0.15cm 0 0; text-align: left; }
.farbe .wert { font-size: 7.5pt; letter-spacing: 0.06em; color: #8a7a63; margin: 0; text-align: left; text-transform: uppercase; }

/*
 * Was nur die Leitung liest.
 *
 * Auf Papier sichtbar eingefasst und beschriftet – anders als am Bildschirm,
 * wo es im Tischmodus spurlos verschwindet. Ein Ausdruck wird nicht
 * herumgedreht; er wird weggelegt oder nicht gedruckt.
 */
.geheim {
  break-inside: avoid;
  margin: 0.45cm 0 0;
  border-left: 2pt solid #c9bda8;
  padding-left: 0.5cm;
  color: #4a4239;
}
.geheim p { text-align: left; }

.kolophon { break-before: page; }
.kolophon h2 { font-size: 13pt; font-weight: normal; letter-spacing: 0.1em; text-transform: uppercase; margin: 0 0 0.8cm; }
.kolophon p { max-width: 30em; color: #4a4239; }

/*
 * Am Bildschirm: der Bogen auf dem Tisch.
 *
 * Wer die Datei nur oeffnet, statt sie zu drucken, soll trotzdem ein Buch
 * sehen und nicht eine randlose Textwand. Beim Drucken faellt das alles weg.
 */
@media screen {
  body { background: #3a3229; padding: 2cm 0; }
  .bogen {
    background: #fdfaf3;
    max-width: 21cm;
    margin: 0 auto;
    padding: ${format.rand.oben} ${format.rand.aussen} ${format.rand.unten} ${format.rand.innen};
    box-shadow: 0 4px 40px rgba(0,0,0,0.45);
  }
  .umschlag, .titelblatt, .trenner { height: auto; padding-top: 4cm; padding-bottom: 4cm; }
}
</style>
</head>
<body>
<div class="bogen">

<!-- ------------------------------------------------------- Der Umschlag -->
<section class="umschlag">
  <h1>${escapeHtml(buch.title)}</h1>
  <span class="linie"></span>
  ${buch.subtitle?.trim() ? `<p>${escapeHtml(buch.subtitle)}</p>` : ''}
</section>

<!-- ------------------------------------------------------ Das Titelblatt -->
<section class="titelblatt">
  <h1>${escapeHtml(buch.title)}</h1>
  ${buch.subtitle?.trim() ? `<p>${escapeHtml(buch.subtitle)}</p>` : ''}
  <p class="fuss">
    ${escapeHtml(buch.worldName || buch.title)}${buch.owner?.trim() ? ` · aufgezeichnet von ${escapeHtml(buch.owner)}` : ''}<br />
    ${lebende.length} ${lebende.length === 1 ? 'Eintrag' : 'Einträge'} in ${kapitel.length} ${kapitel.length === 1 ? 'Kapitel' : 'Kapiteln'} · ${jahr}
  </p>
</section>

<!-- ------------------------------------------------ Das Inhaltsverzeichnis -->
<section class="inhalt">
  <h2>Inhalt</h2>
  <ol>
    ${kapitel
      .map(
        /*
         * Hinter der Punktlinie steht die Zahl der Eintraege – und deshalb
         * steht auch das Wort dabei.
         *
         * Ohne das Wort liest jeder Mensch dort eine Seitenzahl, weil an
         * dieser Stelle in jedem Buch der Welt eine Seitenzahl steht. Eine
         * echte waere besser; sie braucht »target-counter«, und das kann kein
         * Browser. Eine falsche Seitenzahl waere schlimmer als gar keine.
         */
        (k) =>
          `<li><span>${escapeHtml(k.def.title)}</span><span class="punkte"></span><span class="zahl">${k.eintraege.length} ${k.eintraege.length === 1 ? 'Eintrag' : 'Einträge'}</span></li>`,
      )
      .join('\n    ')}
  </ol>
</section>

${kapitel
  .map(
    (k, i) => `
<!-- ${escapeHtml(k.def.title)} -->
<section class="trenner">
  <p class="zahl">Kapitel ${i + 1}</p>
  <h2>${escapeHtml(k.def.title)}</h2>
  <span class="strich"></span>
  <p class="intro">${escapeHtml(k.def.intro)}</p>
  ${
    k.def.questions?.length
      ? `<ul class="fragen">${k.def.questions.map((f) => `<li>${escapeHtml(f)}</li>`).join('')}</ul>`
      : ''
  }
</section>
<section class="kapitel">
${k.eintraege.map((e) => eintragSeite(e, index, byId, bilder, mitGeheimem)).join('\n')}
</section>`,
  )
  .join('\n')}

${
  tafel.length
    ? `
<!-- --------------------------------------------------------- Die Farbtafel -->
<section class="farbtafel">
  <h2>Farbtafel</h2>
  <p class="vorspann">
    Die Farben, die in dieser Welt vorkommen – nach Häufigkeit geordnet, so wie
    sie in den Paletten und Materialien der Einträge stehen.
  </p>
  <div class="tafel">
    ${tafel
      .map(
        (f) => `<figure class="farbe">
      <div class="flaeche" style="background:${escapeHtml(f.color)}"></div>
      ${f.name ? `<p class="name">${escapeHtml(f.name)}</p>` : ''}
      <p class="wert">${escapeHtml(f.color)}</p>
    </figure>`,
      )
      .join('\n    ')}
  </div>
</section>`
    : ''
}

<!-- --------------------------------------------------------- Das Kolophon -->
<section class="kolophon">
  <h2>Über dieses Buch</h2>
  <p>
    ${escapeHtml(buch.title)}${buch.subtitle?.trim() ? ` – ${escapeHtml(buch.subtitle)}` : ''}.
    ${lebende.length} ${lebende.length === 1 ? 'Eintrag' : 'Einträge'},
    ${kapitel.length} ${kapitel.length === 1 ? 'Kapitel' : 'Kapitel'}.
    Gesetzt am ${new Date().toLocaleDateString('de-DE')} im Format ${escapeHtml(format.name)}.
  </p>
  <p>
    Geschrieben in Dragoncore. Alles daran ist auf einem Gerät entstanden und
    hat es nie verlassen, bis zu dieser Seite.
  </p>
</section>

</div>
</body>
</html>`;
}
