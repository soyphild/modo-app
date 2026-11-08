import { AnimatePresence, motion } from 'framer-motion';
import { WifiOff } from 'lucide-react';
import { useGame } from '../lib/game';
import { cx } from './ui';

export function Toasts() {
  const { toasts, conn, room } = useGame();
  return (
    <>
      <AnimatePresence>
        {conn !== 'online' && room && (
          <motion.div
            initial={{ y: -40 }}
            animate={{ y: 0 }}
            exit={{ y: -40 }}
            className="fixed inset-x-0 top-0 z-[60] flex items-center justify-center gap-2 bg-lose/95 py-2 text-sm font-semibold safe-top"
            role="status"
          >
            <WifiOff size={16} /> {conn === 'connecting' ? 'Reconectando… tu progreso está a salvo' : 'Sin conexión'}
          </motion.div>
        )}
      </AnimatePresence>
      <div className="pointer-events-none fixed inset-x-0 bottom-24 z-[70] flex flex-col items-center gap-2 px-4" aria-live="polite">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10 }}
              className={cx(
                'max-w-sm rounded-2xl px-4 py-3 text-center text-sm font-semibold shadow-xl backdrop-blur',
                t.tone === 'error' ? 'bg-lose/90' : t.tone === 'good' ? 'bg-win/90 text-ink' : 'bg-[#22223a]/95'
              )}
            >
              {t.text}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </>
  );
}
