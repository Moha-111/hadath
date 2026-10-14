import { useState } from 'react';
import type { Command } from '../domain/commands';
import { eligibility, tasksUsingResource, isEquipmentStale, CAPABILITY_STALE_DAYS } from '../domain/rules';
import { DIRECTIVE_1, SCENARIO } from '../domain/scenario';
import { daysBetween, fmtDateTime, fmtTime } from '../domain/time';
import type { Task } from '../domain/types';
import { incidentAlerts, readinessAlerts } from '../domain/views';
import { KIND_LABEL, QUAL_LABEL, ROLE_LABEL, ZONE_LABEL, useT } from '../i18n/i18n';
import { AlertsPanel } from './AlertsPanel';
import { AssetMap } from './AssetMap';
import { Btn, Card, Empty, Pill, Status } from './common';
import { EventEye } from './EventEye';
import { useStore } from './store';

const M = { role: 'manager' as const };
/** Command templates taken from the replayable scenario so manual play and replay match. */
export function tpl<T extends Command['type']>(stepId: string): Extract<Command, { type: T }> {
  return SCENARIO.find((s) => s.id === stepId)!.cmd as Extract<Command, { type: T }>;
}

export function ManagerView() {
  const { state } = useStore();
  const inc = state.incident;
  return (
    <div className="grid">
      <div className="col-main">
        {!inc || inc.status === 'closed' ? <ReportsInbox /> : null}
        {inc && <IncidentHeader />}
        {inc && inc.status !== 'closed' && <TasksCard />}
        {inc && inc.status === 'active' && <SupportCard />}
        {inc && inc.status === 'active' && <DirectiveCard />}
        {inc && <RecoveryCard />}
        {inc && <LogCard />}
      </div>
      <aside className="col-side">
        <AlertsPanel id="alerts" alerts={inc ? incidentAlerts(state) : []} canApprove title={undefined} />
        {!inc && <ReadinessSummary />}
        {inc && <EventEye />}
        <AssetMap assets={state.resources} />
        {inc && <DecisionsCard />}
      </aside>
    </div>
  );
}

function ReadinessSummary() {
  const { state } = useStore();
  const { t } = useT();
  const gaps = readinessAlerts(state);
  return (
    <Card id="mgr-readiness" title={t('ملخص الجاهزية', 'Readiness summary')}>
      <p>{t(`فجوات جاهزية مفتوحة: ${gaps.length}`, `Open readiness gaps: ${gaps.length}`)}</p>
    </Card>
  );
}

function ReportsInbox() {
  const { state, dispatch } = useStore();
  const { t, tx } = useT();
  const create = tpl<'CREATE_INCIDENT'>('s08');
  return (
    <Card id="reports" title={t('البلاغات الواردة والتحقق', 'Incoming reports & verification')}>
      {state.reports.length === 0 && <Empty>{t('لا توجد بلاغات. يمكن للمواطن إرسال بلاغ من واجهته.', 'No reports yet. Citizens can submit from their view.')}</Empty>}
      {state.reports.map((r) => (
        <div key={r.id} className="report" data-testid={`report-${r.id}`}>
          <div className="row"><b>{r.id}</b> <Status value={r.status} /> <span className="fine">{fmtTime(r.at)}</span></div>
          <p>«{tx(r.text)}»</p>
          <p className="fine">{t('الموقع المذكور:', 'Location given:')} {tx(r.locationHint)}</p>
          {r.status === 'new' && (
            <div className="row">
              <Btn testid={`verify-${r.id}`} tone="ok" onClick={() => dispatch(M, { type: 'VERIFY_REPORT', reportId: r.id, valid: true })}>{t('تحقق: مؤكد', 'Verify: confirmed')}</Btn>
              <Btn tone="ghost" onClick={() => dispatch(M, { type: 'VERIFY_REPORT', reportId: r.id, valid: false })}>{t('غير مؤكد', 'Not confirmed')}</Btn>
            </div>
          )}
          {r.status === 'verified' && (!state.incident || state.incident.status === 'closed') && (
            <div className="create-incident">
              <p><b>{tx(create.title)}</b></p>
              <p className="fine">{tx(create.situation)}</p>
              <Btn testid="create-incident" onClick={() => dispatch(M, { ...create, fromReportId: r.id })}>{t('إنشاء ملف الحدث', 'Create incident file')}</Btn>
            </div>
          )}
        </div>
      ))}
    </Card>
  );
}

function IncidentHeader() {
  const { state, dispatch } = useStore();
  const { t, tx } = useT();
  const inc = state.incident!;
  const objTpl = tpl<'SET_OBJECTIVES'>('s09');
  const needTpl = tpl<'SET_NEED'>('s12');
  return (
    <Card id="incident-file" title={<>{t('ملف الحدث الموحّد', 'Unified incident file')} · {inc.id} <Status value={inc.status} /></>}>
      <h2 className="inc-title">{tx(inc.title)}</h2>
      <div className="kv">
        <div><span>{t('الموقف الحالي', 'Current situation')}</span><p>{tx(inc.situation)}</p></div>
        <div><span>{t('القيادة', 'Command')}</span><p>{tx(inc.command.manager)} · {tx(state.orgs.find((o) => o.id === inc.command.leadOrgId)?.name)}<br /><small>{tx(inc.command.post)}</small></p></div>
        <div><span>{t('التحقق', 'Verification')}</span><p>{inc.verifiedAt ? fmtTime(inc.verifiedAt) : '—'} · {t('أُنشئ', 'created')} {fmtTime(inc.createdAt)}</p></div>
      </div>
      <div className="sub">
        <span className="sub-h">{t('الجهات المشاركة (كلٌّ ضمن اختصاصه)', 'Participating organisations (each within its mandate)')}</span>
        <div className="chips">
          {inc.participatingOrgIds.map((id) => { const o = state.orgs.find((x) => x.id === id)!; return <span className="chip" key={id} title={tx(o.mandate)}>{tx(o.name)} <small>— {tx(o.mandate)}</small></span>; })}
          {inc.supportRequests.filter((r) => r.capabilityId).map((r) => { const c = state.capabilities.find((x) => x.id === r.capabilityId)!; const o = state.orgs.find((x) => x.id === c.partnerId)!; return <span className="chip chip-partner" key={r.id}>{tx(o.name)} <small>— {t('شريك تشغيلي', 'operational partner')}</small></span>; })}
        </div>
      </div>
      <div className="sub">
        <span className="sub-h">{t('الأهداف', 'Objectives')}</span>
        {inc.objectives.length ? <ol className="objectives">{inc.objectives.map((o, i) => <li key={i}>{tx(o)}</li>)}</ol> : (
          inc.status === 'active' && <Btn testid="set-objectives" onClick={() => dispatch(M, objTpl)}>{t('اعتماد الأهداف المقترحة', 'Adopt proposed objectives')}</Btn>
        )}
      </div>
      <div className="sub">
        <span className="sub-h">{t('مناطق العمل المسموح بها', 'Permitted work zones')}</span>
        <table className="tbl">
          <tbody>
            {inc.zones.map((z) => (
              <tr key={z.id} data-testid={`zone-row-${z.id}`}>
                <td><Pill tone={z.kind === 'hot' ? 'bad' : z.kind === 'warm' ? 'warn' : 'ok'}>{tx(ZONE_LABEL[z.kind])}</Pill></td>
                <td>{tx(z.name)}</td>
                <td>{z.allowed ? <Pill tone="ok">{t('مفتوحة للعمل', 'Open')}</Pill> : <Pill>{t('مغلقة', 'Closed')}</Pill>}</td>
                <td>
                  {inc.status === 'active' && (
                    <Btn small tone="ghost" testid={`toggle-zone-${z.id}`} onClick={() => dispatch(M, { type: 'SET_ZONE_ALLOWED', zoneId: z.id, allowed: !z.allowed })}>
                      {z.allowed ? t('إغلاق', 'Close') : t('فتح', 'Open')}
                    </Btn>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="fine">{t('منطقة الخطر لا يدخلها إلا مختصون بقرار بشري، ولا يُسند إليها المستجيب المجتمعي إطلاقًا.', 'The hot zone is entered only by specialists on human decision; community responders are never assigned there.')}</p>
      </div>
      <div className="sub">
        <span className="sub-h">{t('الاحتياجات المقدّرة', 'Estimated needs')}</span>
        {inc.needs.length ? inc.needs.map((n) => <p key={n.kind}>{tx(KIND_LABEL[n.kind])}: <b>{n.quantity}</b> — {tx(n.note)}</p>) : (
          inc.status === 'active' && <Btn small tone="ghost" testid="set-need" onClick={() => dispatch(M, needTpl)}>{t('تسجيل احتياج النقل المقدّر (120 مقعدًا)', 'Record estimated transport need (120 seats)')}</Btn>
        )}
      </div>
    </Card>
  );
}

function TasksCard() {
  const { state, dispatch } = useStore();
  const { t, tx } = useT();
  const inc = state.incident!;
  const templates = [tpl<'CREATE_TASK'>('s13'), tpl<'CREATE_TASK'>('s17')].filter((c) => !inc.tasks.some((x) => x.id === c.taskId));
  return (
    <Card id="tasks" title={t('المهام وتوزيعها', 'Tasks & assignment')}>
      {inc.status === 'active' && templates.length > 0 && (
        <div className="templates">
          <span className="fine">{t('قوالب مهام من خطة الاستجابة (اصطناعية):', 'Task templates from the response plan (synthetic):')}</span>
          {templates.map((c) => (
            <Btn key={c.taskId} small tone="ghost" testid={`create-${c.taskId}`} onClick={() => dispatch(M, c)}>+ {tx(c.title)}</Btn>
          ))}
        </div>
      )}
      {inc.tasks.length === 0 && <Empty>{t('لا توجد مهام بعد.', 'No tasks yet.')}</Empty>}
      <div className="tasks">
        {inc.tasks.map((task) => <TaskRow key={task.id} task={task} />)}
      </div>
    </Card>
  );
}

function TaskRow({ task }: { task: Task }) {
  const { state, dispatch } = useStore();
  const { t, tx } = useT();
  const inc = state.incident!;
  const zone = inc.zones.find((z) => z.id === task.zoneId)!;
  const [resp, setResp] = useState('');
  const [res, setRes] = useState('');
  const [ack, setAck] = useState(false);
  const elig = state.responders.map((r) => eligibility(state, task, r));
  const chosen = elig.find((e) => e.responder.id === resp);
  const kindOk = (k: string) => !task.requiredResourceKind || k === task.requiredResourceKind;
  const candidates = state.resources.filter((r) => kindOk(r.kind) && !task.resourceIds.includes(r.id));
  const assignee = task.assignee?.type === 'responder' ? state.responders.find((r) => r.id === task.assignee!.id)?.name : task.assignee ? state.orgs.find((o) => o.id === task.assignee!.id)?.name : undefined;
  const editable = inc.status === 'active' && task.status !== 'closed' && task.assignee?.type !== 'partner';

  return (
    <div className={`task task-${task.status}`} data-testid={`task-${task.id}`}>
      <div className="task-top">
        <b>{task.id}</b> <span>{tx(task.title)}</span> <Status value={task.status} />
      </div>
      <div className="task-meta">
        <span>{t('المنطقة:', 'Zone:')} <Pill tone={zone.kind === 'hot' ? 'bad' : zone.kind === 'warm' ? 'warn' : 'ok'}>{tx(ZONE_LABEL[zone.kind])}</Pill> {tx(zone.name)}</span>
        <span>{t('المؤهلات المطلوبة:', 'Required:')} {task.requiredQuals.length ? task.requiredQuals.map((q) => tx(QUAL_LABEL[q])).join('، ') : '—'}</span>
        <span>{t('الأداة المطلوبة:', 'Tool required:')} {task.requiredResourceKind ? tx(KIND_LABEL[task.requiredResourceKind]) : '—'}</span>
        <span>{t('المُسند إليه:', 'Assignee:')} {assignee ? tx(assignee) : '—'}{task.assignee?.type === 'partner' && <> <Pill tone="info">{t('شريك', 'partner')}</Pill></>}</span>
        <span>{t('الموارد:', 'Resources:')} {task.resourceIds.length ? task.resourceIds.map((id) => { const r = state.resources.find((x) => x.id === id)!; return <span key={id} className="res-tag">{id} <Status value={r.status} /></span>; }) : '—'}</span>
        {task.note && <span>{t('آخر تحديث ميداني:', 'Last field update:')} {tx(task.note)}</span>}
      </div>
      {editable && (
        <div className="task-actions">
          {(task.status === 'open' || task.status === 'declined') && (
            <div className="row">
              <select value={resp} onChange={(e) => { setResp(e.target.value); setAck(false); }} data-testid={`assign-select-${task.id}`}>
                <option value="">{t('اختر مستجيبًا…', 'Choose responder…')}</option>
                {elig.map((e) => (
                  <option key={e.responder.id} value={e.responder.id}>
                    {tx(e.responder.name)} — {e.eligible ? t('مؤهل ومتاح ✓', 'qualified & available ✓') : e.reasons.map((r) => r === 'missing_quals' ? t(`ينقصه: ${e.missing.map((q) => QUAL_LABEL[q].ar).join('، ')}`, `missing: ${e.missing.map((q) => QUAL_LABEL[q].en).join(', ')}`) : r === 'clearance' ? t('لا يملك تصريح المنطقة', 'no zone clearance') : r === 'busy' ? t('مكلّف بمهمة', 'busy') : t('غير متاح', 'unavailable')).join(' · ')}
                  </option>
                ))}
              </select>
              {chosen && chosen.reasons.length === 1 && chosen.reasons[0] === 'missing_quals' && (
                <label className="ack"><input type="checkbox" checked={ack} onChange={(e) => setAck(e.target.checked)} /> {t('أقر بعدم توافق المؤهل (سيظهر تنبيه)', 'I acknowledge the mismatch (an alert will be raised)')}</label>
              )}
              <Btn small testid={`assign-${task.id}`} disabled={!resp} onClick={() => dispatch(M, { type: 'ASSIGN_TASK', taskId: task.id, responderId: resp, acknowledgeMismatch: ack || undefined })}>{t('تكليف', 'Assign')}</Btn>
            </div>
          )}
          <div className="row">
            <select value={res} onChange={(e) => setRes(e.target.value)} data-testid={`alloc-select-${task.id}`}>
              <option value="">{t('تحديد الأداة/المورد…', 'Choose tool/resource…')}</option>
              {candidates.map((r) => {
                const used = tasksUsingResource(inc, r.id);
                return (
                  <option key={r.id} value={r.id}>
                    {r.id} — {tx(r.name)} · {r.status === 'ready' ? t('جاهز', 'ready') : t('غير جاهز', 'not ready')}{isEquipmentStale(r, state.now) ? t(' · فحص قديم', ' · stale check') : ''}{used.length ? t(` · مخصّص لـ ${used[0].id}`, ` · used by ${used[0].id}`) : ''}
                  </option>
                );
              })}
            </select>
            <Btn small tone="ghost" testid={`alloc-${task.id}`} disabled={!res} onClick={() => { if (dispatch(M, { type: 'ALLOCATE_RESOURCE', taskId: task.id, resourceId: res })) setRes(''); }}>{t('تخصيص', 'Allocate')}</Btn>
          </div>
        </div>
      )}
      {inc.status === 'recovery' && task.status !== 'closed' && (
        <div className="row"><Btn small tone="ok" testid={`close-${task.id}`} onClick={() => dispatch(M, { type: 'CLOSE_TASK', taskId: task.id })}>{t('إغلاق المهمة', 'Close task')}</Btn></div>
      )}
    </div>
  );
}

function SupportCard() {
  const { state, dispatch } = useStore();
  const { t, tx } = useT();
  const inc = state.incident!;
  const reqTpl = tpl<'REQUEST_SUPPORT'>('s21');
  const [cap, setCap] = useState<Record<string, string>>({});
  return (
    <Card id="support" title={t('طلبات الدعم والقطاع الخاص', 'Support requests & private sector')}>
      {!inc.supportRequests.some((r) => r.id === reqTpl.requestId) && (
        <div className="row">
          <span>{t('طلب مقترح:', 'Proposed request:')} {tx(KIND_LABEL[reqTpl.kind])} · {reqTpl.quantity} {t('مقعدًا', 'seats')} — {tx(reqTpl.reason)}</span>
          <Btn small testid="request-support" onClick={() => dispatch(M, reqTpl)}>{t('رفع طلب دعم', 'Raise support request')}</Btn>
        </div>
      )}
      {inc.supportRequests.map((r) => {
        const options = state.capabilities.filter((c) => c.kind === r.kind);
        const chosen = cap[r.id] ?? options.find((c) => c.readiness === 'ready')?.id ?? '';
        const c = state.capabilities.find((x) => x.id === r.capabilityId);
        return (
          <div key={r.id} className="support" data-testid={`support-${r.id}`}>
            <div className="row"><b>{r.id}</b> {tx(KIND_LABEL[r.kind])} · {r.quantity} <Status value={r.status} /> {c && <span className="fine">→ {tx(c.title)} ({tx(state.orgs.find((o) => o.id === c.partnerId)?.name)})</span>}</div>
            <p className="fine">{tx(r.reason)}</p>
            {r.status === 'pending' && (
              <div className="row">
                <select value={chosen} onChange={(e) => setCap({ ...cap, [r.id]: e.target.value })} data-testid={`cap-select-${r.id}`}>
                  {options.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.id} — {tx(o.title)} · {o.capacity} {tx(o.unit)} · {o.readiness}{daysBetween(o.updatedAt, state.now) > CAPABILITY_STALE_DAYS ? t(' · تحديث قديم', ' · stale') : ''}
                    </option>
                  ))}
                </select>
                <Btn small tone="ok" testid={`approve-support-${r.id}`} disabled={!chosen} onClick={() => dispatch(M, { type: 'DECIDE_SUPPORT', requestId: r.id, approve: true, capabilityId: chosen })}>{t('اعتماد وتفعيل', 'Approve & activate')}</Btn>
                <Btn small tone="ghost" onClick={() => dispatch(M, { type: 'DECIDE_SUPPORT', requestId: r.id, approve: false })}>{t('رفض', 'Reject')}</Btn>
              </div>
            )}
            {c && <p className="fine">{t('شروط الإتاحة:', 'Availability conditions:')} {tx(c.conditions)}</p>}
          </div>
        );
      })}
    </Card>
  );
}

function DirectiveCard() {
  const { state, dispatch } = useStore();
  const { t } = useT();
  const issued = state.directives.find((d) => d.id === DIRECTIVE_1.directiveId);
  return (
    <Card id="directive" title={t('التوجيهات الرسمية للمواطنين (محاكاة)', 'Official public directives (simulated)')}>
      <p><b>{DIRECTIVE_1.title.ar}</b></p>
      <p className="fine">{t('اللغات: العربية · English · اردو', 'Languages: Arabic · English · Urdu')}</p>
      {issued ? (
        <p data-testid="directive-acks">{t('صدر عند', 'Issued at')} {fmtTime(issued.at)} · {t('تأكيدات الالتزام:', 'Acknowledgements:')} <b>{issued.acknowledgements}</b> <span className="fine">{t('(اصطناعية)', '(synthetic)')}</span></p>
      ) : (
        <Btn testid="issue-directive" onClick={() => dispatch(M, { type: 'ISSUE_DIRECTIVE', ...DIRECTIVE_1 })}>{t('إصدار التوجيه للعموم', 'Publish directive')}</Btn>
      )}
    </Card>
  );
}

function DecisionsCard() {
  const { state } = useStore();
  const { t, tx } = useT();
  const d = state.incident?.decisions ?? [];
  return (
    <Card id="decisions" title={t('القرارات', 'Decisions')}>
      {d.length === 0 && <Empty>{t('لا قرارات مسجلة.', 'No decisions yet.')}</Empty>}
      <ul className="list">
        {d.map((x) => <li key={x.id}><span className="fine">{fmtTime(x.at)}</span> {tx(x.text)} {x.basedOnAlertId && <Pill tone="info">{t('بناءً على تنبيه', 'from alert')}</Pill>}</li>)}
      </ul>
    </Card>
  );
}

function LogCard() {
  const { state } = useStore();
  const { t, tx } = useT();
  return (
    <Card id="log" title={t('سجل التحديثات', 'Update log')}>
      <ol className="log" reversed>
        {[...state.log].reverse().slice(0, 14).map((e) => (
          <li key={e.seq}><span className="fine">{fmtTime(e.at)}</span> <Pill>{tx(ROLE_LABEL[e.actor])}</Pill> {tx(e.summary)}</li>
        ))}
      </ol>
    </Card>
  );
}

function RecoveryCard() {
  const { state, dispatch } = useStore();
  const { t, tx } = useT();
  const inc = state.incident!;
  const imp = tpl<'ADD_IMPROVEMENT'>('s39');
  const [text, setText] = useState(imp.text.ar);
  const [owner, setOwner] = useState(imp.owner.ar);
  const [due, setDue] = useState(imp.dueInDays);
  const rep = inc.recovery?.report;
  return (
    <Card id="recovery" title={t('التعافي والتحسين', 'Recovery & improvement')}>
      {inc.status === 'active' && (
        <Btn testid="start-recovery" tone="ghost" onClick={() => dispatch(M, { type: 'START_RECOVERY' })}>{t('الانتقال إلى مرحلة التعافي', 'Move to recovery')}</Btn>
      )}
      {inc.status !== 'active' && (
        <>
          <p>{t('المهام المغلقة:', 'Closed tasks:')} <b>{inc.tasks.filter((x) => x.status === 'closed').length}/{inc.tasks.length}</b></p>
          {!rep && inc.status === 'recovery' && <Btn testid="generate-report" onClick={() => dispatch(M, { type: 'GENERATE_REPORT' })}>{t('إصدار تقرير الأداء من السجل', 'Generate performance report from log')}</Btn>}
          {rep && (
            <div data-testid="performance-report">
              <h4>{t('تقرير الأداء', 'Performance report')} · {fmtDateTime(rep.generatedAt)}</h4>
              <table className="tbl metrics">
                <thead><tr><th>{t('المؤشر', 'Indicator')}</th><th>{t('القيمة', 'Value')}</th><th>{t('طريقة الحساب', 'Derivation')}</th></tr></thead>
                <tbody>
                  {rep.metrics.map((m) => (
                    <tr key={m.id} data-testid={`metric-${m.id}`}><td>{tx(m.label)}</td><td><b>{m.value ?? '—'}</b> <small>{tx(m.unit)}</small></td><td className="fine">{tx(m.derivation)}</td></tr>
                  ))}
                </tbody>
              </table>
              <p className="fine">{tx(rep.note)}</p>
            </div>
          )}
          <h4>{t('إجراءات التحسين', 'Improvement actions')}</h4>
          <ul className="list">
            {inc.recovery?.improvements.map((i) => (
              <li key={i.id} data-testid={`improvement-${i.id}`}><b>{tx(i.text)}</b><br /><span className="fine">{t('المسؤول:', 'Owner:')} {tx(i.owner)} · {t('موعد المتابعة:', 'Follow-up:')} {i.dueAt.slice(0, 10)} · {t('المصدر:', 'Source:')} {tx(i.source)}</span></li>
            ))}
          </ul>
          {inc.status === 'recovery' && (
            <div className="form">
              <label>{t('الإجراء', 'Action')}<input value={text} onChange={(e) => setText(e.target.value)} /></label>
              <label>{t('المسؤول', 'Owner')}<input value={owner} onChange={(e) => setOwner(e.target.value)} /></label>
              <label>{t('المتابعة بعد (أيام)', 'Follow-up in (days)')}<input type="number" value={due} onChange={(e) => setDue(Number(e.target.value))} /></label>
              <Btn small testid="add-improvement" onClick={() => dispatch(M, { ...imp, improvementId: `IMP-${(inc.recovery?.improvements.length ?? 0) + 1}`, text: text === imp.text.ar ? imp.text : { ar: text, en: text }, owner: owner === imp.owner.ar ? imp.owner : { ar: owner, en: owner }, dueInDays: due })}>{t('إضافة إجراء تحسين', 'Add improvement')}</Btn>
              <Btn small tone="ok" testid="close-incident" onClick={() => dispatch(M, { type: 'CLOSE_INCIDENT' })}>{t('إغلاق ملف الحدث', 'Close incident file')}</Btn>
            </div>
          )}
          {inc.status === 'closed' && <p><Pill tone="ok">{t('أُغلق ملف الحدث', 'Incident file closed')}</Pill> {fmtTime(inc.closedAt!)}</p>}
        </>
      )}
    </Card>
  );
}

