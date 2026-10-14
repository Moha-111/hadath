// HADATH domain model. Every record in this prototype is synthetic.
// Bilingual text is stored as { ar, en } so the UI can switch language
// without losing meaning.

export type Lang = 'ar' | 'en';
export type L = { ar: string; en: string };

export type Role = 'manager' | 'readiness' | 'partner' | 'responder' | 'citizen';

export type ZoneKind = 'hot' | 'warm' | 'cold';

export interface Zone {
  id: string;
  name: L;
  kind: ZoneKind;
  /** Whether the incident manager has opened this zone for operations. */
  allowed: boolean;
  /** Schematic polygon on the synthetic map (0..100 coordinate space). */
  rect: { x: number; y: number; w: number; h: number };
}

export type ResourceKind =
  | 'aed'
  | 'trauma_kit'
  | 'bleeding_kit'
  | 'ambulance'
  | 'transport'
  | 'logistics'
  | 'care'
  | 'comms';

export type ReadinessStatus = 'ready' | 'not_ready' | 'maintenance' | 'out_of_service';

export interface Resource {
  id: string;
  kind: ResourceKind;
  name: L;
  ownerId: string; // agency or partner id
  status: ReadinessStatus;
  lastCheckedAt: string; // ISO timestamp (simulated clock)
  checkedBy: L;
  access: L; // e.g. "24/7 public lobby"
  pos: { x: number; y: number }; // schematic map position
  /** Units this resource provides (e.g. seats for a transport). */
  capacity: number;
}

export interface Qualification {
  code: QualCode;
  issuedAt: string;
  expiresAt: string;
  issuer: L;
}

export type QualCode = 'first_aid' | 'stop_bleed' | 'aed_cpr' | 'mci_triage_support' | 'crowd_guidance' | 'paramedic';

export interface Responder {
  id: string;
  name: L;
  kind: 'professional' | 'community';
  agencyId: string;
  qualifications: Qualification[];
  available: boolean;
  /** Highest zone kind this responder may enter. Community responders never exceed "cold". */
  clearance: ZoneKind;
}

export type PartnerCapabilityKind = 'transport' | 'logistics' | 'care' | 'comms';

export interface PartnerCapability {
  id: string;
  partnerId: string;
  kind: PartnerCapabilityKind;
  title: L;
  capacity: number;
  unit: L;
  conditions: L;
  activationNoticeMin: number;
  readiness: ReadinessStatus;
  updatedAt: string;
  /** Resource ids that materialise this capability when activated. */
  resourceIds: string[];
}

export interface Organization {
  id: string;
  name: L;
  type: 'government' | 'private' | 'community';
  mandate: L;
}

export type IncidentStatus = 'reported' | 'verified' | 'active' | 'recovery' | 'closed';

export type TaskStatus = 'open' | 'assigned' | 'accepted' | 'in_progress' | 'delivered' | 'closed' | 'declined';

export interface Task {
  id: string;
  title: L;
  zoneId: string;
  requiredQuals: QualCode[];
  requiredResourceKind?: ResourceKind;
  resourceIds: string[];
  assignee?: { type: 'responder' | 'partner'; id: string };
  status: TaskStatus;
  createdAt: string;
  assignedAt?: string;
  acceptedAt?: string;
  deliveredAt?: string;
  closedAt?: string;
  note?: L;
}

export type SupportStatus = 'pending' | 'approved' | 'rejected' | 'activated' | 'accepted' | 'fulfilled';

export interface SupportRequest {
  id: string;
  kind: PartnerCapabilityKind;
  quantity: number;
  reason: L;
  requestedBy: string; // org id
  capabilityId?: string;
  status: SupportStatus;
  createdAt: string;
  decidedAt?: string;
  acceptedAt?: string;
  fulfilledAt?: string;
  taskId?: string;
}

export interface Decision {
  id: string;
  at: string;
  by: Role;
  text: L;
  basedOnAlertId?: string;
}

export interface LogEntry {
  seq: number;
  at: string;
  actor: Role;
  type: string;
  summary: L;
  /** Visible to citizens? Only public directives and generic status are. */
  public: boolean;
}

export interface CitizenReport {
  id: string;
  at: string;
  text: L;
  locationHint: L;
  status: 'new' | 'verified' | 'rejected';
  verifiedAt?: string;
}

export interface Directive {
  id: string;
  at: string;
  issuer: L;
  title: Record<DirectiveLang, string>;
  body: Record<DirectiveLang, string>;
  acknowledgements: number;
}

export type DirectiveLang = 'ar' | 'en' | 'ur';

export interface Improvement {
  id: string;
  text: L;
  owner: L;
  dueAt: string;
  status: 'open' | 'done';
  source: L;
}

export interface Incident {
  id: string;
  title: L;
  status: IncidentStatus;
  createdAt: string;
  verifiedAt?: string;
  closedAt?: string;
  sourceReportId?: string;
  situation: L;
  objectives: L[];
  command: { leadOrgId: string; manager: L; post: L };
  participatingOrgIds: string[];
  zones: Zone[];
  /** Estimated needs declared by the manager (e.g. transport seats). */
  needs: { kind: PartnerCapabilityKind; quantity: number; note: L }[];
  tasks: Task[];
  supportRequests: SupportRequest[];
  decisions: Decision[];
  recovery?: { report?: PerformanceReport; improvements: Improvement[] };
}

export interface PerformanceReport {
  generatedAt: string;
  metrics: Metric[];
  note: L;
}

export interface Metric {
  id: string;
  label: L;
  value: number | null;
  unit: L;
  derivation: L;
}

export interface Plan {
  id: string;
  title: L;
  owner: L;
  lastReviewedAt: string;
  reviewEveryDays: number;
}

export interface Exercise {
  id: string;
  title: L;
  at: string;
  kind: 'tabletop' | 'drill' | 'full_scale';
  openFindings: number;
  publicSeats: number;
  publicRegistered: number;
}

export interface TrainingCourse {
  id: string;
  title: L;
  grants: QualCode;
  validityDays: number;
  publicOpen: boolean;
}

export interface AcceptedSuggestion {
  alertId: string;
  at: string;
}

export interface WorldState {
  now: string;
  seq: number;
  orgs: Organization[];
  resources: Resource[];
  responders: Responder[];
  capabilities: PartnerCapability[];
  plans: Plan[];
  exercises: Exercise[];
  courses: TrainingCourse[];
  reports: CitizenReport[];
  directives: Directive[];
  incident?: Incident;
  log: LogEntry[];
  /** Alerts the manager explicitly dismissed or approved, keyed by alert id. */
  handledAlerts: Record<string, { at: string; outcome: 'approved' | 'dismissed' }>;
  /** Alert ids with the simulated time they were first raised (for metrics). */
  alertFirstSeen: Record<string, string>;
}
