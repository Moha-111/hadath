import { RULE_DOCS, type Alert } from '../domain/gaps';
import { useT } from '../i18n/i18n';
import { Btn, Card, Empty, Pill } from './common';
import { useStore } from './store';

const SEV_TONE = { critical: 'bad', warning: 'warn', info: 'info' } as const;

export function AlertsPanel({ alerts, canApprove, title, id = 'alerts' }: { alerts: Alert[]; canApprove: boolean; title?: string; id?: string }) {
  const { dispatch } = useStore();
  const { t, tx } = useT();
  return (
    <Card
      id={id}
      title={title ?? t('محرك فجوات الجاهزية والاستجابة', 'Readiness & Response Gap Engine')}
      actions={<span className="fine">{t('قواعد شفافة قابلة للفهم — ليست نموذج تنبؤ متعلمًا', 'Transparent rules — not a learned predictive model')}</span>}
    >
      {alerts.length === 0 && <Empty>{t('لا توجد فجوات مفتوحة وفق القواعد الحالية.', 'No open gaps under current rules.')}</Empty>}
      <ul className="alerts">
        {alerts.map((a) => (
          <li key={a.id} className={`alert alert-${a.severity}`} data-testid={`alert-${a.id}`}>
            <div className="alert-top">
              <Pill tone={SEV_TONE[a.severity]}>{a.severity === 'critical' ? t('حرج', 'Critical') : a.severity === 'warning' ? t('تنبيه', 'Warning') : t('معلومة', 'Info')}</Pill>
              <strong>{tx(a.title)}</strong>
            </div>
            <p className="alert-reason"><b>{t('السبب:', 'Why:')}</b> {tx(a.reason)}</p>
            <details open={a.severity === 'critical'}>
              <summary>{t('البيانات التي بُني عليها التنبيه والقاعدة', 'Data used and rule')}</summary>
              <table className="evidence">
                <tbody>
                  {a.evidence.map((e, i) => (
                    <tr key={i}><th>{tx(e.label)}</th><td><code>{e.value}</code></td></tr>
                  ))}
                  <tr><th>{t('القاعدة', 'Rule')}</th><td><code>{a.rule}</code> — {tx(RULE_DOCS[a.rule])}</td></tr>
                </tbody>
              </table>
            </details>
            {a.suggestion && (
              <div className="suggestion">
                <span><b>{t('البديل المقترح:', 'Suggested alternative:')}</b> {tx(a.suggestion.text)}</span>
                {canApprove ? (
                  <span className="row">
                    <Btn small tone="ok" testid={`approve-${a.id}`} onClick={() => dispatch({ role: 'manager' }, { type: 'APPROVE_SUGGESTION', alertId: a.id })}>
                      {t('اعتماد', 'Approve')}
                    </Btn>
                    <Btn small tone="ghost" testid={`dismiss-${a.id}`} onClick={() => dispatch({ role: 'manager' }, { type: 'DISMISS_ALERT', alertId: a.id })}>
                      {t('تجاهل', 'Dismiss')}
                    </Btn>
                  </span>
                ) : (
                  <span className="fine">{t('يعتمده مدير الحدث', 'Approved by incident manager')}</span>
                )}
              </div>
            )}
          </li>
        ))}
      </ul>
    </Card>
  );
}
