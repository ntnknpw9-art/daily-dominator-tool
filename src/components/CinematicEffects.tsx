import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';

// Confetti particle
interface Particle {
  id: number;
  x: number;
  y: number;
  color: string;
  size: number;
  rotation: number;
  speedX: number;
  speedY: number;
}

export const useConfetti = () => {
  const [particles, setParticles] = useState<Particle[]>([]);

  const fire = useCallback(() => {
    const colors = ['#B6DD0E', '#06b6d4', '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899'];
    const newParticles: Particle[] = [];
    for (let i = 0; i < 60; i++) {
      newParticles.push({
        id: Date.now() + i,
        x: Math.random() * window.innerWidth,
        y: -20,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: Math.random() * 8 + 4,
        rotation: Math.random() * 360,
        speedX: (Math.random() - 0.5) * 8,
        speedY: Math.random() * 3 + 2,
      });
    }
    setParticles(newParticles);
    setTimeout(() => setParticles([]), 3000);
  }, []);

  return { fire, particles };
};

export const ConfettiOverlay = ({ particles }: { particles: Particle[] }) => {
  if (particles.length === 0) return null;

  return createPortal(
    <div className="fixed inset-0 pointer-events-none z-[9999]">
      {particles.map(p => (
        <div
          key={p.id}
          className="absolute animate-confetti-fall"
          style={{
            left: p.x,
            top: p.y,
            width: p.size,
            height: p.size,
            backgroundColor: p.color,
            borderRadius: Math.random() > 0.5 ? '50%' : '2px',
            transform: `rotate(${p.rotation}deg)`,
            animationDelay: `${Math.random() * 0.5}s`,
            animationDuration: `${2 + Math.random()}s`,
          }}
        />
      ))}
    </div>,
    document.body
  );
};

// Fire streak effect
export const FireStreak = ({ streak }: { streak: number }) => {
  if (streak < 3) return null;

  return (
    <div className="relative inline-flex items-center">
      <div className="animate-fire-pulse text-2xl">
        {'🔥'.repeat(Math.min(streak, 5))}
      </div>
      {streak >= 7 && (
        <div className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-400 rounded-full animate-ping" />
      )}
    </div>
  );
};

// Shake effect on miss
export const useShake = () => {
  const [shaking, setShaking] = useState(false);

  const shake = useCallback(() => {
    setShaking(true);
    // Vibrate if supported
    if (navigator.vibrate) navigator.vibrate(200);
    setTimeout(() => setShaking(false), 500);
  }, []);

  return { shaking, shake };
};

export const ShakeWrapper = ({ shaking, children }: { shaking: boolean; children: React.ReactNode }) => (
  <div className={shaking ? 'animate-shake' : ''}>
    {children}
  </div>
);

// Screen flash
export const ScreenFlash = ({ color = 'green', trigger }: { color?: string; trigger: boolean }) => {
  if (!trigger) return null;

  const colorMap: Record<string, string> = {
    green: 'rgba(34, 197, 94, 0.15)',
    red: 'hsl(72 88% 46% / 0.15)',
    gold: 'rgba(245, 158, 11, 0.15)',
  };

  return createPortal(
    <div
      className="fixed inset-0 pointer-events-none z-[9998] animate-flash"
      style={{ backgroundColor: colorMap[color] || colorMap.green }}
    />,
    document.body
  );
};
