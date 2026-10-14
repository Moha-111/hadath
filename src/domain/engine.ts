// Pure command engine: (state, actor, command) -> new state or a refusal.
// Every accepted command is appended to the incident log, which is the single
// source for metrics and replays.
import { can, type Actor, type Command } from './commands';
import { evaluateGaps } from './gaps';
import { computeMetrics } from './metrics';
import { ACTIVE_TASK, hasClearance, missingQuals, tasksUsingResource, workingTasksOf } from './rules';
import type { Incident, L, Task, WorldState, Zone } from './types';
import { addMinutes } from './time';

export type RefusalCode =
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'INVALID_STATE'
  | 'ZONE_NOT_ALLOWED'
  | 'CLEARANCE'
  | 'UNAVAILABLE'
  | 'DOUBLE_ALLOCATION'
  | 'QUALIFICATION_MISMATCH'
  | 'RESOURCE_NOT_READY'
  | 'NOT_OWNER'
  | 'PRECONDITION';

export interface Refusal {
  code: RefusalCode;
  message: L;
}

export type Result = { ok: true; state: WorldState } | { ok: false; error: Refusal };

class Refuse extends Error {
  constructor(public refusal: Refusal) {
    super(refusal.message.en);
  }
}
const refuse = (code: RefusalCode, ar: string, en: string): never => {
  throw new Refuse({ code, message: { ar, en } });
};
const L = (ar: string, en: string): L => ({ ar, en });
const KIND_AR: Record<string, string> = { transport: 'نقل', logistics: 'إمداد', care: 'رعاية', comms: 'اتصالات' };

/** The fictional facility's schematic zones, created with each incident. */
export function defaultZones(): Zone[] {
  return [
    { id: 'Z-HOT', kind: 'hot', allowed: false, name: L('المدرّج الشمالي المؤقت — موقع الانهيار', 'North temporary stand — collapse site'), rect: { x: 30, y: 3, w: 30, h: 15 } },
    { id: 'Z-CCP', kind: 'warm', allowed: false, name: L('نقطة تجميع المصابين', 'Casualty collection point'), rect: { x: 52, y: 19, w: 20, h: 12 } },
    { id: 'Z-SUP', kind: 'cold', allowed: false, name: L('منطقة المساندة والإسعاف الأولي', 'Support & first-aid area'), rect: { x: 28, y: 34, w: 30, h: 14 } },
    { id: 'Z-STG', kind: 'cold', allowed: false, name: L('منطقة التمركز', 'Staging area'), rect: { x: 66, y: 40, w: 30, h: 18 } },
    { id: 'Z-LANE', kind: 'cold', allowed: false, name: L('مسار الطوارئ — البوابة (ب)', 'Emergency lane — gate B'), rect: { x: 76, y: 2, w: 8, h: 36 } },
    { id: 'Z-ASM', kind: 'cold', allowed: false, name: L('نقطة التجمع (ج)', 'Assembly point C'), rect: { x: 2, y: 2, w: 22, h: 20 } },
  ];
}

const clone = <T,>(x: T): T => structuredClone(x);

function needIncident(s: WorldState, ...statuses: Incident['status'][]): Incident {
  const inc = s.incident;
  if (!inc) return refuse('PRECONDITION', 'لا يوجد ملف حدث.', 'No incident file exists.');
  if (statuses.length && !statuses.includes(inc.status))
    return refuse('INVALID_STATE', `حالة الحدث «${inc.status}» لا تسمح بهذا الإجراء.`, `Incident status "${inc.status}" does not allow this.`);
  return inc;
}
function needTask(inc: Incident, id: string): Task {
  return inc.tasks.find((t) => t.id === id) ?? refuse('NOT_FOUND', `المهمة ${id} غير موجودة.`, `Task ${id} not found.`);
}

function log(s: WorldState, actor: Actor, type: string, summary: L, isPublic = false) {
  s.seq += 1;
  s.log.push({ seq: s.seq, at: s.now, actor: actor.role, type, summary, public: isPublic });
}

export function apply(state: WorldState, actor: Actor, cmd: Command): Result {
  if (!can(actor.role, cmd.type)) {
    return { ok: false, error: { code: 'FORBIDDEN', message: L('هذا الإجراء خارج صلاحيات دورك.', 'This action is outside your role permissions.') } };
  }
  try {
    const s = clone(state);
    if (cmd.type === 'ADVANCE_CLOCK') {
      s.now = addMinutes(s.now, cmd.minutes);
    } else {
      s.now = addMinutes(s.now, 1); // each action takes one simulated minute
      run(s, actor, cmd);
    }
    // Record first time each alert is seen (used for alert-to-decision metrics).
    for (const a of evaluateGaps(s)) if (!s.alertFirstSeen[a.id]) s.alertFirstSeen[a.id] = s.now;
    return { ok: true, state: s };
  } catch (e) {
    if (e instanceof Refuse) return { ok: false, error: e.refusal };
    throw e;
  }
}

function run(s: WorldState, actor: Actor, cmd: Command): void {
  switch (cmd.type) {
    // ---------------- Preparedness ----------------
    case 'CHECK_RESOURCE': {
      const r = s.resources.find((x) => x.id === cmd.resourceId) ?? refuse('NOT_FOUND', 'المورد غير موجود.', 'Resource not found.');
      r.status = cmd.status;
      r.lastCheckedAt = s.now;
      r.checkedBy = L('م. الجاهزية — ليلى', 'Readiness officer — Layla');
      log(s, actor, cmd.type, L(`فحص ${r.name.ar}: ${cmd.status}`, `Inspected ${r.name.en}: ${cmd.status}`));
      return;
    }
    case 'REVIEW_PLAN': {
      const p = s.plans.find((x) => x.id === cmd.planId) ?? refuse('NOT_FOUND', 'الخطة غير موجودة.', 'Plan not found.');
      p.lastReviewedAt = s.now;
      log(s, actor, cmd.type, L(`مراجعة الخطة: ${p.title.ar}`, `Plan reviewed: ${p.title.en}`));
      return;
    }
    case 'RECORD_TRAINING': {
      const r = s.responders.find((x) => x.id === cmd.responderId) ?? refuse('NOT_FOUND', 'المستجيب غير موجود.', 'Responder not found.');
      const c = s.courses.find((x) => x.id === cmd.courseId) ?? refuse('NOT_FOUND', 'الدورة غير موجودة.', 'Course not found.');
      r.qualifications = r.qualifications.filter((q) => q.code !== c.grants);
      r.qualifications.push({ code: c.grants, issuedAt: s.now, expiresAt: addMinutes(s.now, c.validityDays * 24 * 60), issuer: L('برنامج تدريب افتراضي', 'Fictional training programme') });
      log(s, actor, cmd.type, L(`اعتماد تدريب ${r.name.ar}: ${c.title.ar}`, `Training recorded for ${r.name.en}: ${c.title.en}`));
      return;
    }
    case 'REGISTER_CAPABILITY': {
      const partnerId = actor.id ?? refuse('NOT_OWNER', 'هوية الشريك مطلوبة.', 'Partner identity required.');
      if (s.capabilities.some((c) => c.id === cmd.capability.id)) refuse('PRECONDITION', 'القدرة مسجلة مسبقًا.', 'Capability already registered.');
      s.capabilities.push({ ...cmd.capability, partnerId, readiness: 'ready', updatedAt: s.now, resourceIds: cmd.capability.resourceIds ?? [] });
      log(s, actor, cmd.type, L(`تسجيل قدرة شريك: ${cmd.capability.title.ar}`, `Partner capability registered: ${cmd.capability.title.en}`));
      return;
    }
    case 'UPDATE_CAPABILITY_READINESS': {
      const c = s.capabilities.find((x) => x.id === cmd.capabilityId) ?? refuse('NOT_FOUND', 'القدرة غير موجودة.', 'Capability not found.');
      if (c.partnerId !== actor.id) refuse('NOT_OWNER', 'لا يمكنك تعديل قدرة شريك آخر.', 'You cannot modify another partner’s capability.');
      c.readiness = cmd.readiness;
      c.updatedAt = s.now;
      for (const rid of c.resourceIds) {
        const r = s.resources.find((x) => x.id === rid);
        if (r) { r.status = cmd.readiness; r.lastCheckedAt = s.now; }
      }
      log(s, actor, cmd.type, L(`تحديث جاهزية ${c.title.ar}: ${cmd.readiness}`, `Readiness of ${c.title.en}: ${cmd.readiness}`));
      return;
    }

    // ---------------- Citizen ----------------
    case 'SUBMIT_REPORT': {
      s.reports.push({ id: cmd.reportId, at: s.now, text: cmd.text, locationHint: cmd.locationHint, status: 'new' });
      log(s, actor, cmd.type, L(`بلاغ مواطن: ${cmd.locationHint.ar}`, `Citizen report: ${cmd.locationHint.en}`));
      return;
    }
    case 'ACK_DIRECTIVE': {
      const d = s.directives.find((x) => x.id === cmd.directiveId) ?? refuse('NOT_FOUND', 'التوجيه غير موجود.', 'Directive not found.');
      const n = Math.max(1, Math.floor(cmd.count ?? 1));
      d.acknowledgements += n;
      log(s, actor, cmd.type, L(`تأكيد الالتزام بالتوجيه (${n})`, `Directive acknowledged (${n})`));
      return;
    }
    case 'REGISTER_EXERCISE': {
      const ex = s.exercises.find((x) => x.id === cmd.exerciseId) ?? refuse('NOT_FOUND', 'التمرين غير موجود.', 'Exercise not found.');
      if (ex.publicRegistered >= ex.publicSeats) refuse('PRECONDITION', 'لا توجد مقاعد متاحة.', 'No seats available.');
      ex.publicRegistered += 1;
      log(s, actor, cmd.type, L(`تسجيل مواطن في: ${ex.title.ar}`, `Citizen registered for: ${ex.title.en}`));
      return;
    }

    // ---------------- Incident manager ----------------
    case 'VERIFY_REPORT': {
      const r = s.reports.find((x) => x.id === cmd.reportId) ?? refuse('NOT_FOUND', 'البلاغ غير موجود.', 'Report not found.');
      if (r.status !== 'new') refuse('INVALID_STATE', 'تم التحقق من البلاغ مسبقًا.', 'Report already processed.');
      r.status = cmd.valid ? 'verified' : 'rejected';
      r.verifiedAt = s.now;
      log(s, actor, cmd.type, cmd.valid ? L('التحقق من البلاغ: مؤكد', 'Report verified') : L('البلاغ غير مؤكد', 'Report rejected'));
      return;
    }
    case 'CREATE_INCIDENT': {
      if (s.incident && s.incident.status !== 'closed') refuse('PRECONDITION', 'يوجد حدث نشط بالفعل.', 'An incident is already open.');
      let verifiedAt: string | undefined;
      if (cmd.fromReportId) {
        const r = s.reports.find((x) => x.id === cmd.fromReportId) ?? refuse('NOT_FOUND', 'البلاغ غير موجود.', 'Report not found.');
        if (r.status !== 'verified') refuse('PRECONDITION', 'يجب التحقق من البلاغ قبل إنشاء ملف الحدث.', 'Verify the report before creating the incident file.');
        verifiedAt = r.verifiedAt;
      }
      s.incident = {
        id: cmd.incidentId,
        title: cmd.title,
        status: 'active',
        createdAt: s.now,
        verifiedAt: verifiedAt ?? s.now,
        sourceReportId: cmd.fromReportId,
        situation: cmd.situation,
        objectives: [],
        command: { leadOrgId: 'emc', manager: L('مدير الحدث — م. ريم', 'Incident manager — Reem'), post: L('مركز قيادة متنقل — منطقة التمركز', 'Mobile command post — staging area') },
        participatingOrgIds: ['emc', 'ems', 'civil', 'police', 'community'],
        zones: defaultZones(),
        needs: [],
        tasks: [],
        supportRequests: [],
        decisions: [],
      };
      log(s, actor, cmd.type, L(`إنشاء ملف الحدث: ${cmd.title.ar}`, `Incident file created: ${cmd.title.en}`), true);
      return;
    }
    case 'SET_OBJECTIVES': {
      const inc = needIncident(s, 'active');
      inc.objectives = cmd.objectives;
      log(s, actor, cmd.type, L(`تحديد ${cmd.objectives.length} أهداف للحدث`, `${cmd.objectives.length} objectives set`));
      return;
    }
    case 'SET_ZONE_ALLOWED': {
      const inc = needIncident(s, 'active');
      const z = inc.zones.find((x) => x.id === cmd.zoneId) ?? refuse('NOT_FOUND', 'المنطقة غير موجودة.', 'Zone not found.');
      z.allowed = cmd.allowed;
      log(s, actor, cmd.type, L(`${cmd.allowed ? 'فتح' : 'إغلاق'} منطقة العمل: ${z.name.ar}`, `Zone ${cmd.allowed ? 'opened' : 'closed'}: ${z.name.en}`));
      return;
    }
    case 'SET_NEED': {
      const inc = needIncident(s, 'active');
      inc.needs = inc.needs.filter((n) => n.kind !== cmd.kind);
      if (cmd.quantity > 0) inc.needs.push({ kind: cmd.kind, quantity: cmd.quantity, note: cmd.note });
      log(s, actor, cmd.type, L(`تقدير الاحتياج (${KIND_AR[cmd.kind]}): ${cmd.quantity}`, `Need estimate (${cmd.kind}): ${cmd.quantity}`));
      return;
    }
    case 'CREATE_TASK': {
      const inc = needIncident(s, 'active');
      if (inc.tasks.some((t) => t.id === cmd.taskId)) refuse('PRECONDITION', 'معرّف المهمة مستخدم.', 'Task id already used.');
      if (!inc.zones.some((z) => z.id === cmd.zoneId)) refuse('NOT_FOUND', 'المنطقة غير موجودة.', 'Zone not found.');
      inc.tasks.push({ id: cmd.taskId, title: cmd.title, zoneId: cmd.zoneId, requiredQuals: cmd.requiredQuals, requiredResourceKind: cmd.requiredResourceKind, resourceIds: [], status: 'open', createdAt: s.now });
      log(s, actor, cmd.type, L(`إنشاء مهمة: ${cmd.title.ar}`, `Task created: ${cmd.title.en}`));
      return;
    }
    case 'ASSIGN_TASK': {
      // Assignment is always an explicit human decision. The system never
      // auto-assigns anyone, and never into a zone the manager has not opened.
      const inc = needIncident(s, 'active');
      const task = needTask(inc, cmd.taskId);
      if (!['open', 'assigned', 'declined', 'accepted', 'in_progress'].includes(task.status)) refuse('INVALID_STATE', 'لا يمكن إسناد مهمة مسلّمة أو مغلقة.', 'Cannot assign a delivered or closed task.');
      const zone = inc.zones.find((z) => z.id === task.zoneId)!;
      if (!zone.allowed) refuse('ZONE_NOT_ALLOWED', `المنطقة «${zone.name.ar}» غير مفتوحة للعمل.`, `Zone "${zone.name.en}" is not open for operations.`);
      const r = s.responders.find((x) => x.id === cmd.responderId) ?? refuse('NOT_FOUND', 'المستجيب غير موجود.', 'Responder not found.');
      if (zone.kind === 'hot' && r.kind === 'community') refuse('CLEARANCE', 'لا يُسند المستجيب المجتمعي إلى منطقة الخطر.', 'Community responders are never assigned to the hot zone.');
      if (!hasClearance(r, zone.kind)) refuse('CLEARANCE', `${r.name.ar} لا يملك تصريح المنطقة (${zone.kind}).`, `${r.name.en} has no clearance for ${zone.kind} zone.`);
      if (!r.available) refuse('UNAVAILABLE', `${r.name.ar} غير متاح حاليًا.`, `${r.name.en} is not available.`);
      if (workingTasksOf(inc, r.id).some((t) => t.id !== task.id)) refuse('DOUBLE_ALLOCATION', `${r.name.ar} مكلّف بمهمة نشطة أخرى.`, `${r.name.en} already holds an active task.`);
      const missing = missingQuals(r, task.requiredQuals, s.now);
      if (missing.length && !cmd.acknowledgeMismatch)
        refuse('QUALIFICATION_MISMATCH', `ينقص ${r.name.ar} مؤهل ساري: ${missing.join('، ')}`, `${r.name.en} lacks valid qualification: ${missing.join(', ')}`);
      task.assignee = { type: 'responder', id: r.id };
      task.status = 'assigned';
      task.assignedAt = s.now;
      task.acceptedAt = undefined;
      log(s, actor, cmd.type, L(`تكليف ${r.name.ar} بمهمة: ${task.title.ar}`, `${r.name.en} assigned: ${task.title.en}`));
      return;
    }
    case 'ALLOCATE_RESOURCE': {
      const inc = needIncident(s, 'active');
      const task = needTask(inc, cmd.taskId);
      if (!ACTIVE_TASK(task)) refuse('INVALID_STATE', 'المهمة مغلقة.', 'Task is closed.');
      const r = s.resources.find((x) => x.id === cmd.resourceId) ?? refuse('NOT_FOUND', 'المورد غير موجود.', 'Resource not found.');
      if (task.resourceIds.includes(r.id)) refuse('PRECONDITION', 'المورد مخصّص لهذه المهمة بالفعل.', 'Resource already allocated to this task.');
      const other = tasksUsingResource(inc, r.id);
      if (other.length) refuse('DOUBLE_ALLOCATION', `${r.name.ar} مخصّص للمهمة ${other[0].id}.`, `${r.name.en} is already allocated to ${other[0].id}.`);
      if (r.status !== 'ready') refuse('RESOURCE_NOT_READY', `${r.name.ar} غير جاهز (${r.status}).`, `${r.name.en} is not ready (${r.status}).`);
      task.resourceIds.push(r.id);
      log(s, actor, cmd.type, L(`تخصيص ${r.name.ar} للمهمة ${task.id}`, `${r.name.en} allocated to ${task.id}`));
      return;
    }
    case 'RELEASE_RESOURCE': {
      const inc = needIncident(s, 'active', 'recovery');
      const task = needTask(inc, cmd.taskId);
      if (!task.resourceIds.includes(cmd.resourceId)) refuse('PRECONDITION', 'المورد غير مخصّص لهذه المهمة.', 'Resource is not allocated to this task.');
      task.resourceIds = task.resourceIds.filter((x) => x !== cmd.resourceId);
      log(s, actor, cmd.type, L(`فكّ تخصيص ${cmd.resourceId} من ${task.id}`, `${cmd.resourceId} released from ${task.id}`));
      return;
    }
    case 'REQUEST_SUPPORT': {
      const inc = needIncident(s, 'active');
      inc.supportRequests.push({ id: cmd.requestId, kind: cmd.kind, quantity: cmd.quantity, reason: cmd.reason, requestedBy: 'ems', status: 'pending', createdAt: s.now });
      log(s, actor, cmd.type, L(`طلب دعم (${KIND_AR[cmd.kind]}): ${cmd.quantity}`, `Support requested (${cmd.kind}): ${cmd.quantity}`));
      return;
    }
    case 'DECIDE_SUPPORT': {
      const inc = needIncident(s, 'active');
      const req = inc.supportRequests.find((x) => x.id === cmd.requestId) ?? refuse('NOT_FOUND', 'الطلب غير موجود.', 'Request not found.');
      if (req.status !== 'pending') refuse('INVALID_STATE', 'تم البت في الطلب مسبقًا.', 'Request already decided.');
      req.decidedAt = s.now;
      if (!cmd.approve) {
        req.status = 'rejected';
        log(s, actor, cmd.type, L(`رفض طلب الدعم ${req.id}`, `Support request ${req.id} rejected`));
        return;
      }
      const c = s.capabilities.find((x) => x.id === cmd.capabilityId) ?? refuse('NOT_FOUND', 'حدّد قدرة شريك للتفعيل.', 'Select a partner capability to activate.');
      if (c.kind !== req.kind) refuse('PRECONDITION', 'نوع القدرة لا يطابق الطلب.', 'Capability type does not match the request.');
      if (c.readiness !== 'ready') refuse('RESOURCE_NOT_READY', 'القدرة غير جاهزة للتفعيل.', 'Capability is not ready for activation.');
      req.capabilityId = c.id;
      req.status = 'activated';
      inc.decisions.push({ id: `D-${s.seq + 1}`, at: s.now, by: 'manager', text: L(`اعتماد طلب ${req.id} وتفعيل ${c.title.ar}`, `Approved ${req.id}, activating ${c.title.en}`) });
      log(s, actor, cmd.type, L(`اعتماد طلب الدعم وإرسال طلب تفعيل إلى الشريك`, `Support approved; activation sent to partner`));
      return;
    }
    case 'APPROVE_SUGGESTION': {
      // The suggestion is taken from the engine itself, never from the client,
      // so approval can only execute what the explained rule proposed.
      const alert = evaluateGaps(s).find((a) => a.id === cmd.alertId) ?? refuse('NOT_FOUND', 'التنبيه لم يعد قائمًا.', 'Alert no longer applies.');
      for (const sub of alert.suggestion?.commands ?? []) {
        if (!can('manager', sub.type)) refuse('FORBIDDEN', 'الاقتراح يتضمن إجراء خارج الصلاحيات.', 'Suggestion contains a forbidden action.');
        run(s, actor, sub);
      }
      s.handledAlerts[alert.id] = { at: s.now, outcome: 'approved' };
      s.incident?.decisions.push({ id: `D-${s.seq + 1}`, at: s.now, by: 'manager', text: alert.suggestion?.text ?? alert.title, basedOnAlertId: alert.id });
      log(s, actor, cmd.type, L(`اعتماد بديل مقترح: ${alert.suggestion?.text.ar ?? alert.title.ar}`, `Approved suggestion: ${alert.suggestion?.text.en ?? alert.title.en}`));
      return;
    }
    case 'DISMISS_ALERT': {
      s.handledAlerts[cmd.alertId] = { at: s.now, outcome: 'dismissed' };
      log(s, actor, cmd.type, L(`تجاهل تنبيه بقرار المسؤول: ${cmd.alertId}`, `Alert dismissed by manager: ${cmd.alertId}`));
      return;
    }
    case 'ISSUE_DIRECTIVE': {
      needIncident(s, 'active', 'recovery');
      s.directives.push({ id: cmd.directiveId, at: s.now, issuer: L('مركز إدارة الطوارئ (محاكاة)', 'Emergency Management Centre (simulated)'), title: cmd.title, body: cmd.body, acknowledgements: 0 });
      log(s, actor, cmd.type, L(`إصدار توجيه رسمي محاكى: ${cmd.title.ar}`, `Simulated official directive: ${cmd.title.en}`), true);
      return;
    }
    case 'CLOSE_TASK': {
      const inc = needIncident(s, 'active', 'recovery');
      const task = needTask(inc, cmd.taskId);
      if (task.status === 'closed') refuse('INVALID_STATE', 'المهمة مغلقة مسبقًا.', 'Task already closed.');
      task.status = 'closed';
      task.closedAt = s.now;
      task.resourceIds = [];
      log(s, actor, cmd.type, L(`إغلاق المهمة: ${task.title.ar}`, `Task closed: ${task.title.en}`));
      return;
    }
    case 'START_RECOVERY': {
      const inc = needIncident(s, 'active');
      inc.status = 'recovery';
      inc.recovery = { improvements: [] };
      log(s, actor, cmd.type, L('الانتقال إلى مرحلة التعافي', 'Transitioned to recovery'), true);
      return;
    }
    case 'GENERATE_REPORT': {
      const inc = needIncident(s, 'recovery');
      inc.recovery!.report = { generatedAt: s.now, metrics: computeMetrics(s), note: L('كل المؤشرات محسوبة من سجل المحاكاة الاصطناعي؛ لا تمثل نتائج حقيقية أو سريرية.', 'All indicators are computed from the synthetic simulation log; they are not real or clinical outcomes.') };
      log(s, actor, cmd.type, L('إصدار تقرير الأداء', 'Performance report generated'));
      return;
    }
    case 'ADD_IMPROVEMENT': {
      const inc = needIncident(s, 'recovery');
      if (!cmd.owner.ar.trim() || cmd.dueInDays <= 0) refuse('PRECONDITION', 'يجب تحديد مسؤول وموعد متابعة.', 'An owner and a follow-up date are required.');
      inc.recovery!.improvements.push({ id: cmd.improvementId, text: cmd.text, owner: cmd.owner, dueAt: addMinutes(s.now, cmd.dueInDays * 24 * 60), status: 'open', source: cmd.source });
      log(s, actor, cmd.type, L(`إجراء تحسين: ${cmd.text.ar}`, `Improvement action: ${cmd.text.en}`));
      return;
    }
    case 'CLOSE_INCIDENT': {
      const inc = needIncident(s, 'recovery');
      if (inc.tasks.some((t) => t.status !== 'closed')) refuse('PRECONDITION', 'أغلق جميع المهام أولًا.', 'Close all tasks first.');
      if (!inc.recovery?.report) refuse('PRECONDITION', 'أصدر تقرير الأداء أولًا.', 'Generate the performance report first.');
      if (!inc.recovery?.improvements.length) refuse('PRECONDITION', 'أضف إجراء تحسين واحدًا على الأقل بمسؤول وموعد.', 'Add at least one improvement with owner and due date.');
      inc.status = 'closed';
      inc.closedAt = s.now;
      log(s, actor, cmd.type, L('إغلاق ملف الحدث', 'Incident file closed'), true);
      return;
    }

    // ---------------- Responder ----------------
    case 'SET_AVAILABILITY': {
      const r = s.responders.find((x) => x.id === actor.id) ?? refuse('NOT_OWNER', 'هوية المستجيب مطلوبة.', 'Responder identity required.');
      if (!cmd.available && workingTasksOf(s.incident, r.id).length) refuse('PRECONDITION', 'سلّم مهمتك الحالية أولًا.', 'Deliver your current task first.');
      r.available = cmd.available;
      log(s, actor, cmd.type, L(`${r.name.ar}: ${cmd.available ? 'متاح' : 'غير متاح'}`, `${r.name.en}: ${cmd.available ? 'available' : 'unavailable'}`));
      return;
    }
    case 'ACCEPT_TASK':
    case 'DECLINE_TASK':
    case 'UPDATE_TASK':
    case 'DELIVER_TASK': {
      const inc = needIncident(s, 'active');
      const task = needTask(inc, cmd.taskId);
      if (task.assignee?.type !== 'responder' || task.assignee.id !== actor.id) refuse('NOT_OWNER', 'هذه المهمة ليست مسندة إليك.', 'This task is not assigned to you.');
      const r = s.responders.find((x) => x.id === actor.id)!;
      if (cmd.type === 'ACCEPT_TASK') {
        if (task.status !== 'assigned') refuse('INVALID_STATE', 'لا يمكن قبول المهمة في حالتها الحالية.', 'Task cannot be accepted in its current state.');
        task.status = 'accepted';
        task.acceptedAt = s.now;
        log(s, actor, cmd.type, L(`${r.name.ar} قبل المهمة: ${task.title.ar}`, `${r.name.en} accepted: ${task.title.en}`));
      } else if (cmd.type === 'DECLINE_TASK') {
        if (task.status !== 'assigned') refuse('INVALID_STATE', 'لا يمكن رفض المهمة الآن.', 'Task cannot be declined now.');
        task.status = 'declined';
        log(s, actor, cmd.type, L(`${r.name.ar} اعتذر عن المهمة`, `${r.name.en} declined the task`));
      } else if (cmd.type === 'UPDATE_TASK') {
        if (task.status !== 'accepted' && task.status !== 'in_progress') refuse('INVALID_STATE', 'اقبل المهمة أولًا.', 'Accept the task first.');
        task.status = 'in_progress';
        task.note = cmd.note;
        log(s, actor, cmd.type, L(`تحديث ميداني: ${cmd.note.ar}`, `Field update: ${cmd.note.en}`));
      } else {
        if (task.status !== 'accepted' && task.status !== 'in_progress') refuse('INVALID_STATE', 'لا يمكن تسليم المهمة الآن.', 'Task cannot be delivered now.');
        task.status = 'delivered';
        task.deliveredAt = s.now;
        log(s, actor, cmd.type, L(`تسليم المهمة: ${task.title.ar}`, `Task delivered: ${task.title.en}`));
      }
      return;
    }
    case 'REPORT_RESOURCE_ISSUE': {
      const r = s.resources.find((x) => x.id === cmd.resourceId) ?? refuse('NOT_FOUND', 'المورد غير موجود.', 'Resource not found.');
      if (actor.role === 'responder') {
        const mine = workingTasksOf(s.incident, actor.id ?? '').some((t) => t.resourceIds.includes(r.id));
        if (!mine) refuse('NOT_OWNER', 'يمكنك الإبلاغ عن موارد مهمتك فقط.', 'You can only report on resources of your own task.');
      }
      r.status = cmd.status;
      r.lastCheckedAt = s.now;
      log(s, actor, cmd.type, L(`بلاغ عطل: ${r.name.ar} — ${cmd.note.ar}`, `Fault report: ${r.name.en} — ${cmd.note.en}`));
      return;
    }

    // ---------------- Partner ----------------
    case 'ACCEPT_ACTIVATION': {
      const inc = needIncident(s, 'active');
      const req = inc.supportRequests.find((x) => x.id === cmd.requestId) ?? refuse('NOT_FOUND', 'الطلب غير موجود.', 'Request not found.');
      const c = s.capabilities.find((x) => x.id === req.capabilityId);
      if (!c || c.partnerId !== actor.id) refuse('NOT_OWNER', 'طلب التفعيل ليس موجّهًا إليك.', 'This activation is not addressed to you.');
      if (req.status !== 'activated') refuse('INVALID_STATE', 'الطلب ليس بانتظار القبول.', 'Request is not awaiting acceptance.');
      req.status = 'accepted';
      req.acceptedAt = s.now;
      // Partner work becomes a task in the same incident file, in a cold zone only.
      const taskId = `T-${req.id}`;
      const zone = inc.zones.find((z) => z.id === 'Z-ASM')!;
      zone.allowed = true;
      const free = c!.resourceIds.filter((rid) => tasksUsingResource(inc, rid).length === 0 && s.resources.find((r) => r.id === rid)?.status === 'ready');
      inc.tasks.push({ id: taskId, title: L(`تنفيذ دعم الشريك: ${c!.title.ar}`, `Partner support: ${c!.title.en}`), zoneId: zone.id, requiredQuals: [], resourceIds: free, assignee: { type: 'partner', id: c!.partnerId }, status: 'accepted', createdAt: s.now, assignedAt: req.decidedAt, acceptedAt: s.now });
      req.taskId = taskId;
      log(s, actor, cmd.type, L(`الشريك قبل التفعيل: ${c!.title.ar}`, `Partner accepted activation: ${c!.title.en}`));
      return;
    }
    case 'FULFILL_SUPPORT': {
      const inc = needIncident(s, 'active', 'recovery');
      const req = inc.supportRequests.find((x) => x.id === cmd.requestId) ?? refuse('NOT_FOUND', 'الطلب غير موجود.', 'Request not found.');
      const c = s.capabilities.find((x) => x.id === req.capabilityId);
      if (!c || c.partnerId !== actor.id) refuse('NOT_OWNER', 'الطلب ليس لك.', 'Not your request.');
      if (req.status !== 'accepted') refuse('INVALID_STATE', 'اقبل التفعيل أولًا.', 'Accept the activation first.');
      req.status = 'fulfilled';
      req.fulfilledAt = s.now;
      const task = inc.tasks.find((t) => t.id === req.taskId);
      if (task) { task.status = 'delivered'; task.deliveredAt = s.now; }
      log(s, actor, cmd.type, L(`الشريك أكمل التنفيذ: ${c!.title.ar}`, `Partner fulfilled: ${c!.title.en}`));
      return;
    }
    case 'ADVANCE_CLOCK':
      return;
  }
}

