// Bildet das gemalte Hintergrundbild in seiner echten Größe ab (statt per
// CSS "background-size: cover" bildschirmfüllend zuzuschneiden). Dadurch
// stimmen prozentuale Positionen von Effekten/Wesen endlich mit dem
// tatsächlichen Bildinhalt überein – unabhängig vom Seitenverhältnis des
// Geräts – und auf schmalen (mobilen) Bildschirmen kann man per Wischen/
// Ziehen die links/rechts abgeschnittenen Teile des Bilds sehen.
//
// Unterstützt außerdem einen Bildwechsel zur Laufzeit (setImage), damit
// sich zwischen Orten wechseln lässt, ohne die Pan-/Touch-Logik neu
// aufzusetzen.
const WORLD_IMAGE_FALLBACK_ASPECT = 1536 / 1024;

// Reine Tiefen-Ebenen (Nebel/Lichtstrahlen = ferne Atmosphäre, Blätter =
// Vordergrund) bekommen beim Wischen/Ziehen ihre eigene, leicht abweichende
// Geschwindigkeit relativ zum Hintergrund – klassischer Parallax-Trick für
// Tiefenwirkung. Hintergrund, Wasserglanz, Wasserringe und Kreaturen bleiben
// bewusst außen vor: ihre Positionen sind auf konkrete Bildinhalte (z. B. den
// See) abgestimmt und müssten sonst vom gemalten Untergrund wegdriften.
function initWorldStage(stageEl, worldEl, parallaxLayers = []) {
  if (!stageEl) return null;

  const layers = parallaxLayers.filter((layer) => layer && layer.el);

  let imgAspect = WORLD_IMAGE_FALLBACK_ASPECT;
  let overflowX = 0;
  let panX = 0;
  let dragging = false;
  let activePointerId = null;
  let dragStartX = 0;
  let dragStartPan = 0;
  let dragMoved = false;

  function applyParallax() {
    layers.forEach(({ el, multiplier }) => {
      el.style.transform = `translateX(${panX * (multiplier - 1)}px)`;
    });
  }

  function layout() {
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    // Entspricht exakt der Skalierung, die "background-size: cover" wählen
    // würde – nur, dass wir das Ergebnis kennen und damit weiterrechnen
    // können (Crop-Betrag, Pan-Grenzen), statt es dem Browser zu überlassen.
    const displayedHFromHeight = vh;
    const displayedWFromHeight = vh * imgAspect;
    const displayedWFromWidth = vw;
    const displayedHFromWidth = vw / imgAspect;

    let displayedW;
    let displayedH;

    if (displayedWFromHeight >= vw) {
      displayedW = displayedWFromHeight;
      displayedH = displayedHFromHeight;
    } else {
      displayedW = displayedWFromWidth;
      displayedH = displayedHFromWidth;
    }

    stageEl.style.width = displayedW + "px";
    stageEl.style.height = displayedH + "px";

    const overflowY = Math.max(0, displayedH - vh);
    stageEl.style.top = -(overflowY / 2) + "px";

    overflowX = Math.max(0, displayedW - vw);
    panX = Math.max(-overflowX, Math.min(0, panX));
    stageEl.style.transform = `translateX(${panX}px)`;
    applyParallax();
  }

  function centerPan() {
    panX = -overflowX / 2;
    stageEl.style.transform = `translateX(${panX}px)`;
    applyParallax();
  }

  function clampPan(x) {
    return Math.max(-overflowX, Math.min(0, x));
  }

  function endDrag(e) {
    if (e && activePointerId !== null && e.pointerId !== activePointerId) return;
    dragging = false;
    activePointerId = null;
    try {
      if (e && stageEl.hasPointerCapture && stageEl.hasPointerCapture(e.pointerId)) {
        stageEl.releasePointerCapture(e.pointerId);
      }
    } catch (err) {
      // Manche Browser werfen hier in Rand­fällen (z. B. abgebrochene
      // Touch-Sequenz) – das darf die restliche Bedienung nicht abreißen.
    }
  }

  function onPointerDown(e) {
    if (overflowX <= 0) return;
    dragging = true;
    activePointerId = e.pointerId;
    dragMoved = false;
    dragStartX = e.clientX;
    dragStartPan = panX;
    try {
      stageEl.setPointerCapture(e.pointerId);
    } catch (err) {
      // Ohne Capture funktioniert das Ziehen innerhalb des Elements meist
      // trotzdem – wichtiger ist, dass ein Fehler hier nicht den Rest der
      // Bedienung (z. B. das Menü) lahmlegt.
    }
  }

  function onPointerMove(e) {
    if (!dragging || e.pointerId !== activePointerId) return;
    const delta = e.clientX - dragStartX;
    if (Math.abs(delta) > 4) dragMoved = true;
    panX = clampPan(dragStartPan + delta);
    stageEl.style.transform = `translateX(${panX}px)`;
    applyParallax();
    // Unterbindet zusätzlich zu touch-action:none, dass der Browser die
    // Geste selbst als Seiten-Scroll/Bounce interpretiert.
    if (e.cancelable) e.preventDefault();
  }

  // Verhindert, dass ein Wisch-Ende versehentlich als Klick auf ein
  // darunterliegendes Element gewertet wird.
  stageEl.addEventListener(
    "click",
    (e) => {
      if (dragMoved) {
        e.stopPropagation();
        e.preventDefault();
      }
    },
    true
  );

  stageEl.addEventListener("pointerdown", onPointerDown);
  stageEl.addEventListener("pointermove", onPointerMove, { passive: false });
  stageEl.addEventListener("pointerup", endDrag);
  stageEl.addEventListener("pointercancel", endDrag);

  // Sicherheitsnetz: Falls das Ende der Geste den Ziel-Handler aus
  // irgendeinem Grund nicht erreicht (unterbrochene Touch-Sequenz,
  // Tab-Wechsel mitten in der Geste), bleibt sonst der Zieh-Zustand hängen
  // und verhält sich bei der nächsten Berührung falsch.
  window.addEventListener("pointerup", endDrag);
  window.addEventListener("pointercancel", endDrag);
  window.addEventListener("blur", () => endDrag(null));
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) endDrag(null);
  });

  window.addEventListener("resize", layout);

  layout();
  centerPan();

  function setImage(src) {
    if (worldEl) {
      worldEl.style.setProperty("--world-bg", `url("${src}")`);
    }

    const probe = new Image();
    probe.onload = () => {
      if (probe.naturalWidth && probe.naturalHeight) {
        imgAspect = probe.naturalWidth / probe.naturalHeight;
      } else {
        imgAspect = WORLD_IMAGE_FALLBACK_ASPECT;
      }
      layout();
      centerPan();
    };
    probe.onerror = () => {
      imgAspect = WORLD_IMAGE_FALLBACK_ASPECT;
      layout();
      centerPan();
    };
    probe.src = src;
  }

  return { setImage };
}
