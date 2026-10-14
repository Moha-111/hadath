// Shared, explainable predicates used by both the engine (hard checks) and the
// gap engine (alerts). These are plain rules, not a learned model.
import type { Incident, QualCode, Resource, Responder, Task, WorldState, ZoneKind } from './types';
import { daysBetween } from './time';

export const ZONE_RANK: Record<ZoneKind, number> = { cold: 0, warm: 1, hot: 2 };

/** Equipment inspection older than this is considered stale. */
export const EQUIPMENT_STALE_DAYS = 90;
/** Partner capability readiness older than this is considered stale. */
export const CAPABILITY_STALE_DAYS = 30;
/** An assigned task not accepted within this many simulated minutes raises an alert. */
export const ACCEPT_TIMEOUT_MIN = 3;

export const ACTIVE_TASK = (t: Task) => t.status !== 'closed';
export const WORKING_TASK = (t: Task) => t.status === 'assigned' || t.status === 'accepted' || t.status === 'in_progress';

export function validQuals(r: Responder, now: string): QualCode[] {
  return r.qualifications.filter((q) => q.expiresAt > now && q.issuedAt <= now).map((q) => q.code);
}

export function missingQuals(r: Responder, required: QualCode[], now: string): QualCode[] {
  const have = validQuals(r, now);
  return required.filter((q) => !have.includes(q));
}

export function hasClearance(r: Responder, zone: ZoneKind): boolean {
  return ZONE_RANK[r.clearance] >= ZONE_RANK[zone];
}

export function tasksUsingResource(incident: Incident | undefined, resourceId: string): Task[] {
  return (incident?.tasks ?? []).filter((t) => ACTIVE_TASK(t) && t.resourceIds.includes(resourceId));
}

export function workingTasksOf(incident: Incident | undefined, responderId: string): Task[] {
  return (incident?.tasks ?? []).filter((t) => WORKING_TASK(t) && t.assignee?.type === 'responder' && t.assignee.id === responderId);
}

export function isEquipmentStale(r: Resource, now: string): boolean {
  return daysBetween(r.lastCheckedAt, now) > EQUIPMENT_STALE_DAYS;
}

export interface Eligibility {
  responder: Responder;
  eligible: boolean;
  reasons: ('unavailable' | 'clearance' | 'busy' | 'missing_quals')[];
  missing: QualCode[];
}

/** Explain whether a responder may take a task. Used for the assignment picker and for suggestions. */
export function eligibility(state: WorldState, task: Task, r: Responder): Eligibility {
  const zone = state.incident?.zones.find((z) => z.id === task.zoneId);
  const reasons: Eligibility['reasons'] = [];
  if (!r.available) reasons.push('unavailable');
  if (zone && !hasClearance(r, zone.kind)) reasons.push('clearance');
  if (workingTasksOf(state.incident, r.id).some((t) => t.id !== task.id)) reasons.push('busy');
  const missing = missingQuals(r, task.requiredQuals, state.now);
  if (missing.length) reasons.push('missing_quals');
  return { responder: r, eligible: reasons.length === 0, reasons, missing };
}

export function eligibleResponders(state: WorldState, task: Task, excludeId?: string): Responder[] {
  return state.responders.filter((r) => r.id !== excludeId && eligibility(state, task, r).eligible);
}

const dist = (a: { x: number; y: number }, b: { x: number; y: number }) => Math.hypot(a.x - b.x, a.y - b.y);

/** Nearest ready, unallocated resource of the same kind; ties broken by id for determinism. */
export function alternativeResource(state: WorldState, failed: Resource): Resource | undefined {
  return state.resources
    .filter((r) => r.kind === failed.kind && r.id !== failed.id && r.status === 'ready' && !isEquipmentStale(r, state.now))
    .filter((r) => tasksUsingResource(state.incident, r.id).length === 0)
    .sort((a, b) => dist(a.pos, failed.pos) - dist(b.pos, failed.pos) || a.id.localeCompare(b.id))[0];
}
