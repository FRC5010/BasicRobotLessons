// Shared "Circuit Night" deck kit for the v3 (OpMode) track's lesson slide decks.
// Every per-lesson build script requires this module instead of redefining the
// palette, fonts, or slide helpers — that's what keeps the whole series looking
// like one deck instead of thirty different ones.
//
// Style rules baked into these helpers (do not silently break these when adding
// a new one):
//   - Nothing reads smaller than 20pt except code-card text.
//   - Code cards carry their three status dots stacked at the TOP-RIGHT, so the
//     code itself starts almost at the card's top edge.
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

/** Standard content-slide header for a WHITE-background slide: circular icon
 *  badge + eyebrow label + title. */
function addHeader(slide, { icon, eyebrow, title, badgeColor = NAVY, x = 0.7, y = 0.5 }) {
  slide.addShape('ellipse', {
    x, y, w: 0.62, h: 0.62, fill: { color: badgeColor }, line: { type: 'none' },
  });
  slide.addImage({ path: ICON(icon), x: x + 0.14, y: y + 0.14, w: 0.34, h: 0.34 });
  slide.addText(eyebrow.toUpperCase(), {
    x: x + 0.82, y: y - 0.06, w: 10, h: 0.4,
    fontFace: FONT_BODY, bold: true, fontSize: 20, color: ORANGE, charSpacing: 1.5, margin: 0,
  });
  slide.addText(title, {
    x: x + 0.8, y: y + 0.32, w: 10.3, h: 0.65,
    fontFace: FONT_HEAD, bold: true, fontSize: 30, color: INK, margin: 0,
  });
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
  slide.addText(title, {
    x: x + 0.8, y: y + 0.32, w: 10.3, h: 0.65,
    fontFace: FONT_HEAD, bold: true, fontSize: 30, color: WHITE, margin: 0,
  });
}

/** Code-editor card: navy rounded rect, three status dots stacked at the TOP-RIGHT
 *  (not across the top), so code starts almost at the top edge and gets the space. */
function addCodeCard(slide, { x, y, w, h, lines, fontSize = 18 }) {
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
  const body = lines.map((l, i) => ({
    text: l.text,
    options: { color: l.color || 'D7E3F4', breakLine: i < lines.length - 1, bold: !!l.bold },
  }));
  slide.addText(body, {
    x: x + 0.3, y: y + 0.22, w: w - 0.75, h: h - 0.4,
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
}) {
  steps.forEach((st, i) => {
    const y = startY + i * rowH;
    const color = highlight[i] || numberColor;
    slide.addShape('ellipse', {
      x, y: y + 0.02, w: 0.55, h: 0.55, fill: { color }, line: { type: 'none' },
    });
    slide.addText(String(i + 1), {
      x, y: y + 0.02, w: 0.55, h: 0.55, align: 'center', valign: 'middle',
      fontFace: FONT_HEAD, bold: true, fontSize: 22, color: WHITE, margin: 0,
    });
    slide.addText(st.title, {
      x: x + 0.8, y: y - 0.06, w: 10.8, h: 0.42,
      fontFace: FONT_HEAD, bold: true, fontSize: 20, color: INK, margin: 0,
    });
    slide.addText(st.detail, {
      x: x + 0.8, y: y + 0.36, w: 10.8, h: 0.55,
      fontFace: FONT_BODY, fontSize: 20, color: MUTED, margin: 0, lineSpacingMultiple: 1.1,
    });
  });
}

/** Grid of numbered navy cards for a "Try it" slide. Lays out 1 or 2 columns
 *  depending on how many cards are given. */
function addTryItGrid(slide, { cards, x = 0.7, y = 2.45, totalW = 11.9, h, gap = 0.3, cols }) {
  const n = cards.length;
  const nCols = cols || (n <= 2 ? n : 2);
  const nRows = Math.ceil(n / nCols);
  const cardW = (totalW - gap * (nCols - 1)) / nCols;
  const cardH = h || (nRows === 1 ? 4.15 : 2.0);
  cards.forEach((c, i) => {
    const col = i % nCols, row = Math.floor(i / nCols);
    const cx = x + col * (cardW + gap);
    const cy = y + row * (cardH + gap);
    slide.addShape('roundRect', {
      x: cx, y: cy, w: cardW, h: cardH, rectRadius: 0.12,
      fill: { color: NAVY2 }, line: { type: 'none' },
    });
    slide.addShape('ellipse', { x: cx + 0.35, y: cy + 0.3, w: 0.55, h: 0.55, fill: { color: TEAL }, line: { type: 'none' } });
    slide.addText(String(i + 1), {
      x: cx + 0.35, y: cy + 0.3, w: 0.55, h: 0.55, align: 'center', valign: 'middle',
      fontFace: FONT_HEAD, bold: true, fontSize: 22, color: WHITE, margin: 0,
    });
    slide.addText(c.title, {
      x: cx + 0.35, y: cy + 1.05, w: cardW - 0.7, h: 0.8,
      fontFace: FONT_HEAD, bold: true, fontSize: 21, color: WHITE, valign: 'top', margin: 0, lineSpacingMultiple: 1.1,
    });
    slide.addText(c.body, {
      x: cx + 0.35, y: cy + 1.05 + (nRows === 1 ? 0.85 : 0.7), w: cardW - 0.7, h: cardH - (nRows === 1 ? 2.0 : 1.85),
      fontFace: FONT_BODY, fontSize: nRows === 1 ? 20 : 18, color: 'CADCE8', valign: 'top', margin: 0, lineSpacingMultiple: 1.2,
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
  newDeck, addCornerLogo, addFooter, addHeader, addSectionHeader,
  addCodeCard, addCard, addNumberedSteps, addTryItGrid, addTitleSlide,
};
