let ctx: AudioContext | null = null;

function getCtx(): AudioContext {
  if (!ctx) ctx = new AudioContext();
  return ctx;
}

function playTone(freq: number, start: number, duration: number, type: OscillatorType = "sine", volume = 0.35) {
  try {
    const ac = getCtx();
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.connect(gain);
    gain.connect(ac.destination);
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(volume, start + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
    osc.start(start);
    osc.stop(start + duration);
  } catch {
    // fail silently
  }
}

function playAboveSound() {
  // Bright 3-note ascending chime: C5 → E5 → G5
  try {
    const ac = getCtx();
    const t = ac.currentTime;
    playTone(523, t,        0.25, "sine", 0.3);  // C5
    playTone(659, t + 0.18, 0.25, "sine", 0.3);  // E5
    playTone(784, t + 0.36, 0.4,  "sine", 0.4);  // G5
  } catch { /* silent */ }
}

function playBelowSound() {
  // Urgent 3-note descending alarm: A5 → E5 → A4, square wave
  try {
    const ac = getCtx();
    const t = ac.currentTime;
    playTone(880, t,        0.2,  "square", 0.18); // A5
    playTone(659, t + 0.18, 0.2,  "square", 0.18); // E5
    playTone(440, t + 0.36, 0.35, "square", 0.22); // A4
  } catch { /* silent */ }
}

const DEDUP_WINDOW_MS = 4000;

export function fireAlertNotification(
  alertId: number,
  msg: string,
  condition?: string,
  notificationsEnabled = true,
  soundEnabled = true,
) {
  if (typeof window === "undefined") return;

  const key = `alert-notif-${alertId}`;
  const last = parseInt(localStorage.getItem(key) || "0", 10);
  if (Date.now() - last < DEDUP_WINDOW_MS) return;
  localStorage.setItem(key, String(Date.now()));

  if (soundEnabled) {
    if (condition === "above") {
      playAboveSound();
    } else {
      playBelowSound();
    }
  }

  if (notificationsEnabled && "Notification" in window && Notification.permission === "granted") {
    new Notification("Price Alert Triggered", {
      body: msg,
      icon: "/favicon.ico",
      tag: `alert-${alertId}`,
    });
  }
}
