import { ArrowLeft, Check, Clock, Lock } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { ExpansionView } from '../../../shared/types';
import { Pill, Screen, SectionTitle } from '../components/ui';
import { fetchExpansions } from '../lib/game';

export function ExpansionList({ list, selected, onToggle }: { list: ExpansionView[]; selected?: string[]; onToggle?: (id: string) => void }) {
  return (
    <div className="space-y-3">
      {list.map((e) => {
        const on = selected?.includes(e.id);
        const disabled = e.status === 'soon' || !onToggle;
        return (
          <button
            key={e.id}
            disabled={disabled}
            onClick={() => onToggle?.(e.id)}
            aria-pressed={on}
            className="glass relative flex w-full items-center gap-3 overflow-hidden p-4 text-left transition disabled:cursor-default"
            style={on ? { boxShadow: `inset 0 0 0 2px ${e.color}` } : undefined}
          >
            <div className="absolute inset-y-0 left-0 w-1.5" style={{ background: e.color }} />
            <div className="min-w-0 flex-1 pl-1">
              <div className="flex items-center gap-2">
                <span className="font-display text-sm font-bold">{e.name}</span>
                {e.status === 'soon' && <Pill color="#FFC247"><Clock size={11} /> Próximamente</Pill>}
              </div>
              <p className="mt-1 text-xs text-white/55">{e.tagline}</p>
              {e.status !== 'soon' && (
                <p className="mt-1.5 text-[11px] text-white/40">
                  {e.playableTracks} de {e.totalTracks} canciones con audio autorizado
                  {e.playableTracks === 0 && ' · pendiente de licencias'}
                </p>
              )}
            </div>
            {onToggle && e.status !== 'soon' && (
              <span className="grid h-7 w-7 place-items-center rounded-full" style={{ background: on ? e.color : 'rgba(255,255,255,.08)' }}>
                {on && <Check size={16} className="text-ink" />}
              </span>
            )}
            {e.status === 'soon' && <Lock size={16} className="text-white/30" />}
          </button>
        );
      })}
    </div>
  );
}

export function ExpansionsScreen({ onBack }: { onBack: () => void }) {
  const [list, setList] = useState<ExpansionView[] | null>(null);
  const [err, setErr] = useState(false);
  useEffect(() => {
    fetchExpansions()
      .then(setList)
      .catch(() => setErr(true));
  }, []);
  return (
    <Screen>
      <button onClick={onBack} className="mb-4 mt-2 flex items-center gap-1 text-sm text-white/60">
        <ArrowLeft size={16} /> Volver
      </button>
      <SectionTitle kicker="Catálogo" title="Mis expansiones" sub="Cada caja física trae un código de edición. Las expansiones compatibles se combinan en la misma partida." />
      {err && <p className="text-lose">No se pudo cargar el catálogo. Revisa tu conexión.</p>}
      {!list && !err && <p className="text-white/50">Cargando…</p>}
      {list && <ExpansionList list={list} />}
      <div className="h-8" />
    </Screen>
  );
}
