import { describe, expect, it } from 'vitest';
import { evaluateGaps } from '../src/domain/gaps';
import { after, M, ok, refused } from './helpers';

const task = (id: string, zoneId = 'Z-SUP') => ({ type: 'CREATE_TASK' as const, taskId: id, title: { ar: id, en: id }, zoneId, requiredQuals: [] });

describe('double allocation is prevented', () => {
  it('refuses allocating a resource already used by another active task', () => {
    let s = after('s19'); // TK-02 allocated to T-2
    s = ok(s, M, task('T-X', 'Z-CCP'));
    expect(refused(s, M, { type: 'ALLOCATE_RESOURCE', taskId: 'T-X', resourceId: 'TK-02' })).toBe('DOUBLE_ALLOCATION');
  });

  it('refuses allocating the same resource twice to one task', () => {
    expect(refused(after('s19'), M, { type: 'ALLOCATE_RESOURCE', taskId: 'T-2', resourceId: 'TK-02' })).toBe('PRECONDITION');
  });

  it('refuses assigning a responder who already holds an active task', () => {
    let s = after('s19');
    s = ok(s, M, task('T-X'));
    expect(refused(s, M, { type: 'ASSIGN_TASK', taskId: 'T-X', responderId: 'R-sara' })).toBe('DOUBLE_ALLOCATION');
  });

  it('frees a resource when its task is closed, so it can be reused', () => {
    let s = after('s19');
    s = ok(s, M, { type: 'CLOSE_TASK', taskId: 'T-2' });
    s = ok(s, M, task('T-X', 'Z-CCP'));
    s = ok(s, M, { type: 'ALLOCATE_RESOURCE', taskId: 'T-X', resourceId: 'TK-02' });
    expect(s.incident!.tasks.find((t) => t.id === 'T-X')!.resourceIds).toEqual(['TK-02']);
  });

  it('refuses allocating a resource that is not ready', () => {
    let s = after('s12');
    s = ok(s, M, task('T-X'));
    expect(refused(s, M, { type: 'ALLOCATE_RESOURCE', taskId: 'T-X', resourceId: 'BC-02' })).toBe('RESOURCE_NOT_READY');
  });

  it('the gap engine still detects double allocation in imported/corrupted data', () => {
    const s = after('s19');
    s.incident!.tasks.find((t) => t.id === 'T-1')!.resourceIds.push('TK-02');
    const a = evaluateGaps(s).find((x) => x.id === 'DOUBLE_ALLOCATION:TK-02');
    expect(a?.severity).toBe('critical');
    expect(a?.suggestion?.commands[0]).toMatchObject({ type: 'RELEASE_RESOURCE', resourceId: 'TK-02' });
  });
});
