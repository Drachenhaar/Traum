import { Component, StrictMode, type ErrorInfo, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';

/**
 * Ohne Fehlergrenze wird ein Renderfehler auf iOS bisher lautlos zur weißen
 * Seite – nichts im UI verrät, was schiefging. Diese Grenze macht Fehler
 * sichtbar (Text statt Stille), damit sich ein Fehler von hier aus überhaupt
 * diagnostizieren lässt.
 */
/*
 * Zwei Dinge haben die Fehlersuche auf dem iPhone unnoetig lange gemacht,
 * und beide waren hausgemacht.
 *
 * Erstens meldet Safari einen Fehler aus einem Modul-Skript als blosses
 * „Script error." ohne Datei und Zeile. Die Fehlergrenze von React kennt den
 * echten Fehler, reicht ihn aber zusaetzlich ans Fenster weiter – und die
 * nichtssagende Fassung traf zuletzt ein und ueberschrieb die brauchbare.
 * Deshalb weicht eine leere Meldung jetzt einer, die etwas aussagt.
 *
 * Zweitens loeschte jeder Fehler die ganze Seite. Wenn das Buch bereits
 * offen ist, ist das die falsche Antwort: Ein misslungener Handgriff darf
 * nicht die Welt schliessen, die der Leser gerade vor sich hat.
 */
let gezeigt = '';
let appLaeuft = false;

/** Meldungen ohne Erkenntniswert – Safaris Platzhalter fuer verdeckte Fehler. */
function nichtssagend(detail: string): boolean {
  return /^\s*script error\.?\s*(:0:0)?\s*$/i.test(detail);
}

function showFatal(title: string, detail: string) {
  /* Das Bessere nicht durch das Schlechtere ersetzen. */
  if (gezeigt && nichtssagend(detail) && !nichtssagend(gezeigt)) return;
  gezeigt = detail;

  /*
   * Verdeckte Meldungen stoeren nicht mehr, solange das Buch laeuft.
   *
   * Die Skripte werden inzwischen ohne `crossorigin` und von derselben
   * Herkunft ausgeliefert – trotzdem verschweigt Safari hier Text, Datei und
   * Zeile. Damit ist erwiesen, dass diese Meldung nichts ueber das Buch
   * aussagt: Sie hat keinen Inhalt, und sie hat keine Folge, denn das Buch
   * bleibt bedienbar.
   *
   * Ein Alarm ohne Inhalt und ohne Wirkung ist Laerm. Er verdeckte auf dem
   * Telefon den halben Bildschirm und liess den Leser einen Schaden vermuten,
   * den es nicht gibt. Also nur noch in die Konsole – wer sucht, findet ihn
   * dort; wer schreibt, wird nicht gestoert.
   *
   * Alles, was einen echten Text traegt, erscheint unveraendert.
   */
  if (appLaeuft && nichtssagend(detail)) {
    console.warn('Verdeckte Fehlermeldung ohne Inhalt – vermutlich nicht aus dem Buch:', detail);
    return;
  }

  if (appLaeuft) {
    showNotice(detail);
    return;
  }

  /* Vor dem ersten Rendern ist auch eine verdeckte Meldung eine Nachricht:
     Dann ist das Buch wirklich nicht aufgegangen. */
  if (nichtssagend(detail)) {
    detail =
      `${detail.trim()}\n\nDer Browser nennt weder Datei noch Zeile. ` +
      `Das deutet auf eine Erweiterung oder einen Inhaltsfilter hin.`;
  }

  const el = document.getElementById('root');
  if (!el) return;
  el.innerHTML = '';
  const wrap = document.createElement('div');
  wrap.style.cssText =
    'min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px;font-family:-apple-system,BlinkMacSystemFont,sans-serif;background:#F7F2E8;color:#3B2E23;box-sizing:border-box;';
  wrap.innerHTML = `
    <div style="max-width:560px;">
      <h1 style="font-size:20px;margin:0 0 8px;">${title}</h1>
      <p style="font-size:14px;line-height:1.5;color:#7C6A57;margin:0 0 16px;">Dragoncore Artbook konnte nicht laden. Bitte diesen Text kopieren und weitergeben:</p>
      <pre style="white-space:pre-wrap;word-break:break-word;background:#fff;border:1px solid #E5DCCA;border-radius:8px;padding:12px;font-size:12px;line-height:1.5;">${detail
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')}</pre>
    </div>`;
  el.appendChild(wrap);
}

/**
 * Der leise Weg: eine Notiz am unteren Rand, waehrend das Buch offen bleibt.
 * Der Text steht zum Abschreiben da – auf einem Telefon gibt es keine Konsole,
 * in die man schauen koennte.
 */
function showNotice(detail: string) {
  const id = 'artbook-notiz';
  document.getElementById(id)?.remove();

  const box = document.createElement('div');
  box.id = id;
  box.style.cssText =
    'position:fixed;left:12px;right:12px;bottom:calc(12px + env(safe-area-inset-bottom));z-index:2147483647;' +
    'background:#2A211A;color:#E8DCC4;border:1px solid #4A3B2A;border-radius:12px;padding:12px 14px;' +
    'font-family:-apple-system,BlinkMacSystemFont,sans-serif;font-size:12.5px;line-height:1.55;' +
    'box-shadow:0 10px 30px rgba(0,0,0,0.35);max-height:44vh;overflow:auto;';
  box.innerHTML =
    '<div style="display:flex;gap:10px;align-items:flex-start;">' +
    '<div style="flex:1;min-width:0;">' +
    '<strong style="color:#D4AF37;font-weight:600;">Etwas ist schiefgegangen</strong>' +
    '<pre style="white-space:pre-wrap;word-break:break-word;margin:6px 0 0;font-size:11.5px;">' +
    detail.replace(/&/g, '&amp;').replace(/</g, '&lt;') +
    '</pre></div>' +
    '<button type="button" style="flex:none;background:none;border:0;color:#B8A88A;font-size:20px;' +
    'line-height:1;padding:0 2px;cursor:pointer;">&times;</button></div>';
  box.querySelector('button')?.addEventListener('click', () => box.remove());
  document.body.appendChild(box);
}

window.addEventListener('error', (e) => {
  const err = e.error as Error | undefined;
  /* Der Name („SyntaxError“, „QuotaExceededError“) sagt oft mehr als der Text. */
  const kopf = err?.name ? `${err.name}: ${err.message}` : e.message;
  showFatal('Ein Fehler ist aufgetreten', `${kopf}\n${e.filename}:${e.lineno}:${e.colno}\n${err?.stack ?? ''}`);
});
window.addEventListener('unhandledrejection', (e) => {
  const reason = e.reason as { stack?: string } | string | undefined;
  showFatal('Ein Fehler ist aufgetreten', typeof reason === 'string' ? reason : (reason?.stack ?? String(reason)));
});

class Boundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  componentDidCatch(error: Error, info: ErrorInfo) {
    showFatal('Ein Fehler ist aufgetreten', `${error.message}\n${error.stack ?? ''}\n${info.componentStack ?? ''}`);
  }

  /*
   * Weiterblättern heilt.
   *
   * Bisher blieb die gerissene Seite stehen, bis jemand den Knopf darunter
   * fand oder neu lud. Wer stattdessen zurücksprang oder eine andere Adresse
   * aufrief, bekam wieder dieselbe Fehlerseite – das Buch war zu, obwohl
   * genau eine Seite kaputt war. Ein Riss darf sich nicht auf den Band
   * ausdehnen.
   *
   * Der Adresswechsel ist das richtige Signal dafür: Er heißt, dass jemand
   * etwas anderes sehen will als das, was gerade nicht ging.
   */
  private weiter = () => {
    if (this.state.error) this.setState({ error: null });
  };
  componentDidMount() {
    window.addEventListener('hashchange', this.weiter);
  }
  componentWillUnmount() {
    window.removeEventListener('hashchange', this.weiter);
  }
  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    /*
     * Bisher stand hier `null` – die Seite wurde weiss, und der Leser sass
     * vor einem Buch, das sich nicht mehr aufschlagen liess. Ein Fehler auf
     * einer Seite darf den ganzen Band nicht verschliessen: Von hier fuehrt
     * ein Weg zurueck zum Anfang.
     */
    return (
      <div className="flex min-h-screen items-center justify-center px-7 text-center">
        <div className="max-w-[34rem]">
          <p className="rubric">Diese Seite ist gerissen</p>
          <h1 className="mt-3 font-serif text-[28px] leading-tight text-ink">
            Hier kommt das Buch nicht weiter
          </h1>
          <p className="prose-book mx-auto mt-4 max-w-[40ch]">
            Der Rest des Bandes ist unversehrt. Nichts ist verloren gegangen.
          </p>
          <button
            type="button"
            onClick={() => {
              window.location.hash = '#/';
              this.setState({ error: null });
            }}
            className="mt-7 inline-flex min-h-[42px] items-center rounded-full border border-gild-500/40 px-5 font-serif text-[15px] text-gold no-tap-highlight"
          >
            Zurück zum Anfang
          </button>
          <pre className="mt-8 whitespace-pre-wrap break-words text-left font-mono text-[11px] leading-relaxed text-ink-faint/70">
            {error.message}
          </pre>
        </div>
      </div>
    );
  }
}

const container = document.getElementById('root');
if (!container) throw new Error('Kein Wurzelelement gefunden.');

import('./App')
  .then(({ default: App }) => {
    createRoot(container).render(
      <StrictMode>
        <Boundary>
          <App />
        </Boundary>
      </StrictMode>,
    );
    /* Ab hier ist das Buch offen – ein Fehler darf es nicht mehr zuschlagen. */
    appLaeuft = true;
  })
  .catch((err) => showFatal('Die App konnte nicht geladen werden', String((err as { stack?: string })?.stack ?? err)));
