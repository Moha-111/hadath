<div dir="rtl">

# محرك فجوات الجاهزية والاستجابة

**مجموعة قواعد مكتوبة، حتمية، قابلة للفهم — وليست نموذج تنبؤ متعلمًا.** الكود في [`src/domain/gaps.ts`](../src/domain/gaps.ts) والحدود في [`rules.ts`](../src/domain/rules.ts).

كل تنبيه يعرض: القاعدة التي أطلقته، **السبب** بلغة واضحة، **البيانات** التي بُني عليها (معرّفات وأوقات وقيم)، و**بديلًا مقترحًا** إن أمكن. لا يُنفَّذ البديل إلا إذا اعتمده مدير الحدث، ويُسجَّل الاعتماد قرارًا مرتبطًا بالتنبيه.

| القاعدة | متى تُطلق | البديل المقترح |
|---|---|---|
| `TASK_NOT_ACCEPTED` | مهمة مُسندة لم تُقبل خلال 3 دقائق محاكاة، أو رُفضت | إعادة الإسناد لأول مستجيب مؤهل ومتاح وذي تصريح |
| `RESOURCE_NOT_READY` | مورد حالته ليست «جاهز». حرج إذا كان مخصّصًا لمهمة نشطة | فكّ التخصيص وتخصيص أقرب مورد جاهز من النوع نفسه، غير مخصّص وفحصه حديث |
| `STALE_INFORMATION` | آخر فحص لمعدّة أقدم من 90 يومًا، أو آخر تحديث لقدرة شريك أقدم من 30 يومًا | فحص ميداني / طلب تأكيد الجاهزية من الشريك |
| `DOUBLE_ALLOCATION` | مورد أو مستجيب مخصّص لأكثر من مهمة نشطة (للبيانات المستوردة؛ المحرك الأساسي يمنعه أصلًا) | فكّ التخصيص عن المهمة الأحدث وتخصيص بديل |
| `QUALIFICATION_MISMATCH` | المستجيب المُسند ينقصه مؤهل ساري أو تصريح المنطقة | إعادة الإسناد لمستجيب مؤهل |
| `DEMAND_EXCEEDS_CAPACITY` | الاحتياج المعلن يتجاوز مجموع السعة الجاهزة، أو طلب دعم يتجاوز سعة القدرة | دورات متعددة بالسعة الحالية مع طلب سعة احتياطية |

## لماذا قواعد؟

في الطوارئ يجب أن يفهم المسؤول سبب التنبيه فورًا وأن يتحقق منه. القواعد هنا قابلة للمراجعة من الممارسين وقابلة للاختبار (`tests/gaps.test.ts`). أي توسّع مستقبلي نحو نماذج إحصائية يتطلب تقييمًا علميًا منفصلًا ولا يجوز وصفه بغير حقيقته.

## إضافة قاعدة

1. أضف معرّفها إلى `RuleId` ووصفها إلى `RULE_DOCS`.
2. أضف كتلة في `evaluateGaps()` تنتج `Alert` بمعرّف ثابت `RULE:entity`، وسبب، وأدلة، وبديل (أوامر يملكها المدير فقط).
3. أضف اختبارًا في `tests/gaps.test.ts` يغطي الإطلاق وعدم الإطلاق.

</div>

---

**English:** a set of written, deterministic, explainable rules — **not a learned predictive model**. Each alert shows the rule, a plain-language reason, the exact data used, and an alternative that only the incident manager can approve (recorded as a decision linked to the alert). Rules: task not accepted (3 sim-min) or declined; resource not ready (critical when allocated → nearest ready same-kind alternative); stale information (equipment > 90 days, partner capability > 30 days); double allocation (defensive, for imported data); qualification/clearance mismatch; demand exceeding ready capacity.
