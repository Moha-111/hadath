// Synthetic seed data. All organisations, people, places and equipment are
// fictional. Do not replace with real people, real facilities or real victims.
import type { WorldState } from './types';
import { addMinutes } from './time';

/** Simulation start (simulated clock, displayed in UTC). */
export const T0 = '2026-03-01T08:30:00.000Z';

const daysAgo = (d: number) => addMinutes(T0, -d * 24 * 60);
const daysAhead = (d: number) => addMinutes(T0, d * 24 * 60);

export function createSeed(): WorldState {
  return {
    now: T0,
    seq: 0,
    orgs: [
      { id: 'emc', type: 'government', name: { ar: 'مركز إدارة الطوارئ (افتراضي)', en: 'Emergency Management Centre (fictional)' }, mandate: { ar: 'قيادة الحدث والتنسيق', en: 'Incident command and coordination' } },
      { id: 'ems', type: 'government', name: { ar: 'جهة الإسعاف (افتراضية)', en: 'Ambulance Service (fictional)' }, mandate: { ar: 'الرعاية الإسعافية والنقل الطبي', en: 'Pre-hospital care and medical transport' } },
      { id: 'civil', type: 'government', name: { ar: 'جهة الحماية المدنية (افتراضية)', en: 'Civil Protection (fictional)' }, mandate: { ar: 'البحث والإنقاذ وتأمين الموقع', en: 'Search, rescue and site safety' } },
      { id: 'police', type: 'government', name: { ar: 'جهة الأمن والمرور (افتراضية)', en: 'Security & Traffic (fictional)' }, mandate: { ar: 'الطوق الأمني ومسارات الطوارئ', en: 'Cordon and emergency lanes' } },
      { id: 'p-transport', type: 'private', name: { ar: 'شركة نقل الواحة (خيالية)', en: 'Oasis Transport Co. (fictional)' }, mandate: { ar: 'نقل جماعي', en: 'Mass transport' } },
      { id: 'p-supply', type: 'private', name: { ar: 'مجموعة إمداد الصحراء (خيالية)', en: 'Desert Supply Group (fictional)' }, mandate: { ar: 'إمداد ولوجستيات', en: 'Supply and logistics' } },
      { id: 'p-care', type: 'private', name: { ar: 'عيادات الرعاية المتنقلة (خيالية)', en: 'Mobile Care Clinics (fictional)' }, mandate: { ar: 'رعاية غير طارئة', en: 'Non-emergency care' } },
      { id: 'p-comms', type: 'private', name: { ar: 'شركة شبكة الاتصال (خيالية)', en: 'NetLink Communications (fictional)' }, mandate: { ar: 'اتصالات ميدانية', en: 'Field communications' } },
      { id: 'community', type: 'community', name: { ar: 'فريق المستجيبين المجتمعيين', en: 'Community Responder Team' }, mandate: { ar: 'مساندة ضمن التأهيل وفي المناطق الآمنة', en: 'Support within qualification, safe zones only' } },
    ],
    resources: [
      { id: 'AED-01', kind: 'aed', name: { ar: 'مزيل رجفان — البهو الرئيسي', en: 'AED — main lobby' }, ownerId: 'ems', status: 'ready', lastCheckedAt: daysAgo(12), checkedBy: { ar: 'م. الجاهزية — ليلى', en: 'Readiness officer — Layla' }, access: { ar: 'متاح للعموم 24/7', en: 'Public, 24/7' }, pos: { x: 50, y: 52 }, capacity: 1 },
      { id: 'AED-02', kind: 'aed', name: { ar: 'مزيل رجفان — البوابة الشرقية', en: 'AED — east gate' }, ownerId: 'ems', status: 'ready', lastCheckedAt: daysAgo(140), checkedBy: { ar: 'م. الجاهزية — ليلى', en: 'Readiness officer — Layla' }, access: { ar: 'خلال ساعات الفعالية', en: 'During event hours' }, pos: { x: 90, y: 30 }, capacity: 1 },
      { id: 'AED-03', kind: 'aed', name: { ar: 'مزيل رجفان — ساحة المطاعم', en: 'AED — food court' }, ownerId: 'ems', status: 'maintenance', lastCheckedAt: daysAgo(3), checkedBy: { ar: 'فني الصيانة — عمر', en: 'Technician — Omar' }, access: { ar: 'متاح للعموم', en: 'Public' }, pos: { x: 22, y: 46 }, capacity: 1 },
      { id: 'TK-01', kind: 'trauma_kit', name: { ar: 'حقيبة إصابات — المدخل الشمالي', en: 'Trauma kit — north entry' }, ownerId: 'ems', status: 'ready', lastCheckedAt: daysAgo(20), checkedBy: { ar: 'م. الجاهزية — ليلى', en: 'Readiness officer — Layla' }, access: { ar: 'خزانة مقفلة — رمز للفريق', en: 'Locked cabinet — team code' }, pos: { x: 40, y: 10 }, capacity: 1 },
      { id: 'TK-02', kind: 'trauma_kit', name: { ar: 'حقيبة إصابات — نقطة التجميع', en: 'Trauma kit — collection point' }, ownerId: 'ems', status: 'ready', lastCheckedAt: daysAgo(25), checkedBy: { ar: 'م. الجاهزية — ليلى', en: 'Readiness officer — Layla' }, access: { ar: 'مع فريق الإسعاف', en: 'With ambulance team' }, pos: { x: 64, y: 28 }, capacity: 1 },
      { id: 'TK-03', kind: 'trauma_kit', name: { ar: 'حقيبة إصابات — منطقة التمركز', en: 'Trauma kit — staging area' }, ownerId: 'ems', status: 'ready', lastCheckedAt: daysAgo(6), checkedBy: { ar: 'م. الجاهزية — ليلى', en: 'Readiness officer — Layla' }, access: { ar: 'منطقة التمركز', en: 'Staging area' }, pos: { x: 74, y: 48 }, capacity: 1 },
      { id: 'BC-01', kind: 'bleeding_kit', name: { ar: 'محطة السيطرة على النزيف — البوابة (أ)', en: 'Bleeding control station — gate A' }, ownerId: 'ems', status: 'ready', lastCheckedAt: daysAgo(30), checkedBy: { ar: 'م. الجاهزية — ليلى', en: 'Readiness officer — Layla' }, access: { ar: 'متاحة للعموم — صندوق مكسور الختم', en: 'Public — break-seal box' }, pos: { x: 12, y: 30 }, capacity: 1 },
      { id: 'BC-02', kind: 'bleeding_kit', name: { ar: 'محطة السيطرة على النزيف — الممر الغربي', en: 'Bleeding control station — west corridor' }, ownerId: 'ems', status: 'not_ready', lastCheckedAt: daysAgo(15), checkedBy: { ar: 'م. الجاهزية — ليلى', en: 'Readiness officer — Layla' }, access: { ar: 'متاحة للعموم', en: 'Public' }, pos: { x: 8, y: 52 }, capacity: 1 },
      { id: 'AMB-1', kind: 'ambulance', name: { ar: 'إسعاف 1', en: 'Ambulance 1' }, ownerId: 'ems', status: 'ready', lastCheckedAt: daysAgo(1), checkedBy: { ar: 'طاقم الإسعاف', en: 'Ambulance crew' }, access: { ar: 'منطقة التمركز', en: 'Staging' }, pos: { x: 80, y: 54 }, capacity: 2 },
      { id: 'AMB-2', kind: 'ambulance', name: { ar: 'إسعاف 2', en: 'Ambulance 2' }, ownerId: 'ems', status: 'ready', lastCheckedAt: daysAgo(1), checkedBy: { ar: 'طاقم الإسعاف', en: 'Ambulance crew' }, access: { ar: 'منطقة التمركز', en: 'Staging' }, pos: { x: 86, y: 54 }, capacity: 2 },
      { id: 'BUS-1', kind: 'transport', name: { ar: 'حافلة نقل 1 (شريك)', en: 'Transport bus 1 (partner)' }, ownerId: 'p-transport', status: 'ready', lastCheckedAt: daysAgo(2), checkedBy: { ar: 'شركة نقل الواحة', en: 'Oasis Transport' }, access: { ar: 'إشعار 20 دقيقة', en: '20-min notice' }, pos: { x: 94, y: 8 }, capacity: 40 },
      { id: 'BUS-2', kind: 'transport', name: { ar: 'حافلة نقل 2 (شريك)', en: 'Transport bus 2 (partner)' }, ownerId: 'p-transport', status: 'ready', lastCheckedAt: daysAgo(2), checkedBy: { ar: 'شركة نقل الواحة', en: 'Oasis Transport' }, access: { ar: 'إشعار 20 دقيقة', en: '20-min notice' }, pos: { x: 94, y: 16 }, capacity: 40 },
      { id: 'LOG-1', kind: 'logistics', name: { ar: 'شاحنة مياه وبطانيات (شريك)', en: 'Water & blankets truck (partner)' }, ownerId: 'p-supply', status: 'ready', lastCheckedAt: daysAgo(41), checkedBy: { ar: 'مجموعة إمداد الصحراء', en: 'Desert Supply' }, access: { ar: 'إشعار 45 دقيقة', en: '45-min notice' }, pos: { x: 6, y: 8 }, capacity: 500 },
      { id: 'CARE-1', kind: 'care', name: { ar: 'عيادة متنقلة (شريك)', en: 'Mobile clinic (partner)' }, ownerId: 'p-care', status: 'ready', lastCheckedAt: daysAgo(4), checkedBy: { ar: 'عيادات الرعاية المتنقلة', en: 'Mobile Care Clinics' }, access: { ar: 'إشعار 30 دقيقة', en: '30-min notice' }, pos: { x: 30, y: 56 }, capacity: 20 },
    ],
    responders: [
      {
        id: 'R-sara', kind: 'community', agencyId: 'community', name: { ar: 'سارة (مستجيبة مجتمعية)', en: 'Sara (community responder)' }, available: false, clearance: 'cold',
        qualifications: [
          { code: 'first_aid', issuedAt: daysAgo(200), expiresAt: daysAhead(530), issuer: { ar: 'برنامج تدريب افتراضي', en: 'Fictional training programme' } },
        ],
      },
      {
        id: 'R-khaled', kind: 'professional', agencyId: 'ems', name: { ar: 'خالد (مسعف)', en: 'Khaled (paramedic)' }, available: true, clearance: 'warm',
        qualifications: [
          { code: 'paramedic', issuedAt: daysAgo(900), expiresAt: daysAhead(200), issuer: { ar: 'جهة الإسعاف (افتراضية)', en: 'Ambulance Service (fictional)' } },
          { code: 'mci_triage_support', issuedAt: daysAgo(100), expiresAt: daysAhead(630), issuer: { ar: 'جهة الإسعاف (افتراضية)', en: 'Ambulance Service (fictional)' } },
        ],
      },
      {
        id: 'R-fahd', kind: 'community', agencyId: 'community', name: { ar: 'فهد (مستجيب مجتمعي)', en: 'Fahd (community responder)' }, available: true, clearance: 'cold',
        qualifications: [
          { code: 'first_aid', issuedAt: daysAgo(800), expiresAt: daysAgo(70), issuer: { ar: 'برنامج تدريب افتراضي', en: 'Fictional training programme' } },
        ],
      },
      {
        id: 'R-noura', kind: 'community', agencyId: 'community', name: { ar: 'نورة (مستجيبة مجتمعية)', en: 'Noura (community responder)' }, available: true, clearance: 'cold',
        qualifications: [
          { code: 'crowd_guidance', issuedAt: daysAgo(60), expiresAt: daysAhead(670), issuer: { ar: 'برنامج تدريب افتراضي', en: 'Fictional training programme' } },
        ],
      },
    ],
    capabilities: [
      { id: 'CAP-T1', partnerId: 'p-transport', kind: 'transport', title: { ar: 'حافلتا نقل جماعي', en: 'Two mass-transport buses' }, capacity: 80, unit: { ar: 'مقعد', en: 'seats' }, conditions: { ar: 'إشعار 20 دقيقة · داخل نطاق المدينة · سائق مدرّب · لا تدخل مناطق الخطر', en: '20-min notice · within city limits · trained driver · never enters hazard zones' }, activationNoticeMin: 20, readiness: 'ready', updatedAt: daysAgo(2), resourceIds: ['BUS-1', 'BUS-2'] },
      { id: 'CAP-L1', partnerId: 'p-supply', kind: 'logistics', title: { ar: 'مياه وبطانيات', en: 'Water and blankets' }, capacity: 500, unit: { ar: 'وحدة', en: 'units' }, conditions: { ar: 'إشعار 45 دقيقة · نهارًا فقط', en: '45-min notice · daytime only' }, activationNoticeMin: 45, readiness: 'ready', updatedAt: daysAgo(41), resourceIds: ['LOG-1'] },
      { id: 'CAP-C1', partnerId: 'p-care', kind: 'care', title: { ar: 'عيادة رعاية غير طارئة', en: 'Non-emergency care clinic' }, capacity: 20, unit: { ar: 'مراجع/ساعة', en: 'patients/hour' }, conditions: { ar: 'للحالات الطفيفة فقط · بقرار من الجهة الصحية', en: 'Minor cases only · on health-authority decision' }, activationNoticeMin: 30, readiness: 'ready', updatedAt: daysAgo(4), resourceIds: ['CARE-1'] },
    ],
    plans: [
      { id: 'PL-1', title: { ar: 'خطة الاستجابة للحوادث متعددة الإصابات', en: 'Mass-casualty response plan' }, owner: { ar: 'مركز إدارة الطوارئ', en: 'Emergency Management Centre' }, lastReviewedAt: daysAgo(120), reviewEveryDays: 365 },
      { id: 'PL-2', title: { ar: 'خطة إخلاء مجمّع الواحة الخيالي', en: 'Fictional Oasis Complex evacuation plan' }, owner: { ar: 'جهة الحماية المدنية', en: 'Civil Protection' }, lastReviewedAt: daysAgo(400), reviewEveryDays: 365 },
      { id: 'PL-3', title: { ar: 'بروتوكول تفعيل الشركاء', en: 'Partner activation protocol' }, owner: { ar: 'مركز إدارة الطوارئ', en: 'Emergency Management Centre' }, lastReviewedAt: daysAgo(30), reviewEveryDays: 180 },
    ],
    exercises: [
      { id: 'EX-1', title: { ar: 'تمرين مكتبي: انهيار مدرج مؤقت', en: 'Tabletop: temporary stand collapse' }, at: daysAgo(45), kind: 'tabletop', openFindings: 2, publicSeats: 0, publicRegistered: 0 },
      { id: 'EX-2', title: { ar: 'تمرين ميداني مفتوح للمجتمع: إفساح مسارات الطوارئ', en: 'Community field drill: clearing emergency lanes' }, at: daysAhead(21), kind: 'drill', openFindings: 0, publicSeats: 60, publicRegistered: 23 },
    ],
    courses: [
      { id: 'C-STOP', title: { ar: 'السيطرة على النزيف (للمجتمع)', en: 'Stop the bleed (community)' }, grants: 'stop_bleed', validityDays: 730, publicOpen: true },
      { id: 'C-AED', title: { ar: 'الإنعاش القلبي واستخدام مزيل الرجفان', en: 'CPR & AED use' }, grants: 'aed_cpr', validityDays: 730, publicOpen: true },
      { id: 'C-CROWD', title: { ar: 'إرشاد الحشود وإفساح المسارات', en: 'Crowd guidance & lane clearing' }, grants: 'crowd_guidance', validityDays: 730, publicOpen: true },
    ],
    reports: [],
    directives: [],
    incident: undefined,
    log: [],
    handledAlerts: {},
    alertFirstSeen: {},
  };
}
