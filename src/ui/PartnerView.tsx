import { useState } from 'react';
import { CAPABILITY_STALE_DAYS } from '../domain/rules';
import { fmtTime } from '../domain/time';
import type { PartnerCapabilityKind, ReadinessStatus } from '../domain/types';
import { partnerView } from '../domain/views';
import { KIND_LABEL, useT } from '../i18n/i18n';
import { Age, Btn, Card, Empty, FileBadge, Status } from './common';
import { tpl } from './ManagerView';
import { useStore } from './store';

export function PartnerView({ partnerId }: { partnerId: string }) {
  const { state, dispatch } = useStore();
  const { t, tx } = useT();
  const v = partnerView(state, partnerId);
  const me = { role: 'partner' as const, id: partnerId };
  const org = state.orgs.find((o) => o.id === partnerId)!;
  const template = tpl<'REGISTER_CAPABILITY'>('s03').capability;
  const [kind, setKind] = useState<PartnerCapabilityKind>(partnerId === 'p-comms' ? 'comms' : 'logistics');
  const [title, setTitle] = useState(partnerId === 'p-comms' ? template.title.ar : '');
  const [capacity, setCapacity] = useState(partnerId === 'p-comms' ? template.capacity : 10);
  const [conditions, setConditions] = useState(partnerId === 'p-comms' ? template.conditions.ar : '');
  const register = () => {
    const isTpl = partnerId === 'p-comms' && title === template.title.ar && !v.capabilities.some((c) => c.id === template.id);
    dispatch(me, {
      type: 'REGISTER_CAPABILITY',
      capability: isTpl ? template : { id: `CAP-${partnerId}-${v.capabilities.length + 1}`, kind, title: { ar: title, en: title }, capacity, unit: { ar: 'وحدة', en: 'units' }, conditions: { ar: conditions, en: conditions }, activationNoticeMin: 30 },
    });
  };

  return (
    <div className="grid">
      <div className="col-main">
        <Card id="partner-caps" title={<>{t('قدرات الشريك المسجّلة', 'Registered partner capabilities')} — {tx(org.name)}</>}>
          {v.capabilities.length === 0 && <Empty>{t('لم تُسجّل قدرات بعد.', 'No capabilities registered yet.')}</Empty>}
          {v.capabilities.map((c) => (
            <div className="cap" key={c.id} data-testid={`cap-${c.id}`}>
              <div className="row"><b>{c.id}</b> {tx(c.title)} <Status value={c.readiness} /> <span className="fine">{tx(KIND_LABEL[c.kind])} · {c.capacity} {tx(c.unit)}</span></div>
              <p className="fine">{t('شروط الإتاحة:', 'Availability conditions:')} {tx(c.conditions)}</p>
              <p className="fine">{t('آخر تحديث للجاهزية:', 'Readiness updated:')} <Age at={c.updatedAt} limitDays={CAPABILITY_STALE_DAYS} /></p>
              <div className="row">
                {(['ready', 'not_ready', 'maintenance'] as ReadinessStatus[]).map((r) => (
                  <Btn key={r} small tone={r === 'ready' ? 'ok' : 'ghost'} testid={`cap-${c.id}-${r}`} onClick={() => dispatch(me, { type: 'UPDATE_CAPABILITY_READINESS', capabilityId: c.id, readiness: r })}>
                    {r === 'ready' ? t('تأكيد الجاهزية', 'Confirm ready') : r === 'not_ready' ? t('غير جاهز', 'Not ready') : t('صيانة', 'Maintenance')}
                  </Btn>
                ))}
              </div>
            </div>
          ))}
        </Card>
        <Card id="partner-register" title={t('تسجيل قدرة افتراضية', 'Register a (fictional) capability')}>
          <div className="form">
            <label>{t('النوع', 'Type')}
              <select value={kind} onChange={(e) => setKind(e.target.value as PartnerCapabilityKind)}>
                {(['transport', 'logistics', 'care', 'comms'] as const).map((k) => <option key={k} value={k}>{tx(KIND_LABEL[k])}</option>)}
              </select>
            </label>
            <label>{t('الوصف', 'Title')}<input value={title} onChange={(e) => setTitle(e.target.value)} /></label>
            <label>{t('السعة', 'Capacity')}<input type="number" value={capacity} onChange={(e) => setCapacity(Number(e.target.value))} /></label>
            <label>{t('شروط الإتاحة', 'Availability conditions')}<input value={conditions} onChange={(e) => setConditions(e.target.value)} /></label>
            <Btn testid="register-capability" disabled={!title} onClick={register}>{t('تسجيل القدرة', 'Register capability')}</Btn>
          </div>
        </Card>
      </div>
      <aside className="col-side">
        <Card id="partner-requests" title={<>{t('طلبات التفعيل', 'Activation requests')} <FileBadge /></>}>
          {v.requests.length === 0 && <Empty>{t('لا توجد طلبات تفعيل معتمدة موجّهة إليكم.', 'No approved activation requests addressed to you.')}</Empty>}
          {v.requests.map((r) => (
            <div key={r.id} className="support" data-testid={`activation-${r.id}`}>
              <div className="row"><b>{r.id}</b> {tx(KIND_LABEL[r.kind])} · {r.quantity} <Status value={r.status} /></div>
              <p>{tx(r.reason)}</p>
              <p className="fine">{t('اعتُمد عند', 'Approved at')} {r.decidedAt && fmtTime(r.decidedAt)}{r.acceptedAt && <> · {t('قُبل عند', 'accepted')} {fmtTime(r.acceptedAt)}</>}{r.fulfilledAt && <> · {t('نُفّذ عند', 'fulfilled')} {fmtTime(r.fulfilledAt)}</>}</p>
              {r.task && <p className="fine">{t('المهمة في ملف الحدث:', 'Task in incident file:')} {r.task.id} — <Status value={r.task.status} /> · {t('الموارد:', 'Resources:')} {r.task.resourceIds.join('، ')}</p>}
              {r.status === 'activated' && <Btn testid={`accept-activation-${r.id}`} tone="ok" onClick={() => dispatch(me, { type: 'ACCEPT_ACTIVATION', requestId: r.id })}>{t('قبول طلب التفعيل', 'Accept activation')}</Btn>}
              {r.status === 'accepted' && <Btn testid={`fulfill-${r.id}`} onClick={() => dispatch(me, { type: 'FULFILL_SUPPORT', requestId: r.id })}>{t('تأكيد إتمام التنفيذ', 'Confirm fulfilment')}</Btn>}
            </div>
          ))}
          <p className="fine">{t('يرى الشريك الطلبات المعتمدة الموجّهة لقدراته فقط، دون تفاصيل المصابين أو العمليات الأخرى.', 'Partners see only approved requests for their own capabilities — no casualty or other operational details.')}</p>
        </Card>
      </aside>
    </div>
  );
}
