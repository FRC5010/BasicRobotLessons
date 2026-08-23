// Heuristic overflow scanner for this deck series' build scripts.
//
// This is NOT a layout engine — pptxgenjs (and PowerPoint) don't expose one
// to script against, and visual rendering isn't available in this project's
// environment (LibreOffice headless conversion is broken here). This script
// instead re-derives, from the same source text every build script writes,
// a conservative estimate of whether each text box has enough room, and
// flags anything under a 15%-margin safety bar. A clean report means "no
// known problem by this heuristic," not "definitely fine" — but it has
// caught real, shipped overflow bugs (a hardcoded-offset bug in the "Try it"
// grid, and several code/text boxes sized against overly optimistic
// line-height math), so re-run it after any layout change.
//
// Usage: node audit-overflow.js [build/*.js ...]   (defaults to build/*.js)

const fs = require('fs');
const path = require('path');

const LINE_MULT = 1.3;   // see README.md — PowerPoint's real per-line height
                          // runs higher than fontSize * lineSpacingMultiple.
const MARGIN = 0.85;      // require needed <= avail * MARGIN (>=15% slack)

function findBlocks(src, call) {
  const out = [];
  let idx = 0;
  const needle = call + '(';
  while (true) {
    const at = src.indexOf(needle, idx);
    if (at < 0) break;
    let i = at + needle.length - 1; // at the '('
    let depth = 0;
    let quote = null; // null, "'", or '"' — tracks whether we're inside a string literal
    for (; i < src.length; i++) {
      const c = src[i];
      if (quote) {
        if (c === '\\') { i++; continue; } // skip the escaped character entirely
        if (c === quote) quote = null;
        continue;
      }
      if (c === "'" || c === '"') { quote = c; continue; }
      // Parens/braces INSIDE a string literal (e.g. "getPosition()" in prose)
      // must not affect depth — that was a real bug here, caught while auditing
      // Lesson 5's deck: several addCard bodies quote Java method calls, and
      // the naive version silently truncated those blocks before reaching
      // fields like bodyColor, producing false "missing" reports.
      if (c === '(') depth++;
      else if (c === ')') { depth--; if (depth === 0) break; }
    }
    const block = src.slice(at + call.length, i + 1); // starts at '('
    const lineno = src.slice(0, at).split('\n').length;
    out.push({ lineno, block });
    idx = i + 1;
  }
  return out;
}

function getNum(block, key, def) {
  const m = block.match(new RegExp(key + ':\\s*(-?[\\d.]+)'));
  return m ? parseFloat(m[1]) : def;
}

function getStr(block, key) {
  const m = block.match(new RegExp(key + ":\\s*'((?:[^'\\\\]|\\\\.)*)'"));
  return m ? m[1] : null;
}

function allQuoted(block, key) {
  const re = new RegExp(key + ":\\s*'((?:[^'\\\\]|\\\\.)*)'", 'g');
  const out = [];
  let m;
  while ((m = re.exec(block))) out.push(m[1]);
  return out;
}

function checkCodeCards(fname, src, report) {
  for (const { lineno, block } of findBlocks(src, 'addCodeCard')) {
    const w = getNum(block, 'w'), h = getNum(block, 'h'), fs_ = getNum(block, 'fontSize', 18);
    const texts = allQuoted(block, 'text');
    const nlines = texts.length;
    const maxlen = texts.reduce((m, t) => Math.max(m, t.length), 0);
    // A fileLabel (see addCodeCard's comment in deck-kit.js) reserves extra room
    // at the top of the card — 0.72 total top+bottom pad instead of 0.4. Keep
    // this in sync with addCodeCard's own codeY/codeH numbers if those change.
    const hasLabel = /fileLabel:/.test(block);
    const availW = w - 0.75, neededW = maxlen * 0.6 * fs_ / 72;
    const availH = h - (hasLabel ? 0.72 : 0.4), neededH = nlines * fs_ * LINE_MULT / 72;
    const trueOverflow = neededW > availW || neededH > availH;
    const marginOverflow = neededW > availW * MARGIN || neededH > availH * MARGIN;
    if (trueOverflow || marginOverflow) {
      report.push(`[${fname} CODE L${lineno}] ${trueOverflow ? 'TRUE-OVERFLOW' : 'margin-only'} ` +
        `W:${neededW.toFixed(2)}/${availW.toFixed(2)} H:${neededH.toFixed(2)}/${availH.toFixed(2)}`);
    }
  }
}

function checkAddCards(fname, src, report) {
  for (const { lineno, block } of findBlocks(src, 'addCard')) {
    const w = getNum(block, 'w'), h = getNum(block, 'h');
    const pad = getNum(block, 'pad', 0.3);
    const eyebrow = getStr(block, 'eyebrow');
    const heading = getStr(block, 'heading');
    const headingSize = getNum(block, 'headingSize', 24);
    const bodySize = getNum(block, 'bodySize', 20);
    const bodyM = block.match(/body:\s*'((?:[^'\\]|\\.)*)'/s);
    const usableW = w - pad * 2;
    let cursorY = pad;
    if (eyebrow) cursorY += 0.5;
    if (heading) {
      const charsPerLine = Math.max(8, usableW / (0.52 * headingSize / 72));
      const estLines = Math.ceil(heading.length / charsPerLine);
      cursorY += estLines * (headingSize * LINE_MULT / 72) + 0.25;
    }
    const avail = h - cursorY - pad;
    if (bodyM) {
      const body = bodyM[1].replace(/\\n/g, '\n');
      const paras = body.split('\n\n');
      const charsPerLine = Math.max(8, usableW / (0.5 * bodySize / 72));
      const totalLines = paras.reduce((s, p) => s + Math.ceil(p.length / charsPerLine), 0);
      const needed = totalLines * (bodySize * LINE_MULT / 72);
      const trueOverflow = needed > avail;
      const marginOverflow = needed > avail * MARGIN;
      if (trueOverflow || marginOverflow) {
        report.push(`[${fname} CARD L${lineno}] ${trueOverflow ? 'TRUE-OVERFLOW' : 'margin-only'} ` +
          `avail=${avail.toFixed(2)} needed=${needed.toFixed(2)}`);
      }
    }
  }
}

function checkAddTexts(fname, src, report) {
  for (const { lineno, block } of findBlocks(src, 's.addText')) {
    const w = getNum(block, 'w'), h = getNum(block, 'h'), fs_ = getNum(block, 'fontSize', 20);
    if (w == null || h == null) continue;
    let paras = null;
    const plain = block.match(/^\(\s*'((?:[^'\\]|\\.)*)'\s*,/s) || block.match(/^\(\s*"((?:[^"\\]|\\.)*)"\s*,/s);
    if (plain) {
      paras = plain[1].replace(/\\n/g, '\n').replace(/\\'/g, "'").split('\n');
    } else {
      const texts = allQuoted(block, 'text');
      if (texts.length) paras = texts;
    }
    if (!paras) continue; // e.g. a .map()-built array — not parseable this way, check by hand
    const charsPerLine = Math.max(8, w / (0.5 * fs_ / 72));
    const totalLines = paras.reduce((s, p) => s + Math.max(1, Math.ceil(p.length / charsPerLine)), 0);
    const neededH = totalLines * (fs_ * LINE_MULT / 72);
    const trueOverflow = neededH > h;
    const marginOverflow = neededH > h * MARGIN;
    if (trueOverflow || marginOverflow) {
      report.push(`[${fname} TEXT L${lineno}] ${trueOverflow ? 'TRUE-OVERFLOW' : 'margin-only'} ` +
        `w=${w} h=${h} fs=${fs_} neededH=${neededH.toFixed(2)}/${h}`);
    }
  }
}

function main() {
  const args = process.argv.slice(2);
  const files = args.length ? args : fs.readdirSync(path.join(__dirname, 'build'))
    .filter(f => f.endsWith('.js'))
    .map(f => path.join(__dirname, 'build', f));

  let anyTrue = false;
  for (const file of files) {
    const fname = path.basename(file);
    const src = fs.readFileSync(file, 'utf8');
    const report = [];
    checkCodeCards(fname, src, report);
    checkAddCards(fname, src, report);
    checkAddTexts(fname, src, report);
    console.log(`===== ${fname} =====`);
    if (report.length === 0) {
      console.log('  (nothing flagged)');
    } else {
      for (const line of report) {
        console.log('  ' + line);
        if (line.includes('TRUE-OVERFLOW')) anyTrue = true;
      }
    }
  }
  console.log();
  console.log('Note: bullet lists built with .map() over a plain-string array are not');
  console.log('parsed by the TEXT check above (the literal text isn\'t in the source as');
  console.log('`text: \'...\'`) — verify those by hand if you touch one.');
  if (anyTrue) process.exitCode = 1;
}

main();
