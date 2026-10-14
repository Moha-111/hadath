// «عين الحدث» — a SYNTHETIC visual feed placeholder. It draws procedurally
// generated shapes; it is not connected to any camera, drone or video source.
// It represents a possible future integration with an authorised agency only.
import { useEffect, useState } from 'react';
import { fmtTime } from '../domain/time';
import { useT } from '../i18n/i18n';
import { Card } from './common';
import { useStore } from './store';

// Deterministic pseudo-random positions so the "feed" is reproducible.
const rand = (i: number) => {
  const x = Math.sin(i * 12.9898) * 43758.5453;
  return x - Math.floor(x);
};
const PEOPLE = Array.from({ length: 46 }, (_, i) => ({ x0: 32 + rand(i) * 26, y0: 6 + rand(i + 99) * 10, speed: 0.4 + rand(i + 7) * 0.6 }));

export function EventEye() {
  const { state, stale } = useStore();
  const { t } = useT();
  const [tick, setTick] = useState(0);
  const active = state.incident && state.incident.status === 'active';

  useEffect(() => {
    if (stale) return;
    const h = setInterval(() => setTick((x) => x + 1), 120);
    return () => clearInterval(h);
  }, [stale]);

  const phase = active ? Math.min(1, (tick % 260) / 200) : 0;
  return (
    <Card id="event-eye" title={<>{t('عين الحدث', 'Event Eye')} <span className="synthetic-tag">{t('مصدر مرئي اصطناعي', 'SYNTHETIC visual source')}</span></>}>
      <div className={`eye ${stale ? 'eye-frozen' : ''}`}>
        <svg viewBox="0 0 100 60" className="eye-svg" aria-label={t('مشهد اصطناعي مولّد برمجيًا', 'Procedurally generated synthetic scene')}>
          <rect width="100" height="60" className="eye-bg" />
          <rect x="30" y="3" width="30" height="15" className="eye-stand" />
          {active && <polygon points="40,3 52,3 49,11 43,13" className="eye-collapse" />}
          <rect x="76" y="2" width="8" height="56" className="eye-lane" />
          <rect x="2" y="2" width="22" height="20" className="eye-asm" />
          {PEOPLE.map((p, i) => {
            const k = Math.min(1, phase * p.speed * 1.6);
            const x = p.x0 + (6 + rand(i + 3) * 14 - p.x0) * k;
            const y = p.y0 + (5 + rand(i + 5) * 14 - p.y0) * k;
            return <circle key={i} cx={x} cy={y} r="0.8" className="eye-dot" />;
          })}
          <g className="eye-hud">
            <text x="2" y="57">{t('محاكاة', 'SIM')} · {fmtTime(state.now)}</text>
            <text x="98" y="57" textAnchor="end">{t('ليس بثًا حيًا', 'NOT A LIVE FEED')}</text>
          </g>
        </svg>
        {stale && <div className="eye-overlay">{t('متوقف — لا اتصال. آخر إطار:', 'Paused — offline. Last frame:')} {fmtTime(state.now)}</div>}
      </div>
      <p className="fine">
        {t(
          'لوحة توضيحية لتكامل مستقبلي مع كاميرات أو درون تابعة لجهة مخوّلة. لا يوجد أي اتصال أو تشغيل فعلي، ولا تُستخدم صور أشخاص.',
          'Illustrative panel for a future integration with cameras or drones operated by an authorised agency. No real connection or operation exists, and no images of people are used.',
        )}
      </p>
    </Card>
  );
}
