/**
 * End-to-end verification + screenshot run against the live backend.
 * Drives the built web app (dist/) in headless Chrome via playwright-core.
 * Usage: node scripts/e2e-run.js partA|partB <baseUrl> <shotsDir> <email> <password>
 */
const { chromium } = require('playwright-core');
const path = require('path');
const fs = require('fs');

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const [, , part, baseUrl, shotsDir, email, password] = process.argv;

const log = (...a) => console.log('[e2e]', ...a);
fs.mkdirSync(shotsDir, { recursive: true });

async function main() {
  const browser = await chromium.launch({ executablePath: CHROME, headless: true });
  const ctx = await browser.newContext({
    viewport: { width: 375, height: 812 },
    deviceScaleFactor: 2,
  });
  const page = await ctx.newPage();
  page.on('dialog', async (d) => { log('dialog:', d.message().slice(0, 60)); await d.accept(); });
  page.setDefaultTimeout(20000);

  const shot = async (name) => {
    await page.waitForTimeout(900);
    await page.screenshot({ path: path.join(shotsDir, name + '.png') });
    log('shot', name);
  };
  // Tab navigators keep inactive screens mounted, so a text match can resolve
  // to a covered element. Try the requested match; fall back to the last
  // (most recently mounted) instance with force.
  const click = async (text, nth = 0) => {
    const loc = page.getByText(text, { exact: false });
    try {
      await loc.nth(nth).click({ timeout: 8000 });
    } catch {
      await loc.last().click({ force: true, timeout: 8000 });
    }
    await page.waitForTimeout(700);
  };
  const fill = async (placeholder, value) => {
    await page.getByPlaceholder(placeholder).first().fill(value);
  };

  if (part === 'partA') {
    await page.goto(baseUrl, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);
    await shot('01-welcome');

    // Sign up
    await click('Get started');
    await shot('02-signup');
    await fill('Full name', 'Khalid Test');
    await fill('Email', email);
    await fill('Password', password);
    await click('Create account');
    await page.waitForTimeout(3000);

    // Onboarding
    await shot('03-onboarding-goals');
    await click('Build muscle');
    await click('Lose weight');
    await click('Improve mobility');
    await click('Continue');
    await shot('04-onboarding-level');
    await click('Intermediate');
    await click('Continue');
    await shot('05-onboarding-injuries');
    await click('None', 0);
    await click('Find my trainer');
    await page.waitForTimeout(2500);
    await shot('06-home');

    // Discover
    await click('Discover');
    await page.waitForTimeout(1200);
    await shot('07-discover');

    // Trainer profile (Maya)
    await click('Maya Okafor', 0);
    await page.waitForTimeout(1500);
    await shot('08-trainer-profile');

    // Booking flow
    await click('Book a session');
    await shot('09-booking-plan');
    await click('Continue');
    await shot('10-booking-details');
    await click('Continue');
    await page.waitForTimeout(500);
    await click('TODAY');
    await click('9:00 AM');
    await shot('11-booking-when');
    await click('Continue');
    await shot('12-booking-review');
    try { await page.getByText(/^Pay SAR/).first().click({ timeout: 8000 }); } catch { await page.getByText(/^Pay SAR/).last().click({ force: true }); }
    await page.waitForTimeout(3500);
    await shot('13-confirmation');

    // Track + rate
    await click('Track your trainer');
    await page.waitForTimeout(2000);
    await shot('14-track');
    await click('End session & rate');
    await page.waitForTimeout(1200);
    await shot('15-rate');

    // Progress: log real data
    await page.goto(baseUrl, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    await click('Progress');
    await page.waitForTimeout(1500);
    await shot('16-progress-before');
    await click('+ Log weight');
    await page.waitForTimeout(600);
    await fill('e.g. 80.5', '82.4');
    await click('Save');
    await page.waitForTimeout(1200);
    await click('+ Add PR');
    await page.waitForTimeout(600);
    await fill('e.g. Back squat', 'Back squat');
    await fill('e.g. 120', '110');
    await click('Save');
    await page.waitForTimeout(1200);
    await click('Set a goal');
    await page.waitForTimeout(600);
    await fill('e.g. 78', '75');
    await click('Save');
    await page.waitForTimeout(1200);
    await shot('17-progress-filled');

    // Account + edit profile with socials
    await click('Account');
    await page.waitForTimeout(1000);
    await shot('18-account');
    await click('Edit', 0);
    await page.waitForTimeout(1000);
    await fill('username', 'k7.fit');
    await click('Save changes');
    await page.waitForTimeout(1500);
    await shot('19-account-after-edit');

    // Static routes
    for (const [route, name] of [
      ['/favorites', '20-favorites'],
      ['/history', '21-history'],
      ['/payment-methods', '22-payment-methods'],
      ['/membership', '23-membership'],
    ]) {
      await page.goto(baseUrl + route, { waitUntil: 'networkidle' });
      await page.waitForTimeout(1500);
      await shot(name);
    }

    // Become a trainer (window.confirm auto-accepted)
    await page.goto(baseUrl, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1800);
    await click('Account');
    await page.waitForTimeout(800);
    await click('Become a trainer');
    await page.waitForTimeout(4000);
    await shot('24-trainer-dash-initial');
    log('PART A DONE');
  }

  if (part === 'partB') {
    // Sign back in as the (now trainer) test user.
    await page.goto(baseUrl, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1800);
    const signIn = page.getByText('I already have an account');
    if (await signIn.count()) {
      await signIn.first().click();
      await page.waitForTimeout(700);
      await fill('Email', email);
      await fill('Password', password);
      await page.getByText('Sign in', { exact: true }).first().click();
    }
    await page.waitForTimeout(3500);
    await shot('25-trainer-dash-rich');
    await click('Bookings');
    await page.waitForTimeout(1200);
    await shot('26-trainer-bookings');
    // Open first booking (upcoming list may be empty; try Past tab too)
    try {
      await page.getByText(/AM|PM/).first().click({ timeout: 5000 });
      await page.waitForTimeout(1500);
      await shot('27-trainer-session');
      await page.goBack();
      await page.waitForTimeout(800);
    } catch { log('no booking row to open'); }
    await click('Messages');
    await page.waitForTimeout(1000);
    await shot('28-trainer-messages');
    await click('Account');
    await page.waitForTimeout(1000);
    await shot('29-trainer-account');
    log('PART B DONE');
  }

  await browser.close();
}

main().catch((e) => { console.error('[e2e] FAILED:', e.message); process.exit(1); });
