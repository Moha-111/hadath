import { useState } from 'react';
import { EQUIPMENT_STALE_DAYS, isEquipmentStale, validQuals } from '../domain/rules';
import { daysBetween, fmtDate } from '../domain/time';
import { readinessAlerts } from '../domain/views';
import { KIND_LABEL, QUAL_LABEL, useT } from '../i18n/i18n';
import { AlertsPanel } from './AlertsPanel';
import { AssetMap } from './AssetMap';
import { Age, Btn, Card, Pill, Status } from './common';
import { useStore } from './store';

const RD = { role: 'readiness' as const };

export function ReadinessView() {
  const { state, dispatch } = useStore();
  const { t, tx } = useT();
  const gaps = readinessAlerts(state);
  const ready = state.resources.filter((r) => r.status === 'ready').length;
  const stale = state.resources.filter((r) => isEquipmentStale(r, state.now)).length;
  const plansDue = state.plans.filter((p) => daysBetween(p.lastReviewedAt, state.now) > p.reviewEveryDays).length;
  const [course, setCourse] = useState<Record<string, string>>({});

  return (
    <div className="grid">
      <div className="col-main">
        <div className="kpis" data-testid="readiness-kpis">
          <div className="kpi"><b>{ready}/{state.resources.length}</b><span>{t('موارد جاهزة', 'Resources ready')}</span></div>
          <div className="kpi"><b>{stale}</b><span>{t('معلومات فحص قديمة', 'Stale inspections')}</span></div>
          <div className="kpi"><b>{gaps.length}</b><span>{t('فجوات مفتوحة', 'Open gaps')}</span></div>
          <div className="kpi"><b>{plansDue}</b><span>{t('خطط تجاوزت موعد المراجعة', 'Plans overdue for review')}</span></div>
        </div>

        <Card id="equipment" title={t('فحص الأدوات وتوفر الموارد', 'Equipment checks & resource availability')}>
          <table className="tbl">
            <thead><tr><th>{t('المورد', 'Resource')}</th><th>{t('الحالة', 'Status')}</th><th>{t('آخر تحقق', 'Last verified')}</th><th>{t('المسؤول عن الفحص', 'Inspector')}</th><th /></tr></thead>
            <tbody>
              {state.resources.filter((r) => ['aed', 'trauma_kit', 'bleeding_kit', 'ambulance'].includes(r.kind)).map((r) => (
                <tr key={r.id} data-testid={`eq-${r.id}`}>
                  <td><b>{r.id}</b> {tx(r.name)} <small className="fine">{tx(KIND_LABEL[r.kind])}</small></td>
                  <td><Status value={r.status} /></td>
                  <td><Age at={r.lastCheckedAt} limitDays={EQUIPMENT_STALE_DAYS} /></td>
                  <td>{tx(r.checkedBy)}</td>
                  <td className="row">
                    <Btn small tone="ok" testid={`check-ok-${r.id}`} onClick={() => dispatch(RD, { type: 'CHECK_RESOURCE', resourceId: r.id, status: 'ready' })}>{t('فحص: جاهز', 'Check: ready')}</Btn>
                    <Btn small tone="ghost" onClick={() => dispatch(RD, { type: 'CHECK_RESOURCE', resourceId: r.id, status: 'not_ready' })}>{t('غير جاهز', 'Not ready')}</Btn>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>

        <Card id="training" title={t('تأهيل الأفراد', 'Personnel qualification')}>
          <table className="tbl">
            <thead><tr><th>{t('المستجيب', 'Responder')}</th><th>{t('المؤهلات (الانتهاء)', 'Qualifications (expiry)')}</th><th>{t('اعتماد تدريب', 'Record training')}</th></tr></thead>
            <tbody>
              {state.responders.map((r) => {
                const valid = validQuals(r, state.now);
                return (
                  <tr key={r.id} data-testid={`person-${r.id}`}>
                    <td>{tx(r.name)}</td>
                    <td>{r.qualifications.map((q) => <span key={q.code} className="res-tag"><Pill tone={valid.includes(q.code) ? 'ok' : 'bad'}>{tx(QUAL_LABEL[q.code])}</Pill> <small>{fmtDate(q.expiresAt)}</small></span>)}</td>
                    <td className="row">
                      <select value={course[r.id] ?? ''} onChange={(e) => setCourse({ ...course, [r.id]: e.target.value })} data-testid={`course-select-${r.id}`}>
                        <option value="">{t('اختر دورة…', 'Choose course…')}</option>
                        {state.courses.map((c) => <option key={c.id} value={c.id}>{tx(c.title)}</option>)}
                      </select>
                      <Btn small testid={`train-${r.id}`} disabled={!course[r.id]} onClick={() => dispatch(RD, { type: 'RECORD_TRAINING', responderId: r.id, courseId: course[r.id] })}>{t('اعتماد', 'Record')}</Btn>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>

        <Card id="plans" title={t('الخطط والتمارين', 'Plans & exercises')}>
          <table className="tbl">
            <tbody>
              {state.plans.map((p) => {
                const overdue = daysBetween(p.lastReviewedAt, state.now) > p.reviewEveryDays;
                return (
                  <tr key={p.id}>
                    <td>{tx(p.title)} <small className="fine">{tx(p.owner)}</small></td>
                    <td><Age at={p.lastReviewedAt} limitDays={p.reviewEveryDays} /></td>
                    <td>{overdue ? <Pill tone="bad">{t('مراجعة متأخرة', 'Review overdue')}</Pill> : <Pill tone="ok">{t('ضمن الموعد', 'On schedule')}</Pill>}</td>
                    <td><Btn small tone="ghost" onClick={() => dispatch(RD, { type: 'REVIEW_PLAN', planId: p.id })}>{t('تمت المراجعة', 'Mark reviewed')}</Btn></td>
                  </tr>
                );
              })}
              {state.exercises.map((e) => (
                <tr key={e.id}>
                  <td>{tx(e.title)}</td>
                  <td>{fmtDate(e.at)}</td>
                  <td>{e.openFindings ? <Pill tone="warn">{t(`${e.openFindings} ملاحظات مفتوحة`, `${e.openFindings} open findings`)}</Pill> : <Pill tone="ok">{t('لا ملاحظات مفتوحة', 'No open findings')}</Pill>}</td>
                  <td>{e.publicSeats ? t(`مشاركة مجتمعية ${e.publicRegistered}/${e.publicSeats}`, `Community ${e.publicRegistered}/${e.publicSeats}`) : ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>
      <aside className="col-side">
        <AlertsPanel id="readiness-gaps" alerts={gaps} canApprove={false} title={t('الفجوات المفتوحة (محرك الفجوات)', 'Open gaps (gap engine)')} />
        <AssetMap assets={state.resources} />
      </aside>
    </div>
  );
}
