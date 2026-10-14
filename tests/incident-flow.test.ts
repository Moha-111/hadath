import { describe, expect, it } from 'vitest';
import { SCENARIO, runScenario, PHASES } from '../src/domain/scenario';
import { createSeed } from '../src/domain/seed';
import { M, ok, refused } from './helpers';

describe('incident lifecycle (readiness → recovery)', () => {
  it('runs the full synthetic scenario without any refusal and closes the incident', () => {
    const s = runScenario();
    expect(s.incident?.status).toBe('closed');
    expect(s.incident?.tasks.every((t) => t.status === 'closed')).toBe(true);
    expect(s.incident?.recovery?.improvements[0].owner.ar).toContain('مسؤول');
  });

  it('covers all seven story phases in order', () => {
    const seen = [...new Set(SCENARIO.map((x) => x.phase))];
    expect(seen).toEqual(PHASES.map((p) => p.id));
  });

  it('is deterministic: two replays produce identical state', () => {
    expect(JSON.stringify(runScenario())).toEqual(JSON.stringify(runScenario()));
  });

  it('keeps everyone on ONE incident file: partner work appears as a task in the same file', () => {
    const s = runScenario(SCENARIO.findIndex((x) => x.id === 's23'));
    expect(s.incident?.tasks.map((t) => t.id)).toEqual(['T-1', 'T-2', 'T-SR-1']);
    expect(s.incident?.tasks.find((t) => t.id === 'T-SR-1')?.assignee).toEqual({ type: 'partner', id: 'p-transport' });
  });

  it('refuses to create an incident from an unverified report', () => {
    let s = createSeed();
    s = ok(s, { role: 'citizen' }, { type: 'SUBMIT_REPORT', reportId: 'R', text: { ar: 'x', en: 'x' }, locationHint: { ar: 'x', en: 'x' } });
    expect(refused(s, M, { type: 'CREATE_INCIDENT', incidentId: 'I', fromReportId: 'R', title: { ar: 'x', en: 'x' }, situation: { ar: 'x', en: 'x' } })).toBe('PRECONDITION');
  });

  it('cannot close the incident before tasks are closed, a report exists and an improvement has an owner', () => {
    const s = runScenario(SCENARIO.findIndex((x) => x.id === 's34'));
    expect(refused(s, M, { type: 'CLOSE_INCIDENT' })).toBe('PRECONDITION');
  });

  it('computes report metrics only from the simulation log', () => {
    const s = runScenario();
    const m = Object.fromEntries(s.incident!.recovery!.report!.metrics.map((x) => [x.id, x.value]));
    expect(m.report_to_verify).toBe(1);
    expect(m.report_to_file).toBe(2);
    expect(m.failover).toBe(1);
    expect(m.tasks_closed).toBe(100);
    expect(m.directive_acks).toBe(42);
  });
});
