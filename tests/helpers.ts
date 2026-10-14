import type { Actor, Command } from '../src/domain/commands';
import { apply } from '../src/domain/engine';
import type { WorldState } from '../src/domain/types';
import { SCENARIO, runScenario } from '../src/domain/scenario';

export const M: Actor = { role: 'manager' };

/** Apply and assert success. */
export function ok(s: WorldState, actor: Actor, cmd: Command): WorldState {
  const r = apply(s, actor, cmd);
  if (!r.ok) throw new Error(`expected ok, got ${r.error.code}: ${r.error.message.en}`);
  return r.state;
}

/** Apply and return the refusal code (throws if accepted). */
export function refused(s: WorldState, actor: Actor, cmd: Command): string {
  const r = apply(s, actor, cmd);
  if (r.ok) throw new Error(`expected refusal for ${cmd.type}`);
  return r.error.code;
}

/** State right after the step with the given id. */
export const after = (id: string) => runScenario(SCENARIO.findIndex((x) => x.id === id));
export const stepIndex = (id: string) => SCENARIO.findIndex((x) => x.id === id);
