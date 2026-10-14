// Performance indicators computed ONLY from the simulation log and state.
// No improvement percentages, outcome claims or clinical results are produced.
import type { Metric, WorldState } from './types';
import { minutesBetween } from './time';

const round1 = (n: number) => Math.round(n * 10) / 10;
const avg = (xs: number[]) => (xs.length ? round1(xs.reduce((a, b) => a + b, 0) / xs.length) : null);
const MIN = { ar: 'دقيقة محاكاة', en: 'sim. min' };
const COUNT = { ar: 'عدد', en: 'count' };

export function computeMetrics(s: WorldState): Metric[] {
  const inc = s.incident;
  const report = s.reports.find((r) => r.id === inc?.sourceReportId);
  const tasks = inc?.tasks ?? [];
  const respTasks = tasks.filter((t) => t.assignee?.type === 'responder');
  const accept = respTasks.filter((t) => t.assignedAt && t.acceptedAt).map((t) => minutesBetween(t.assignedAt!, t.acceptedAt!));
  const approvals = Object.entries(s.handledAlerts).filter(([, v]) => v.outcome === 'approved');
  const alertToDecision = approvals
    .filter(([id]) => s.alertFirstSeen[id])
    .map(([id, v]) => minutesBetween(s.alertFirstSeen[id], v.at));
  const failover = approvals.filter(([id]) => id.startsWith('RESOURCE_NOT_READY:') && id.split(':').length === 3).map(([id, v]) => minutesBetween(s.alertFirstSeen[id], v.at));
  const support = (inc?.supportRequests ?? []).filter((r) => r.decidedAt && r.acceptedAt).map((r) => minutesBetween(r.decidedAt!, r.acceptedAt!));
  const acks = s.directives.reduce((n, d) => n + d.acknowledgements, 0);
  const incidentAlerts = Object.keys(s.alertFirstSeen).filter((id) => !id.startsWith('STALE_INFORMATION:') && !(id.startsWith('RESOURCE_NOT_READY:') && id.split(':').length === 2));

  return [
    { id: 'report_to_verify', label: { ar: 'من البلاغ إلى التحقق', en: 'Report → verification' }, value: report?.verifiedAt ? round1(minutesBetween(report.at, report.verifiedAt)) : null, unit: MIN, derivation: { ar: 'وقت التحقق − وقت البلاغ', en: 'verifiedAt − report.at' } },
    { id: 'report_to_file', label: { ar: 'من البلاغ إلى ملف الحدث', en: 'Report → incident file' }, value: report && inc ? round1(minutesBetween(report.at, inc.createdAt)) : null, unit: MIN, derivation: { ar: 'إنشاء الملف − وقت البلاغ', en: 'incident.createdAt − report.at' } },
    { id: 'assign_to_accept', label: { ar: 'متوسط الإسناد ← القبول', en: 'Avg. assignment → acceptance' }, value: avg(accept), unit: MIN, derivation: { ar: `متوسط ${accept.length} مهام لمستجيبين`, en: `mean over ${accept.length} responder tasks` } },
    { id: 'support_to_accept', label: { ar: 'اعتماد الدعم ← قبول الشريك', en: 'Support approval → partner acceptance' }, value: avg(support), unit: MIN, derivation: { ar: `متوسط ${support.length} طلبات`, en: `mean over ${support.length} requests` } },
    { id: 'alerts_raised', label: { ar: 'تنبيهات تشغيلية ظهرت', en: 'Operational alerts raised' }, value: incidentAlerts.length, unit: COUNT, derivation: { ar: 'تنبيهات فريدة خلال الحدث (دون فجوات الجاهزية)', en: 'unique alerts during the incident (excl. readiness gaps)' } },
    { id: 'alerts_approved', label: { ar: 'بدائل اعتمدها المسؤول', en: 'Alternatives approved by manager' }, value: approvals.length, unit: COUNT, derivation: { ar: 'قرارات «اعتماد البديل» في السجل', en: '"approve suggestion" decisions in log' } },
    { id: 'alert_to_decision', label: { ar: 'متوسط التنبيه ← القرار', en: 'Avg. alert → decision' }, value: avg(alertToDecision), unit: MIN, derivation: { ar: 'وقت الاعتماد − أول ظهور للتنبيه', en: 'approval time − first seen' } },
    { id: 'failover', label: { ar: 'تعطل المورد ← اعتماد البديل', en: 'Resource failure → alternative approved' }, value: avg(failover), unit: MIN, derivation: { ar: 'لتنبيهات «مورد مخصّص غير جاهز»', en: 'for "allocated resource not ready" alerts' } },
    { id: 'directive_acks', label: { ar: 'تأكيدات الالتزام بالتوجيه (اصطناعية)', en: 'Directive acknowledgements (synthetic)' }, value: acks, unit: COUNT, derivation: { ar: 'مجموع التأكيدات في المحاكاة', en: 'sum of simulated acknowledgements' } },
    { id: 'tasks_closed', label: { ar: 'مهام مغلقة / الإجمالي', en: 'Tasks closed / total' }, value: tasks.length ? round1(tasks.filter((t) => t.status === 'closed').length / tasks.length * 100) : null, unit: { ar: '٪ من المهام', en: '% of tasks' }, derivation: { ar: `${tasks.filter((t) => t.status === 'closed').length} من ${tasks.length}`, en: `${tasks.filter((t) => t.status === 'closed').length} of ${tasks.length}` } },
  ];
}
