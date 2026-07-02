const orbMessages = [
  "Es eilt nicht.",
  "Der Ort ist schon da.",
  "Manche Wege zeigen sich leise.",
  "Das Wasser erinnert sich.",
  "Das Buch wartet geduldig.",
  "Vielleicht genügt heute ein Blick."
];

function createOrb() {
  const layer = document.getElementById("orbLayer");
  if (!layer) return;

  const orb = document.createElement("div");
  orb.className = "orb";

  const x = 6 + Math.random() * 88;
  const y = 14 + Math.random() * 68;
  const size = 12 + Math.random() * 10;
  const duration = 9 + Math.random() * 7;
  const drift = Math.round(Math.random() * 90 - 45) + "px";

  orb.style.left = x + "%";
  orb.style.top = y + "%";
  orb.style.setProperty("--size", size + "px");
  orb.style.setProperty("--duration", duration + "s");
  orb.style.setProperty("--drift", drift);

  layer.appendChild(orb);

  const speaks = Math.random() < 0.08;

  if (speaks) {
    const message = document.createElement("div");
    message.className = "orb-message";
    message.textContent = orbMessages[Math.floor(Math.random() * orbMessages.length)];
    message.style.left = x + "%";
    message.style.top = y + "%";
    layer.appendChild(message);

    setTimeout(() => message.remove(), 7200);
  }

  setTimeout(() => orb.remove(), duration * 1000 + 500);
}

function startOrbs() {
  createOrb();
  setInterval(createOrb, 1800);
}
