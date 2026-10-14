import { describe, expect, it } from 'vitest';
import { goOffline, initialSync, queue, reconnect, visibleState } from '../src/domain/sync';
import { after, M, ok } from './helpers';

describe('connectivity loss', () => {
  it('shows the frozen snapshot as stale with its last-sync time, never as live', () => {
    const live = after('s19');
    let sync = goOffline(initialSync(live), live);
    const live2 = ok(live, M, { type: 'ADVANCE_CLOCK', minutes: 10 });
    const v = visibleState(sync, live2);
    expect(v.stale).toBe(true);
    expect(v.state.now).toBe(sync.lastSyncAt);
    expect(v.state.now).not.toBe(live2.now);
    sync = queue(sync, { role: 'responder', id: 'R-khaled' }, { type: 'ACCEPT_TASK', taskId: 'T-2' });
    const r = reconnect(sync, live2);
    expect(r.refused).toEqual([]);
    expect(r.state.incident!.tasks.find((t) => t.id === 'T-2')!.status).toBe('accepted');
    expect(visibleState(r.sync, r.state).stale).toBe(false);
  });

  it('reports queued actions refused after reconnect instead of applying them', () => {
    const live = after('s20');
    let sync = goOffline(initialSync(live), live);
    sync = queue(sync, { role: 'responder', id: 'R-khaled' }, { type: 'ACCEPT_TASK', taskId: 'T-2' }); // already accepted
    expect(reconnect(sync, live).refused[0].code).toBe('INVALID_STATE');
  });
});
