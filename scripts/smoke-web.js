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
  await page.screenshot({ path: path.join(os.tmpdir(), 'fitconnect-welcome.png'), fullPage: true });
  await page.getByLabel('التبديل إلى العربية').click();
  await page.getByText('مستواك القادم', { exact: false }).waitFor();
  if (await page.locator('html').getAttribute('dir') !== 'rtl') throw new Error('Arabic locale did not activate RTL document direction');
  await page.screenshot({ path: path.join(os.tmpdir(), 'fitconnect-welcome-ar.png'), fullPage: true });
  await page.goto(`${baseUrl}/trainer-availability`, { waitUntil: 'networkidle' });
  await page.getByText('صباحاً', { exact: true }).waitFor();
  await page.getByText('بعد الظهر', { exact: true }).waitFor();
  await page.screenshot({ path: path.join(os.tmpdir(), 'fitconnect-schedule-ar.png'), fullPage: true });
  await page.goto(`${baseUrl}/slot-drops`, { waitUntil: 'networkidle' });
  await page.getByText('المواعيد الجيدة لا ينبغي أن تضيع.', { exact: true }).waitFor();
  await page.getByText('طلب دون كشف العملاء', { exact: true }).waitFor();
  await page.screenshot({ path: path.join(os.tmpdir(), 'fitconnect-pulse-drops-ar.png'), fullPage: true });
  await page.goto(`${baseUrl}/waitlist/t-maya`, { waitUntil: 'networkidle' });
  await page.getByText('أخبر FitConnect بما يناسبك.', { exact: true }).waitFor();
  await page.getByText('خاصة حتى تختار الحجز', { exact: true }).waitFor();
  await page.screenshot({ path: path.join(os.tmpdir(), 'fitconnect-private-waitlist-ar.png'), fullPage: true });
  await page.goto(`${baseUrl}/progress`, { waitUntil: 'networkidle' });
  await page.getByText('تقدمي', { exact: true }).first().waitFor();
  await page.getByText('مهمة هذا الأسبوع', { exact: true }).waitFor();
  await page.getByText('الإنجازات', { exact: true }).waitFor();
  await page.screenshot({ path: path.join(os.tmpdir(), 'fitconnect-progress-ar.png'), fullPage: true });
  await page.goto(`${baseUrl}/momentum`, { waitUntil: 'networkidle' });
  await page.getByText('تدرّبوا معاً. وحافظوا على خصوصيتكم.', { exact: true }).waitFor();
  await page.getByText('دائرة زخم الرياض', { exact: true }).waitFor();
  await page.screenshot({ path: path.join(os.tmpdir(), 'fitconnect-momentum-ar.png'), fullPage: true });
  await page.goto(`${baseUrl}/trainer-clients`, { waitUntil: 'networkidle' });
  await page.getByText('اعرف من يحتاجك قبل أن يختفي.', { exact: true }).waitFor();
  await page.getByText('Lina A.', { exact: true }).first().click();
  await page.getByText('درّب العلاقة أيضاً', { exact: true }).waitFor();
  await page.screenshot({ path: path.join(os.tmpdir(), 'fitconnect-retention-studio-ar.png'), fullPage: true });
  await page.goto(`${baseUrl}/discover`, { waitUntil: 'networkidle' });
  await page.getByText('اعثر على مدربك.', { exact: true }).waitFor();
  await page.getByText('المدربون الأنسب لك', { exact: true }).waitFor();
  await page.screenshot({ path: path.join(os.tmpdir(), 'fitconnect-discover-ar.png'), fullPage: true });
  await page.goto(`${baseUrl}/account`, { waitUntil: 'networkidle' });
  await page.getByText('مساحتك', { exact: true }).waitFor();
  await page.getByText('طرق الدفع', { exact: true }).waitFor();
  await page.screenshot({ path: path.join(os.tmpdir(), 'fitconnect-account-ar.png'), fullPage: true });
  await page.goto(`${baseUrl}/integrations`, { waitUntil: 'networkidle' });
  await page.getByText('التكاملات', { exact: true }).waitFor();
  await page.getByText('يعمل على الويب اليوم', { exact: true }).waitFor();
  await page.screenshot({ path: path.join(os.tmpdir(), 'fitconnect-integrations-ar.png'), fullPage: true });
  await page.goto(`${baseUrl}/sign-in?mode=up`, { waitUntil: 'networkidle' });
  await page.getByText('أنشئ حسابك', { exact: true }).waitFor();
  await page.getByText('المتابعة باستخدام Google', { exact: true }).waitFor();
  await page.screenshot({ path: path.join(os.tmpdir(), 'fitconnect-signup-ar.png'), fullPage: true });
  await page.goto(`${baseUrl}/onboarding`, { waitUntil: 'networkidle' });
  await page.getByText('ما أهدافك الرياضية؟', { exact: true }).waitFor();
  await page.getByText('بناء العضلات', { exact: true }).waitFor();
  await page.screenshot({ path: path.join(os.tmpdir(), 'fitconnect-onboarding-ar.png'), fullPage: true });
  await page.goto(`${baseUrl}/session/00000000-0000-4000-8000-000000000000/rate?preview=1`, { waitUntil: 'networkidle' });
  await page.getByText('لقد حضرت.', { exact: true }).waitFor();
  await page.getByText('اكتملت الجلسة', { exact: true }).waitFor();
  await page.getByText('ما الذي تميز؟', { exact: true }).waitFor();
  await page.screenshot({ path: path.join(os.tmpdir(), 'fitconnect-celebration-ar.png'), fullPage: true });
  await page.goto(baseUrl, { waitUntil: 'networkidle' });
  await page.getByLabel('Switch to English').click();
  await page.getByText('Your next level is', { exact: false }).waitFor();
  await page.getByText('Find your trainer', { exact: true }).click();
  await page.getByText('Create your account', { exact: true }).waitFor();
  await page.getByText('Continue with Google', { exact: true }).waitFor();

  await page.goto(`${baseUrl}/discover`, { waitUntil: 'networkidle' });
  let trainerDataAvailable = true;
  try {
    await page.getByText('Maya Okafor', { exact: false }).first().waitFor();
  } catch {
    await page.reload({ waitUntil: 'networkidle' });
    try {
      await page.getByText('Maya Okafor', { exact: false }).first().waitFor();
    } catch (error) {
      if (!smokeServer) throw error;
      trainerDataAvailable = false;
      await page.getByText(/Trainers unavailable|No exact match yet/).waitFor();
    }
  }
  await page.getByText('Find your person.', { exact: true }).waitFor();
  await page.screenshot({ path: path.join(os.tmpdir(), 'fitconnect-discover.png'), fullPage: true });
  if (trainerDataAvailable) {
    for (const name of ['Maya Okafor', 'Diego Santos', 'Aisha Rahman', 'Liam Chen', 'Sofia Marin', 'Marcus Bell']) {
      await page.getByText(name, { exact: false }).first().waitFor();
    }
    await page.getByText('Maya Okafor', { exact: false }).first().click();
    await page.getByText('Why train with Maya?', { exact: true }).waitFor();
    await page.screenshot({ path: path.join(os.tmpdir(), 'fitconnect-trainer.png'), fullPage: true });
    await page.getByText('Train with Maya', { exact: true }).click();
    await page.getByText('Create your account', { exact: true }).waitFor();
  }

  await page.goto(`${baseUrl}/payment-methods`, { waitUntil: 'networkidle' });
  await page.getByText('No payment method connected', { exact: true }).waitFor();
  if ((await page.locator('body').innerText()).includes('4242')) throw new Error('Fake payment card is still visible');

  await page.goto(`${baseUrl}/integrations`, { waitUntil: 'networkidle' });
  await page.getByText('Connected experience', { exact: false }).waitFor();
  await page.getByText('WhatsApp', { exact: true }).waitFor();

  await page.goto(`${baseUrl}/trainer-availability`, { waitUntil: 'networkidle' });
  await page.getByText('Own your week', { exact: true }).waitFor();
  await page.getByText('Morning', { exact: true }).waitFor();
  await page.getByText('PRIVATE DEMAND SIGNAL', { exact: true }).waitFor();
  await page.getByText('Afternoon', { exact: true }).waitFor();
  await page.getByText('Evening', { exact: true }).waitFor();
  await page.getByLabel('Next two weeks').click();
  await page.screenshot({ path: path.join(os.tmpdir(), 'fitconnect-schedule.png'), fullPage: true });

  await page.goto(`${baseUrl}/slot-drops`, { waitUntil: 'networkidle' });
  await page.getByText('Good openings should not disappear.', { exact: true }).waitFor();
  await page.getByText('Demand without exposing clients', { exact: true }).waitFor();
  await page.screenshot({ path: path.join(os.tmpdir(), 'fitconnect-pulse-drops.png'), fullPage: true });

  await page.goto(`${baseUrl}/waitlist/t-maya`, { waitUntil: 'networkidle' });
  await page.getByText('Tell FitConnect what fits.', { exact: true }).waitFor();
  await page.getByText('Private until you choose to book', { exact: true }).waitFor();
  await page.screenshot({ path: path.join(os.tmpdir(), 'fitconnect-private-waitlist.png'), fullPage: true });

  await page.goto(`${baseUrl}/momentum`, { waitUntil: 'networkidle' });
  await page.getByText('Train together. Keep your privacy.', { exact: true }).waitFor();
  await page.getByText('Riyadh Momentum Circle', { exact: true }).waitFor();
  await page.screenshot({ path: path.join(os.tmpdir(), 'fitconnect-momentum.png'), fullPage: true });

  await page.goto(`${baseUrl}/session/00000000-0000-4000-8000-000000000000/rate?preview=1`, { waitUntil: 'networkidle' });
  await page.getByText('You showed up.', { exact: true }).waitFor();
  await page.getByText('SESSION COMPLETE', { exact: true }).waitFor();
  await page.screenshot({ path: path.join(os.tmpdir(), 'fitconnect-celebration.png'), fullPage: true });

  await page.goto(`${baseUrl}/reset-password`, { waitUntil: 'networkidle' });
  await page.getByText('Choose a new password', { exact: true }).waitFor();
  await page.screenshot({ path: path.join(os.tmpdir(), 'fitconnect-smoke.png'), fullPage: true });

  const serious = errors.filter((e) => !e.includes('favicon') && !e.includes('net::ERR_ABORTED') && !(smokeServer && e.includes('net::ERR_NETWORK_ACCESS_DENIED')));
  if (serious.length) throw new Error(`Browser errors: ${serious.join(' | ')}; responses: ${badResponses.join(' | ')}`);
  console.log(JSON.stringify({ ok: true, trainerDataAvailable, pages: ['welcome', 'welcome-ar', 'schedule-ar', 'progress-ar', 'momentum-ar', 'retention-studio-ar', 'discover-ar', 'sign-up', 'celebration-ar', 'discover', ...(trainerDataAvailable ? ['trainer', 'booking'] : []), 'payments', 'integrations', 'trainer-availability', 'momentum', 'celebration', 'reset-password'], screenshots: [path.join(os.tmpdir(), 'fitconnect-welcome.png'), path.join(os.tmpdir(), 'fitconnect-welcome-ar.png'), path.join(os.tmpdir(), 'fitconnect-schedule-ar.png'), path.join(os.tmpdir(), 'fitconnect-progress-ar.png'), path.join(os.tmpdir(), 'fitconnect-momentum-ar.png'), path.join(os.tmpdir(), 'fitconnect-retention-studio-ar.png'), path.join(os.tmpdir(), 'fitconnect-discover-ar.png'), path.join(os.tmpdir(), 'fitconnect-celebration-ar.png'), path.join(os.tmpdir(), 'fitconnect-discover.png'), ...(trainerDataAvailable ? [path.join(os.tmpdir(), 'fitconnect-trainer.png')] : []), path.join(os.tmpdir(), 'fitconnect-schedule.png'), path.join(os.tmpdir(), 'fitconnect-momentum.png'), path.join(os.tmpdir(), 'fitconnect-celebration.png'), path.join(os.tmpdir(), 'fitconnect-smoke.png')] }));
  await smokeBrowser.close();
  smokeServer?.kill();
})().catch(async (e) => {
  console.error(e.stack || e.message);
  await smokeBrowser?.close().catch(() => {});
  smokeServer?.kill();
  process.exit(1);
});
