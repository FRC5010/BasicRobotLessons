# Lesson slide decks

PowerPoint decks for classroom teaching. These are a teaching aid alongside
the markdown lessons under [docs/lessons/](../lessons/) — they summarize a
lesson's goal, walkthrough, and code for use on a projector, not a
replacement for the lesson text itself.

**This series is v3 (OpMode) track only.** The classic (roboRIO) track has
no decks and none are planned; don't add a `classic/` sibling folder without
checking first.

## Layout

`docs/presentations/v3/` holds one `.pptx` per lesson, named to match the
corresponding file in [docs/lessons/v3/](../lessons/v3/) — `00-orientation.pptx`
pairs with `docs/lessons/v3/00-orientation.md`, `aside-setup.pptx` with
`docs/lessons/v3/aside-setup.md`, and so on. `docs/presentations/v3/template/`
holds the shared build kit every deck is generated from — see its own
[README](v3/template/README.md) for how to regenerate a deck or add a new
one.

## Every deck is student-facing and stands alone

A deck is watched by students who are new to this material — never assume
they know there's another track, or that anything here is a "second version"
of something. Wording that only makes sense to someone comparing this course
against another one belongs in the markdown lesson's own asides for
contributors, not in front of a classroom.

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
  as needed to fit a snippet in its card (typically 15–26pt).
- **Code cards:** a dark navy rounded rectangle with three small status dots
  stacked at the top-right corner (not across the top), so code text starts
  near the top edge of the card instead of losing a line to the dots.
- **Recap:** every content slide opens with a small colored circular badge
  (an icon + an eyebrow label) beside its title.
- **Team branding:** the full Team 5010 logo appears large on every deck's
  title slide, and a small watermark version of it sits in the top-right
  corner of every other slide. The logo has a light variant (white tiger
  head, for navy slides) and a dark variant (black tiger head, for white
  slides) — see [v3/template/README.md](v3/template/README.md) for which
  helper picks which one.

## Regenerating or editing a deck

See [v3/template/README.md](v3/template/README.md) — decks are built with
`pptxgenjs` (plus `react-icons` + `sharp` for icon assets) from a shared kit
and one build script per deck, both checked into this repo.
