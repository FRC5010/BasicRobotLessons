# Lesson slide decks

PowerPoint decks for classroom teaching, generated per lesson. These are a
teaching aid alongside the markdown lessons under [docs/lessons/](../lessons/)
— they summarize a lesson's goal, walkthrough, and code for use on a
projector, not a replacement for the lesson text itself.

## Layout

`docs/presentations/v3/NN-slug.pptx` — one deck per lesson in the **v3
(OpMode) track**, numbered and named to match the corresponding file in
[docs/lessons/v3/](../lessons/v3/) (e.g. `00-orientation.pptx` pairs with
`docs/lessons/v3/00-orientation.md`). A `classic/` sibling folder can hold
decks for the roboRIO/Commands-V2 track if that track gets decks too — none
exist yet.

## Design system ("Circuit Night")

Every deck uses the same palette and layout conventions so they read as one
consistent series:

- **Colors:** navy `0B1F3A`/`132A4C` (backgrounds), teal `1B9AAA` (secondary
  accent), team orange `FF5010` (primary accent — this is Team 5010's color,
  not a placeholder), white, ink `13294B` (body text on light slides), muted
  `5B6B84` (captions), pale card fill `F3F6FA`.
- **Fonts:** Cambria (headings), Calibri (body), Courier New (code — chosen
  over Consolas because it's on both the Windows and LibreOffice safe list).
- **Type size floor:** nothing runs smaller than 20pt so text reads from the
  back of a classroom. The one exception is code-block text, which shrinks
  as needed to fit a snippet in its card (typically 18–26pt).
- **Code cards:** a dark navy rounded rectangle with three small status dots
  stacked at the top-right corner (not across the top), so code text starts
  near the top edge of the card instead of losing a line to the dots.
- **Recap:** every content slide opens with a small colored circular badge
  (an icon + an eyebrow label) beside its title.

## Regenerating or editing a deck

Decks are built with `pptxgenjs` (plus `react-icons` + `sharp` for icon
assets) from a per-lesson build script. That tooling isn't checked into this
repo yet — ask if you want the build scripts added here so decks can be
regenerated or restyled without starting from scratch.
