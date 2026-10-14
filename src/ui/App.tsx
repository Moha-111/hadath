import { useEffect, useState } from 'react';
import { PHASES, SCENARIO } from '../domain/scenario';
import { fmtTime } from '../domain/time';
import type { Lang, Role } from '../domain/types';
import { LangContext, ROLE_LABEL, useT } from '../i18n/i18n';
import { AboutView } from './AboutView';
import { CitizenView } from './CitizenView';
import { Btn, Clock, FileBadge } from './common';
import { ManagerView } from './ManagerView';
import { PartnerView } from './PartnerView';
import { ReadinessView } from './ReadinessView';
import { ResponderView } from './ResponderView';
import { StoreProvider, useStore } from './store';

type Tab = Role | 'about';
const TABS: Tab[] = ['manager', 'readiness', 'partner', 'responder', 'citizen', 'about'];

function readHash(): { tab: Tab; lang: Lang } {
  const p = new URLSearchParams(location.hash.slice(1));
  const tab = (p.get('role') as Tab) || 'manager';
  return { tab: TABS.includes(tab) ? tab : 'manager', lang: p.get('lang') === 'en' ? 'en' : 'ar' };
}

export function App() {
  const [{ tab, lang }, setNav] = useState(readHash);
  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    location.hash = `role=${tab}&lang=${lang}`;
  }, [tab, lang]);
  return (
    <LangContext.Provider value={lang}>
      <StoreProvider>
        <Shell tab={tab} setTab={(t) => setNav((n) => ({ ...n, tab: t }))} setLang={(l) => setNav((n) => ({ ...n, lang: l }))} />
      </StoreProvider>
    </LangContext.Provider>
  );
}

function Shell({ tab, setTab, setLang }: { tab: Tab; setTab: (t: Tab) => void; setLang: (l: Lang) => void }) {
  const store = useStore();
  const { t, tx, lang } = useT();
  const [partnerId, setPartnerId] = useState('p-transport');
  const [responderId, setResponderId] = useState('R-sara');
  const partners = store.state.orgs.filter((o) => o.type === 'private');

  // Automation/debug hook used by the video recorder and for contributors.
  useEffect(() => {
    (window as unknown as { hadath: unknown }).hadath = {
      runTo: store.runTo, runNext: store.runNext, reset: store.reset, setOnline: store.setOnline,
      setTab, setPartner: setPartnerId, setResponder: setResponderId,
      get state() { return store.live; }, get scenarioIndex() { return store.scenarioIndex; },
    };
  });

  return (
    <div className="app">
      <div className="ribbon" role="note" data-testid="demo-ribbon">
        {t('نموذج تجريبي — محاكاة ببيانات اصطناعية', 'Prototype — simulation with synthetic data')}
        <span>{t(' · ليس للاستخدام في طوارئ حقيقية', ' · not for use in real emergencies')}</span>
      </div>
      <header className="top">
        <div className="brand">
          <span className="logo">حدث <small>| HADATH</small></span>
          <span className="tagline">{t('جاهزية مشتركة. عمليات موحّدة. استجابة مرنة.', 'Shared readiness. Unified operations. Resilient response.')}</span>
        </div>
        <div className="top-tools">
          <FileBadge />
          <Clock />
          <label className={`conn ${store.sync.online ? 'on' : 'off'}`} data-testid="conn-toggle">
            <input type="checkbox" checked={store.sync.online} onChange={(e) => store.setOnline(e.target.checked)} />
            {store.sync.online ? t('متصل', 'Online') : t('غير متصل', 'Offline')}
          </label>
          <button className="lang" onClick={() => setLang(lang === 'ar' ? 'en' : 'ar')} data-testid="lang-toggle">{lang === 'ar' ? 'English' : 'العربية'}</button>
        </div>
      </header>
      <nav className="tabs" role="tablist">
        {TABS.map((x) => (
          <button key={x} role="tab" aria-selected={tab === x} className={tab === x ? 'on' : ''} onClick={() => setTab(x)} data-testid={`tab-${x}`}>
            {x === 'about' ? t('عن المشروع', 'About') : tx(ROLE_LABEL[x])}
          </button>
        ))}
        {tab === 'partner' && (
          <select value={partnerId} onChange={(e) => setPartnerId(e.target.value)} data-testid="partner-select" className="actor-select">
            {partners.map((p) => <option key={p.id} value={p.id}>{tx(p.name)}</option>)}
          </select>
        )}
        {tab === 'responder' && (
          <select value={responderId} onChange={(e) => setResponderId(e.target.value)} data-testid="responder-select" className="actor-select">
            {store.state.responders.map((r) => <option key={r.id} value={r.id}>{tx(r.name)}</option>)}
          </select>
        )}
      </nav>
      {!store.sync.online && (
        <div className="offline" role="alert" data-testid="offline-banner">
          <b>{t('انقطع الاتصال', 'Connection lost')}</b> — {t('البيانات المعروضة ليست مباشرة. آخر تحديث متزامن:', 'Data shown is NOT live. Last synced update:')} <b>{fmtTime(store.sync.lastSyncAt)}</b>
          {store.sync.outbox.length > 0 && <> · {t(`${store.sync.outbox.length} إجراء بانتظار الإرسال`, `${store.sync.outbox.length} action(s) waiting to send`)}</>}
        </div>
      )}
      <main className={store.stale ? 'stale' : ''}>
        {tab === 'manager' && <ManagerView />}
        {tab === 'readiness' && <ReadinessView />}
        {tab === 'partner' && <PartnerView partnerId={partnerId} />}
        {tab === 'responder' && <ResponderView responderId={responderId} />}
        {tab === 'citizen' && <CitizenView />}
        {tab === 'about' && <AboutView />}
      </main>
      <ScenarioPlayer />
      <div className="toasts" aria-live="polite">
        {store.toasts.map((x) => <div key={x.id} className={`toast toast-${x.kind}`} data-testid={`toast-${x.kind}`}>{tx(x.text)}</div>)}
      </div>
    </div>
  );
}

function ScenarioPlayer() {
  const { scenarioIndex, runNext, reset, runTo } = useStore();
  const { t, tx } = useT();
  const [open, setOpen] = useState(false);
  const next = SCENARIO[scenarioIndex];
  const phase = next ? PHASES.find((p) => p.id === next.phase) : undefined;
  return (
    <div className={`player ${open ? 'open' : ''}`} data-testid="scenario-player">
      <button className="player-toggle" onClick={() => setOpen(!open)}>{t('مشغّل السيناريو', 'Scenario player')} {scenarioIndex}/{SCENARIO.length}</button>
      {open && (
        <div className="player-b">
          <p>{next ? <>{t('الخطوة التالية', 'Next step')} ({tx(phase?.title)}): <b>{tx(next.title)}</b> — <i>{tx(ROLE_LABEL[next.actor.role])}</i></> : t('اكتمل السيناريو.', 'Scenario complete.')}</p>
          <div className="row">
            <Btn small onClick={runNext} disabled={!next} testid="player-next">{t('تنفيذ الخطوة', 'Run step')}</Btn>
            <Btn small tone="ghost" onClick={() => runTo(SCENARIO[SCENARIO.length - 1].id)} disabled={!next}>{t('حتى النهاية', 'Run to end')}</Btn>
            <Btn small tone="ghost" onClick={reset} testid="player-reset">{t('إعادة التشغيل', 'Reset')}</Btn>
          </div>
        </div>
      )}
    </div>
  );
}
