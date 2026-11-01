// Accessibility audit: opens every main screen in Chromium and runs axe-core (WCAG 2.1 A/AA).
// Usage: npm start (in another terminal), then: npm run a11y   (needs Playwright installed)
import { createRequire } from 'node:module';
import fs from 'node:fs';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const AXE = fs.readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');
const BASE = process.env.BASE_URL || 'http://localhost:8080';

async function audit(page, name) {
  await page.addScriptTag({ content: AXE });
  const r = await page.evaluate(
    async () =>
      (await window.axe.run(document, { runOnly: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice'] }))
        .violations,
  );
  const bad = r.filter((v) => v.impact === 'serious' || v.impact === 'critical');
  console.log(`${bad.length ? '✗' : '✓'} ${name}: ${r.length} issue(s), ${bad.length} serious`);
  for (const v of r)
    console.log(`   [${v.impact}] ${v.id}: ${v.help} (${v.nodes.length}) e.g. ${v.nodes[0]?.target?.join(' ')}`);
  return bad.length;
}

const browser = await chromium.launch();
let serious = 0;
for (const [label, viewport] of [
  ['desktop', { width: 1440, height: 900 }],
  ['phone', { width: 390, height: 844 }],
]) {
  // bypassCSP: the app's Content-Security-Policy (correctly) blocks injected scripts such as axe
  const page = await (await browser.newContext({ viewport, bypassCSP: true })).newPage();
  const go = async (hash, name, wait = 1200) => {
    await page.goto(BASE + '/' + hash);
    await page.waitForTimeout(wait);
    serious += await audit(page, `${label} ${name}`);
  };
  await go('', 'landing');
  await go('#/new', 'new plan');
  await page.click('[data-act="sample"]').catch(() => {});
  await page.goto(BASE + '/');
  await page.waitForTimeout(600);
  await page.click('[data-act="sample"]', { force: true });
  await page.waitForTimeout(2000);
  const id = (await page.evaluate(() => location.hash)).split('/')[2];
  for (const v of ['orbit', 'budget', 'timeline', 'family']) await go(`#/e/${id}/${v}`, `host ${v}`);
  await page.click('[data-act="openview"][data-h="sana"]', { force: true });
  await page.waitForTimeout(800);
  const tok = await page.evaluate((id) => JSON.parse(localStorage.getItem('utsav-tokens'))[id].sana, id);
  for (const t of ['today', 'steps', 'vendors', 'ask']) await go(`#/h/${tok}/${t}`, `helper ${t}`);
}
await browser.close();
process.exit(serious ? 1 : 0);
