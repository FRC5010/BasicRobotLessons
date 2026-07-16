# Aside — Setting up the project and connecting it to GitHub

**Goal:** Go from a bare Windows machine to a working robot project you can
build, run in simulation, and back up to GitHub. Do this **before
[Lesson 0](00-orientation.md)**. If you already have a working robot project
and know how to push commits, skip straight to Lesson 0.

**New concepts**
- The **WPILib installer** and what it gives you (VSCode, JDK, extension, sim
  tools — all in one shot)
- **Git** — local repository, commits, `.gitignore`
- **GitHub** — the remote copy of your repo, and how you connect them
- **GitHub CLI** (`gh`) — the friction-free path to authentication

**When you can use this**
- One-time setup before starting the course. You'll come back to section 7
  ("the everyday loop") after every lesson.

The instructions below assume Windows + PowerShell because that's what the
[README](../../README.md) targets. macOS/Linux flows are similar; the paths
and installer files differ.

---

## 1. Install WPILib (this gives you almost everything)

The WPILib installer bundles a **separate VSCode installation** with the WPILib
extension pre-loaded, the exact JDK the robot code needs, Gradle templates,
and simulation tools. You do **not** need to install VSCode, Java, or Gradle
separately — do it *only* through the WPILib installer or your versions will
drift from what the robot code expects.

Grab the **WPILib 2026** installer from the WPILib GitHub releases page. On
Windows the download is an `.iso`; mount it and run `WPILibInstaller.exe`.
Pick **Everything** unless you know what to skip. It installs to
`C:\Users\Public\wpilib\2026\`.

When it's done you have a shortcut to **WPILib VS Code 2026**. That's what
you'll use for the course — not your regular VSCode. Both can live on your
machine at once; they don't fight.

Sanity check:

```powershell
& "C:\Users\Public\wpilib\2026\jdk\bin\java.exe" -version
```

should print a version. If it doesn't, the install went sideways — re-run
the installer before continuing.

---

## 2. Install Git

WPILib doesn't bundle Git. Get it from **git-scm.com/download/win**, or:

```powershell
winget install --id Git.Git
```

Default options are fine. When it asks about line endings, pick **"Checkout
Windows-style, commit Unix-style"** — that's what team collaborations expect.

Configure your identity once so every commit records who made it:

```powershell
git config --global user.name  "Your Name"
git config --global user.email "you@example.com"
```

Use the same email you'll use on GitHub (next section). GitHub matches
commits to your account by email — different addresses means your commits
won't show up under your profile.

---

## 3. Create the robot project from the WPILib template

Open **WPILib VS Code 2026**. Press `Ctrl+Shift+P` for the command palette
and search for **WPILib: Create a new project**. In the wizard:

- **Project type:** Template → Java → **Command Robot** (the command-based
  Java template — not `TimedRobot` and not `Romi`).
- **Base folder:** somewhere sensible, e.g. `C:\workspace\`.
- **Project name:** e.g. `BasicRobotLessons`.
- **Team number:** yours (Team 5010 → `5010`).
- **Desktop support:** **Yes**. Without this, `./gradlew simulateJava` won't
  work and you can't do the course on your laptop.

Open the newly created folder in VSCode. Verify it builds:

```powershell
./gradlew build
```

The first build downloads dependencies and takes a few minutes. When it
finishes with `BUILD SUCCESSFUL`, you're ready for
[Lesson 0](00-orientation.md) — after we back it up to GitHub.

---

## 4. Make it a Git repo

From the project folder in PowerShell:

```powershell
git init
git branch -M main
```

The WPILib template already ships with a `.gitignore` that excludes `build/`,
`.gradle/`, VSCode cache files, and other things that shouldn't be tracked.
Trust it — don't hand-edit unless you have a specific reason.

See what Git sees:

```powershell
git status
```

Every file listed as *untracked* is code or config that should live in the
repo. Stage and commit:

```powershell
git add .
git commit -m "Initial commit from WPILib template"
```

That's your first snapshot. If your laptop caught fire right now, you could
recover the project from this commit — assuming it lives somewhere other than
this laptop. Which is section 5.

---

## 5. Get a GitHub account and install `gh`

Sign up at **github.com** with the same email you used in `git config` above.

The friction-free way to authenticate from the command line is **GitHub CLI**:

```powershell
winget install --id GitHub.cli
```

Close and re-open PowerShell so `gh` is on the PATH. Then:

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

## 6. Create the remote and push

From inside the project folder:

```powershell
gh repo create BasicRobotLessons --private --source=. --remote=origin --push
```

That one command creates a GitHub repo named `BasicRobotLessons`, marks your
local folder as its source, wires it up as the `origin` remote, and pushes
your first commit. When it finishes:

```powershell
gh repo view --web
```

opens the repo in your browser. You should see every file from your project.

Prefer to do it in two steps? Create the repo on github.com first (**+** menu
→ **New repository**, **Private**, do **not** add a README or `.gitignore` on
the web form since you already have them), then:

```powershell
git remote add origin https://github.com/<you>/BasicRobotLessons.git
git push -u origin main
```

The `-u` on that first push tells Git: "from now on, when I say `git push` on
this branch, this is where you send it."

---

## 7. The everyday loop

Once a day, or every time you finish a lesson, or every time something works
that didn't work before — snapshot it:

```powershell
git status                             # see what changed
git add .                              # stage everything
git commit -m "Finish Lesson 3 — telemetry"
git push                               # ship it to GitHub
```

Commit messages should say **what changed and why**, not "stuff" or "wip".
Future-you reading this list in a month will thank you.

If you (or a teammate) edit on GitHub directly — say, fixing a typo in
`README.md` through the web UI — pull those changes down before you do more
work:

```powershell
git pull
```

That's the whole daily rhythm: **pull → edit → add → commit → push**. If a
push complains about **merge conflicts**, someone (usually past-you)
edited the same lines in two places. Don't panic — Git marks the conflicting
lines with `<<<<<<<`, `=======`, and `>>>>>>>` inside the file. Open it,
decide which version wins, delete the markers, then `git add` and
`git commit` to finish the merge.

---

## Try it

1. **Prove the round trip.** Add a line to `README.md` (create one at the
   project root if the template didn't ship one), then `add` → `commit` →
   `push`. Open the repo on github.com and confirm your change is visible.
2. **Simulate the "laptop caught fire" recovery.** From a different folder:
   ```powershell
   git clone https://github.com/<you>/BasicRobotLessons.git test-clone
   cd test-clone
   ./gradlew build
   ```
   If that builds, your GitHub copy is a complete backup. If it fails, some
   source file didn't get committed — go find it.
3. **`.gitignore` sanity check.** Run `./gradlew build`, then `git status`.
   The `build/` and `.gradle/` folders Gradle just wrote should **not**
   appear. If they do, your `.gitignore` isn't doing its job — confirm the
   file exists at the project root and matches the WPILib template.

---

## What you learned

- **WPILib installer** delivers VSCode, JDK, extension, and sim tools in one
  bundle. Don't install those pieces separately or the versions will drift.
- **Git** tracks snapshots locally with `add` and `commit`. The `.gitignore`
  that ships with the WPILib template keeps build outputs out of history.
- **GitHub** is your remote backup: `git push` sends commits up, `git pull`
  brings them down.
- **GitHub CLI** (`gh auth login`) handles authentication once so `push` and
  `pull` never bug you again.
- The daily rhythm is **pull → edit → add → commit → push** — one loop that
  keeps your work safe, shareable, and recoverable.

---

**Ready to start?** Head to [Lesson 0 — Orientation](00-orientation.md).
