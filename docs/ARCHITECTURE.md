<div dir="rtl">

# المعمارية

تطبيق ويب أحادي الصفحة يعمل كاملًا في المتصفح، دون خادم أو قاعدة بيانات أو خدمات خارجية، لتسهيل التشغيل والمساهمة.

```
src/
  domain/            ← منطق المجال النقي (TypeScript بلا React) — قابل للاختبار وإعادة الاستخدام
    types.ts         نموذج البيانات
    seed.ts          البيانات الاصطناعية الأولية
    commands.ts      الأوامر ومصفوفة الصلاحيات
    engine.ts        apply(state, actor, command) → حالة جديدة أو رفض مُعلّل
    rules.ts         شروط مشتركة (المؤهلات، التصاريح، التخصيص، البديل الأقرب)
    gaps.ts          محرك الفجوات (قواعد شفافة)
    metrics.ts       المؤشرات المحسوبة من السجل
    views.ts         إسقاطات الأدوار (ما يراه كل دور)
    sync.ts          نموذج الاتصال وفقده وطابور الإجراءات
    scenario.ts      السيناريو الاصطناعي القابل لإعادة التشغيل
  i18n/i18n.tsx      اللغة والاتجاه وتسميات مشتركة
  ui/                واجهات React لكل دور + الخريطة + «عين الحدث» + مشغّل السيناريو
tests/               اختبارات Vitest للمجال
recordings/          خط إنتاج فيديو المحاكاة (Playwright + Piper + ffmpeg)
```

## المبادئ

1. **ملف حدث واحد.** كل الأدوار تقرأ من الحالة نفسها `WorldState.incident`. عمل الشريك مثلًا يتحول إلى مهمة في الملف نفسه.
2. **كل تغيير أمر.** الواجهة لا تعدّل الحالة مباشرة؛ ترسل `Command` مع `Actor` إلى `apply()` التي تتحقق من الصلاحية والملكية والشروط، ثم تضيف سطرًا إلى السجل. الرفض يعود برسالة عربية/إنجليزية تظهر للمستخدم.
3. **الإسقاطات تحمي البيانات.** واجهة المواطن تُبنى من `citizenView()` فقط، والشريك من `partnerView()`، والمستجيب من `responderView()`. الاختبارات تتأكد أن إسقاط المواطن لا يحوي مهام أو مستجيبين أو موارد تشغيلية.
4. **الحتمية.** ساعة المحاكاة جزء من الحالة؛ كل أمر يستغرق دقيقة محاكاة. لا عشوائية في المجال. نفس الأوامر ← نفس الحالة.
5. **القرار بشري.** محرك الفجوات يقرأ الحالة ولا يغيّرها. أمر `APPROVE_SUGGESTION` يأخذ البديل من المحرك نفسه (لا من الواجهة) ويُنفّذه باسم مدير الحدث، ويُسجَّل قرارًا مرتبطًا بالتنبيه.
6. **الانقطاع صريح.** عند فقد الاتصال تتجمد الواجهة على آخر لقطة متزامنة مع شارة «غير مباشر» وآخر وقت تحديث، وتُحفظ الإجراءات في طابور تُعاد عبر `apply()` عند العودة وقد تُرفض.

## اللغات

النصوص مكتوبة كأزواج عربي/إنجليزي بجوار موضع استخدامها `t('…','…')`، والبيانات تحمل `{ ar, en }`. التوجيهات العامة تحمل ثلاث لغات (`ar`، `en`، `ur`). لإضافة لغة: وسّع النوع `L` و`Lang`، وانقل النصوص إلى فهارس مستقلة (مهمة مساهمة مقترحة).

## خيارات تقنية وافتراضات

- React 19 + Vite + TypeScript: شائعة وسهلة الصيانة. لا مكتبات حالة أو توجيه؛ الحالة في `StoreProvider`.
- Vitest للاختبارات، وplaywright-core لتسجيل الفيديو فقط.
- الخطوط مضمّنة محليًا عبر Fontsource (OFL-1.1) لتعمل دون إنترنت.
- التوقيت يُعرض بتوقيت UTC لضمان تطابق إعادة التشغيل في كل مكان.
- لا مصادقة: اختيار الدور من التبويبات لأغراض العرض. في نظام حقيقي يُستبدل ذلك بهوية موثقة وصلاحيات من الخادم.

</div>

---

# Architecture (English)

A single-page web app that runs fully in the browser — no server, database or external services. `src/domain` is pure TypeScript (no React): `apply(state, actor, command)` validates role permission, ownership and preconditions, mutates a cloned state and appends to the log; refusals return bilingual reasons. Role projections in `views.ts` decide what each role receives (the citizen projection carries no tasks, responders or operational resources — enforced by tests). The gap engine (`gaps.ts`) is read-only; `APPROVE_SUGGESTION` executes the engine's own proposal as the incident manager and records a decision linked to the alert. Connectivity loss freezes the view on the last synced snapshot, labels it stale with its time, and queues actions that are replayed through `apply()` on reconnect (and may be refused). The simulated clock lives in state; each command takes one simulated minute; the scenario is deterministic.
