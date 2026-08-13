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
console.log(execSync(`python3 -c "${py.replace(/"/g,'\\"')}"`).toString().trim());

// 2. Text und Markdown
console.log('--- TEXT ---'); console.log(A.alsText(baum));
console.log('--- MARKDOWN ---'); console.log(A.alsMarkdown(baum));
console.log('Umfang:', A.umfang(baum));
console.log('Dateiname:', A.dateiname(baum.roman.title,'docx'));
