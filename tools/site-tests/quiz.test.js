// Browser checks for the Concepts Study Guide's quizzes (docs/assets/js/quiz.js).
// Run through run-quiz-tests.sh, which builds and serves a copy of the site
// with the fixture pages and sets BASE. Chromium only: it's the browser this
// container has.
const { chromium } = require("playwright");

const BASE = process.env.BASE;
const PAGE = `${BASE}/study-guide/java/01-quiz-fixture.html`;
const HOME = `${BASE}/study-guide/`;
let failures = 0;

function check(name, ok, detail) {
  console.log(`${ok ? "ok  " : "FAIL"} ${name}${ok || detail === undefined ? "" : `: ${detail}`}`);
  if (!ok) failures++;
}

async function text(page, selector) {
  return (await page.locator(selector).first().textContent()).trim();
}

// Rough brightness of a CSS rgb() colour, 0 (black) to 255 (white).
function brightness(rgb) {
  const [r, g, b] = rgb.match(/\d+(\.\d+)?/g).map(Number);
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

(async () => {
  const browser = await chromium.launch();

  // --- the main flow, in one context so storage carries across pages
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(PAGE);

  check("two good quizzes become buttons", (await page.locator(".quiz-card").count()) === 2);
  check("the malformed quiz stays a plain block",
    (await page.locator("details.quiz").count()) === 1 &&
    (await page.locator("details.quiz summary").textContent()).includes("broken"));
  check("progress starts at 0 of 2",
    (await text(page, ".quiz-progress-count")) === "0 of 2 quizzes on this page answered right");

  const first = page.locator(".quiz-card").first();
  await first.locator(".quiz-open").click();
  const dialog = page.locator("dialog.quiz-dialog");
  check("the dialog opens", await dialog.evaluate((d) => d.open));
  check("the question is shown without the 'Check yourself:' prefix",
    (await text(page, ".quiz-dialog-question")).startsWith("A command"));
  check("focus moves to the first answer",
    await page.evaluate(() => document.activeElement.classList.contains("quiz-option")));
  check("three answers, no checkboxes",
    (await page.locator(".quiz-option").count()) === 3 &&
    (await page.locator(".quiz-dialog input").count()) === 0);

  await page.locator(".quiz-option").nth(0).click();
  check("a wrong answer says so, with its explanation",
    (await text(page, ".quiz-dialog-feedback")).startsWith("Not quite.") &&
    (await text(page, ".quiz-dialog-feedback")).includes("Nothing cancelled it"));
  check("Try again appears", await page.locator(".quiz-dialog-retry").isVisible());
  check("the answers are locked", await page.locator(".quiz-option").nth(1).isDisabled());

  await page.locator(".quiz-dialog-retry").click();
  await page.locator(".quiz-option").nth(1).click();
  check("the right answer says so", (await text(page, ".quiz-dialog-feedback")).startsWith("Right."));
  check("the right answer is marked", await page.locator(".quiz-option").nth(1).evaluate((b) => b.classList.contains("is-correct")));
  check("Try again is hidden after a right answer", !(await page.locator(".quiz-dialog-retry").isVisible()));

  await page.keyboard.press("Escape");
  check("Escape closes the dialog", !(await dialog.evaluate((d) => d.open)));
  check("focus returns to the button",
    await page.evaluate(() => document.activeElement.classList.contains("quiz-open")));
  check("the card shows it's answered", (await text(page, ".quiz-card .quiz-status")) === "✓ answered right");
  check("progress is 1 of 2", (await text(page, ".quiz-progress-count")) === "1 of 2 quizzes on this page answered right");

  // A wrong answer after a right one doesn't undo it.
  await first.locator(".quiz-open").click();
  await page.locator(".quiz-option").nth(2).click();
  await page.locator(".quiz-dialog-close").click();
  check("a later slip keeps 'answered right'", (await text(page, ".quiz-card .quiz-status")) === "✓ answered right");

  // A click on the backdrop closes it.
  await page.locator(".quiz-card").nth(1).locator(".quiz-open").click();
  await page.mouse.click(5, 5);
  check("a click outside closes the dialog", !(await dialog.evaluate((d) => d.open)));

  await page.reload();
  check("answers survive a reload", (await text(page, ".quiz-progress-count")) === "1 of 2 quizzes on this page answered right");

  await page.goto(HOME);
  const summary = await text(page, ".quiz-total-summary");
  check("the home page totals every page", summary === "You've answered 1 of 3 quizzes right, on 1 of 2 pages.", summary);
  const href = await page.locator(".quiz-total-list a").first().getAttribute("href");
  check("total links include the site's base path", href.startsWith("/BasicRobotLessons/study-guide/"), href);
  await page.locator("[data-quiz-total] .quiz-reset").click();
  check("Forget every answer resets the total",
    (await text(page, ".quiz-total-summary")) === "You've answered 0 of 3 quizzes right, on 0 of 2 pages.");
  check("no script errors", errors.length === 0, errors.join("; "));
  await context.close();

  // --- keyboard only
  const kb = await browser.newPage();
  await kb.goto(PAGE);
  await kb.locator(".quiz-open").first().focus();
  await kb.keyboard.press("Enter");
  check("Enter on the button opens the dialog", await kb.locator("dialog.quiz-dialog").evaluate((d) => d.open));
  await kb.keyboard.press("Tab");
  await kb.keyboard.press("Enter");
  check("Tab and Enter answer the question", (await text(kb, ".quiz-dialog-feedback")).startsWith("Right."));
  await kb.close();

  // --- storage blocked: quizzes still work, nothing remembered, no errors
  const blocked = await browser.newContext();
  await blocked.addInitScript(() => {
    Object.defineProperty(window, "localStorage", { get() { throw new Error("blocked"); } });
  });
  const bp = await blocked.newPage();
  const bErrors = [];
  bp.on("pageerror", (e) => bErrors.push(e.message));
  await bp.goto(PAGE);
  await bp.locator(".quiz-open").first().click();
  await bp.locator(".quiz-option").nth(1).click();
  check("with storage blocked a quiz still answers", (await text(bp, ".quiz-dialog-feedback")).startsWith("Right."));
  check("with storage blocked nothing throws", bErrors.length === 0, bErrors.join("; "));
  await blocked.close();

  // --- scripts off: the plain blocks
  const noJs = await browser.newContext({ javaScriptEnabled: false });
  const np = await noJs.newPage();
  await np.goto(PAGE);
  check("with scripts off every quiz is a plain block", (await np.locator("details.quiz").count()) === 3);
  check("with scripts off the answer starts hidden", !(await np.locator("details.quiz li").first().isVisible()));
  await noJs.close();

  // --- dark scheme
  const dark = await browser.newContext({ colorScheme: "dark" });
  const dp = await dark.newPage();
  await dp.goto(PAGE);
  await dp.waitForTimeout(300);
  await dp.locator(".quiz-open").first().click();
  const bg = await dp.locator("dialog.quiz-dialog").evaluate((d) => getComputedStyle(d).backgroundColor);
  const fg = await dp.locator("dialog.quiz-dialog").evaluate((d) => getComputedStyle(d).color);
  check("dark scheme: a dark dialog with light text", brightness(bg) < 80 && brightness(fg) > 170, `${bg} / ${fg}`);
  await dp.locator(".quiz-option").nth(1).click();
  const tint = await dp.locator(".quiz-dialog-feedback").evaluate((f) => getComputedStyle(f).backgroundColor);
  check("dark scheme: the 'right' tint stays dark", brightness(tint) < 90, tint);
  await dark.close();

  // --- a phone
  const phone = await browser.newContext({ viewport: { width: 390, height: 800 } });
  const pp = await phone.newPage();
  await pp.goto(PAGE);
  await pp.locator(".quiz-open").first().click();
  const fits = await pp.evaluate(() => {
    const d = document.querySelector("dialog.quiz-dialog").getBoundingClientRect();
    return d.left >= 0 && d.right <= window.innerWidth &&
      document.documentElement.scrollWidth <= window.innerWidth;
  });
  check("390 px: the dialog fits and nothing scrolls sideways", fits);
  await phone.close();

  await browser.close();
  console.log(failures === 0 ? "all quiz checks passed" : `${failures} quiz check(s) failed`);
  process.exit(failures === 0 ? 0 : 1);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
