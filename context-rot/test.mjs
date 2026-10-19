// Run with: node context-rot/test.mjs
// Exercise the inline pure functions without installing browser dependencies.
import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
let code = fs.readFileSync(new URL('./index.html', import.meta.url), 'utf8').match(/<script type="module">([\s\S]*?)<\/script>/)[1];
code = code.slice(0, code.indexOf("for (const id of ['fact'"));
code += '\nglobalThis.demo = { makeTask, buildContext, evaluate, validate, LEVELS, levelsFor, ChromeAIEngine, SimulationEngine };';
const sandbox = { document: { getElementById: () => ({}) }, navigator: {}, DOMException };
vm.createContext(sandbox); vm.runInContext(code, sandbox);
const { makeTask, buildContext, evaluate, validate, LEVELS, levelsFor, ChromeAIEngine, SimulationEngine } = sandbox.demo;
const base = { task: 'simple', caseNumber: 1, fact: 'The project launch date is October 28.', question: 'When is the project launch date?', expected: 'October 28', level: 1, position: 'middle', temperature: 0.2 };
for (const task of ['simple', 'linked', 'audit']) {
  for (let caseNumber = 1; caseNumber <= 20; caseNumber++) {
    let previousLength = 0;
    for (const level of levelsFor(task)) {
      const contexts = ['beginning', 'middle', 'end', 'spread'].map(position => buildContext({ ...base, task, caseNumber, level, position }));
      assert.equal(new Set(contexts.map(c => c.text.length)).size, 1, 'Moving records preserves total length');
      const noise = c => c.parts.filter(p => !p.relevant).map(p => p.text).join('');
      assert.equal(new Set(contexts.map(noise)).size, 1, 'Moving records preserves noise and question');
      assert.ok(contexts[0].text.length > previousLength); previousLength = contexts[0].text.length;
      for (const context of contexts) {
        const relevant = context.parts.filter(p => p.relevant).map(p => p.text);
        assert.equal(new Set(relevant).size, relevant.length, 'Relevant records appear once');
        assert.equal(context.text, buildContext({ ...base, task, caseNumber, level, position: ['beginning', 'middle', 'end', 'spread'][contexts.indexOf(context)] }).text);
      }
    }
    if (task !== 'simple') {
      const generated = makeTask(task, caseNumber);
      assert.ok(evaluate(JSON.stringify(generated.expected), generated.expected, task).correct);
      const data = task === 'audit' ? generated.expected : [generated.expected];
      // Independently traverse source records to verify the derived answer key.
      for (const row of data) {
        const project = generated.records.find(r => r.startsWith(`Project ${row.project}:`));
        const packageId = project.match(/PK-\d+/)[0];
        const packageRecord = generated.records.find(r => r.startsWith(`Package ${packageId}:`));
        const team = packageRecord.match(/T-\d+/)[0];
        assert.ok(generated.records.find(r => r.startsWith(`Team ${team}:`)).includes(`owner ${row.owner}.`));
        if (task === 'audit') {
          const eligible = packageRecord.includes('QA PASS') && packageRecord.includes('blockers 0');
          assert.equal(row.decision, eligible ? 'SHIP' : 'HOLD');
          if (eligible) {
            const lane = packageRecord.match(/L-\d+/)[0];
            assert.ok(generated.records.find(r => r.startsWith(`Lane ${lane}:`)).includes(row.ship_date));
          } else assert.equal(row.ship_date, 'HOLD');
        }
      }
    }
  }
}
const expected = makeTask('audit', 1).expected;
const prefixed = JSON.parse(JSON.stringify(expected)); prefixed[0].project = 'Project Orion';
assert.ok(evaluate(JSON.stringify(prefixed), expected, 'audit').correct);
const wrong = JSON.parse(JSON.stringify(expected)); wrong[0].approval_code = 'APPROVED-123'; wrong[1].decision = 'SHIP';
const score = evaluate(JSON.stringify(wrong), expected, 'audit');
assert.equal(score.unsupported, 1);
const abstention = JSON.parse(JSON.stringify(expected)); abstention[0].approval_code = 'not provided';
assert.equal(evaluate(JSON.stringify(abstention), expected, 'audit').unsupported, 0);
abstention[0].approval_code = 123;
assert.equal(evaluate(JSON.stringify(abstention), expected, 'audit').unsupported, 1); assert.equal(score.matched, 18); assert.equal(score.correct, false);
assert.ok(evaluate('October 28', 'October 28').correct);
assert.ok(!evaluate('October 21', 'October 28').correct);
assert.ok(evaluate('not JSON', expected, 'audit').formatError);
assert.ok(evaluate('{}', expected, 'audit').formatError);
assert.ok(!evaluate(JSON.stringify([...expected].reverse()), expected, 'audit').correct);
assert.ok(evaluate('```json\n' + JSON.stringify(expected) + '\n```', expected, 'audit').correct);
assert.throws(() => validate({ ...base, caseNumber: 0, task: 'audit' }));
assert.equal(await new ChromeAIEngine().isAvailable(), false);
assert.match(await new SimulationEngine().prompt('', { task: 'audit', signal: { aborted: false } }), /no inference/);
let destroyed = 0, prompts = 0;
const adapter = new ChromeAIEngine();
const session = (tokens, overflow = false) => ({ contextWindow: 2048,
  addEventListener: (_, callback) => { if (overflow) callback(); },
  measureContextUsage: async () => tokens,
  prompt: async () => { prompts++; return 'October 28'; }, destroy: () => destroyed++ });
adapter.base = { clone: async () => session(100) };
assert.equal(await adapter.prompt('input', { signal: new AbortController().signal }), 'October 28');
adapter.base = { clone: async () => session(1800) };
await assert.rejects(() => adapter.prompt('input', { signal: new AbortController().signal }), /exceeds/);
adapter.base = { clone: async () => session(100, true) };
await assert.rejects(() => adapter.prompt('input', { signal: new AbortController().signal }), /overflow/);
assert.equal(destroyed, 3); assert.equal(prompts, 2);
console.log('PASS: 1,200 task/case/length/position combinations; stable contexts, independently verified answer keys, scoring categories, unavailable Chrome, honest simulation.');
