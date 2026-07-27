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

function initWorldStage(stageEl, worldEl) {
  if (!stageEl) return null;

  let imgAspect = WORLD_IMAGE_FALLBACK_ASPECT;
  let overflowX = 0;
  let panX = 0;
  let dragging = false;
  let dragStartX = 0;
  let dragStartPan = 0;
  let dragMoved = false;

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
  }

  function centerPan() {
    panX = -overflowX / 2;
    stageEl.style.transform = `translateX(${panX}px)`;
  }

  function clampPan(x) {
    return Math.max(-overflowX, Math.min(0, x));
  }

  function onPointerDown(e) {
    if (overflowX <= 0) return;
    dragging = true;
    dragMoved = false;
    dragStartX = e.clientX;
    dragStartPan = panX;
    stageEl.setPointerCapture(e.pointerId);
  }

  function onPointerMove(e) {
    if (!dragging) return;
    const delta = e.clientX - dragStartX;
    if (Math.abs(delta) > 4) dragMoved = true;
    panX = clampPan(dragStartPan + delta);
    stageEl.style.transform = `translateX(${panX}px)`;
  }

  function onPointerUp() {
    dragging = false;
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
  stageEl.addEventListener("pointermove", onPointerMove);
  stageEl.addEventListener("pointerup", onPointerUp);
  stageEl.addEventListener("pointercancel", onPointerUp);

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
