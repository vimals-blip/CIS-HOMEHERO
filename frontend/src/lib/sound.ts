// Web Audio API helpers — no external files required.
// All functions are silent if the browser blocks audio (no throw).

function mkCtx() {
  try {
    return new (window.AudioContext || (window as any).webkitAudioContext)() as AudioContext;
  } catch { return null; }
}

/** Short two-tone ding for incoming notifications. */
export function playNotificationSound() {
  const ctx = mkCtx();
  if (!ctx) return;
  const gain = ctx.createGain();
  gain.connect(ctx.destination);
  [[1047, 0], [1319, 0.13]].forEach(([freq, t]) => {
    const osc = ctx.createOscillator();
    osc.connect(gain);
    osc.type = 'sine';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.22, ctx.currentTime + t);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + t + 0.38);
    osc.start(ctx.currentTime + t);
    osc.stop(ctx.currentTime + t + 0.38);
  });
  setTimeout(() => ctx.close().catch(() => {}), 1000);
}

/**
 * Repeating alarm for expert booking assignment.
 * Returns a stop() function — call it once the expert accepts.
 */
export function startBookingAlarm(): () => void {
  let stopped = false;

  const beepCycle = () => {
    if (stopped) return;
    const ctx = mkCtx();
    if (!ctx) return;
    const gain = ctx.createGain();
    gain.connect(ctx.destination);
    [0, 0.32, 0.64].forEach((offset) => {
      const osc = ctx.createOscillator();
      osc.connect(gain);
      osc.type = 'square';
      osc.frequency.value = 900;
      gain.gain.setValueAtTime(0.16, ctx.currentTime + offset);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + offset + 0.26);
      osc.start(ctx.currentTime + offset);
      osc.stop(ctx.currentTime + offset + 0.26);
    });
    setTimeout(() => {
      ctx.close().catch(() => {});
      if (!stopped) beepCycle();
    }, 3200);
  };

  beepCycle();
  return () => { stopped = true; };
}
