import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import type { Actor, Command } from '../domain/commands';
import { apply, type Refusal } from '../domain/engine';
import { SCENARIO } from '../domain/scenario';
import { createSeed } from '../domain/seed';
import { goOffline, initialSync, queue, reconnect, visibleState, type SyncState } from '../domain/sync';
import type { L, WorldState } from '../domain/types';

export interface Toast { id: number; kind: 'ok' | 'error' | 'info'; text: L }

interface Store {
  /** What the current user sees (frozen snapshot while offline). */
  state: WorldState;
  live: WorldState;
  stale: boolean;
  sync: SyncState;
  dispatch: (actor: Actor, cmd: Command) => boolean;
  setOnline: (online: boolean) => void;
  toasts: Toast[];
  scenarioIndex: number; // next step to run
  runNext: () => void;
  runTo: (stepId: string) => void;
  reset: () => void;
}

const Ctx = createContext<Store | null>(null);
export const useStore = () => {
  const s = useContext(Ctx);
  if (!s) throw new Error('StoreProvider missing');
  return s;
};

let toastSeq = 0;

export function StoreProvider({ children }: { children: ReactNode }) {
  const [live, setLive] = useState<WorldState>(() => createSeed());
  const [sync, setSync] = useState<SyncState>(() => initialSync(createSeed()));
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [scenarioIndex, setScenarioIndex] = useState(0);

  const toast = useCallback((kind: Toast['kind'], text: L) => {
    const id = ++toastSeq;
    setToasts((t) => [...t.slice(-3), { id, kind, text }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4200);
  }, []);

  const report = useCallback((e: Refusal) => toast('error', e.message), [toast]);

  const dispatch = useCallback((actor: Actor, cmd: Command): boolean => {
    if (!sync.online) {
      setSync((s) => queue(s, actor, cmd));
      toast('info', { ar: 'لا اتصال: حُفظ الإجراء محليًا وسيُرسل عند عودة الاتصال.', en: 'Offline: action queued locally and will be sent on reconnect.' });
      return true;
    }
    const r = apply(live, actor, cmd);
    if (!r.ok) { report(r.error); return false; }
    setLive(r.state);
    // Keep the scenario pointer in sync when a user performs the next scripted step by hand.
    const next = SCENARIO[scenarioIndex];
    if (next && next.cmd.type === cmd.type && JSON.stringify(next.cmd) === JSON.stringify(cmd)) setScenarioIndex((i) => i + 1);
    return true;
  }, [live, sync.online, scenarioIndex, toast, report]);

  const setOnline = useCallback((online: boolean) => {
    if (online === sync.online) return;
    if (!online) { setSync(goOffline(sync, live)); return; }
    const r = reconnect(sync, live);
    setLive(r.state);
    setSync(r.sync);
    r.refused.forEach(report);
    toast('ok', { ar: 'عاد الاتصال وتمت المزامنة.', en: 'Back online; synced.' });
  }, [sync, live, toast, report]);

  const runSteps = useCallback((from: WorldState, start: number, end: number) => {
    let s = from;
    let i = start;
    for (; i <= end && i < SCENARIO.length; i++) {
      const step = SCENARIO[i];
      const r = apply(s, step.actor, step.cmd);
      if (!r.ok) { report(r.error); break; }
      s = r.state;
    }
    setLive(s);
    setScenarioIndex(i);
  }, [report]);

  const runNext = useCallback(() => runSteps(live, scenarioIndex, scenarioIndex), [live, scenarioIndex, runSteps]);
  const runTo = useCallback((stepId: string) => {
    const idx = SCENARIO.findIndex((x) => x.id === stepId);
    if (idx >= scenarioIndex) runSteps(live, scenarioIndex, idx);
  }, [live, scenarioIndex, runSteps]);
  const reset = useCallback(() => {
    const s = createSeed();
    setLive(s); setSync(initialSync(s)); setScenarioIndex(0);
  }, []);

  const value = useMemo<Store>(() => {
    const v = visibleState(sync, live);
    return { state: v.state, stale: v.stale, live, sync, dispatch, setOnline, toasts, scenarioIndex, runNext, runTo, reset };
  }, [sync, live, dispatch, setOnline, toasts, scenarioIndex, runNext, runTo, reset]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
