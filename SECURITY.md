<div dir="rtl">

# سياسة الأمان

## طبيعة المشروع
«حدث» نموذج محاكاة يعمل في المتصفح ببيانات اصطناعية، دون خادم أو حسابات أو بيانات شخصية. **لا تستخدمه في طوارئ حقيقية.**

## الإبلاغ عن ثغرة
- **لا تفتح Issue عامًا** لثغرة أمنية.
- استخدم ميزة «Report a vulnerability» (GitHub Private Vulnerability Reporting) في المستودع، أو راسل المشرفين على العنوان الذي يُحدد عند النشر: `security@<يُحدد عند النشر>`.
- اذكر الوصف وخطوات إعادة الإنتاج والأثر المحتمل.
- نهدف إلى الرد خلال 7 أيام.

## ما يهمنا تحديدًا
- أي طريق يتيح لدور الوصول إلى بيانات أو أوامر خارج صلاحياته (`engine.ts`، `views.ts`).
- أي طريق يؤدي إلى إسناد تلقائي لمنطقة خطر أو تجاوز قيود السلامة.
- أسرار أو مفاتيح وصول دخلت المستودع بالخطأ.
- ثغرات في الاعتماديات.

## ممارسات المستودع
- لا أسرار في الكود أو الإعدادات؛ ملفات `.env` مستبعدة في `.gitignore`.
- الاعتماديات قليلة ومثبتة بملف القفل؛ شغّل `npm audit` دوريًا.

</div>

---

# Security policy (English)

HADATH is a browser-only simulation with synthetic data and no server, accounts or personal data — do not use it in real emergencies. Do **not** open public issues for vulnerabilities; use GitHub Private Vulnerability Reporting or the maintainers' address set at publication. We aim to respond within 7 days. Of particular interest: role-permission or projection bypasses, any path to automatic hazard-zone assignment, leaked secrets, and dependency vulnerabilities.
