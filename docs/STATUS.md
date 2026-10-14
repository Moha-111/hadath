<div dir="rtl">

# المنفّذ والمحاكى والمقترح مستقبلًا

## ✅ منفّذ (يعمل في الكود ومغطّى بالاختبارات حيث يلزم)

| الميزة | الموضع |
|---|---|
| ملف حدث موحّد بالحقول العشرة (الموقف، الأهداف، القيادة، الجهات، المهام، الموارد، القرارات، طلبات الدعم، السجل، التعافي) | `types.ts`، `ManagerView.tsx` |
| خمس واجهات أدوار مترابطة على الحالة نفسها، مع إسقاطات بيانات لكل دور | `ui/*View.tsx`، `views.ts` |
| مصفوفة صلاحيات وفحوص ملكية وسلامة (مناطق مغلقة، تصاريح، منع إسناد المجتمعي لمنطقة الخطر) | `commands.ts`، `engine.ts` |
| منع ازدواجية تخصيص المستجيبين والموارد | `engine.ts`، `tests/allocation.test.ts` |
| محرك فجوات بست قواعد شفافة مع الأدلة والبديل واعتماد بشري | `gaps.ts`، `tests/gaps.test.ts` |
| سيناريو مرونة: تعطل حقيبة إصابات وتفعيل البديل الأقرب | `scenario.ts` |
| حالة انقطاع الاتصال: تجميد على آخر لقطة، وسم «غير مباشر»، طابور إجراءات وإعادة تحقق عند العودة | `sync.ts`، `tests/sync.test.ts` |
| تقرير أداء من سجل المحاكاة فقط، وإجراءات تحسين بمسؤول وموعد | `metrics.ts` |
| واجهة عربية RTL مع تحويل للإنجليزية، وتوجيهات المواطن بثلاث لغات | `i18n.tsx`، `CitizenView.tsx` |
| سيناريو حتمي قابل لإعادة التشغيل من الواجهة أو سطر الأوامر | `scenario.ts`، `npm run scenario` |

## 🧪 محاكى (يبدو حقيقيًا في العرض لكنه ليس كذلك)

- جميع الجهات والأشخاص والمعدات والمنشأة («مجمّع الواحة» خيالي) والأرقام.
- التوجيهات «الرسمية» وتأكيدات الالتزام (منها 41 تأكيدًا اصطناعيًا مولّدًا في السيناريو).
- «عين الحدث»: رسم برمجي، لا كاميرا ولا درون ولا بث.
- الاتصال وفقده: مفتاح في الواجهة، لا شبكة حقيقية.
- البادج: عرض تجريبي، ليس وثيقة اعتماد.
- الساعة: ساعة محاكاة، كل إجراء دقيقة.
- الهوية: اختيار الدور بالتبويب دون تسجيل دخول.

## 🔭 مقترح مستقبلًا (غير منفّذ)

- خادم ومزامنة متعددة المستخدمين في الوقت الحقيقي، ومصادقة وتفويض من الخادم، وسجل تدقيق موقّع.
- عمل دون اتصال حقيقي (Service Worker + تخزين محلي) مع حل التعارضات.
- تكاملات مع منصات حكومية وخدمات طوارئ وأنظمة جهات — انظر [INTEGRATIONS_FUTURE.md](INTEGRATIONS_FUTURE.md).
- خرائط حقيقية بعد موافقة أصحاب البيانات، وطبقات GIS.
- نماذج بيانات قياسية (مثل EDXL / CAP للتنبيهات العامة) — للدراسة.
- تقييم علمي للأداء بتصميم تجريبي وتمارين حقيقية بموافقات أخلاقية.
- إمكانية الوصول (WCAG 2.2) واختبارات قارئ الشاشة.

</div>

---

**English summary.** *Implemented:* unified incident file, five linked role views with data projections, permission matrix and safety checks, double-allocation prevention, six-rule transparent gap engine with evidence and human approval, resource-failure failover, explicit offline state with queued replay, log-derived report and owned improvement actions, Arabic RTL + English, three-language directives, deterministic replayable scenario. *Simulated:* all organisations, people, equipment, the facility and numbers; official directives and acknowledgements; Event Eye; connectivity; badge; clock; identity. *Proposed:* server/multi-user sync and auth, real offline support, government/agency integrations, real maps, standards (EDXL/CAP), scientific evaluation, accessibility audit.
