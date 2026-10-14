import { describe, expect, it } from 'vitest';
import { createSeed } from '../src/domain/seed';
import { after, ok, refused } from './helpers';

describe('citizen actions edge cases', () => {
  it('sanitizes directive acknowledgement count to a positive integer', () => {
    let s = after('s27');
    s = ok(s, { role: 'citizen' }, { type: 'ACK_DIRECTIVE', directiveId: 'DIR-1', count: -5 });
    expect(s.directives.find((d) => d.id === 'DIR-1')!.acknowledgements).toBe(1);

    s = ok(s, { role: 'citizen' }, { type: 'ACK_DIRECTIVE', directiveId: 'DIR-1', count: 2.9 });
    expect(s.directives.find((d) => d.id === 'DIR-1')!.acknowledgements).toBe(3);
  });

  it('refuses exercise registration when public seats are full', () => {
    const s = createSeed();
    s.exercises.find((x) => x.id === 'EX-2')!.publicRegistered = 59;

    const s2 = ok(s, { role: 'citizen' }, { type: 'REGISTER_EXERCISE', exerciseId: 'EX-2' });
    expect(s2.exercises.find((x) => x.id === 'EX-2')!.publicRegistered).toBe(60);
    expect(refused(s2, { role: 'citizen' }, { type: 'REGISTER_EXERCISE', exerciseId: 'EX-2' })).toBe('PRECONDITION');
  });
});
