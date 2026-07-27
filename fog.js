const FOG_BLOBS = [
  { top: 30, left: 6, width: 55, height: 22, duration: 70, delay: 0 },
  { top: 35, left: 40, width: 62, height: 26, duration: 85, delay: -20 },
  { top: 27, left: 66, width: 50, height: 20, duration: 95, delay: -45 }
];

function startFog(layerEl) {
  if (!layerEl) return { stop() {} };

  layerEl.innerHTML = "";
  const reduced = prefersReducedMotion();

  FOG_BLOBS.forEach((blob) => {
    const el = document.createElement("div");
    el.className = "fog-blob";
    el.style.top = blob.top + "%";
    el.style.left = blob.left + "%";
    el.style.width = blob.width + "vw";
    el.style.height = blob.height + "vh";

    if (reduced) {
      el.style.animation = "none";
      el.style.opacity = "0.12";
    } else {
      el.style.animationDuration = blob.duration + "s";
      el.style.animationDelay = blob.delay + "s";
    }

    layerEl.appendChild(el);
  });

  return {
    stop() {
      layerEl.innerHTML = "";
    }
  };
}
