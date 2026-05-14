// Tiny in-app notification chime using the Web Audio API.
// No asset file needed. Requires a prior user gesture in the page
// (browsers gate AudioContext); admin dashboard always has one.

let ctx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  try {
    if (!ctx) {
      const Ctor = (window as any).AudioContext || (window as any).webkitAudioContext;
      if (!Ctor) return null;
      ctx = new Ctor();
    }
    if (ctx.state === "suspended") ctx.resume().catch(() => {});
    return ctx;
  } catch {
    return null;
  }
}

function beep(freq: number, start: number, dur = 0.18) {
  const c = getCtx();
  if (!c) return;
  const t = c.currentTime + start;
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = "sine";
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(0.25, t + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(gain).connect(c.destination);
  osc.start(t);
  osc.stop(t + dur + 0.02);
}

export function playNotify() {
  // Two-note "ding" chime
  beep(880, 0);
  beep(1320, 0.12);
}

export function playSuccess() {
  beep(660, 0);
  beep(880, 0.1);
  beep(1175, 0.2);
}

export function playFailure() {
  beep(440, 0);
  beep(330, 0.15, 0.25);
}
