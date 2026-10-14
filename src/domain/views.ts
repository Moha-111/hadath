// Role projections over the single incident file. The UI renders ONLY these
// projections, so a role never receives fields it is not entitled to.
import type { Alert } from './gaps';
import { evaluateGaps } from './gaps';
import { eligibility, validQuals } from './rules';
import type { Incident, PartnerCapability, Resource, Responder, Task, WorldState } from './types';

export interface CitizenView {
  incident?: { title: Incident['title']; status: Incident['status']; since: string };
  directives: WorldState['directives'];
  publicAssets: Pick<Resource, 'id' | 'kind' | 'name' | 'status' | 'access' | 'pos'>[];
  courses: WorldState['courses'];
  exercises: Pick<WorldState['exercises'][number], 'id' | 'title' | 'at' | 'publicSeats' | 'publicRegistered'>[];
  myReports: Pick<WorldState['reports'][number], 'id' | 'at' | 'status' | 'locationHint'>[];
}

export function citizenView(s: WorldState): CitizenView {
  const inc = s.incident;
  return {
    incident: inc ? { title: inc.title, status: inc.status, since: inc.createdAt } : undefined,
    directives: s.directives,
    // Only publicly accessible life-saving equipment, never operational resources.
    publicAssets: s.resources
      .filter((r) => r.kind === 'aed' || r.kind === 'bleeding_kit')
      .map(({ id, kind, name, status, access, pos }) => ({ id, kind, name, status, access, pos })),
    courses: s.courses.filter((c) => c.publicOpen),
    exercises: s.exercises.filter((e) => e.publicSeats > 0).map(({ id, title, at, publicSeats, publicRegistered }) => ({ id, title, at, publicSeats, publicRegistered })),
    myReports: s.reports.map(({ id, at, status, locationHint }) => ({ id, at, status, locationHint })),
  };
}

export interface ResponderView {
  me: Responder;
  validQuals: string[];
  tasks: (Task & { zoneName?: Incident['zones'][number]['name']; zoneKind?: string; resources: Resource[] })[];
  incident?: { title: Incident['title']; status: Incident['status'] };
}

export function responderView(s: WorldState, responderId: string): ResponderView | undefined {
  const me = s.responders.find((r) => r.id === responderId);
  if (!me) return undefined;
  const inc = s.incident;
  const tasks = (inc?.tasks ?? [])
    .filter((t) => t.assignee?.type === 'responder' && t.assignee.id === responderId)
    .map((t) => {
      const z = inc!.zones.find((x) => x.id === t.zoneId);
      return { ...t, zoneName: z?.name, zoneKind: z?.kind, resources: s.resources.filter((r) => t.resourceIds.includes(r.id)) };
    });
  return { me, validQuals: validQuals(me, s.now), tasks, incident: inc ? { title: inc.title, status: inc.status } : undefined };
}

export interface PartnerView {
  partnerId: string;
  capabilities: PartnerCapability[];
  requests: (Incident['supportRequests'][number] & { task?: Task })[];
  incident?: { title: Incident['title']; status: Incident['status'] };
}

export function partnerView(s: WorldState, partnerId: string): PartnerView {
  const caps = s.capabilities.filter((c) => c.partnerId === partnerId);
  const capIds = new Set(caps.map((c) => c.id));
  const inc = s.incident;
  return {
    partnerId,
    capabilities: caps,
    // A partner only sees requests that were approved and addressed to its capabilities.
    requests: (inc?.supportRequests ?? [])
      .filter((r) => r.capabilityId && capIds.has(r.capabilityId) && r.status !== 'pending' && r.status !== 'rejected')
      .map((r) => ({ ...r, task: inc?.tasks.find((t) => t.id === r.taskId) })),
    incident: inc ? { title: inc.title, status: inc.status } : undefined,
  };
}

export function readinessAlerts(s: WorldState): Alert[] {
  return evaluateGaps(s).filter((a) => a.scope === 'readiness');
}
export function incidentAlerts(s: WorldState): Alert[] {
  return evaluateGaps(s).filter((a) => a.scope === 'incident');
}

export { eligibility };
