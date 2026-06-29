import { useEffect, useRef, useState } from 'react';
import { Flame, ArrowLeft } from 'lucide-react';

/**
 * DEMO ONLY — Cinematic splash → onboarding transition preview.
 * Route: /splash-demo
 */

// Subtle ambient sound using Web Audio API (no external files)
const playAmbient = (ctx: AudioContext) => {
  // Low rumble (sub-bass swell)
  const osc1 = ctx.createOscillator();
  const gain1 = ctx.createGain();
  osc1.type = 'sine';
  osc1.frequency.setValueAtTime(55, ctx.currentTime);
  osc1.frequency.exponentialRampToValueAtTime(110, ctx.currentTime + 3.5);
  gain1.gain.setValueAtTime(0, ctx.currentTime);
  gain1.gain.linearRampToValueAtTime(0.18, ctx.currentTime + 1.2);
  gain1.gain.linearRampToValueAtTime(0.05, ctx.currentTime + 3.2);
  gain1.gain.linearRampToValueAtTime(0, ctx.currentTime + 4);
  osc1.connect(gain1).connect(ctx.destination);
  osc1.start();
  osc1.stop(ctx.currentTime + 4);

  // Soft chime at "ignite" moment
  setTimeout(() => {
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(880, ctx.currentTime);
    osc2.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.8);
    gain2.gain.setValueAtTime(0.12, ctx.currentTime);
    gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.2);
    osc2.connect(gain2).connect(ctx.destination);
    osc2.start();
    osc2.stop(ctx.currentTime + 1.2);
  }, 2200);
};

const PHASES = ['boot', 'ignite', 'reveal', 'transition', 'onboarding'] as const;
type Phase = typeof PHASES[number];

const LOADING_LINES = [
  'מאתחל מנוע משמעת',
  'טוען נתוני רצף',
  'מסנכרן עם המאמן',
  'מכין את היום שלך',
];

const SplashDemo = () => {
  const [phase, setPhase] = useState<Phase>('boot');
  const [progress, setProgress] = useState(0);
  const [lineIdx, setLineIdx] = useState(0);
  const [muted, setMuted] = useState(false);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const [replayKey, setReplayKey] = useState(0);

  useEffect(() => {
    setPhase('boot');
    setProgress(0);
    setLineIdx(0);

    if (!muted) {
      try {
        const Ctx = (window.AudioContext || (window as any).webkitAudioContext);
        const ctx = new Ctx();
        audioCtxRef.current = ctx;
        // Some browsers require resume after user gesture; harmless if pre-existing.
        ctx.resume().then(() => playAmbient(ctx)).catch(() => playAmbient(ctx));
      } catch {}
    }

    // Loading progress
    const progInt = setInterval(() => {
      setProgress((p) => Math.min(100, p + 2 + Math.random() * 3));
    }, 60);

    const lineInt = setInterval(() => {
      setLineIdx((i) => (i + 1) % LOADING_LINES.length);
    }, 700);

    const t1 = setTimeout(() => setPhase('ignite'), 2200);
    const t2 = setTimeout(() => setPhase('reveal'), 3000);
    const t3 = setTimeout(() => setPhase('transition'), 4400);
    const t4 = setTimeout(() => setPhase('onboarding'), 5200);

    return () => {
      clearInterval(progInt);
      clearInterval(lineInt);
      [t1, t2, t3, t4].forEach(clearTimeout);
      audioCtxRef.current?.close().catch(() => {});
    };
  }, [replayKey, muted]);

  return (
    <div className="fixed inset-0 bg-black overflow-hidden font-heebo" dir="rtl">
      {/* Demo controls */}
      <div className="absolute top-4 left-4 right-4 z-50 flex items-center justify-between gap-2 pointer-events-none">
        <a
          href="/"
          className="pointer-events-auto flex items-center gap-1 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white text-xs font-bold hover:bg-white/20"
        >
          <ArrowLeft className="w-3 h-3" /> חזור
        </a>
        <div className="pointer-events-auto flex gap-2">
          <button
            onClick={() => setMuted((m) => !m)}
            className="px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white text-xs font-bold hover:bg-white/20"
          >
            {muted ? '🔇 ללא סאונד' : '🔊 סאונד'}
          </button>
          <button
            onClick={() => setReplayKey((k) => k + 1)}
            className="px-3 py-1.5 rounded-full bg-primary text-white text-xs font-bold hover:opacity-90"
          >
            ↻ הפעל שוב
          </button>
        </div>
      </div>

      {/* Phase 1-3: Splash */}
      {phase !== 'onboarding' && (
        <div
          className={`absolute inset-0 flex flex-col items-center justify-center transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] ${
            phase === 'transition' ? 'opacity-0 scale-110 blur-md' : 'opacity-100 scale-100'
          }`}
        >
          {/* Ambient glow blobs */}
          <div className="pointer-events-none absolute inset-0">
            <div
              className={`absolute top-1/3 left-1/2 -translate-x-1/2 w-[140vw] h-[140vw] max-w-[800px] max-h-[800px] rounded-full transition-all duration-[2000ms] ease-out ${
                phase === 'boot' ? 'opacity-0 scale-50' : 'opacity-100 scale-100'
              }`}
              style={{
                background:
                  'radial-gradient(circle, hsl(14 100% 57% / 0.35) 0%, hsl(0 85% 45% / 0.15) 35%, transparent 65%)',
                filter: 'blur(40px)',
              }}
            />
            {/* Floating embers */}
            {Array.from({ length: 14 }).map((_, i) => (
              <span
                key={i}
                className="absolute rounded-full bg-orange-400"
                style={{
                  width: `${2 + (i % 4)}px`,
                  height: `${2 + (i % 4)}px`,
                  left: `${10 + (i * 6) % 80}%`,
                  bottom: `-10px`,
                  opacity: 0,
                  animation: `ember-rise ${4 + (i % 5)}s linear ${i * 0.3}s infinite`,
                  boxShadow: '0 0 8px hsl(14 100% 57% / 0.8)',
                }}
              />
            ))}
          </div>

          {/* Logo / mark */}
          <div
            className={`relative transition-all duration-1000 ease-[cubic-bezier(0.16,1,0.3,1)] ${
              phase === 'boot'
                ? 'opacity-0 scale-50 translate-y-8'
                : phase === 'ignite'
                ? 'opacity-100 scale-110'
                : 'opacity-100 scale-100'
            }`}
          >
            <div
              className={`w-28 h-28 rounded-3xl flex items-center justify-center relative ${
                phase === 'ignite' || phase === 'reveal' ? 'animate-fire-pulse' : ''
              }`}
              style={{
                background:
                  'linear-gradient(135deg, hsl(14 100% 57%) 0%, hsl(0 85% 45%) 100%)',
                boxShadow:
                  phase === 'boot'
                    ? '0 0 0 hsl(14 100% 57% / 0)'
                    : '0 20px 60px -10px hsl(14 100% 57% / 0.7), 0 0 100px hsl(14 100% 57% / 0.4)',
              }}
            >
              <Flame className="w-14 h-14 text-white drop-shadow-[0_0_20px_rgba(255,255,255,0.8)]" strokeWidth={2.5} />
              {/* Pulse ring */}
              {phase !== 'boot' && (
                <span className="absolute inset-0 rounded-3xl border-2 border-primary/60 animate-ping" />
              )}
            </div>
          </div>

          {/* Title */}
          <div
            className={`mt-8 text-center transition-all duration-700 ease-out ${
              phase === 'boot' ? 'opacity-0 translate-y-4' : 'opacity-100 translate-y-0'
            }`}
            style={{ transitionDelay: phase === 'boot' ? '0ms' : '300ms' }}
          >
            <h1
              className="text-5xl font-black tracking-tight text-white leading-none"
              style={{ letterSpacing: '-0.04em' }}
            >
              DAILY <span className="text-gradient-fire">DOMINATOR</span>
            </h1>
            <p className="mt-3 text-xs font-bold uppercase tracking-[0.4em] text-white/40">
              משמעת · רצף · ניצחון
            </p>
          </div>

          {/* Loading bar */}
          <div
            className={`absolute bottom-24 left-1/2 -translate-x-1/2 w-64 transition-opacity duration-500 ${
              phase === 'reveal' ? 'opacity-0' : 'opacity-100'
            }`}
          >
            <div className="h-[2px] bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-200 ease-out"
                style={{
                  width: `${progress}%`,
                  background: 'linear-gradient(90deg, hsl(14 100% 57%), hsl(45 95% 60%))',
                  boxShadow: '0 0 12px hsl(14 100% 57% / 0.8)',
                }}
              />
            </div>
            <p className="text-center mt-3 text-[11px] font-bold uppercase tracking-widest text-white/50 h-4 transition-all">
              {LOADING_LINES[lineIdx]}
            </p>
          </div>
        </div>
      )}

      {/* Phase 5: Onboarding (demo) */}
      {phase === 'onboarding' && (
        <div className="absolute inset-0 bg-gradient-to-br from-zinc-950 via-black to-zinc-950 animate-fade-in">
          <div className="absolute top-0 right-0 w-96 h-96 bg-primary/20 blur-3xl rounded-full -translate-y-1/2 translate-x-1/3" />
          <div className="relative h-full flex flex-col items-center justify-center px-8">
            {/* Step indicator */}
            <div className="flex gap-2 mb-12">
              <div className="w-8 h-1 rounded-full bg-primary" />
              <div className="w-2 h-1 rounded-full bg-white/20" />
              <div className="w-2 h-1 rounded-full bg-white/20" />
              <div className="w-2 h-1 rounded-full bg-white/20" />
            </div>

            <div className="text-center max-w-sm" style={{ animation: 'fade-in 0.8s ease-out 0.2s both' }}>
              <p className="text-xs font-bold uppercase tracking-[0.3em] text-primary mb-4">
                שלב 1 מתוך 4
              </p>
              <h2 className="text-4xl font-black text-white mb-4 leading-tight" style={{ letterSpacing: '-0.03em' }}>
                בוא נכיר אותך
              </h2>
              <p className="text-white/60 text-base leading-relaxed mb-12">
                ניצור יחד תוכנית אישית. ה-AI שלנו ילמד את הקצב שלך ויבנה משמעת שמתאימה רק לך.
              </p>

              <button className="w-full py-4 rounded-2xl bg-primary text-white font-black text-base hover:scale-[1.02] active:scale-95 transition-transform shadow-[0_10px_40px_-10px_hsl(14_100%_57%/0.6)]">
                בוא נתחיל →
              </button>
              <button className="mt-3 text-white/40 text-xs font-bold">
                דלג על האונבורדינג
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes ember-rise {
          0% { transform: translateY(0) translateX(0); opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 0.6; }
          100% { transform: translateY(-110vh) translateX(20px); opacity: 0; }
        }
        @keyframes fire-pulse {
          0%, 100% { transform: scale(1); filter: brightness(1); }
          50% { transform: scale(1.05); filter: brightness(1.15); }
        }
        .animate-fire-pulse { animation: fire-pulse 1.5s ease-in-out infinite; }
      `}</style>
    </div>
  );
};

export default SplashDemo;
