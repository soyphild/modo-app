import { motion } from 'framer-motion';
import { Disc3, Siren, Sparkles, Swords, Zap, type LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { TYPE_META } from '../../../shared/cards';
import type { CardDef, CardType, ResultColor } from '../../../shared/types';
import { cx } from './ui';

export const TYPE_ICON: Record<CardType, LucideIcon> = {
  TRACK: Disc3,
  POWER_UP: Zap,
  CHALLENGE: Swords,
  PENALTY: Siren,
  WILD: Sparkles
};

/** Patrón de ondas usado en anverso y reverso: identidad gráfica de la marca. */
function Rings({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 200 200" className="absolute inset-0 h-full w-full opacity-40" aria-hidden>
      {[20, 38, 56, 74, 92].map((r, i) => (
        <circle key={r} cx="100" cy="100" r={r} fill="none" stroke={color} strokeOpacity={0.5 - i * 0.08} strokeWidth="1.2" strokeDasharray={i % 2 ? '2 6' : undefined} />
      ))}
    </svg>
  );
}

export function CardFace({ card, className, footer, compact }: { card: CardDef; className?: string; footer?: ReactNode; compact?: boolean }) {
  const meta = TYPE_META[card.type];
  const Icon = TYPE_ICON[card.type];
  const wild = card.type === 'WILD';
  return (
    <div
      className={cx('relative flex aspect-[63/88] w-full flex-col overflow-hidden rounded-[22px] p-[3px]', className)}
      style={{ background: wild ? 'conic-gradient(from 0deg, #8B5CF6, #00D9FF, #19C86A, #FFC247, #FF4057, #F472B6, #8B5CF6)' : `linear-gradient(150deg, ${meta.color}, ${meta.accent} 60%, #0B0B14)` }}
    >
      <div className={cx('relative flex h-full flex-col overflow-hidden rounded-[19px] bg-[#0E0E1A]', compact ? 'p-[3mm]' : 'p-4')}>
        <div className="absolute inset-x-0 top-0 h-1/2" style={{ background: `radial-gradient(80% 70% at 50% 0%, ${meta.color}40, transparent 70%)` }} />
        <div className="relative flex items-center justify-between">
          <span className="rounded-full px-2.5 py-1 text-[10px] font-black tracking-[0.2em]" style={{ background: `${meta.color}22`, color: meta.color }}>
            {meta.label}
          </span>
          {card.rarity && card.rarity !== 'common' && <span className="text-[10px] font-bold uppercase tracking-widest text-tie">★ {card.rarity === 'legendary' ? 'Legendaria' : 'Rara'}</span>}
          {card.adultsOnly && <span className="text-[10px] font-bold text-lose">+18</span>}
        </div>
        <div className={cx('relative mx-auto grid aspect-square place-items-center', compact ? 'my-[1mm] w-[48%]' : 'my-3 w-[52%]')}>
          <Rings color={meta.color} />
          <div className="grid h-[62%] w-[62%] place-items-center rounded-full" style={{ background: `radial-gradient(circle, ${meta.color}55, ${meta.color}11 70%)`, boxShadow: `0 0 40px ${meta.color}66` }}>
            <Icon className="h-1/2 w-1/2" color="white" strokeWidth={1.6} />
          </div>
        </div>
        <div className="relative mt-auto text-center">
          <h3 className={cx('font-display font-black leading-tight', compact ? 'text-[12px]' : 'text-[1.15rem]')} style={{ color: card.type === 'TRACK' ? '#fff' : meta.color }}>
            {card.name}
          </h3>
          <p className={cx('font-semibold text-white/90', compact ? 'mt-[0.5mm] text-[9px]' : 'mt-1 text-sm')}>{card.short}</p>
          <p className={cx('leading-snug text-white/60', compact ? 'mt-[1mm] text-[7.5px]' : 'mt-2 text-xs')}>{card.description}</p>
        </div>
        {footer && <div className={cx('relative', compact ? 'mt-[1.5mm]' : 'mt-3')}>{footer}</div>}
      </div>
    </div>
  );
}

export function CardBack({ className, label = 'GEN1' }: { className?: string; label?: string }) {
  return (
    <div className={cx('relative aspect-[63/88] w-full overflow-hidden rounded-[22px] p-[3px]', className)} style={{ background: 'linear-gradient(150deg, #8B5CF6, #00D9FF)' }}>
      <div className="relative grid h-full place-items-center overflow-hidden rounded-[19px] bg-[#0B0B14]">
        <div className="absolute inset-0" style={{ backgroundImage: 'repeating-linear-gradient(45deg, rgba(139,92,246,.12) 0 2px, transparent 2px 14px)' }} />
        <div className="relative grid aspect-square w-[70%] place-items-center">
          <Rings color="#00D9FF" />
          <div className="text-center font-display font-black leading-[0.9]">
            <div className="text-gradient text-3xl">BEAT</div>
            <div className="text-[10px] tracking-[0.4em] text-white/70">OR</div>
            <div className="text-3xl">SHOT</div>
          </div>
        </div>
        <span className="absolute bottom-3 text-[9px] font-bold tracking-[0.35em] text-white/40">{label}</span>
      </div>
    </div>
  );
}

/** Carta que se voltea en 3D. */
export function FlipCard({ flipped, front, back, className, reduced }: { flipped: boolean; front: ReactNode; back: ReactNode; className?: string; reduced?: boolean }) {
  return (
    <div className={cx('perspective', className)}>
      <motion.div
        className="preserve-3d relative"
        initial={false}
        animate={{ rotateY: flipped ? 180 : 0 }}
        transition={reduced ? { duration: 0 } : { type: 'spring', stiffness: 90, damping: 14 }}
      >
        <div className="backface-hidden">{back}</div>
        <div className="backface-hidden absolute inset-0" style={{ transform: 'rotateY(180deg)' }}>
          {front}
        </div>
      </motion.div>
    </div>
  );
}

export const RESULT_STYLE: Record<ResultColor, { color: string; label: string; sub: string; emoji: string }> = {
  green: { color: '#19C86A', label: 'VERDE', sub: '¡Victoria!', emoji: '🏆' },
  red: { color: '#FF4057', label: 'ROJA', sub: 'Esta vez no', emoji: '💥' },
  yellow: { color: '#FFC247', label: 'AMARILLA', sub: 'Empate', emoji: '🤝' }
};

export function ResultFace({ color, name, avatar, points }: { color: ResultColor; name: string; avatar: string; points?: number | null }) {
  const s = RESULT_STYLE[color];
  return (
    <div className="relative grid aspect-[63/88] w-full place-items-center overflow-hidden rounded-[22px]" style={{ background: `linear-gradient(160deg, ${s.color}, ${s.color}aa 50%, #0B0B14)`, boxShadow: `0 0 60px ${s.color}88` }}>
      <div className="shimmer absolute inset-0" />
      <div className="relative text-center text-ink">
        <div className="text-5xl">{avatar}</div>
        <div className="mt-2 font-display text-sm font-bold">{name}</div>
        <div className="mt-3 font-display text-2xl font-black tracking-wide">{s.label}</div>
        <div className="text-sm font-semibold">{s.sub}</div>
        {points !== undefined && points !== null && points !== 0 && (
          <div className="mt-3 rounded-full bg-ink/80 px-3 py-1 font-display text-sm font-bold" style={{ color: s.color }}>
            {points > 0 ? '+' : ''}
            {points}
          </div>
        )}
      </div>
    </div>
  );
}
