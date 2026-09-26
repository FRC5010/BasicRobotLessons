// Shared "Circuit Night" deck kit for the v3 (OpMode) track's lesson slide decks.
// Every per-lesson build script requires this module instead of redefining the
// palette, fonts, or slide helpers — that's what keeps the whole series looking
// like one deck instead of thirty different ones.
//
// Style rules baked into these helpers (do not silently break these when adding
// a new one):
//   - Nothing reads smaller than 20pt except code-card text.
//   - A header title is always one line (shrunk to fit, see fitTitle), and
//     nothing under a header starts above CONTENT_TOP. addCodeCard moves
//     itself below the header; audit-overflow.js reports anything else.
//   - Code cards carry their three status dots stacked at the TOP-RIGHT, so the
//     code itself starts almost at the card's top edge.
//   - Every addCodeCard passes a `fileLabel` — the same "what file, and where"
//     job the lessons' bold action lead-ins do. See addCodeCard's own comment.
//   - When a lesson section creates a brand-new file (not just edits one that
//     already exists), the deck gets its own slide for that — numbered steps
//     showing the actual right-click-through-VS-Code sequence, matching the
//     lesson's own instructions — BEFORE any slide shows that file's contents.
//     Never let a code card be the first the audience hears of a file that
//     doesn't exist yet.
//   - Every slide gets the small team-logo watermark in its top-right corner
//     (addFooter draws it); the title slide gets the full logo, large.
//   - Decks are student-facing and v3-only. Never write a slide that assumes
//     the reader knows there's another track or a "before" version of this
//     course — that context belongs in the markdown lesson's own asides, not
//     in front of a classroom seeing this material for the first time.

const pptxgen = require('pptxgenjs');
const path = require('path');

const ASSETS = path.join(__dirname, 'assets');
const ICON = name => path.join(ASSETS, 'icons', name);
// The mark has a light (white tiger head) and a dark (black tiger head) variant —
// same geometry, same aspect ratio, recolored for whichever background it sits on.
// Using the wrong one is invisible-logo-on-white-slide bug waiting to happen, so
// every call site below picks by background rather than hardcoding one file.
const LOGO_ON_NAVY = path.join(ASSETS, 'logo', 'team5010-logo-onnavy.png'); // white head, for dark bg
const LOGO_ON_WHITE = path.join(ASSETS, 'logo', 'team5010-logo-onwhite.png'); // black head, for light bg
const LOGO_ASPECT = 2000 / 1559; // width / height of the source mark

// ---- Palette: "Circuit Night" — built for a Java + FRC robotics course ----
const NAVY = '0B1F3A';
const NAVY2 = '132A4C';
const TEAL = '1B9AAA';
const ORANGE = 'FF5010'; // Team 5010's color — not a placeholder, keep exact
const WHITE = 'FFFFFF';
const INK = '13294B';
const MUTED = '5B6B84';
const CARDBG = 'F3F6FA';

const FONT_HEAD = 'Cambria';
const FONT_BODY = 'Calibri';
const FONT_CODE = 'Courier New';

const W = 13.333, H = 7.5;

// ---- Header/content boundary ----
// A header title is always ONE line. A wrapped title grows into whatever the
// slide placed under the header, and the helper drawing that card can't see
// that the title above it wrapped. So fitTitle() measures the title and
// shrinks it just enough to fit on one line, never below TITLE_MIN_PT.
const TITLE_PT = 30;
const TITLE_MIN_PT = 24;
const TITLE_W = 11.1;        // title x (1.5) to the right edge of full-width content (12.6)
const TITLE_FIT = 0.97;      // headroom so a measured-to-fit title can't wrap in PowerPoint
const CONTENT_TOP = 1.4;     // below a one-line title; addCodeCard won't start above it
const CONTENT_BOTTOM = 6.95; // above the footer text at 7.05
// Courier New's line height is 1.133 em (Liberation Mono, its metric twin,
// measures the same), times the code cards' 1.2 line spacing.
const CODE_LINE_MULT = 1.36;
// Shrinking code to fit its card is a nudge, not a redesign: code that needs
// more than this below the size its slide asked for is the slide's to fix
// (audit-overflow.js reports it).
const CODE_MAX_SHRINK_PT = 1;
const CODE_FIT = 0.85;       // keep in sync with audit-overflow.js's MARGIN

// Advance widths (thousandths of an em) of Cambria Bold, printable ASCII from
// space through '~'. Taken from Caladea Bold, which is metric-compatible with
// Cambria, so these match what PowerPoint lays out.
const CAMBRIA_BOLD_ASCII = [
  220, 335, 422, 618, 543, 976, 740, 251, 408, 408, 453, 592, 232, 311, 230, 505,
  533, 458, 507, 508, 553, 520, 538, 494, 556, 534, 280, 280, 592, 592, 592, 452,
  921, 653, 634, 551, 664, 559, 534, 586, 719, 358, 340, 680, 541, 845, 686, 647,
  593, 647, 640, 473, 587, 695, 632, 959, 616, 587, 554, 368, 505, 368, 592, 371,
  184, 525, 568, 450, 570, 513, 335, 508, 600, 308, 297, 589, 311, 891, 604, 530,
  573, 559, 454, 444, 365, 609, 519, 779, 525, 521, 464, 393, 320, 393, 592,
];
const CAMBRIA_BOLD_EXTRA = {
  '°': 378, '×': 592, '÷': 592, '—': 1000, '–': 500, '→': 783, '·': 140,
  '’': 235, '‘': 235, '“': 398, '”': 398, '…': 772,
};

function titleWidthIn(text, pt) {
  let em = 0;
  for (const ch of text) {
    const c = ch.codePointAt(0);
    em += (c >= 32 && c <= 126) ? CAMBRIA_BOLD_ASCII[c - 32] : (CAMBRIA_BOLD_EXTRA[ch] ?? 1000);
  }
  return em / 1000 * pt / 72;
}

/** Largest font size, in half-points, that keeps `title` on one line of the
 *  header. `fits` is false when even TITLE_MIN_PT wraps — shorten the title. */
function fitTitle(title) {
  const room = TITLE_W * TITLE_FIT;
  const at30 = titleWidthIn(title, TITLE_PT);
  if (at30 <= room) return { fontSize: TITLE_PT, fits: true };
  const pt = Math.floor(TITLE_PT * room / at30 * 2) / 2;
  return { fontSize: Math.max(pt, TITLE_MIN_PT), fits: pt >= TITLE_MIN_PT };
}

// Slides that have a header, so addCodeCard knows to stay below it.
const slidesWithHeader = new WeakSet();

/** Where a code card actually lands, and at what code font size.
 *
 *  On a slide with a header, a card that starts above CONTENT_TOP moves down
 *  to it. Keeping its bottom edge where the slide put it is preferred, since
 *  that leaves whatever sits below untouched; if the code wouldn't fit the
 *  shorter card, the whole card slides down instead, stopping above the footer.
 *
 *  Then, if the code is taller than the card has room for, its font shrinks in
 *  half-points until it fits, by at most CODE_MAX_SHRINK_PT. A card that fits
 *  is left at the size its slide asked for.
 *
 *  audit-overflow.js calls this too, so it checks the card as it's drawn. */
function codeCardLayout({ y, h, lineCount, fontSize = 18, hasLabel }, underHeader = true) {
  const room = hh => hh - (hasLabel ? 0.72 : 0.4);
  const textH = pt => lineCount * pt * CODE_LINE_MULT / 72;
  if (underHeader && y < CONTENT_TOP) {
    const keptBottomH = y + h - CONTENT_TOP;
    h = textH(fontSize) <= room(keptBottomH) * CODE_FIT
      ? keptBottomH
      : Math.min(h, CONTENT_BOTTOM - CONTENT_TOP);
    y = CONTENT_TOP;
  }
  if (lineCount > 0 && textH(fontSize) > room(h)) {
    const fit = Math.floor(room(h) * 72 / (lineCount * CODE_LINE_MULT) * 2) / 2;
    fontSize = Math.max(fit, fontSize - CODE_MAX_SHRINK_PT);
  }
  return { y, h, fontSize };
}

function newDeck({ title, author = 'Learn Java + Robot Programming' } = {}) {
  const p = new pptxgen();
  p.defineLayout({ name: 'WIDE', width: W, height: H });
  p.layout = 'WIDE';
  p.author = author;
  if (title) p.title = title;
  return p;
}

/** Small team-logo watermark, top-right corner. Used on every slide via addFooter,
 *  but exported separately in case a slide needs it without the rest of the footer.
 *  Pass `dark: true` on a navy-background slide — otherwise the black-headed
 *  on-white variant renders invisibly-close-to-white-on-navy instead of readable. */
function addCornerLogo(slide, { w = 0.85, dark = false } = {}) {
  const h = w / LOGO_ASPECT;
  slide.addImage({ path: dark ? LOGO_ON_NAVY : LOGO_ON_WHITE, x: W - 0.5 - w, y: 0.18, w, h });
}

/** Bottom chrome for every content slide: footer label, page number, corner logo.
 *  `label` is short and lesson-specific, e.g. "SETUP" or "GIT BRANCHING" — no
 *  track name, no lesson-number-vs-other-track framing. Pass `dark: true` on a
 *  navy-background slide so both the footer text and the logo variant switch. */
function addFooter(slide, { pageNum, label, dark = false }) {
  const textColor = dark ? '7A93B8' : MUTED;
  slide.addText(`LEARN JAVA + ROBOT PROGRAMMING · ${label.toUpperCase()}`, {
    x: 0.7, y: 7.05, w: 9, h: 0.4,
    fontFace: FONT_BODY, fontSize: 20, color: textColor, charSpacing: 1, margin: 0,
  });
  slide.addText(String(pageNum), {
    x: W - 1.3, y: 7.05, w: 0.6, h: 0.4,
    fontFace: FONT_BODY, fontSize: 20, color: textColor, align: 'right', margin: 0,
  });
  addCornerLogo(slide, { dark });
}

/** The header title, one line at a measured size (see fitTitle). Top-anchored
 *  and placed where the original centered 0.65"-tall box drew a one-line
 *  title, so nothing moves on a slide whose title already fit. */
function addHeaderTitle(slide, { title, color, x, y }) {
  const { fontSize, fits } = fitTitle(title);
  if (!fits) {
    console.warn(`deck-kit: title wraps even at ${TITLE_MIN_PT}pt and will overlap the slide below it — shorten it: "${title}"`);
  }
  slide.addText(title, {
    x: x + 0.8, y: y + 0.395, w: TITLE_W, h: 0.55,
    fontFace: FONT_HEAD, bold: true, fontSize, color, margin: 0, valign: 'top',
  });
  slidesWithHeader.add(slide);
}

/** Standard content-slide header for a WHITE-background slide: circular icon
 *  badge + eyebrow label + title. Code cards on the slide stay below it. */
function addHeader(slide, { icon, eyebrow, title, badgeColor = NAVY, x = 0.7, y = 0.5 }) {
  slide.addShape('ellipse', {
    x, y, w: 0.62, h: 0.62, fill: { color: badgeColor }, line: { type: 'none' },
  });
  slide.addImage({ path: ICON(icon), x: x + 0.14, y: y + 0.14, w: 0.34, h: 0.34 });
  slide.addText(eyebrow.toUpperCase(), {
    x: x + 0.82, y: y - 0.06, w: 10, h: 0.4,
    fontFace: FONT_BODY, bold: true, fontSize: 20, color: ORANGE, charSpacing: 1.5, margin: 0,
  });
  addHeaderTitle(slide, { title, color: INK, x, y });
}

/** Same header shape, for a NAVY-background section slide (eyebrow goes teal,
 *  title goes white). */
function addSectionHeader(slide, { icon, eyebrow, title, badgeColor = ORANGE, x = 0.7, y = 0.5 }) {
  slide.addShape('ellipse', {
    x, y, w: 0.62, h: 0.62, fill: { color: badgeColor }, line: { type: 'none' },
  });
  slide.addImage({ path: ICON(icon), x: x + 0.14, y: y + 0.14, w: 0.34, h: 0.34 });
  slide.addText(eyebrow.toUpperCase(), {
    x: x + 0.82, y: y - 0.06, w: 10, h: 0.4,
    fontFace: FONT_BODY, bold: true, fontSize: 20, color: TEAL, charSpacing: 1, margin: 0,
  });
  addHeaderTitle(slide, { title, color: WHITE, x, y });
}

/** Code-editor card: navy rounded rect, three status dots stacked at the TOP-RIGHT
 *  (not across the top), so code starts almost at the top edge and gets the space.
 *
 *  `fileLabel` is this card's answer to "what file, and where" — the same job the
 *  lessons' bold action lead-ins do ("Add to `DriveModule`, below the imports:").
 *  EVERY code card should carry one; there is no such thing as a code card with
 *  nothing to say about where it goes. For a real edit, phrase it the way the
 *  lesson does — verb first ("Add to X, below Y", "Edit X's constructor",
 *  "Replace X with", "Delete from X") — so a skimmer gets the same instruction
 *  either way. For an illustration the lesson itself marks "Nothing to add" (an
 *  API example, code the student already has, a wrong version being set up for
 *  rejection), pass `example: true` instead and phrase `fileLabel` to match —
 *  it renders muted and italic instead of the bold orange "type this" treatment,
 *  the same visual opposite the lessons use bold vs. italic for.
 *  Reserves extra height inside the card for the label — see LABEL_H below, and
 *  keep audit-overflow.js's own copy of that number in sync if it changes.
 *
 *  On a slide with a header, a card placed above CONTENT_TOP is moved down
 *  so it can't cover the title, and code too tall for its card is shrunk to
 *  fit — see codeCardLayout. */
function addCodeCard(slide, { x, y, w, h, lines, fontSize = 18, fileLabel, example = false }) {
  ({ y, h, fontSize } = codeCardLayout(
    { y, h, lineCount: lines.length, fontSize, hasLabel: !!fileLabel },
    slidesWithHeader.has(slide)));
  slide.addShape('roundRect', {
    x, y, w, h, rectRadius: 0.12,
    fill: { color: NAVY }, line: { type: 'none' },
    shadow: { type: 'outer', color: '0B1F3A', opacity: 0.35, blur: 8, offset: 3, angle: 90 },
  });
  const dotColors = ['FF6B6B', 'FFD166', '2EC4B6'];
  dotColors.forEach((c, i) => {
    slide.addShape('ellipse', {
      x: x + w - 0.34, y: y + 0.16 + i * 0.22, w: 0.14, h: 0.14,
      fill: { color: c }, line: { type: 'none' },
    });
  });
  let codeY = y + 0.22, codeH = h - 0.4;
  if (fileLabel) {
    slide.addText(fileLabel, {
      x: x + 0.3, y: y + 0.14, w: w - 0.75, h: 0.32,
      fontFace: FONT_BODY, bold: !example, italic: example,
      fontSize: 15, color: example ? '7FA8C9' : ORANGE, margin: 0,
    });
    codeY = y + 0.5;   // 0.14 + label's 0.32 + a small gap
    codeH = h - 0.72;  // same 0.18 bottom pad addCodeCard always used, plus the label's room
  }
  const body = lines.map((l, i) => ({
    text: l.text,
    options: { color: l.color || 'D7E3F4', breakLine: i < lines.length - 1, bold: !!l.bold },
  }));
  slide.addText(body, {
    x: x + 0.3, y: codeY, w: w - 0.75, h: codeH,
    fontFace: FONT_CODE, fontSize, valign: 'top', margin: 0, lineSpacingMultiple: 1.2,
  });
}

/** A labeled rounded-rect info card: an eyebrow, a bold heading, and a body
 *  paragraph, stacked in one panel. Covers the "ONE RULE TO REMEMBER" /
 *  "FIVE, TOTAL" / "THE BIGGEST MENTAL SHIFT" pattern used across decks. */
function addCard(slide, {
  x, y, w, h, bg = CARDBG, rectRadius = 0.1,
  eyebrow, eyebrowColor = ORANGE,
  heading, headingColor = INK, headingSize = 24, headingH,
  body, bodyColor = INK, bodySize = 20,
  pad = 0.3,
}) {
  slide.addShape('roundRect', { x, y, w, h, rectRadius, fill: { color: bg }, line: { type: 'none' } });
  let cursorY = y + pad;
  if (eyebrow) {
    slide.addText(eyebrow.toUpperCase(), {
      x: x + pad, y: cursorY, w: w - pad * 2, h: 0.4,
      fontFace: FONT_BODY, bold: true, fontSize: 20, color: eyebrowColor, charSpacing: 0.5, margin: 0,
    });
    cursorY += 0.5;
  }
  if (heading) {
    // Rough estimate of wrapped-line count for a serif proportional font (~0.52em
    // average advance), so a short card doesn't get the same fixed offset as a
    // full-height one. Callers with unusual headings can still pass `headingH`.
    const usableW = w - pad * 2;
    const charsPerLine = Math.max(8, usableW / (0.52 * headingSize / 72));
    const estLines = Math.max(1, Math.ceil(heading.length / charsPerLine));
    const autoH = estLines * (headingSize * 1.25 / 72) + 0.25;
    const hH = headingH != null ? headingH : autoH;
    slide.addText(heading, {
      x: x + pad, y: cursorY, w: usableW, h: hH,
      fontFace: FONT_HEAD, bold: true, fontSize: headingSize, color: headingColor,
      valign: 'top', margin: 0, lineSpacingMultiple: 1.2,
    });
    cursorY += hH;
  }
  if (body) {
    slide.addText(body, {
      x: x + pad, y: cursorY, w: w - pad * 2, h: y + h - cursorY - pad,
      fontFace: FONT_BODY, fontSize: bodySize, color: bodyColor,
      valign: 'top', margin: 0, lineSpacingMultiple: 1.25,
    });
  }
}

/** Numbered step rows (used by "Run it" / walkthrough slides): a circular
 *  number badge, a bold step title, and a muted detail line underneath. */
function addNumberedSteps(slide, {
  steps, x = 0.7, startY = 1.7, rowH = 1.0,
  numberColor = TEAL, highlight = {}, // highlight: { [index]: color }
  dark = false, // pass true on a NAVY-background slide, or title/detail render unreadably dark-on-dark
  startNum = 1, // the first badge's number, for a list that continues from a previous slide
}) {
  const titleColor = dark ? WHITE : INK;
  const detailColor = dark ? 'CADCE8' : MUTED;
  steps.forEach((st, i) => {
    const y = startY + i * rowH;
    const color = highlight[i] || numberColor;
    slide.addShape('ellipse', {
      x, y: y + 0.02, w: 0.55, h: 0.55, fill: { color }, line: { type: 'none' },
    });
    slide.addText(String(startNum + i), {
      x, y: y + 0.02, w: 0.55, h: 0.55, align: 'center', valign: 'middle',
      fontFace: FONT_HEAD, bold: true, fontSize: 22, color: WHITE, margin: 0,
    });
    slide.addText(st.title, {
      x: x + 0.8, y: y - 0.06, w: 10.8, h: 0.42,
      fontFace: FONT_HEAD, bold: true, fontSize: 20, color: titleColor, margin: 0,
    });
    slide.addText(st.detail, {
      x: x + 0.8, y: y + 0.36, w: 10.8, h: 0.55,
      fontFace: FONT_BODY, fontSize: 20, color: detailColor, margin: 0, lineSpacingMultiple: 1.1,
    });
  });
}

/** Grid of numbered navy cards for a "Try it" slide. Lays out 1 or 2 columns
 *  depending on how many cards are given.
 *
 *  Geometry note (this was a real, bad bug once — don't reintroduce it):
 *  the number badge and the title share ONE row (title vertically centered
 *  beside the badge, not stacked under it), and the body's y/h are *derived*
 *  from that row's actual height, never hardcoded independently of it. A
 *  4-card (2-row) grid has real vertical pressure — at `bodyFontSize` (20pt
 *  minimum, matching every other body text in these decks) a card needs
 *  roughly 100–110 characters of body text per 3 lines it can hold, so keep
 *  a 2-row grid's item text terse, or pass a larger `h`/`y` budget.
 *
 *  Pass `code: true` on a card whose Try It genuinely expects the student to
 *  write/modify code (not just run something and observe, or predict an
 *  answer) — it renders a small bold-orange "WRITE CODE" tag in the card's
 *  top-right corner, the same bold-orange-means-"you type this" language
 *  `addCodeCard`'s `fileLabel` already uses. Leave it off for run-it/predict/
 *  observe items. This needs its own width budget, so a `code` card's title
 *  gets less room — the layout below accounts for that automatically. */
function addTryItGrid(slide, { cards, x = 0.7, y = 2.45, totalW = 11.9, h, gap = 0.3, cols, bodyFontSize = 20 }) {
  const n = cards.length;
  const nCols = cols || (n <= 2 ? n : 2);
  const nRows = Math.ceil(n / nCols);
  const cardW = (totalW - gap * (nCols - 1)) / nCols;
  const cardH = h || (nRows === 1 ? 4.15 : 2.5);
  const badgeD = 0.5, topPad = 0.25, rowGap = 0.15, bottomPad = 0.3;
  const bodyY = topPad + badgeD + rowGap;   // offset from cy, not an absolute constant
  const bodyH = cardH - bodyY - bottomPad;
  const codeTagW = 1.55;
  cards.forEach((c, i) => {
    const col = i % nCols, row = Math.floor(i / nCols);
    const cx = x + col * (cardW + gap);
    const cy = y + row * (cardH + gap);
    slide.addShape('roundRect', {
      x: cx, y: cy, w: cardW, h: cardH, rectRadius: 0.12,
      fill: { color: NAVY2 }, line: { type: 'none' },
    });
    slide.addShape('ellipse', {
      x: cx + 0.35, y: cy + topPad, w: badgeD, h: badgeD, fill: { color: TEAL }, line: { type: 'none' },
    });
    slide.addText(String(i + 1), {
      x: cx + 0.35, y: cy + topPad, w: badgeD, h: badgeD, align: 'center', valign: 'middle',
      fontFace: FONT_HEAD, bold: true, fontSize: 22, color: WHITE, margin: 0,
    });
    const titleW = cardW - 0.7 - badgeD - 0.2 - (c.code ? codeTagW : 0);
    slide.addText(c.title, {
      x: cx + 0.35 + badgeD + 0.2, y: cy + topPad, w: titleW, h: badgeD,
      fontFace: FONT_HEAD, bold: true, fontSize: 20, color: WHITE, valign: 'middle', margin: 0, lineSpacingMultiple: 1.1,
    });
    if (c.code) {
      slide.addShape('roundRect', {
        x: cx + cardW - 0.35 - codeTagW, y: cy + topPad + (badgeD - 0.32) / 2, w: codeTagW, h: 0.32,
        rectRadius: 0.06, fill: { color: ORANGE }, line: { type: 'none' },
      });
      slide.addText('WRITE CODE', {
        x: cx + cardW - 0.35 - codeTagW, y: cy + topPad + (badgeD - 0.32) / 2, w: codeTagW, h: 0.32,
        align: 'center', valign: 'middle', fontFace: FONT_BODY, bold: true, fontSize: 12,
        color: NAVY, charSpacing: 0.5, margin: 0,
      });
    }
    slide.addText(c.body, {
      x: cx + 0.35, y: cy + bodyY, w: cardW - 0.7, h: bodyH,
      fontFace: FONT_BODY, fontSize: bodyFontSize, color: 'CADCE8', valign: 'top', margin: 0, lineSpacingMultiple: 1.25,
    });
  });
}

/** The deck's opening slide: navy background, the eyebrow/lesson tag, the big
 *  title, an italic subtitle, the version tag, and the full team logo placed
 *  large and unmistakable — this is the one slide every deck in the series
 *  shares almost verbatim. */
function addTitleSlide(deck, { tag, title, subtitle, versionTag }) {
  const s = deck.addSlide();
  s.background = { color: NAVY };

  const logoW = 3.6, logoH = logoW / LOGO_ASPECT;
  s.addImage({ path: LOGO_ON_NAVY, x: W - 0.6 - logoW, y: H - 0.5 - logoH, w: logoW, h: logoH });

  s.addText('LEARN JAVA + ROBOT PROGRAMMING', {
    x: 0.9, y: 1.5, w: 10, h: 0.4,
    fontFace: FONT_BODY, bold: true, fontSize: 20, color: TEAL, charSpacing: 3, margin: 0,
  });
  s.addText(tag, {
    x: 0.85, y: 2.05, w: 8, h: 0.55,
    fontFace: FONT_BODY, bold: true, fontSize: 22, color: ORANGE, charSpacing: 2, margin: 0,
  });
  s.addText(title, {
    x: 0.8, y: 2.55, w: 11.5, h: 1.5,
    fontFace: FONT_HEAD, bold: true, fontSize: 60, color: WHITE, margin: 0,
  });
  s.addText(subtitle, {
    x: 0.85, y: 3.95, w: 9.5, h: 0.7,
    fontFace: FONT_HEAD, italic: true, fontSize: 26, color: 'CADCE8', margin: 0,
  });
  s.addText(versionTag, {
    x: 0.85, y: 6.7, w: 10, h: 0.4,
    fontFace: FONT_BODY, fontSize: 20, color: '89A0BE', charSpacing: 1, margin: 0,
  });
  return s;
}

module.exports = {
  NAVY, NAVY2, TEAL, ORANGE, WHITE, INK, MUTED, CARDBG,
  FONT_HEAD, FONT_BODY, FONT_CODE, W, H,
  ICON, LOGO_ON_NAVY, LOGO_ON_WHITE,
  CONTENT_TOP, TITLE_MIN_PT, CODE_LINE_MULT, fitTitle, codeCardLayout,
  newDeck, addCornerLogo, addFooter, addHeader, addSectionHeader,
  addCodeCard, addCard, addNumberedSteps, addTryItGrid, addTitleSlide,
};
