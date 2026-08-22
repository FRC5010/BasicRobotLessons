# Aside — Setting up the OpMode track and connecting it to GitHub

**Goal:** Go from a bare Windows machine to a working OpMode-track robot
project you can build, run in simulation, and back up to GitHub. Do this
**before [Lesson 0](00-orientation.md)**. If you already did
[the classic track's setup aside](../aside-setup.md), you already have Git,
a GitHub account, and `gh` — you can skip sections 2 and 6, but still work
through section 1 (this alpha's tools install side-by-side with any earlier
season, not on top of it) and section 3 (the classic track's JDK is a
different, older version than this one needs).

**New concepts**
- **The WPILib installer** — same tool the classic track uses, pointed at
  this season's alpha instead of the released version
- **Git** — local repository, commits, `.gitignore`
- **GitHub** — the remote copy of your repo, and how you connect them
- **GitHub CLI** (`gh`) — the friction-free path to authentication
- This track's own way of handing you a starting project — WPILib's New
  Project wizard has an OpMode template too, but it doesn't come with
  Commands V3 built in, so this course hands you a starting project that
  already has it, via the same tool this whole course uses to check its own
  lessons

**When you can use this**
- One-time setup before starting the course. You'll come back to section 8
  ("the everyday loop") after every lesson.

Fair warning, same as the classic track's version of this page: this is the
least exciting part of the whole course, and it's also where a wrong turn
costs you hours later. The instructions assume Windows + PowerShell, except
for one step that genuinely needs a Unix-style shell — called out plainly
when you get there. macOS/Linux flows are similar throughout; the paths
differ.

One honest thing to know going in, so it doesn't feel like something's
missing: **this track targets a 2027 alpha**, so its starting project isn't
quite what the stable WPILib installer's wizard generates. The installer
itself is real, though — you'll install it in section 1 below, same tool
the classic track uses, just pointed at the alpha instead of the released
season — and its New Project wizard even has an OpMode template. What that
template doesn't have is **Commands V3**, the coroutine-style command
framework this whole track is built around — it's a separate add-on
vendordep, not something the wizard wires in for you. So instead of
generating a project and then hand-adding that piece yourself, this course
hands you a starting project with it already in place, using a script this
course already uses on itself. That's not a downgrade so much as a
different shape — you'll see the same tool the whole course was verified
with, on your very first day.

---

## 1. Install WPILib's tools

This is the same installer the classic track uses — same tool, just pointed
at this season's alpha instead of the officially released one. It's worth
doing first: it hands you VS Code, a JDK, Gradle, and the WPILib extension
all in one pass, so nothing later in this page has to ask you to install
those separately.

**Download it:** [the allwpilib releases page on
GitHub](https://github.com/wpilibsuite/allwpilib/releases). Grab
**v2027.0.0-alpha-6** — the current top alpha for this season — and pick
the file for your OS (`.iso` for Windows, `.dmg` for macOS, `.tar.gz` for
Linux).

**Run it.** On Windows, right-click the downloaded `.iso` and choose
**Mount**, then launch `WPILibInstaller.exe` (7-Zip's "Extract to..." works
too, if nothing offers to mount it). Press **Start**, then choose
**Everything** — not **Tools Only** — so you get VS Code, the JDK, Gradle,
and the extension in one pass instead of just the standalone dashboards.
**Install for this User** is the option that doesn't need administrator
access.

When the installer reaches the VS Code step, pick **"Download for this
computer only."** VS Code can't be bundled directly into the installer for
licensing reasons, so this step fetches it separately — it's a ~300MB
download. The installer keeps its own copy of VS Code per season (you'll
see it as **WPILib VS Code 2027**), so it won't touch any VS Code you
already have installed for other work.

Once it finishes, launch **WPILib VS Code 2027** — not any other VS Code
shortcut on your machine — to confirm it opens.

---

## 2. Install Git

You'll need Git in section 4, to pull your starting project — get it out of
the way now.

Get Git from **git-scm.com/download/win**, or install it from the command
line.

**Run:**

```powershell
winget install --id Git.Git
```

Default options are fine. When it asks about line endings, pick **"Checkout
Windows-style, commit Unix-style"** — that's what team collaborations expect.

Configure your identity once so every commit records who made it.

**Run:**

```powershell
git config --global user.name  "Your Name"
git config --global user.email "you@example.com"
```

Use the same email you'll use on GitHub (section 6). GitHub matches commits
to your account by email — different addresses means your commits won't show
up under your profile.

---

## 3. Confirm your JDK

Section 1's installer already gave you a JDK — this alpha bundles **Eclipse
Temurin 25**, matching what this course's `build.gradle` targets directly
(`sourceCompatibility = JavaVersion.VERSION_25`). You don't need to install
one yourself. This section is just making sure Gradle actually finds it,
which matters most if you also did the classic track's setup — that one
runs on **Java 17**, a different JDK entirely, so you'll have two JDKs on
this machine and Gradle needs to pick the right one.

**Sanity check — run:**

```powershell
java -version
```

You want to see `25` somewhere in the output. If your machine already has a
different JDK on its `PATH` — plenty of laptops do, especially if you also
did the classic track's setup — that's fine, you don't need to remove it.
You just need to be able to **point at** the JDK 25 install when it matters:
set the `JAVA_HOME` environment variable to its install folder, or use
`ORG_GRADLE_JAVA_HOME` to point Gradle at it specifically without touching
`JAVA_HOME` system-wide. This isn't optional bookkeeping — Gradle fails
loudly (`invalid source release: 25`) rather than quietly picking a JDK that
doesn't match, so it's worth confirming now rather than three commands from
now.

---

## 4. Clone the course repo and pull out your starting project

Here's the step that's genuinely different from the classic track. Section
1's wizard could generate you a fresh OpMode-style project, but it wouldn't
carry Commands V3 — so instead of generating one and then hand-adding that
piece, you're going to ask this course's own repository for a clean copy of
the one it already ships: `code/OpModeV3Robot`, the pristine 2027 alpha
template every lesson in this track builds forward from, Commands V3
already wired in.

> **Run this part in Git Bash, not PowerShell.** The script that does the
> extraction needs `bash`, `curl`, and `python3` — the same requirement the
> classic track's README states for its equivalent trick. The WPILib/Git
> installers you already have give you Git Bash; look for it in your Start
> menu. Everything before and after this step can stay in PowerShell.

**From Git Bash, run:**

```bash
git clone https://github.com/FRC5010/BasicRobotLessons.git
cd BasicRobotLessons
./tools/verify-lessons-v3.sh -1 --sandbox ~/dev/MyOpModeRobot
```

That third command is doing real work, so read it once before you run it.
`--sandbox` names where your project lands — pick anywhere outside
`BasicRobotLessons` itself, because that folder gets deleted and rebuilt
every time the script runs. The `-1` means "no lessons rolled forward, just
build the template as it stands" — exactly Lesson 0's starting point. (Order
doesn't matter — `--sandbox ~/dev/MyOpModeRobot -1` works the same.)

*Nothing to add — what you'll see, roughly:*

```
==> Sandbox: /home/you/dev/MyOpModeRobot  (no lessons — building .../code/OpModeV3Robot as it stands)
==> Vendordeps: using whatever .../code/OpModeV3Robot already carries
==> Applying no lesson snapshots
==> Gradle: compileJava
...
BUILD SUCCESSFUL in 1s
==> OK — .../code/OpModeV3Robot compiles as it stands
Sandbox kept at /home/you/dev/MyOpModeRobot (drop JUnit tests in src/test/java and re-run with 'test').
```

The first run downloads the GradleRIO plugin and this alpha's vendordeps and
takes a few minutes — normal, not broken. Later runs are seconds.

**Two folders now exist, and it matters that you don't confuse them:**

- `BasicRobotLessons` — the course repo you just cloned. It has its own
  `.git` history that belongs to this course, not you. You'll come back to
  it if a lesson is unclear, but you never commit *your* work into it.
- `~/dev/MyOpModeRobot` (or wherever you pointed `--sandbox`) — **your**
  project. The script stripped its `.git`, `build`, and `.gradle` folders on
  the way out, so it's a clean, ordinary, git-less folder, exactly the shape
  a wizard-generated project would be. This is what the rest of this page —
  and every lesson from here on — is talking about.

**Verify it builds:**

```powershell
cd ~/dev/MyOpModeRobot
./gradlew build
./gradlew simulateJava
```

Same first-build patience as any Gradle project — dependencies download once,
then it's fast.

One more thing worth naming honestly: you have **WPILib VS Code** and its
extension from section 1, same as the classic track — but this course
hasn't verified that extension's buttons (Build, Deploy, Simulate, `F5`
debugging) against this alpha's project shape, so this page doesn't rely on
them. Everything above and below works from a plain terminal, in whatever
editor you like. If the extension's buttons do work for you, great, use
them; if `F5` doesn't do anything, `./gradlew simulateJava` from a terminal
is the path every lesson in this track was actually verified against.

Set your team number in `.wpilib/wpilib_preferences.json` — the template
ships `5010`, same as the classic track's.

---

## 5. Make it its own Git repo

**From the project folder in PowerShell, run:**

```powershell
git init
git branch -M main
```

The template already ships with a `.gitignore` that excludes `build/`,
`.gradle/`, and other things that shouldn't be tracked. Trust it — don't
hand-edit unless you have a specific reason.

**See what Git sees:**

```powershell
git status
```

Every file listed as *untracked* is code or config that should live in the
repo.

**Stage and commit:**

```powershell
git add .
git commit -m "Initial commit from the OpMode template"
```

That's your first snapshot. If your laptop caught fire right now, you could
recover the project from this commit — assuming it lives somewhere other
than this laptop. Which brings us to section 6.

---

## 6. Get a GitHub account and install `gh`

Sign up at **github.com** with the same email you used in `git config` above.

The friction-free way to authenticate from the command line is **GitHub
CLI**.

**Install it:**

```powershell
winget install --id GitHub.cli
```

Close and re-open PowerShell so `gh` is on the PATH.

**Authenticate:**

```powershell
gh auth login
```

Answer the prompts: **GitHub.com** → **HTTPS** → **Yes, authenticate Git with
your GitHub credentials** → **Login with a web browser**. It gives you a
one-time code, opens your browser, you paste the code, done. From now on
`git push` and `git pull` "just work" without ever asking you for a password.

(Prefer clicking to typing? **GitHub Desktop** covers the same ground with a
GUI. Install it instead of `gh`, sign in once, and use its Push/Pull buttons
in place of the commands below.)

---

## 7. Create the remote and push

**From inside the project folder, run:**

```powershell
gh repo create MyOpModeRobot --private --source=. --remote=origin --push
```

That one command creates a GitHub repo, marks your local folder as its
source, wires it up as the `origin` remote, and pushes your first commit.

**Then run:**

```powershell
gh repo view --web
```

opens the repo in your browser. You should see every file from your
project — and none of `BasicRobotLessons`, the course repo. If you see the
whole course in there instead, you pushed from the wrong folder; go back to
section 4's warning about the two folders.

Prefer to do it in two steps? Create the repo on github.com first — **+**
menu → **New repository**, **Private**, do **not** add a README or
`.gitignore` on the web form since you already have them.

**Then run:**

```powershell
git remote add origin https://github.com/<you>/MyOpModeRobot.git
git push -u origin main
```

The `-u` on that first push tells Git: "from now on, when I say `git push` on
this branch, this is where you send it."

---

## 8. The everyday loop

Everything above was one-time setup. This section is the part you'll
actually live in. Once a day, or every time you finish a lesson, or every
time something works that didn't work before — snapshot it.

**Run:**

```powershell
git status                             # see what changed
git add .                              # stage everything
git commit -m "Finish Lesson 3 — telemetry"
git push                               # ship it to GitHub
```

Commit messages should say **what changed and why**, not "stuff" or "wip".
Future-you reading this list in a month will thank you.

If you (or a teammate) edit on GitHub directly, pull those changes down
before you do more work.

**Run:**

```powershell
git pull
```

That's the whole daily rhythm: **pull → edit → add → commit → push**. If a
push complains about **merge conflicts**, someone (usually past-you) edited
the same lines in two places. Don't panic — Git marks the conflicting lines
with `<<<<<<<`, `=======`, and `>>>>>>>` inside the file. Open it, decide
which version wins, delete the markers, then `git add` and `git commit` to
finish the merge. Everyone hits their first merge conflict eventually; it's
a rite of passage, not a disaster. ([The branching aside](../aside-git-branching.md)
covers this in real depth once you're ready for it — it's written for
either track.)

---

## Try it

1. **Prove the round trip.** Add a line to `README.md` (create one at the
   project root if it doesn't have one), then `add` → `commit` → `push`.
   Open the repo on github.com and confirm your change is visible.
2. **Simulate the "laptop caught fire" recovery.** From a different folder:
   ```powershell
   git clone https://github.com/<you>/MyOpModeRobot.git test-clone
   cd test-clone
   ./gradlew build
   ```
   If that builds, your GitHub copy is a complete backup. If it fails, some
   source file didn't get committed — go find it.
3. **`.gitignore` sanity check.** Run `./gradlew build`, then `git status`.
   The `build/` and `.gradle/` folders Gradle just wrote should **not**
   appear. If they do, your `.gitignore` isn't doing its job.
4. **Regenerate and diff.** Back in `BasicRobotLessons`, run section 4's
   command again with a *different* `--sandbox` folder. Diff it against
   your actual project (`diff -rq ~/dev/MyOpModeRobot ~/dev/CheckAgain`,
   ignoring `.git`). They should match exactly, except for whatever you've
   changed since section 5's first commit — proof that your starting point
   was never a one-off, it's reproducible from this repo any time you need
   it again.

---

## What you learned

Your machine is now set up for this track: **Git** is tracking snapshots
locally with `add` and `commit`, and **GitHub** holds the remote copy —
`git push` sends commits up, `git pull` brings them down — with `gh auth
login` meaning neither will ever bug you for a password. The one thing to
carry forward is the daily rhythm: **pull → edit → add → commit → push**.

The real difference from the classic track's version of this page was
section 4, and it's worth naming plainly rather than smoothing over: the
installer and its wizard are real for this alpha too, but the wizard's
OpMode template doesn't come with Commands V3 — so instead of generating a
project and then hand-adding that piece, you got one from this course's own
repository with it already in place, using the exact tool
(`tools/verify-lessons-v3.sh`) every lesson in this track was checked with
before it was ever written down. That's not a workaround bolted on for
setup — it's the real tool, used the way it's meant to be used, on day one
instead of lesson eighteen. The boring part is over.

---

**Ready to start?** Head to [Lesson 0 — Orientation](00-orientation.md).
