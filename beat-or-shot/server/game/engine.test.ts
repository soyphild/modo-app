import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { buildEditionCards, type CardInstance } from '../../shared/cards';
import { SCORING } from '../../shared/config';
import type { ClientAction } from '../../shared/types';
import { JsonCatalogStore } from '../store/catalogStore';
import { canonical, matches } from './answers';
import { GameError, Room, type AudioTokenRef } from './engine';
import { cardCode } from './cardCode';

const SECRET = 'test-secret';
const editionCards = buildEditionCards('GEN1');
const codeIndex = new Map<string, CardInstance>();
for (const c of editionCards) codeIndex.set(cardCode(SECRET, c.edition, c.serial), c);
const codeFor = (defId: string, nth = 0) => [...codeIndex.entries()].filter(([, c]) => c.defId === defId)[nth][0];

function seeded(seed = 42) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

function makeRoom(seed = 1) {
  const audioTokens = new Map<string, AudioTokenRef>();
  const room = new Room('TEST01', { catalog: new JsonCatalogStore(null), editionCards, codeIndex, audioTokens, joinUrl: (c) => `http://x/?sala=${c}`, rand: seeded(seed) });
  return { room, audioTokens };
}

function setupGame(n: number, opts: { minors?: boolean; family?: boolean; modality?: 'clasico' | 'fiesta' } = {}) {
  const { room, audioTokens } = makeRoom();
  const ids: string[] = [];
  for (let i = 0; i < n; i++) ids.push(room.addPlayer(`P${i}`, '🎧', false).id);
  const host = ids[0];
  room.act(host, { type: 'answerMinors', hasMinors: !!opts.minors });
  room.act(host, { type: 'configure', patch: { difficulty: 'normal', timeLimitSec: 60, rounds: 2, expansions: ['demo-clasicos'] } });
  if (opts.modality) room.act(host, { type: 'configure', patch: { modality: opts.modality } });
  room.act(host, { type: 'finishSetup' });
  room.act(host, { type: 'startPartners' });
  for (let i = 0; i < n; i++) if (n > 1) room.act(ids[i], { type: 'choosePartner', partnerId: ids[(i + 1) % n] });
  room.act(host, { type: 'startGame' });
  return { room, ids, host, audioTokens };
}

const stage = (room: Room) => room.stage as any;
const active = (room: Room) => stage(room).activeId as string;

describe('validación de respuestas', () => {
  it('normaliza tildes, mayúsculas y artículos', () => {
    expect(canonical('  El Danubio AZUL ')).toBe('danubio azul');
    expect(matches('para elisa', ['Para Elisa'])).toBe(true);
    expect(matches('FÜR ELISE', ['Para Elisa', 'Für Elise'])).toBe(true);
  });
  it('acepta erratas razonables', () => {
    expect(matches('Bethoven', ['Beethoven'])).toBe(true);
    expect(matches('ludwig van betoven', ['Ludwig van Beethoven'])).toBe(true);
    expect(matches('Marcha turka', ['Marcha turca'])).toBe(true);
  });
  it('rechaza respuestas incorrectas aunque se parezcan', () => {
    expect(matches('Mozart', ['Ludwig van Beethoven', 'Beethoven'])).toBe(false);
    expect(matches('Bach', ['Bizet'])).toBe(false);
    expect(matches('rock', ['Rock Lobster'])).toBe(false);
    expect(matches('a', ['A'])).toBe(false);
    expect(matches('Danubio rojo', ['Danubio azul'])).toBe(false);
  });
  it('el nivel Melómano es más estricto', () => {
    expect(matches('Bethovn', ['Beethoven'], 0)).toBe(true);
    expect(matches('Bethovn', ['Beethoven'], -1)).toBe(false);
  });
});

describe('fragmentos de archivos propios', () => {
  it('al azar: dentro de la canción, evitando intro y final; estribillo: siempre el mismo', async () => {
    const { pickClipStart, isPlayable } = await import('../store/catalogCore');
    const audio = { kind: 'file' as const, url: 'local:x.mp3', clipStart: 62, clipDuration: 15, durationSec: 210, clipMode: 'random' as const };
    const starts = new Set<number>();
    for (let i = 0; i < 50; i++) {
      const s = pickClipStart(audio, 12);
      expect(s).toBeGreaterThanOrEqual(8);
      expect(s + 12).toBeLessThanOrEqual(210 - 5);
      starts.add(s);
    }
    expect(starts.size).toBeGreaterThan(10);
    expect(pickClipStart({ ...audio, clipMode: 'hook' }, 12)).toBe(62);
    const base = { id: 'x', title: 't', artist: 'a', titleAliases: [], artistAliases: [], year: 2000, genre: 'g', country: 'c', difficulty: 2 as const, expansion: 'mis-canciones', explicit: false, spotifyUrl: null, active: true };
    expect(isPlayable({ ...base, audio, rights: { status: 'private_use', note: '' } })).toBe(true);
    expect(isPlayable({ ...base, audio, rights: { status: 'pending_license', note: '' } })).toBe(false);
  });
});

describe('motor de juego', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('la pregunta de menores es obligatoria antes de configurar la sala', () => {
    const { room } = makeRoom();
    const host = room.addPlayer('Host', '🎧', false).id;
    expect(() => room.act(host, { type: 'finishSetup' })).toThrow(GameError);
  });

  it('un menor activa el Modo Familiar y el servidor bloquea penalizaciones', () => {
    const { room } = makeRoom();
    const host = room.addPlayer('Host', '🎧', false).id;
    room.act(host, { type: 'answerMinors', hasMinors: false });
    room.act(host, { type: 'configure', patch: { modality: 'fiesta' } });
    expect(room.config.familyMode).toBe(false);
    room.addPlayer('Peque', '🦊', true);
    expect(room.config.familyMode).toBe(true);
    expect(room.config.modality).toBe('clasico');
    expect(() => room.act(host, { type: 'configure', patch: { familyMode: false } })).toThrow(/menores/);
    expect(() => room.act(host, { type: 'configure', patch: { modality: 'fiesta' } })).toThrow();
    room.act(host, { type: 'finishSetup' });
    room.act(host, { type: 'startGame' });
    const turnOf = active(room);
    expect(() => room.act(turnOf, { type: 'scan', code: codeFor('baja_volumen') })).toThrow(/Modo Familiar/);
    // Los sorteos virtuales nunca dan penalizaciones.
    for (let i = 0; i < 200; i++) {
      const st = stage(room);
      if (st.type !== 'turn') {
        room.act(room.hostId, { type: 'hostSkip' });
        continue;
      }
      room.act(st.activeId, { type: 'draw' });
      expect(stage(room).card.type).not.toBe('PENALTY');
      room.act(room.hostId, { type: 'hostSkip' });
      if (room.phase !== 'playing') break;
    }
  });

  it('TRACK: puntúa título + artista + rapidez + sin comodines', () => {
    const { room } = setupGame(2);
    const p = active(room);
    room.act(p, { type: 'scan', code: codeFor('track') });
    expect(stage(room).type).toBe('card');
    vi.advanceTimersByTime(2700);
    const st = stage(room);
    expect(st.type).toBe('track');
    const t = st.round.track;
    vi.advanceTimersByTime(3000);
    room.act(p, { type: 'answer', title: t.title.toUpperCase(), artist: t.artist });
    const res = stage(room);
    expect(res.type).toBe('trackResult');
    expect(room.players.get(p)!.score).toBe(SCORING.both + SCORING.fastBonus + SCORING.noWildcardBonus);
  });

  it('el mismo QR no puede puntuar dos veces en la partida', () => {
    const { room } = setupGame(2);
    const p = active(room);
    const code = codeFor('track', 3);
    room.act(p, { type: 'scan', code });
    room.act(room.hostId, { type: 'hostSkip' });
    room.act(room.hostId, { type: 'hostSkip' });
    room.act(room.hostId, { type: 'hostSkip' });
    const q = active(room);
    expect(() => room.act(q, { type: 'scan', code })).toThrow(/ya se jugó/);
    expect(() => room.act(q, { type: 'scan', code: 'ZZZZ-ZZZZ' })).toThrow(/no reconocido/);
  });

  it('solo el jugador en turno (o el anfitrión) puede sacar carta', () => {
    const { room, ids } = setupGame(3);
    const p = active(room);
    const other = ids.find((x) => x !== p && x !== room.hostId);
    if (other) expect(() => room.act(other, { type: 'draw' })).toThrow(/turno/);
  });

  it('LLAMA A TU DJ: el compañero responde, 50% para el jugador y bonus para el DJ', () => {
    const { room } = setupGame(2);
    const p = active(room);
    const partner = room.players.get(p)!.partnerId!;
    room.act(p, { type: 'scan', code: codeFor('track') });
    vi.advanceTimersByTime(2700);
    const t = stage(room).round.track;
    room.act(p, { type: 'useWildcard', wildcard: 'dj' });
    expect(room.players.get(p)!.wildcards.dj).toBe(0);
    expect(() => room.act(p, { type: 'answer', title: t.title })).toThrow(/DJ/);
    room.act(partner, { type: 'answer', title: t.title, artist: t.artist });
    expect(stage(room).type).toBe('trackResult');
    expect(room.players.get(p)!.score).toBe(SCORING.both * SCORING.partnerRatio);
    expect(room.players.get(partner)!.score).toBe(SCORING.partnerHelperBonus);
    expect(() => room.act(p, { type: 'useWildcard', wildcard: 'dj' })).toThrow();
  });

  it('PISTA SECRETA revela una pista y elimina el bonus sin comodines', () => {
    const { room } = setupGame(2);
    const p = active(room);
    room.act(p, { type: 'scan', code: codeFor('track') });
    vi.advanceTimersByTime(2700);
    room.act(p, { type: 'useWildcard', wildcard: 'hint' });
    const view = room.viewFor(p);
    expect(view.stage?.type === 'track' && view.stage.round.hints.length).toBe(1);
    const t = stage(room).round.track;
    vi.advanceTimersByTime(30_000);
    room.act(p, { type: 'answer', title: t.title, artist: t.artist });
    expect(room.players.get(p)!.score).toBe(SCORING.both);
  });

  it('TIEMPO EXTRA añade 20 segundos', () => {
    const { room } = setupGame(2);
    const p = active(room);
    room.act(p, { type: 'scan', code: codeFor('track') });
    vi.advanceTimersByTime(2700);
    const before = stage(room).round.endsAt;
    room.act(p, { type: 'useWildcard', wildcard: 'time' });
    expect(stage(room).round.endsAt - before).toBe(20_000);
  });

  it('las vistas no revelan la canción antes de responder', () => {
    const { room, ids } = setupGame(3);
    const p = active(room);
    room.act(p, { type: 'scan', code: codeFor('track') });
    vi.advanceTimersByTime(2700);
    const t = stage(room).round.track;
    for (const id of ids) {
      const json = JSON.stringify(room.viewFor(id));
      expect(json).not.toContain(t.title);
      expect(json).not.toContain(t.id);
    }
  });

  it('votación secreta: un voto por persona, sin autovoto, revelación sincronizada', () => {
    const { room, ids } = setupGame(4);
    const p = active(room);
    room.act(p, { type: 'scan', code: codeFor('dance_battle') });
    const rival = ids.find((x) => x !== p)!;
    room.act(p, { type: 'chooseTarget', targetId: rival });
    expect(stage(room).type).toBe('perform');
    room.act(p, { type: 'endPerformance' });
    expect(stage(room).type).toBe('vote');
    const voters = ids.filter((x) => x !== p && x !== rival);
    expect(() => room.act(p, { type: 'vote', forId: p })).toThrow(/no votan/);
    room.act(voters[0], { type: 'vote', forId: p });
    expect(() => room.act(voters[0], { type: 'vote', forId: rival })).toThrow(/Ya votaste/);
    // La vista no muestra a quién votó cada uno.
    const v = room.viewFor(voters[1]);
    expect(JSON.stringify(v.stage)).not.toContain(voters[0]);
    room.act(voters[1], { type: 'vote', forId: p });
    const st = stage(room);
    expect(st.type).toBe('reveal');
    const early = room.viewFor(p).stage as any;
    expect(early.outcome).toBeNull();
    const scoreBefore = room.players.get(p)!.score;
    vi.advanceTimersByTime(st.revealAt - Date.now() - SCORING.outcomeLeadMs + 10);
    expect((room.viewFor(p).stage as any).outcome[p]).toBe('green');
    expect(room.players.get(p)!.score).toBe(scoreBefore);
    vi.advanceTimersByTime(SCORING.outcomeLeadMs);
    expect(room.players.get(p)!.score).toBe(scoreBefore + SCORING.greenPoints);
    expect(room.players.get(p)!.greens).toBe(1);
    expect(room.players.get(rival)!.reds).toBe(1);
  });

  it('empate en votación: tarjetas amarillas', () => {
    const { room, ids } = setupGame(4);
    const p = active(room);
    room.act(p, { type: 'scan', code: codeFor('beatbox') });
    const rival = ids.find((x) => x !== p)!;
    room.act(p, { type: 'chooseTarget', targetId: rival });
    room.act(p, { type: 'endPerformance' });
    const voters = ids.filter((x) => x !== p && x !== rival);
    room.act(voters[0], { type: 'vote', forId: p });
    room.act(voters[1], { type: 'vote', forId: rival });
    vi.advanceTimersByTime(10_000);
    expect(room.players.get(p)!.yellows).toBe(1);
    expect(room.players.get(rival)!.yellows).toBe(1);
  });

  it('DJ PROTEGIDO bloquea la siguiente penalización (adultos)', () => {
    const { room } = setupGame(2);
    const p = active(room);
    room.act(p, { type: 'scan', code: codeFor('dj_protegido') });
    room.act(p, { type: 'continue' });
    // vuelve a tocarle a p tras el turno del otro
    room.act(active(room), { type: 'scan', code: codeFor('bonus_pista') });
    room.act(room.hostId, { type: 'continue' });
    expect(active(room)).toBe(p);
    room.act(p, { type: 'scan', code: codeFor('baja_volumen') });
    expect(stage(room).effectText).toMatch(/PROTEGIDO/);
  });

  it('Modo Fiesta: la penalización ofrece una alternativa de brindis voluntaria', () => {
    const { room } = setupGame(2, { modality: 'fiesta' });
    const p = active(room);
    room.act(p, { type: 'scan', code: codeFor('brindis_cabina') });
    room.act(p, { type: 'continue' });
    const st = stage(room);
    expect(st.type).toBe('penalty');
    expect(st.options.map((o: any) => o.id)).toEqual(['points', 'toast']);
    expect(st.options[1].detail).toMatch(/agua/);
  });

  it('los puntos nunca bajan de cero', () => {
    const { room } = setupGame(2);
    const p = active(room);
    room.act(p, { type: 'scan', code: codeFor('baja_volumen') });
    room.act(p, { type: 'continue' });
    expect(room.players.get(p)!.score).toBe(0);
  });

  it('los comodines no se acumulan sin límite', () => {
    const { room } = setupGame(2);
    const p = active(room);
    room.act(p, { type: 'scan', code: codeFor('vida_extra') });
    expect(room.players.get(p)!.wildcards).toEqual({ dj: 1, time: 1, hint: 1 });
    expect(room.players.get(p)!.score).toBe(100);
  });

  it('desconexión del anfitrión: se transfiere el control', () => {
    const { room, ids } = setupGame(3);
    const host = room.hostId;
    room.setConnected(host, false);
    vi.advanceTimersByTime(SCORING.hostGraceSec * 1000 + 100);
    expect(room.hostId).not.toBe(host);
    expect(ids).toContain(room.hostId);
  });

  it('cada canción de una secuencia (RAVE) tiene su audio disponible', () => {
    const { room, ids, audioTokens } = setupGame(3);
    const p = active(room);
    room.act(p, { type: 'scan', code: codeFor('rave_relampago') });
    room.act(p, { type: 'continue' });
    for (let i = 1; i <= 3; i++) {
      const r = stage(room).round;
      expect(r.sequence.index).toBe(i);
      expect(audioTokens.has(r.audioToken)).toBe(true);
      for (const id of ids) room.act(id, { type: 'answer', title: 'x' });
      expect(stage(room).type).toBe('trackResult');
      room.act(room.hostId, { type: 'continue' });
    }
    expect(audioTokens.size).toBe(0);
  });

  it('la clasificación se oculta durante el Último Drop', () => {
    const { room } = setupGame(2);
    let guard = 0;
    while (room.phase === 'playing' && guard++ < 50) room.act(room.hostId, { type: 'hostSkip' });
    expect(room.phase).toBe('final');
    expect(room.viewFor(room.hostId).leaderboardHidden).toBe(true);
  });

  for (const seed of [1, 2, 3, 4, 5, 6]) {
    it(`simulación completa de partida sin bloqueos (semilla ${seed})`, () => {
      const players = 2 + (seed % 4);
      const { room, ids } = setupGame(players, { modality: seed % 2 ? 'fiesta' : 'clasico' });
      const rand = seeded(seed * 97);
      let steps = 0;
      while (room.phase !== 'ended' && steps++ < 3000) {
        const st = stage(room);
        const tryAct = (id: string, a: ClientAction) => {
          try {
            room.act(id, a);
          } catch (e) {
            if (!(e instanceof GameError)) throw e;
          }
        };
        if (!st) break;
        switch (st.type) {
          case 'turn':
            tryAct(st.activeId, { type: 'draw' });
            break;
          case 'card':
            if (st.awaiting === 'target') tryAct(st.drawnBy, { type: 'chooseTarget', targetId: st.targetOptions[0] });
            else vi.advanceTimersByTime(7000);
            break;
          case 'track': {
            const r = st.round;
            if (rand() < 0.3 && r.kind === 'solo') tryAct(r.ownerId, { type: 'useWildcard', wildcard: (['dj', 'time', 'hint'] as const)[Math.floor(rand() * 3)] });
            for (const id of [...r.participants, r.dj?.partnerId, r.coAnswerer].filter(Boolean) as string[]) {
              const good = rand() < 0.6;
              if (r.quiz) tryAct(id, { type: 'answer', choice: good ? r.quiz.correct : (r.quiz.correct + 1) % 4 });
              else tryAct(id, { type: 'answer', title: good ? r.track.title : 'nada', artist: good ? r.track.artist : 'nadie', year: r.track.year });
            }
            vi.advanceTimersByTime(rand() < 0.5 ? 500 : 61_000);
            break;
          }
          case 'perform':
            vi.advanceTimersByTime(60_000);
            break;
          case 'vote':
            for (const id of st.eligible) tryAct(id, st.voteKind === 'duel' ? { type: 'vote', forId: st.competitors[Math.floor(rand() * 2)] } : { type: 'vote', forId: null, approve: rand() < 0.5 });
            vi.advanceTimersByTime(1000);
            break;
          case 'penalty':
            tryAct(st.chooserId, { type: 'penaltyChoice', optionId: st.options[0].id });
            break;
          default:
            vi.advanceTimersByTime(10_000);
        }
      }
      expect(room.phase).toBe('ended');
      expect(room.titles[0].key).toBe('master');
      for (const id of ids) expect(room.players.get(id)!.score).toBeGreaterThanOrEqual(0);
      for (const id of ids) {
        const w = room.players.get(id)!.wildcards;
        expect(Math.max(w.dj, w.time, w.hint)).toBeLessThanOrEqual(SCORING.maxWildcardPerType);
      }
    });
  }
});
