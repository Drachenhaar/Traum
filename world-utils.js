function prefersReducedMotion() {
  return window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function randomBetween(min, max) {
  return min + Math.random() * (max - min);
}

function randomDelayMs(minSeconds, maxSeconds) {
  return randomBetween(minSeconds, maxSeconds) * 1000;
}

// Setzt eine neue Position ohne Übergangsanimation (z. B. während ein Wesen
// unsichtbar ist), damit der nächste echte Bewegungsschritt nicht rückwirkend
// über die alte Distanz/Dauer "nachspringt".
function placeInstantly(el, xPercent, yPercent) {
  el.style.setProperty("--move-duration", "0s");
  el.style.left = xPercent + "%";
  el.style.top = yPercent + "%";
  void el.offsetWidth;
}
