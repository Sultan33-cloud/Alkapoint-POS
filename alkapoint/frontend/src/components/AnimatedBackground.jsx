import { useEffect, useRef } from 'react';

const PARTICLES = Array.from({ length: 28 }).map((_, i) => {
  const seed = (i * 9301 + 49297) % 233280;
  const rnd = seed / 233280;
  return {
    id: i,
    left: `${(i * 3.7) % 100}%`,
    size: 80 + Math.floor(rnd * 160),
    delay: `${-(i * 0.6)}s`,
    duration: `${10 + (i % 6) * 2}s`,
    direction: i % 2 === 0 ? 'apDriftUp' : 'apDriftDown',
    opacity: 0.10 + rnd * 0.15,
    isGold: i % 3 === 0,
  };
});

// Inject the keyframes once into <head>
const KEYFRAMES_ID = 'ap-bg-keyframes';
if (typeof document !== 'undefined' && !document.getElementById(KEYFRAMES_ID)) {
  const style = document.createElement('style');
  style.id = KEYFRAMES_ID;
  style.textContent = `
    @keyframes apDriftUp {
      0%   { transform: translateY(0) translateX(0) scale(0.9); opacity: 0; }
      10%  { opacity: 0.55; }
      90%  { opacity: 0.15; }
      100% { transform: translateY(-110vh) translateX(40px) scale(1.4); opacity: 0; }
    }
    @keyframes apDriftDown {
      0%   { transform: translateY(0) translateX(0) scale(1.2); opacity: 0; }
      10%  { opacity: 0.35; }
      90%  { opacity: 0.10; }
      100% { transform: translateY(110vh) translateX(-40px) scale(0.8); opacity: 0; }
    }
    @keyframes apPulseSoft {
      0%, 100% { opacity: 0.6; }
      50%      { opacity: 1; }
    }
  `;
  document.head.appendChild(style);
}

export default function AnimatedBackground() {
  const containerRef = useRef(null);

  useEffect(() => {
    const onVisibility = () => {
      if (!containerRef.current) return;
      containerRef.current.style.animationPlayState = document.hidden ? 'paused' : 'running';
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);

  return (
    <div
      ref={containerRef}
      aria-hidden="true"
      className="fixed inset-0 overflow-hidden pointer-events-none z-0"
      style={{ contain: 'strict' }}
    >
      {/* Base gradient */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(1200px 800px at 20% -10%, rgba(15,110,124,0.14), transparent 60%),' +
            'radial-gradient(1000px 700px at 100% 100%, rgba(212,162,76,0.10), transparent 60%),' +
            '#0d1117',
        }}
      />

      {/* Nebulas */}
      <div
        className="absolute -left-40 top-1/4 w-[520px] h-[520px] rounded-full"
        style={{
          background: 'radial-gradient(closest-side, rgba(15,110,124,0.22), transparent 70%)',
          filter: 'blur(40px)',
          animation: 'apPulseSoft 3s ease-in-out infinite',
        }}
      />
      <div
        className="absolute -right-40 bottom-1/4 w-[480px] h-[480px] rounded-full"
        style={{
          background: 'radial-gradient(closest-side, rgba(212,162,76,0.18), transparent 70%)',
          filter: 'blur(40px)',
          animation: 'apPulseSoft 3s ease-in-out infinite',
          animationDelay: '1.2s',
        }}
      />

      {/* Perfume-spray particles — visible, always animating */}
      {PARTICLES.map((p) => (
        <div
          key={p.id}
          className="absolute will-change-transform"
          style={{
            left: p.left,
            top: p.direction === 'apDriftUp' ? '105%' : '-15%',
            width: p.size,
            height: p.size,
            borderRadius: '50%',
            background: p.isGold
              ? `radial-gradient(closest-side, rgba(212,162,76,${p.opacity}), transparent 70%)`
              : `radial-gradient(closest-side, rgba(15,110,124,${p.opacity}), transparent 70%)`,
            filter: 'blur(24px)',
            animationName: p.direction,
            animationDuration: p.duration,
            animationDelay: p.delay,
            animationTimingFunction: 'linear',
            animationIterationCount: 'infinite',
          }}
        />
      ))}

      {/* Diagonal veil */}
      <div
        className="absolute inset-0 opacity-[0.035]"
        style={{
          backgroundImage: 'repeating-linear-gradient(45deg, #ffffff 0 1px, transparent 1px 24px)',
        }}
      />
    </div>
  );
}