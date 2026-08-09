/**
 * Den Roman aus dem Haus lassen.
 *
 * Ein Manuskript, das nur in Dragoncore existiert, gehoert Dragoncore. Das
 * waere das Gegenteil von dem, was dieses Programm verspricht. Also gibt es
 * hier vier Wege hinaus, und alle vier erzeugen etwas, das ohne Dragoncore
 * vollstaendig ist:
 *
 *   Text      – reiner Fliesstext, oeffnet sich ueberall
 *   Markdown  – mit Gliederung, fuer alles Weitere
 *   DOCX      – fuer Lektorat, Verlag, Word
 *   Druck     – die Druckansicht des Browsers, und damit PDF
 *
 * Was hier bewusst **nicht** steht: EPUB, Satzspiegel, Schriftwahl,
 * Titelei, Impressum, Kapitelvignetten. Das waere ein halber
 * Veroeffentlichungsweg, und ein halber ist schlechter als keiner – er
 * verspricht ein Ergebnis, das man am Ende doch von Hand nacharbeitet.
 */

import type { Entry } from '../../types';
import { asText } from '../templates';
import { escapeHtml } from '../utils';
import { zip } from './zip';
import { roemisch, szeneWoerter, type RomanBaum } from './struktur';

export type Ausgabeform = 'text' | 'markdown' | 'docx';

/** Absaetze einer Szene – Leerzeilen trennen, Leeres faellt weg. */
function absaetze(szene: Entry): string[] {
  return asText(szene.fields.manuskript)
    .split(/\n{2,}/)
    .map((p) => p.replace(/\s+\n/g, '\n').trim())
    .filter(Boolean);
}

/**
 * Wie ein Kapitel ueberschrieben wird.
 *
 * Traegt es einen eigenen Titel, steht die Zahl darueber und der Titel
 * darunter. Heisst es nur „Kapitel 3", waere beides dasselbe – dann bleibt
 * die Zahl allein.
 */
function kapitelKopf(titel: string, nummer: number): { zahl: string; titel: string } {
  const zahl = `Kapitel ${roemisch(nummer)}`;
  const eigen = titel.trim();
  const nurZahl = !eigen || /^kapitel\s+[\divxlcm]+$/i.test(eigen);
  return { zahl, titel: nurZahl ? '' : eigen };
}

/* ------------------------------------------------------------------- Text */

export function alsText(baum: RomanBaum): string {
  const zeilen: string[] = [baum.roman.title.trim()];
  if (baum.roman.subtitle.trim()) zeilen.push(baum.roman.subtitle.trim());
  zeilen.push('', '');

  baum.kapitel.forEach(({ kapitel, szenen }, i) => {
    const kopf = kapitelKopf(kapitel.title, i + 1);
    zeilen.push(kopf.zahl);
    if (kopf.titel) zeilen.push(kopf.titel);
    zeilen.push('');

    szenen.forEach((szene, si) => {
      /* Szenentrenner statt Szenentiteln: Der Leser kennt keine Szenen. */
      if (si > 0) zeilen.push('*', '');
      for (const p of absaetze(szene)) zeilen.push(p, '');
    });
    zeilen.push('');
  });

  if (baum.lose.length) {
    zeilen.push('Ohne Kapitel', '');
    for (const szene of baum.lose) for (const p of absaetze(szene)) zeilen.push(p, '');
  }
  return zeilen.join('\n').replace(/\n{4,}/g, '\n\n\n').trimEnd() + '\n';
}

/* --------------------------------------------------------------- Markdown */

export function alsMarkdown(baum: RomanBaum): string {
  const zeilen: string[] = [`# ${baum.roman.title.trim()}`];
  if (baum.roman.subtitle.trim()) zeilen.push('', `*${baum.roman.subtitle.trim()}*`);
  zeilen.push('');

  baum.kapitel.forEach(({ kapitel, szenen }, i) => {
    const kopf = kapitelKopf(kapitel.title, i + 1);
    zeilen.push('', `## ${kopf.titel ? `${kopf.zahl} — ${kopf.titel}` : kopf.zahl}`, '');
    szenen.forEach((szene, si) => {
      if (si > 0) zeilen.push('* * *', '');
      for (const p of absaetze(szene)) zeilen.push(p, '');
    });
  });

  if (baum.lose.length) {
    zeilen.push('', '## Ohne Kapitel', '');
    for (const szene of baum.lose) for (const p of absaetze(szene)) zeilen.push(p, '');
  }
  return zeilen.join('\n').replace(/\n{4,}/g, '\n\n\n').trimEnd() + '\n';
}

/* ------------------------------------------------------------------- DOCX */

/** XML maskieren – `escapeHtml` deckt genau die fuenf noetigen Zeichen ab. */
const x = (s: string) => escapeHtml(s).replace(/'/g, '&apos;');

/**
 * Ein Absatz in WordprocessingML.
 *
 * Direkte Formatierung statt einer `styles.xml`: Die Datei bleibt so klein
 * und ihre Struktur nachvollziehbar, und Word wendet beim Oeffnen ohnehin
 * seine eigenen Vorlagen an. `outlineLvl` ist der Teil, auf den es ankommt –
 * daran haengt der Navigationsbereich, mit dem ein Lektor durch das
 * Manuskript springt.
 */
function absatz(text: string, art: 'titel' | 'kapitel' | 'text' | 'trenner'): string {
  const stil = {
    titel: '<w:jc w:val="center"/><w:spacing w:before="0" w:after="480"/>',
    kapitel: '<w:outlineLvl w:val="0"/><w:pageBreakBefore/><w:jc w:val="center"/><w:spacing w:before="0" w:after="360"/>',
    text: '<w:spacing w:after="0" w:line="480" w:lineRule="auto"/><w:ind w:firstLine="425"/>',
    trenner: '<w:jc w:val="center"/><w:spacing w:before="240" w:after="240"/>',
  }[art];
  const lauf = {
    titel: '<w:rPr><w:b/><w:sz w:val="48"/></w:rPr>',
    kapitel: '<w:rPr><w:b/><w:sz w:val="32"/></w:rPr>',
    text: '<w:rPr><w:sz w:val="24"/></w:rPr>',
    trenner: '<w:rPr><w:sz w:val="24"/></w:rPr>',
  }[art];
  return `<w:p><w:pPr>${stil}</w:pPr><w:r>${lauf}<w:t xml:space="preserve">${x(text)}</w:t></w:r></w:p>`;
}

export function alsDocx(baum: RomanBaum): Blob {
  const p: string[] = [absatz(baum.roman.title.trim(), 'titel')];
  if (baum.roman.subtitle.trim()) p.push(absatz(baum.roman.subtitle.trim(), 'titel'));

  const kapitelStuecke = (kapitel: Entry, szenen: Entry[], nummer: number) => {
    const kopf = kapitelKopf(kapitel.title, nummer);
    p.push(absatz(kopf.titel ? `${kopf.zahl} — ${kopf.titel}` : kopf.zahl, 'kapitel'));
    szenen.forEach((szene, si) => {
      if (si > 0) p.push(absatz('* * *', 'trenner'));
      for (const abs of absaetze(szene)) p.push(absatz(abs, 'text'));
    });
  };

  baum.kapitel.forEach(({ kapitel, szenen }, i) => kapitelStuecke(kapitel, szenen, i + 1));
  if (baum.lose.length) {
    p.push(absatz('Ohne Kapitel', 'kapitel'));
    for (const szene of baum.lose) for (const abs of absaetze(szene)) p.push(absatz(abs, 'text'));
  }

  const dokument =
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">' +
    `<w:body>${p.join('')}` +
    /* A4 mit klassischem Manuskriptrand – 2,5 cm rundum, in Twips. */
    '<w:sectPr><w:pgSz w:w="11906" w:h="16838"/>' +
    '<w:pgMar w:top="1417" w:right="1417" w:bottom="1417" w:left="1417"/></w:sectPr>' +
    '</w:body></w:document>';

  return zip([
    {
      name: '[Content_Types].xml',
      inhalt:
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
        '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
        '<Default Extension="xml" ContentType="application/xml"/>' +
        '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>' +
        '</Types>',
    },
    {
      name: '_rels/.rels',
      inhalt:
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
        '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>' +
        '</Relationships>',
    },
    { name: 'word/document.xml', inhalt: dokument },
  ]);
}

/* ------------------------------------------------------------------ Druck */

/**
 * Die Druckansicht – und damit PDF, ueber den Weg, den jeder kennt.
 *
 * Kein eigener PDF-Erzeuger. Der Browser kann das seit zwanzig Jahren, kennt
 * die Papierformate des Benutzers und bricht Seiten richtig um. Was hier
 * gebaut wird, ist nur die Vorlage: Satzspiegel, Kapitelumbrueche,
 * Einzuege.
 */
export function alsDruckHtml(baum: RomanBaum): string {
  const stuecke: string[] = [];
  stuecke.push(`<h1 class="titel">${escapeHtml(baum.roman.title)}</h1>`);
  if (baum.roman.subtitle.trim())
    stuecke.push(`<p class="untertitel">${escapeHtml(baum.roman.subtitle)}</p>`);

  baum.kapitel.forEach(({ kapitel, szenen }, i) => {
    const kopf = kapitelKopf(kapitel.title, i + 1);
    stuecke.push(
      `<h2><span class="zahl">${escapeHtml(kopf.zahl)}</span>` +
        (kopf.titel ? `<span class="name">${escapeHtml(kopf.titel)}</span>` : '') +
        '</h2>',
    );
    szenen.forEach((szene, si) => {
      if (si > 0) stuecke.push('<p class="trenner">* * *</p>');
      absaetze(szene).forEach((abs, ai) =>
        stuecke.push(`<p${ai === 0 ? ' class="erster"' : ''}>${escapeHtml(abs)}</p>`),
      );
    });
  });

  return `<!doctype html><html lang="de"><head><meta charset="utf-8">
<title>${escapeHtml(baum.roman.title)}</title>
<style>
  @page { size: A4; margin: 25mm 22mm; }
  body { font-family: 'Iowan Old Style', Georgia, serif; font-size: 12pt; line-height: 1.7;
         color: #1c1712; margin: 0; hyphens: auto; }
  .titel { font-size: 28pt; font-weight: 400; text-align: center; margin: 30mm 0 6mm; }
  .untertitel { text-align: center; font-style: italic; margin: 0 0 24mm; }
  h2 { page-break-before: always; text-align: center; font-weight: 400;
       margin: 0 0 14mm; }
  h2 .zahl { display: block; font-size: 10pt; letter-spacing: 0.22em;
             text-transform: uppercase; color: #6b5220; }
  h2 .name { display: block; font-size: 20pt; margin-top: 3mm; }
  p { margin: 0; text-indent: 1.6em; orphans: 2; widows: 2; }
  p.erster, p.trenner + p { text-indent: 0; }
  p.trenner { text-indent: 0; text-align: center; margin: 1.2em 0; letter-spacing: 0.5em; }
</style></head><body>${stuecke.join('\n')}</body></html>`;
}

/* ------------------------------------------------------------------- Namen */

/** Ein Dateiname, der auf jedem Dateisystem lebt. */
export function dateiname(titel: string, endung: string): string {
  const sauber = titel
    .trim()
    .replace(/[äÄ]/g, 'ae')
    .replace(/[öÖ]/g, 'oe')
    .replace(/[üÜ]/g, 'ue')
    .replace(/ß/g, 'ss')
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .slice(0, 60);
  return `${sauber || 'roman'}.${endung}`;
}

/** Kurzer Bericht ueber den Umfang – erscheint neben den Ausgabeknoepfen. */
export function umfang(baum: RomanBaum): string {
  const szenen = [...baum.kapitel.flatMap((k) => k.szenen), ...baum.lose];
  const w = szenen.reduce((s, e) => s + szeneWoerter(e), 0);
  const teile = [
    `${baum.kapitel.length} ${baum.kapitel.length === 1 ? 'Kapitel' : 'Kapitel'}`,
    `${szenen.length} ${szenen.length === 1 ? 'Szene' : 'Szenen'}`,
    `${w.toLocaleString('de-DE')} ${w === 1 ? 'Wort' : 'Wörter'}`,
  ];
  return teile.join(' · ');
}
