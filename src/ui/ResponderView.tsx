import { fmtDate, fmtTime } from '../domain/time';
import { responderView } from '../domain/views';
import { KIND_LABEL, QUAL_LABEL, ZONE_LABEL, useT } from '../i18n/i18n';
import { Btn, Card, Empty, FileBadge, Pill, Status } from './common';
import { tpl } from './ManagerView';
import { useStore } from './store';

export function ResponderView({ responderId }: { responderId: string }) {
  const { state, dispatch } = useStore();
  const { t, tx } = useT();
  const v = responderView(state, responderId)!;
  const me = { role: 'responder' as const, id: responderId };
  const updTpl = tpl<'UPDATE_TASK'>('s30');
  const issueTpl = tpl<'REPORT_RESOURCE_ISSUE'>('s25');

  return (
    <div className="grid">
      <div className="col-main">
        <Card id="badge" title={t('البادج التجريبي للمستجيب', 'Responder demo badge')}>
          <div className="badge" data-testid="responder-badge">
            <div className="badge-h">
              <span className="badge-logo">حدث</span>
              <span>{t('بادج تجريبي — ليس وثيقة رسمية', 'DEMO badge — not an official credential')}</span>
            </div>
            <div className="badge-b">
              <div className="avatar" aria-hidden>{tx(v.me.name).slice(0, 1)}</div>
              <div>
                <h3>{tx(v.me.name)}</h3>
                <p>{v.me.kind === 'community' ? t('مستجيب مجتمعي', 'Community responder') : t('مستجيب مهني', 'Professional responder')} · {tx(state.orgs.find((o) => o.id === v.me.agencyId)?.name)}</p>
                <p>{t('أعلى منطقة مصرح بها:', 'Highest permitted zone:')} <Pill tone={v.me.clearance === 'warm' ? 'warn' : 'ok'}>{tx(ZONE_LABEL[v.me.clearance])}</Pill></p>
              </div>
            </div>
            <table className="tbl">
              <thead><tr><th>{t('التدريب/الاعتماد', 'Training / certification')}</th><th>{t('الجهة', 'Issuer')}</th><th>{t('صالح حتى', 'Valid until')}</th></tr></thead>
              <tbody>
                {v.me.qualifications.map((q) => (
                  <tr key={q.code} data-testid={`qual-${q.code}`}>
                    <td><Pill tone={v.validQuals.includes(q.code) ? 'ok' : 'bad'}>{tx(QUAL_LABEL[q.code])}</Pill></td>
                    <td>{tx(q.issuer)}</td>
                    <td>{fmtDate(q.expiresAt)} {!v.validQuals.includes(q.code) && <b className="bad-t">{t('منتهٍ', 'expired')}</b>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <label className="toggle" data-testid="availability">
              <input type="checkbox" checked={v.me.available} onChange={(e) => dispatch(me, { type: 'SET_AVAILABILITY', available: e.target.checked })} />
              <span>{v.me.available ? t('متاح للتكليف (تفعيل اختياري)', 'Available for tasking (opt-in)') : t('غير متاح — فعّل التوفر اختياريًا', 'Unavailable — opt in to availability')}</span>
            </label>
          </div>
        </Card>
      </div>
      <aside className="col-side">
        <Card id="my-tasks" title={<>{t('مهامي', 'My tasks')} <FileBadge /></>}>
          {v.tasks.length === 0 && <Empty>{t('لا توجد مهام مسندة إليك. تُسند المهام بقرار بشري من مدير الحدث وضمن صلاحياتك فقط.', 'No tasks assigned. Tasks are assigned by a human incident manager, within your permissions only.')}</Empty>}
          {v.tasks.map((task) => (
            <div key={task.id} className={`task task-${task.status}`} data-testid={`my-task-${task.id}`}>
              <div className="task-top"><b>{task.id}</b> {tx(task.title)} <Status value={task.status} /></div>
              <div className="task-meta">
                <span>{t('المنطقة:', 'Zone:')} <Pill tone={task.zoneKind === 'warm' ? 'warn' : 'ok'}>{tx(ZONE_LABEL[task.zoneKind ?? 'cold'])}</Pill> {tx(task.zoneName)}</span>
                <span>{t('المؤهلات المطلوبة:', 'Required:')} {task.requiredQuals.map((q) => tx(QUAL_LABEL[q])).join('، ')}</span>
                <span>{t('الأداة المحددة:', 'Assigned tool:')} {task.resources.length ? task.resources.map((r) => <span key={r.id} className="res-tag">{r.id} {tx(r.name)} <Status value={r.status} /></span>) : '—'}</span>
                {task.assignedAt && <span>{t('أُسندت عند', 'Assigned at')} {fmtTime(task.assignedAt)}{task.acceptedAt && <> · {t('قُبلت عند', 'accepted')} {fmtTime(task.acceptedAt)}</>}</span>}
                {task.requiredResourceKind && <span className="fine">{t('نوع الأداة:', 'Tool type:')} {tx(KIND_LABEL[task.requiredResourceKind])}</span>}
              </div>
              <div className="row">
                {task.status === 'assigned' && (
                  <>
                    <Btn tone="ok" testid={`accept-${task.id}`} onClick={() => dispatch(me, { type: 'ACCEPT_TASK', taskId: task.id })}>{t('قبول المهمة', 'Accept task')}</Btn>
                    <Btn tone="ghost" testid={`decline-${task.id}`} onClick={() => dispatch(me, { type: 'DECLINE_TASK', taskId: task.id })}>{t('اعتذار', 'Decline')}</Btn>
                  </>
                )}
                {(task.status === 'accepted' || task.status === 'in_progress') && (
                  <>
                    {task.id === updTpl.taskId && <Btn small tone="ghost" testid={`update-${task.id}`} onClick={() => dispatch(me, updTpl)}>{t('إرسال تحديث ميداني', 'Send field update')}</Btn>}
                    <Btn small testid={`deliver-${task.id}`} onClick={() => dispatch(me, { type: 'DELIVER_TASK', taskId: task.id })}>{t('تسليم المهمة', 'Deliver task')}</Btn>
                    {task.resources.filter((r) => r.status === 'ready').map((r) => (
                      <Btn key={r.id} small tone="danger" testid={`fault-${r.id}`} onClick={() => dispatch(me, r.id === issueTpl.resourceId ? issueTpl : { type: 'REPORT_RESOURCE_ISSUE', resourceId: r.id, status: 'out_of_service', note: { ar: 'عطل مُبلّغ من الميدان', en: 'Fault reported from field' } })}>
                        {t(`الإبلاغ عن عطل ${r.id}`, `Report fault ${r.id}`)}
                      </Btn>
                    ))}
                  </>
                )}
              </div>
              {task.note && <p className="fine">{t('آخر تحديث:', 'Last update:')} {tx(task.note)}</p>}
            </div>
          ))}
          <p className="fine">{t('لا يُطلب منك دخول منطقة غير مصرح بها، ولا تُصدر المنصة قرارات علاجية.', 'You are never asked to enter an unpermitted zone, and the platform issues no treatment decisions.')}</p>
        </Card>
      </aside>
    </div>
  );
}
