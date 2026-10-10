import React, { useEffect } from 'react';

/* ===== CONFETTI ===== */
const COLORS = ['#f59e0b', '#3b82f6', '#22c55e', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316'];
const seededFraction = (seed) => {
  const value = Math.sin(seed * 12.9898) * 43758.5453;
  return value - Math.floor(value);
};
const seededBetween = (seed, a, b) => a + seededFraction(seed) * (b - a);

export function Confetti({ active }) {
  const pieces = active ? Array.from({ length: 60 }, (_, i) => ({
      id: i,
      x: seededBetween(i + 1, 5, 95),
      color: COLORS[i % COLORS.length],
      size: seededBetween(i + 101, 8, 16),
      delay: seededBetween(i + 201, 0, 0.8),
      duration: seededBetween(i + 301, 1.5, 3),
      rotate: seededBetween(i + 401, 0, 360),
      shape: i % 2 === 0 ? 'circle' : 'rect',
    })) : [];

  if (!pieces.length) return null;

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 9999, overflow: 'hidden' }}>
      <style>{`
        @keyframes confettiFall {
          0%   { transform: translateY(-20px) rotate(0deg); opacity: 1; }
          100% { transform: translateY(110vh) rotate(720deg); opacity: 0; }
        }
        @keyframes confettiWiggle {
          0%, 100% { margin-left: 0; }
          25% { margin-left: 15px; }
          75% { margin-left: -15px; }
        }
      `}</style>
      {pieces.map(p => (
        <div key={p.id} style={{
          position: 'absolute',
          left: `${p.x}%`,
          top: '-20px',
          width: p.shape === 'circle' ? p.size : p.size * 0.6,
          height: p.shape === 'circle' ? p.size : p.size * 1.4,
          borderRadius: p.shape === 'circle' ? '50%' : '2px',
          background: p.color,
          animation: `confettiFall ${p.duration}s ${p.delay}s ease-in forwards, confettiWiggle ${p.duration / 2}s ${p.delay}s ease-in-out infinite`,
        }} />
      ))}
    </div>
  );
}

/* ===== STAR RATING ===== */
export function StarRating({ score, total, size = 48 }) {
  const pct = total > 0 ? score / total : 0;
  const stars = pct >= 0.9 ? 3 : pct >= 0.6 ? 2 : 1;
  return (
    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', marginBottom: '0.5rem' }}>
      {[1, 2, 3].map(s => (
        <span key={s} style={{
          fontSize: size,
          filter: s <= stars ? 'none' : 'grayscale(1) opacity(0.3)',
          animation: s <= stars ? `starPop ${0.2 * s}s 0.1s both` : 'none',
          display: 'inline-block',
        }}>⭐</span>
      ))}
      <style>{`
        @keyframes starPop {
          0%   { transform: scale(0) rotate(-20deg); }
          70%  { transform: scale(1.3) rotate(10deg); }
          100% { transform: scale(1) rotate(0deg); }
        }
      `}</style>
    </div>
  );
}

/* ===== MASCOT MESSAGE ===== */
const MASCOTS = [
  { emoji: '🦁', name: 'Leo' },
  { emoji: '🐸', name: 'Froggy' },
  { emoji: '🦊', name: 'Fox' },
  { emoji: '🐼', name: 'Panda' },
  { emoji: '🐙', name: 'Octo' },
];

const MESSAGES_PERFECT = [
  'Xuất sắc! Em thật tuyệt vời! 🎉',
  'Wow! 100%! Em là thiên tài! 🚀',
  'Hoàn hảo! Thầy/cô rất tự hào về em! 🏆',
  'Siêu đỉnh! Làm tiếp đi nhé! ⚡',
];
const MESSAGES_GOOD = [
  'Làm tốt lắm! Em đang tiến bộ rất nhanh! 👏',
  'Giỏi quá! Cố lên em nhé! 💪',
  'Hay lắm! Lần sau em sẽ giỏi hơn! 🌟',
  'Tốt lắm! Em học rất chăm chỉ! 📚',
];
const MESSAGES_TRY = [
  'Cố lên! Lần sau em sẽ làm được! 💫',
  'Không sao, cứ ôn lại rồi thử tiếp nhé! 🌈',
  'Em cố gắng thêm chút nữa nào! 🔥',
  'Học từ sai lầm là cách học giỏi nhất! 🧠',
];

const pick = (items, seed) => items[Math.abs(seed) % items.length];

export function MascotMessage({ score, total }) {
  const pct = total > 0 ? score / total : 0;
  const seed = Math.round(Number(score) * 31 + Number(total) * 17);
  const mascot = MASCOTS[Math.abs(seed) % MASCOTS.length];
  const msg = pct >= 0.9 ? pick(MESSAGES_PERFECT, seed) : pct >= 0.6 ? pick(MESSAGES_GOOD, seed) : pick(MESSAGES_TRY, seed);
  const bg = pct >= 0.9 ? 'linear-gradient(135deg,#fef9c3,#fde68a)' : pct >= 0.6 ? 'linear-gradient(135deg,#dbeafe,#bfdbfe)' : 'linear-gradient(135deg,#fce7f3,#fbcfe8)';

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '1rem',
      background: bg, borderRadius: '16px', padding: '1rem 1.5rem',
      marginTop: '1rem', border: '2px dashed rgba(0,0,0,0.1)',
      animation: 'mascotSlide 0.4s ease-out',
    }}>
      <style>{`
        @keyframes mascotSlide {
          from { opacity: 0; transform: translateX(-20px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        @keyframes mascotBounce {
          0%, 100% { transform: translateY(0); }
          50%       { transform: translateY(-8px); }
        }
      `}</style>
      <span style={{ fontSize: 48, animation: 'mascotBounce 1s ease-in-out infinite', display: 'inline-block' }}>
        {mascot.emoji}
      </span>
      <div>
        <div style={{ fontWeight: 800, fontSize: '1rem', color: '#1e293b' }}>{mascot.name} nói:</div>
        <div style={{ fontSize: '1.05rem', color: '#374151', marginTop: 2 }}>{msg}</div>
      </div>
    </div>
  );
}

/* ===== LESSON COMPLETE POPUP ===== */
export function LessonCompleteToast({ show, onClose }) {
  useEffect(() => {
    if (show) {
      const t = setTimeout(onClose, 3000);
      return () => clearTimeout(t);
    }
  }, [show, onClose]);

  if (!show) return null;

  return (
    <>
      <style>{`
        @keyframes toastIn {
          from { opacity: 0; transform: translateY(60px) scale(0.8); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes toastOut {
          from { opacity: 1; }
          to   { opacity: 0; transform: translateY(-20px); }
        }
      `}</style>
      <div style={{
        position: 'fixed', bottom: '2rem', left: '50%', transform: 'translateX(-50%)',
        background: 'linear-gradient(135deg, #7c3aed, #4f46e5)',
        color: '#fff', borderRadius: '20px', padding: '1rem 2rem',
        boxShadow: '0 10px 40px rgba(124,58,237,0.4)',
        zIndex: 9000, textAlign: 'center',
        animation: 'toastIn 0.4s cubic-bezier(0.34,1.56,0.64,1)',
        display: 'flex', alignItems: 'center', gap: '0.75rem',
        fontSize: '1.1rem', fontWeight: 700, minWidth: '260px', justifyContent: 'center'
      }}>
        <span style={{ fontSize: 28 }}>🎉</span>
        Bài học hoàn thành! +XP
        <span style={{ fontSize: 28 }}>⭐</span>
      </div>
    </>
  );
}

/* ===== FUN PROGRESS BAR ===== */
export function FunProgressBar({ pct }) {
  const color = pct >= 80 ? '#22c55e' : pct >= 50 ? '#f59e0b' : '#3b82f6';
  const emoji = pct >= 100 ? '🏆' : pct >= 80 ? '🚀' : pct >= 50 ? '⭐' : '📚';
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
        <span style={{ fontSize: '0.85rem', color: '#cbd5e1' }}>Tiến độ: {pct}% {emoji}</span>
      </div>
      <div style={{ flex: 1, height: '10px', background: 'rgba(255,255,255,0.15)', borderRadius: 99, overflow: 'hidden', minWidth: 180 }}>
        <div style={{
          height: '100%', width: `${pct}%`, borderRadius: 99,
          background: `linear-gradient(90deg, ${color}, #fff 200%)`,
          transition: 'width 0.6s cubic-bezier(0.34,1.1,0.64,1)',
          boxShadow: `0 0 8px ${color}80`,
        }} />
      </div>
      <style>{`
        @keyframes progressGlow {
          0%, 100% { box-shadow: 0 0 6px ${color}80; }
          50%       { box-shadow: 0 0 16px ${color}; }
        }
      `}</style>
    </div>
  );
}
