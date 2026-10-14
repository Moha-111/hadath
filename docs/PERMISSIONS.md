<div dir="rtl">

# الصلاحيات

تُطبّق الصلاحيات على مستويين في [`engine.ts`](../src/domain/engine.ts): **مصفوفة الأدوار** (`PERMISSIONS` في `commands.ts`) ثم **فحوص على مستوى الكائن** (الملكية والحالة والسلامة). وتُطبَّق **إسقاطات القراءة** في `views.ts`.

| الأمر | مدير الحدث | الجاهزية | الشريك | المستجيب | المواطن |
|---|:-:|:-:|:-:|:-:|:-:|
| التحقق من بلاغ / إنشاء ملف حدث / أهداف / مناطق | ✓ | | | | |
| إنشاء مهمة / إسناد / تخصيص مورد | ✓ | | | | |
| رفع طلب دعم / اعتماده | ✓ | | | | |
| اعتماد بديل أو تجاهل تنبيه | ✓ | | | | |
| إصدار توجيه عام | ✓ | | | | |
| التعافي وتقرير الأداء والإغلاق | ✓ | | | | |
| إجراء تحسين | ✓ | ✓ | | | |
| فحص مورد / مراجعة خطة / اعتماد تدريب | | ✓ | | | |
| الإبلاغ عن عطل مورد | | ✓ | | ✓ (موارد مهمته فقط) | |
| تسجيل قدرة / تحديث جاهزيتها | | | ✓ (قدراته فقط) | | |
| قبول التفعيل / تأكيد التنفيذ | | | ✓ (الموجّه إليه فقط) | | |
| التوفر / قبول المهمة / تحديثها / تسليمها | | | | ✓ (مهامه فقط) | |
| بلاغ / تأكيد الالتزام / التسجيل في تمرين | | | | | ✓ |

## قواعد السلامة الثابتة

- لا إسناد إلى منطقة لم يفتحها المدير (`ZONE_NOT_ALLOWED`).
- لا يُسند المستجيب المجتمعي إلى منطقة الخطر إطلاقًا، ولا يُسند أي مستجيب إلى منطقة أعلى من تصريحه (`CLEARANCE`).
- لا إسناد لمستجيب غير متاح أو مكلّف بمهمة نشطة أخرى (`UNAVAILABLE`، `DOUBLE_ALLOCATION`).
- لا تخصيص لمورد غير جاهز أو مخصّص لمهمة نشطة أخرى (`RESOURCE_NOT_READY`، `DOUBLE_ALLOCATION`).
- عدم توافق المؤهل يُرفض افتراضيًا؛ ويمكن للمدير تجاوزه بإقرار صريح، فيظهر تنبيه دائم حتى يُعالج.
- لا شيء يُسند تلقائيًا، ولا قرارات علاجية.

## ما يراه كل دور

- **المواطن:** حالة عامة للحدث، التوجيهات، الأصول العامة المنقذة للحياة (AED وحقائب النزيف: الحالة والوصول فقط)، الدورات والتمارين، حالة بلاغه. لا مهام ولا مستجيبين ولا موارد تشغيلية ولا مناطق.
- **الشريك:** قدراته، والطلبات المعتمدة الموجّهة إليها ومهامها فقط.
- **المستجيب:** بادجه ومهامه ومنطقة مهمته ومواردها.
- **الجاهزية والمدير:** الصورة التشغيلية المشتركة.

> نموذج العرض يتيح اختيار الدور من التبويبات. في نظام حقيقي تأتي الهوية والصلاحيات من خادم موثوق، ولا يكفي إخفاء العناصر في الواجهة.

</div>

---

**English:** permissions are enforced in `engine.ts` by a role matrix (`PERMISSIONS`) plus object-level checks (ownership, state, safety), and reads go through role projections in `views.ts`. Fixed safety rules: no assignment into a zone the manager has not opened; community responders never to the hot zone; no assignment beyond clearance; no double allocation of responders or resources; not-ready resources cannot be allocated; qualification mismatch is refused unless explicitly acknowledged (then a standing alert is raised); nothing is auto-assigned; no treatment decisions. In this demo the role is chosen via tabs; a real system needs server-side identity and authorisation.
