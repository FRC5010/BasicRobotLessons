---
title: How the lessons are checked
nav_order: 3
---

# How the lessons are checked

Much of this course, its text and its reference code, was written with an AI
assistant. AI assistants are good at producing text that *sounds* right, and
they sometimes invent things that aren't: a method that doesn't exist, a
number nobody measured, a library behaving the way it "should" instead of the
way it does. A course for students can't afford that. A wrong method name
costs a student an evening, and a wrong number teaches them to distrust what
they see.

So the rule for this course is: **nothing goes into a lesson because it sounds
right. It goes in because something checked it.** This page describes what does
the checking, and, just as important, what doesn't get checked.

The tools named below all live in
[the GitHub repository](https://github.com/FRC5010/BasicRobotLessons), mostly
under its
[`tools/` folder](https://github.com/FRC5010/BasicRobotLessons/tree/main/tools).

## 1. Every lesson's code is compiled

Each lesson has a reference copy of the code it changes, in
[`code/v3/`](https://github.com/FRC5010/BasicRobotLessons/tree/main/code/v3).
A script, `tools/verify-lessons-v3.sh`, takes the same starting project you
start from, applies Lesson 0's code, then Lesson 1's, and so on in order, the
way you would. It makes every deletion the lessons tell you to make, and builds
the result with the real WPILib and vendor libraries, pinned to exact versions.

Today Lessons 0–33 compile with zero warnings at every stopping point. (Lesson
34 is waiting on a library and is marked on its page.)

Compiling proves the code is real Java against the real libraries, so an
invented method fails the build. It doesn't prove the code does what the lesson
says. That's what the rest of this page is for.

## 2. The code in the lesson matches the code that compiled

Compiling the reference copy is no help if the lesson tells you to type
something different. A second checker, `tools/check-lesson-code-v3.py`, finds
every "type this" block in every lesson (the ones with a **bold** lead-in) and
checks that it appears in the compiled code after that lesson. It compares
Java tokens, so spacing and comments don't matter, but a changed name or a
missing argument does. A block that tells you to delete something must really
be gone.

A few blocks differ on purpose: an experiment the lesson has you undo, or a
first version the same lesson replaces. Each one is listed with its reason in
an exceptions file, and the checker complains if an exception stops matching,
so the list can't quietly go stale. At the last count, all 404 "type this"
blocks pass.

A third checker makes sure the `NEXT LESSON` comments in each lesson's code
point at every place the next lesson changes, and at nothing else.

## 3. Every claim about a library is written down, with its evidence

Lessons say things like "`withPoseReset()` only resets the estimate, not where
the robot is", or "with `kV` zeroed the elevator trails by about 9 cm". Each
statement like that is a **claim**, and each claim is written down in a
registry
([`tools/claims/registry/`](https://github.com/FRC5010/BasicRobotLessons/tree/main/tools/claims/registry)).
The lesson points at it with a hidden marker at the end of the sentence, so
you never see it.

Each entry records:

- **The statement** the lesson relies on.
- **The evidence**: where it was confirmed, and how. The usual ways are reading
  the library's source or its compiled bytecode, running a small test against
  the real class, or running the whole robot program in simulation.
- **The library versions** it was confirmed on.
- **For a number, the range** the lesson's wording still describes truthfully.
  "About 9 cm" stays true between 8.5 and 9.5 cm, say, and the measured values
  are written beside it.

Right now the registry holds 621 claims, and the lessons point at them from
1,037 places. Most (381) are numbers measured in simulation; 165 are about how
code behaves when it runs; 75 are about what an API contains.

**A check runs before every commit** made with the course's tooling, and
anyone working on the repository can turn it on for their own commits. It refuses a
change whose lesson points at a claim that doesn't exist, or a claim no lesson
uses. It also refuses a broken or misplaced marker. Anyone editing a marked
sentence is expected to re-read the claim and update one or the other.

Some claims can't be shown by compiling: "there is no `MathUtil.clamp` in this
version", for instance. Those have small tests of their own, run against the
pinned libraries, and each test is named after its claim. When a library update
breaks one, the failure says which claim, and so which lessons, to fix.

## 4. Numbers come from running the code

Every number a lesson quotes from the simulator (how far the elevator lags,
how long the flywheel takes to spin up, where an auto ends) comes from running
the course's own code and reading what happened. Usually that's the real
`Robot`, with its own loop, a simulated gamepad and a simulated driver
station. Nobody works a number out in their head.

Some rules for that measuring:

- **Run it more than once.** A number that changes from run to run is given as a
  range ("10 to 50 cm"), or as how often something happens ("4 of 30 runs").
  It's never given as the one run that looked best.
- **Say what's not understood.** When a measurement can't be explained, the
  notes say so. They don't invent a reason.
- **Measure again when a library changes.** When WPILib's 2027 alpha-8 changed
  the Kraken X60 motor model, every motor-dependent number in Lessons 7–33 was
  measured again. Where a number had moved, the lesson changed with it.

## 5. Figures are measurements too

The graphs and diagrams in the lessons are drawn by scripts in
[`tools/figures/`](https://github.com/FRC5010/BasicRobotLessons/tree/main/tools/figures),
one script per figure, 58 in all. A graph is drawn from data the simulator
recorded at that lesson's state, and the data is kept beside the script, so the
figure can be rebuilt when its numbers are measured again. A diagram is drawn
from the lesson's own constants. The numbers a figure shows have to match the
lesson's text.

Screenshots of tools that can't run where the lessons are built, such as
AdvantageScope or VS Code, were taken by a person on a real computer, from the
course's own code. They're often what showed the text was wrong: menus named
differently, a tab that doesn't exist.

## 6. Read the library, not its documentation

Documentation describes what a library's authors meant; the source is what it
does. Where the two might disagree, the lessons go by the source, or by the
compiled library itself. One example: a path library's documentation described
an `EventTrigger` class you build, and the real library has no such class.
Library versions are pinned to exact files that can't change underneath the
course.

## What these checks caught

The checks only matter if they find things. Some of what they turned up, all
fixed:

- **Lessons 1 and 2 crashed at startup** on WPILib alpha-8. They compiled, but
  running them found it.
- **Lesson 17 said the robot swings 5–12 cm past a corner.** Measured, it's
  14–16 cm.
- **One of Lesson 17's Try Its described something that didn't happen.** Its
  "turn the gain to zero and watch it go wide" didn't reproduce, so that half
  was dropped.
- **Lesson 26 said a straight trip stays within about 11 mm of the line.**
  Four runs said about 5 mm.
- **Lesson 12 said WPILib has no shortcut for converting radians to
  rotations.** It does.
- **On the red alliance, pushing the stick forward drove the robot toward the
  driver.** Running every auto and teleop from each alliance station turned it
  up.
- **Fourteen contradictions** between lessons and measurements, found when the
  claims registry was first filled in.

## What isn't checked

Be clear-eyed about the limits:

- **Simulation isn't a robot.** The numbers come from the simulator. A real
  robot has friction, battery sag, worn wheels and latency the simulator models
  only roughly or not at all. Expect your robot's numbers to differ, and trust
  what *your* robot measures.
- **Statements about real hardware** (how a real Pigeon or Talon FX behaves)
  come from the vendors' documentation and source, and haven't been tested on a
  robot here.
- **Windows and macOS.** The lesson updater app and its launchers have only been
  run on Linux.
- **The explanations.** A checker can confirm that a method exists, or that a
  number was measured. It can't confirm that an explanation is the clearest one,
  or that an analogy fits. People read and review the lessons for that, and
  mistakes still get through.

If you find something that doesn't match what you see, that's worth reporting:
[open an issue](https://github.com/FRC5010/BasicRobotLessons/issues) with the
lesson, the section, and what you saw. A lesson that's wrong is a bug, and gets
fixed like one.
