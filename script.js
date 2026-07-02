const world = document.getElementById("world");
const enterButton = document.getElementById("enterButton");
const bookText = document.getElementById("bookText");
const orbLayer = document.getElementById("orbLayer");

enterButton.onclick = () => {
  world.classList.add("zoomed");
  enterButton.style.display = "none";
  bookText.classList.add("visible");
};

const orbMessages = [
  "Es eilt nicht.",
  "Der Ort ist schon da.",
  "Manche Wege zeigen sich leise.",
  "Das Wasser erinnert sich.",
  "Das Buch wartet geduldig.",
  "Vielleicht genügt heute ein Blick."
];

function createOrb() {
  const orb = document.createElement("div");
  orb.className = "orb";

  const x = Math.random() * 90 + 5;
  const y = Math.random() * 70 + 15;
  const duration = Math.random() * 5 + 7;
  const drift = (Math.random() * 80 - 40) + "px";

  orb.style.left = `${x}%`;
  orb.style.top = `${y}%`;
  orb.style.setProperty("--duration", `${duration}s`);
  orb.style.setProperty("--drift", drift);

  const speaks = Math.random() < 0.07;

  if (speaks) {
    orb.classList.add("speaks");

    const message = document.createElement("div");
    message.className = "orb-message";
    message.textContent = orbMessages[Math.floor(Math.random() * orbMessages.length)];
    message.style.left = `${x}%`;
    message.style.top = `${y}%`;

    orbLayer.appendChild(message);

    setTimeout(() => {
      message.remove();
    }, 6000);
  }

  orbLayer.appendChild(orb);

  setTimeout(() => {
    orb.remove();
  }, duration * 1000);
}

setInterval(createOrb, 1300);
