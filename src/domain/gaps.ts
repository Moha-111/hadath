// «محرك فجوات الجاهزية والاستجابة» — Readiness & Response Gap Engine.
//
// A set of transparent, deterministic rules. Each alert states which rule fired,
// why, the exact data it used, and (where possible) an alternative that the
// incident manager must approve. Nothing here is a predictive or learned model,
// and nothing is executed without human approval.
import type { Command } from './commands';
import type { L, WorldState } from './types';
import {
  ACCEPT_TIMEOUT_MIN, CAPABILITY_STALE_DAYS, EQUIPMENT_STALE_DAYS, WORKING_TASK,
  alternativeResource, eligibleResponders, hasClearance, isEquipmentStale, missingQuals, tasksUsingResource,
} from './rules';
import { daysBetween, fmtDateTime, minutesBetween } from './time';

export type RuleId =
  | 'TASK_NOT_ACCEPTED'
  | 'RESOURCE_NOT_READY'
  | 'STALE_INFORMATION'
  | 'DOUBLE_ALLOCATION'
  | 'QUALIFICATION_MISMATCH'
  | 'DEMAND_EXCEEDS_CAPACITY';

export interface Alert {
  id: string;
  rule: RuleId;
  severity: 'critical' | 'warning' | 'info';
  scope: 'incident' | 'readiness';
  title: L;
  reason: L;
  evidence: { label: L; value: string }[];
  suggestion?: { text: L; commands: Command[] };
}

export const RULE_DOCS: Record<RuleId, L> = {
  TASK_NOT_ACCEPTED: { ar: `مهمة مُسندة لم تُقبل خلال ${ACCEPT_TIMEOUT_MIN} دقائق محاكاة، أو رُفضت.`, en: `An assigned task not accepted within ${ACCEPT_TIMEOUT_MIN} simulated minutes, or declined.` },
  RESOURCE_NOT_READY: { ar: 'مورد حالته ليست «جاهز».', en: 'A resource whose status is not "ready".' },
  STALE_INFORMATION: { ar: `آخر فحص للمعدّة أقدم من ${EQUIPMENT_STALE_DAYS} يومًا، أو آخر تحديث لقدرة شريك أقدم من ${CAPABILITY_STALE_DAYS} يومًا.`, en: `Equipment last inspected more than ${EQUIPMENT_STALE_DAYS} days ago, or a partner capability not updated for ${CAPABILITY_STALE_DAYS} days.` },
  DOUBLE_ALLOCATION: { ar: 'المورد أو المستجيب نفسه مخصّص لأكثر من مهمة نشطة.', en: 'The same resource or responder allocated to more than one active task.' },
  QUALIFICATION_MISMATCH: { ar: 'المستجيب المُسند لا يملك مؤهلًا ساريًا تتطلبه المهمة، أو لا يملك تصريح المنطقة.', en: 'Assigned responder lacks a valid required qualification or zone clearance.' },
  DEMAND_EXCEEDS_CAPACITY: { ar: 'الاحتياج المعلن يتجاوز مجموع السعة الجاهزة المسجلة.', en: 'Declared need exceeds the total ready registered capacity.' },
};

const t = (ar: string, en: string): L => ({ ar, en });

export function evaluateGaps(state: WorldState): Alert[] {
  const alerts: Alert[] = [];
  const inc = state.incident;
  const live = inc && (inc.status === 'active' || inc.status === 'recovery');
  const respName = (id: string) => state.responders.find((r) => r.id === id)?.name ?? t(id, id);

  // 1) Task not accepted / declined
  if (live) {
    for (const task of inc.tasks) {
      if (task.assignee?.type !== 'responder') continue;
      const late = task.status === 'assigned' && task.assignedAt && minutesBetween(task.assignedAt, state.now) >= ACCEPT_TIMEOUT_MIN;
      if (!late && task.status !== 'declined') continue;
      const alt = eligibleResponders(state, task, task.assignee.id)[0];
      alerts.push({
        id: `TASK_NOT_ACCEPTED:${task.id}`,
        rule: 'TASK_NOT_ACCEPTED',
        severity: 'warning',
        scope: 'incident',
        title: t(`مهمة لم تُقبل: ${task.title.ar}`, `Task not accepted: ${task.title.en}`),
        reason: task.status === 'declined'
          ? t('رفض المستجيب المهمة.', 'The responder declined the task.')
          : t(`مرّت ${Math.round(minutesBetween(task.assignedAt!, state.now))} دقائق دون قبول.`, `${Math.round(minutesBetween(task.assignedAt!, state.now))} minutes without acceptance.`),
        evidence: [
          { label: t('المهمة', 'Task'), value: task.id },
          { label: t('المُسند إليه', 'Assignee'), value: task.assignee.id },
          { label: t('وقت الإسناد', 'Assigned at'), value: fmtDateTime(task.assignedAt ?? task.createdAt) },
          { label: t('الحالة', 'Status'), value: task.status },
        ],
        suggestion: alt
          ? { text: t(`إعادة الإسناد إلى ${alt.name.ar} (مؤهل ومتاح).`, `Reassign to ${alt.name.en} (qualified and available).`), commands: [{ type: 'ASSIGN_TASK', taskId: task.id, responderId: alt.id }] }
          : { text: t('لا يوجد بديل مؤهل متاح؛ راجع المهمة يدويًا.', 'No qualified available alternative; review manually.'), commands: [] },
      });
    }
  }

  // 2) Resource not ready (allocated → critical incident alert; otherwise readiness gap)
  for (const r of state.resources) {
    if (r.status === 'ready') continue;
    const using = live ? tasksUsingResource(inc, r.id) : [];
    if (using.length) {
      const alt = alternativeResource(state, r);
      for (const task of using) {
        alerts.push({
          id: `RESOURCE_NOT_READY:${r.id}:${task.id}`,
          rule: 'RESOURCE_NOT_READY',
          severity: 'critical',
          scope: 'incident',
          title: t(`مورد مخصّص غير جاهز: ${r.name.ar}`, `Allocated resource not ready: ${r.name.en}`),
          reason: t(`المورد مخصّص للمهمة «${task.title.ar}» وحالته الحالية «${r.status}».`, `Resource is allocated to "${task.title.en}" and its status is "${r.status}".`),
          evidence: [
            { label: t('المورد', 'Resource'), value: r.id },
            { label: t('الحالة', 'Status'), value: r.status },
            { label: t('آخر تحديث للحالة', 'Status updated'), value: fmtDateTime(r.lastCheckedAt) },
            { label: t('المهمة', 'Task'), value: task.id },
          ],
          suggestion: alt
            ? {
                text: t(`تفعيل البديل الأقرب الجاهز: ${alt.name.ar}.`, `Activate nearest ready alternative: ${alt.name.en}.`),
                commands: [
                  { type: 'RELEASE_RESOURCE', taskId: task.id, resourceId: r.id },
                  { type: 'ALLOCATE_RESOURCE', taskId: task.id, resourceId: alt.id },
                ],
              }
            : { text: t('لا يوجد بديل جاهز من النوع نفسه؛ اطلب دعمًا.', 'No ready alternative of the same kind; request support.'), commands: [] },
        });
      }
    } else {
      alerts.push({
        id: `RESOURCE_NOT_READY:${r.id}`,
        rule: 'RESOURCE_NOT_READY',
        severity: 'warning',
        scope: 'readiness',
        title: t(`مورد غير جاهز: ${r.name.ar}`, `Resource not ready: ${r.name.en}`),
        reason: t(`الحالة المسجلة «${r.status}».`, `Recorded status is "${r.status}".`),
        evidence: [
          { label: t('المورد', 'Resource'), value: r.id },
          { label: t('آخر فحص', 'Last check'), value: fmtDateTime(r.lastCheckedAt) },
          { label: t('المسؤول عن الفحص', 'Inspector'), value: r.checkedBy.en },
        ],
        suggestion: { text: t('جدولة صيانة وإعادة فحص، وعدم الاعتماد عليه حتى ذلك.', 'Schedule maintenance and re-inspection; do not rely on it until then.'), commands: [] },
      });
    }
  }

  // 3) Stale information
  for (const r of state.resources) {
    if (r.status !== 'ready' || !isEquipmentStale(r, state.now)) continue;
    alerts.push({
      id: `STALE_INFORMATION:${r.id}`,
      rule: 'STALE_INFORMATION',
      severity: 'warning',
      scope: live && tasksUsingResource(inc, r.id).length ? 'incident' : 'readiness',
      title: t(`معلومات قديمة: ${r.name.ar}`, `Stale information: ${r.name.en}`),
      reason: t(`آخر فحص قبل ${Math.floor(daysBetween(r.lastCheckedAt, state.now))} يومًا (الحد ${EQUIPMENT_STALE_DAYS}).`, `Last inspected ${Math.floor(daysBetween(r.lastCheckedAt, state.now))} days ago (limit ${EQUIPMENT_STALE_DAYS}).`),
      evidence: [
        { label: t('المورد', 'Resource'), value: r.id },
        { label: t('آخر فحص', 'Last check'), value: fmtDateTime(r.lastCheckedAt) },
      ],
      suggestion: { text: t('إجراء فحص ميداني وتحديث السجل.', 'Run a field inspection and update the record.'), commands: [] },
    });
  }
  for (const c of state.capabilities) {
    if (daysBetween(c.updatedAt, state.now) <= CAPABILITY_STALE_DAYS) continue;
    alerts.push({
      id: `STALE_INFORMATION:${c.id}`,
      rule: 'STALE_INFORMATION',
      severity: 'warning',
      scope: 'readiness',
      title: t(`جاهزية شريك غير محدثة: ${c.title.ar}`, `Partner readiness not updated: ${c.title.en}`),
      reason: t(`آخر تحديث قبل ${Math.floor(daysBetween(c.updatedAt, state.now))} يومًا (الحد ${CAPABILITY_STALE_DAYS}).`, `Last updated ${Math.floor(daysBetween(c.updatedAt, state.now))} days ago (limit ${CAPABILITY_STALE_DAYS}).`),
      evidence: [
        { label: t('القدرة', 'Capability'), value: c.id },
        { label: t('الشريك', 'Partner'), value: c.partnerId },
        { label: t('آخر تحديث', 'Updated'), value: fmtDateTime(c.updatedAt) },
      ],
      suggestion: { text: t('اطلب من الشريك تأكيد الجاهزية قبل الاعتماد عليها.', 'Ask the partner to confirm readiness before relying on it.'), commands: [] },
    });
  }

  // 4) Double allocation (resources and responders)
  if (live) {
    for (const r of state.resources) {
      const using = tasksUsingResource(inc, r.id);
      if (using.length < 2) continue;
      const later = [...using].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))[0];
      const alt = alternativeResource(state, r);
      alerts.push({
        id: `DOUBLE_ALLOCATION:${r.id}`,
        rule: 'DOUBLE_ALLOCATION',
        severity: 'critical',
        scope: 'incident',
        title: t(`ازدواجية تخصيص: ${r.name.ar}`, `Double allocation: ${r.name.en}`),
        reason: t(`المورد مخصّص لـ ${using.length} مهام نشطة.`, `Resource allocated to ${using.length} active tasks.`),
        evidence: using.map((x) => ({ label: t('مهمة', 'Task'), value: x.id })),
        suggestion: {
          text: alt
            ? t(`فكّ التخصيص عن ${later.id} وتخصيص ${alt.id} بدلًا منه.`, `Release from ${later.id} and allocate ${alt.id} instead.`)
            : t(`فكّ التخصيص عن ${later.id}.`, `Release from ${later.id}.`),
          commands: [
            { type: 'RELEASE_RESOURCE', taskId: later.id, resourceId: r.id },
            ...(alt ? [{ type: 'ALLOCATE_RESOURCE', taskId: later.id, resourceId: alt.id } as Command] : []),
          ],
        },
      });
    }
    for (const resp of state.responders) {
      const tasks = inc.tasks.filter((x) => WORKING_TASK(x) && x.assignee?.type === 'responder' && x.assignee.id === resp.id);
      if (tasks.length < 2) continue;
      alerts.push({
        id: `DOUBLE_ALLOCATION:${resp.id}`,
        rule: 'DOUBLE_ALLOCATION',
        severity: 'critical',
        scope: 'incident',
        title: t(`مستجيب مكلّف بمهمتين: ${resp.name.ar}`, `Responder on two tasks: ${resp.name.en}`),
        reason: t('لا يجوز تكليف المستجيب بأكثر من مهمة نشطة.', 'A responder may hold only one active task.'),
        evidence: tasks.map((x) => ({ label: t('مهمة', 'Task'), value: x.id })),
      });
    }
  }

  // 5) Qualification / clearance mismatch
  if (live) {
    for (const task of inc.tasks) {
      if (!WORKING_TASK(task) || task.assignee?.type !== 'responder') continue;
      const r = state.responders.find((x) => x.id === task.assignee!.id);
      const zone = inc.zones.find((z) => z.id === task.zoneId);
      if (!r || !zone) continue;
      const missing = missingQuals(r, task.requiredQuals, state.now);
      const noClear = !hasClearance(r, zone.kind);
      if (!missing.length && !noClear) continue;
      const alt = eligibleResponders(state, task, r.id)[0];
      alerts.push({
        id: `QUALIFICATION_MISMATCH:${task.id}`,
        rule: 'QUALIFICATION_MISMATCH',
        severity: 'critical',
        scope: 'incident',
        title: t(`عدم توافق المؤهل: ${respName(r.id).ar}`, `Qualification mismatch: ${respName(r.id).en}`),
        reason: t(
          [missing.length ? `ينقصه مؤهل ساري: ${missing.join('، ')}` : '', noClear ? `لا يملك تصريح منطقة «${zone.kind}»` : ''].filter(Boolean).join(' · '),
          [missing.length ? `Missing valid qualification: ${missing.join(', ')}` : '', noClear ? `No clearance for "${zone.kind}" zone` : ''].filter(Boolean).join(' · '),
        ),
        evidence: [
          { label: t('المهمة', 'Task'), value: task.id },
          { label: t('المطلوب', 'Required'), value: task.requiredQuals.join(', ') || '—' },
          { label: t('المنطقة', 'Zone'), value: `${zone.id} (${zone.kind})` },
        ],
        suggestion: alt
          ? { text: t(`إعادة الإسناد إلى ${alt.name.ar}.`, `Reassign to ${alt.name.en}.`), commands: [{ type: 'ASSIGN_TASK', taskId: task.id, responderId: alt.id }] }
          : { text: t('لا يوجد بديل مؤهل؛ أوقف المهمة واطلب مستجيبًا مختصًا.', 'No qualified alternative; hold the task and request a specialist.'), commands: [] },
      });
    }
  }

  // 6) Demand exceeds capacity
  if (live) {
    for (const need of inc.needs) {
      const ready = state.capabilities.filter((c) => c.kind === need.kind && c.readiness === 'ready');
      const cap = ready.reduce((s, c) => s + c.capacity, 0);
      if (need.quantity <= cap) continue;
      alerts.push({
        id: `DEMAND_EXCEEDS_CAPACITY:${need.kind}`,
        rule: 'DEMAND_EXCEEDS_CAPACITY',
        severity: 'warning',
        scope: 'incident',
        title: t(`الاحتياج يتجاوز السعة: ${({ transport: 'نقل', logistics: 'إمداد', care: 'رعاية', comms: 'اتصالات' } as Record<string, string>)[need.kind]}`, `Need exceeds capacity: ${need.kind}`),
        reason: t(`الاحتياج ${need.quantity} مقابل سعة جاهزة ${cap}.`, `Need ${need.quantity} vs ready capacity ${cap}.`),
        evidence: [
          { label: t('الاحتياج', 'Need'), value: String(need.quantity) },
          { label: t('السعة الجاهزة', 'Ready capacity'), value: String(cap) },
          { label: t('القدرات المحتسبة', 'Counted capabilities'), value: ready.map((c) => c.id).join(', ') || '—' },
        ],
        suggestion: {
          text: cap > 0
            ? t(`تنفيذ ${Math.ceil(need.quantity / cap)} دورات نقل بالسعة الحالية، مع طلب سعة إضافية احتياطية.`, `Run ${Math.ceil(need.quantity / cap)} rotations with current capacity, and request reserve capacity.`)
            : t('طلب سعة من شريك آخر.', 'Request capacity from another partner.'),
          commands: [],
        },
      });
    }
    for (const req of inc.supportRequests) {
      const c = state.capabilities.find((x) => x.id === req.capabilityId);
      if (!c || req.status === 'rejected' || req.status === 'fulfilled' || req.quantity <= c.capacity) continue;
      alerts.push({
        id: `DEMAND_EXCEEDS_CAPACITY:${req.id}`,
        rule: 'DEMAND_EXCEEDS_CAPACITY',
        severity: 'warning',
        scope: 'incident',
        title: t(`طلب دعم يتجاوز سعة القدرة ${c.id}`, `Support request exceeds capability ${c.id}`),
        reason: t(`المطلوب ${req.quantity} والسعة ${c.capacity}.`, `Requested ${req.quantity}, capacity ${c.capacity}.`),
        evidence: [
          { label: t('الطلب', 'Request'), value: req.id },
          { label: t('القدرة', 'Capability'), value: c.id },
        ],
      });
    }
  }

  const handled = state.handledAlerts;
  return alerts.filter((a) => !handled[a.id]);
}
