// Statt handvermessener Rechtecke trägt eine einzige, bildschirmfüllende
// Ebene eine aus dem Originalbild abgeleitete Alpha-Maske
// (see-waterfall-mask.png, pixelgenau aus Helligkeit/Sättigung berechnet,
// siehe .waterfall-stream in style.css): nur dort, wo im gemalten Bild
// tatsächlich Wasser zu sehen ist, scheint der animierte Fließ-Schimmer
// durch. Dadurch folgt der Effekt exakt der gemalten Kontur (einzelne
// Tropfenspuren inklusive), nicht nur einer groben Bounding-Box.
function startWaterfalls(layerEl) {
  if (!layerEl) return { stop() {} };

  layerEl.innerHTML = "";

  const el = document.createElement("div");
  el.className = "waterfall-stream";

  if (prefersReducedMotion()) {
    el.style.animation = "none";
  }

  layerEl.appendChild(el);

  return {
    stop() {
      layerEl.innerHTML = "";
    }
  };
}
