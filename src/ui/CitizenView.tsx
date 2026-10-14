import { useState } from 'react';
import { fmtDate, fmtTime } from '../domain/time';
import type { DirectiveLang } from '../domain/types';
import { citizenView } from '../domain/views';
import { useT } from '../i18n/i18n';
import { AssetMap } from './AssetMap';
import { Btn, Card, Empty, Status } from './common';
import { tpl } from './ManagerView';
import { useStore } from './store';

const CIT = { role: 'citizen' as const };
const DLANG: { id: DirectiveLang; label: string; dir: 'rtl' | 'ltr' }[] = [
  { id: 'ar', label: 'العربية', dir: 'rtl' },
  { id: 'en', label: 'English', dir: 'ltr' },
  { id: 'ur', label: 'اردو', dir: 'rtl' },
];

export function CitizenView() {
  const { state, dispatch } = useStore();
  const { t, tx, lang } = useT();
  const v = citizenView(state);
  const [dl, setDl] = useState<DirectiveLang>(lang);
  const [acked, setAcked] = useState<string[]>([]);
  const rep = tpl<'SUBMIT_REPORT'>('s06');
  const [text, setText] = useState(rep.text.ar);
  const sent = v.myReports.length > 0;

  return (
    <div className="grid">
      <div className="col-main">
        {v.incident && v.incident.status !== 'closed' && (
          <div className="public-banner" data-testid="public-banner">
            {t('يوجد حدث نشط في مجمّع الواحة الخيالي. اتبع التوجيهات الرسمية أدناه فقط.', 'An incident is active at the fictional Oasis Complex. Follow only the official directives below.')}
          </div>
        )}
        <Card id="directives" title={t('التعليمات الرسمية (محاكاة)', 'Official instructions (simulated)')} actions={
          <div className="seg" role="group" aria-label="language">
            {DLANG.map((d) => <button key={d.id} className={dl === d.id ? 'on' : ''} onClick={() => setDl(d.id)} data-testid={`dlang-${d.id}`}>{d.label}</button>)}
          </div>
        }>
          {v.directives.length === 0 && <Empty>{t('لا توجد تعليمات حالية.', 'No current instructions.')}</Empty>}
          {v.directives.map((d) => (
            <article key={d.id} className="directive" dir={DLANG.find((x) => x.id === dl)!.dir} lang={dl} data-testid={`directive-${d.id}`}>
              <div className="verified">✔ {t('مصدر موثّق (محاكاة):', 'Verified source (simulated):')} {tx(d.issuer)} · {fmtTime(d.at)}</div>
              <h3>{d.title[dl]}</h3>
              <p>{d.body[dl]}</p>
              {acked.includes(d.id) ? (
                <p className="ok-t" data-testid="ack-done">{t('شكرًا لالتزامك.', 'Thank you for complying.')}</p>
              ) : (
                <Btn tone="ok" testid={`ack-${d.id}`} onClick={() => { if (dispatch(CIT, { type: 'ACK_DIRECTIVE', directiveId: d.id })) setAcked([...acked, d.id]); }}>{t('اطلعت وسألتزم', 'I have read and will comply')}</Btn>
              )}
            </article>
          ))}
        </Card>
        <Card id="citizen-report" title={t('بلاغ مبسّط', 'Simple report')}>
          {sent ? (
            v.myReports.map((r) => <p key={r.id} data-testid={`my-report-${r.id}`}>{t('بلاغك', 'Your report')} {r.id} · {fmtTime(r.at)} · <Status value={r.status} /></p>)
          ) : (
            <div className="form">
              <label>{t('ماذا ترى؟', 'What do you see?')}<textarea value={text} onChange={(e) => setText(e.target.value)} rows={2} /></label>
              <label>{t('أين؟', 'Where?')}<input value={tx(rep.locationHint)} readOnly /></label>
              <Btn testid="submit-report" onClick={() => dispatch(CIT, { ...rep, text: text === rep.text.ar ? rep.text : { ar: text, en: text } })}>{t('إرسال البلاغ', 'Send report')}</Btn>
              <p className="fine">{t('في الطوارئ الحقيقية اتصل برقم الطوارئ الرسمي. هذا نموذج محاكاة فقط.', 'In a real emergency call the official emergency number. This is a simulation only.')}</p>
            </div>
          )}
        </Card>
        <Card id="guidance" title={t('إرشادات الالتزام والخصوصية', 'Compliance & privacy guidance')}>
          <ul className="list">
            <li>🚑 {t('أفسح مسارات الطوارئ ولا تتوقف عند البوابات.', 'Keep emergency lanes clear and do not stop at gates.')}</li>
            <li>📵 {t('لا تصوّر المصابين ولا تنشر بياناتهم.', 'Do not photograph injured people or share their data.')}</li>
            <li>📢 {t('اعتمد على التعليمات الرسمية فقط، وتجاهل الشائعات.', 'Rely only on official instructions; ignore rumours.')}</li>
            <li>🧭 {t('ساعد ضمن تدريبك فقط، ولا تدخل المناطق المطوّقة.', 'Help only within your training; never enter cordoned areas.')}</li>
            <li>🔒 {t('لا تطلب المنصة بيانات صحية أو موقعك الدقيق في هذا النموذج.', 'This prototype never asks for health data or your precise location.')}</li>
          </ul>
        </Card>
      </div>
      <aside className="col-side">
        <AssetMap assets={v.publicAssets} publicMode kinds={['aed', 'bleeding_kit']} />
        <Card id="citizen-training" title={t('فرص التدريب والمشاركة في التمارين', 'Training & exercise opportunities')}>
          <ul className="list">
            {v.courses.map((c) => <li key={c.id}>🎓 {tx(c.title)}</li>)}
            {v.exercises.map((e) => (
              <li key={e.id}>🗓️ {tx(e.title)} · {fmtDate(e.at)} · {e.publicRegistered}/{e.publicSeats}
                <Btn small tone="ghost" testid={`register-${e.id}`} onClick={() => dispatch(CIT, { type: 'REGISTER_EXERCISE', exerciseId: e.id })}>{t('سجّل', 'Register')}</Btn>
              </li>
            ))}
          </ul>
        </Card>
      </aside>
    </div>
  );
}
