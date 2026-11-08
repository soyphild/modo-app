import { AnimatePresence, MotionConfig, motion } from 'framer-motion';
import { lazy, Suspense, useEffect, useState } from 'react';
import { Toasts } from './components/Toasts';
import { act, toast, useGame } from './lib/game';
import { useSettings } from './lib/settings';
import { ExpansionsScreen } from './screens/Expansions';
import { GameScreen } from './screens/GameScreen';
import { Home } from './screens/Home';
import { HowTo } from './screens/HowTo';
import { JoinForm } from './screens/JoinForm';
import { Lobby } from './screens/Lobby';
import { SettingsScreen } from './screens/Settings';
import { Setup } from './screens/Setup';

const AdminPage = lazy(() => import('./pages/Admin'));
const PrintPage = lazy(() => import('./pages/Print'));

export type View = 'home' | 'create' | 'join' | 'howto' | 'expansions' | 'settings';

const PENDING_SCAN = 'bos.pendingScan';

export default function App() {
  const path = window.location.pathname;
  const settings = useSettings();

  useEffect(() => {
    document.documentElement.classList.toggle('reduce-motion', settings.reducedMotion);
  }, [settings.reducedMotion]);

  if (path.startsWith('/admin'))
    return (
      <Suspense fallback={null}>
        <AdminPage />
      </Suspense>
    );
  if (path.startsWith('/print'))
    return (
      <Suspense fallback={null}>
        <PrintPage />
      </Suspense>
    );
  return (
    <MotionConfig reducedMotion={settings.reducedMotion ? 'always' : 'user'}>
      <GameApp />
      <Toasts />
    </MotionConfig>
  );
}

function GameApp() {
  const { room, resuming } = useGame();
  const params = new URLSearchParams(window.location.search);
  const [view, setView] = useState<View>(params.get('sala') ? 'join' : 'home');
  const [joinCode] = useState(params.get('sala') ?? '');

  // Enlace directo desde el QR de una carta física: /c/XXXX-XXXX
  useEffect(() => {
    const m = window.location.pathname.match(/^\/c\/([A-Za-z0-9-]{8,9})$/);
    if (m) {
      try {
        sessionStorage.setItem(PENDING_SCAN, m[1]);
      } catch {
        /* sin almacenamiento */
      }
      window.history.replaceState(null, '', '/');
    } else if (params.get('sala')) window.history.replaceState(null, '', '/');
  }, []);

  useEffect(() => {
    let code: string | null = null;
    try {
      code = sessionStorage.getItem(PENDING_SCAN);
    } catch {
      /* sin almacenamiento */
    }
    if (!code) return;
    if (room?.stage?.type === 'turn' && (room.stage.activeId === room.you || room.hostId === room.you)) {
      sessionStorage.removeItem(PENDING_SCAN);
      void act({ type: 'scan', code });
    } else if (room && room.phase === 'playing') {
      sessionStorage.removeItem(PENDING_SCAN);
      toast('Carta escaneada, pero no es tu turno. Usa el escáner cuando te toque.', 'error');
    } else if (!room && !resuming) {
      toast('Entra a una partida para jugar esta carta', 'info');
    }
  }, [room?.stage?.type, room?.you, resuming]);

  if (room) {
    const key = room.phase === 'setup' ? 'setup' : room.phase === 'lobby' || room.phase === 'partners' ? 'lobby' : 'game';
    return (
      <AnimatePresence mode="wait">
        <motion.div key={key} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>
          {key === 'setup' ? <Setup room={room} /> : key === 'lobby' ? <Lobby room={room} /> : <GameScreen room={room} />}
        </motion.div>
      </AnimatePresence>
    );
  }
  if (resuming) return <div className="stage-bg grid min-h-[100dvh] place-items-center text-white/60">Reconectando con tu partida…</div>;

  switch (view) {
    case 'create':
    case 'join':
      return <JoinForm mode={view} initialCode={joinCode} onBack={() => setView('home')} />;
    case 'howto':
      return <HowTo onBack={() => setView('home')} />;
    case 'expansions':
      return <ExpansionsScreen onBack={() => setView('home')} />;
    case 'settings':
      return <SettingsScreen onBack={() => setView('home')} />;
    default:
      return <Home go={setView} />;
  }
}
