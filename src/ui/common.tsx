import type { ReactNode } from 'react';
import { STATUS_LABEL, useT } from '../i18n/i18n';
import { daysBetween, fmtDateTime, fmtTime } from '../domain/time';
import { useStore } from './store';

export function Card({ title, children, actions, id, className = '' }: { title?: ReactNode; children: ReactNode; actions?: ReactNode; id?: string; className?: string }) {
  const { stale } = useStore();
  return (
    <section className={`card ${stale ? 'is-stale' : ''} ${className}`} id={id} data-testid={id}>
      {(title || actions) && (
        <header className="card-h">
          <h3>{title}</h3>
          {actions && <div className="card-actions">{actions}</div>}
        </header>
      )}
      <div className="card-b">{children}</div>
    </section>
  );
}

const TONE: Record<string, string> = {
  ready: 'ok', accepted: 'ok', delivered: 'ok', fulfilled: 'ok', verified: 'ok', closed: 'muted', approved: 'ok',
  not_ready: 'bad', out_of_service: 'bad', rejected: 'bad', declined: 'bad',
  maintenance: 'warn', pending: 'warn', assigned: 'info', activated: 'info', in_progress: 'info', open: 'muted', new: 'warn',
  active: 'bad', recovery: 'warn', reported: 'warn',
};

export function Status({ value }: { value: string }) {
  const { tx } = useT();
  return <span className={`pill pill-${TONE[value] ?? 'muted'}`} data-status={value}>{tx(STATUS_LABEL[value]) || value}</span>;
}

export function Pill({ tone = 'muted', children }: { tone?: string; children: ReactNode }) {
  return <span className={`pill pill-${tone}`}>{children}</span>;
}

/** "2026-03-01 09:00 · 12 days ago", with a stale marker when over the limit. */
export function Age({ at, limitDays }: { at: string; limitDays?: number }) {
  const { state } = useStore();
  const { t } = useT();
  const d = Math.floor(daysBetween(at, state.now));
  const stale = limitDays !== undefined && d > limitDays;
  return (
    <span className={stale ? 'age age-stale' : 'age'} title={fmtDateTime(at)}>
      {fmtDateTime(at)} · {d <= 0 ? t('اليوم', 'today') : t(`قبل ${d} يومًا`, `${d} d ago`)}
      {stale && <strong> · {t('قديمة', 'stale')}</strong>}
    </span>
  );
}

export function Clock() {
  const { state, stale } = useStore();
  const { t } = useT();
  return (
    <span className="clock" data-testid="sim-clock">
      {t('توقيت المحاكاة', 'Sim time')} <b>{fmtTime(state.now)}</b>
      {stale && <em> {t('(متوقف)', '(frozen)')}</em>}
    </span>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="empty">{children}</p>;
}

export function Btn({ children, onClick, tone = 'primary', testid, disabled, small }: { children: ReactNode; onClick: () => void; tone?: 'primary' | 'ghost' | 'danger' | 'ok'; testid?: string; disabled?: boolean; small?: boolean }) {
  return (
    <button className={`btn btn-${tone} ${small ? 'btn-sm' : ''}`} onClick={onClick} data-testid={testid} disabled={disabled}>
      {children}
    </button>
  );
}

export function FileBadge() {
  const { state } = useStore();
  const { t } = useT();
  if (!state.incident) return null;
  return <span className="file-badge" data-testid="file-badge">{t('ملف الحدث', 'Incident file')} {state.incident.id}</span>;
}
