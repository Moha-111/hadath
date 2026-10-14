// Records the simulation video by driving the REAL running app with Playwright.
// Every state change on screen comes from clicking the app's own buttons (or,
// for a few repetitive steps, the app's built-in scenario player via runTo).
//
// Usage: node recordings/record.mjs <app-url> <tts-dir|-> <out-dir>
//   CHROMIUM_PATH=/path/to/chrome (optional)
//   VIDEO_LANG=en  English UI and captions. Pass "-" as <tts-dir> for a silent
//                  video: each line is held for a reading time based on its length.
import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';

const [url = 'http://localhost:4173/', ttsDir = 'recordings/out/tts', outDir = 'recordings/out'] = process.argv.slice(2);
const narration = JSON.parse(fs.readFileSync(new URL('./narration.json', import.meta.url), 'utf8')).lines;
const EN = process.env.VIDEO_LANG === 'en';
const readTime = (text) => Math.round(Math.min(9, Math.max(4.5, text.split(/\s+/).length * 0.36 + 2)) * 100) / 100;
const durations = ttsDir === '-'
  ? Object.fromEntries(narration.map((l) => [l.id, readTime(EN ? l.caption_en : l.caption)]))
  : JSON.parse(fs.readFileSync(path.join(ttsDir, 'durations.json'), 'utf8'));
const GAP = 0.35; // seconds of silence between lines

const SCENES = {
  intro: 'حدث | HADATH', before: '١ · قبل الحدث', start: '٢ · بداية الحدث', ops: '٣ · العمليات',
  integration: '٤ · التكامل', resilience: '٥ · المرونة', citizen: '٦ · مشاركة المواطن', recovery: '٧ · التعافي', outro: 'ساهم في المشروع',
};
const SCENES_EN = {
  intro: 'HADATH | حدث', before: '1 · Before the event', start: '2 · Event start', ops: '3 · Operations',
  integration: '4 · Integration', resilience: '5 · Resilience', citizen: '6 · Citizen participation', recovery: '7 · Recovery', outro: 'Contribute',
};

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const context = await browser.newContext({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1, recordVideo: { dir: path.join(outDir, 'raw'), size: { width: 1280, height: 720 } } });
const tCtx = Date.now();
const page = await context.newPage();
page.setDefaultTimeout(6000);
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));

await page.goto(`${url}#role=manager&lang=${EN ? 'en' : 'ar'}`);
await page.waitForFunction(() => window.hadath);
await page.addStyleTag({ content: '.player{display:none!important} .toasts{bottom:90px!important}' });
await page.evaluate(() => {
  // Scene badge sits in the same column as the caption, so it stays above it even when the caption wraps.
  const c = document.createElement('div'); c.className = 'vcap'; c.style.cssText = 'flex-direction:column;align-items:center;gap:8px';
  const s = document.createElement('div'); s.className = 'vscene'; s.id = 'vscene'; s.style.cssText = 'position:static;transform:none';
  const cap = document.createElement('span'); cap.id = 'vcap';
  c.append(s, cap); document.body.appendChild(c);
  window.__errs = [];
  new MutationObserver(() => document.querySelectorAll('.toast-error').forEach((t) => { if (!window.__errs.includes(t.textContent)) window.__errs.push(t.textContent); })).observe(document.body, { childList: true, subtree: true });
});
await page.waitForTimeout(900);

const sleep = (ms) => page.waitForTimeout(ms);
const H = (fn, arg) => page.evaluate(fn, arg);
const tab = async (t) => { await H((x) => window.hadath.setTab(x), t); await sleep(450); };
async function focus(testid, { click = false, wait = 550 } = {}) {
  const tf = Date.now();
  try { return await focusInner(testid, { click, wait }); } finally { if (process.env.DEBUG) console.error(`     ${testid} ${Date.now() - tf}ms`); }
}
async function focusInner(testid, { click, wait }) {
  const el = await page.getByTestId(testid).first().elementHandle();
  await el.evaluate((n, ms) => { n.scrollIntoView({ block: 'center', behavior: 'smooth' }); n.classList.add('vfocus'); setTimeout(() => n.classList.remove('vfocus'), ms + 900); }, wait);
  await sleep(wait);
  // A direct DOM click on the app's real button (avoids actionability retries
  // caused by sticky headers during smooth scrolling).
  if (click) await el.evaluate((n) => n.click());
  await sleep(200);
}
const click = (id, wait) => focus(id, { click: true, wait });
const select = async (id, value) => { await focus(id, { wait: 350 }); await page.getByTestId(id).selectOption(value); await sleep(250); };
const runTo = async (stepId) => {
  const ok = await H((s) => { const before = window.hadath.scenarioIndex; window.hadath.runTo(s); return before; }, stepId);
  await sleep(300);
  return ok;
};

const ACTIONS = {
  n01: async () => { await sleep(1500); await focus('asset-map', { wait: 1800 }); await focus('alerts', { wait: 600 }); },
  n02: async () => { await tab('readiness'); await focus('readiness-gaps', { wait: 1200 }); await click('check-ok-AED-02', 700); await focus('readiness-kpis', { wait: 400 }); },
  n03: async () => {
    await select('course-select-R-sara', 'C-STOP'); await click('train-R-sara', 400);
    await H(() => window.hadath.setPartner('p-comms')); await tab('partner'); await click('register-capability', 500);
    await H(() => window.hadath.setResponder('R-sara')); await tab('responder'); await click('availability', 500);
    await runTo('s05'); // simulated time passes to event day
  },
  n05: async () => {
    await tab('citizen'); await click('submit-report', 500);
    await tab('manager'); await click('verify-RPT-1', 500); await click('create-incident', 500); await focus('incident-file', { wait: 300 });
  },
  n06: async () => { await click('set-objectives', 400); await click('toggle-zone-Z-CCP', 300); await click('toggle-zone-Z-SUP', 300); await click('set-need', 400); },
  n07: async () => {
    await click('create-T-1', 400); await select('assign-select-T-1', 'R-sara'); await click('assign-T-1', 300);
    await select('alloc-select-T-1', 'BC-01'); await click('alloc-T-1', 300);
    await tab('responder'); await click('accept-T-1', 500);
    await tab('manager'); await runTo('s20'); await focus('task-T-2', { wait: 900 });
  },
  n09: async () => {
    await click('request-support', 400); await click('approve-support-SR-1', 500);
    await H(() => window.hadath.setPartner('p-transport')); await tab('partner'); await click('accept-activation-SR-1', 700);
    await tab('manager'); await focus('task-T-SR-1', { wait: 600 });
  },
  n10: async () => { await focus('alert-DEMAND_EXCEEDS_CAPACITY:transport', { wait: 1500 }); await click('approve-DEMAND_EXCEEDS_CAPACITY:transport', 400); },
  n11: async () => {
    await H(() => window.hadath.setResponder('R-khaled')); await tab('responder'); await click('fault-TK-02', 600);
    await tab('manager'); await focus('alert-RESOURCE_NOT_READY:TK-02:T-2', { wait: 2200 });
  },
  n12: async () => { await click('approve-RESOURCE_NOT_READY:TK-02:T-2', 500); await focus('task-T-2', { wait: 1200 }); },
  n13: async () => {
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'smooth' })); await sleep(300);
    await click('conn-toggle', 300); await focus('offline-banner', { wait: 2600 }); await focus('event-eye', { wait: 2400 });
    await click('conn-toggle', 300);
  },
  n14: async () => {
    await click('issue-directive', 500); await tab('citizen'); await focus('directive-DIR-1', { wait: 600 });
    if (EN) { await click('dlang-ar', 1000); await click('dlang-ur', 1000); await click('dlang-en', 400); } else { await click('dlang-ur', 1000); await click('dlang-en', 1000); await click('dlang-ar', 400); } await click('ack-DIR-1', 400);
  },
  n15: async () => {
    await runTo('s33'); await tab('manager'); await click('start-recovery', 400);
    await click('close-T-1', 250); await click('close-T-2', 250); await click('close-T-SR-1', 250); await click('generate-report', 400);
    await focus('performance-report', { wait: 1500 });
  },
  n16: async () => { await click('add-improvement', 500); await focus('improvement-IMP-1', { wait: 700 }); await click('close-incident', 600); },
  n17: async () => { await tab('about'); await page.evaluate(() => window.scrollTo({ top: 0 })); await sleep(300); },
  n18: async () => { await focus('cta', { wait: 800 }); },
};

const timeline = [];
const t0 = Date.now();
for (const line of narration) {
  const start = (Date.now() - tCtx) / 1000;
  await H(([cap, scene]) => { document.getElementById('vcap').textContent = cap; document.getElementById('vscene').textContent = scene; }, [EN ? line.caption_en : line.caption, (EN ? SCENES_EN : SCENES)[line.scene]]);
  const dur = durations[line.id];
  console.error(`[${start.toFixed(1)}s] ${line.id}`);
  await (ACTIONS[line.id] ?? (async () => {}))();
  const elapsed = (Date.now() - tCtx) / 1000 - start;
  console.error(`   actions ${elapsed.toFixed(1)}s, audio ${dur}s`);
  const remaining = dur + GAP - elapsed;
  if (remaining > 0) await sleep(remaining * 1000);
  timeline.push({ id: line.id, start, dur, caption: line.caption, caption_en: line.caption_en });
}
await sleep(1200);
const toastErrors = await page.evaluate(() => window.__errs);
const finalStatus = await H(() => window.hadath.state.incident?.status);
await context.close();
await browser.close();
const raw = fs.readdirSync(path.join(outDir, 'raw')).filter((f) => f.endsWith('.webm')).map((f) => path.join(outDir, 'raw', f)).sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs)[0];
fs.writeFileSync(path.join(outDir, 'timeline.json'), JSON.stringify({ raw, timeline, errors, toastErrors, finalStatus, totalSec: (Date.now() - t0) / 1000 }, null, 1));
console.log(JSON.stringify({ raw, errors, toastErrors, finalStatus, lines: timeline.length, end: timeline.at(-1).start + timeline.at(-1).dur }));
