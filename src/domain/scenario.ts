// Replayable synthetic scenario: a fictional multi-casualty incident caused by
// the partial collapse of a temporary stand at the fictional "Oasis Events
// Complex". It is NOT a re-enactment of any real event and contains no real
// victims, facilities or plans. Running it twice produces identical state.
import type { Actor, Command } from './commands';
import { apply } from './engine';
import { createSeed } from './seed';
import type { L, WorldState } from './types';

export type Phase = 'before' | 'start' | 'ops' | 'integration' | 'resilience' | 'citizen' | 'recovery';

export interface Step {
  id: string;
  phase: Phase;
  actor: Actor;
  cmd: Command;
  title: L;
}

const L = (ar: string, en: string): L => ({ ar, en });
const M: Actor = { role: 'manager' };
const RD: Actor = { role: 'readiness' };
const CIT: Actor = { role: 'citizen' };
const SARA: Actor = { role: 'responder', id: 'R-sara' };
const KHALED: Actor = { role: 'responder', id: 'R-khaled' };
const BUS: Actor = { role: 'partner', id: 'p-transport' };
const COMMS: Actor = { role: 'partner', id: 'p-comms' };

export const PHASES: { id: Phase; title: L }[] = [
  { id: 'before', title: L('قبل الحدث', 'Before the incident') },
  { id: 'start', title: L('بداية الحدث', 'Incident start') },
  { id: 'ops', title: L('العمليات', 'Operations') },
  { id: 'integration', title: L('التكامل', 'Integration') },
  { id: 'resilience', title: L('المرونة', 'Resilience') },
  { id: 'citizen', title: L('مشاركة المواطن', 'Citizen participation') },
  { id: 'recovery', title: L('التعافي', 'Recovery') },
];

export const DIRECTIVE_1 = {
  directiveId: 'DIR-1',
  title: {
    ar: 'توجيه: ابتعدوا عن المدرّج الشمالي وأفسحوا مسار الطوارئ',
    en: 'Directive: keep away from the north stand and clear the emergency lane',
    ur: 'ہدایت: شمالی اسٹینڈ سے دور رہیں اور ایمرجنسی راستہ خالی کریں',
  },
  body: {
    ar: 'لا تقتربوا من المدرّج الشمالي. أفسحوا مسار الطوارئ عند البوابة (ب). توجّهوا بهدوء إلى نقطة التجمع (ج) واتبعوا تعليمات المنظمين. لا تنشروا صورًا للمصابين.',
    en: 'Do not approach the north stand. Keep the emergency lane at gate B clear. Walk calmly to assembly point C and follow marshals. Do not share photos of injured people.',
    ur: 'شمالی اسٹینڈ کے قریب نہ جائیں۔ گیٹ B پر ایمرجنسی راستہ خالی رکھیں۔ پرسکون طریقے سے اسمبلی پوائنٹ C کی طرف جائیں اور منتظمین کی ہدایات پر عمل کریں۔ زخمیوں کی تصاویر شیئر نہ کریں۔',
  },
};

export const SCENARIO: Step[] = [
  // 1. Before the incident
  { id: 's01', phase: 'before', actor: RD, title: L('فحص جاهزية مزيل الرجفان في البوابة الشرقية', 'Inspect east-gate AED'), cmd: { type: 'CHECK_RESOURCE', resourceId: 'AED-02', status: 'ready' } },
  { id: 's02', phase: 'before', actor: RD, title: L('اعتماد تدريب سارة على السيطرة على النزيف', 'Record Sara’s stop-the-bleed training'), cmd: { type: 'RECORD_TRAINING', responderId: 'R-sara', courseId: 'C-STOP' } },
  { id: 's03', phase: 'before', actor: COMMS, title: L('شريك الاتصالات يسجل قدرة ميدانية', 'Comms partner registers field capability'), cmd: { type: 'REGISTER_CAPABILITY', capability: { id: 'CAP-M1', kind: 'comms', title: L('حقيبة اتصالات ميدانية (10 أجهزة)', 'Field comms kit (10 radios)'), capacity: 10, unit: L('جهاز', 'radios'), conditions: L('إشعار 30 دقيقة · تشغيل بفني من الشركة · المناطق الباردة فقط', '30-min notice · operated by company technician · cold zones only'), activationNoticeMin: 30 } } },
  { id: 's04', phase: 'before', actor: SARA, title: L('سارة تفعّل توفرها التطوعي', 'Sara switches availability on'), cmd: { type: 'SET_AVAILABILITY', available: true } },
  { id: 's05', phase: 'before', actor: M, title: L('مرور الوقت: يوم الفعالية', 'Time passes: event day'), cmd: { type: 'ADVANCE_CLOCK', minutes: 90 } },
  // 2. Start
  { id: 's06', phase: 'start', actor: CIT, title: L('مواطن يرسل بلاغًا مبسطًا', 'Citizen sends a simple report'), cmd: { type: 'SUBMIT_REPORT', reportId: 'RPT-1', text: L('سمعت صوت انهيار عند المدرّج الشمالي المؤقت، وهناك أشخاص مصابون.', 'I heard a collapse at the north temporary stand; people are hurt.'), locationHint: L('المدرّج الشمالي — مجمّع الواحة الخيالي', 'North stand — fictional Oasis Complex') } },
  { id: 's07', phase: 'start', actor: M, title: L('مدير الحدث يتحقق من البلاغ', 'Manager verifies the report'), cmd: { type: 'VERIFY_REPORT', reportId: 'RPT-1', valid: true } },
  { id: 's08', phase: 'start', actor: M, title: L('إنشاء ملف الحدث الموحد', 'Create the unified incident file'), cmd: { type: 'CREATE_INCIDENT', incidentId: 'INC-1', fromReportId: 'RPT-1', title: L('حادث متعدد الإصابات — انهيار جزئي لمدرّج مؤقت (افتراضي)', 'Multi-casualty incident — partial collapse of a temporary stand (fictional)'), situation: L('انهيار جزئي لمدرّج مؤقت خلال فعالية مجتمعية خيالية. تقدير أولي اصطناعي: 14 مصابًا بإصابات متفاوتة، والموقع مطوّق.', 'Partial collapse of a temporary stand during a fictional community event. Synthetic initial estimate: 14 injured, site cordoned.') } },
  { id: 's09', phase: 'start', actor: M, title: L('تحديد أهداف الحدث', 'Set incident objectives'), cmd: { type: 'SET_OBJECTIVES', objectives: [L('سلامة المستجيبين والحضور أولًا', 'Safety of responders and attendees first'), L('نقل المصابين عبر نقطة التجميع وفق قرار الفريق الطبي', 'Move casualties via the collection point per medical team decisions'), L('إبقاء مسار الطوارئ عند البوابة (ب) مفتوحًا', 'Keep the gate B emergency lane open'), L('لمّ شمل الحضور عبر نقطة التجمع (ج)', 'Reunify attendees via assembly point C')] } },
  { id: 's10', phase: 'start', actor: M, title: L('فتح مناطق العمل المسموح بها', 'Open permitted work zones'), cmd: { type: 'SET_ZONE_ALLOWED', zoneId: 'Z-CCP', allowed: true } },
  { id: 's11', phase: 'start', actor: M, title: L('فتح منطقة المساندة', 'Open support area'), cmd: { type: 'SET_ZONE_ALLOWED', zoneId: 'Z-SUP', allowed: true } },
  { id: 's12', phase: 'start', actor: M, title: L('تقدير احتياج النقل', 'Estimate transport need'), cmd: { type: 'SET_NEED', kind: 'transport', quantity: 120, note: L('نقل الحضور غير المصابين إلى نقطة لمّ الشمل', 'Move uninjured attendees to reunification point') } },
  // 3. Operations
  { id: 's13', phase: 'ops', actor: M, title: L('إنشاء مهمة إسعاف أولي في منطقة آمنة', 'Create first-aid task in safe zone'), cmd: { type: 'CREATE_TASK', taskId: 'T-1', title: L('مساندة الإسعاف الأولي للإصابات الطفيفة', 'First-aid support for minor injuries'), zoneId: 'Z-SUP', requiredQuals: ['first_aid', 'stop_bleed'], requiredResourceKind: 'bleeding_kit' } },
  { id: 's14', phase: 'ops', actor: M, title: L('تكليف سارة (مؤهلة)', 'Assign Sara (qualified)'), cmd: { type: 'ASSIGN_TASK', taskId: 'T-1', responderId: 'R-sara' } },
  { id: 's15', phase: 'ops', actor: M, title: L('تحديد الأداة: محطة السيطرة على النزيف (أ)', 'Allocate tool: bleeding control station A'), cmd: { type: 'ALLOCATE_RESOURCE', taskId: 'T-1', resourceId: 'BC-01' } },
  { id: 's16', phase: 'ops', actor: SARA, title: L('سارة تقبل المهمة', 'Sara accepts the task'), cmd: { type: 'ACCEPT_TASK', taskId: 'T-1' } },
  { id: 's17', phase: 'ops', actor: M, title: L('إنشاء مهمة مساندة في نقطة التجميع', 'Create collection-point support task'), cmd: { type: 'CREATE_TASK', taskId: 'T-2', title: L('مساندة الفريق الطبي في نقطة تجميع المصابين', 'Support medical team at collection point'), zoneId: 'Z-CCP', requiredQuals: ['paramedic'], requiredResourceKind: 'trauma_kit' } },
  { id: 's18', phase: 'ops', actor: M, title: L('تكليف خالد (مسعف)', 'Assign Khaled (paramedic)'), cmd: { type: 'ASSIGN_TASK', taskId: 'T-2', responderId: 'R-khaled' } },
  { id: 's19', phase: 'ops', actor: M, title: L('تخصيص حقيبة الإصابات TK-02', 'Allocate trauma kit TK-02'), cmd: { type: 'ALLOCATE_RESOURCE', taskId: 'T-2', resourceId: 'TK-02' } },
  { id: 's20', phase: 'ops', actor: KHALED, title: L('خالد يقبل المهمة', 'Khaled accepts the task'), cmd: { type: 'ACCEPT_TASK', taskId: 'T-2' } },
  // 4. Integration
  { id: 's21', phase: 'integration', actor: M, title: L('طلب دعم نقل من القطاع الخاص', 'Request private-sector transport'), cmd: { type: 'REQUEST_SUPPORT', requestId: 'SR-1', kind: 'transport', quantity: 60, reason: L('نقل الحضور غير المصابين إلى نقطة لمّ الشمل', 'Move uninjured attendees to reunification point') } },
  { id: 's22', phase: 'integration', actor: M, title: L('اعتماد الطلب وتفعيل قدرة الشريك', 'Approve and activate partner capability'), cmd: { type: 'DECIDE_SUPPORT', requestId: 'SR-1', approve: true, capabilityId: 'CAP-T1' } },
  { id: 's23', phase: 'integration', actor: BUS, title: L('الشريك يقبل طلب التفعيل', 'Partner accepts activation'), cmd: { type: 'ACCEPT_ACTIVATION', requestId: 'SR-1' } },
  { id: 's24', phase: 'integration', actor: M, title: L('اعتماد خطة دورتين للنقل', 'Approve two-rotation transport plan'), cmd: { type: 'APPROVE_SUGGESTION', alertId: 'DEMAND_EXCEEDS_CAPACITY:transport' } },
  // 5. Resilience
  { id: 's25', phase: 'resilience', actor: KHALED, title: L('خالد يبلّغ عن تعطل حقيبة الإصابات', 'Khaled reports trauma kit failure'), cmd: { type: 'REPORT_RESOURCE_ISSUE', resourceId: 'TK-02', status: 'out_of_service', note: L('ختم الحقيبة مكسور ومحتوياتها ناقصة', 'Seal broken, contents incomplete') } },
  { id: 's26', phase: 'resilience', actor: M, title: L('اعتماد البديل المقترح TK-03', 'Approve suggested alternative TK-03'), cmd: { type: 'APPROVE_SUGGESTION', alertId: 'RESOURCE_NOT_READY:TK-02:T-2' } },
  // 6. Citizen participation
  { id: 's27', phase: 'citizen', actor: M, title: L('إصدار توجيه رسمي محاكى متعدد اللغات', 'Issue simulated multilingual directive'), cmd: { type: 'ISSUE_DIRECTIVE', ...DIRECTIVE_1 } },
  { id: 's28', phase: 'citizen', actor: CIT, title: L('مواطن يؤكد الاطلاع والالتزام', 'Citizen confirms and complies'), cmd: { type: 'ACK_DIRECTIVE', directiveId: 'DIR-1' } },
  { id: 's29', phase: 'citizen', actor: CIT, title: L('تأكيدات اصطناعية من حضور آخرين', 'Synthetic acknowledgements from other attendees'), cmd: { type: 'ACK_DIRECTIVE', directiveId: 'DIR-1', count: 41 } },
  { id: 's30', phase: 'citizen', actor: SARA, title: L('تحديث ميداني من سارة', 'Field update from Sara'), cmd: { type: 'UPDATE_TASK', taskId: 'T-1', note: L('تمت مساندة 5 إصابات طفيفة وتسليمها للفريق الطبي', '5 minor injuries supported and handed to medical team') } },
  { id: 's31', phase: 'citizen', actor: SARA, title: L('سارة تسلّم المهمة', 'Sara delivers the task'), cmd: { type: 'DELIVER_TASK', taskId: 'T-1' } },
  { id: 's32', phase: 'citizen', actor: KHALED, title: L('خالد يسلّم المهمة', 'Khaled delivers the task'), cmd: { type: 'DELIVER_TASK', taskId: 'T-2' } },
  { id: 's33', phase: 'citizen', actor: BUS, title: L('الشريك يكمل النقل', 'Partner completes transport'), cmd: { type: 'FULFILL_SUPPORT', requestId: 'SR-1' } },
  // 7. Recovery
  { id: 's34', phase: 'recovery', actor: M, title: L('الانتقال إلى التعافي', 'Move to recovery'), cmd: { type: 'START_RECOVERY' } },
  { id: 's35', phase: 'recovery', actor: M, title: L('إغلاق مهمة الإسعاف الأولي', 'Close first-aid task'), cmd: { type: 'CLOSE_TASK', taskId: 'T-1' } },
  { id: 's36', phase: 'recovery', actor: M, title: L('إغلاق مهمة نقطة التجميع', 'Close collection-point task'), cmd: { type: 'CLOSE_TASK', taskId: 'T-2' } },
  { id: 's37', phase: 'recovery', actor: M, title: L('إغلاق مهمة الشريك', 'Close partner task'), cmd: { type: 'CLOSE_TASK', taskId: 'T-SR-1' } },
  { id: 's38', phase: 'recovery', actor: M, title: L('إصدار تقرير الأداء من السجل', 'Generate performance report from log'), cmd: { type: 'GENERATE_REPORT' } },
  { id: 's39', phase: 'recovery', actor: M, title: L('إجراء تحسين بمسؤول وموعد متابعة', 'Improvement action with owner and due date'), cmd: { type: 'ADD_IMPROVEMENT', improvementId: 'IMP-1', text: L('إضافة فحص شهري لختم حقائب الإصابات ومحتوياتها', 'Add monthly seal-and-contents check for trauma kits'), owner: L('مسؤول التأهب — جهة الإسعاف (افتراضية)', 'Readiness officer — Ambulance Service (fictional)'), dueInDays: 30, source: L('تنبيه تعطل TK-02 أثناء الحدث', 'TK-02 failure alert during incident') } },
  { id: 's40', phase: 'recovery', actor: M, title: L('إغلاق ملف الحدث', 'Close the incident file'), cmd: { type: 'CLOSE_INCIDENT' } },
];

/** Run the scenario up to (and including) step index `upTo`. Throws on refusal so drift is caught. */
export function runScenario(upTo = SCENARIO.length - 1, from: WorldState = createSeed()): WorldState {
  let s = from;
  for (let i = 0; i <= upTo && i < SCENARIO.length; i++) {
    const step = SCENARIO[i];
    const res = apply(s, step.actor, step.cmd);
    if (!res.ok) throw new Error(`Scenario step ${step.id} refused: ${res.error.code} ${res.error.message.en}`);
    s = res.state;
  }
  return s;
}
