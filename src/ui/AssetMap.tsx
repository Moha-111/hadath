// Schematic, synthetic map of the fictional "Oasis Events Complex".
// Not a real facility plan. Coordinates are an abstract 100×60 grid.
import { useState } from 'react';
import { EQUIPMENT_STALE_DAYS, isEquipmentStale, tasksUsingResource } from '../domain/rules';
import type { Resource, ResourceKind } from '../domain/types';
import { KIND_LABEL, ZONE_LABEL, useT } from '../i18n/i18n';
import { Age, Card, Status } from './common';
import { useStore } from './store';

type MapAsset = Pick<Resource, 'id' | 'kind' | 'name' | 'status' | 'access' | 'pos'> & Partial<Resource>;

const GLYPH: Partial<Record<ResourceKind, string>> = { aed: '♥', trauma_kit: '✚', bleeding_kit: '●', ambulance: 'A', transport: 'B', logistics: 'L', care: 'C', comms: 'R' };
const COLOR: Record<string, string> = { ready: 'var(--ok)', not_ready: 'var(--bad)', out_of_service: 'var(--bad)', maintenance: 'var(--warn)' };

export function AssetMap({ assets, publicMode = false, kinds = ['aed', 'trauma_kit', 'bleeding_kit'] }: { assets: MapAsset[]; publicMode?: boolean; kinds?: ResourceKind[] }) {
  const { state } = useStore();
  const { t, tx } = useT();
  const [layers, setLayers] = useState<ResourceKind[]>(kinds);
  const [sel, setSel] = useState<string | undefined>();
  const shown = assets.filter((a) => layers.includes(a.kind));
  const picked = assets.find((a) => a.id === sel);
  const zones = publicMode ? [] : state.incident?.zones ?? [];

  return (
    <Card id="asset-map" title={t('خريطة تخطيطية اصطناعية — أجهزة AED وحقائب الإصابات والسيطرة على النزيف', 'Synthetic schematic map — AEDs, trauma & bleeding-control kits')}>
      <div className="layers">
        {kinds.map((k) => (
          <label key={k}>
            <input type="checkbox" checked={layers.includes(k)} onChange={() => setLayers((l) => (l.includes(k) ? l.filter((x) => x !== k) : [...l, k]))} /> {GLYPH[k]} {tx(KIND_LABEL[k])}
          </label>
        ))}
      </div>
      <div className="map-wrap">
        <svg viewBox="0 0 100 60" className="map" role="img" aria-label={t('خريطة تخطيطية لمنشأة خيالية', 'Schematic map of a fictional facility')}>
          <rect x="1" y="1" width="98" height="58" rx="2" className="m-site" />
          {/* Static public landmarks */}
          <rect x="30" y="3" width="30" height="15" rx="1" className="m-stand" />
          <text x="45" y="11.5" className="m-label">{t('المدرّج الشمالي', 'North stand')}</text>
          <rect x="76" y="2" width="8" height="36" className="m-lane" />
          <text x="80" y="20" className="m-label m-vert">{t('مسار الطوارئ (ب)', 'Lane B')}</text>
          <rect x="2" y="2" width="22" height="20" rx="1" className="m-assembly" />
          <text x="13" y="12" className="m-label">{t('نقطة التجمع (ج)', 'Assembly C')}</text>
          <text x="3" y="31" className="m-label m-small">{t('بوابة (أ)', 'Gate A')}</text>
          <text x="88" y="40" className="m-label m-small">{t('بوابة (ب)', 'Gate B')}</text>
          {zones.map((z) => (
            <g key={z.id} className={`m-zone m-zone-${z.kind} ${z.allowed ? 'is-open' : ''}`} data-testid={`zone-${z.id}`}>
              <rect x={z.rect.x} y={z.rect.y} width={z.rect.w} height={z.rect.h} rx="1" />
              <text x={z.rect.x + 1} y={z.rect.y + z.rect.h - 1.2} className="m-zlabel">{tx(ZONE_LABEL[z.kind])}{z.allowed ? '' : ` · ${t('مغلقة', 'closed')}`}</text>
            </g>
          ))}
          {shown.map((a) => {
            const stale = a.lastCheckedAt ? isEquipmentStale(a as Resource, state.now) : false;
            const busy = !publicMode && tasksUsingResource(state.incident, a.id).length > 0;
            return (
              <g key={a.id} className={`m-asset ${sel === a.id ? 'is-sel' : ''}`} transform={`translate(${a.pos.x} ${a.pos.y})`} onClick={() => setSel(a.id)} data-testid={`asset-${a.id}`} role="button" tabIndex={0}>
                <circle r="2.6" fill={COLOR[a.status]} className={stale ? 'm-stale' : ''} />
                {busy && <circle r="3.6" className="m-busy" />}
                <text className="m-glyph" y="1">{GLYPH[a.kind]}</text>
                <text className="m-id" y="5.2">{a.id}</text>
              </g>
            );
          })}
        </svg>
        <div className="map-side">
          <div className="legend">
            <span><i style={{ background: 'var(--ok)' }} /> {t('جاهز', 'Ready')}</span>
            <span><i style={{ background: 'var(--warn)' }} /> {t('صيانة', 'Maintenance')}</span>
            <span><i style={{ background: 'var(--bad)' }} /> {t('غير جاهز', 'Not ready')}</span>
            {!publicMode && <span><i className="i-dash" /> {t(`فحص أقدم من ${EQUIPMENT_STALE_DAYS} يومًا`, `Check > ${EQUIPMENT_STALE_DAYS} days`)}</span>}
          </div>
          {picked ? (
            <dl className="asset-detail" data-testid="asset-detail">
              <dt>{t('الأصل', 'Asset')}</dt><dd><b>{picked.id}</b> — {tx(picked.name)}</dd>
              <dt>{t('الحالة', 'Status')}</dt><dd><Status value={picked.status} /></dd>
              <dt>{t('الوصول', 'Access')}</dt><dd>{tx(picked.access)}</dd>
              {!publicMode && picked.lastCheckedAt && (<><dt>{t('آخر فحص', 'Last check')}</dt><dd><Age at={picked.lastCheckedAt} limitDays={EQUIPMENT_STALE_DAYS} /></dd></>)}
              {!publicMode && picked.checkedBy && (<><dt>{t('المسؤول عن الفحص', 'Inspector')}</dt><dd>{tx(picked.checkedBy)}</dd></>)}
            </dl>
          ) : (
            <p className="hint">{t('اختر رمزًا على الخريطة لعرض حالته.', 'Select a marker to see its status.')}</p>
          )}
          {publicMode && <p className="hint">{t('لا تُعرض للمواطن المواقع التشغيلية أو تخصيصات الموارد.', 'Operational locations and allocations are not shown to citizens.')}</p>}
        </div>
      </div>
      <p className="fine">{t('منشأة خيالية ومخطط اصطناعي — ليس مخططًا لمنشأة حقيقية.', 'Fictional facility, synthetic layout — not a real site plan.')}</p>
    </Card>
  );
}
