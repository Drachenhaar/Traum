const LIGHT_RAY_CONFIGS = [
  { left: -12, top: -12, width: 70, height: 140, rotate: 18, duration: 11, delay: 0 },
  { left: 2, top: -18, width: 50, height: 150, rotate: 25, duration: 13, delay: -4 }
];

function initLightRays(layerEl) {
  if (!layerEl) return;
  const reduced = prefersReducedMotion();

  LIGHT_RAY_CONFIGS.forEach((cfg) => {
    const el = document.createElement("div");
    el.className = "light-ray";
    el.style.left = cfg.left + "%";
    el.style.top = cfg.top + "%";
    el.style.width = cfg.width + "vw";
    el.style.height = cfg.height + "vh";
    el.style.transform = `rotate(${cfg.rotate}deg)`;

    if (reduced) {
      el.style.animation = "none";
      el.style.opacity = "0.08";
    } else {
      el.style.animationDuration = cfg.duration + "s";
      el.style.animationDelay = cfg.delay + "s";
    }

    layerEl.appendChild(el);
  });
}
