/** Logged-out production smoke test. Use: node scripts/smoke-web.js <baseUrl> */
const { chromium } = require('playwright-core');
const path = require('path');
const os = require('os');
const { spawn } = require('child_process');

const baseUrl = (process.argv[2] || 'http://127.0.0.1:4173').replace(/\/$/, '');
const chrome = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
let smokeServer = null;
let smokeBrowser = null;

(async () => {
  smokeServer = baseUrl.includes('127.0.0.1')
    ? spawn(process.execPath, [path.join(__dirname, 'serve-dist.js'), '4173'], { stdio: 'ignore', windowsHide: true })
    : null;
  if (smokeServer) await new Promise((resolve) => setTimeout(resolve, 700));
  smokeBrowser = await chromium.launch({ executablePath: chrome, headless: true });
  const page = await (await smokeBrowser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 })).newPage();
  const errors = [];
  const badResponses = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('response', (r) => { if (r.status() >= 400) badResponses.push(`${r.status()} ${r.url()}`); });
  page.setDefaultTimeout(15000);

  await page.goto(baseUrl, { waitUntil: 'networkidle' });
  await page.getByText('FIT', { exact: true }).waitFor();
  await page.getByText('Get started', { exact: true }).click();
  await page.getByText('Create your account', { exact: true }).waitFor();
  await page.getByText('Continue with Google', { exact: true }).waitFor();

  await page.goto(`${baseUrl}/discover`, { waitUntil: 'networkidle' });
  for (const name of ['Maya Okafor', 'Diego Santos', 'Aisha Rahman', 'Liam Chen', 'Sofia Marin', 'Marcus Bell']) {
    await page.getByText(name, { exact: false }).first().waitFor();
  }
  await page.getByText('Maya Okafor', { exact: false }).first().click();
  await page.getByText('Session types & pricing', { exact: true }).waitFor();
  await page.getByText('Book a session', { exact: true }).click();
  await page.getByText('Create your account', { exact: true }).waitFor();

  await page.goto(`${baseUrl}/payment-methods`, { waitUntil: 'networkidle' });
  await page.getByText('No payment method connected', { exact: true }).waitFor();
  if ((await page.locator('body').innerText()).includes('4242')) throw new Error('Fake payment card is still visible');

  await page.goto(`${baseUrl}/reset-password`, { waitUntil: 'networkidle' });
  await page.getByText('Choose a new password', { exact: true }).waitFor();
  await page.screenshot({ path: path.join(os.tmpdir(), 'fitconnect-smoke.png'), fullPage: true });

  const serious = errors.filter((e) => !e.includes('favicon') && !e.includes('net::ERR_ABORTED'));
  if (serious.length) throw new Error(`Browser errors: ${serious.join(' | ')}; responses: ${badResponses.join(' | ')}`);
  console.log(JSON.stringify({ ok: true, pages: ['welcome', 'sign-up', 'discover', 'trainer', 'booking', 'payments', 'reset-password'], screenshot: path.join(os.tmpdir(), 'fitconnect-smoke.png') }));
  await smokeBrowser.close();
  smokeServer?.kill();
})().catch(async (e) => {
  console.error(e.stack || e.message);
  await smokeBrowser?.close().catch(() => {});
  smokeServer?.kill();
  process.exit(1);
});
