import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import { useEffect, useState, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { serverNow } from '../lib/game';
import { sfx, unlockAudio } from '../lib/audio';
import { vibrate } from '../lib/settings';
import type { PlayerPublic } from '../../../shared/types';

export function cx(...c: (string | false | null | undefined)[]) {
  return c.filter(Boolean).join(' ');
}

export function Logo({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const cls = { sm: 'text-lg', md: 'text-3xl', lg: 'text-[2.6rem] leading-[0.95]' }[size];
  return (
    <div className={cx('select-none font-display font-black tracking-tight', cls)} aria-label="Beat or Shot">
      <span className="text-gradient">BEAT</span>
      <span className="mx-[0.18em] align-middle text-[0.45em] font-bold tracking-[0.3em] text-white/70">OR</span>
      <span className="text-white">SHOT</span>
    </div>
  );
}

type BtnVariant = 'primary' | 'ghost' | 'danger' | 'win' | 'outline' | 'plain';
export function Btn({
  variant = 'primary',
  size = 'lg',
  className,
  children,
  onClick,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: BtnVariant; size?: 'sm' | 'md' | 'lg' }) {
  const base = 'relative inline-flex items-center justify-center gap-2 font-semibold transition active:scale-[0.97] disabled:pointer-events-none disabled:opacity-40';
  const sizes = { sm: 'h-9 rounded-xl px-3 text-sm', md: 'h-12 rounded-2xl px-5 text-base', lg: 'h-14 w-full rounded-2xl px-6 text-lg' };
  const variants: Record<BtnVariant, string> = {
    primary: 'btn-primary text-white',
    ghost: 'border border-white/10 bg-white/[0.06] text-white hover:bg-white/10',
    outline: 'border border-violet/60 text-violet-soft hover:bg-violet/10',
    danger: 'bg-lose text-white shadow-[0_10px_30px_-10px_rgba(255,64,87,.8)]',
    win: 'bg-win text-ink shadow-[0_10px_30px_-10px_rgba(25,200,106,.8)]',
    plain: 'text-white/70 hover:text-white'
  };
  return (
    <button
      {...rest}
      onClick={(e) => {
        unlockAudio();
        sfx('tap');
        vibrate(8);
        onClick?.(e);
      }}
      className={cx(base, sizes[size], variants[variant], className)}
    >
      {children}
    </button>
  );
}

export function Screen({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className="stage-bg stage-grid min-h-[100dvh] w-full">
      <div className={cx('relative mx-auto flex min-h-[100dvh] w-full max-w-md flex-col px-4 safe-top safe-bottom', className)}>{children}</div>
    </div>
  );
}

export function Avatar({ p, size = 44, ring = false, dim = false }: { p: Pick<PlayerPublic, 'avatar' | 'color' | 'connected'> | null; size?: number; ring?: boolean; dim?: boolean }) {
  if (!p) return null;
  return (
    <div
      className={cx('relative grid shrink-0 place-items-center rounded-full', dim && 'opacity-50')}
      style={{
        width: size,
        height: size,
        background: `radial-gradient(circle at 30% 25%, ${p.color}55, ${p.color}22 60%, #13131f)`,
        boxShadow: ring ? `0 0 0 2px #0b0b14, 0 0 0 4px ${p.color}, 0 0 24px ${p.color}88` : `inset 0 0 0 1.5px ${p.color}88`
      }}
    >
      <span style={{ fontSize: size * 0.5 }} aria-hidden>
        {p.avatar}
      </span>
      {!p.connected && <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-ink bg-lose" title="Desconectado" />}
    </div>
  );
}

export function PlayerTag({ p, sub, right, highlight }: { p: PlayerPublic | null; sub?: ReactNode; right?: ReactNode; highlight?: boolean }) {
  if (!p) return null;
  return (
    <div className={cx('flex items-center gap-3 rounded-2xl px-3 py-2', highlight ? 'bg-white/10' : 'bg-white/[0.03]')}>
      <Avatar p={p} size={40} ring={highlight} />
      <div className="min-w-0 flex-1">
        <div className="truncate font-semibold">{p.name}</div>
        {sub && <div className="truncate text-xs text-white/55">{sub}</div>}
      </div>
      {right}
    </div>
  );
}

/** Reloj sincronizado con el servidor que se refresca cada `ms`. */
export function useServerNow(ms = 200) {
  const [now, setNow] = useState(serverNow());
  useEffect(() => {
    const t = setInterval(() => setNow(serverNow()), ms);
    return () => clearInterval(t);
  }, [ms]);
  return now;
}

export function TimerRing({ endsAt, startAt, frozenUntil, size = 132, tension = true }: { endsAt: number; startAt: number; frozenUntil?: number | null; size?: number; tension?: boolean }) {
  const now = useServerNow(100);
  const total = Math.max(1, endsAt - startAt);
  const left = Math.max(0, endsAt - Math.max(now, startAt));
  const secs = Math.ceil(left / 1000);
  const frozen = !!frozenUntil && now < frozenUntil;
  const pct = left / total;
  const danger = secs <= 5 && left > 0;
  const [lastTick, setLastTick] = useState(-1);
  useEffect(() => {
    if (tension && danger && secs !== lastTick) {
      setLastTick(secs);
      sfx(secs <= 3 ? 'tickHigh' : 'tick');
      vibrate(15);
    }
  }, [secs, danger, tension, lastTick]);
  const r = size / 2 - 8;
  const c = 2 * Math.PI * r;
  const color = frozen ? '#67E8F9' : danger ? '#FF4057' : secs <= 15 ? '#FFC247' : '#8B5CF6';
  const label = secs >= 60 ? `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}` : String(secs);
  return (
    <div className={cx('relative grid place-items-center rounded-full', danger && 'tension')} style={{ width: size, height: size }} role="timer" aria-label={`${secs} segundos`}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} stroke="rgba(255,255,255,.08)" strokeWidth={8} fill="none" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={color}
          strokeWidth={8}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - pct)}
          style={{ transition: 'stroke-dashoffset .1s linear, stroke .3s', filter: `drop-shadow(0 0 8px ${color})` }}
        />
      </svg>
      <div className="absolute text-center">
        <div className={cx('font-display font-black tabular-nums', danger ? 'text-lose' : 'text-white')} style={{ fontSize: size * 0.3 }}>
          {label}
        </div>
        {frozen && <div className="text-[10px] font-bold uppercase tracking-widest text-cyan-soft">❄ congelado</div>}
      </div>
    </div>
  );
}

export function Waveform({ active, bars = 28, color = '#00D9FF' }: { active: boolean; bars?: number; color?: string }) {
  return (
    <div className="flex h-16 items-end justify-center gap-[3px]" aria-hidden>
      {Array.from({ length: bars }).map((_, i) => (
        <span
          key={i}
          className={cx('w-[5px] rounded-full', active && 'eq-bar')}
          style={{
            height: `${30 + ((i * 37) % 70)}%`,
            background: `linear-gradient(to top, ${color}, #8B5CF6)`,
            animationDelay: `${(i * 83) % 900}ms`,
            opacity: active ? 1 : 0.25,
            transform: active ? undefined : 'scaleY(0.25)'
          }}
        />
      ))}
    </div>
  );
}

export function Sheet({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
          <motion.div
            role="dialog"
            aria-label={title}
            className="glass-strong max-h-[88dvh] w-full max-w-md overflow-y-auto rounded-b-none p-5 safe-bottom"
            initial={{ y: 60 }}
            animate={{ y: 0 }}
            exit={{ y: 80 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-display text-lg font-bold">{title}</h2>
              <button className="grid h-9 w-9 place-items-center rounded-full bg-white/10" onClick={onClose} aria-label="Cerrar">
                <X size={18} />
              </button>
            </div>
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function Pill({ children, color = '#8B5CF6', className }: { children: ReactNode; color?: string; className?: string }) {
  return (
    <span className={cx('inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold', className)} style={{ background: `${color}22`, color, boxShadow: `inset 0 0 0 1px ${color}44` }}>
      {children}
    </span>
  );
}

export function SectionTitle({ kicker, title, sub }: { kicker?: string; title: string; sub?: string }) {
  return (
    <div className="mb-5">
      {kicker && <div className="mb-1 text-xs font-bold uppercase tracking-[0.25em] text-cyan">{kicker}</div>}
      <h1 className="font-display text-2xl font-black leading-tight">{title}</h1>
      {sub && <p className="mt-2 text-sm text-white/60">{sub}</p>}
    </div>
  );
}
