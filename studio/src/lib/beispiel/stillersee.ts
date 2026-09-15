/**
 * Der stille See – die Welt der ersten Dragoncore-App als Band.
 *
 * ---
 *
 * **Woher das kommt, und was daran neu ist.**
 *
 * Gewünscht als: „Alles was du aus unserer vorherigen Dragoncore App hast
 * kannst du dort als Buch einbinden. Den Drachen, die Kois, das
 * Observatorium, Ruhestellen, Sammlungspunkte."
 *
 * Beim Nachsehen im Wurzelverzeichnis stand nur die Hälfte davon wirklich da,
 * und das gehört benannt, damit später niemand sucht, was es nie gab:
 *
 *   AUS DEM BESTAND   `places.js` – Der stille See, Die Bibliothek, Das Tal,
 *                     Die Gedankenkuppel. `creatures.js` – Koi (nach drei
 *                     Minuten), Libelle (fünf), Vogel (zehn), mit
 *                     Abtauchen, Pause und Wiederauftauchen an anderer
 *                     Stelle. `chronicle.js` – Anwesenheit, Stille, erste
 *                     Begegnung je Art. `thoughts.js` – eingegebene
 *                     Gedanken, die später als Lichtpunkt wiederkommen.
 *
 *   NEU GESCHRIEBEN   Der Drache, das Observatorium, die Ruhestellen und die
 *                     Sammlungspunkte. Im Bestand stand davon nichts; der
 *                     Drache war eine Zeile im Backlog („Koloss-Wesen –
 *                     sehr seltene, große, kaum bewegte Erscheinungen").
 *                     Auf Zuruf: „Dann schreiben wir es neu."
 *
 * Das Neue ist deshalb nicht frei erfunden, sondern **angeschlossen**: Jedes
 * der vier hängt an etwas, das es schon gab. Das Tal hiess immer schon „Wo
 * etwas Großes ruht" – der Drache ist die Antwort auf diese Zeile, nicht eine
 * zweite daneben.
 *
 * ---
 *
 * **Das Gesetz, das den Band trägt.**
 *
 * `creatures.js` hat es längst in Zahlen: `revealAfterSeconds: 180`, `300`,
 * `600`. Ein Koi nach drei Minuten, eine Libelle nach fünf, ein Vogel nach
 * zehn. Das ist keine Beiläufigkeit, das ist die Regel dieser Welt:
 *
 *   **Was sich zeigt, hängt nicht davon ab, wer schaut, sondern wie lange.**
 *
 * Alles andere in diesem Band ist eine Folge davon – die Ruhestellen, weil
 * etwas dort sein muss, solange es sich nicht zeigt; die Chronik, weil das
 * Bleiben mitgeschrieben wird; und am Ende das Tal, das man für einen Grat
 * hält, bis man lange genug hingesehen hat.
 *
 * ---
 *
 * **Warum wieder keine Bilder.**
 *
 * Aus demselben Grund wie im ersten Beispielband: Ein Band, der vierzig
 * erfundene Tafeln mitbringt, belegt beim ersten Öffnen mehr Speicher als das
 * eigene Buch nach einem Jahr Arbeit. Die Hintergründe der alten App liegen
 * ausserdem als Dateien im Wurzelverzeichnis und gehören dorthin, nicht in
 * eine Datenbank.
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

    eintrag('law_verweilen', 'law', {
      title: 'Was sich zeigt, hängt von der Dauer ab',
      subtitle: 'Das Gesetz des Bleibens',
      category: 'Zeit',
      description:
        'Das tragende Gesetz dieses Bandes. Es stand von Anfang an im Programm, nur in Sekunden statt in Worten.',
      tags: ['Stille', 'Kern'],
      favorite: true,
      fields: {
        rule: 'Nichts an diesem See zeigt sich, weil jemand hinsieht. Es zeigt sich, weil jemand geblieben ist.',
        because:
          'Die Wesen hier verlassen ihre Ruhestellen nicht nach Sicht, sondern nach Ruhe. Bewegung am Ufer ist für sie dasselbe wie ein Schatten von oben: Sie warten ihn ab. Wer wartet, hört auf, ein Schatten zu sein.',
        limit:
          'Es lässt sich nicht beschleunigen und nicht erzwingen. Wer sucht, bleibt nicht – und wer nicht bleibt, sieht nichts. Das ist keine Strafe, sondern dieselbe Regel von der anderen Seite.',
        cost: 'Zeit, und zwar die eine Sorte, die sich nicht sparen lässt.',
        consequence:
          'Nach drei Minuten der Koi. Nach fünf die Libelle. Nach zehn der Vogel. Was nach einer Stunde kommt, hat kaum jemand aufgeschrieben, weil kaum jemand so lange sitzt.',
        known:
          'Jeder am See weiss es. Die meisten halten es für eine Redensart über Geduld und nicht für eine Regel über Wesen.',
      },
    }),

    eintrag('law_rueckkehr', 'law', {
      title: 'Was gesammelt wurde, kommt wieder',
      subtitle: 'Das Gesetz der Sammlungspunkte',
      category: 'Zeit',
      description:
        'Das zweite Gesetz. Es gilt für Gedanken, nicht für Wesen – und es ist der Grund, warum die Kuppel überhaupt gebaut wurde.',
      tags: ['Gedanken'],
      fields: {
        rule: 'Ein Gedanke, der an einem Sammlungspunkt abgelegt wurde, verschwindet nicht. Er kehrt zurück, aber nicht dann, wenn man ihn ruft.',
        because:
          'Die Punkte halten nichts fest; sie geben nur langsamer zurück, als sie nehmen. Was an ihnen liegt, wandert im Stein, und Stein hat seine eigene Geschwindigkeit.',
        limit: 'Man kann nicht wählen, welcher Gedanke wiederkommt, und nicht, wann.',
        cost: 'Die Gewissheit. Wer etwas ablegt, weiss von da an nicht mehr, wann er es wiedersieht.',
        consequence:
          'Wer lange genug am See sitzt, bekommt irgendwann einen eigenen Satz zurück und erkennt ihn nicht sofort als seinen.',
        known: 'Am See selbstverständlich. Ausserhalb hält man es für eine Erfindung der Bibliothek.',
      },
    }),

    /* ------------------------------------------------------------- Orte */

    eintrag('ort_see', 'location', {
      title: 'Der stille See',
      subtitle: 'Wo alles begann',
      category: 'Wasser',
      description:
        'Der Ort, an dem dieser Band anfängt und an dem die meisten wieder landen. Flach am Rand, unabsehbar in der Mitte, und so windstill, dass die Ringe auf dem Wasser von etwas anderem kommen müssen als vom Wetter.',
      tags: ['Anfang', 'Wasser'],
      favorite: true,
      fields: {
        region: 'Talgrund, unterhalb des Wasserfalls, ringsum bewaldet.',
        atmosphere:
          'Ruhe, die nicht leer ist. Man merkt nach einigen Minuten, dass ständig etwas geschieht – nur nichts Lautes.',
        light:
          'Von schräg oben durch die Kronen, in einzelnen Bahnen. Die Bahnen wandern schneller, als man denkt.',
        sound:
          'Der Wasserfall, weit genug entfernt, um ein Grundton zu sein. Darüber nichts, bis etwas auftaucht.',
        palette: 'Tiefes Moosgrün, Zinn, gebrochenes Gold auf der Wasserhaut',
      },
    }),

    eintrag('ort_bibliothek', 'location', {
      title: 'Die Bibliothek',
      subtitle: 'Wo Wissen wächst',
      category: 'Innenraum',
      description:
        'Kein Bau zum Aufbewahren, sondern einer zum Weiterwachsen. Was hier liegt, wird ergänzt, nicht verwaltet.',
      tags: ['Innen'],
      fields: {
        region: 'Am Osthang, in den Fels gesetzt. Von aussen kaum grösser als ein Tor.',
        atmosphere:
          'Trocken und warm, obwohl der Fels kalt ist. Niemand weiss genau, woher die Wärme kommt.',
        light: 'Kein Tageslicht. Die Lichtpunkte der Sammlungspunkte reichen aus.',
        sound: 'Papier, weit weg. Kein Wasser – das ist der Unterschied zu allen anderen Orten.',
        palette: 'Dunkles Holz, Messing, sehr wenig Weiss',
      },
    }),

    eintrag('ort_tal', 'location', {
      title: 'Das Tal',
      subtitle: 'Wo etwas Großes ruht',
      category: 'Weite',
      description:
        'Ein Bergtal, weit genug, dass man den gegenüberliegenden Hang für die Grenze der Welt halten könnte. Diese Zeile stand von Anfang an über dem Ort; wer sie geschrieben hat, wusste noch nicht, wie genau sie stimmt.',
      tags: ['Weite', 'Drache'],
      favorite: true,
      fields: {
        region: 'Oberhalb des Sees, zwei Tagesmärsche nach Nordwesten.',
        atmosphere:
          'Weit und still. Die Stille ist hier anders als am See: am See ist sie wach, hier ist sie schwer.',
        light:
          'Von früh bis spät ungehindert. Der Südhang liegt am Nachmittag im Schatten, obwohl nichts dasteht, was ihn werfen könnte.',
        sound:
          'Wind, und alle paar Minuten ein sehr tiefer Ton, den man eher in den Füssen spürt als im Ohr.',
        palette: 'Trockenes Gras, Schiefer, ein Grau, das in der Sonne bronzen wird',
      },
    }),

    eintrag('ort_kuppel', 'location', {
      title: 'Die Gedankenkuppel',
      subtitle: 'Wo Gedanken zur Ruhe kommen',
      category: 'Innenraum',
      description:
        'Eine Halbkugel über dem alten Observatorium, innen mit einem Sternenhimmel bemalt, der nicht der ist, den man draussen sieht.',
      tags: ['Gedanken', 'Innen'],
      fields: {
        region: 'Auf der Kuppe zwischen See und Tal.',
        atmosphere:
          'Man spricht hier leiser, ohne dass jemand darum bittet. Die Wölbung nimmt Stimmen auf und gibt sie kleiner zurück.',
        light: 'Punkte, die wandern. Wer lange hinsieht, erkennt darin gelegentlich einen eigenen Satz.',
        sound: 'Das eigene Atmen, deutlicher als sonst irgendwo.',
        palette: 'Nachtblau, Bleiweiss, Goldpunkte',
      },
    }),

    /* ------------------------------------------------------------- Bauten */

    eintrag('arc_observatorium', 'architecture', {
      title: 'Das Observatorium',
      subtitle: 'Älter als die Kuppel darüber',
      category: 'Bau',
      description:
        'NEU GESCHRIEBEN. Der Bau, der zuerst dastand – ein Ring aus Stein mit einer Öffnung nach Nordwesten, genau auf das Tal. Die Gedankenkuppel wurde später darübergesetzt und hat ihn dabei zugedeckt, nicht ersetzt.',
      tags: ['Bau', 'Neu'],
      favorite: true,
      fields: {
        style:
          'Sehr früh und sehr genau. Keine Verzierung, aber jede Fuge sitzt auf einem Winkel, den jemand ausgerechnet hat.',
        scale: 'Ein Ring von elf Schritt, mannshoch. Die Öffnung ist zwei Schritt breit.',
        construction:
          'Trocken gesetzter Schiefer, ohne Mörtel. Er steht, weil die Steine einander halten – nimmt man einen heraus, bleibt der Ring trotzdem stehen, aber die Öffnung verschiebt sich um eine Handbreit.',
        details:
          'In den Sturz der Öffnung sind Kerben geschlagen, in unregelmässigen Abständen. Sie zählen keine Tage. Was sie zählen, hat noch niemand herausbekommen.',
        interior:
          'Leer. Ein flacher Stein in der Mitte, abgetreten, als hätten dort sehr lange sehr viele Leute gestanden.',
        palette: 'Schiefergrau, Flechtengelb',
      },
    }),

    eintrag('arc_sammlungspunkte', 'architecture', {
      title: 'Die Sammlungspunkte',
      subtitle: 'Wo ein Gedanke abgelegt wird',
      category: 'Bau',
      description:
        'NEU GESCHRIEBEN. Kniehohe Steine, gesetzt an Stellen, an denen ohnehin jeder stehenbleibt: an der Furt, am Wasserfall, am Tor der Bibliothek, unter der Kuppel. Wer einen Gedanken loswerden will, legt die Hand auf und sagt ihn – oder sagt ihn nicht und denkt ihn nur.',
      tags: ['Gedanken', 'Neu'],
      fields: {
        style: 'Kein Stil. Sie sehen aus wie Steine, und das ist Absicht.',
        scale: 'Kniehoch, eine Handfläche breit oben.',
        construction:
          'Aus dem Schiefer des Observatoriums, aber nicht behauen – nur ausgesucht. Die Oberseite ist von Händen glatt, nicht von Werkzeug.',
        details:
          'Sieben sind es, und wo der achte stand, liegt eine Mulde. Niemand hat ihn fortgetragen; er ist einfach nicht mehr da.',
        interior: '–',
        palette: 'Schiefer, Handfettglanz',
      },
    }),

    /* -------------------------------------------------------------- Tiere */

    eintrag('tier_koi', 'animal', {
      title: 'Der Koi',
      subtitle: 'Nach drei Minuten',
      category: 'Wasser',
      description:
        'Das erste Wesen, das sich zeigt, und deshalb für die meisten das einzige. Er schwimmt in unregelmässigen Etappen, taucht ab und kommt nach einer Pause an anderer Stelle wieder hoch.',
      tags: ['Wasser', 'Erste Begegnung'],
      favorite: true,
      fields: {
        species: 'Grosser Karpfen, gezeichnet in Weiss und Zinnober',
        size: 'Unterarmlang, im tiefen Wasser wirkt er doppelt so gross',
        behaviour:
          'Etappen von wenigen Zügen, dann Stillstand. Beim Abtauchen wird er blasser und unschärfer, als läge Wasser zwischen ihm und der Oberfläche – was auch stimmt.',
        diet: 'Was von den Blättern kommt',
        territory: 'Die flachen Buchten. In die Mitte geht er nie.',
        sleep: 'An den Ruhestellen unter dem Überhang, tagsüber wie nachts',
        voice: 'Keine. Was man hört, sind die Ringe.',
        tracks: 'Zwei Ringe beim Abtauchen, einer beim Auftauchen. Wer das zählt, findet ihn wieder.',
        palette: 'Zinnober auf Weiss, im Abtauchen ins Graugrün',
      },
    }),

    eintrag('tier_libelle', 'animal', {
      title: 'Die Libelle',
      subtitle: 'Nach fünf Minuten',
      category: 'Luft',
      description:
        'Sie kommt später als der Koi und bleibt kürzer. Zwei Zonen am Ufer gehören ihr; zwischen ihnen wechselt sie ohne erkennbaren Grund.',
      tags: ['Luft'],
      fields: {
        species: 'Grosslibelle, Flügel ohne Farbe',
        size: 'Eine Handspanne',
        behaviour:
          'Steht in der Luft, als hinge sie an einem Faden, und ist im nächsten Augenblick zwei Schritt weiter, ohne dass man die Bewegung gesehen hätte.',
        diet: 'Was über dem Wasser steht',
        territory: 'Zwei Zonen am West- und am Ostufer. Die Mitte meidet sie wie der Koi.',
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
        'Der letzte der drei, und der einzige, der auch im Tal vorkommt. Wer ihn am See sieht, hat lange gesessen.',
      tags: ['Luft', 'Selten'],
      fields: {
        species: 'Nicht bestimmt. Am ehesten ein Häher, aber zu gross.',
        size: 'Zwei Handspannen, die Flügel doppelt',
        behaviour:
          'Er überquert den See in einem Zug und dreht nicht ab. Wer ihn zweimal in einer Stunde sieht, hat zwei verschiedene gesehen.',
        diet: 'Unbekannt. Am See frisst er nichts.',
        territory: 'See und Tal, und dazwischen nichts. Der Weg ist ihm gleich.',
        sleep: 'An den Ruhestellen im Tal, auf den hohen Kanten',
        migration: 'Zwischen See und Tal, ohne Jahreszeit',
        voice: 'Zwei Töne, der zweite tiefer. Klingt aus der Ferne wie ein Glockenschlag.',
        tracks: 'Ein Schatten, der über das Wasser geht, bevor man ihn selbst sieht',
        palette: 'Schiefergrau, ein Blau im Flügelbug',
      },
    }),

    /* ---------------------------------------------------------- Kreaturen */

    eintrag('kre_drache', 'creature', {
      title: 'Der Drache',
      subtitle: 'Was im Tal ruht',
      category: 'Koloss',
      description:
        'NEU GESCHRIEBEN – und der Grund, warum über dem Tal immer schon „Wo etwas Großes ruht" stand. Man sieht ihn nicht an; man sieht, dass der Südhang am Nachmittag Schatten wirft, obwohl dort nichts steht.',
      tags: ['Koloss', 'Neu', 'Selten'],
      favorite: true,
      fields: {
        species: 'Koloss. Es gibt kein zweites Wort dafür, weil es kein zweites gibt.',
        size:
          'Der halbe Südhang. Wer das für Übertreibung hält, hat das Tal nur von unten gesehen.',
        behaviour:
          'Er ruht. Das ist keine Pause zwischen Handlungen, sondern die Handlung selbst – nach dem Gesetz des Bleibens ist er das Wesen mit der längsten Dauer, und wer ihn erlebt, erlebt eine Bewegung, keine Begegnung.',
        personality:
          'Keine, die sich prüfen liesse. Wer ihm etwas zuschreibt, beschreibt sich selbst nach zwei Stunden Warten.',
        territory: 'Das Tal. Er hat es nicht besetzt, er ist es geworden.',
        sleep:
          'Durchgehend. Die Kerben am Observatorium zählen vermutlich seine Atemzüge; sie stehen unregelmässig, und sein Atem geht unregelmässig.',
        voice:
          'Der tiefe Ton, den man alle paar Minuten in den Füssen spürt. Am See ist er nicht mehr zu hören, wohl aber auf dem Wasser zu sehen.',
        tracks:
          'Der Schatten ohne Gegenstand. Und die Ringe auf dem See, die bei Windstille entstehen.',
        locomotion: 'Nicht beobachtet. Die Abdrücke im Tal sind älter als jede Aufzeichnung.',
        palette: 'Schiefer, trockenes Gras, in der Abendsonne Bronze',
      },
    }),

    /* -------------------------------------------------------- Kreisläufe */

    eintrag('kre_ruhestellen', 'cycle', {
      title: 'Die Ruhestellen',
      subtitle: 'Wo etwas ist, solange es sich nicht zeigt',
      category: 'Ordnung',
      description:
        'NEU GESCHRIEBEN, aber im Bestand längst vorhanden: Der Koi taucht ab und erscheint nach einer Pause an anderer Stelle wieder. Was dazwischen liegt, hat bisher nur keinen Namen gehabt.',
      tags: ['Stille', 'Neu'],
      favorite: true,
      fields: {
        span: 'Von wenigen Atemzügen bis zu Jahren, je nach Wesen',
        trigger: 'Unruhe am Ufer. Ein Schritt genügt, ein Schatten genügt.',
        growth:
          'Eine Ruhestelle entsteht nicht, sie wird gefunden: eine Mulde unter dem Überhang, eine hohe Kante im Tal, ein Schilfhalm mit der richtigen Neigung.',
        decay:
          'Wird eine Stelle zu oft gestört, wird sie aufgegeben – und zwar endgültig. Es gibt am See Buchten, in denen seit Jahren nichts mehr ruht.',
        rebirth: 'Eine aufgegebene Stelle nimmt nach etwa sieben Jahren wieder etwas auf.',
        habitat: 'Überhänge, Kanten, Schilf, und im Tal die Senke am Südhang',
        chain:
          'Ohne Ruhestellen kein Abtauchen; ohne Abtauchen kein Wiederauftauchen; ohne Wiederauftauchen keine dritte Minute, in der sich etwas zeigt.',
        symbiosis:
          'Die Wesen teilen sie nicht, aber sie erben sie. Was der Koi aufgibt, nimmt später die Libelle.',
        palette: 'Schatten unter Wasser, Flechte, Schilfbraun',
      },
    }),

    eintrag('kre_wasserringe', 'cycle', {
      title: 'Die Ringe bei Windstille',
      subtitle: 'Woher sie wirklich kommen',
      category: 'Wasser',
      description:
        'Auf dem stillen See stehen Ringe, auch wenn nichts abtaucht und kein Wind geht. Am See erklärt man es mit dem Wasserfall. Wer im Tal war, erklärt es anders.',
      tags: ['Wasser', 'Drache'],
      fields: {
        span: 'Alle paar Minuten, unregelmässig',
        trigger: 'Kein sichtbarer',
        growth: 'Vom Mittelpunkt nach aussen, langsamer als beim Abtauchen eines Fisches',
        decay: 'Sie erreichen das Ufer nicht. Auf halbem Weg sind sie weg.',
        rebirth: 'Der nächste kommt, bevor der vorige verschwunden ist – aber nie im selben Takt.',
        habitat: 'Die Mitte des Sees. Genau dort, wo weder Koi noch Libelle hingehen.',
        chain: 'Ein Atemzug im Tal, ein Ring auf dem See. Dazwischen zwei Tagesmärsche Fels.',
        palette: 'Zinn auf Zinn',
      },
    }),

    /* ---------------------------------------------------------- Überliefertes */

    eintrag('lore_chronik', 'lore', {
      title: 'Die Chronik',
      subtitle: 'Was mitgeschrieben wird, ohne dass jemand schreibt',
      category: 'Aufzeichnung',
      description:
        'Nicht ein Buch, sondern eine Gewohnheit: Am See wird festgehalten, wie lange jemand da war und wie lange er still war – und die erste Begegnung mit einer Art, aber nur die erste.',
      tags: ['Aufzeichnung'],
      fields: {
        era: 'So lange, wie es die Sammlungspunkte gibt',
        teller: 'Niemand im Besonderen. Wer geht, trägt ein.',
        summary:
          'Zwei Spalten: Anwesenheit und Stille. Die zweite ist die kürzere und die wichtigere. Dazu am Rand die ersten Begegnungen, eine Zeile je Art und Besuch.',
        variants:
          'Manche zählen die Stille ab dem Moment, in dem man sitzt. Andere erst ab dem, in dem man aufhört zu warten. Der Unterschied macht Minuten aus.',
        ritual:
          'Beim Gehen die Hand auf den Sammlungspunkt an der Furt. Mehr ist es nicht.',
        truth:
          'Die erste Begegnung wird nur einmal je Besuch vermerkt. Das ist keine Nachlässigkeit, sondern der Grund, warum die Chronik selten und lesbar bleibt statt bei jedem Auf- und Abtauchen eine Zeile zu erzeugen.',
      },
    }),

    eintrag('lore_gedankengarten', 'lore', {
      title: 'Der Gedankengarten',
      subtitle: 'Was man ablegt und später wiederfindet',
      category: 'Aufzeichnung',
      description:
        'Kein Ort, sondern das, was zwischen den Sammlungspunkten und der Kuppel geschieht. Man legt einen Gedanken ab und bekommt irgendwann einen zurück.',
      tags: ['Gedanken'],
      fields: {
        era: 'Seit der Kuppelbau das Observatorium zudeckte',
        teller: 'Die Bibliothek, aber ungern',
        summary:
          'Ein Gedanke geht in den Stein, wandert, und erscheint unter der Kuppel als ein Lichtpunkt unter vielen. Wer lange genug hinsieht, erkennt einen davon.',
        variants:
          'In der Bibliothek hält man es für eine Eigenschaft des Schiefers. Am See hält man es für eine Eigenschaft der Leute.',
        ritual: 'Hand auf den Stein, den Satz denken, die Hand wegnehmen. Aussprechen ist erlaubt.',
        truth:
          'Man erkennt den eigenen Satz fast nie sofort. Das ist der eigentliche Nutzen der Sache – er kommt zurück, wenn er nicht mehr der eigene ist.',
      },
    }),

    /* ------------------------------------------------------------ Stimmen */

    eintrag('stimme_bleib', 'voice', {
      title: '„Setz dich hin, dann kommt es"',
      subtitle: 'Was man Neuen sagt',
      category: 'Am Ufer',
      description: 'Der Satz, den jeder am See einmal gesagt bekommt und irgendwann selbst sagt.',
      tags: ['Stille'],
      fields: {
        speaker: 'Wer schon eine Weile da ist',
        listener: 'Wer gerade angekommen ist und am Ufer entlanggeht',
        occasion: 'Immer in den ersten Minuten',
        manner: 'Beiläufig, ohne aufzusehen',
        dialect: 'Kurz. Am See werden Sätze nicht zu Ende gebracht, wenn sie schon verstanden sind.',
        scene:
          'Der Neue geht das Ufer ab und sucht die Stelle mit der besten Sicht. Der andere sitzt seit einer halben Stunde an der schlechtesten.',
        unsaid:
          'Dass der Sitzende schon dreimal etwas gesehen hat, was der Suchende an diesem Tag nicht mehr sehen wird.',
      },
    }),

    /* ---------------------------------------------------------- Materialien */

    eintrag('mat_schiefer', 'material', {
      title: 'Der Schiefer vom Kuppenbruch',
      subtitle: 'Woraus Ring und Steine sind',
      category: 'Stein',
      description:
        'Derselbe Stein im Observatorium, in den Sammlungspunkten und in den Kanten des Tals. Dass er überall derselbe ist, fällt erst auf, wenn man ihn nass sieht.',
      tags: ['Stein'],
      fields: {
        finish: 'Trocken matt, nass fast schwarz mit einem Bronzeschimmer',
        hardness: 'Spaltet in Platten, bricht aber nicht quer',
        appearance: 'Grau mit gelben Flechteninseln, an Handstellen glänzend',
        aging:
          'Er wird nicht rauher, sondern glatter. Ein Sammlungspunkt sieht nach hundert Jahren gebrauchter aus, nicht älter.',
        usage: 'Trocken gesetzt, nie vermauert',
        palette: 'Schiefergrau, Flechtengelb, Nassbronze',
      },
    }),

    /* ---------------------------------------------------------- Momente */

    eintrag('mom_dritte_minute', 'moment', {
      title: 'Die dritte Minute',
      subtitle: 'Wenn zum ersten Mal etwas aufhört, still zu sein',
      category: 'Am See',
      description:
        'Der Moment, für den dieser Band gebaut ist. Nichts Grosses geschieht – aber es ist der erste Augenblick, in dem der See beweist, dass er nicht leer ist.',
      tags: ['Stille', 'Anfang'],
      favorite: true,
      fields: {
        timeOfDay: 'Gleichgültig',
        season: 'Gleichgültig – das ist bemerkenswert genug, um es aufzuschreiben',
        light: 'Eine Lichtbahn steht gerade auf der flachen Bucht',
        sound: 'Der Wasserfall wird für einen Moment lauter, weil man aufhört, ihn zu überhören',
        smell: 'Nasses Laub, Stein',
        weather: 'Windstill, sonst geschieht es nicht',
        air: 'Kühler als erwartet, sobald man sitzt',
        water: 'Zwei Ringe, dicht hintereinander, etwa acht Schritt vom Ufer',
        change:
          'Bis hierher war es eine Fläche. Ab hier ist es ein Ort, in dem etwas wohnt.',
        feeling:
          'Erleichterung, und zwar unverhältnismässig grosse für einen Fisch, den man kaum gesehen hat.',
        palette: 'Zinn, Zinnober, ein Streifen Gold',
      },
    }),

    eintrag('mom_langer_nachmittag', 'moment', {
      title: 'Der Nachmittag, an dem der Hang Schatten warf',
      subtitle: 'Wie der Drache gefunden wurde',
      category: 'Im Tal',
      description:
        'NEU GESCHRIEBEN. Keine Entdeckung, sondern ein Rechenfehler, der keiner war: Jemand sass lange genug im Observatorium, um zu merken, dass der Schatten im Tal nicht zur Sonne passt.',
      tags: ['Drache', 'Neu'],
      fields: {
        timeOfDay: 'Später Nachmittag',
        season: 'Spätsommer',
        light: 'Tief und von Westen, der Südhang müsste hell sein',
        sound: 'Wind. Und alle paar Minuten der tiefe Ton.',
        smell: 'Trockenes Gras',
        weather: 'Klar, keine Wolke, die etwas hätte werfen können',
        air: 'Bewegt, aber nicht kalt',
        water: 'Keins – und trotzdem standen an diesem Tag Ringe auf dem See, zwei Tagesmärsche weiter',
        change:
          'Vorher war das Tal ein Tal mit einer merkwürdigen Zeile darüber. Nachher war die Zeile eine Beschreibung.',
        feeling: 'Kein Schrecken. Eher das Gefühl, etwas Offensichtliches sehr lange übersehen zu haben.',
        palette: 'Bronze, Schiefer, Grasgelb',
      },
    }),

    /* ------------------------------------------------------------ Figuren */

    eintrag('fig_wartende', 'character', {
      title: 'Die Wartende',
      subtitle: 'Sitzt an der schlechtesten Stelle',
      category: 'Am See',
      description:
        'Niemand weiss ihren Namen, weil nie jemand lange genug bleibt, um zu fragen. Sie sitzt seit Jahren an derselben Bucht – der mit der schlechtesten Sicht und den meisten Begegnungen.',
      tags: ['Stille'],
      fields: {
        role: 'Sitzt',
        wesen: 'Freundlich, aber nicht gesprächig. Sie antwortet, ohne aufzusehen.',
        faehigkeiten: 'Zählt Ringe · Kennt jede Ruhestelle · Sagt einen einzigen Satz',
        zitat: 'Setz dich hin, dann kommt es.',
        places: 'Die flache Bucht am Ostufer',
        habits: 'Legt beim Gehen die Hand auf den Sammlungspunkt an der Furt. Jedes Mal.',
        goals: 'Keine, die sie nennen würde',
        background:
          'Sie war die Erste, die aufgeschrieben hat, dass die Ringe in der Mitte des Sees nicht vom Wasserfall kommen. Gelesen hat es lange niemand.',
      },
    }),

    eintrag('fig_sterngucker', 'character', {
      title: 'Der Kerbenzähler',
      subtitle: 'Sitzt im Observatorium',
      category: 'Auf der Kuppe',
      description:
        'NEU GESCHRIEBEN. Er hat die Kerben im Sturz gezählt und dabei gemerkt, dass sie keine Tage zählen. Was sie zählen, weiss er inzwischen; überzeugt hat er damit niemanden.',
      tags: ['Drache', 'Neu'],
      fields: {
        role: 'Zählt',
        wesen: 'Genau bis zur Umständlichkeit. Er sagt nie „ungefähr".',
        faehigkeiten: 'Rechnet Winkel im Kopf · Sitzt still · Erklärt zu ausführlich',
        zitat: 'Die Abstände sind unregelmässig. Ein Bau ist nie unregelmässig.',
        places: 'Das Observatorium, die Öffnung nach Nordwesten',
        habits: 'Trägt nach jedem Ton einen Strich ein und vergleicht abends mit den Kerben.',
        goals: 'Einen einzigen Menschen dazu bringen, einen Nachmittag lang mitzuzählen.',
        fears: 'Dass die Abstände kürzer werden.',
        background:
          'Er kam wegen der Sterne und blieb wegen eines Schattens, der nicht zur Sonne passte.',
      },
    }),
  ];
}

/* ========================================================================
 * DIE VERBINDUNGEN
 *
 * Die tragende Kette dieses Bandes läuft nicht von einer Ursache zu einer
 * Wirkung wie im ersten Beispielband, sondern von einer **Dauer** zu dem, was
 * sie freigibt. Das ist der Unterschied, den ein zweiter Band überhaupt erst
 * rechtfertigt: Zwei Welten, zwei Arten, wie Dinge zusammenhängen.
 * ===================================================================== */

const KANTEN: [von: Kennung, art: string, nach: Kennung, notiz?: string][] = [
  /* Die Kette der Dauer – vom Bleiben bis zum Koloss. */
  ['law_verweilen', 'causes', 'kre_ruhestellen', 'Wer nicht bleibt, lässt nichts herauskommen'],
  ['kre_ruhestellen', 'causes', 'tier_koi', 'Drei Minuten'],
  ['kre_ruhestellen', 'causes', 'tier_libelle', 'Fünf Minuten'],
  ['kre_ruhestellen', 'causes', 'tier_vogel', 'Zehn Minuten'],
  ['kre_drache', 'follows_dna', 'law_verweilen', 'Das Wesen mit der längsten Dauer'],
  ['kre_ruhestellen', 'follows_dna', 'law_verweilen'],

  /* Der Drache und was von ihm ankommt. */
  ['kre_drache', 'lives_in', 'ort_tal', 'Er hat es nicht besetzt, er ist es geworden'],
  ['kre_drache', 'causes', 'kre_wasserringe', 'Ein Atemzug im Tal, ein Ring auf dem See'],
  ['kre_wasserringe', 'appears_in', 'ort_see'],
  ['kre_drache', 'causes', 'mom_langer_nachmittag', 'Der Schatten, der nicht zur Sonne passt'],
  ['arc_observatorium', 'uses', 'kre_drache', 'Die Kerben zählen vermutlich seine Atemzüge'],

  /* Die Gedanken. */
  ['law_rueckkehr', 'causes', 'lore_gedankengarten'],
  ['arc_sammlungspunkte', 'follows_dna', 'law_rueckkehr'],
  ['lore_gedankengarten', 'appears_in', 'ort_kuppel'],
  ['arc_sammlungspunkte', 'made_of', 'mat_schiefer'],
  ['arc_observatorium', 'made_of', 'mat_schiefer'],
  ['ort_kuppel', 'contains', 'arc_observatorium', 'Später darübergesetzt, nicht ersetzt'],
  ['arc_sammlungspunkte', 'appears_in', 'ort_see'],
  ['arc_sammlungspunkte', 'appears_in', 'ort_bibliothek'],
  ['arc_sammlungspunkte', 'appears_in', 'ort_kuppel'],

  /* Wo was liegt. */
  ['ort_see', 'contains', 'kre_ruhestellen'],
  ['ort_tal', 'contains', 'kre_ruhestellen'],
  ['tier_koi', 'lives_in', 'ort_see'],
  ['tier_libelle', 'lives_in', 'ort_see'],
  ['tier_vogel', 'lives_in', 'ort_see'],
  ['tier_vogel', 'lives_in', 'ort_tal', 'Der einzige, der beides kennt'],

  /* Die Chronik. */
  ['lore_chronik', 'appears_in', 'ort_see'],
  ['lore_chronik', 'uses', 'arc_sammlungspunkte', 'Beim Gehen die Hand auf den Stein an der Furt'],
  ['lore_chronik', 'follows_dna', 'law_verweilen', 'Sie misst genau das, was das Gesetz verlangt'],

  /* Die Menschen. */
  ['fig_wartende', 'lives_in', 'ort_see'],
  ['fig_wartende', 'uses', 'arc_sammlungspunkte'],
  ['fig_wartende', 'causes', 'kre_wasserringe', 'Sie hat zuerst aufgeschrieben, woher sie nicht kommen'],
  ['stimme_bleib', 'pov', 'fig_wartende'],
  ['stimme_bleib', 'appears_in', 'ort_see'],
  ['fig_sterngucker', 'lives_in', 'ort_kuppel'],
  ['fig_sterngucker', 'uses', 'arc_observatorium'],
  ['fig_sterngucker', 'pov', 'mom_langer_nachmittag'],
  ['fig_sterngucker', 'related', 'fig_wartende', 'Sie haben dasselbe bemerkt, zwei Tagesmärsche auseinander'],

  /* Die Momente. */
  ['mom_dritte_minute', 'appears_in', 'ort_see'],
  ['mom_dritte_minute', 'precedes', 'mom_langer_nachmittag', 'Dieselbe Regel, andere Dauer'],
  ['tier_koi', 'appears_in', 'mom_dritte_minute'],

  /* Der Stein, der überall liegt. */
  ['ort_tal', 'made_of', 'mat_schiefer'],
  ['mat_schiefer', 'comes_from', 'ort_kuppel', 'Der Kuppenbruch liegt unter der Kuppel'],
];

/** Wie viele Kanten der Band beschreibt – für die Prüfung auf Tippfehler. */
export const SEE_KANTEN_ANZAHL = KANTEN.length;

/** Wie der Band heisst – eine Stelle, aus der Regal und Bibliothek lesen. */
export const SEE_TITEL = 'Der stille See';

export const STILLERSEE_BUCH = {
  title: SEE_TITEL,
  subtitle: 'Ein Band zum Ansehen',
  worldName: 'Der stille See',
  worldTagline: 'Nichts zeigt sich, weil jemand hinsieht. Es zeigt sich, weil jemand geblieben ist.',
  coverMaterial: 'leinen' as const,
  /*
   * `nachtblau`, nicht `tinte`.
   *
   * „Tinte" stand hier zuerst und ist keine Einbandfarbe – der Wert wäre
   * still auf Umbra zurückgefallen, und der Band hätte ausgesehen wie der
   * erste. Dieselbe Falle wie bei `moos` im Beispielband nebenan; gültige
   * Farben stehen in `bookIdentity.ts`. Leinen statt Leder dazu, damit die
   * beiden Bände im Regal auch von weitem zwei sind.
   */
  coverColor: 'nachtblau' as const,
  emblemType: 'preset' as const,
  emblemId: 'welle',
};

export function stillersee(bookId: string, worldId: string): Bauteil {
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
      id: `${bookId}__srel_${relations.length.toString(36)}`,
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
