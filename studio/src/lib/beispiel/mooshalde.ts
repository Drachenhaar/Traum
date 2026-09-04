/**
 * Mooshalde – ein fertiger Band zum Ansehen.
 *
 * ---
 *
 * **Warum ein eigener Band und nicht die eigene Welt.**
 *
 * Gewünscht als: „Kannst du das Buch mit einer Geschichte füllen? Um das mal
 * zu sehen?"
 *
 * Das Naheliegende wäre gewesen, vierzig Einträge in das Buch zu schreiben,
 * das gerade offen ist. Genau das tut diese Datei **nicht**. Ein Artbook ist
 * kein Vorführraum; wer sein eigenes Buch aufschlägt, will darin nicht die
 * Figuren eines anderen finden und sie einzeln wieder herauspflücken müssen.
 *
 * Mooshalde steht deshalb als eigener Band im Regal: aufschlagen, durchsehen,
 * und mit einer Handbewegung wieder aus der Bibliothek nehmen. Das eigene
 * Buch bleibt unberührt.
 *
 * ---
 *
 * **Warum diese Geschichte.**
 *
 * Die erste DNA-Regel dieser Welt lautet „Ruhe vor Spektakel". Ein Band, der
 * sie vorführen soll, darf also keinen Bösewicht haben und keine Schlacht.
 * Mooshalde hat stattdessen eine Ursache, die niemand wollte:
 *
 *   Wenzel fällte eine Eiche – rechtmäßig, für Seilholz. Die Krone dieser
 *   Eiche hielt den Nebel und hob ihn den Hang hinauf. Ohne sie kommt der
 *   Nebel nicht mehr bis zum Glockenhaus. Also läuten die Glocken nicht mehr.
 *   Also stimmt das Läutbuch nicht mehr, in das Hedda seit einundfünfzig
 *   Jahren jedes Läuten schreibt. Und der Erste, der etwas merkt, ist ein
 *   Vogel, der die Glocken nachahmte und sie nun vergisst.
 *
 * Diese Kette ist der eigentliche Zweck des Bandes. Sie läuft quer durch
 * Pflanze, Tier, Gebäude, Material, Naturgesetz, Kreislauf und Mensch – und
 * genau daran sieht man, wozu ein Weltbuch mit Beziehungen gut ist. Eine
 * Sammlung schöner Einzelseiten hätte das nicht gezeigt.
 *
 * ---
 *
 * **Was hier bewusst fehlt: Bilder.**
 *
 * Kein einziges. Nicht aus Faulheit, sondern weil ein Beispielband, der
 * vierzig erfundene Tafeln mitbringt, beim ersten Öffnen mehr Speicher
 * belegt als das eigene Buch nach einem Jahr Arbeit. Die Seiten zeigen
 * deshalb, wie das Buch mit *Text* umgeht – und das ist ohnehin der Teil, den
 * man sonst nie zu sehen bekommt, weil ein frisches Buch leer ist.
 */

import type { Entry, EntryType, Relation } from '../../types';
import { emptyFields } from '../templates';

/**
 * Kennungen sind hier von Hand vergeben und nicht gewürfelt.
 *
 * Sie stehen unten in fünfzig Beziehungen wieder, und eine Beziehung, deren
 * beide Enden man nicht lesen kann, ist beim nächsten Umbau nicht zu prüfen.
 * Der Bandpräfix kommt beim Anlegen davor, damit zwei geladene Beispielbände
 * einander nicht überschreiben.
 */
type Kennung = string;

interface Bauteil {
  entries: Entry[];
  relations: Relation[];
}

function eintrag(
  id: Kennung,
  type: EntryType,
  teil: Partial<Entry> & { title: string },
): Entry {
  const jetzt = Date.now();
  return {
    id,
    bookId: '',
    subtitle: '',
    category: '',
    description: '',
    tags: [],
    status: 'Freigegeben',
    favorite: false,
    createdAt: jetzt,
    updatedAt: jetzt,
    linkedEntryIds: [],
    blocks: [],
    type,
    ...teil,
    /*
     * Zuletzt und ausdrücklich zusammengeführt, nicht ersetzt.
     *
     * Ein `...teil` mit eigenen `fields` würde die Vorlage sonst ganz
     * verwerfen – und dann fehlten jedem Eintrag genau die Felder, die er
     * nicht selbst ausfüllt. Sichtbar wäre das erst beim Bearbeiten.
     */
    fields: { ...emptyFields(type), ...(teil.fields ?? {}) },
  };
}

/* ========================================================================
 * DIE WELT
 * ===================================================================== */

function baueEintraege(): Entry[] {
  return [
    /* ------------------------------------------------------ Naturgesetze */

    eintrag('law_nebel', 'law', {
      title: 'Nebel steigt nur an dem, was ihn hält',
      subtitle: 'Das Gesetz des Hangs',
      category: 'Raum',
      description:
        'Das wichtigste Gesetz dieses Bandes, und das einzige, das die ganze Geschichte trägt. Alles Weitere ist seine Folge.',
      tags: ['Nebel', 'Kern'],
      favorite: true,
      fields: {
        rule: 'Nebel steigt einen Hang nur so weit hinauf, wie etwas dasteht, an dem er sich halten kann. Wo nichts steht, sinkt er ab und bleibt liegen.',
        because:
          'Nebel ist kein Wetter, sondern ein Ding: Er hat Gewicht, und er braucht Halt. Alte Kronen, Felsnasen, Mauern – daran zieht er sich hoch. Nimmt man den Halt weg, nimmt man ihm die Höhe.',
        limit:
          'Es gilt nur bergauf. Bergab braucht Nebel nichts; dort fließt er von selbst und ist durch nichts aufzuhalten.',
        cost: 'Wer den Nebel hoch haben will, muss stehen lassen, was ihn trägt.',
        consequence:
          'Fällt ein einziger großer Baum an der richtigen Stelle, endet der Nebel dreißig Schritt tiefer als am Tag zuvor. Man sieht es nicht am Baum. Man sieht es oben.',
        known:
          'Jedes Kind in Mooshalde kann es aufsagen. Keiner hat es je auf eine bestimmte Eiche angewendet.',
      },
    }),

    eintrag('law_gelaeutet', 'law', {
      title: 'Was geläutet hat, ist geschehen',
      subtitle: 'Die Zeitrechnung der Halde',
      category: 'Zeit',
      description:
        'Kein Naturgesetz im strengen Sinn, sondern eines, an das sich alle halten, als wäre es eins. Das ist der Grund, warum das Schweigen nicht bloß still ist, sondern gefährlich.',
      tags: ['Zeit', 'Läuten'],
      fields: {
        rule: 'In Mooshalde zählt ein Tag erst, wenn die Glocken ihn geläutet haben. Verträge, Geburten, Schulden und Feiertage werden nach Läuten datiert, nicht nach Sonnen.',
        because:
          'Die Sonne ist im Nebelwald an vier von fünf Tagen nicht zu sehen. Die Glocken sind zu hören. Man hat sich vor sehr langer Zeit für das entschieden, was da ist.',
        limit:
          'Für alles außerhalb der Halde gilt es nicht. Wer hinunter in die Städte geht, muss dort nach Sonnen rechnen und kommt eine Woche durcheinander zurück.',
        cost: 'Ein Tag ohne Läuten ist kein Tag. Er steht in keinem Buch und in keinem Vertrag.',
        consequence:
          'Seit die Glocken schweigen, altert in Mooshalde amtlich niemand mehr. Das klingt wie ein Scherz und wird von Woche zu Woche weniger lustig.',
        known: 'Allen. Es ist der erste Satz, den ein Zugezogener erklärt bekommt.',
      },
    }),

    /* --------------------------------------------------- Essenz der Welt */

    eintrag('dna_ruhe', 'dna', {
      title: 'Ruhe vor Spektakel',
      subtitle: 'Kein Bild schreit',
      category: 'Gefühl',
      description:
        'Die erste und wichtigste Regel. Alles andere ordnet sich ihr unter – auch diese Geschichte, die deshalb keinen Bösewicht hat.',
      tags: ['Kern'],
      favorite: true,
      fields: {
        rule: 'Wenn ein Entwurf um Aufmerksamkeit kämpft, ist er noch nicht fertig.',
        because:
          'Mooshalde erzählt von einem Ort, der schon lange da ist. Wer lange da ist, muss sich nicht beweisen.',
        doThis: ['weiche Übergänge', 'Kontraste senken', 'Details weglassen', 'lange Blickführung'],
        notThis: ['harte Kanten', 'Neonfarben', 'wilde Posen', 'Effektgewitter'],
      },
    }),

    eintrag('dna_licht', 'dna', {
      title: 'Warmes Licht, kühler Schatten',
      subtitle: 'Die Lichtregel',
      category: 'Licht',
      description: 'Der Farbcharakter der ganzen Welt hängt an diesem einen Gegensatz.',
      tags: ['Licht', 'Farbe'],
      favorite: true,
      fields: {
        rule: 'Licht ist immer messingwarm. Schatten sind immer blaugrün und durchsichtig.',
        because: 'Der Gegensatz hält Bilder lebendig, ohne dass Farben laut werden müssen.',
        doThis: ['Gegenlicht', 'Streulicht durch Nebel', 'Schatten mit Farbe'],
        notThis: ['neutrales Grau', 'schwarze Schatten', 'kaltes Licht'],
        palette: ['#A8853F|Lichtwarm', '#55604A|Schattengrün', '#C9D3CE|Nebelblau'],
      },
    }),

    eintrag('dna_gewachsen', 'dna', {
      title: 'Gewachsen statt gebaut',
      subtitle: 'Formensprache',
      category: 'Formensprache',
      description: 'Gilt für Architektur, Objekte, Kleidung – und für das Glockenhaus zuerst.',
      tags: ['Form', 'Architektur'],
      fields: {
        rule: 'Nichts wirkt errichtet. Alles wirkt, als sei es an seinen Platz gewachsen.',
        because: 'So gehört jedes Bauwerk zur Landschaft, statt sie zu unterbrechen.',
        doThis: ['leichte Unregelmäßigkeit', 'Materialübergänge', 'abgerundete Kanten'],
        notThis: ['perfekte Symmetrie', 'scharfe Ecken', 'Rasterfassaden'],
      },
    }),

    /* ------------------------------------------------ Die lebendige Welt */

    eintrag('bio_nebelwald', 'biome', {
      title: 'Nebelwald',
      subtitle: 'Der Grundton der Welt',
      category: 'Wald',
      description:
        'Alter Nadelwald auf weichem Moosgrund, über einen langen Hang gelegt. Der Nebel steht selten still, aber er zieht nie schnell.',
      tags: ['Nebel', 'Moos', 'Hang'],
      favorite: true,
      fields: {
        climate: 'Kühl, dauerhaft feucht',
        ground:
          'Tiefes Moos über Nadelstreu. Der Boden gibt bei jedem Schritt nach und federt zurück, sodass man nach einer Stunde Gehen die Waden spürt und nicht die Fußsohlen.',
        weather:
          'Nebel steigt am Morgen von unten herauf und sinkt am Abend zurück. Regen fällt leise und lange. Schnee bleibt nur oberhalb der Halde liegen.',
        lifeforms: ['Glockenhäher', 'Waldkoi', 'Trittfalter', 'Nebeleiche', 'Schleiermoos'],
        palette: ['#20261B|Waldschatten', '#55604A|Moosgrün', '#C9D3CE|Nebelblau'],
      },
    }),

    eintrag('ort_mooshalde', 'location', {
      title: 'Mooshalde',
      subtitle: 'Vierzig Dächer an einem Hang',
      category: 'Siedlung',
      description:
        'Eine Siedlung, die nicht am Fluss liegt und nicht an einer Straße, sondern an einer Höhe: genau dort, wo der Nebel zum letzten Mal ankommt.',
      tags: ['Halde', 'Heimat'],
      favorite: true,
      fields: {
        region: 'Oberer Nebelwald, Westhang',
        atmosphere:
          'Häuser stehen versetzt, nie zwei auf gleicher Höhe. Zwischen ihnen laufen Bretterstege statt Gassen, weil der Hang zu steil und der Boden zu weich für Wege ist. Alles ist auf Zuruf gebaut: Wer oben wohnt, hört, was unten gesprochen wird.',
        light:
          'Von halb zehn bis Mittag steht das Licht messingwarm im Nebel und macht ihn dicht genug, dass man die Hand vor Augen sieht und den Nachbarn nicht. Danach wird es klar und flach.',
        sound:
          'Bis vor einem Jahr: die Glocken, zwei- bis siebenmal am Tag. Jetzt Ziegenschellen, Seilerräder, und in der Ferne der Glockenhäher, der es noch versucht.',
        palette: ['#3A422F|Hangdunkel', '#A8853F|Fensterlicht', '#DCD3BE|Nebel im Licht'],
      },
    }),

    eintrag('ort_nebelgrund', 'location', {
      title: 'Der Nebelgrund',
      subtitle: 'Wo der Nebel gemacht wird',
      category: 'Region',
      description:
        'Die feuchte Senke unterhalb der Halde. Von oben sieht man nur eine weiße Fläche; von innen ist es der hellste Ort des ganzen Waldes.',
      tags: ['Senke', 'Nebel', 'Ursprung'],
      fields: {
        region: 'Unterer Nebelwald, Talsohle',
        atmosphere:
          'Ein Kessel aus Torf und stehendem Wasser, in dem es immer eine Handbreit wärmer ist als darüber. Hier entsteht der Nebel jeden Morgen neu. Seit die große Eiche fehlt, steht er im Grund und kommt nicht mehr heraus.',
        light:
          'Weiß in Weiß, ohne Richtung. Man wirft keinen Schatten und weiß nach zehn Minuten nicht mehr, wo oben ist.',
        sound:
          'Tropfen, sonst nichts. Der Grund schluckt Stimmen so vollständig, dass man einander an den Ärmeln festhält.',
        palette: ['#DCD3BE|Grundweiß', '#8C7A62|Torf', '#55604A|Wasserdunkel'],
      },
    }),

    eintrag('ort_haldenteich', 'location', {
      title: 'Der Haldenteich',
      subtitle: 'Das einzige stehende Wasser oben',
      category: 'Landmarke',
      description:
        'Kein Teich von Natur aus, sondern ein Loch, das sich vor zweihundert Jahren mit Regen gefüllt hat und seither nie leer geworden ist.',
      tags: ['Wasser', 'Waldkoi'],
      fields: {
        region: 'Mooshalde, unterhalb des Glockenhauses',
        atmosphere:
          'Rund und flach, mit einem Rand aus Bohlen, die alle zwölf Jahre erneuert werden. Kinder werfen Brot hinein; die Waldkoi kommen dafür herauf und wissen genau, wann.',
        light: 'Die Wasseroberfläche ist die einzige Stelle in der Halde, an der der Himmel steht.',
        sound: 'Nichts. Selbst der Wind lässt ihn in Ruhe, weil der Hang ihn abhält.',
        palette: ['#2A3228|Wassertiefe', '#7A8467|Randmoos', '#C9D3CE|Himmel im Wasser'],
      },
    }),

    eintrag('ort_haldensteg', 'location', {
      title: 'Der Haldensteg',
      subtitle: 'Vierhundert Bohlen hinab',
      category: 'Weg',
      description:
        'Der einzige Weg vom Dorf hinunter in den Grund. Auf Stelzen, weil der Hang jeden festen Weg innerhalb eines Winters wegrutschen lässt.',
      tags: ['Weg', 'Wenzel'],
      fields: {
        region: 'Zwischen Mooshalde und Nebelgrund',
        atmosphere:
          'Vierhundertsechs Bohlen, jede einzeln nummeriert – Wenzels Werk und Wenzels Buchführung. Ab Bohle zweihundert verschwindet der Steg im Nebel, und man geht die letzten hundert nach Gehör.',
        light: 'Oben grün und gefiltert, unten weiß. Der Übergang liegt immer woanders.',
        sound:
          'Holz unter Schritten, in genau vierhundertsechs verschiedenen Tonhöhen. Wer den Steg kennt, weiß am Klang, wie weit er ist.',
        palette: ['#5F5140|Verwittertes Holz', '#55604A|Hangmoos', '#DCD3BE|Nebelgrenze'],
      },
    }),

    eintrag('mom_erstes', 'moment', {
      title: 'Das erste Läuten nach dem Regen',
      subtitle: 'Der beste Augenblick des Jahres',
      category: 'Morgengrauen',
      description:
        'Der Moment, für den Mooshalde gebaut wurde. Wer ihn einmal erlebt hat, versteht, warum niemand fortzieht.',
      tags: ['Läuten', 'Freude'],
      favorite: true,
      fields: {
        timeOfDay: 'Kurz vor sechs',
        season: 'Erste Wärme nach der Nässe, meist im vierten Monat',
        light:
          'Die Sonne kommt flach über den Gegenhang und trifft den aufsteigenden Nebel von der Seite. Für ungefähr acht Minuten ist die ganze Halde aus Messing.',
        sound:
          'Zuerst ein einzelner Schlag, tief. Dann, nach einer Pause, in der alle stehenbleiben, die drei hohen. Dann alles zusammen.',
        smell: 'Nasses Moos, warmer Stein, ein wenig Bronze.',
        weather: 'Windstill. Das gehört dazu; bei Wind steigt der Nebel schief und läutet falsch.',
        air: 'Kühl in der Lunge, warm im Gesicht.',
        change:
          'Vorher steht das Dorf im Dunkeln und wartet. Nachher redet jeder mit jedem, auch die, die sonst nicht miteinander reden.',
        feeling: 'Erleichterung, die man sich nicht eingestanden hat.',
        palette: ['#A8853F|Messingnebel', '#DCD3BE|Lichtweiß', '#20261B|Gegenhang'],
      },
    }),

    eintrag('mom_stille', 'moment', {
      title: 'Die Nacht, in der nichts läutete',
      subtitle: 'Der zwölfte Tag des neunten Monats',
      category: 'Nacht',
      description:
        'Nicht der erste Tag ohne Läuten – aber der erste, an dem allen gleichzeitig auffiel, dass es kein Zufall mehr war.',
      tags: ['Wende', 'Stille'],
      favorite: true,
      fields: {
        timeOfDay: 'Zwischen elf und drei',
        season: 'Spätherbst, erste kalte Nacht',
        light:
          'Klar. Zum ersten Mal seit Wochen standen Sterne über der Halde – und genau das war das Falsche daran.',
        sound:
          'Nichts. Nicht einmal Tropfen. Man hörte Wenzels Seilerbahn quietschen, und die liegt achthundert Schritt entfernt.',
        smell: 'Trocken. Staub statt Moos.',
        weather: 'Kein Nebel bis oben. Er stand im Grund und blieb.',
        air: 'Zu klar. Man sah den Nachbarhang, und niemand wollte ihn sehen.',
        change:
          'Vorher war das Schweigen eine Reihe schlechter Tage. Nachher war es ein Zustand, für den jemand zuständig sein musste.',
        feeling:
          'Wachliegen. In einundzwanzig Häusern brannte gegen zwei Uhr Licht, ohne dass jemand aufgestanden wäre.',
        palette: ['#141A15|Nachtdunkel', '#3F4A55|Sternkalt', '#8C7A62|Fensterlicht'],
      },
    }),

    eintrag('mom_mittag', 'moment', {
      title: 'Mittag über dem Grund',
      subtitle: 'Von oben ist es ein See',
      category: 'Mittag',
      description:
        'Was man sieht, wenn man auf Bohle zweihundert steht und hinunterschaut. Der schönste Anblick des Bandes – und inzwischen der traurigste.',
      tags: ['Aussicht', 'Nebel'],
      fields: {
        timeOfDay: 'Zwischen zwölf und eins',
        season: 'Ganzjährig, am deutlichsten im Herbst',
        light:
          'Senkrecht. Der Nebel unten wird undurchsichtig weiß und wirft Licht zurück nach oben, sodass man von unten angestrahlt wird.',
        sound: 'Von unten kommt nichts herauf. Man hört nur sich selbst atmen.',
        smell: 'Harz, warm.',
        weather: 'Klar oben, dicht unten – die einzige Wetterlage, in der beides zugleich gilt.',
        air: 'Warm über der Grenze, kalt darunter. Man kann die Hand hineinhalten und es fühlen.',
        water: 'Auf dem Geländer schlägt sich Nässe nieder, obwohl es nicht regnet.',
        change:
          'Früher reichte die weiße Fläche bis kurz unter die Füße. Heute liegt sie dreißig Schritt tiefer, und man sieht Baumkronen, die vorher nie zu sehen waren.',
        feeling: 'Ehrfurcht, gefolgt von einem Unbehagen, das man nicht benennen kann.',
        palette: ['#DCD3BE|Nebelsee', '#55604A|Kronen', '#A8853F|Mittagslicht'],
      },
    }),

    /* --------------------------------------------------------- Natur */

    eintrag('pfl_nebeleiche', 'plant', {
      title: 'Die Nebeleiche',
      subtitle: 'Der Baum, der den Nebel hebt',
      category: 'Baum',
      description:
        'Der wichtigste Baum dieses Bandes, und der einzige, der darin nicht mehr steht. Alles, was in Mooshalde geschieht, geschieht wegen einer gefällten Nebeleiche.',
      tags: ['Kern', 'Nebel', 'Verlust'],
      favorite: true,
      fields: {
        species: 'Quercus nebularis, im Wald schlicht „die Alte"',
        size: 'Vierzig bis fünfzig Schritt hoch, die Krone fast ebenso breit',
        season:
          'Sie treibt spät und wirft nie ganz ab. Im Winter hängen die braunen Blätter, und das ist der Grund für alles.',
        growth:
          'Kurzer, sehr dicker Stamm, der sich in zwei Schritt Höhe in vier bis sechs waagerechte Hauptäste teilt. Die Krone wächst breit statt hoch, weil sie nicht Licht sucht, sondern Nässe fängt.',
        magic:
          'Ihre Blätter sind auf der Unterseite fein behaart. Nebel, der hindurchzieht, bleibt daran hängen, sammelt sich, wird schwer – und wird von der nachdrängenden Luft weiter hangaufwärts geschoben. Eine große Nebeleiche hebt den Nebel um dreißig bis vierzig Schritt. Nimmt man sie weg, sinkt er.\n\nDas weiß im Wald niemand, weil es niemand je nötig hatte zu wissen.',
        palette: ['#3A422F|Blattdunkel', '#8C7A62|Rinde', '#DCD3BE|Nebel in der Krone'],
      },
    }),

    eintrag('pfl_schleiermoos', 'plant', {
      title: 'Schleiermoos',
      subtitle: 'Der Zeuge',
      category: 'Moos & Flechte',
      description:
        'Wächst ausschließlich dort, wo Nebel kondensiert. Deshalb ist es keine Pflanze, sondern eine Messung – und die einzige, die vor dem Läutbuch angeschlagen hat.',
      tags: ['Nebel', 'Beweis'],
      favorite: true,
      fields: {
        species: 'Hängendes Fadenmoos',
        size: 'Vorhänge von einer Hand bis zwei Schritt Länge',
        season: 'Wächst das ganze Jahr, aber nur an Tagen mit Nebel.',
        growth:
          'Hängt von Ästen und Balken in Fäden herab, die nie verzweigen. Ein Faden wächst ungefähr eine Fingerbreit je hundert Nebeltage – deshalb kann man an einem Vorhang ablesen, wie viele Nebeljahre eine Stelle hinter sich hat.',
        magic:
          'Es stirbt nicht ab, wenn der Nebel ausbleibt. Es hört einfach auf. Die Fäden bleiben hängen, werden grau und brechen erst nach Jahren.\n\nAm Glockenhaus sind die Fäden seit vierzehn Monaten nicht länger geworden. Hedda hat es gesehen, bevor sie es verstanden hat, und zunächst gedacht, sie messe falsch.',
        palette: ['#7A8467|Frischgrün', '#B3B5A4|Graufaden', '#C9D3CE|Nass im Licht'],
      },
    }),

    eintrag('pfl_glockenwinde', 'plant', {
      title: 'Glockenwinde',
      subtitle: 'Die Uhr am Haus',
      category: 'Blume',
      description:
        'Rankt am Glockenhaus und öffnet sich nach dem Läuten, nicht nach der Sonne. Eine Pflanze, die einer Gewohnheit folgt.',
      tags: ['Läuten', 'Glockenhaus'],
      fields: {
        species: 'Kletternde Winde mit hängenden Blüten',
        size: 'Ranken bis fünf Schritt, Blüten daumengroß',
        season: 'Blüht vom vierten bis zum neunten Monat.',
        growth:
          'Rankt links herum, immer an der wetterabgewandten Seite. Die Blüten hängen nach unten und öffnen sich, wenn die Luft feucht genug ist – und feucht genug ist sie in Mooshalde immer dann, wenn geläutet wird.',
        magic:
          'Daher der Name, und daher der Irrtum: Alle glauben, sie öffne sich *wegen* der Glocken. Sie öffnet sich wegen desselben Nebels, der die Glocken zum Klingen bringt.\n\nDieses Jahr hat sie zum ersten Mal seit Menschengedenken geschlossen geblüht.',
        palette: ['#C9B7D2|Blütenblass', '#55604A|Rankengrün', '#A8853F|Staubgold'],
      },
    }),

    eintrag('kre_nebelzug', 'cycle', {
      title: 'Der Nebelzug',
      subtitle: 'Der Tag, wie ihn die Halde erlebt',
      category: 'Wanderung',
      description:
        'Der tägliche Auf- und Abstieg des Nebels. Das Uhrwerk, an dem in Mooshalde Glocken, Pflanzen, Tiere und Menschen hängen – und das seit einem Jahr eine Stufe zu kurz greift.',
      tags: ['Kern', 'Nebel', 'Kreislauf'],
      favorite: true,
      fields: {
        span: 'Ein Tag, jeden Tag',
        trigger:
          'Sonnenaufgang. Der Grund ist wärmer als die Luft darüber, und was verdunstet, muss irgendwohin.',
        growth:
          'Von sechs bis halb zehn steigt der Nebel den Hang hinauf, von Krone zu Krone. Jede große Nebeleiche hebt ihn ein Stück; die Kette dieser Bäume ist die Treppe.',
        decay:
          'Ab Mittag reißt er von unten auf. Am Nachmittag steht er nur noch in den Senken.',
        rebirth:
          'Abends sinkt der Rest zurück in den Grund und liegt dort über Nacht. Am nächsten Morgen ist es derselbe Nebel.',
        habitat: 'Der Westhang zwischen Nebelgrund und Mooshalde',
        chain: ['Nebelgrund', 'Nebeleichen am Hang', 'Glockenhaus', 'Schleiermoos', 'Glockenhäher'],
        symbiosis: [
          'Nebeleiche hebt – Glocke läutet',
          'Glocke läutet – Häher singt',
          'Nebel kondensiert – Schleiermoos wächst',
          'Winde blüht – Halde weiß, dass Mittag ist',
        ],
      },
    }),

    /* --------------------------------------------------------- Tiere */

    eintrag('tier_haeher', 'animal', {
      title: 'Der Glockenhäher',
      subtitle: 'Der Vogel, der die Glocken auswendig kann',
      category: 'Vogel',
      description:
        'Ahmt nach, was er oft hört. In Mooshalde hat er ein Jahrhundert lang Glocken gehört. Jetzt vergisst er sie, und das ist die erste Nachricht, die im Dorf ankommt – lange bevor jemand versteht, dass es eine ist.',
      tags: ['Kern', 'Läuten', 'Vogel'],
      favorite: true,
      fields: {
        species: 'Großer Waldhäher, rußgrau mit messingfarbenem Nackenfleck',
        size: 'Eine Spanne lang, Flügelspanne knapp zwei',
        behaviour:
          'Sitzt hoch, sieht viel, ruft wenig. Er singt nicht für ein Weibchen und nicht gegen einen Rivalen, sondern gegen die Stille: Wenn eine Weile nichts zu hören war, wiederholt er, was zuletzt zu hören war.',
        diet: 'Eicheln, Käfer, im Winter alles, was am Haldenteich liegenbleibt',
        territory:
          'Ein Paar hält den Hang zwischen Bohle einhundert und dem Glockenhaus. Andere Häher werden geduldet, solange sie nicht läuten.',
        migration: 'Bleibt. Er zieht nur den Hang hinauf und hinunter, dem Nebel nach.',
        sleep: 'In der Krone einer Nebeleiche, immer auf dem zweituntersten Hauptast.',
        mating:
          'Im dritten Monat. Das Männchen wirbt mit der schwierigsten Tonfolge, die es kann – in Mooshalde also mit dem vollen Siebenschlag.',
        voice:
          'Zwei Stimmen: die eigene, ein rauhes Schaben, und die geliehene. Die geliehene ist erstaunlich rein und trifft die tiefe Glocke auf einen Viertelton.\n\nEr vergisst in der Reihenfolge, in der er gelernt hat. Zuerst fiel der Siebenschlag weg, dann die drei hohen. Seit dem Frühjahr kann er nur noch den einen tiefen Schlag, und den setzt er zu falschen Zeiten.',
        tracks:
          'Aufgebrochene Eicheln auf flachen Steinen, immer am selben Stein. Kot mit unverdauten Bronzeglanzkäfern.',
        locomotion: ['hüpfen', 'kurzes Gleiten zwischen Kronen', 'Flügelschlag im Nebel gedämpft'],
        palette: ['#4A4F48|Rußgrau', '#A8853F|Nackenmessing', '#DCD3BE|Nebelgrund'],
      },
    }),

    eintrag('tier_waldkoi', 'animal', {
      title: 'Waldkoi',
      subtitle: 'Schleierkarpfen im Haldenteich',
      category: 'Fisch',
      description:
        'Ziehen in kleinen Schwärmen und kommen herauf, wenn Kinder ans Ufer treten. Sie sind die einzigen im Band, die vom Schweigen nichts merken.',
      tags: ['Wasser', 'Teich'],
      fields: {
        species: 'Schleierkarpfen',
        size: 'Vierzig Zentimeter, die ältesten über sechzig',
        behaviour:
          'Friedlich, scheu, schwarmbildend. Sie stehen tagsüber am Grund und steigen bei Erschütterung des Ufers – nicht bei Schatten, was ihnen bei Reihern das Leben rettet.',
        diet: 'Anflug, Moosfäden, Brot',
        territory: 'Der ganze Teich. Reviere kennen sie nicht.',
        migration: 'Keine. Sie sind noch nie irgendwo anders gewesen.',
        sleep: 'Am Grund, dicht beieinander, mit dem Kopf zur Mitte.',
        mating: 'Im fünften Monat, an einem einzigen Tag, im flachen Randmoos.',
        voice: 'Ein Schmatzen an der Oberfläche, sonst nichts.',
        tracks: 'Wolken aufgewirbelten Schlamms, die eine Viertelstunde stehenbleiben.',
        locomotion: ['gleiten', 'kippen', 'aus dem Stand rückwärts'],
        palette: ['#55604A|Moosgrün', '#A8853F|Messingflanke', '#2A3228|Wassertiefe'],
      },
    }),

    eintrag('tier_trittfalter', 'animal', {
      title: 'Trittfalter',
      subtitle: 'Der Falter, der lieber geht',
      category: 'Insekt',
      description:
        'Fliegt nur im Notfall. Im Nebel ist Fliegen sinnlos, also läuft er – und hinterlässt dabei die feinsten Spuren des ganzen Waldes.',
      tags: ['Nebel', 'Boden'],
      fields: {
        species: 'Bodenfalter mit verkümmerten Vorderflügeln',
        size: 'Daumennagelgroß',
        behaviour:
          'Läuft auf sechs Beinen über Moospolster und benutzt die Flügel als Segel gegen den Hangwind. Erschrickt er, klappt er zusammen und fällt – das sieht aus wie Sterben und dauert drei Sekunden.',
        diet: 'Feuchtigkeit von Moosfäden, Blütenstaub der Glockenwinde',
        territory: 'Ein Moospolster, meist nicht größer als eine Tischplatte.',
        migration: 'Steigt im Sommer mit dem Nebel hangaufwärts, im Winter hinab.',
        sleep: 'Unter Moos, mit angelegten Flügeln, oft zu Dutzenden.',
        mating: 'Im Nebel, im sechsten Monat, ausschließlich zu Fuß.',
        voice: 'Keine. Aber ein Schwarm auf trockenem Laub klingt wie leiser Regen.',
        tracks:
          'Sechs Punktreihen im feuchten Moos, drei Fingerbreit lang, nach einer Stunde weg. Jonte kann daran ablesen, wie hoch der Nebel in der Nacht stand.',
        locomotion: ['laufen', 'segeln', 'sich fallen lassen'],
        palette: ['#8C7A62|Flügelbraun', '#B3B5A4|Staubgrau', '#7A8467|Moos'],
      },
    }),

    eintrag('tier_haldenziege', 'animal', {
      title: 'Haldenziege',
      subtitle: 'Vierzehn Stück, jede mit Namen',
      category: 'Säugetier',
      description:
        'Das Nutztier der Halde. Sie liefert Milch, hält die Stege frei und trägt die Schellen, die seit einem Jahr das Einzige sind, was in Mooshalde zuverlässig klingt.',
      tags: ['Halde', 'Alltag'],
      fields: {
        species: 'Kleine Bergziege, langhaarig, dunkelbraun bis moosgrau',
        size: 'Kniehoch, selten schwerer als vierzig Pfund',
        behaviour:
          'Geht auf dem Steg voran, nie hinterher. Sie prüft jede Bohle einzeln und weigert sich, eine morsche zu betreten – daran hat Wenzel jahrelang seine Instandsetzung ausgerichtet.',
        diet: 'Moos, Rinde, alles, was am Steg wächst',
        territory: 'Der Steg und dreißig Schritt beiderseits.',
        migration: 'Morgens hinunter bis zur Nebelgrenze, abends herauf. Immer genau bis zur Grenze.',
        sleep: 'Im offenen Unterstand hinter der Seilerbahn, zusammengedrängt.',
        mating: 'Im zehnten Monat. Die Böcke stehen unterhalb und rufen herauf.',
        voice:
          'Ein tiefes Meckern, das im Nebel weit trägt. Dazu die Schellen: jede Ziege hat eine andere, und die Halde weiß, wer wo ist.',
        tracks: 'Zwei tiefe Halbmonde, immer paarweise, im Moos jahrelang sichtbar.',
        locomotion: ['klettern', 'stehen, wo nichts mehr steht', 'springen bergab'],
        palette: ['#5F5140|Fellbraun', '#B3B5A4|Altgrau', '#A8853F|Schellenmessing'],
      },
    }),

    eintrag('kre_nebelgaenger', 'creature', {
      title: 'Der Nebelgänger',
      subtitle: 'Man sieht ihn nur, wenn man ihn nicht ansieht',
      category: 'Geistwesen',
      description:
        'Ein großes, langsames Wesen, das ausschließlich im dichten Nebel unterwegs ist. Seit der Nebel unten bleibt, bleibt es unten – und wird zum ersten Mal seit Generationen von Menschen gesehen.',
      tags: ['Nebel', 'Scheu'],
      fields: {
        species: 'Nebelbewohner, hirschartig, ohne Fell',
        size: 'Am Widerrist über Manneshöhe',
        behaviour:
          'Es geht. Mehr tut es nicht. Es frisst nicht sichtbar, es ruht nicht sichtbar, es geht den Grund ab, immer dieselbe Runde, und weicht allem aus, was schneller ist als es selbst.',
        personality:
          'Nicht scheu im Sinn von ängstlich – eher unbeteiligt. Wer ihm begegnet, hat den Eindruck, nicht bemerkt worden zu sein, und ist sich hinterher nicht sicher.',
        territory: 'Der Nebelgrund, solange dort Nebel steht. Es verlässt ihn nicht.',
        sleep: 'Unbekannt. Niemand hat je eins liegen sehen.',
        migration:
          'Es folgt der Nebelgrenze. Früher kam es mit dem Morgennebel bis auf halbe Höhe und war nie zu sehen, weil es im Dichten blieb. Jetzt steht die Grenze tief, und es steht mit ihr – dort, wo Jonte hinuntergeht.',
        voice:
          'Ein sehr tiefer, sehr langer Ton, ungefähr alle zwanzig Schritt. Man spürt ihn im Brustbein, bevor man ihn hört. Der Glockenhäher hat ihn nie nachgeahmt; das ist das Einzige, was er nie versucht hat.',
        tracks:
          'Runde Abdrücke ohne Klauen, tief, im Abstand von anderthalb Schritt. Sie füllen sich sofort mit Wasser, und das Wasser bleibt klar, während der ganze Grund trüb ist.',
        bodyParts: ['Schleierhaut statt Fell', 'kein sichtbares Auge', 'Geweih aus Wassertropfen'],
        locomotion: ['gehen', 'stehenbleiben', 'sich auflösen, ohne sich zu bewegen'],
        palette: ['#DCD3BE|Nebelweiß', '#B3B5A4|Schleierhaut', '#3F4A55|Schattenblau'],
      },
    }),

    /* ------------------------------------------------------- Bewohner */

    eintrag('fig_hedda', 'character', {
      title: 'Hedda Amsel',
      subtitle: 'Glockenwärterin',
      category: 'Hauptfigur',
      description:
        'Führt seit einundfünfzig Jahren das Läutbuch. Sie hat das Schweigen nicht als Erste gehört – sie hat es als Erste aufgeschrieben – und das ist der Unterschied, an dem die Geschichte hängt.',
      tags: ['Kern', 'Glockenhaus'],
      favorite: true,
      fields: {
        role: 'Glockenwärterin von Mooshalde',
        age: 'Vierundsiebzig',
        herkunft: 'Mooshalde, drittes Haus über dem Teich',
        volk: 'Haldenvolk',
        zugehoerigkeit: 'Das Glockenhaus – kein Amt, ein Schlüssel',
        wesen: ['genau', 'unbeirrbar', 'trocken', 'nicht sentimental'],
        faehigkeiten: [
          'hört den Unterschied zwischen zwei Schlägen derselben Glocke',
          'schreibt im Dunkeln gerade',
          'kann einundfünfzig Jahre aus dem Kopf vergleichen',
        ],
        buchauftritt:
          'Sie eröffnet den Band und schließt ihn. Dazwischen sagt sie ungefähr vierzig Sätze.',
        zitat: 'Ich habe nichts gehört. Aber ich habe es aufgeschrieben.',
        personality:
          'Sie erklärt nicht gern und rechtfertigt sich nie. Wer sie für kalt hält, hat sie nicht beim Schreiben gesehen: Sie führt das Buch, wie andere ein Kind großziehen.',
        goals:
          'Herausfinden, warum die Glocken schweigen – nicht, um sie zu retten, sondern um es richtig eintragen zu können.',
        wishes:
          'Dass jemand nach ihr das Buch weiterführt. Sie hat es nie ausgesprochen und wird es nicht tun.',
        fears:
          'Dass sie sich verzählt hat. Dass die Fehler nicht draußen liegen, sondern in ihren einundfünfzig Jahren.',
        habits: ['prüft vor dem Schlafen den Riegel', 'zählt Schritte', 'trinkt nichts Warmes nach vier'],
        quirks: ['fährt beim Zuhören mit dem Daumen über den Buchrücken', 'nickt nie'],
        routine:
          'Vor sechs am Pult. Nach dem Morgennebel Eintrag. Mittags am Teich. Abends noch ein Eintrag, auch wenn nichts war – vor allem dann.',
        memories:
          'Der Tag, an dem ihr Vater ihr den Schlüssel gab und dazu sagte: „Es läutet ohne dich. Aber es steht nirgends, wenn du nicht da bist."',
        places: ['Das Läutkar', 'Der Rand des Haldenteichs', 'Bohle zweihundert'],
        speech:
          'Kurze Sätze. Sie sagt „gut" statt „ja" und „das ist nicht wahr" statt „nein". Sie unterbricht nie und wartet manchmal so lange, dass andere anfangen zu erklären.',
        background:
          'Sie war einmal fort, für elf Monate, mit zwanzig. Worüber sie nie spricht, ist nicht diese Zeit, sondern die Rückkehr.',
        face: 'Schmal, hohe Stirn, sehr klare Augen. Der Mund fast immer geschlossen.',
        hair: 'Weiß, kurz, selbst geschnitten, ohne Sorgfalt.',
        clothing: 'Der Wetterkittel, darunter grau. Ein Schlüssel an einer Schnur, nie sichtbar.',
        palette: ['#B3B5A4|Haar', '#4A4F48|Kittel', '#A8853F|Schlüssel'],
      },
    }),

    eintrag('fig_jonte', 'character', {
      title: 'Jonte Amsel',
      subtitle: 'Ihr Enkel',
      category: 'Begleiter',
      description:
        'Vierzehn, klettert besser als alle, will fort. Er ist der Einzige, der den Glockenhäher genau genug kennt, um zu merken, dass der Vogel vergisst.',
      tags: ['Kern', 'Häher'],
      favorite: true,
      fields: {
        role: 'Läuft die Wege, die Hedda nicht mehr läuft',
        age: 'Vierzehn',
        herkunft: 'Mooshalde',
        volk: 'Haldenvolk',
        zugehoerigkeit: 'Niemandem, sagt er',
        wesen: ['schnell', 'aufmerksam', 'unruhig', 'loyaler, als ihm lieb ist'],
        faehigkeiten: [
          'unterscheidet vierzig Häher an der Stimme',
          'geht den Steg im Dunkeln ohne Licht',
          'ahmt selbst nach, was der Häher nachahmt',
        ],
        buchauftritt:
          'Er bringt die Beobachtung, aus der alles folgt – und er versteht sie zuletzt.',
        zitat: 'Er kann den Siebenschlag nicht mehr. Ich hab ihn gefragt.',
        personality:
          'Redet viel, wenn er nervös ist, und gar nicht, wenn es ernst wird. Er hält sich für unbeteiligt und ist der Einzige, der jeden Tag hinuntersteigt.',
        goals: 'Weg. In eine Stadt, in der man nach Sonnen rechnet.',
        wishes: 'Dass seine Großmutter ihn aufhält. Sie tut es nicht.',
        fears:
          'Dass er hierbleibt und in vierzig Jahren am selben Pult sitzt – und dass es ihm dann gefällt.',
        habits: ['pfeift Hähertöne', 'nimmt zwei Bohlen auf einmal', 'zählt nichts'],
        quirks: ['antwortet auf Vogelrufe, ohne es zu merken'],
        routine: 'Morgens hinunter bis zur Nebelgrenze, mittags zurück, nachmittags fort.',
        memories: 'Der Siebenschlag, den er als Kind für den Vogel gehalten hat.',
        places: ['Bohle dreihundertzwanzig', 'Die Krone der zweiten Eiche'],
        speech: 'Schnell, viele Halbsätze, verschluckt Endungen.',
        background:
          'Seine Mutter ist fortgegangen und kommt einmal im Jahr. Darüber wird nicht gesprochen, sondern gerechnet.',
        face: 'Sommersprossen bis unter die Augen, immer ein wenig zerkratzt.',
        hair: 'Dunkel, zu lang, ständig nass.',
        clothing: 'Zu große Jacke, Seil um die Hüfte – von Wenzel, geschenkt.',
        palette: ['#3A422F|Jacke', '#8C7A62|Seil', '#A8853F|Sommersprossen'],
      },
    }),

    eintrag('fig_wenzel', 'character', {
      title: 'Wenzel Ohm',
      subtitle: 'Seiler und Wegwart',
      category: 'Nebenfigur',
      description:
        'Hat die Eiche gefällt. Rechtmäßig, ordentlich, für Seilholz, mit Eintrag. Er ist kein Schuldiger, sondern die Antwort auf die Frage – und das ist für alle schwerer auszuhalten.',
      tags: ['Kern', 'Ursache'],
      favorite: true,
      fields: {
        role: 'Hält die vierhundertsechs Bohlen des Haldenstegs',
        age: 'Neunundfünfzig',
        herkunft: 'Zugezogen aus dem Tal, vor dreiunddreißig Jahren',
        volk: 'Talvolk',
        zugehoerigkeit: 'Die Seilerbahn, sein eigenes Werk',
        wesen: ['gründlich', 'wortkarg', 'stolz auf das Falsche', 'ehrlich'],
        faehigkeiten: [
          'schlägt ein Seil, das dreißig Jahre hält',
          'kennt jede Bohle mit Nummer und Alter',
          'fällt einen Baum genau dorthin, wo er ihn haben will',
        ],
        buchauftritt: 'Er sagt zwei Sätze, die den ganzen Band drehen.',
        zitat: 'Sie stand im Weg. Sie stand seit vierhundert Jahren im Weg.',
        personality:
          'Er hat nichts zu verbergen und verbirgt trotzdem etwas – vor sich selbst. Als er begreift, was er getan hat, bestreitet er es nicht eine Sekunde.',
        goals: 'Den Steg über den Winter bringen.',
        wishes: 'Dass ihn jemand Haldenvolk nennt. Nach dreiunddreißig Jahren.',
        fears: 'Dass man ihn fortschickt.',
        habits: ['schreibt jede Instandsetzung auf', 'isst im Stehen'],
        quirks: ['dreht beim Nachdenken ein Stück Schnur zwischen den Fingern'],
        routine: 'Ab Bohle eins nach oben, jeden dritten Tag, in beide Richtungen.',
        memories: 'Der Tag der Fällung. Er hat ihn aufgeschrieben, mit Datum, wie alles.',
        places: ['Die Seilerbahn', 'Bohle eins'],
        speech:
          'Sagt selten mehr als sieben Wörter am Stück. Wenn er etwas erklärt, klingt es wie eine Rechnung.',
        background:
          'Er kam mit sechsundzwanzig herauf, weil unten kein Seiler mehr gebraucht wurde. Er hat den Steg gebaut, auf dem alle gehen, und wird immer noch als der Neue geführt.',
        face: 'Breit, wettergegerbt, sehr ruhig.',
        hair: 'Grau, kurz, unter einer Mütze, die er nie abnimmt.',
        clothing: 'Lederschurz mit eingebrannten Nummern.',
        palette: ['#5F5140|Leder', '#8C7A62|Hanf', '#4A4F48|Mütze'],
      },
    }),

    eintrag('fig_alve', 'character', {
      title: 'Alve Reet',
      subtitle: 'Kartiererin',
      category: 'Nebenfigur',
      description:
        'Zieht durch die Hänge und zeichnet Nebelgrenzen. Sie bringt das Wort mit, das in Mooshalde fehlt – und die Waage, mit der man es prüfen kann.',
      tags: ['Fremde', 'Messen'],
      fields: {
        role: 'Nimmt Nebelhöhen auf, für wen, sagt sie nicht',
        age: 'Anfang dreißig',
        herkunft: 'Unbekannt, sie weicht aus',
        volk: 'Fahrendes Volk der Karten',
        zugehoerigkeit: 'Keiner Zunft, aber irgendjemand bezahlt sie',
        wesen: ['neugierig', 'geduldig', 'unhöflich ohne Absicht'],
        faehigkeiten: [
          'liest eine Nebelgrenze auf zwei Schritt genau',
          'zeichnet mit der linken Hand, während sie mit der rechten misst',
        ],
        buchauftritt: 'Sie kommt im zweiten Drittel und bleibt nicht.',
        zitat: 'Ihr habt keinen Nebel verloren. Ihr habt eine Treppe verloren.',
        personality:
          'Sie stellt Fragen, die als Vorwurf klingen und keiner sind. Sie versteht nicht, warum das Dorf beleidigt ist, und lernt es auch nicht.',
        goals: 'Den Westhang fertig kartieren, bevor der Winter kommt.',
        wishes: 'Einmal irgendwo bleiben, ohne dass es sich wie Aufgeben anfühlt.',
        fears: 'Dass ihre Karten benutzt werden, um zu fällen statt zu schonen.',
        habits: ['misst zweimal', 'schläft draußen, auch wenn ein Bett angeboten wird'],
        quirks: ['nennt Orte bei ihren Höhenzahlen statt bei ihren Namen'],
        routine: 'Vor Sonnenaufgang oben, den ganzen Morgen abwärts, mittags zeichnen.',
        memories: 'Ein Hang im Süden, an dem sie zu spät gemessen hat.',
        places: ['Jeder Punkt, an dem man beides sieht: den Grund und den Kamm'],
        speech: 'Genau, ohne Höflichkeitsformeln. Sie sagt Zahlen, wo andere Adjektive sagen.',
        background: 'Sie erzählt nichts über sich, und niemand fragt ein zweites Mal.',
        face: 'Wind im Gesicht, helle Augen, ein Auge kneift beim Messen.',
        hair: 'Zusammengebunden, halb unter einem Tuch.',
        clothing: 'Wachsleinen, viele Taschen, alle voll Papier.',
        palette: ['#8C9A8E|Wachsleinen', '#DCD3BE|Papier', '#A8853F|Messing der Waage'],
      },
    }),

    /* -------------------------------------------------------- Stimmen */

    eintrag('sti_wenzel', 'voice', {
      title: '„Sie stand im Weg"',
      subtitle: 'Wenzel, als er es erfährt',
      category: 'Geheimnis',
      description:
        'Die Szene, auf die der ganze Band zuläuft. Sie dauert keine zwei Minuten und enthält keine einzige Anklage.',
      tags: ['Kern', 'Wende'],
      favorite: true,
      fields: {
        speaker: 'Wenzel Ohm',
        listener: 'Hedda Amsel, Jonte im Türrahmen',
        occasion: 'In der Seilerbahn, nachdem Hedda ihm das Läutbuch hingelegt hat',
        manner:
          'Ruhig. Er legt das Seil nicht aus der Hand, während er spricht – erst beim letzten Satz.',
        dialect: 'Talvolk: hartes g, kein Auslaut verschluckt. Man hört nach dreiunddreißig Jahren, dass er nicht von hier ist.',
        scene:
          '„Im dritten Monat. Neunzehnter." — „Ich weiß, wann. Ich frage, warum."\n\n„Sie stand im Weg. Sie stand seit vierhundert Jahren im Weg, und der Steg braucht Holz, das nicht bricht. Es gibt kein besseres." Er dreht das Seil weiter. „Ich hab es eingetragen. Steht da, mit Datum."\n\n„Das ist es ja."\n\nEr sieht auf. „Was."\n\n„Es steht bei dir. Und bei mir hört es an dem Tag auf."\n\nEr legt das Seil hin.',
        unsaid:
          'Dass er sich in dem Moment fragt, ob er jetzt gehen muss – und dass Hedda genau das nicht sagt, weil sie es nicht will.',
      },
    }),

    eintrag('sti_hedda', 'voice', {
      title: '„Es läutet ohne dich"',
      subtitle: 'Was Heddas Vater ihr mitgab',
      category: 'Abschied',
      description:
        'Der Satz, an dem sie einundfünfzig Jahre lang festgehalten hat. Am Ende des Bandes gibt sie ihn weiter, und er bedeutet dann etwas anderes.',
      tags: ['Läutbuch', 'Erbe'],
      fields: {
        speaker: 'Ihr Vater, Aske Amsel',
        listener: 'Hedda, dreiundzwanzig Jahre alt',
        occasion: 'Am Pult, bei der Übergabe des Schlüssels',
        manner: 'Beiläufig, während er den Riegel prüft. Er sieht sie dabei nicht an.',
        dialect: 'Haldenvolk. Weiche Endungen, jeder Satz geht am Ende leicht nach oben.',
        scene:
          '„Es läutet ohne dich. Aber es steht nirgends, wenn du nicht da bist."\n\nDann gab er ihr den Schlüssel und ging Ziegen holen. Sie hat achtundvierzig Jahre gebraucht, um zu merken, dass das kein Trost war, sondern eine Aufgabe.',
        unsaid:
          'Dass er sie gefragt hätte, ob sie will – wenn er gewusst hätte, wie man so etwas fragt.',
      },
    }),

    /* ------------------------------------------------------ Artefakte */

    eintrag('art_laeutbuch', 'artifact', {
      title: 'Das Läutbuch',
      subtitle: 'Einundfünfzig Jahre in einer Handschrift',
      category: 'Schriftstück',
      description:
        'Kein magischer Gegenstand. Ein Buch, in dem jemand jeden Tag dasselbe aufgeschrieben hat – und genau deshalb der einzige Beweis, den Mooshalde besitzt.',
      tags: ['Kern', 'Beweis', 'Hedda'],
      favorite: true,
      fields: {
        age: 'Der laufende Band ist neun Jahre alt. Die Reihe reicht hundertneunzig Jahre zurück.',
        origin: 'Das Glockenhaus. Es hat es nie verlassen, bis zu dem Tag in der Seilerbahn.',
        maker: 'Vierzehn Glockenwärter nacheinander, davon zwei mit derselben Handschrift.',
        making:
          'Nebeleichenholz als Deckel, Hanf als Bund, Papier aus dem Tal. Jede Doppelseite ein Monat, jede Zeile ein Läuten: Uhrzeit, Anzahl der Schläge, Nebelstand, drei Zeichen für das Wetter.',
        foundAt: 'Auf dem Läutpult, aufgeschlagen, immer beim laufenden Monat.',
        owner: 'Hedda Amsel – wobei sie sagen würde, umgekehrt.',
        story:
          'Man kann darin blättern und sieht nichts. Man kann zwei Jahre nebeneinanderlegen und sieht immer noch nichts. Erst wenn man die Zeilenzahl je Monat über zwanzig Jahre aufträgt, sieht man eine Linie, die vom dritten Monat des vergangenen Jahres an fällt und nicht wieder steigt.\n\nDas ist die ganze Entdeckung. Sie besteht aus Arithmetik und aus Ausdauer, und beides hat eine vierundsiebzigjährige Frau geliefert, die dabei nie etwas Besonderes gefunden zu haben glaubte.',
        symbolism:
          'Es steht für die einzige Art von Aufmerksamkeit, die dieser Welt hilft: die langweilige, die tägliche, die niemand bemerkt.',
        marks:
          'Der Deckel ist an der unteren rechten Ecke abgegriffen und dort heller. Im laufenden Band vierzehn leere Zeilen hintereinander – die einzige Stelle, an der Hedda den Grund danebengeschrieben hat: „nichts."',
        palette: ['#5F5140|Deckelholz', '#DCD3BE|Papier', '#2A2620|Tinte'],
      },
    }),

    eintrag('obj_nebelwaage', 'prop', {
      title: 'Die Nebelwaage',
      subtitle: 'Alves Werkzeug',
      category: 'Werkzeug',
      description:
        'Wiegt keinen Nebel, sondern das Wasser, das er auf einer Fläche hinterlässt. Das erste Gerät, das je in Mooshalde bestätigt hat, was ein Buch schon wusste.',
      tags: ['Messen', 'Alve'],
      fields: {
        purpose:
          'Bestimmt, wie viel Nebel an einer Stelle vorbeizieht – als Gewicht, in Gran je Stunde.',
        size: 'Unterarmlang, zusammengeklappt eine Handbreit',
        handling:
          'Aufstellen, ausrichten, eine Stunde warten. Das Warten ist der Grund, warum niemand außer Alve das Ding benutzt.',
        details:
          'Ein feines Messinggitter an einem Waagebalken, dazu ein Satz Gewichte in einem Futteral aus Filz. Das Gitter ist die eigentliche Kunst: Es muss so fein sein, dass Nebel daran kondensiert, und so grob, dass Wind hindurchgeht.\n\nAn der Halde zeigte es 4 Gran. Vierzig Schritt tiefer 61.',
        palette: ['#A8853F|Messinggitter', '#5F5140|Futteral', '#B3B5A4|Gewichte'],
      },
    }),

    eintrag('moe_laeutpult', 'furniture', {
      title: 'Heddas Läutpult',
      subtitle: 'Schräg, hoch, für einen Stehenden',
      category: 'Ablage',
      description:
        'Das Möbel, an dem einundfünfzig Jahre entstanden sind. Es hat keine Sitzgelegenheit, und das ist Absicht.',
      tags: ['Glockenhaus', 'Läutbuch'],
      fields: {
        style:
          'Gewachsen statt gebaut: ein einziger Nebeleichenast, aufgestellt, oben abgeflacht. Der Schrägwinkel ist nicht gezimmert, sondern der Winkel, in dem der Ast gewachsen ist.',
        size: 'Brusthoch für eine kleine Frau. Wer größer ist, schreibt schlechter daran.',
        construction:
          'Drei Beine, weil ein vierter Fuß auf dem Bretterboden des Läutkars nie ruhig stünde. Keine Schrauben; alles gezapft und mit Hanf verkeilt.',
        wear: 'Rechts oben eine Mulde, in der der rechte Unterarm liegt – zwei Millimeter tief, über fünf Wärtergenerationen entstanden. Am linken Rand eine Kerbe je Bandwechsel: neun.',
        palette: ['#5F5140|Nebeleiche', '#8C7A62|Hanfkeil', '#2A2620|Tintenfleck'],
      },
    }),

    eintrag('kle_wetterkittel', 'clothing', {
      title: 'Der Wetterkittel',
      subtitle: 'Was man in Mooshalde trägt',
      category: 'Mantel',
      description:
        'Kein Regenmantel. Nebel fällt nicht, er steht – deshalb ist dieser Kittel unten offen und oben dicht.',
      tags: ['Alltag', 'Nebel'],
      fields: {
        fabric:
          'Ziegenwolle, dicht gewalkt, mit Bienenwachs eingerieben. Er wird nicht nass, er wird schwer.',
        cut: 'Weit, ohne Taille, mit hohem Kragen und ganz ohne Knöpfe unterhalb der Brust. Der Saum endet über dem Knie, damit er beim Steigen nicht an den Bohlen streift.',
        movement:
          'Er schwingt nicht, er pendelt – langsam und mit spürbarem Gewicht. Beim Gehen bergab schlägt er zweimal je Schritt gegen die Waden.',
        palette: ['#4A4F48|Kittelgrau', '#5F5140|Wachsglanz', '#B3B5A4|Aufgehellte Schultern'],
      },
    }),

    /* ---------------------------------------------------- Architektur */

    eintrag('arc_glockenhaus', 'architecture', {
      title: 'Das Glockenhaus',
      subtitle: 'Kein Turm, ein Trichter',
      category: 'Gebäude',
      description:
        'Das einzige Bauwerk der Welt, das von Wetter gespielt wird. Es steht quer zum Hang und fängt den Nebel, statt ihn abzuhalten.',
      tags: ['Kern', 'Läuten'],
      favorite: true,
      fields: {
        style:
          'Gewachsen statt gebaut, in Reinform: halb in den Hang gegraben, mit einem Dach aus Moospolstern, das von oben aussieht wie ein etwas zu regelmäßiger Buckel.',
        scale: 'Breiter als hoch. Zwölf Schritt lang, fünf tief, an der höchsten Stelle drei hoch.',
        construction:
          'Trockenmauerwerk aus Hangstein, darauf ein Gebälk aus Nebeleiche. Die hangzugewandte Seite ist ganz offen; die talseitige hat sieben schmale Schlitze, durch die der Nebel wieder austritt.\n\nDazwischen liegt das Läutkar: ein sich verengender Gang, in dem die Luft schneller wird. Genau dort hängen die Glocken.',
        details:
          'Kein einziger rechter Winkel. Die Schlitze sind unterschiedlich breit, weil sie unterschiedliche Glocken bedienen – der breiteste gehört der tiefen.',
        interior:
          'Dunkel, feucht, und selbst bei Windstille hörbar bewegt. An den Balken hängt Schleiermoos in Vorhängen; an ihrer Länge liest man die Jahre. Am Nordende steht das Läutpult, weil dort der Zug am schwächsten ist und die Tinte nicht verweht.',
        palette: ['#3F4A55|Steinschatten', '#5F5140|Gebälk', '#7A8467|Dachmoos'],
      },
    }),

    eintrag('arc_seilerbahn', 'architecture', {
      title: 'Die Seilerbahn',
      subtitle: 'Achtzig Schritt gerade Linie',
      category: 'Konstruktion',
      description:
        'Der einzige gerade Bau in Mooshalde – notwendigerweise, denn ein Seil kann man nicht um die Ecke schlagen.',
      tags: ['Wenzel', 'Handwerk'],
      fields: {
        style:
          'Rein zweckmäßig und deshalb ein Fremdkörper: eine überdachte Rinne, die quer über den Hang gelegt ist wie ein hingelegter Stock.',
        scale: 'Achtzig Schritt lang, zwei breit, mannshoch.',
        construction:
          'Pfosten alle vier Schritt, dazwischen ein Dach aus Schindeln. Der Boden ist gestampfter Lehm, ganz eben – das ist die eigentliche Arbeit, und Wenzel hat drei Jahre daran gestampft.',
        details:
          'Am oberen Ende das Rad, am unteren der Schlitten. Zwischen den Pfosten hängen Nummerntafeln: die Bohlennummern des Stegs, mit dem Datum der letzten Instandsetzung.',
        interior:
          'Es riecht nach Hanf und heißem Talg. Immer ein Seil in Arbeit, immer eins fertig, nie mehr als zwei – „mehr braucht kein Mensch."',
        palette: ['#8C7A62|Hanf', '#5F5140|Pfosten', '#4A4F48|Schindeldach'],
      },
    }),

    /* ---------------------------------------------------- Materialien */

    eintrag('mat_nebeleichenholz', 'material', {
      title: 'Nebeleichenholz',
      subtitle: 'Das beste Holz und die teuerste Entscheidung',
      category: 'Holz',
      description:
        'Es bricht nicht, es fault nicht, es arbeitet nicht. Und um daran zu kommen, muss man den Baum fällen, der den Nebel hebt. Der ganze Band steht in diesem Satz.',
      tags: ['Kern', 'Ursache'],
      favorite: true,
      fields: {
        finish: 'Seidig, fast wachsig, nie rauh',
        hardness: 'Sehr hart, aber elastisch – es gibt nach und kommt zurück.',
        appearance:
          'Honigbraun mit blaugrünem Schimmer im Streiflicht. Die Jahresringe stehen extrem eng; auf einer Daumenbreite liegen dreißig.',
        aging:
          'Es wird heller statt dunkler und bekommt nach Jahrzehnten eine silbrige Oberfläche, unter der die Farbe unverändert liegt. Man sieht das an den Bohlen des Stegs: die alten leuchten, die neuen sind stumpf.',
        usage:
          'Stegbohlen, Gebälk, Buchdeckel, Läutpult. Alles, was tragen oder halten muss.\n\nEs gibt keinen Ersatz. Genau das ist die Falle: Wer den Steg erhalten will, auf dem alle gehen, muss die Bäume fällen, ohne die niemand mehr weiß, welcher Tag ist.',
        palette: ['#8C7A62|Honigbraun', '#55604A|Schimmergrün', '#B3B5A4|Silbern gealtert'],
      },
    }),

    eintrag('mat_haldenbronze', 'material', {
      title: 'Haldenbronze',
      subtitle: 'Woraus die Glocken sind',
      category: 'Metall',
      description:
        'Eine Legierung, die niemand mehr herstellen kann, weil niemand mehr weiß, was außer Kupfer und Zinn darin ist.',
      tags: ['Glocken', 'Verloren'],
      fields: {
        finish: 'Matt, mit einer dünnen graugrünen Haut, die nie abblättert',
        hardness: 'Spröder als gewöhnliche Bronze, dafür klingt sie länger.',
        appearance:
          'Im Schatten fast grün, im Streiflicht messingwarm. Der Übergang findet auf einer Handbreit statt und ist der Grund, warum die Glocken im Nebel zu atmen scheinen.',
        aging:
          'Sie nimmt keine Patina an, sie hat sie von Anfang an. Neu gegossene Stücke sehen alt aus – das hat die Zunft im Tal einmal für einen Fehler gehalten und den Auftrag zurückgegeben.',
        usage:
          'Die sieben Glocken, die Ziegenschellen, Alves Waagegitter. Sonst nichts; es lohnt für nichts anderes.',
        palette: ['#7C8A78|Patinagrün', '#A8853F|Messingwarm', '#3F4A55|Schattenblau'],
      },
    }),

    /* -------------------------------------------------------- Kräfte */

    eintrag('mag_laeuten_lesen', 'magic', {
      title: 'Das Läuten lesen',
      subtitle: 'Keine Gabe, eine Übung',
      category: 'Kraft',
      description:
        'Die einzige „Kraft" in diesem Band, und ausdrücklich keine: Sie besteht darin, sehr lange sehr genau hinzuhören. Jeder kann es lernen. Fast niemand tut es.',
      tags: ['Läuten', 'Hedda'],
      fields: {
        source:
          'Wiederholung. Wer zwanzig Jahre lang jeden Tag dieselben sieben Glocken hört, hört irgendwann Unterschiede, für die es keine Wörter gibt.',
        cost:
          'Zwanzig Jahre. Es gibt keine Abkürzung, und das ist der Grund, warum es in Mooshalde nur zwei Menschen können.',
        limit:
          'Es funktioniert nur bei diesen Glocken, in diesem Haus, an diesem Hang. Wer fortgeht, verliert es innerhalb eines Jahres.',
        effect:
          'Man hört am Klang, wie hoch der Nebel steht, wie feucht die Luft ist und aus welcher Richtung der Zug kommt – auf zehn Schritt und einen halben Tag genau.',
        appearance:
          'Von außen sieht es aus wie Stehenbleiben. Hedda hält beim Gehen an, legt den Kopf leicht schräg und geht weiter. Fremde halten es für Zerstreutheit.',
        sound:
          'Der Unterschied liegt im Nachklang, nicht im Anschlag: Bei hohem Nebel bleibt die tiefe Glocke fast neun Sekunden stehen, bei niedrigem fünf.',
      },
    }),

    /* ---------------------------------------------------- Geschichten */

    eintrag('lor_glocken', 'lore', {
      title: 'Woher die Glocken kamen',
      subtitle: 'Die einzige Geschichte, die alle kennen',
      category: 'Legende',
      description:
        'Sie erklärt, warum die Glocken nicht gegossen, sondern gefunden wurden – und ist, wie sich zeigt, in einem entscheidenden Punkt wahr.',
      tags: ['Legende', 'Glocken'],
      favorite: true,
      fields: {
        era: 'Vor der Zählung, also vor mehr als zweihundert Jahren',
        teller: 'Großmütter, immer im Winter, immer mit denselben Worten',
        summary:
          'Man erzählt, die sieben Glocken seien nicht gegossen worden. Ein Trupp habe sie im Grund gefunden, im Torf, in einer Reihe liegend, mit den Öffnungen nach unten, als hätte sie jemand abgestellt und wäre nicht wiedergekommen.\n\nDer Trupp habe sie heraufgetragen, und als die vierte oben ankam, habe sie von selbst geläutet – ohne dass jemand sie anrührte. Da habe man gewusst, wo das Haus hin muss.',
        variants:
          'In einer Fassung sind es neun Glocken und zwei blieben im Torf. In einer anderen läutete nicht die vierte, sondern die kleinste, und sie läutete, weil ein Kind sie trug.',
        ritual:
          'Beim ersten Läuten nach dem Regen wird die Geschichte nicht erzählt. Man erzählt sie im Winter, wenn wenig geläutet wird – und in diesem Jahr hat sie niemand erzählt.',
        truth:
          'Der Kern stimmt: Die Glocken sind älter als die Halde, und niemand hat sie je gegossen. Und dass die vierte von selbst läutete, als sie oben ankam, ist die genaueste Beobachtung des ganzen Bandes – sie läutete, weil sie zum ersten Mal im aufsteigenden Nebel hing.\n\nDie Legende hat also die Ursache immer schon enthalten. Man hat sie zweihundert Jahre lang für ein Wunder gehalten.',
      },
    }),

    eintrag('mus_haldenschlag', 'music', {
      title: 'Der Haldenschlag',
      subtitle: 'Was die Glocken sagen',
      category: 'Thema',
      description:
        'Kein komponiertes Stück – eine Reihenfolge, die sich aus der Bauweise ergibt. Der Nebel spielt die Glocken immer in derselben Ordnung, weil er immer durch dieselben Schlitze zieht.',
      tags: ['Läuten', 'Klang'],
      favorite: true,
      fields: {
        instruments: [
          'Tiefe Glocke (Grundton)',
          'Drei mittlere',
          'Drei hohe',
          'Ziegenschellen als Untergrund',
        ],
        tempo: 'Sehr langsam, unregelmäßig. Zwischen den Schlägen bis zu neun Sekunden.',
        mood: 'Nicht feierlich. Eher wie jemand, der im Nebenzimmer arbeitet.',
        description:
          'Der Ablauf: ein tiefer Schlag, eine lange Pause, dann die drei hohen dicht hintereinander, dann alles zusammen und ein langes Ausklingen.\n\nDie Anzahl der Durchgänge sagt, wie dicht der Nebel steht: zwei bei dünnem, sieben bei dichtem. Der Siebenschlag kommt nur nach langem Regen und ist das, wonach in diesem Band alle sich sehnen, ohne es zu sagen.\n\nWer eine Vertonung sucht: nichts hinzufügen. Der Fehler wäre, Streicher darunterzulegen. Die Stille zwischen den Schlägen ist das Stück, nicht die Pause darin.',
      },
    }),

    eintrag('que_schweigen', 'quest', {
      title: 'Warum die Glocken schweigen',
      subtitle: 'Die Frage, die der Band beantwortet',
      category: 'Haupt',
      description:
        'Aufgeschrieben als Weg, den man tatsächlich gehen kann – vom ersten Verdacht bis zu dem Satz in der Seilerbahn.',
      tags: ['Kern', 'Handlung'],
      favorite: true,
      fields: {
        hook: 'Ein Vogel, der eine Melodie vergisst, die er ein Leben lang konnte.',
        steps: [
          'Jonte merkt, dass der Häher den Siebenschlag nicht mehr kann',
          'Hedda trägt vierzehn leere Zeilen ein und schreibt „nichts" daneben',
          'Das Schleiermoos am Gebälk ist seit vierzehn Monaten nicht gewachsen',
          'Alve misst: oben 4 Gran, vierzig Schritt tiefer 61',
          'Jonte steigt in den Grund und findet den Stumpf',
          'Wenzels Instandsetzungsbuch: dritter Monat, neunzehnter',
          'Zwei Bücher nebeneinander auf einem Tisch',
        ],
        reward:
          'Keine Belohnung. Eine Antwort, mit der niemand etwas anfangen kann – und drei Menschen, die anschließend gemeinsam etwas versuchen müssen, was Jahrzehnte dauert.',
        mood: 'Langsam, sachlich, ohne Schuldzuweisung. Wer hier einen Schurken sucht, hat den Band nicht gelesen.',
      },
    }),

    /* -------------------------------------------------- Die Zeitalter */

    eintrag('epo_volles', 'epoche', {
      title: 'Die Jahre des vollen Läutens',
      subtitle: 'Von der Zählung bis zum vergangenen Frühjahr',
      category: 'Zeitalter',
      description:
        'Kein goldenes Zeitalter – ein gewöhnliches. Genau deshalb hat niemand bemerkt, dass es zu Ende ging.',
      tags: ['Zeit'],
      fields: {
        kennzeichen:
          'Zwei bis sieben Läuten am Tag. Verträge nach Läuten. Kinder, die den Siebenschlag pfeifen konnten, bevor sie schreiben lernten. Vierzehn Glockenwärter nacheinander, kein einziger Streit um das Amt.',
        wende:
          'Der neunzehnte Tag des dritten Monats im vergangenen Jahr. Am selben Nachmittag wurde in Mooshalde noch siebenmal geläutet; die Krone lag schon unten.',
        quellen:
          'Das Läutbuch, hundertneunzig Jahre lückenlos. Wenzels Instandsetzungsbuch, dreiunddreißig Jahre. Die Fadenlängen des Schleiermooses am Gebälk.',
      },
    }),

    eintrag('epo_stille', 'epoche', {
      title: 'Die stillen Jahre',
      subtitle: 'Seit dem vergangenen Frühjahr',
      category: 'Gegenwart',
      description:
        'Die Gegenwart des Bandes. Sie ist noch nicht zu Ende, und niemand weiß, ob sie eine Epoche wird oder eine Lücke bleibt.',
      tags: ['Zeit', 'Gegenwart'],
      favorite: true,
      fields: {
        kennzeichen:
          'Nebelgrenze dreißig bis vierzig Schritt zu tief. Kein Siebenschlag mehr. Amtlich altert niemand. Der Häher singt einen einzelnen tiefen Schlag zu falschen Zeiten. Der Nebelgänger wird gesehen.',
        wende:
          'Steht aus. Eine Nebeleiche braucht vierhundert Jahre; gepflanzt sind achtzig Stück, im Grund, in einer Reihe. Wer davon etwas hat, ist noch nicht geboren.',
        quellen:
          'Alves Karte des Westhangs. Vierzehn leere Zeilen im Läutbuch. Und ein Satz, den Hedda in den laufenden Band geschrieben hat, wo sonst die Zahl der Schläge steht.',
      },
    }),

    /* ----------------------------------------------------- Werkstatt */

    eintrag('pro_glockenhaus', 'prompt', {
      title: 'Das Glockenhaus im Morgennebel',
      subtitle: 'Basisstil für alle Bauwerke des Bandes',
      category: 'Umgebung',
      description:
        'Zeigt, wie ein Prompt in diesem Buch aussieht: mit der DNA-Regel im Text, nicht daneben.',
      tags: ['Werkstatt'],
      fields: {
        model: 'Beliebig – die Regeln sind wichtiger als das Modell',
        prompt:
          'Ein niedriges, halb in den Hang gegrabenes Steinhaus mit Moosdach, quer zum Berg, die bergseitige Wand ganz offen. Aufsteigender Nebel zieht hindurch. Morgenlicht von der Seite, messingwarm, Schatten blaugrün und durchsichtig. Keine rechten Winkel, alles wirkt gewachsen statt gebaut. Ruhig, weich, ohne Kontrastspitzen. Gedämpfte Palette: Moosgrün, Nebelblau, Messing.',
        negativePrompt:
          'Turm, Kirche, Symmetrie, scharfe Kanten, Neonfarben, dramatische Beleuchtung, Lens Flare, Menschen im Bild',
        aspectRatio: '3:2',
        rating: '4',
        notes:
          'Der häufigste Fehler ist ein Turm. Es ist ausdrücklich kein Turm – es ist breiter als hoch, und wer das nicht in den Prompt schreibt, bekommt eine Kirche.',
      },
    }),

    /* ------------------------------------------------------- Notizen */

    eintrag('sei_offen', 'page', {
      title: 'Was in diesem Band offen ist',
      subtitle: 'Ehrliche Lücken',
      category: 'Notiz',
      description:
        'Ein Weltbuch, das so tut, als sei es fertig, ist gelogen. Was hier steht, ist bewusst nicht entschieden.\n\nWoher die Glocken wirklich kommen. Die Legende sagt, sie lagen im Torf. Wer legt sieben Glocken in einen Sumpf, und warum mit der Öffnung nach unten?\n\nWas der Nebelgänger ist. Er geht seit Generationen dieselbe Runde und tut sonst nichts. Eine Erklärung würde ihn kleiner machen, keine Erklärung macht ihn beliebig – und beides ist schlechter als die Frage.\n\nOb Wenzel bleibt. Der Band sagt es nicht. Er hat dreiunddreissig Jahre lang darauf gewartet, Haldenvolk genannt zu werden, und ausgerechnet der Satz, mit dem er es hätte werden können, ist der, der ihn zum Anlass gemacht hat.\n\nWie es weitergeht. Achtzig Setzlinge stehen im Grund, in einer Reihe. Eine Nebeleiche braucht vierhundert Jahre. Wer davon etwas hat, ist noch nicht geboren, und niemand in diesem Buch wird je erfahren, ob es gereicht hat.',
      tags: ['Notiz'],
    }),

    /* ---------------------------------------------------------- Roman */

    eintrag('rom_stille', 'roman', {
      title: 'Die stillen Jahre',
      subtitle: 'Roman in drei Teilen',
      category: 'Roman',
      description:
        'Dieselbe Geschichte, erzählt statt beschrieben. Sie liegt im Schreibraum und nicht zwischen den Kreaturen – ein Weltbuch beschreibt, ein Manuskript erzählt.',
      tags: ['Roman'],
      favorite: true,
      fields: {
        genre: 'Ruhiger phantastischer Roman, ohne Kampf',
        logline:
          'Als die Glocken eines Bergdorfs verstummen, sucht eine alte Frau, die seit einundfünfzig Jahren jedes Läuten aufschreibt, nach dem Grund – und findet ihn bei dem Mann, der das Dorf am Leben hält.',
        zielWoerter: '78000',
        notes:
          'Erzählt in drei Stimmen: Hedda in der Ich-Form, Jonte in der dritten, Wenzel nur in Dialogen. Er bekommt nie ein Kapitel für sich – das ist der Punkt.',
      },
    }),

    eintrag('kap_eins', 'kapitel', {
      title: 'Erster Teil · Vierzehn leere Zeilen',
      category: 'Teil',
      description: 'Vom ersten Verdacht bis zu der Nacht, in der nichts läutete.',
      fields: {
        summary:
          'Hedda führt das Buch weiter, obwohl nichts einzutragen ist. Jonte bemerkt den Häher. Die Halde redet über das Wetter und meint etwas anderes.',
      },
    }),

    eintrag('kap_zwei', 'kapitel', {
      title: 'Zweiter Teil · Vier Gran',
      category: 'Teil',
      description: 'Alve kommt, misst, und sagt einen Satz, den niemand hören will.',
      fields: {
        summary:
          'Die Fremde bringt ein Wort für das, was fehlt. Jonte steigt zum ersten Mal bis auf den Grund. Der Stumpf.',
      },
    }),

    eintrag('kap_drei', 'kapitel', {
      title: 'Dritter Teil · Zwei Bücher',
      category: 'Teil',
      description: 'Die Seilerbahn, und was danach kommt.',
      fields: {
        summary:
          'Hedda legt Wenzel das Läutbuch hin. Danach müssen drei Menschen etwas beginnen, dessen Ende keiner von ihnen erleben wird. Achtzig Setzlinge, in einer Reihe.',
      },
    }),

    eintrag('sze_haeher', 'szene', {
      title: 'Der Häher hat es vergessen',
      category: 'Szene',
      description: 'Jontes Beobachtung, in der er selbst noch nicht weiß, dass sie eine ist.',
      fields: {
        summary: 'Jonte fragt einen Vogel etwas und bekommt die falsche Antwort.',
        faeden: ['Haupthandlung', 'Jonte', 'Häher'],
        manuskript:
          'Der Häher saß, wo er immer saß, auf dem zweituntersten Ast, und Jonte pfiff ihm den Siebenschlag hinauf, so wie seit er denken konnte.\n\nDer Vogel antwortete mit dem tiefen. Nur dem tiefen.\n\nJonte pfiff noch einmal, langsamer, und teilte die Folge, wie man es bei kleinen Kindern macht: erst der tiefe, dann die Pause, dann die drei hohen. Der Häher legte den Kopf schräg. Dann kam wieder der tiefe, allein, und danach nichts mehr.\n\nEs war nicht so, dass er nicht wollte. Jonte kannte den Unterschied. Wenn ein Häher nicht will, dreht er sich weg und schabt. Dieser hier sah ihn an und wartete, als sei er dran und wisse den Text nicht.\n\n„Du auch", sagte Jonte.\n\nEr sagte es leichthin, im Weitergehen, und erst zweihundert Bohlen später fiel ihm auf, dass er „auch" gesagt hatte.',
      },
    }),

    eintrag('sze_nichts', 'szene', {
      title: '„nichts"',
      category: 'Szene',
      description: 'Hedda trägt zum ersten Mal einen Grund ein, wo sonst eine Zahl steht.',
      fields: {
        summary: 'Vierzehn leere Zeilen, und eine Frau, die sich weigert, sie leer zu lassen.',
        faeden: ['Haupthandlung', 'Hedda', 'Läutbuch'],
        manuskript:
          'Ich habe die Zeile gezogen wie an jedem Abend. Uhrzeit, Anzahl, Nebelstand, drei Zeichen für das Wetter.\n\nDie Uhrzeit konnte ich schreiben. Bei der Anzahl blieb ich stehen.\n\nEine Null wäre falsch gewesen. Eine Null ist eine Zahl, und eine Zahl heißt, dass gezählt wurde. Es war aber nichts zu zählen; es war nicht wenig, es war nicht ausgefallen, es war nicht verschoben. Es war nichts.\n\nIch habe vierzehn Abende lang die Zeile gezogen und die Anzahl freigelassen, und am vierzehnten habe ich den Stift genommen und in die Spalte, in der seit hundertneunzig Jahren nur Ziffern stehen, das Wort geschrieben.\n\nnichts\n\nMein Vater hätte gesagt, das gehört da nicht hin. Er hätte recht gehabt. Aber er hat auch gesagt, es steht nirgends, wenn ich nicht da bin, und ich war da.',
      },
    }),
  ];
}

/* ========================================================================
 * DIE VERBINDUNGEN
 *
 * Der eigentliche Sinn dieses Bandes. Eine Sammlung schöner Einzelseiten
 * hätte nicht gezeigt, wozu ein Weltbuch mit Beziehungen gut ist – erst die
 * Kette macht sichtbar, dass eine gefällte Eiche einen Vogel das Singen
 * verlernen lässt.
 * ===================================================================== */

const KANTEN: [von: Kennung, art: string, nach: Kennung, notiz?: string][] = [
  /* Die tragende Kette – von der Ursache bis zur Wirkung. */
  ['fig_wenzel', 'causes', 'pfl_nebeleiche', 'Gefällt im dritten Monat, neunzehnter – für Stegholz'],
  ['pfl_nebeleiche', 'causes', 'kre_nebelzug', 'Ihre Krone war eine Stufe der Treppe'],
  ['kre_nebelzug', 'causes', 'arc_glockenhaus', 'Ohne Nebel im Läutkar kein Schlag'],
  ['arc_glockenhaus', 'causes', 'mus_haldenschlag', 'Der Bau bestimmt die Reihenfolge'],
  ['mus_haldenschlag', 'causes', 'tier_haeher', 'Was er ein Leben lang hörte, hat er gelernt'],
  ['pfl_nebeleiche', 'follows_dna', 'law_nebel', 'Der Baum ist der Beleg für das Gesetz'],

  /* Der Ort und was in ihm liegt. */
  ['bio_nebelwald', 'contains', 'ort_mooshalde'],
  ['bio_nebelwald', 'contains', 'ort_nebelgrund'],
  ['ort_mooshalde', 'contains', 'arc_glockenhaus'],
  ['ort_mooshalde', 'contains', 'arc_seilerbahn'],
  ['ort_mooshalde', 'contains', 'ort_haldenteich'],
  ['ort_haldensteg', 'precedes', 'ort_nebelgrund', 'Vierhundertsechs Bohlen hinab'],
  ['ort_mooshalde', 'contains', 'ort_haldensteg'],
  ['arc_glockenhaus', 'contains', 'moe_laeutpult'],
  ['moe_laeutpult', 'contains', 'art_laeutbuch'],

  /* Menschen. */
  ['fig_hedda', 'lives_in', 'ort_mooshalde'],
  ['fig_jonte', 'lives_in', 'ort_mooshalde'],
  ['fig_wenzel', 'lives_in', 'ort_mooshalde'],
  ['fig_hedda', 'parent_of', 'fig_jonte', 'Großmutter – die Mutter dazwischen fehlt'],
  ['fig_hedda', 'owns', 'art_laeutbuch', 'Sie würde sagen, umgekehrt'],
  ['fig_hedda', 'uses', 'moe_laeutpult'],
  ['fig_hedda', 'wears', 'kle_wetterkittel'],
  ['fig_hedda', 'uses', 'mag_laeuten_lesen', 'Eine von zweien, die es können'],
  ['fig_hedda', 'allied_with', 'fig_wenzel', 'Dreiunddreißig Jahre nebeneinander, ohne Vertrautheit'],
  ['fig_jonte', 'allied_with', 'fig_alve', 'Sie nimmt ihn ernst, und das ist neu für ihn'],
  ['fig_wenzel', 'owns', 'arc_seilerbahn'],
  ['fig_wenzel', 'uses', 'ort_haldensteg', 'Er hält ihn, seit er hier ist'],
  ['fig_alve', 'uses', 'obj_nebelwaage'],
  ['fig_jonte', 'uses', 'ort_haldensteg', 'Jeden Morgen bis zur Nebelgrenze'],

  /* Natur und Tiere. */
  ['pfl_nebeleiche', 'grows_in', 'ort_nebelgrund'],
  ['pfl_schleiermoos', 'grows_in', 'arc_glockenhaus', 'An den Balken, in Vorhängen'],
  ['pfl_glockenwinde', 'grows_in', 'arc_glockenhaus'],
  ['tier_haeher', 'lives_in', 'bio_nebelwald'],
  ['tier_haeher', 'uses', 'pfl_nebeleiche', 'Schläft auf dem zweituntersten Hauptast'],
  ['tier_waldkoi', 'lives_in', 'ort_haldenteich'],
  ['tier_trittfalter', 'lives_in', 'bio_nebelwald'],
  ['tier_haldenziege', 'lives_in', 'ort_mooshalde'],
  ['tier_haldenziege', 'uses', 'ort_haldensteg', 'Sie geht voran und prüft jede Bohle'],
  ['kre_nebelgaenger', 'lives_in', 'ort_nebelgrund'],
  ['kre_nebelgaenger', 'follows_dna', 'law_nebel', 'Es folgt der Grenze, nicht dem Ort'],
  ['kre_nebelzug', 'grows_in', 'bio_nebelwald'],

  /* Material und Machart. */
  ['mat_nebeleichenholz', 'comes_from', 'pfl_nebeleiche', 'Der Preis steht im Namen'],
  ['ort_haldensteg', 'made_of', 'mat_nebeleichenholz'],
  ['moe_laeutpult', 'made_of', 'mat_nebeleichenholz'],
  ['art_laeutbuch', 'made_of', 'mat_nebeleichenholz', 'Nur die Deckel'],
  ['arc_glockenhaus', 'made_of', 'mat_nebeleichenholz', 'Das Gebälk'],
  ['arc_glockenhaus', 'made_of', 'mat_haldenbronze', 'Die sieben Glocken'],
  ['obj_nebelwaage', 'made_of', 'mat_haldenbronze', 'Das Gitter'],
  ['kle_wetterkittel', 'made_of', 'mat_haldenbronze'],

  /* Regeln und Geschichten. */
  ['arc_glockenhaus', 'follows_dna', 'dna_gewachsen', 'In Reinform: kein rechter Winkel'],
  ['ort_mooshalde', 'follows_dna', 'dna_ruhe'],
  ['mom_erstes', 'follows_dna', 'dna_licht', 'Acht Minuten Messing'],
  ['lor_glocken', 'appears_in', 'arc_glockenhaus'],
  ['lor_glocken', 'follows_dna', 'law_nebel', 'Die Legende enthielt die Ursache immer schon'],
  ['law_gelaeutet', 'follows_dna', 'mus_haldenschlag'],
  ['mus_haldenschlag', 'appears_in', 'arc_glockenhaus'],
  ['que_schweigen', 'plays_at', 'ort_mooshalde'],
  ['sti_wenzel', 'plays_at', 'arc_seilerbahn'],
  ['sti_wenzel', 'pov', 'fig_wenzel'],
  ['sti_hedda', 'pov', 'fig_hedda'],
  ['epo_volles', 'precedes', 'epo_stille', 'Die Wende: dritter Monat, neunzehnter'],
  ['mom_stille', 'appears_in', 'epo_stille'],
  ['mom_erstes', 'appears_in', 'epo_volles'],
  ['mom_mittag', 'plays_at', 'ort_haldensteg', 'Von Bohle zweihundert'],

  /* Der Roman daneben. */
  ['rom_stille', 'contains', 'kap_eins'],
  ['rom_stille', 'contains', 'kap_zwei'],
  ['rom_stille', 'contains', 'kap_drei'],
  ['kap_eins', 'contains', 'sze_haeher'],
  ['kap_eins', 'contains', 'sze_nichts'],
  ['sze_haeher', 'pov', 'fig_jonte'],
  ['sze_nichts', 'pov', 'fig_hedda'],
  ['rom_stille', 'plays_at', 'ort_mooshalde'],
  ['pro_glockenhaus', 'appears_in', 'arc_glockenhaus'],
];

/* ========================================================================
 * ZUSAMMENSETZEN
 * ===================================================================== */

/**
 * Der ganze Band, fertig für eine Buchkennung.
 *
 * Die Kennungen bekommen den Bandpräfix, damit zwei geladene Beispielbände
 * einander nicht überschreiben – und damit die Beziehungen auf die Einträge
 * *dieses* Bandes zeigen und nicht auf die des vorigen.
 */
export function mooshalde(bookId: string): Bauteil {
  const jetzt = Date.now();
  const kennung = (id: Kennung) => `${bookId}__${id}`;

  const entries = baueEintraege().map((e) => ({
    ...e,
    id: kennung(e.id),
    bookId,
  }));

  const vorhanden = new Set(entries.map((e) => e.id));
  const relations: Relation[] = [];

  for (const [von, art, nach, notiz] of KANTEN) {
    const a = kennung(von);
    const b = kennung(nach);
    /*
     * Eine Kante ins Leere ist schlimmer als eine fehlende: Sie taucht im
     * Graphen auf, führt nirgendwohin und ist von Hand nicht zu finden.
     * Deshalb wird hier geprüft und nicht gehofft – die Prüfung im Test
     * zählt mit, damit ein Tippfehler nicht still verschwindet.
     */
    if (!vorhanden.has(a) || !vorhanden.has(b)) continue;
    relations.push({
      id: `${bookId}__rel_${relations.length.toString(36)}`,
      bookId,
      fromId: a,
      toId: b,
      type: art,
      note: notiz,
      createdAt: jetzt,
    });
  }

  return { entries, relations };
}

/** Wie viele Kanten der Band beschreibt – für die Prüfung, die auf Tippfehler achtet. */
export const KANTEN_ANZAHL = KANTEN.length;

/** Wie der Band heisst – eine Stelle, aus der Regal und Bibliothek lesen. */
export const BEISPIEL_TITEL = 'Mooshalde';

/** Der Einband, unter dem Mooshalde im Regal steht. */
export const MOOSHALDE_BUCH = {
  title: BEISPIEL_TITEL,
  subtitle: 'Ein Band zum Ansehen',
  worldName: 'Mooshalde',
  worldTagline: 'Vierzig Dächer an einem Hang, und sieben Glocken, die niemand läutet.',
  coverMaterial: 'leder' as const,
  /*
   * `waldgruen`, nicht `moos`.
   *
   * `moos` gibt es – aber als *Band*farbe, nicht als Einbandfarbe. Der Wert
   * fiel still auf Umbra zurück, und still ist hier das Problem: Der Einband
   * sah aus wie jeder andere, und nichts wies darauf hin, dass eine Farbe
   * verworfen worden war. Gültige Einbandfarben stehen in `bookIdentity.ts`.
   */
  coverColor: 'waldgruen' as const,
  emblemType: 'preset' as const,
  emblemId: 'drache',
};
