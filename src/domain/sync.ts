// Connectivity model. When the link is lost, views freeze on the last synced
// snapshot and are labelled as stale; new actions queue in an outbox and are
// replayed through the same engine on reconnect (and may be refused then).
import type { Actor, Command } from './commands';
import { apply, type Refusal } from './engine';
import type { WorldState } from './types';

export interface SyncState {
  online: boolean;
  lastSyncAt: string; // simulated time of last successful sync
  snapshot?: WorldState; // what the user sees while offline
  outbox: { actor: Actor; cmd: Command }[];
}

export const initialSync = (s: WorldState): SyncState => ({ online: true, lastSyncAt: s.now, outbox: [] });

export function goOffline(sync: SyncState, live: WorldState): SyncState {
  return { ...sync, online: false, lastSyncAt: live.now, snapshot: live };
}

export function queue(sync: SyncState, actor: Actor, cmd: Command): SyncState {
  return { ...sync, outbox: [...sync.outbox, { actor, cmd }] };
}

/** Replays queued commands in order. Refused ones are reported, never silently applied. */
export function reconnect(sync: SyncState, live: WorldState): { sync: SyncState; state: WorldState; refused: Refusal[] } {
  let state = live;
  const refused: Refusal[] = [];
  for (const { actor, cmd } of sync.outbox) {
    const r = apply(state, actor, cmd);
    if (r.ok) state = r.state;
    else refused.push(r.error);
  }
  return { sync: { online: true, lastSyncAt: state.now, outbox: [] }, state, refused };
}

/** The state a user should see right now, and whether it is stale. */
export function visibleState(sync: SyncState, live: WorldState): { state: WorldState; stale: boolean } {
  return sync.online || !sync.snapshot ? { state: live, stale: false } : { state: sync.snapshot, stale: true };
}
