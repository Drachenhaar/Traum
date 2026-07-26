const CHRONICLE_KEY = "dragoncore_chronicle";
const STILLNESS_THRESHOLD_SECONDS = 180;
const IDLE_CHECK_INTERVAL_MS = 15000;

class Chronicle {
  constructor() {
    this.entries = this.load();
  }

  add(type, data = {}) {
    const entry = {
      id: `entry_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      type,
      timestamp: Date.now(),
      data
    };
    this.entries.push(entry);
    this.save();
    return entry;
  }

  getAll() {
    return this.entries.slice();
  }

  load() {
    try {
      const raw = localStorage.getItem(CHRONICLE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      console.warn("Chronicle: Laden fehlgeschlagen", e);
      return [];
    }
  }

  save() {
    try {
      localStorage.setItem(CHRONICLE_KEY, JSON.stringify(this.entries));
    } catch (e) {
      console.warn("Chronicle: Speichern fehlgeschlagen", e);
    }
  }
}

function startPresenceTracking(chronicle) {
  let presenceStart = Date.now();
  let lastActivity = Date.now();
  let stillnessStart = null;

  function recordStillnessIfDue() {
    if (stillnessStart === null) return;
    const duration = (Date.now() - stillnessStart) / 1000;
    if (duration >= STILLNESS_THRESHOLD_SECONDS) {
      chronicle.add("stillness_interval", {
        start: stillnessStart,
        end: Date.now(),
        duration
      });
    }
    stillnessStart = null;
  }

  function onActivity() {
    recordStillnessIfDue();
    lastActivity = Date.now();
  }

  ["mousemove", "keydown", "touchstart", "wheel"].forEach((eventName) => {
    document.addEventListener(eventName, onActivity, { passive: true });
  });

  const idleCheck = setInterval(() => {
    if (document.hidden) return;
    const idleFor = (Date.now() - lastActivity) / 1000;
    if (idleFor >= STILLNESS_THRESHOLD_SECONDS && stillnessStart === null) {
      stillnessStart = lastActivity;
    }
  }, IDLE_CHECK_INTERVAL_MS);

  function closeOutSession() {
    recordStillnessIfDue();
    const duration = (Date.now() - presenceStart) / 1000;
    chronicle.add("presence_interval", {
      start: presenceStart,
      end: Date.now(),
      duration
    });
  }

  window.addEventListener("beforeunload", () => {
    clearInterval(idleCheck);
    closeOutSession();
  });

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      closeOutSession();
    } else {
      presenceStart = Date.now();
      lastActivity = Date.now();
    }
  });
}
