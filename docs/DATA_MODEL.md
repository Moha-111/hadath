<div dir="rtl">

# نموذج البيانات

التعريفات الكاملة في [`src/domain/types.ts`](../src/domain/types.ts). كل البيانات اصطناعية.

## ملف الحدث الموحّد `Incident`

| الحقل | المعنى |
|---|---|
| `situation` | الموقف الحالي (نص ثنائي اللغة) |
| `objectives[]` | الأهداف |
| `command` | الجهة القائدة ومدير الحدث ومركز القيادة |
| `participatingOrgIds[]` | الجهات المشاركة (لكل جهة `mandate` يحدد اختصاصها) |
| `zones[]` | مناطق العمل: `hot` / `warm` / `cold` مع `allowed` (فتحها قرار المدير) |
| `needs[]` | الاحتياجات المقدّرة (مثل مقاعد النقل) |
| `tasks[]` | المهام: المؤهلات المطلوبة، الأداة المطلوبة، الموارد المخصّصة، المُسند إليه (مستجيب أو شريك)، الحالة وأوقاتها |
| `supportRequests[]` | طلبات الدعم: النوع، الكمية، القدرة المفعّلة، الحالة وأوقاتها |
| `decisions[]` | القرارات، وقد ترتبط بتنبيه `basedOnAlertId` |
| `recovery` | تقرير الأداء وإجراءات التحسين (مسؤول + موعد متابعة) |

سجل التحديثات `WorldState.log[]` مشترك ومتسلسل، ولكل سطر `actor` و`public` (هل يجوز عرضه للعموم).

## الكيانات الداعمة

- `Resource`: مورد/أداة مع `status`، `lastCheckedAt`، `checkedBy`، `access`، موقع تخطيطي `pos`، و`capacity`.
- `Responder`: مستجيب مع `qualifications[]` (تاريخ إصدار وانتهاء)، `available` (اختياري)، و`clearance` (أعلى منطقة مسموحة؛ المجتمعي `cold` دائمًا).
- `PartnerCapability`: قدرة شريك مع `conditions` و`activationNoticeMin` و`readiness` و`updatedAt` والموارد التي تمثلها.
- `Plan`، `Exercise`، `TrainingCourse`: عناصر التأهب.
- `CitizenReport`، `Directive` (بثلاث لغات مع عدد تأكيدات الالتزام).

## دورات الحالة

- الحدث: `active` ← `recovery` ← `closed` (الإغلاق يتطلب إغلاق كل المهام، وتقرير أداء، وإجراء تحسين واحدًا على الأقل).
- المهمة: `open` ← `assigned` ← `accepted` ← `in_progress` ← `delivered` ← `closed` (أو `declined` ثم إعادة إسناد).
- طلب الدعم: `pending` ← `activated` (اعتماد المدير) ← `accepted` (قبول الشريك) ← `fulfilled`.

</div>

---

**English:** see `src/domain/types.ts`. The `Incident` is the single shared file (situation, objectives, command, organisations, zones, needs, tasks, support requests, decisions, recovery); the log is shared and sequential. Lifecycles: incident `active → recovery → closed` (closing requires all tasks closed, a report and ≥1 improvement with owner and due date); task `open → assigned → accepted → in_progress → delivered → closed` (or `declined`); support request `pending → activated → accepted → fulfilled`.
