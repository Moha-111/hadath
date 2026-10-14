import type { DirectiveLang, L, PartnerCapabilityKind, QualCode, ReadinessStatus, ResourceKind, Role } from './types';

/** Who is acting. `id` scopes partner (org id) and responder (responder id) actions. */
export interface Actor {
  role: Role;
  id?: string;
}

export type Command =
  // Preparedness
  | { type: 'CHECK_RESOURCE'; resourceId: string; status: ReadinessStatus; note?: L }
  | { type: 'REVIEW_PLAN'; planId: string }
  | { type: 'RECORD_TRAINING'; responderId: string; courseId: string }
  | { type: 'REGISTER_CAPABILITY'; capability: { id: string; kind: PartnerCapabilityKind; title: L; capacity: number; unit: L; conditions: L; activationNoticeMin: number; resourceIds?: string[] } }
  | { type: 'UPDATE_CAPABILITY_READINESS'; capabilityId: string; readiness: ReadinessStatus }
  // Citizen
  | { type: 'SUBMIT_REPORT'; reportId: string; text: L; locationHint: L }
  | { type: 'ACK_DIRECTIVE'; directiveId: string; count?: number }
  | { type: 'REGISTER_EXERCISE'; exerciseId: string }
  // Incident manager
  | { type: 'VERIFY_REPORT'; reportId: string; valid: boolean }
  | { type: 'CREATE_INCIDENT'; incidentId: string; fromReportId?: string; title: L; situation: L }
  | { type: 'SET_OBJECTIVES'; objectives: L[] }
  | { type: 'SET_ZONE_ALLOWED'; zoneId: string; allowed: boolean }
  | { type: 'SET_NEED'; kind: PartnerCapabilityKind; quantity: number; note: L }
  | { type: 'CREATE_TASK'; taskId: string; title: L; zoneId: string; requiredQuals: QualCode[]; requiredResourceKind?: ResourceKind }
  | { type: 'ASSIGN_TASK'; taskId: string; responderId: string; acknowledgeMismatch?: boolean }
  | { type: 'ALLOCATE_RESOURCE'; taskId: string; resourceId: string }
  | { type: 'RELEASE_RESOURCE'; taskId: string; resourceId: string }
  | { type: 'REQUEST_SUPPORT'; requestId: string; kind: PartnerCapabilityKind; quantity: number; reason: L }
  | { type: 'DECIDE_SUPPORT'; requestId: string; approve: boolean; capabilityId?: string }
  | { type: 'APPROVE_SUGGESTION'; alertId: string }
  | { type: 'DISMISS_ALERT'; alertId: string }
  | { type: 'ISSUE_DIRECTIVE'; directiveId: string; title: Record<DirectiveLang, string>; body: Record<DirectiveLang, string> }
  | { type: 'CLOSE_TASK'; taskId: string }
  | { type: 'START_RECOVERY' }
  | { type: 'GENERATE_REPORT' }
  | { type: 'ADD_IMPROVEMENT'; improvementId: string; text: L; owner: L; dueInDays: number; source: L }
  | { type: 'CLOSE_INCIDENT' }
  // Responder
  | { type: 'SET_AVAILABILITY'; available: boolean }
  | { type: 'ACCEPT_TASK'; taskId: string }
  | { type: 'DECLINE_TASK'; taskId: string }
  | { type: 'UPDATE_TASK'; taskId: string; note: L }
  | { type: 'DELIVER_TASK'; taskId: string }
  | { type: 'REPORT_RESOURCE_ISSUE'; resourceId: string; status: ReadinessStatus; note: L }
  // Partner
  | { type: 'ACCEPT_ACTIVATION'; requestId: string }
  | { type: 'FULFILL_SUPPORT'; requestId: string }
  // Simulation control (not a role action)
  | { type: 'ADVANCE_CLOCK'; minutes: number };

export type CommandType = Command['type'];

/**
 * Role-based permission matrix. A command not listed for a role is rejected.
 * Object-level checks (own task, own capability) are applied in the engine.
 */
export const PERMISSIONS: Record<Role, CommandType[]> = {
  manager: [
    'VERIFY_REPORT', 'CREATE_INCIDENT', 'SET_OBJECTIVES', 'SET_ZONE_ALLOWED', 'SET_NEED', 'CREATE_TASK',
    'ASSIGN_TASK', 'ALLOCATE_RESOURCE', 'RELEASE_RESOURCE', 'REQUEST_SUPPORT', 'DECIDE_SUPPORT',
    'APPROVE_SUGGESTION', 'DISMISS_ALERT', 'ISSUE_DIRECTIVE', 'CLOSE_TASK', 'START_RECOVERY',
    'GENERATE_REPORT', 'ADD_IMPROVEMENT', 'CLOSE_INCIDENT', 'ADVANCE_CLOCK',
  ],
  readiness: ['CHECK_RESOURCE', 'REVIEW_PLAN', 'RECORD_TRAINING', 'REPORT_RESOURCE_ISSUE', 'ADD_IMPROVEMENT', 'ADVANCE_CLOCK'],
  partner: ['REGISTER_CAPABILITY', 'UPDATE_CAPABILITY_READINESS', 'ACCEPT_ACTIVATION', 'FULFILL_SUPPORT', 'ADVANCE_CLOCK'],
  responder: ['SET_AVAILABILITY', 'ACCEPT_TASK', 'DECLINE_TASK', 'UPDATE_TASK', 'DELIVER_TASK', 'REPORT_RESOURCE_ISSUE', 'ADVANCE_CLOCK'],
  citizen: ['SUBMIT_REPORT', 'ACK_DIRECTIVE', 'REGISTER_EXERCISE', 'ADVANCE_CLOCK'],
};

export const can = (role: Role, type: CommandType): boolean => PERMISSIONS[role].includes(type);
