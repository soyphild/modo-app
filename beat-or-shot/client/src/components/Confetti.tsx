import { motion } from 'framer-motion';
import { useMemo } from 'react';
import { useSettings } from '../lib/settings';

export function Confetti({ colors = ['#19C86A', '#00D9FF', '#8B5CF6', '#FFC247', '#FFFFFF'], count = 60 }: { colors?: string[]; count?: number }) {
  const { reducedMotion } = useSettings();
  const parts = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        x: Math.random() * 100,
        delay: Math.random() * 0.4,
        dur: 1.6 + Math.random() * 1.6,
        rot: Math.random() * 720 - 360,
        size: 6 + Math.random() * 8,
        color: colors[i % colors.length],
        round: Math.random() < 0.3
      })),
    [count, colors]
  );
  if (reducedMotion) return null;
  return (
    <div className="pointer-events-none fixed inset-0 z-40 overflow-hidden" aria-hidden>
      {parts.map((p, i) => (
        <motion.span
          key={i}
          className="absolute top-0 block"
          style={{ left: `${p.x}%`, width: p.size, height: p.round ? p.size : p.size * 0.45, background: p.color, borderRadius: p.round ? 999 : 2 }}
          initial={{ y: -30, opacity: 1, rotate: 0 }}
          animate={{ y: '105vh', opacity: [1, 1, 0], rotate: p.rot, x: [0, (Math.random() - 0.5) * 120] }}
          transition={{ delay: p.delay, duration: p.dur, ease: 'easeIn' }}
        />
      ))}
    </div>
  );
}
