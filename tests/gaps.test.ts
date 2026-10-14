import { describe, expect, it } from 'vitest';
import { evaluateGaps, RULE_DOCS } from '../src/domain/gaps';
import { createSeed } from '../src/domain/seed';
import { after, M, ok, refused } from './helpers';

const ids = (s: Parameters<typeof evaluateGaps>[0]) => evaluateGaps(s).map((a) => a.id);

describe('gap engine rules (transparent, rule-based)', () => {
  it('every rule is documented in plain language', () => {
    for (const doc of Object.values(RULE_DOCS)) expect(doc.ar.length).toBeGreaterThan(10);
  });

  it('flags stale equipment and stale partner readiness before the incident', () => {
    expect(ids(createSeed())).toEqual(expect.arrayContaining(['STALE_INFORMATION:AED-02', 'STALE_INFORMATION:CAP-L1', 'RESOURCE_NOT_READY:BC-02']));
    expect(ids(after('s01'))).not.toContain('STALE_INFORMATION:AED-02');
  });

  it('flags a task not accepted within the time limit, with a qualified alternative', () => {
    let s = after('s19');
    s = ok(s, M, { type: 'ADVANCE_CLOCK', minutes: 5 });
    const a = evaluateGaps(s).find((x) => x.id === 'TASK_NOT_ACCEPTED:T-2');
    expect(a).toBeDefined();
    expect(a!.evidence.map((e) => e.value)).toContain('R-khaled');
  });

  it('flags a declined task', () => {
    let s = after('s19');
    s = ok(s, { role: 'responder', id: 'R-khaled' }, { type: 'DECLINE_TASK', taskId: 'T-2' });
    expect(ids(s)).toContain('TASK_NOT_ACCEPTED:T-2');
  });

  it('flags an allocated resource that fails and proposes the nearest ready alternative for approval', () => {
    const s = after('s25');
    const a = evaluateGaps(s).find((x) => x.id === 'RESOURCE_NOT_READY:TK-02:T-2')!;
    expect(a.severity).toBe('critical');
    expect(a.suggestion!.commands).toEqual([
      { type: 'RELEASE_RESOURCE', taskId: 'T-2', resourceId: 'TK-02' },
      { type: 'ALLOCATE_RESOURCE', taskId: 'T-2', resourceId: 'TK-03' },
    ]);
    // Nothing changes until the manager approves.
    expect(s.incident!.tasks.find((t) => t.id === 'T-2')!.resourceIds).toEqual(['TK-02']);
    const s2 = ok(s, M, { type: 'APPROVE_SUGGESTION', alertId: a.id });
    expect(s2.incident!.tasks.find((t) => t.id === 'T-2')!.resourceIds).toEqual(['TK-03']);
    expect(s2.incident!.decisions.at(-1)!.basedOnAlertId).toBe(a.id);
  });

  it('flags qualification mismatch (expired first-aid) when the manager overrides', () => {
    let s = after('s12');
    s = ok(s, M, { type: 'CREATE_TASK', taskId: 'T-X', title: { ar: 'x', en: 'x' }, zoneId: 'Z-SUP', requiredQuals: ['first_aid'] });
    expect(refused(s, M, { type: 'ASSIGN_TASK', taskId: 'T-X', responderId: 'R-fahd' })).toBe('QUALIFICATION_MISMATCH');
    s = ok(s, M, { type: 'ASSIGN_TASK', taskId: 'T-X', responderId: 'R-fahd', acknowledgeMismatch: true });
    const a = evaluateGaps(s).find((x) => x.id === 'QUALIFICATION_MISMATCH:T-X')!;
    expect(a.reason.en).toContain('first_aid');
    expect(a.suggestion!.commands[0]).toMatchObject({ type: 'ASSIGN_TASK', responderId: 'R-sara' });
  });

  it('flags need exceeding ready capacity, with the numbers it used', () => {
    const a = evaluateGaps(after('s12')).find((x) => x.id === 'DEMAND_EXCEEDS_CAPACITY:transport')!;
    expect(a.evidence.map((e) => e.value)).toEqual(['120', '80', 'CAP-T1']);
  });

  it('approval executes only the engine’s own suggestion', () => {
    const s = after('s25');
    expect(refused(s, M, { type: 'APPROVE_SUGGESTION', alertId: 'NOT_A_REAL_ALERT' })).toBe('NOT_FOUND');
  });

  it('never auto-assigns: evaluating gaps does not change state', () => {
    const s = after('s26');
    const before = JSON.stringify(s);
    evaluateGaps(s);
    expect(JSON.stringify(s)).toBe(before);
  });
});
