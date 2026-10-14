// Replays the synthetic scenario headlessly and prints the log and the
// performance indicators. Usage: npm run scenario
import { evaluateGaps } from '../src/domain/gaps';
import { PHASES, SCENARIO, runScenario } from '../src/domain/scenario';
import { createSeed } from '../src/domain/seed';
import { apply } from '../src/domain/engine';
import { fmtTime } from '../src/domain/time';

const lang = process.argv.includes('--en') ? 'en' : 'ar';
let s = createSeed();
let phase = '';
for (const step of SCENARIO) {
  if (step.phase !== phase) {
    phase = step.phase;
    console.log(`\n== ${PHASES.find((p) => p.id === phase)!.title[lang]} ==`);
  }
  const r = apply(s, step.actor, step.cmd);
  if (!r.ok) throw new Error(`${step.id} refused: ${r.error.message.en}`);
  s = r.state;
  const alerts = evaluateGaps(s).filter((a) => a.scope === 'incident').map((a) => a.rule);
  console.log(`${fmtTime(s.now)}  ${step.id}  [${step.actor.role}]  ${step.title[lang]}${alerts.length ? `   ⚠ ${alerts.join(', ')}` : ''}`);
}
const final = runScenario();
console.log(`\nIncident status: ${final.incident?.status}`);
for (const m of final.incident!.recovery!.report!.metrics) console.log(`- ${m.label[lang]}: ${m.value ?? '—'} ${m.unit[lang]}  (${m.derivation[lang]})`);
console.log('\n' + final.incident!.recovery!.report!.note[lang]);
