import { useT } from '../i18n/i18n';
import { Card } from './common';

export const REPO_URL = 'https://github.com/Moha-111/hadath';

export function AboutView() {
  const { t } = useT();
  return (
    <div className="about" data-testid="about">
      <div className="hero">
        <div className="hero-logo">حدث <span>| HADATH</span></div>
        <p className="slogan">{t('جاهزية مشتركة. عمليات موحّدة. استجابة مرنة.', 'Shared readiness. Unified operations. Resilient response.')}</p>
        <p className="principle">{t('المواطن شريك، مستجيب بحسب تأهيله، وملتزم بالتوجيهات.', 'The citizen is a partner, a responder according to their qualification, and committed to directives.')}</p>
      </div>
      <div className="grid3">
        <Card title={t('منفّذ في النموذج', 'Implemented')}>
          <ul className="list">
            <li>{t('ملف حدث موحّد بخمس واجهات أدوار وصلاحيات', 'Unified incident file with five role views and permissions')}</li>
            <li>{t('محرك فجوات بقواعد شفافة واقتراح بدائل لاعتماد بشري', 'Rule-based gap engine with alternatives for human approval')}</li>
            <li>{t('منع ازدواجية التخصيص ومطابقة المؤهلات', 'Double-allocation prevention and qualification matching')}</li>
            <li>{t('حالة انقطاع واضحة مع طابور إجراءات محلي', 'Explicit offline state with local action queue')}</li>
            <li>{t('تقرير أداء محسوب من السجل وإجراءات تحسين', 'Log-derived performance report and improvement actions')}</li>
          </ul>
        </Card>
        <Card title={t('محاكى', 'Simulated')}>
          <ul className="list">
            <li>{t('كل البيانات والجهات والأشخاص والمنشأة', 'All data, organisations, people and the facility')}</li>
            <li>{t('التوجيهات الرسمية وتأكيدات المواطنين', 'Official directives and citizen acknowledgements')}</li>
            <li>{t('«عين الحدث»: مصدر مرئي اصطناعي', '"Event Eye": a synthetic visual source')}</li>
            <li>{t('الاتصال وفقده', 'Connectivity and its loss')}</li>
          </ul>
        </Card>
        <Card title={t('مقترح مستقبلًا', 'Proposed (future)')}>
          <ul className="list">
            <li>{t('تكامل مع تطبيقات حكومية مثل توكلنا عبر واجهات رسمية — بعد موافقات الجهات المختصة', 'Integration with government apps such as Tawakkalna via official APIs — subject to authority approval')}</li>
            <li>{t('بث مرئي من جهة مخوّلة', 'Visual feeds from an authorised agency')}</li>
            <li>{t('خادم ومزامنة متعددة المستخدمين ومصادقة', 'Server, multi-user sync and authentication')}</li>
            <li>{t('تقييم علمي للأداء بالتعاون مع باحثين', 'Scientific performance evaluation with researchers')}</li>
          </ul>
        </Card>
      </div>
      <Card title={t('ساهم في المشروع', 'Contribute')} id="cta">
        <p className="cta">{t('نبحث عن ثلاث مساهمات محددة: مراجعة سيناريو العمليات من الممارسين، تطوير التكاملات التقنية، وتصميم تقييم علمي للأداء.', 'We seek three specific contributions: practitioner review of the operations scenario, building technical integrations, and designing a scientific performance evaluation.')}</p>
        <p className="cta-link" dir="ltr">{REPO_URL} · CONTRIBUTING.md</p>
        <p className="fine">{t('نموذج للبحث والمحاكاة فقط — ليس نظامًا معتمدًا للاستخدام أثناء طوارئ حقيقية، ولا يدّعي شراكة أو اعتمادًا من أي جهة.', 'Research and simulation prototype only — not an approved system for use in real emergencies, and claims no partnership or endorsement.')}</p>
      </Card>
    </div>
  );
}
