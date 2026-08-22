# Deck template

The shared build kit every v3 lesson deck is generated from. One file,
`deck-kit.js`, holds the "Circuit Night" palette, fonts, and slide helpers
(title slide, headers, code cards, info cards, numbered steps, a "Try it"
card grid, footer + logo chrome); each lesson's `build/*.js` script requires
it and calls those helpers to lay out its own slides.

## Regenerating a deck

```
cd docs/presentations/v3/template
npm install
node build/00-orientation.js          # writes ../00-orientation.pptx
node build/aside-setup.js             # writes ../aside-setup.pptx
node build/aside-git-branching.js     # writes ../aside-git-branching.pptx
```

Each build script's `outPath` writes two directories up, into
`docs/presentations/v3/`, so it always lands next to the other decks
regardless of which one you run.

## Adding a new lesson's deck

1. Copy an existing `build/*.js` as a starting point — `aside-setup.js` is a
   good template for a procedural/command-heavy lesson, `00-orientation.js`
   for a concept-heavy one.
2. Source the *content* from the actual lesson file under
   `docs/lessons/v3/`, not from memory or from another deck. Re-derive the
   wording — don't just retitle a copy.
3. **Write every slide as if the student has never seen another version of
   this course.** No comparisons to "the classic track," no "unlike before,"
   no assuming context the markdown lesson's own asides carry for
   contributors but a classroom never needs. If a sentence only makes sense
   to someone who knows there's another track, cut it.
4. If a slide needs an icon that isn't already in `assets/icons/`, add a
   `[iconName, color, fileName]` job to `render_icons.js` and run
   `node render_icons.js` once — it only (re)renders icons, it doesn't
   touch any deck.
5. Keep the house rules `deck-kit.js`'s helpers already enforce: nothing
   smaller than 20pt except code-card text; the three status dots on a code
   card stack at its top-right, not across the top; every slide gets the
   small logo watermark via `addFooter`; the title slide gets the full logo.
   The logo comes in two recolored variants of the same mark —
   `team5010-logo-onnavy.png` (white tiger head, for the navy title slide and
   any navy content slide) and `team5010-logo-onwhite.png` (black tiger head,
   for the far more common white-background slide). `addFooter`'s `dark: true`
   flag picks the right one automatically — **always pass it on a slide whose
   `background` is `NAVY`**, or the logo (and the footer text) render in the
   wrong color for that background and go unreadable. This was a real bug in
   the first pass of this deck, not a hypothetical one. `addNumberedSteps`
   has the identical hazard and the identical fix (`dark: true`) — its
   title/detail text defaults to colors meant for a white background, and
   the "Run it" pattern gets reused on navy section slides often enough
   that this actually happened once (Lesson 5's "walk through one tick").
   Check every helper you call on a `NAVY` slide, not just the ones this
   note happens to name.
6. There's no automated overflow check — `pptxgenjs` will happily place text
   that doesn't fit its box, and this has caused real, visible overflow in
   shipped decks twice (a hardcoded-offset bug in `addTryItGrid`'s 2-row case,
   and several code/text boxes sized against too-optimistic line-height math).
   Estimate line-wrap by hand for anything you add or resize:
   - **Width**: `~0.6 × fontSize` points per character for Courier New;
     proportional text in Cambria/Calibri runs narrower, `~0.5`–`~0.52 × fontSize`.
   - **Height**: assume each line costs `~1.3 × fontSize` points, even where
     `lineSpacingMultiple` is set lower — PowerPoint's actual per-line height
     appears to run higher than a naive `fontSize × lineSpacingMultiple`
     estimate, and trusting the lower number is exactly how the two bugs above
     happened.
   - Require the estimate to fit in **at most 85% of the box's height/width**
     (i.e. at least 15% slack) before calling a box "fine" — a number that
     merely fits with 2–5% to spare is a future overflow report, not a pass.
   - Whenever you resize one element in a stacked column, re-derive the
     sibling below it — a code card that grows by 0.3in and an info card
     that isn't shifted/shrunk to match is how a body paragraph ends up
     overflowing its own box even though the *code* card looks fine.
   - Run `docs/presentations/v3/template/audit-overflow.js` (Node, no deps
     beyond what's already installed) after any layout change — it parses
     every `addCodeCard`/`addCard`/`s.addText` call in `build/*.js` and flags
     anything failing the 15%-margin rule above. It's a heuristic scan, not a
     real layout engine — treat a clean report as "no known problem," not
     "definitely fine," especially since visual rendering isn't available in
     this environment (see below). Its block-extraction is string-literal-aware
     (a `(` or `)` inside a quoted heading/body — `"getPosition()"`, very
     common in this content — no longer miscounts as real nesting); an
     earlier version wasn't, and silently mis-scanned any `addCard` whose
     prose quoted a Java method call. Don't regress that if you touch the
     script — verify the fix still holds by checking that a body like
     `'new TalonFX(...) builds one specific motor'` gets scanned as one
     block, not truncated at the first `)`. **A second, worse bug shipped
     alongside the first one**: the two call sites that matter most —
     `findBlocks(src, 'addCodeCard(s')` and `findBlocks(src, 'addCard(s')`
     — passed a needle with the `(` in the wrong place, so the function
     appended a *second* `(` and then searched for a string
     (`"addCodeCard(s("`) that never occurs in real source. Every
     `addCodeCard`/`addCard` check silently matched **zero** blocks and
     reported nothing, for as long as that code stood — only the
     `s.addText` check (whose needle happened to be built correctly) was
     ever real. Lessons 1–5 were built and "cleared" against that broken
     tool, and shipped with real, visible overflow the tool should have
     caught. The fix: `call` is now just the bare identifier (`'addCodeCard'`,
     `'addCard'`), and `findBlocks` appends the one `(` itself. If you ever
     add a new call site, sanity-check it the same way: run
     `node -e "console.log(require('fs').readFileSync('build/X.js','utf8').includes('addCodeCard('))"`-style
     smoke test, or just confirm the tool's report changes when you
     deliberately break a real card's size — a report that never changes
     no matter what you do to the source is the tell.
7. Validate before calling it done:
   ```
   python3 <path-to-pptx-skill>/scripts/office/validate.py ../<name>.pptx
   markitdown ../<name>.pptx   # eyeball the text; grep for stray track/classic/before wording
   ```

## What's not in here

`node_modules/` is gitignored — run `npm install` to restore
`pptxgenjs`, `react`, `react-dom`, `react-icons`, and `sharp` from
`package.json` before building or re-rendering icons.
