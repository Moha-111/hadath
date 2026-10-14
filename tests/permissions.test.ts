import { describe, expect, it } from 'vitest';
import { PERMISSIONS } from '../src/domain/commands';
import { citizenView, partnerView, responderView } from '../src/domain/views';
import { after, ok, refused } from './helpers';

describe('role permissions', () => {
  it('a citizen cannot create tasks, approve support or see operations', () => {
    const s = after('s12');
    expect(refused(s, { role: 'citizen' }, { type: 'CREATE_TASK', taskId: 'X', title: { ar: 'x', en: 'x' }, zoneId: 'Z-SUP', requiredQuals: [] })).toBe('FORBIDDEN');
    expect(refused(s, { role: 'citizen' }, { type: 'DECIDE_SUPPORT', requestId: 'SR-1', approve: true })).toBe('FORBIDDEN');
  });

  it('a partner cannot approve its own support request', () => {
    const s = after('s21');
    expect(refused(s, { role: 'partner', id: 'p-transport' }, { type: 'DECIDE_SUPPORT', requestId: 'SR-1', approve: true, capabilityId: 'CAP-T1' })).toBe('FORBIDDEN');
  });

  it('only the targeted partner may accept an activation', () => {
    const s = after('s22');
    expect(refused(s, { role: 'partner', id: 'p-supply' }, { type: 'ACCEPT_ACTIVATION', requestId: 'SR-1' })).toBe('NOT_OWNER');
    ok(s, { role: 'partner', id: 'p-transport' }, { type: 'ACCEPT_ACTIVATION', requestId: 'SR-1' });
  });

  it('a partner cannot change another partner’s capability', () => {
    expect(refused(after('s03'), { role: 'partner', id: 'p-comms' }, { type: 'UPDATE_CAPABILITY_READINESS', capabilityId: 'CAP-T1', readiness: 'not_ready' })).toBe('NOT_OWNER');
  });

  it('a responder can only accept tasks assigned to them', () => {
    const s = after('s15');
    expect(refused(s, { role: 'responder', id: 'R-khaled' }, { type: 'ACCEPT_TASK', taskId: 'T-1' })).toBe('NOT_OWNER');
  });

  it('a responder cannot assign tasks', () => {
    expect(refused(after('s13'), { role: 'responder', id: 'R-sara' }, { type: 'ASSIGN_TASK', taskId: 'T-1', responderId: 'R-sara' })).toBe('FORBIDDEN');
  });

  it('suggestions are approved only by the incident manager', () => {
    const s = after('s25');
    expect(refused(s, { role: 'readiness' }, { type: 'APPROVE_SUGGESTION', alertId: 'RESOURCE_NOT_READY:TK-02:T-2' })).toBe('FORBIDDEN');
    expect(PERMISSIONS.manager).toContain('APPROVE_SUGGESTION');
  });

  it('community responders are never assigned to the hot zone, even when opened', () => {
    let s = after('s12');
    s = ok(s, { role: 'manager' }, { type: 'SET_ZONE_ALLOWED', zoneId: 'Z-HOT', allowed: true });
    s = ok(s, { role: 'manager' }, { type: 'CREATE_TASK', taskId: 'T-H', title: { ar: 'x', en: 'x' }, zoneId: 'Z-HOT', requiredQuals: [] });
    expect(refused(s, { role: 'manager' }, { type: 'ASSIGN_TASK', taskId: 'T-H', responderId: 'R-noura' })).toBe('CLEARANCE');
  });

  it('no assignment into a zone the manager has not opened', () => {
    let s = after('s12');
    s = ok(s, { role: 'manager' }, { type: 'CREATE_TASK', taskId: 'T-S', title: { ar: 'x', en: 'x' }, zoneId: 'Z-STG', requiredQuals: [] });
    expect(refused(s, { role: 'manager' }, { type: 'ASSIGN_TASK', taskId: 'T-S', responderId: 'R-noura' })).toBe('ZONE_NOT_ALLOWED');
  });
});

describe('role projections expose only what each role needs', () => {
  const s = after('s27');

  it('citizen view contains no tasks, responders, support requests, decisions or zones', () => {
    const json = JSON.stringify(citizenView(s));
    for (const forbidden of ['"R-sara"', '"R-khaled"', '"T-1"', '"SR-1"', '"Z-CCP"', '"TK-02"', '"AMB-1"', '"BUS-1"', 'decisions', 'Sara', 'Khaled']) {
      expect(json).not.toContain(forbidden);
    }
    expect(citizenView(s).directives.length).toBe(1);
  });

  it('responder view lists only own tasks', () => {
    const v = responderView(s, 'R-sara')!;
    expect(v.tasks.map((t) => t.id)).toEqual(['T-1']);
  });

  it('partner view lists only approved requests for its own capabilities', () => {
    expect(partnerView(s, 'p-transport').requests.map((r) => r.id)).toEqual(['SR-1']);
    expect(partnerView(s, 'p-supply').requests).toEqual([]);
  });
});
