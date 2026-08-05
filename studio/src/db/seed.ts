/**
 * Beispieldaten.
 *
 * Werden nur beim allerersten Start angelegt (leere Datenbank). Alle Einträge
 * sind ganz normale Daten: bearbeitbar, duplizierbar, löschbar.
 */

import { SEED_VERSION, db } from './db';
import type { Block, Entry, EntryType } from '../types';
import { emptyFields } from '../lib/templates';
import { newId } from '../lib/utils';

/** Kurzform zum Bauen eines Blocks. */
function b(type: Block['type'], data: Block['data']): Block {
  return { id: newId('blk'), type, data };
}

function entry(type: EntryType, partial: Partial<Entry> & { title: string }): Entry {
  const now = Date.now();
  return {
    id: newId('e'),
    subtitle: '',
    category: '',
    description: '',
    tags: [],
    status: 'In Arbeit',
    favorite: false,
    createdAt: now,
    updatedAt: now,
    linkedEntryIds: [],
    blocks: [],
    fields: emptyFields(type),
    type,
    ...partial,
  };
}

function buildSeed(): Entry[] {
  const essenz = entry('page', {
    title: 'Die Essenz',
    subtitle: 'Was Dragoncore im Kern ist',
    category: 'Art Essenz',
    description:
      'Der Kompass des Projekts: die Grundstimmung, an der jedes Bild, jedes Wesen und jeder Ort gemessen wird.',
    tags: ['Kern', 'Stil', 'Kompass'],
    status: 'Freigegeben',
    favorite: true,
    blocks: [
      b('quote', {
        text: 'Ein Ort, der sich erinnert, während man ihn betritt.',
        source: 'Leitsatz',
      }),
      b('text', {
        text: 'Dragoncore ist keine laute Welt. Sie atmet langsam. Licht fällt weich durch Blattwerk, Wasser steht still genug, um den Himmel zu tragen, und alles Gebaute wirkt, als sei es gewachsen statt errichtet. Wunder passieren beiläufig – niemand staunt, alle gehören dazu.',
      }),
      b('heading', { text: 'Drei Regeln', level: 2 }),
      b('checklist', {
        items: [
          { id: newId('itm'), text: 'Ruhe vor Spektakel – kein Bild schreit.', done: true },
          { id: newId('itm'), text: 'Warmes Licht, kühler Schatten.', done: true },
          { id: newId('itm'), text: 'Jedes Wesen hat einen eigenen Rhythmus.', done: false },
        ],
      }),
      b('heading', { text: 'Grundfarben', level: 2 }),
      b('palette', {
        swatches: [
          { id: newId('sw'), color: '#20261B', name: 'Waldschatten', note: 'Tiefen, Nacht' },
          { id: newId('sw'), color: '#55604A', name: 'Moosgrün', note: 'Mittelwerte' },
          { id: newId('sw'), color: '#A8853F', name: 'Messing', note: 'Akzente, Metall' },
          { id: newId('sw'), color: '#F1EADC', name: 'Papierlicht', note: 'Flächen, Nebel' },
        ],
      }),
      b('note', {
        text: 'Wenn ein Entwurf unsicher wirkt: Kontrast senken, Detail entfernen, Licht wärmer machen.',
        tone: 'idea',
      }),
    ],
  });

  const observatorium = entry('location', {
    title: 'Gedankenobservatorium',
    subtitle: 'Wo Gedanken sichtbar werden',
    category: 'Bauwerk',
    description:
      'Ein halb offener Rundbau über dem Nebeltal. Statt Sterne beobachtet man hier die eigenen Gedanken, die als leise Lichtpunkte aufsteigen.',
    tags: ['Observatorium', 'Nebel', 'Messing'],
    status: 'In Arbeit',
    favorite: true,
    fields: {
      ...emptyFields('location'),
      region: 'Nebeltal',
      biome: 'Hochmoor über Nadelwald',
      atmosphere:
        'Still, kühl, leicht feucht. Der Boden gibt unter den Schritten nach. Töne klingen länger nach als sie sollten.',
      light: 'Blaue Stunde am liebsten – tiefes Restlicht, warme Messingreflexe von innen.',
      sound: 'Tropfen auf Metall, ein tiefes Summen der Kuppel, weit entfernt Wasser.',
      inhabitants: 'Niemand dauerhaft. Gelegentlich Besucher, die nicht bleiben.',
      palette: ['#20261B|Kuppelschatten', '#A8853F|Messingring', '#C9D3CE|Nebelblau'],
    },
    blocks: [
      b('text', {
        text: 'Die Kuppel besteht aus dünnen Messingrippen, zwischen denen Glas fehlt. Der Nebel zieht ungehindert hindurch und sammelt sich am Boden zu einer flachen, leuchtenden Schicht.',
      }),
      b('heading', { text: 'Bauteile', level: 2 }),
      b('materials', {
        materials: [
          { id: newId('mat'), name: 'Messing, gealtert', color: '#A8853F', finish: 'matt, fleckig', note: 'Rippen und Ringe' },
          { id: newId('mat'), name: 'Dunkles Eichenholz', color: '#4A3A2A', finish: 'seidig', note: 'Böden, Pult' },
          { id: newId('mat'), name: 'Nebelglas', color: '#C9D3CE', finish: 'milchig', note: 'Nur noch in Resten' },
        ],
      }),
      b('note', { text: 'Kein einziger Rundbogen zu viel. Die Form bleibt schlicht.', tone: 'warn' }),
    ],
  });

  const weggefaehrte = entry('character', {
    title: 'Unbenannter Weggefährte',
    subtitle: 'Geht mit, ohne zu führen',
    category: 'Hauptfigur',
    description:
      'Eine ruhige Gestalt in verwaschenem Grün. Spricht selten, bleibt aber immer in Sichtweite.',
    tags: ['Begleiter', 'Mantel', 'ruhig'],
    status: 'In Arbeit',
    favorite: false,
    fields: {
      ...emptyFields('character'),
      role: 'Begleitung, stiller Anker',
      age: 'Nicht bestimmbar, wirkt zeitlos',
      personality:
        'Geduldig, aufmerksam, ohne Eile. Trifft keine Entscheidungen für andere, wartet aber, bis sie getroffen sind.',
      background:
        'Woher die Figur kommt, wird nie erklärt. Sie ist einfach da, sobald man sich an einen Ort erinnert.',
      face: 'Weiche Züge, tief liegende Augen, kaum Mimik. Der Blick ist immer leicht abgewandt.',
      hair: 'Dunkel, schulterlang, feucht wirkend, oft halb unter der Kapuze.',
      clothing:
        'Langer Mantel aus grob gewebtem Leinen, moosgrün verwaschen. Messingschließe am Kragen. Keine Muster.',
      palette: ['#3A422F|Mantelgrün', '#A8853F|Schließe', '#E8DECB|Innenfutter'],
      animationNotes:
        'Bewegt sich immer eine Spur langsamer als die Umgebung. Kopf dreht sich vor dem Körper.',
    },
    blocks: [
      b('heading', { text: 'Silhouette', level: 2 }),
      b('text', {
        text: 'Von weitem ein einfacher, leicht gebeugter Kegel: Kapuze, Schultern, Mantelsaum. Keine Waffen, keine Taschen, nichts, was heraussteht.',
      }),
      b('checklist', {
        items: [
          { id: newId('itm'), text: 'Turnaround Front / Seite / Rücken', done: false },
          { id: newId('itm'), text: 'Drei Ausdrücke: wartend, wachsam, abgewandt', done: false },
          { id: newId('itm'), text: 'Gehzyklus als Bewegungsreferenz', done: false },
        ],
      }),
    ],
  });

  const waldkoi = entry('creature', {
    title: 'Waldkoi',
    subtitle: 'Schwimmt durch Luft wie durch Wasser',
    category: 'Kreatur',
    description:
      'Ein handlanger Koi, der zwischen Farnen und Baumkronen schwebt. Er folgt Feuchtigkeit, nicht Wasser.',
    tags: ['Koi', 'Wald', 'schwebend'],
    status: 'In Arbeit',
    favorite: true,
    fields: {
      ...emptyFields('creature'),
      species: 'Schwebefisch',
      size: '25–40 cm',
      habitat: 'Feuchte Nadelwälder, Moosgründe, Nebelränder',
      behaviour:
        'Zieht in losen Gruppen von drei bis sieben Tieren. Reagiert auf Atem und Wärme, weicht hektischen Bewegungen aus.',
      personality: 'Neugierig, aber scheu. Kommt näher, wenn man stehen bleibt.',
      bodyParts: ['Schleierflossen', 'doppelte Schwanzfahne', 'Barteln', 'Rückenlinie leuchtend'],
      locomotion: ['schweben', 'gleiten', 'kurzer Schwall bei Schreck'],
      palette: ['#E8DECB|Cremeweiß', '#A8853F|Messingorange', '#20261B|Rückenschatten'],
      animationNotes:
        'Körperwelle geht immer vom Kopf zum Schwanz. Flossen laufen zwei Frames nach. Nie stillstehend – auch beim Warten leichte Drift.',
    },
    blocks: [
      b('text', {
        text: 'Die Flossen sind fast durchsichtig und fangen Streulicht ein. Von unten betrachtet wirkt der Waldkoi wie ein Stück treibendes Papier.',
      }),
      b('prompt', {
        model: '',
        prompt:
          'ein handgroßer Koi, der in feuchter Waldluft schwebt, cremeweiße Schuppen mit messingfarbenen Flecken, lange durchscheinende Schleierflossen, weiches Gegenlicht, gemalte Buchillustration, ruhige Komposition',
        negativePrompt: 'Wasser, Aquarium, Neonfarben, harte Kontraste, Fotorealismus',
      }),
    ],
  });

  const pult = entry('asset', {
    title: 'Sternenbuchpult',
    subtitle: 'Lesepult im Observatorium',
    category: 'Objekt & Prop',
    description:
      'Schräges Pult aus dunklem Holz mit Messingkante. Auf der Fläche liegt ein aufgeschlagenes Buch, dessen Seiten schwach leuchten.',
    tags: ['Möbel', 'Messing', 'Observatorium'],
    status: 'Überarbeitung',
    favorite: false,
    fields: {
      ...emptyFields('asset'),
      assetId: 'OBJ_STERNENBUCHPULT_01',
      subcategory: 'Möbel',
      perspective: '3/4',
      orientation: 'hoch',
      pivot: 'Mittig am Bodenkontakt der drei Füße',
      cutout: true,
      animatable: true,
      fileFormat: 'PNG',
      prompt:
        'schräges Lesepult aus dunklem Eichenholz mit schmaler Messingkante, aufgeschlagenes Buch mit schwach leuchtenden Seiten, freigestellt, gemalte Buchillustration',
      negativePrompt: 'Hintergrund, Schlagschatten, Text auf den Seiten, Metallglanz übertrieben',
    },
    blocks: [
      b('checklist', {
        items: [
          { id: newId('itm'), text: 'Freistellung prüfen (Kanten unten)', done: true },
          { id: newId('itm'), text: 'Seitenflackern als Loop anlegen', done: false },
        ],
      }),
      b('note', { text: 'Pivot unbedingt am Boden lassen, sonst kippt es in der Szene.', tone: 'warn' }),
    ],
  });

  const dna = entry('prompt', {
    title: 'Dragoncore DNA – Basisstil',
    subtitle: 'Grundlage für alle Bilder',
    category: 'Basisstil',
    description:
      'Der Ausgangsprompt, an den jeder andere Prompt angehängt wird. Wird selten geändert.',
    tags: ['Basis', 'Stil', 'Vorlage'],
    status: 'Freigegeben',
    favorite: true,
    fields: {
      ...emptyFields('prompt'),
      model: 'Midjourney v6',
      prompt:
        'gemalte Buchillustration, warmes weiches Licht, gedämpfte Erdtöne mit messingfarbenen Akzenten, ruhige Komposition, sichtbare Pinselstruktur, feiner Nebel, keine harten Kanten',
      negativePrompt:
        'Neonfarben, harte Kontraste, Fotorealismus, 3D-Render, Text, Wasserzeichen, überladene Ornamente',
      aspectRatio: '3:2',
      resolution: '2048 × 1365',
      seed: '',
      rating: '★★★★★',
      isTemplate: true,
      notes: 'Bei Charakteren „Ganzkörper, neutrale Pose“ ergänzen, bei Assets „freigestellt“.',
    },
    blocks: [
      b('note', {
        text: 'Diesen Prompt nicht überschreiben – lieber duplizieren und die Kopie anpassen.',
        tone: 'info',
      }),
    ],
  });

  // Querverbindungen: Charakter ↔ Ort, Asset ↔ Ort, Prompt ↔ Kreatur/Asset
  const link = (a: Entry, bEntry: Entry) => {
    a.linkedEntryIds.push(bEntry.id);
    bEntry.linkedEntryIds.push(a.id);
  };
  link(weggefaehrte, observatorium);
  link(pult, observatorium);
  link(dna, waldkoi);
  link(dna, pult);
  link(essenz, dna);

  return [essenz, observatorium, weggefaehrte, waldkoi, pult, dna];
}

/**
 * Legt die Beispieldaten an, wenn die Datenbank noch leer ist.
 * Rückgabe: neue Seed-Version, oder 0 wenn nichts getan wurde.
 */
export async function seedIfEmpty(currentVersion: number): Promise<number> {
  if (currentVersion >= SEED_VERSION) return 0;
  const count = await db.entries.count();
  if (count > 0) return SEED_VERSION; // Nutzer hat schon Inhalte – nichts überschreiben.
  await db.entries.bulkPut(buildSeed());
  return SEED_VERSION;
}
