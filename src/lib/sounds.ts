// Audio & haptic feedback utilities using Web Audio API (no external files needed)

const SOUND_KEY = 'app_sound_enabled';

/** Check if sound is enabled */
export const isSoundEnabled = (): boolean => {
  if (typeof window === 'undefined') return true;
  const val = localStorage.getItem(SOUND_KEY);
  return val === null ? true : val === 'true';
};

/** Toggle sound on/off */
export const setSoundEnabled = (enabled: boolean) => {
  localStorage.setItem(SOUND_KEY, String(enabled));
};

const audioCtx = () => {
  if (typeof window === 'undefined') return null;
  if (!isSoundEnabled()) return null;
  // @ts-ignore
  if (!window.__appAudioCtx) {
    // @ts-ignore
    window.__appAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  // @ts-ignore
  return window.__appAudioCtx as AudioContext;
};

/** Short success chime - two ascending notes */
export const playSuccessSound = () => {
  const ctx = audioCtx();
  if (!ctx) return;
  const now = ctx.currentTime;

  [440, 660].forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.15, now + i * 0.12);
    gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.12 + 0.25);
    osc.connect(gain).connect(ctx.destination);
    osc.start(now + i * 0.12);
    osc.stop(now + i * 0.12 + 0.25);
  });
};

/** Timer start sound - rising tone */
export const playTimerStartSound = () => {
  const ctx = audioCtx();
  if (!ctx) return;
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(300, now);
  osc.frequency.linearRampToValueAtTime(600, now + 0.3);
  gain.gain.setValueAtTime(0.2, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
  osc.connect(gain).connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 0.4);
};

/** Warning/fail sound - descending buzz */
export const playWarningSound = () => {
  const ctx = audioCtx();
  if (!ctx) return;
  const now = ctx.currentTime;

  [400, 250].forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.1, now + i * 0.15);
    gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.15 + 0.2);
    osc.connect(gain).connect(ctx.destination);
    osc.start(now + i * 0.15);
    osc.stop(now + i * 0.15 + 0.2);
  });
};

/** Achievement fanfare - triumphant arpeggio */
export const playAchievementSound = () => {
  const ctx = audioCtx();
  if (!ctx) return;
  const now = ctx.currentTime;

  [523, 659, 784, 1047].forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.15, now + i * 0.1);
    gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.1 + 0.4);
    osc.connect(gain).connect(ctx.destination);
    osc.start(now + i * 0.1);
    osc.stop(now + i * 0.1 + 0.4);
  });
};

/** Vibrate device if supported */
export const vibrate = (pattern: number | number[] = 100) => {
  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    navigator.vibrate(pattern);
  }
};

/** Create confetti particles at element position */
export const createParticleBurst = (x: number, y: number) => {
  const colors = ['#B6DD0E', '#f59e0b', '#22c55e', '#3b82f6', '#a855f7', '#ec4899'];
  const container = document.createElement('div');
  container.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:9999;overflow:hidden';
  document.body.appendChild(container);

  for (let i = 0; i < 20; i++) {
    const particle = document.createElement('div');
    const angle = (Math.PI * 2 * i) / 20 + (Math.random() - 0.5);
    const velocity = 80 + Math.random() * 120;
    const size = 4 + Math.random() * 6;
    const color = colors[Math.floor(Math.random() * colors.length)];

    particle.style.cssText = `
      position:absolute;left:${x}px;top:${y}px;width:${size}px;height:${size}px;
      background:${color};border-radius:${Math.random() > 0.5 ? '50%' : '2px'};
      pointer-events:none;
    `;
    container.appendChild(particle);

    const dx = Math.cos(angle) * velocity;
    const dy = Math.sin(angle) * velocity - 60;

    particle.animate([
      { transform: 'translate(0,0) scale(1)', opacity: 1 },
      { transform: `translate(${dx}px,${dy + 80}px) scale(0)`, opacity: 0 },
    ], { duration: 600 + Math.random() * 400, easing: 'cubic-bezier(0,0,0.2,1)', fill: 'forwards' });
  }

  setTimeout(() => container.remove(), 1200);
};

/** Shake an element briefly */
export const shakeElement = (el: HTMLElement) => {
  el.animate([
    { transform: 'translateX(0)' },
    { transform: 'translateX(-6px)' },
    { transform: 'translateX(6px)' },
    { transform: 'translateX(-4px)' },
    { transform: 'translateX(4px)' },
    { transform: 'translateX(0)' },
  ], { duration: 400, easing: 'ease-out' });
};
