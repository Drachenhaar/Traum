// Prueft, ob die selbstgebaute .docx wirklich ein gueltiges ZIP mit gueltigem XML ist.
import { execSync } from 'child_process';
import { ARBEIT } from './arbeit.mjs';
import { writeFileSync } from 'fs';
const S = ARBEIT;
execSync(`npx esbuild src/lib/roman/ausgabe.ts --bundle --format=esm --outfile=${S}/t/aus.mjs`,{stdio:'pipe'});
const A = await import(S+'/t/aus.mjs');

const szene = (id,t,ord) => ({ id, title:t, subtitle:'', type:'szene', category:'', description:'',
  tags:[], status:'Idee', favorite:false, createdAt:1, updatedAt:1, linkedEntryIds:[], blocks:[],
  fields:{ manuskript:t, ordnung:String(ord) } });
const baum = {
  roman: { id:'r', title:'Die Chroniken von Mooshalde', subtitle:'Ein Ümlaut-Test & <XML>',
    type:'roman', category:'', description:'', tags:[], status:'Idee', favorite:false,
    createdAt:1, updatedAt:1, linkedEntryIds:[], blocks:[], fields:{} },
  kapitel: [
    { kapitel:{ id:'k1', title:'Ankunft in Arven', subtitle:'', type:'kapitel', fields:{ordnung:'1'},
        category:'',description:'',tags:[],status:'Idee',favorite:false,createdAt:1,updatedAt:1,
        linkedEntryIds:[],blocks:[] },
      szenen:[ szene('s1','Elian erreichte Mooshalde im Nebel.\n\nZweiter Absatz mit "Anführung" & Zeichen.',1),
               szene('s2','Mara wartete an der Schmiede.',2) ] },
    { kapitel:{ id:'k2', title:'Kapitel 2', subtitle:'', type:'kapitel', fields:{ordnung:'2'},
        category:'',description:'',tags:[],status:'Idee',favorite:false,createdAt:1,updatedAt:1,
        linkedEntryIds:[],blocks:[] },
      szenen:[ szene('s3','Der Fall von Arven begann früh.',1) ] },
  ],
  lose: [],
};

const blob = A.alsDocx(baum);
const buf = Buffer.from(await blob.arrayBuffer());
writeFileSync(S+'/t/probe.docx', buf);
console.log('Groesse:', buf.length, 'Bytes');

// 1. Ist es ein gueltiges ZIP? (Pythons zipfile ist streng.)
const py = `
import zipfile, sys
from xml.dom.minidom import parseString
z = zipfile.ZipFile('${S}/t/probe.docx')
bad = z.testzip()
print('ZIP-Pruefsumme:', 'OK' if bad is None else 'KAPUTT bei '+bad)
print('Dateien:', ', '.join(z.namelist()))
for n in z.namelist():
    parseString(z.read(n))   # wirft bei ungueltigem XML
print('XML: alle', len(z.namelist()), 'Teile wohlgeformt')
d = z.read('word/document.xml').decode('utf-8')
print('Umlaut erhalten:', 'früh' in d)
print('XML maskiert   :', '&amp;' in d and '&lt;XML&gt;' in d)
print('Kapitelumbruch :', d.count('pageBreakBefore'))
print('Absaetze       :', d.count('<w:p>'))
`;
const bericht = execSync(`python3 -c "${py.replace(/"/g,'\\"')}"`).toString().trim();
console.log(bericht);

/*
 * Und jetzt wird das Gedruckte auch behauptet.
 *
 * Diese Datei hat lange nur *ausgegeben*: „Umlaut erhalten: True", „XML
 * maskiert: True". Wären daraus False geworden, hätte niemand es bemerkt –
 * Python wirft nur bei kaputtem XML, und eine Datei mit „frueh" statt „früh"
 * ist tadellos wohlgeformt. Ein Test, der beschreibt statt zu prüfen, ist ein
 * Bericht, den niemand liest.
 */
let ok = 0, bad = 0;
const p = (was, bedingung, hinweis = '') => {
  if (bedingung) ok++; else { bad++; console.error(`  ✗ ${was}${hinweis ? ` – ${hinweis}` : ''}`); }
};
const zeile = (schluessel) =>
  bericht.split('\n').find((z) => z.startsWith(schluessel))?.split(':').slice(1).join(':').trim() ?? '';

p('ZIP ist heil', zeile('ZIP-Pruefsumme') === 'OK');
p('alle Teile wohlgeformt', /alle \d+ Teile wohlgeformt/.test(bericht));
p('Umlaut überlebt die Ausgabe', zeile('Umlaut erhalten') === 'True', 'aus „früh" wurde etwas anderes');
p('XML-Sonderzeichen sind maskiert', zeile('XML maskiert') === 'True', '& und < im Titel müssen maskiert sein');
p('jedes Kapitel beginnt auf neuer Seite', Number(zeile('Kapitelumbruch')) === 2);
p('es stehen Absätze darin', Number(zeile('Absaetze')) > 5);

/* 2. Text und Markdown – dieselben Inhalte, andere Form. */
const text = A.alsText(baum);
const md = A.alsMarkdown(baum);
p('der Text trägt den Romantitel', text.includes('Die Chroniken von Mooshalde'));
p('und den Titel des ersten Kapitels', text.includes('Ankunft in Arven'));
/*
 * Geprüft wird der **Text der Szenen**, nicht die Kapitelüberschrift des
 * zweiten Kapitels: `kapitelKopf` schreibt die Zählung aus („Zweites
 * Kapitel"), sodass die Zeichenfolge „Kapitel 2" gar nicht vorkommt. Der
 * erste Anlauf suchte danach und beschuldigte damit richtigen Code.
 */
p('und die Prosa aus beiden Kapiteln', text.includes('Mara wartete') && text.includes('Der Fall von Arven'));
p('Markdown setzt Überschriften', /^#\s/m.test(md) && /^##\s/m.test(md));
/* `umfang` liefert eine fertige Zeile für Menschen, kein Objekt. */
p(`der Umfang zählt richtig (${A.umfang(baum)})`, A.umfang(baum) === '2 Kapitel · 3 Szenen · 22 Wörter');
/*
 * Der Dateiname muss durch ein Dateisystem passen: keine Umlaute, keine
 * spitzen Klammern, kein Kaufmanns-Und. Der Titel hier enthält absichtlich
 * alle drei.
 */
const name = A.dateiname(baum.roman.title, 'docx');
p(`der Dateiname ist unverfänglich (${name})`, /^[A-Za-z0-9._-]+\.docx$/.test(name));

console.log(`\n  ${ok} bestanden, ${bad} gescheitert\n`);
process.exit(bad ? 1 : 0);
