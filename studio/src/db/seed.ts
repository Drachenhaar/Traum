/**
 * Die Startwelt.
 *
 * Kein Platzhaltertext, sondern ein kleines, vollständig verbundenes Stück
 * Dragoncore. Wichtig ist nicht die Menge, sondern dass beim ersten Öffnen
 * sofort sichtbar wird, worum es geht:
 *
 *   Weggefährte → lebt in → Mooshalde → enthält → Observatorium →
 *   enthält → Sternenbuchpult → besteht aus → Nebeleichenholz →
 *   stammt von → Nebeleiche → wächst in → Nebelwald
 *
 * Alles davon ist ganz normale Daten: bearbeitbar, verschiebbar, löschbar.
 */

import { SEED_VERSION, db } from './db';
import type { Block, Entry, EntryType, Relation } from '../types';
import { emptyFields } from '../lib/templates';
import { makeRelation } from '../lib/relations';
import { newId } from '../lib/utils';

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

function buildSeed(): { entries: Entry[]; relations: Relation[] } {
  /* ------------------------------------------------------------ Welt-DNA */

  const dnaRuhe = entry('dna', {
    title: 'Ruhe vor Spektakel',
    subtitle: 'Kein Bild schreit',
    category: 'Gefühl',
    description: 'Die erste und wichtigste Regel. Alles andere ordnet sich ihr unter.',
    tags: ['Kern'],
    status: 'Freigegeben',
    favorite: true,
    fields: {
      ...emptyFields('dna'),
      rule: 'Wenn ein Entwurf um Aufmerksamkeit kämpft, ist er noch nicht fertig.',
      because:
        'Dragoncore erzählt von einer Welt, die schon lange da ist. Wer lange da ist, muss sich nicht beweisen.',
      doThis: ['weiche Übergänge', 'Kontraste senken', 'Details weglassen', 'lange Blickführung'],
      notThis: ['harte Kanten', 'Neonfarben', 'wilde Posen', 'Effektgewitter'],
    },
  });

  const dnaLicht = entry('dna', {
    title: 'Warmes Licht, kühler Schatten',
    subtitle: 'Die Lichtregel',
    category: 'Licht',
    description: 'Der Farbcharakter der ganzen Welt hängt an diesem einen Gegensatz.',
    tags: ['Licht', 'Farbe'],
    status: 'Freigegeben',
    favorite: true,
    fields: {
      ...emptyFields('dna'),
      rule: 'Licht ist immer messingwarm. Schatten sind immer blaugrün und durchsichtig.',
      because: 'Der Gegensatz hält Bilder lebendig, ohne dass Farben laut werden müssen.',
      doThis: ['Gegenlicht', 'Streulicht durch Blattwerk', 'Schatten mit Farbe'],
      notThis: ['neutrales Grau', 'schwarze Schatten', 'kaltes Licht'],
      palette: ['#A8853F|Lichtwarm', '#55604A|Schattengrün', '#C9D3CE|Nebelblau'],
    },
  });

  const dnaGewachsen = entry('dna', {
    title: 'Gewachsen statt gebaut',
    subtitle: 'Formensprache',
    category: 'Formensprache',
    description: 'Gilt für Architektur, Objekte, Kleidung – und selbst für die Benutzeroberfläche.',
    tags: ['Form', 'Architektur'],
    status: 'Freigegeben',
    favorite: false,
    fields: {
      ...emptyFields('dna'),
      rule: 'Nichts wirkt errichtet. Alles wirkt, als sei es an seinen Platz gewachsen.',
      because: 'So gehört jedes Bauwerk zur Landschaft, statt sie zu unterbrechen.',
      doThis: ['leichte Unregelmäßigkeit', 'Materialübergänge', 'abgerundete Kanten'],
      notThis: ['perfekte Symmetrie', 'scharfe Ecken', 'Rasterfassaden'],
    },
  });

  /* --------------------------------------------------------------- Welt */

  const nebelwald = entry('biome', {
    title: 'Nebelwald',
    subtitle: 'Der Grundton der Welt',
    category: 'Wald',
    description:
      'Alter Nadelwald auf weichem Moosgrund. Der Nebel steht selten still, aber er zieht nie schnell.',
    tags: ['Nebel', 'Moos', 'Nadelwald'],
    status: 'Freigegeben',
    favorite: true,
    fields: {
      ...emptyFields('biome'),
      climate: 'Kühl, dauerhaft feucht',
      ground: 'Tiefes Moos über Nadelstreu. Der Boden gibt bei jedem Schritt nach.',
      weather: 'Nebel am Morgen, klare kalte Nächte. Regen fällt leise und lange.',
      lifeforms: ['Waldkoi', 'Nebeleiche', 'Schleiermoos', 'Trittfalter'],
      palette: ['#20261B|Waldschatten', '#55604A|Moosgrün', '#C9D3CE|Nebelblau'],
    },
    blocks: [
      b('text', {
        text: 'Der Nebelwald ist kein Ort, sondern der Zustand, in dem sich alles andere befindet. Wer ihn zeichnet, zeichnet die Grundstimmung des ganzen Projekts.',
      }),
    ],
  });

  const mooshalde = entry('location', {
    title: 'Mooshalde',
    subtitle: 'Die Siedlung am Hang',
    category: 'Siedlung',
    description:
      'Elf Häuser, die sich an einen Hang schmiegen. Von unten sieht man nur Dächer und Rauch.',
    tags: ['Siedlung', 'Hang', 'Rauch'],
    status: 'In Arbeit',
    favorite: false,
    fields: {
      ...emptyFields('location'),
      region: 'Nebelwald, Osthang',
      atmosphere: 'Bewohnt, aber still. Man hört Menschen, sieht sie aber selten.',
      light: 'Am schönsten in der Stunde vor Sonnenuntergang, wenn der Rauch golden wird.',
      sound: 'Holz, Wasser, entferntes Klopfen. Keine Stimmen.',
      palette: ['#6B5B45|Holzbraun', '#A8853F|Rauchgold', '#3A422F|Hangschatten'],
    },
  });

  const observatorium = entry('architecture', {
    title: 'Gedankenobservatorium',
    subtitle: 'Wo Gedanken sichtbar werden',
    category: 'Gebäude',
    description:
      'Ein halb offener Rundbau über der Mooshalde. Statt Sterne beobachtet man hier die eigenen Gedanken, die als leise Lichtpunkte aufsteigen.',
    tags: ['Observatorium', 'Messing', 'Kuppel'],
    status: 'In Arbeit',
    favorite: true,
    fields: {
      ...emptyFields('architecture'),
      style: 'Messingrippen über Holzskelett',
      scale: 'Ein Raum, sieben Meter Durchmesser',
      construction:
        'Dünne Messingrippen tragen eine Kuppel, in der das Glas fehlt. Der Nebel zieht ungehindert hindurch.',
      details: 'Grünspan an den Nietstellen. Der Boden ist an einer Stelle durchgetreten.',
      interior: 'Ein einziges Möbelstück in der Mitte. Sonst nichts.',
      palette: ['#A8853F|Messingring', '#4A3A2A|Eichenholz', '#C9D3CE|Nebelglas'],
    },
    blocks: [
      b('note', {
        text: 'Kein Rundbogen zu viel. Die Form bleibt schlicht – sonst kippt sie ins Verzierte.',
        tone: 'warn',
      }),
      b('materials', {
        materials: [
          { id: newId('mat'), name: 'Messing, gealtert', color: '#A8853F', finish: 'matt, fleckig', note: 'Rippen und Ringe' },
          { id: newId('mat'), name: 'Nebeleiche', color: '#4A3A2A', finish: 'seidig', note: 'Böden, Pult' },
        ],
      }),
    ],
  });

  /* ------------------------------------------------------- Die Kette ab hier */

  const pult = entry('furniture', {
    title: 'Sternenbuchpult',
    subtitle: 'Das einzige Möbelstück im Observatorium',
    category: 'Ablage',
    description:
      'Schräges Lesepult aus dunklem Holz mit schmaler Messingkante. Auf der Fläche liegt ein aufgeschlagenes Buch, dessen Seiten schwach leuchten.',
    tags: ['Pult', 'Messing', 'Licht'],
    status: 'Überarbeitung',
    favorite: false,
    fields: {
      ...emptyFields('furniture'),
      style: 'Schlicht, leicht schräg, dreibeinig',
      size: '110 cm hoch, 70 cm breit',
      construction: 'Ein Stück Holz, gebogen statt gefügt. Die Messingkante hält die Schräge.',
      wear: 'Die rechte obere Ecke ist heller – dort liegt immer eine Hand.',
      palette: ['#4A3A2A|Holz dunkel', '#A8853F|Kantenmessing'],
    },
  });

  const holz = entry('material', {
    title: 'Nebeleichenholz',
    subtitle: 'Das Holz der Welt',
    category: 'Holz',
    description:
      'Dunkel, dicht und leicht ölig. Nimmt Feuchtigkeit auf, ohne zu quellen – deshalb baut man im Nebelwald alles daraus.',
    tags: ['Holz', 'dunkel'],
    status: 'Freigegeben',
    favorite: false,
    fields: {
      ...emptyFields('material'),
      finish: 'seidig, nie glänzend',
      hardness: 'Hart, lässt sich nur biegen wenn es feucht ist',
      appearance: 'Im Gegenlicht schimmert die Maserung rötlich. Im Schatten wirkt es fast schwarz.',
      aging: 'Wird heller statt dunkler. Griffstellen werden zuerst blass.',
      usage: 'Böden, Möbel, Dachstühle, Bootsrümpfe.',
      palette: ['#4A3A2A|Frisch', '#6B5B45|Gealtert', '#8A7357|Griffstelle'],
    },
  });

  const eiche = entry('plant', {
    title: 'Nebeleiche',
    subtitle: 'Der älteste Baum des Waldes',
    category: 'Baum',
    description:
      'Wächst langsam und krumm. Die Rinde trägt Schleiermoos, das im Nebel Wasser aus der Luft kämmt.',
    tags: ['Baum', 'Moos', 'alt'],
    status: 'In Arbeit',
    favorite: false,
    fields: {
      ...emptyFields('plant'),
      species: 'Laubbaum, immergrün',
      size: '18–25 m',
      season: 'Wirft nie ganz ab; im Spätwinter fällt ein Drittel der Blätter',
      growth: 'Krumm, mehrstämmig, mit weit ausgreifenden tiefen Ästen.',
      magic: 'Unter alten Nebeleichen ist es immer ein wenig heller als es sein dürfte.',
      palette: ['#3A422F|Blattgrün', '#4A3A2A|Rinde', '#8A9A88|Schleiermoos'],
    },
  });

  /* -------------------------------------------------------------- Wesen */

  const weggefaehrte = entry('character', {
    title: 'Unbenannter Weggefährte',
    subtitle: 'Geht mit, ohne zu führen',
    category: 'Hauptfigur',
    description:
      'Eine ruhige Gestalt in verwaschenem Grün. Spricht selten, bleibt aber immer in Sichtweite.',
    tags: ['Begleiter', 'Mantel', 'ruhig'],
    status: 'In Arbeit',
    favorite: true,
    fields: {
      ...emptyFields('character'),
      role: 'Begleitung, stiller Anker',
      age: 'Nicht bestimmbar, wirkt zeitlos',
      personality:
        'Geduldig, aufmerksam, ohne Eile. Trifft keine Entscheidungen für andere, wartet aber, bis sie getroffen sind.',
      background: 'Woher die Figur kommt, wird nie erklärt. Sie ist da, sobald man sich an einen Ort erinnert.',
      face: 'Weiche Züge, tief liegende Augen, kaum Mimik. Der Blick ist immer leicht abgewandt.',
      hair: 'Dunkel, schulterlang, feucht wirkend, oft halb unter der Kapuze.',
      clothing: 'Langer Mantel aus grob gewebtem Leinen, moosgrün verwaschen. Messingschließe am Kragen.',
      palette: ['#3A422F|Mantelgrün', '#A8853F|Schließe', '#E8DECB|Innenfutter'],
      animationNotes:
        'Bewegt sich immer eine Spur langsamer als die Umgebung. Der Kopf dreht sich vor dem Körper.',
    },
    blocks: [
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
    tags: ['Koi', 'schwebend', 'scheu'],
    status: 'In Arbeit',
    favorite: true,
    fields: {
      ...emptyFields('creature'),
      species: 'Schwebefisch',
      size: '25–40 cm',
      behaviour:
        'Zieht in losen Gruppen von drei bis sieben Tieren. Reagiert auf Atem und Wärme, weicht hektischen Bewegungen aus.',
      personality: 'Neugierig, aber scheu. Kommt näher, wenn man stehen bleibt.',
      bodyParts: ['Schleierflossen', 'doppelte Schwanzfahne', 'Barteln', 'leuchtende Rückenlinie'],
      locomotion: ['schweben', 'gleiten', 'kurzer Schwall bei Schreck'],
      palette: ['#E8DECB|Cremeweiß', '#A8853F|Messingorange', '#20261B|Rückenschatten'],
      animationNotes:
        'Die Körperwelle läuft immer vom Kopf zum Schwanz. Flossen folgen zwei Bilder später. Nie stillstehend – auch beim Warten leichte Drift.',
    },
    blocks: [
      b('quote', {
        text: 'Man sieht sie erst, wenn man aufhört, sie zu suchen.',
        source: 'Feldnotiz',
      }),
    ],
  });

  /* --------------------------------------------------------- Produktion */

  const prompt = entry('prompt', {
    title: 'Dragoncore DNA – Basisstil',
    subtitle: 'Grundlage für alle Bilder',
    category: 'Basisstil',
    description: 'Der Ausgangsprompt, an den jeder andere angehängt wird. Wird selten geändert.',
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

  const asset = entry('asset', {
    title: 'Sternenbuchpult (Asset)',
    subtitle: 'Produktionsfassung des Pults',
    category: 'Objekt',
    description: 'Freigestellte Fassung für die Verwendung in Szenen.',
    tags: ['Möbel', 'freigestellt'],
    status: 'Überarbeitung',
    favorite: false,
    pipelineStage: 'prompt',
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
      lod: 'LOD0, LOD1',
      prompt:
        'schräges Lesepult aus dunklem Eichenholz mit schmaler Messingkante, aufgeschlagenes Buch mit schwach leuchtenden Seiten, freigestellt, gemalte Buchillustration',
      negativePrompt: 'Hintergrund, Schlagschatten, Text auf den Seiten, übertriebener Metallglanz',
      exportNote: 'Als PNG mit Alphakanal, 2048 px lange Kante.',
    },
    blocks: [
      b('checklist', {
        items: [
          { id: newId('itm'), text: 'Freistellung an der Unterkante prüfen', done: true },
          { id: newId('itm'), text: 'Seitenflackern als Endlosbewegung anlegen', done: false },
        ],
      }),
    ],
  });

  const essenz = entry('page', {
    title: 'Die Essenz',
    subtitle: 'Was Dragoncore im Kern ist',
    category: 'Notiz',
    description: 'Der Kompass des Projekts – kurz gehalten, damit man ihn wirklich liest.',
    tags: ['Kern', 'Kompass'],
    status: 'Freigegeben',
    favorite: true,
    blocks: [
      b('quote', { text: 'Ein Ort, der sich erinnert, während man ihn betritt.', source: 'Leitsatz' }),
      b('text', {
        text: 'Dragoncore ist keine laute Welt. Sie atmet langsam. Licht fällt weich durch Blattwerk, Wasser steht still genug, um den Himmel zu tragen, und alles Gebaute wirkt, als sei es gewachsen statt errichtet. Wunder passieren beiläufig – niemand staunt, alle gehören dazu.',
      }),
      b('palette', {
        swatches: [
          { id: newId('sw'), color: '#20261B', name: 'Waldschatten', note: 'Tiefen, Nacht' },
          { id: newId('sw'), color: '#55604A', name: 'Moosgrün', note: 'Mittelwerte' },
          { id: newId('sw'), color: '#A8853F', name: 'Messing', note: 'Akzente, Metall' },
          { id: newId('sw'), color: '#F1EADC', name: 'Papierlicht', note: 'Flächen, Nebel' },
        ],
      }),
    ],
  });

  const entries = [
    dnaRuhe,
    dnaLicht,
    dnaGewachsen,
    nebelwald,
    mooshalde,
    observatorium,
    pult,
    holz,
    eiche,
    weggefaehrte,
    waldkoi,
    prompt,
    asset,
    essenz,
  ];

  /* ---------------------------------------------------------- Die Kanten */

  const relations: Relation[] = [
    // Die Kette aus dem Kern des Produkts
    makeRelation(weggefaehrte.id, mooshalde.id, 'lives_in'),
    makeRelation(mooshalde.id, observatorium.id, 'contains'),
    makeRelation(observatorium.id, pult.id, 'contains'),
    makeRelation(pult.id, holz.id, 'made_of'),
    makeRelation(holz.id, eiche.id, 'comes_from'),
    makeRelation(eiche.id, nebelwald.id, 'grows_in'),
    makeRelation(nebelwald.id, mooshalde.id, 'contains'),

    // Wesen und Welt
    makeRelation(waldkoi.id, nebelwald.id, 'lives_in'),
    makeRelation(observatorium.id, holz.id, 'made_of'),

    // Produktion
    makeRelation(asset.id, prompt.id, 'created_by'),
    makeRelation(asset.id, pult.id, 'variant_of'),

    // Alles hängt an der DNA
    makeRelation(observatorium.id, dnaGewachsen.id, 'follows_dna'),
    makeRelation(waldkoi.id, dnaRuhe.id, 'follows_dna'),
    makeRelation(prompt.id, dnaLicht.id, 'follows_dna'),
    makeRelation(prompt.id, dnaRuhe.id, 'follows_dna'),
    makeRelation(nebelwald.id, dnaLicht.id, 'follows_dna'),
    makeRelation(essenz.id, dnaRuhe.id, 'related'),
  ];

  return { entries, relations };
}

/**
 * Legt die Startwelt an, wenn die Datenbank leer ist.
 * Rückgabe: neue Seed-Version, oder 0 wenn nichts getan wurde.
 *
 * `bookId` ist keine Bequemlichkeit, sondern Bedingung: Eine Beispielwelt
 * ohne Band gehörte zu keinem Buch und wäre damit in keinem sichtbar.
 */
export async function seedIfEmpty(currentVersion: number, bookId: string): Promise<number> {
  if (currentVersion >= SEED_VERSION) return 0;
  const count = await db.entries.count();
  if (count > 0) return SEED_VERSION; // Es gibt schon Inhalte – nichts überschreiben.

  const { entries, relations } = buildSeed();
  await db.transaction('rw', [db.entries, db.relations], async () => {
    await db.entries.bulkPut(entries.map((e) => ({ ...e, bookId })));
    await db.relations.bulkPut(relations.map((r) => ({ ...r, bookId })));
  });
  return SEED_VERSION;
}
