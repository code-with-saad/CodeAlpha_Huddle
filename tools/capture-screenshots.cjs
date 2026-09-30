// Takes the screenshots used by the README (screenshots/*.png) and the landing page (client/public/screens/*.webp)
// from the running app, in light and dark, using the demo accounts from `npm run seed`.
//
//   1. cd server && npm run seed && npm run dev       (API on :5000)
//   2. cd client && npm run dev                       (app on :5173)
//   3. npm i --no-save puppeteer-core                 (in this folder, or anywhere Node can find it)
//   4. node tools/capture-screenshots.cjs             (CHROME=path/to/chrome and APP=http://localhost:5173 override the defaults)
const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer-core');

const APP = process.env.APP || 'http://localhost:5173';
const CHROME = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const ROOT = path.resolve(__dirname, '..');
const PNG = path.join(ROOT, 'screenshots');
const WEBP = path.join(ROOT, 'client', 'public', 'screens');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function login(browser, who, theme, viewport) {
  const ctx = await browser.createBrowserContext();
  const page = await ctx.newPage();
  await page.setViewport(viewport);
  await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: theme }]);
  await page.goto(`${APP}/login`, { waitUntil: 'networkidle0' });
  await page.type('input[type=email]', `demo_${who}@huddle.demo`);
  await page.type('input[type=password]', 'huddle-demo-1234');
  await page.click('button.btn-primary');
  await page.waitForSelector('.shell');
  return { ctx, page };
}

async function openProject(page, name) {
  await page.goto(`${APP}/projects`, { waitUntil: 'networkidle0' });
  await page.waitForSelector('a.row');
  await page.evaluate((n) => [...document.querySelectorAll('a.row')].find((a) => a.textContent.includes(n)).click(), name);
  await page.waitForSelector('.board .column');
  await sleep(700);
}

const tab = async (page, name) => {
  await page.evaluate((n) => [...document.querySelectorAll('.tabs .tab')].find((t) => t.textContent.trim() === n).click(), name);
  await sleep(1200);
};

// Both formats from the same frame: PNG for the README, WebP (smaller) for the landing page.
async function snap(page, name, theme) {
  await page.evaluate(() => document.querySelectorAll('.toast-close').forEach((b) => b.click()));
  await sleep(250);
  await page.screenshot({ path: path.join(PNG, `${name}-${theme}.png`), type: 'png' });
  await page.screenshot({ path: path.join(WEBP, `${name}-${theme}.webp`), type: 'webp', quality: 86 });
  console.log('saved', `${name}-${theme}`);
}

(async () => {
  fs.mkdirSync(PNG, { recursive: true });
  fs.mkdirSync(WEBP, { recursive: true });
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new' });

  // Give Sam a few real notifications first, by doing the things that create them as Maya.
  {
    const maya = await login(browser, 'maya', 'light', { width: 1440, height: 900 });
    const token = await maya.page.evaluate(() => localStorage.getItem('huddle_token'));
    await openProject(maya.page, 'Website Relaunch');
    await maya.page.evaluate(async (t) => {
      const h = { 'Content-Type': 'application/json', Authorization: `Bearer ${t}` };
      const pid = location.pathname.split('/')[2];
      const board = await (await fetch(`/api/projects/${pid}/board`, { headers: h })).json();
      const people = (await (await fetch(`/api/projects/${pid}`, { headers: h })).json()).project.members;
      const sam = people.find((m) => m.user.username === 'demo_sam').user.id;
      const card = board.cards.find((c) => c.title === 'Homepage hero copy');
      const other = board.cards.find((c) => c.title === 'Write launch announcement');
      await fetch(`/api/projects/${pid}/cards/${other.id}`, { method: 'PATCH', headers: h, body: JSON.stringify({ assignees: [sam] }) });
      await fetch(`/api/projects/${pid}/cards/${card.id}/comments`, { method: 'POST', headers: h, body: JSON.stringify({ body: 'Sam, can you check the second headline before we publish?'.replace('Sam,', '@demo_sam') }) });
    }, token);
    await maya.ctx.close();
  }

  for (const theme of ['light', 'dark']) {
    const desktop = { width: 1440, height: 900 };
    const { ctx, page } = await login(browser, 'maya', theme, desktop);
    await openProject(page, 'Website Relaunch');
    await snap(page, 'board', theme);

    await page.evaluate(() => [...document.querySelectorAll('.card-slot')].find((e) => e.querySelector('.card-title')?.textContent === 'Build pricing page layout').click());
    await page.waitForSelector('dialog.sheet[open] .sheet-title-input');
    await sleep(1200);
    await snap(page, 'card', theme);
    await page.keyboard.press('Escape');
    await page.waitForFunction(() => !document.querySelector('dialog.sheet[open]'));

    await tab(page, 'List');
    await snap(page, 'list', theme);
    await tab(page, 'Calendar');
    await page.click('button[aria-label="Next month"]');
    await sleep(500);
    await snap(page, 'calendar', theme);
    await tab(page, 'Dashboard');
    await page.waitForSelector('.tile');
    await sleep(800);
    await snap(page, 'dashboard', theme);
    await ctx.close();

    // Notifications, as the teammate who has some
    const sam = await login(browser, 'sam', theme, desktop);
    await openProject(sam.page, 'Website Relaunch');
    await sam.page.evaluate(() => [...document.querySelectorAll('.bell-btn')].find((x) => x.offsetParent).click());
    await sam.page.waitForSelector('.bell-panel .note-row');
    await sleep(700);
    await snap(sam.page, 'notifications', theme);
    await sam.ctx.close();

    // A phone
    const phone = await login(browser, 'maya', theme, { width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
    await openProject(phone.page, 'Website Relaunch');
    await snap(phone.page, 'mobile-board', theme);
    await phone.ctx.close();
  }
  await browser.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
