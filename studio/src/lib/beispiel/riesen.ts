/**
 * Das Observatorium der stillen Riesen.
 *
 * ---
 *
 * **Drei Quellen, und sie sind auseinanderzuhalten.**
 *
 * Dieser Band hat eine ungewöhnliche Entstehung, und wer ihn später ändert,
 * sollte wissen, woher jede Zeile kommt:
 *
 *   AUS DEM BESTAND   `places.js`, `creatures.js`, `chronicle.js` der ersten
 *                     Dragoncore-App: die vier Orte, die drei Wesen mit ihren
 *                     Zeiten (Koi nach 180 Sekunden, Libelle nach 300, Vogel
 *                     nach 600), das Abtauchen mit Pause und Wiederauftauchen,
 *                     die Chronik aus Anwesenheit und Stille.
 *
 *   AUS DEM TEXT      „Das Observatorium der stillen Riesen" – die Erzählung
 *                     des Verfassers. Sie ist **Kanon**: der Tierwärter, das
 *                     Becken mit den Wasserbäumen, der silberne Koi, die
 *                     kupferne Kuppel, die sich öffnet, die Sternenseher, das
 *                     Kolosswesen mit dem Auge grösser als ein Hausdach, die
 *                     drei Kreise, der Drache über den Wolken.
 *
 *   ERFUNDEN          Die Sammlungspunkte. Sie standen im Auftrag, aber weder
 *                     im Bestand noch im Text; was hier über sie steht, ist
 *                     meine Erfindung und ausdrücklich als solche markiert.
 *
 * ---
 *
 * **Was der Text an meiner ersten Fassung berichtigt hat.**
 *
 * Diese Datei hiess einmal `stillersee.ts` und hatte drei Dinge geraten. Der
 * Text hat alle drei anders entschieden, und die Unterschiede sind keine
 * Feinheiten:
 *
 *   DER DRACHE        Ich hatte ihn und das Kolosswesen zu einem gemacht: der
 *                     Berg *ist* der Drache. Im Text sind es **zwei** – der
 *                     Riese liegt im Tal, der Drache kommt von über den
 *                     Wolken, und der Riese sieht nicht zum Dorf und nicht zu
 *                     den Kois, sondern zum Observatorium. Das ist der ganze
 *                     Angelpunkt der Erzählung; ihn zusammenzuziehen hätte
 *                     sie zerstört.
 *
 *   DAS OBSERVATORIUM Ich hatte einen trocken gesetzten Steinring mit einer
 *                     Öffnung nach Nordwesten. Im Text ist es ein Bau mit
 *                     **kupferner Kuppel, die sich öffnet**, mit hohen
 *                     Fenstern, in denen manchmal Licht steht.
 *
 *   DIE RUHESTELLEN   Ich hatte Verstecke für Tiere daraus gemacht. Im Text
 *                     steht der bessere Sinn, und er stand da, bevor ich ihn
 *                     las: „weshalb sie sich irgendwann **zur Ruhe legten**".
 *                     Eine Ruhestelle ist der Ort, an dem ein Riese sich
 *                     hingelegt hat – und über dem seither ein Wald steht.
 *
 * ---
 *
 * **Warum keine Bilder.**
 *
 * Wie im Band nebenan: Vierzig erfundene Tafeln belegen beim ersten Öffnen
 * mehr Speicher als das eigene Buch nach einem Jahr Arbeit. Die Hintergründe
 * der alten App liegen ausserdem als Dateien im Wurzelverzeichnis.
 */

import type { Entry, EntryType, Relation } from '../../types';
import { emptyFields } from '../templates';

type Kennung = string;

interface Bauteil {
  entries: Entry[];
  relations: Relation[];
}

function eintrag(id: Kennung, type: EntryType, teil: Partial<Entry> & { title: string }): Entry {
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
    fields: { ...emptyFields(type), ...(teil.fields ?? {}) },
  };
}

/* ========================================================================
 * DIE WELT
 * ===================================================================== */

function baueEintraege(): Entry[] {
  return [
    /* ------------------------------------------------------ Naturgesetze */

    eintrag('law_schlaf', 'law', {
      title: 'Wer lange genug liegt, wird Land',
      subtitle: 'Das Gesetz der stillen Riesen',
      category: 'Zeit',
      description:
        'Das tragende Gesetz dieses Bandes, und es steht wörtlich im Text: Wesen, die so lange schliefen, dass Wälder auf ihren Rücken wachsen konnten.',
      tags: ['Riesen', 'Kern'],
      favorite: true,
      fields: {
        rule: 'Ein Kolosswesen, das sich hinlegt, wird nach genügend Zeit nicht mehr als Wesen erkannt. Erde sammelt sich, Moos fasst, Bäume schlagen Wurzeln. Was dann dasteht, nennen die Leute einen Bergrücken.',
        because:
          'Es liegt nicht an der Haut, sondern an der Dauer. Alles, was lange genug stillhält, nimmt an, was auf es fällt. Ein Riese hält länger still als alles andere.',
        limit:
          'Es gilt nur für das Liegen. Ein Riese, der sich alle paar Jahre rührt, trägt keinen Wald – und wird deshalb auch nie für einen Berg gehalten.',
        cost: 'Die Unkenntlichkeit. Wer Land geworden ist, wird behandelt wie Land: Man baut auf ihm, man fällt seine Bäume, man nennt ihn nach einer Himmelsrichtung.',
        consequence:
          'Wenn einer aufwacht, ist das erste, was geschieht, kein Schritt und kein Laut: Stein löst sich aus dem Hang, Bäume neigen sich, und Vögel steigen in Schwärmen aus den Kronen.',
        known:
          'Die Alten haben davon erzählt. Niemand weiss, wie alt sie sind oder weshalb sie sich irgendwann zur Ruhe legten.',
      },
    }),

    eintrag('law_verweilen', 'law', {
      title: 'Was sich zeigt, hängt von der Dauer ab',
      subtitle: 'Das Gesetz des Bleibens',
      category: 'Zeit',
      description:
        'Das zweite Gesetz. Es stand von Anfang an im Programm der alten App, nur in Sekunden statt in Worten – und es erklärt, warum der Tierwärter es an den Kois zuerst bemerkte.',
      tags: ['Stille'],
      fields: {
        rule: 'Nichts hier zeigt sich, weil jemand hinsieht. Es zeigt sich, weil jemand geblieben ist – und was am längsten stillhält, merkt am ersten, wenn etwas anders wird.',
        because:
          'Die Tiere richten sich nicht nach Sicht, sondern nach Ruhe. Bewegung am Ufer ist für sie dasselbe wie ein Schatten von oben: Sie warten ihn ab.',
        limit:
          'Es lässt sich nicht beschleunigen. Wer sucht, bleibt nicht – und wer nicht bleibt, sieht nichts.',
        cost: 'Zeit, und zwar die eine Sorte, die sich nicht sparen lässt.',
        consequence:
          'Nach drei Minuten zeigt sich der Koi. Nach fünf die Libelle. Nach zehn der Vogel. Und an dem Morgen, an dem das Tal erwachte, standen die Kois reglos im Wasser, bevor die Sonne über den Wipfeln war.',
        known: 'Jeder am Becken weiss es. Die meisten halten es für eine Redensart über Geduld.',
      },
    }),

    /* ------------------------------------------------------------- Orte */

    eintrag('ort_becken', 'location', {
      title: 'Das große Becken',
      subtitle: 'Wo die Kois stehen',
      category: 'Wasser',
      description:
        'Das Becken des Dorfes, gespeist vom stillen See darüber. Spiegelglatt, wenn nichts es stört – und an diesem Morgen stand es still, obwohl Fütterungszeit war.',
      tags: ['Wasser', 'Anfang'],
      favorite: true,
      fields: {
        region: 'Am Talgrund, unterhalb des Sees, oberhalb der ersten Häuser.',
        atmosphere:
          'Ruhe, die nicht leer ist. Man merkt nach einigen Minuten, dass ständig etwas geschieht – nur nichts Lautes.',
        light: 'Vor Sonnenaufgang bleiben die Baumwipfel schwarz und das Wasser heller als der Himmel.',
        sound: 'Nichts. Das ist an diesem Ort die Auskunft, nicht die Abwesenheit einer.',
        palette: 'Zinn, Moosgrün, ein Silberrücken',
      },
    }),

    eintrag('ort_see', 'location', {
      title: 'Der stille See',
      subtitle: 'Wo alles begann',
      category: 'Wasser',
      description:
        'Der Ort, an dem dieser Band anfängt und von dem das Becken sein Wasser bekommt. Flach am Rand, unabsehbar in der Mitte, und so windstill, dass Ringe auf dem Wasser von etwas anderem kommen müssen als vom Wetter.',
      tags: ['Anfang', 'Wasser'],
      fields: {
        region: 'Talgrund unterhalb des Wasserfalls, ringsum bewaldet.',
        atmosphere: 'Wach. Anders als im Tal, wo die Stille schwer ist.',
        light: 'Von schräg oben durch die Kronen, in einzelnen Bahnen.',
        sound: 'Der Wasserfall, weit genug entfernt, um ein Grundton zu sein.',
        palette: 'Tiefes Moosgrün, Zinn, gebrochenes Gold auf der Wasserhaut',
      },
    }),

    eintrag('ort_tal', 'location', {
      title: 'Das Tal',
      subtitle: 'Wo etwas Großes ruht',
      category: 'Weite',
      description:
        'Diese Zeile stand über dem Ort, bevor jemand wusste, wie genau sie stimmt. Was von unten aussieht wie der gegenüberliegende Hang, ist der Rücken eines Schlafenden.',
      tags: ['Weite', 'Riesen'],
      favorite: true,
      fields: {
        region: 'Oberhalb des Sees, unter dem Berg mit dem Observatorium.',
        atmosphere:
          'Weit und still. Die Stille ist hier anders als am Becken: dort ist sie wach, hier ist sie schwer.',
        light: 'Der Südhang liegt am Nachmittag im Schatten, obwohl nichts dasteht, was ihn werfen könnte.',
        sound: 'Wind. Und seit jenem Morgen ein Grollen, das kein Gewitter ist.',
        palette: 'Trockenes Gras, Schiefer, ein Grau, das in der Sonne bronzen wird',
      },
    }),

    eintrag('ort_bibliothek', 'location', {
      title: 'Die Bibliothek',
      subtitle: 'Wo Wissen wächst',
      category: 'Innenraum',
      description:
        'Kein Bau zum Aufbewahren, sondern einer zum Weiterwachsen. Hier liegen die Aufzeichnungen der Sternenseher, seit oben niemand mehr schreibt.',
      tags: ['Innen'],
      fields: {
        region: 'Am Osthang, in den Fels gesetzt. Von aussen kaum grösser als ein Tor.',
        atmosphere: 'Trocken und warm, obwohl der Fels kalt ist.',
        light: 'Kein Tageslicht.',
        sound: 'Papier, weit weg. Kein Wasser – das ist der Unterschied zu allen anderen Orten.',
        palette: 'Dunkles Holz, Messing, sehr wenig Weiss',
      },
    }),

    eintrag('ort_kuppel', 'location', {
      title: 'Die Gedankenkuppel',
      subtitle: 'Wo Gedanken zur Ruhe kommen',
      category: 'Innenraum',
      description:
        'Nicht zu verwechseln mit der kupfernen Kuppel oben am Berg. Diese hier ist klein, innen bemalt, und der Sternenhimmel darin ist nicht der, den man draussen sieht.',
      tags: ['Gedanken', 'Innen'],
      fields: {
        region: 'Auf der Kuppe zwischen See und Berg.',
        atmosphere: 'Man spricht hier leiser, ohne dass jemand darum bittet.',
        light: 'Punkte, die wandern.',
        sound: 'Das eigene Atmen, deutlicher als sonst irgendwo.',
        palette: 'Nachtblau, Bleiweiss, Goldpunkte',
      },
    }),

    /* ------------------------------------------------------------- Bauten */

    eintrag('arc_observatorium', 'architecture', {
      title: 'Das Observatorium',
      subtitle: 'Die kupferne Kuppel über dem Tal',
      category: 'Bau',
      description:
        'Seit Generationen ragt es über dem Tal auf. Früher zeichneten die Sternenseher dort die Bewegungen des Himmels auf; heute kommt kaum noch jemand hinauf. Nur in besonders klaren Nächten glimmt Licht hinter den hohen Fenstern.',
      tags: ['Bau', 'Riesen'],
      favorite: true,
      fields: {
        style:
          'Alt und genau. Nichts daran ist Schmuck; jede Linie hat einmal einer Messung gedient.',
        scale: 'Die Kuppel überragt die höchsten Bäume des Berghangs.',
        construction:
          'Steinsockel, darauf die Kuppel aus Kupfer – grün von aussen, innen blank gehalten. Sie ruht auf einem Ring, auf dem sie sich dreht.',
        details:
          'Die Kuppel öffnet sich. Langsam und lautlos, ohne dass jemand daran arbeitet; wer es sieht, hört nichts, und das ist das Unheimliche daran.',
        interior:
          'Hohe Fenster ringsum. In der Mitte, wo das Fernrohr stand, ist der Boden abgetreten. Was dort jetzt steht, hat niemand aufgeschrieben.',
        palette: 'Kupfergrün, Schiefer, ein einzelner Lichtstrahl',
      },
    }),

    eintrag('arc_sammlungspunkte', 'architecture', {
      title: 'Die Sammlungspunkte',
      subtitle: 'Kniehohe Steine an den Wegen',
      category: 'Bau',
      description:
        'ERFUNDEN – nicht aus dem Bestand und nicht aus dem Text. Steine an Stellen, an denen ohnehin jeder stehenbleibt: an der Furt, am Becken, am Tor der Bibliothek. Wer etwas loswerden will, legt die Hand auf.',
      tags: ['Gedanken', 'Erfunden'],
      fields: {
        style: 'Kein Stil. Sie sehen aus wie Steine, und das ist Absicht.',
        scale: 'Kniehoch, eine Handfläche breit oben.',
        construction: 'Ausgesucht, nicht behauen. Die Oberseite ist von Händen glatt.',
        details: 'Sieben sind es. Wo der achte stand, liegt eine Mulde.',
        interior: '–',
        palette: 'Schiefer, Handfettglanz',
      },
    }),

    /* ---------------------------------------------------------- Kreaturen */

    eintrag('kre_kolosswesen', 'creature', {
      title: 'Die Kolosswesen',
      subtitle: 'Die stillen Riesen',
      category: 'Koloss',
      description:
        'Die Art, von der die Alten erzählten: Wesen, die so lange schlafen, dass Wälder auf ihren Rücken wachsen können. Niemand weiss, wie alt sie sind oder weshalb sie sich irgendwann zur Ruhe legten.',
      tags: ['Riesen', 'Selten'],
      favorite: true,
      fields: {
        species: 'Koloss. Es gibt kein zweites Wort dafür, weil es kein zweites gibt.',
        size: 'Ein Auge grösser als das Dach eines Hauses. Den Rest hat niemand von aussen gesehen.',
        behaviour:
          'Sie liegen. Das ist keine Pause zwischen Handlungen, sondern die Handlung selbst.',
        personality:
          'Keine, die sich prüfen liesse. Wer ihnen etwas zuschreibt, beschreibt sich selbst nach zwei Stunden Warten.',
        territory: 'Die Täler. Sie haben sie nicht besetzt, sie sind sie geworden.',
        sleep: 'Über Menschenalter. Was sie weckt, ist nicht bekannt – ausser dem einen Fall.',
        voice: 'Ein tiefes Grollen, das über das Tal rollt. Wer Gewitter kennt, erkennt sofort, dass es keines ist.',
        tracks: 'Moos, Erde und kleine Bäume, die von einem Hang herabgleiten, an dem nichts gegraben wurde.',
        locomotion: 'Nicht beschrieben. Bisher hat sich nur einer aufgerichtet, und der ging nirgendwohin.',
        palette: 'Schiefer, Waldmoos, unter der Erde eine Haut wie nasser Stein',
      },
    }),

    eintrag('kre_bergruecken', 'creature', {
      title: 'Der Bergrücken',
      subtitle: 'Der Riese, der das Auge öffnete',
      category: 'Koloss',
      description:
        'Der eine, der erwachte. Der Tierwärter hielt es zuerst für einen Erdrutsch: Stein löste sich, Bäume neigten sich, Vögel stiegen in Schwärmen auf. Dann öffnete sich zwischen den Felsen ein Auge.',
      tags: ['Riesen', 'Kern'],
      favorite: true,
      fields: {
        species: 'Kolosswesen',
        size: 'Der gegenüberliegende Hang des Tals',
        behaviour:
          'Er richtete den Kopf auf – nicht zum Dorf und nicht zu den Kois. Zum Observatorium. Das ist die ganze Auskunft, die er bisher gegeben hat.',
        personality: 'Unbekannt. Er hat nichts getan, was sich als Absicht lesen liesse, ausser diesem einen Blick.',
        territory: 'Das Tal',
        sleep: 'Jahrhunderte. Über ihm stand ein Wald, der alt genug war, dass niemand ihn für jung hielt.',
        voice: 'Das Grollen. Oder die Antwort darauf – das ist noch nicht entschieden.',
        tracks: 'Ein Schatten am Südhang, der nicht zur Sonne passt',
        locomotion: 'Er hat sich gehoben und sonst nichts',
        palette: 'Moos, Erde, Stein, darunter Bronze',
      },
    }),

    eintrag('kre_drache', 'creature', {
      title: 'Der Drache',
      subtitle: 'Was über den Wolken antwortete',
      category: 'Drache',
      description:
        'Nicht der Riese, und das ist der Angelpunkt: Der Riese liegt im Tal, der Drache kommt von oben. Er erschien zuerst im Spiegelbild des Beckens – am Himmel selbst war er da noch nicht zu sehen.',
      tags: ['Drache', 'Kern'],
      favorite: true,
      fields: {
        species: 'Unbekannt. Flügel, ein langer Hals, ein Körper grösser als jedes Tier, das jemand im Tal je gesehen hat.',
        size: 'Nicht bestimmt. Wer ihn sah, hatte keine Vergleichsgrösse am Himmel.',
        behaviour:
          'Er antwortete. Der Lichtstrahl stieg auf, und irgendwo weit über den Wolken kam etwas zurück.',
        personality: 'Nichts bekannt.',
        territory: 'Über der Wolkendecke',
        sleep: 'Unbekannt',
        voice: 'Das, was auf das Grollen folgte',
        tracks: 'Sein Spiegelbild im Wasser, bevor er am Himmel steht. Niemand weiss, warum in dieser Reihenfolge.',
        locomotion: 'Er brach durch die Wolkendecke, hoch über dem Observatorium',
        palette: 'Gegen den dunklen Morgenhimmel nur Umriss',
      },
    }),

    /* -------------------------------------------------------------- Tiere */

    eintrag('tier_koi', 'animal', {
      title: 'Der silberne Koi',
      subtitle: 'Bemerkte es zuerst',
      category: 'Wasser',
      description:
        'Er stieg langsam aus der Tiefe, durchbrach mit dem Rücken das Wasser – und schnappte nicht nach dem Futter, sondern blickte nach oben. Zum Berg.',
      tags: ['Wasser', 'Kern'],
      favorite: true,
      fields: {
        species: 'Grosser Karpfen, silbern',
        size: 'Unterarmlang, im tiefen Wasser wirkt er doppelt so gross',
        behaviour:
          'Etappen von wenigen Zügen, dann Stillstand. An jenem Morgen keine Bewegung, bis er aufstieg – und später ein einziger Schlag mit der Schwanzflosse.',
        diet: 'Was der Tierwärter bringt',
        territory: 'Das grosse Becken, zwischen den Wurzeln der Wasserbäume',
        sleep: 'Unter den Wurzeln',
        voice: 'Keine. Was man hört, sind die Kreise.',
        tracks: 'Drei Kreise, die sich nacheinander über das Wasser ausbreiten',
        palette: 'Silber auf Zinn, im Abtauchen ins Graugrün',
      },
    }),

    eintrag('tier_libelle', 'animal', {
      title: 'Die Libelle',
      subtitle: 'Nach fünf Minuten',
      category: 'Luft',
      description:
        'Aus dem Bestand der alten App. Sie kommt später als der Koi und bleibt kürzer; zwei Zonen am Ufer gehören ihr.',
      tags: ['Luft'],
      fields: {
        species: 'Grosslibelle, Flügel ohne Farbe',
        size: 'Eine Handspanne',
        behaviour:
          'Steht in der Luft, als hinge sie an einem Faden, und ist im nächsten Augenblick zwei Schritt weiter.',
        diet: 'Was über dem Wasser steht',
        territory: 'Zwei Zonen am West- und am Ostufer',
        sleep: 'Im Schilf, angeklammert, den Kopf nach unten',
        voice: 'Ein Ton so hoch, dass man ihn für ein Ohrenklingen hält',
        tracks: 'Keine. Das ist das Unangenehme an ihr.',
        palette: 'Glas, Öl, ein Blaustich bei Gegenlicht',
      },
    }),

    eintrag('tier_vogel', 'animal', {
      title: 'Der Vogel',
      subtitle: 'Nach zehn Minuten',
      category: 'Luft',
      description:
        'Aus dem Bestand. Der letzte der drei – und an jenem Morgen keiner von ihnen allein: Vögel stiegen in Schwärmen aus den Kronen, als sich der Hang bewegte.',
      tags: ['Luft', 'Selten'],
      fields: {
        species: 'Nicht bestimmt. Am ehesten ein Häher, aber zu gross.',
        size: 'Zwei Handspannen, die Flügel doppelt',
        behaviour: 'Er überquert das Wasser in einem Zug und dreht nicht ab.',
        diet: 'Unbekannt. Am Becken frisst er nichts.',
        territory: 'See und Tal, und dazwischen nichts',
        sleep: 'Auf den hohen Kanten',
        migration: 'Zwischen See und Tal, ohne Jahreszeit',
        voice: 'Zwei Töne, der zweite tiefer',
        tracks: 'Ein Schatten, der über das Wasser geht, bevor man ihn selbst sieht',
        palette: 'Schiefergrau, ein Blau im Flügelbug',
      },
    }),

    /* -------------------------------------------------------- Kreisläufe */

    eintrag('kre_ruhestellen', 'cycle', {
      title: 'Die Ruhestellen',
      subtitle: 'Wo ein Riese sich hingelegt hat',
      category: 'Ordnung',
      description:
        'Aus dem Text: „weshalb sie sich irgendwann zur Ruhe legten." Eine Ruhestelle ist kein Versteck, sondern ein Ort, über dem seither ein Wald steht.',
      tags: ['Riesen'],
      favorite: true,
      fields: {
        span: 'Jahrhunderte, soweit sich zurückrechnen lässt',
        trigger: 'Unbekannt. Niemand weiss, weshalb sie sich hinlegen.',
        growth:
          'Zuerst sammelt sich Erde in den Falten. Dann fasst Moos. Nach etwa vierzig Jahren halten die ersten Bäume.',
        decay:
          'Es gibt keinen Verfall, nur das Vergessen: Nach drei Menschenaltern trägt die Stelle einen Namen, der von einer Himmelsrichtung kommt.',
        rebirth: 'Wenn einer erwacht, gleitet alles herab, was in der Zwischenzeit auf ihm gewachsen ist.',
        habitat: 'Talhänge, Grate, alles, was von unten wie ein Rücken aussieht',
        chain:
          'Ohne Ruhestelle kein Wald auf einem Riesen; ohne Wald keine Verwechslung mit einem Berg; ohne die Verwechslung kein Schrecken an jenem Morgen.',
        symbiosis:
          'Der Wald lebt von ihm, ohne ihn zu kennen. Was den Wald fällt, weckt vielleicht das, worauf er stand.',
        palette: 'Waldmoos über Schiefer',
      },
    }),

    eintrag('kre_kreise', 'cycle', {
      title: 'Die drei Kreise',
      subtitle: 'Was der Schwanzschlag auslöste',
      category: 'Wasser',
      description:
        'Einer. Zwei. Drei. Und im dritten stand eine Gestalt, die am Himmel noch nicht zu sehen war.',
      tags: ['Wasser', 'Drache'],
      favorite: true,
      fields: {
        span: 'Wenige Atemzüge',
        trigger: 'Ein einziger Schlag mit der Schwanzflosse, nachdem lange nichts geschehen war',
        growth: 'Vom Mittelpunkt nach aussen, drei, nacheinander und gleich weit auseinander',
        decay: 'Sie erreichen den Beckenrand nicht',
        rebirth: 'Seither stehen an stillen Morgen Kreise auf dem Wasser, ohne dass jemand schlägt',
        habitat: 'Das grosse Becken. Auf dem See darüber sieht man es nicht.',
        chain:
          'Schlag, Kreise, Spiegelbild – und erst danach der Himmel. Wer diese Reihenfolge erklären kann, hat den Band verstanden.',
        symbiosis: '–',
        palette: 'Zinn auf Zinn, und für einen Atemzug ein Umriss darin',
      },
    }),

    /* ---------------------------------------------------------- Überliefertes */

    eintrag('lore_sternenseher', 'lore', {
      title: 'Die Sternenseher',
      subtitle: 'Die im Observatorium schrieben',
      category: 'Überliefert',
      description:
        'Sie zeichneten die Bewegungen des Himmels auf, Generationen lang. Warum sie aufhörten, steht in keiner ihrer Aufzeichnungen.',
      tags: ['Überliefert', 'Riesen'],
      fields: {
        era: 'Von der Errichtung der Kuppel bis vor wenigen Menschenaltern',
        teller: 'Die Bibliothek, die ihre Bände übernommen hat',
        summary:
          'Nacht für Nacht dasselbe: Stand, Bewegung, Abweichung. Die Bände sind vollständig bis zu einem Datum, und danach kommt nichts mehr.',
        variants:
          'Im Dorf heisst es, sie seien fortgegangen. In der Bibliothek hält man es für möglich, dass sie geblieben sind und nur aufgehört haben zu schreiben.',
        ritual:
          'Die Kuppel wurde jede klare Nacht geöffnet. Dass sie sich noch öffnet, hat bis zu jenem Morgen niemand geprüft.',
        truth:
          'Ihre letzten Seiten handeln nicht vom Himmel. Sie handeln vom Südhang und davon, dass sein Schatten nicht zur Sonne passt.',
      },
    }),

    eintrag('lore_chronik', 'lore', {
      title: 'Die Chronik',
      subtitle: 'Was mitgeschrieben wird, ohne dass jemand schreibt',
      category: 'Aufzeichnung',
      description:
        'Aus dem Bestand: Am Becken wird festgehalten, wie lange jemand da war und wie lange er still war – und die erste Begegnung mit einer Art, aber nur die erste.',
      tags: ['Aufzeichnung'],
      fields: {
        era: 'So lange, wie jemand die Kois füttert',
        teller: 'Niemand im Besonderen. Wer geht, trägt ein.',
        summary:
          'Zwei Spalten: Anwesenheit und Stille. Die zweite ist die kürzere und die wichtigere.',
        variants:
          'Manche zählen die Stille ab dem Moment, in dem man sitzt. Andere erst ab dem, in dem man aufhört zu warten.',
        ritual: 'Beim Gehen die Hand auf den Sammlungspunkt an der Furt.',
        truth:
          'Die erste Begegnung wird nur einmal je Besuch vermerkt – deshalb bleibt die Chronik selten und lesbar, statt bei jedem Auf- und Abtauchen eine Zeile zu erzeugen.',
      },
    }),

    /* ------------------------------------------------------------ Momente */

    eintrag('mom_erwachen', 'moment', {
      title: 'Der Morgen, an dem das Tal erwachte',
      subtitle: 'Zum ersten Mal seit Jahrhunderten',
      category: 'Am Becken',
      description:
        'Der Moment, für den dieser Band gebaut ist. Er beginnt nicht mit dem Riesen und nicht mit dem Drachen, sondern damit, dass Fische nicht fressen.',
      tags: ['Kern', 'Riesen', 'Drache'],
      favorite: true,
      fields: {
        timeOfDay: 'Vor Sonnenaufgang',
        season: 'Nicht überliefert',
        light:
          'Die Baumwipfel noch schwarz. Dann ein einzelner Lichtstrahl aus der geöffneten Kuppel in den dunklen Morgenhimmel.',
        sound:
          'Zuerst nichts – kein Flossenschlag. Dann Stein, der sich löst. Dann ein tiefes Grollen über dem Tal, und eine Antwort von über den Wolken.',
        smell: 'Nasse Erde, die vorher unter Moos lag',
        weather: 'Klar. Was aussieht wie ein Gewitter, ist keines.',
        air: 'Still, bis die Vögel aufsteigen',
        water:
          'Spiegelglatt, bis ein einziger Schwanzschlag drei Kreise darüber schickt – und im Spiegelbild steht, was am Himmel noch fehlt.',
        change:
          'Vorher war der gegenüberliegende Hang ein Hang. Nachher war er ein Rücken, und die alte Zeile über dem Tal war keine Redensart mehr.',
        feeling:
          'Kein Schrecken zuerst, sondern Unglauben: Der Tierwärter hielt es für einen Erdrutsch, bis sich das Auge öffnete.',
        palette: 'Schwarze Wipfel, Zinn, Kupfergrün, ein Strahl',
      },
    }),

    /* ------------------------------------------------------------ Figuren */

    eintrag('fig_tierwaerter', 'character', {
      title: 'Der Tierwärter',
      subtitle: 'Bemerkte es an den Kois',
      category: 'Am Becken',
      description:
        'Er kam mit dem Futtereimer wie an jedem Morgen und stellte ihn wieder ab. Dass das Tal erwachte, hat vor ihm niemand gesehen – weil vor ihm niemand hinsah, wenn nichts geschieht.',
      tags: ['Kern'],
      favorite: true,
      fields: {
        role: 'Füttert die Kois',
        wesen: 'Ruhig, gewohnheitsmässig, ohne Neugier auf Grosses. Genau deshalb fiel ihm das Kleine auf.',
        faehigkeiten: 'Kennt jeden Fisch · Merkt Abweichungen · Bleibt stehen',
        zitat: 'Was habt ihr denn?',
        places: 'Das grosse Becken',
        habits: 'Stellt den Eimer ab, bevor er eine Frage stellt.',
        routine: 'Vor Sonnenaufgang am Becken, jeden Tag, seit Jahren.',
        memories:
          'Er folgte dem Blick eines Fisches. Das ist der Satz, mit dem er es später erzählt, und niemand glaubt ihm den Anfang.',
        fears: 'Dass es wieder still wird und er der Einzige bleibt, der es gesehen hat.',
        background:
          'Über ihn ist wenig bekannt, und das passt: Er ist der Mensch, der da war – nicht der, der etwas wollte.',
      },
    }),
  ];
}

/* ========================================================================
 * DIE VERBINDUNGEN
 *
 * Die Kette dieses Bandes läuft von einer **Beobachtung** zu einer Antwort:
 * Fische stehen still → ein Wärter sieht hin → ein Hang bewegt sich → ein Auge
 * → ein Blick zum Observatorium → eine Kuppel öffnet sich → ein Strahl → eine
 * Antwort über den Wolken.
 * ===================================================================== */

const KANTEN: [von: Kennung, art: string, nach: Kennung, notiz?: string][] = [
  /* Die tragende Kette. */
  ['tier_koi', 'causes', 'fig_tierwaerter', 'Er bemerkte es an den Kois'],
  ['fig_tierwaerter', 'pov', 'mom_erwachen', 'Der Einzige, der dabei war'],
  ['kre_bergruecken', 'causes', 'mom_erwachen', 'Zwischen den Felsen öffnete sich ein Auge'],
  ['kre_bergruecken', 'uses', 'arc_observatorium', 'Nicht zum Dorf, nicht zu den Kois – zum Observatorium'],
  ['arc_observatorium', 'causes', 'kre_drache', 'Ein Lichtstrahl, und über den Wolken antwortete etwas'],
  ['kre_drache', 'appears_in', 'kre_kreise', 'Im dritten Kreis, bevor er am Himmel stand'],
  ['tier_koi', 'causes', 'kre_kreise', 'Ein einziger Schlag mit der Schwanzflosse'],

  /* Die Riesen. */
  ['kre_bergruecken', 'variant_of', 'kre_kolosswesen', 'Der eine, der erwachte'],
  ['kre_kolosswesen', 'follows_dna', 'law_schlaf'],
  ['kre_kolosswesen', 'causes', 'kre_ruhestellen', 'Weshalb sie sich irgendwann zur Ruhe legten'],
  ['kre_bergruecken', 'lives_in', 'ort_tal', 'Er hat es nicht besetzt, er ist es geworden'],
  ['ort_tal', 'contains', 'kre_ruhestellen'],
  ['kre_ruhestellen', 'follows_dna', 'law_schlaf'],

  /* Das Becken und was darin steht. */
  ['tier_koi', 'lives_in', 'ort_becken'],
  ['kre_kreise', 'appears_in', 'ort_becken'],
  ['ort_becken', 'comes_from', 'ort_see', 'Gespeist vom See darüber'],
  ['fig_tierwaerter', 'lives_in', 'ort_becken'],
  ['mom_erwachen', 'appears_in', 'ort_becken'],
  ['tier_libelle', 'lives_in', 'ort_see'],
  ['tier_vogel', 'lives_in', 'ort_see'],
  ['tier_vogel', 'lives_in', 'ort_tal', 'Der einzige, der beides kennt'],
  ['tier_vogel', 'appears_in', 'mom_erwachen', 'In Schwärmen aus den Kronen'],

  /* Das Observatorium und die, die darin schrieben. */
  ['lore_sternenseher', 'uses', 'arc_observatorium'],
  ['lore_sternenseher', 'appears_in', 'ort_bibliothek', 'Ihre Bände liegen dort'],
  ['lore_sternenseher', 'related', 'kre_bergruecken', 'Ihre letzten Seiten handeln vom Südhang'],
  ['arc_observatorium', 'appears_in', 'mom_erwachen'],

  /* Warum es auffiel. */
  ['tier_koi', 'follows_dna', 'law_verweilen', 'Was am längsten stillhält, merkt es am ersten'],
  ['fig_tierwaerter', 'follows_dna', 'law_verweilen'],
  ['lore_chronik', 'follows_dna', 'law_verweilen', 'Sie misst genau das, was das Gesetz verlangt'],
  ['lore_chronik', 'appears_in', 'ort_becken'],
  ['lore_chronik', 'uses', 'arc_sammlungspunkte', 'Beim Gehen die Hand auf den Stein an der Furt'],
  ['arc_sammlungspunkte', 'appears_in', 'ort_becken'],
  ['arc_sammlungspunkte', 'appears_in', 'ort_bibliothek'],
  ['ort_kuppel', 'contains', 'arc_sammlungspunkte'],
];

/** Wie viele Kanten der Band beschreibt – für die Prüfung auf Tippfehler. */
export const RIESEN_KANTEN_ANZAHL = KANTEN.length;




export function riesen(bookId: string, worldId: string): Bauteil {
  const jetzt = Date.now();
  const kennung = (id: Kennung) => `${bookId}__${id}`;

  const entries = baueEintraege().map((e) => ({
    ...e,
    id: kennung(e.id),
    bookId,
    worldId,
  }));

  const vorhanden = new Set(entries.map((e) => e.id));
  const relations: Relation[] = [];

  for (const [von, art, nach, notiz] of KANTEN) {
    const a = kennung(von);
    const b = kennung(nach);
    /* Eine Kante ins Leere taucht im Graphen auf und führt nirgendwohin –
       deshalb wird hier geprüft und nicht gehofft. Die Prüfung zählt mit. */
    if (!vorhanden.has(a) || !vorhanden.has(b)) continue;
    relations.push({
      id: `${bookId}__rrel_${relations.length.toString(36)}`,
      bookId,
      worldId,
      fromId: a,
      toId: b,
      type: art,
      note: notiz,
      createdAt: jetzt,
    });
  }

  return { entries, relations };
}
