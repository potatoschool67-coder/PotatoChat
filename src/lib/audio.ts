'use client';

let audioCtx: globalThis.AudioContext | null = null;
let isInitialized = false;

export async function ensureAudioContext(): Promise<globalThis.AudioContext> {
  if (!audioCtx) {
    audioCtx = new (globalThis.AudioContext || (globalThis as any).webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') {
    await audioCtx.resume();
  }
  return audioCtx;
}

export function playNotificationSound(): void {
  ensureAudioContext().then((ctx) => {
    const now = ctx.currentTime;
    [523.25, 659.25, 783.99].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.setValueAtTime(freq, now + i * 0.08);
      osc.type = 'triangle';
      gain.gain.setValueAtTime(0.1, now + i * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.3);
      osc.start(now + i * 0.08);
      osc.stop(now + i * 0.08 + 0.3);
    });
  }).catch((e) => console.error('Audio error:', e));
}

export function unlockAudio(): void {
  ensureAudioContext();
}

if (typeof window !== 'undefined') {
  const unlock = () => {
    unlockAudio();
    document.removeEventListener('click', unlock);
    document.removeEventListener('keydown', unlock);
  };
  document.addEventListener('click', unlock);
  document.addEventListener('keydown', unlock);
}