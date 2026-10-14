<div dir="rtl">

# التكامل المستقبلي (مقترح — غير منفّذ)

> **تنبيه:** لا توجد في هذا المشروع أي شراكة أو اتفاقية أو اعتماد مع أي جهة حكومية أو تجارية، ولا يستخدم المشروع شعارات أو هويات أي جهة. الأسماء أدناه أمثلة لأنواع تكامل قد تُدرس مستقبلًا عبر القنوات الرسمية وبموافقة الجهات المالكة.

## مبادئ أي تكامل

1. **عبر واجهات رسمية فقط** وبموافقة الجهة المالكة، وبعد مراجعة قانونية وأمنية وحماية بيانات.
2. **أقل قدر من البيانات** يحقق الغرض، وللمدة اللازمة فقط.
3. **لا يغيّر التكامل منطق القرار البشري**؛ البيانات الواردة تمر عبر `apply()` كأوامر قابلة للرفض والتدقيق.
4. **وسم المصدر وزمنه** في كل بيان مستورد، وعرض «قديم» عند تقادمه.

## أمثلة مقترحة

| المجال | مثال | الشكل المقترح في «حدث» | ملاحظات |
|---|---|---|---|
| تطبيقات حكومية موجهة للمواطن | **توكلنا** (مثال فقط) | نشر التوجيهات العامة المعتمدة؛ استقبال تأكيد اطلاع مجهول الهوية | يتطلب موافقة الجهة المالكة ومواصفات رسمية. لا تكامل حاليًا |
| بلاغات الطوارئ | مراكز استقبال البلاغات | استيراد بلاغ كـ `SUBMIT_REPORT` بانتظار التحقق | لا يُنشأ ملف حدث دون تحقق بشري |
| سجلات التدريب والاعتماد | جهات التدريب المعتمدة | مزامنة `qualifications` مع تواريخ الانتهاء | التحقق من صحة الشهادة من المصدر |
| سجلات المعدات | أنظمة صيانة AED والمعدات | تحديث `status` و`lastCheckedAt` آليًا | يبقى الفحص الميداني مرجعًا |
| قدرات القطاع الخاص | أنظمة الشركاء | واجهة لتحديث الجاهزية والسعة وقبول التفعيل | اتفاقيات مستوى خدمة وشروط إتاحة واضحة |
| المصادر المرئية | كاميرات أو درون **تابعة لجهة مخوّلة** | استبدال «عين الحدث» الاصطناعية ببث موسوم المصدر | خصوصية صارمة، لا تعرّف على الوجوه، وصول مقيّد بالدور |
| الخرائط | خرائط أساس وطبقات GIS | استبدال المخطط الاصطناعي | دون نشر مخططات منشآت حساسة |
| معايير التبادل | CAP للتنبيهات العامة، EDXL | تصدير/استيراد | للدراسة |

## نقطة البداية التقنية المقترحة

إضافة طبقة `adapters/` تحوّل الرسائل الخارجية إلى `Command` وتمرّرها بـ `Actor` من نوع جديد `system:<source>` بصلاحيات ضيقة في `PERMISSIONS`، مع اختبارات عقد (contract tests) ببيانات اصطناعية.

</div>

---

**English:** No partnership, agreement or endorsement exists with any government or commercial body, and no logos are used. Any future integration (e.g. a citizen-facing government app such as Tawakkalna, emergency call centres, training registries, equipment maintenance systems, partner systems, authorised camera/drone sources, GIS, CAP/EDXL) must go through official APIs with the owner's approval and legal/security/privacy review, use minimal data, keep decisions human (incoming data enters as refusable, auditable commands), and label source and age. Suggested starting point: an `adapters/` layer mapping external messages to `Command`s under a narrowly-permissioned `system:<source>` actor, with contract tests on synthetic data.
