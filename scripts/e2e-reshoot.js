/** Re-capture screens affected by critique fixes. */
const { chromium } = require('playwright-core');
const path = require('path');

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const [, , baseUrl, shotsDir, email, password] = process.argv;

(async () => {
  const browser = await chromium.launch({ executablePath: CHROME, headless: true });
  const page = await (await browser.newContext({ viewport: { width: 375, height: 812 }, deviceScaleFactor: 2 })).newPage();
  page.on('dialog', (d) => d.accept());
  page.setDefaultTimeout(20000);
  const shot = async (n) => { await page.waitForTimeout(1000); await page.screenshot({ path: path.join(shotsDir, n + '.png') }); console.log('shot', n); };

  await page.goto(baseUrl, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1800);
  const signIn = page.getByText('I already have an account');
  if (await signIn.count()) {
    await signIn.first().click();
    await page.waitForTimeout(700);
    await page.getByPlaceholder('Email').fill(email);
    await page.getByPlaceholder('Password').fill(password);
    await page.getByText('Sign in', { exact: true }).first().click();
  }
  await page.waitForTimeout(3500);

  // Test user is a trainer now; switch to client view first.
  if (await page.getByText('Switch to client view').count() === 0) {
    await page.getByText('Account').last().click();
    await page.waitForTimeout(1200);
  }
  await page.getByText('Switch to client view').first().click();
  await page.waitForTimeout(2500);

  await shot('06-home');
  await page.getByText('Discover').last().click();
  await page.waitForTimeout(1500);
  await shot('07-discover');
  try { await page.getByText('Maya Okafor').first().click({ timeout: 8000 }); }
  catch { await page.getByText('Maya Okafor').last().click({ force: true }); }
  await page.waitForTimeout(1800);
  await shot('08-trainer-profile');
  await page.goto(baseUrl, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  await page.getByText('Progress').last().click();
  await page.waitForTimeout(1800);
  await shot('17-progress-filled');
  await browser.close();
  console.log('RESHOOT DONE');
})().catch((e) => { console.error('FAILED:', e.message); process.exit(1); });
