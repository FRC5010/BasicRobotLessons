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
6. There's no automated overflow check — `pptxgenjs` will happily place text
   that doesn't fit its box. Estimate line-wrap by hand for anything code-like
   (`~0.6 × fontSize` points per character for Courier New; proportional text
   in Cambria/Calibri runs narrower, closer to `~0.5`/`~0.52 × fontSize`) and
   leave a visible margin — a card that's a hair too small is invisible until
   someone opens it in PowerPoint.
7. Validate before calling it done:
   ```
   python3 <path-to-pptx-skill>/scripts/office/validate.py ../<name>.pptx
   markitdown ../<name>.pptx   # eyeball the text; grep for stray track/classic/before wording
   ```

## What's not in here

`node_modules/` is gitignored — run `npm install` to restore
`pptxgenjs`, `react`, `react-dom`, `react-icons`, and `sharp` from
`package.json` before building or re-rendering icons.
