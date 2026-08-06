import { Component, StrictMode, type ErrorInfo, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';

/**
 * Ohne Fehlergrenze wird ein Renderfehler auf iOS bisher lautlos zur weißen
 * Seite – nichts im UI verrät, was schiefging. Diese Grenze macht Fehler
 * sichtbar (Text statt Stille), damit sich ein Fehler von hier aus überhaupt
 * diagnostizieren lässt.
 */
function showFatal(title: string, detail: string) {
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

window.addEventListener('error', (e) => {
  showFatal('Ein Fehler ist aufgetreten', `${e.message}\n${e.filename}:${e.lineno}:${e.colno}\n${e.error?.stack ?? ''}`);
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
  render() {
    if (this.state.error) return null;
    return this.props.children;
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
  })
  .catch((err) => showFatal('Die App konnte nicht geladen werden', String((err as { stack?: string })?.stack ?? err)));
