/**
 * Der Neuanfang – alles löschen und mit einem leeren Buch beginnen.
 *
 * Dragoncore hat keinen Server. Alles, was jemand schreibt, liegt in diesem
 * Browser: die Einträge und Bilder in IndexedDB, die Anmutung im lokalen
 * Speicher. Es gibt deshalb keinen Weg, ein Konto zurückzusetzen – es gibt nur
 * diesen einen, und er ist endgültig.
 *
 * ---
 *
 * **Warum das vor der App läuft und nicht in ihr.**
 *
 * Der naheliegende Ort wäre eine Seite im Anhang mit einem roten Knopf. Der
 * ist falsch: Sobald der Speicher gelaufen ist, hält er Einträge, offene
 * Transaktionen und einen Zeitgeber, der beim Verlassen noch einmal schreibt.
 * Wer mitten hinein löscht, löscht gegen einen, der gerade schreibt – und
 * bekommt je nach Zeitpunkt ein halb leeres Buch statt gar keinem.
 *
 * Deshalb läuft der Neuanfang in `main.tsx`, **bevor** `./App` überhaupt
 * geladen wird. Zu diesem Zeitpunkt gibt es nichts, was dagegenhält.
 *
 * ---
 *
 * **Warum eine Rückfrage und kein reiner Link.**
 *
 * Ein Link, der beim Anklicken wortlos ein Jahr Arbeit löscht, ist eine Falle
 * – im Verlauf, in einem Lesezeichen, in einer weitergeleiteten Nachricht.
 * Die Adresse öffnet deshalb nur eine Frage. Gelöscht wird erst, wenn jemand
 * sie beantwortet.
 */

/** Die Datenbank, in der das Buch liegt (siehe `db/db.ts`). */
const DATENBANK = 'dragoncore-studio';

/** Was Dragoncore im lokalen Speicher ablegt (siehe `lib/raum/konfig.ts`). */
const SCHLUESSEL = ['dragoncore-raumkonfig'];

/** Steht in der Adresse, dass jemand neu anfangen will? */
export function neuanfangGewuenscht(): boolean {
  return new URLSearchParams(location.search).has('neuanfang');
}

/**
 * Löschen – und zwar wirklich.
 *
 * `deleteDatabase` wartet, solange noch eine Verbindung offen ist, und meldet
 * das über `onblocked`. Weil hier nichts geöffnet wurde, tritt das kaum auf;
 * falls doch, wird nicht ewig gewartet: Nach drei Sekunden geht es weiter und
 * die Seite lädt neu, was die Verbindung ohnehin kappt.
 */
async function loesche(): Promise<void> {
  for (const s of SCHLUESSEL) {
    try {
      localStorage.removeItem(s);
    } catch {
      /* Ein privates Fenster verbietet den Zugriff. Dann gibt es auch nichts. */
    }
  }
  await new Promise<void>((fertig) => {
    let vorbei = false;
    const weiter = () => {
      if (!vorbei) {
        vorbei = true;
        fertig();
      }
    };
    const anfrage = indexedDB.deleteDatabase(DATENBANK);
    anfrage.onsuccess = weiter;
    anfrage.onerror = weiter;
    anfrage.onblocked = weiter;
    setTimeout(weiter, 3000);
  });
}

/** Zurück zum Buch – ohne die Kennzeichnung in der Adresse. */
function zurueck(): void {
  const ziel = location.origin + location.pathname;
  location.replace(ziel);
}

/**
 * Die Frage stellen.
 *
 * Bewusst ohne React und ohne eine Zeile aus dem Buch: Diese Fläche muss auch
 * dann stehen, wenn die App gar nicht lädt – sonst wäre der Neuanfang genau
 * dann unerreichbar, wenn man ihn am ehesten braucht.
 */
export function frageNachNeuanfang(): void {
  const wurzel = document.getElementById('root');
  if (!wurzel) return;
  wurzel.innerHTML = '';

  const flaeche = document.createElement('div');
  flaeche.style.cssText =
    'min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px;' +
    'background:linear-gradient(160deg,#1a1512 0%,#100d0b 55%,#0b0908 100%);' +
    "font-family:'Iowan Old Style',Georgia,serif;color:#e6dcc4;box-sizing:border-box;";

  const kasten = document.createElement('div');
  kasten.style.cssText = 'max-width:34rem;text-align:center;';
  kasten.innerHTML = `
    <p style="font-size:10px;letter-spacing:0.28em;text-transform:uppercase;color:#c9a15f;margin:0 0 18px;">
      Dragoncore
    </p>
    <h1 style="font-size:30px;letter-spacing:0.06em;font-weight:400;margin:0 0 20px;">
      Von vorn anfangen?
    </h1>
    <p style="font-size:16px;line-height:1.75;color:#ded2b4;margin:0 0 8px;">
      Dies löscht <strong style="font-weight:600;">alles</strong>, was in diesem Browser steht:
      jeden Eintrag, jedes Bild, jede Karte, jede Verbindung und jede Einstellung.
    </p>
    <p style="font-size:15px;line-height:1.7;font-style:italic;color:#b0a285;margin:0 0 30px;">
      Dragoncore hat keinen Server. Was hier verschwindet, ist fort – es gibt
      keine zweite Fassung irgendwo.
    </p>
    <div style="display:flex;gap:14px;justify-content:center;flex-wrap:wrap;">
      <button id="dc-neu-ja" type="button"
        style="min-height:46px;padding:0 24px;border-radius:999px;border:1px solid rgba(184,134,11,0.55);
               background:transparent;color:#e3c878;font-family:inherit;font-size:15px;cursor:pointer;">
        Ja, alles löschen
      </button>
      <button id="dc-neu-nein" type="button"
        style="min-height:46px;padding:0 24px;border-radius:999px;border:0;background:transparent;
               color:#b0a285;font-family:inherit;font-size:15px;font-style:italic;cursor:pointer;">
        Zurück zum Buch
      </button>
    </div>
    <p id="dc-neu-lauft" style="font-size:14px;font-style:italic;color:#b0a285;margin:26px 0 0;visibility:hidden;">
      Wird gelöscht …
    </p>`;

  flaeche.appendChild(kasten);
  wurzel.appendChild(flaeche);

  kasten.querySelector('#dc-neu-nein')?.addEventListener('click', zurueck);
  kasten.querySelector('#dc-neu-ja')?.addEventListener('click', () => {
    const lauft = kasten.querySelector<HTMLElement>('#dc-neu-lauft');
    if (lauft) lauft.style.visibility = 'visible';
    /* Beide Knöpfe still legen – ein zweiter Druck während des Löschens hilft niemandem. */
    kasten.querySelectorAll('button').forEach((b) => {
      b.setAttribute('disabled', 'true');
      b.style.opacity = '0.4';
    });
    void loesche().then(zurueck);
  });
}
