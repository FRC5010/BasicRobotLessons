# Aside — Branches: one per lesson, merged into a `main` that always works

**Goal:** Do each lesson on its own **branch**, merge it into `main` when it
runs, and know what to do on the day two branches touch the same file. By the
end you'll be able to read a history graph, resolve a conflict without guessing,
and say out loud why you'd reach for `rebase` instead of `merge`.

**New concepts**
- **Branch** — a movable label pointing at a commit, and what "switching" one
  actually does to your files
- **`git switch`** — creating a branch, moving between branches
- **Merging**, and the difference between a **fast-forward** and a **merge commit**
- **Merge conflicts** — the markers, and why "pick a side" is usually the wrong
  instinct
- **Pull requests** on GitHub — a merge with a conversation attached
- **`git rebase`** — replaying your commits onto a newer base, and the one rule
  you must not break

**When you can use this**
- Any time after [the setup aside](aside-setup.md), which is where `git`, `gh`,
  and your GitHub repo come from. If `git status` works and `git push` sends
  commits to github.com, you're ready.
- Nothing here depends on a particular lesson's *code*. The examples use
  `Constants.java` from Lessons 17–21 because that's the file most likely to be
  touched by two lessons at once, but the mechanics are the same on any file.
- **Works unchanged on [the OpMode track](v3/README.md), too.** Nothing on
  this page is WPILib-version-specific — Git doesn't know or care what
  framework your code targets. If you're on that track, use
  [its own setup aside](v3/aside-setup.md) to get `git`/`gh` in place instead
  of the link above, then come back here.

The setup aside taught you a straight line: pull, edit, add, commit, push, over
and over, all on `main`. That works. It also means every half-finished
experiment lands in the same place as your working code, and "let me try
something" and "this is the version that drives" become impossible to tell
apart. Branches fix that, and they cost about fifteen seconds per lesson.

---

## 1. What a branch actually is

Here's the mental model that makes everything else make sense, and it's smaller
than you'd expect.

Every commit you make points back at the one before it, so your history is a
chain. A **branch is just a label stuck to one commit in that chain** — a sticky
note reading `main` on the newest one. When you commit, Git makes the new commit
and then *slides the label forward* to it. That's the entire mechanism.

So creating a branch is not copying your project. It's putting a second sticky
note on the commit you're standing on. It's instant no matter how big the repo
is, because nothing gets copied.

What *does* change when you switch branches is your working folder: Git rewrites
the files on disk to match whatever commit the new label points at. Your editor
will notice. That's the part that feels like magic and isn't — the files for
every commit are already in `.git`, and switching just unpacks a different one.

> The wrong picture, which almost everyone starts with, is that a branch is a
> copy of the project living in a folder somewhere. It isn't. There's one folder,
> one set of files, and Git swaps their contents under you. If you've ever kept
> `Robot_v2_FINAL_real.java` next to `Robot.java`, branches are the tool you
> were reaching for.

---

## 2. Start a lesson on a branch

You're on `main`, everything builds, and you're about to start Lesson 1.

**Run, from your project folder:**

```powershell
git switch -c lesson-01
```

*Nothing to add — Git's reply:*

```
Switched to a new branch 'lesson-01'
```

`switch` moves you to a branch; `-c` means "create it first." You're now
standing on a new label pointing at exactly the commit `main` points at. Nothing
about your files changed, because nothing has diverged yet.

> `git switch` arrived in Git 2.23 (2019). Older tutorials use
> `git checkout -b lesson-01`, which does the same thing here. `checkout` also
> does four other unrelated jobs, which is precisely why `switch` was added —
> prefer it.

Now do the lesson. Commit as often as you like; on a branch there's no reason to
be shy about it, because none of it is touching `main` yet.

**Run, as you work:**

```powershell
git add .
git commit -m "Lesson 1: spin a motor with a button"
```

**To see where you are:**

```powershell
git branch
```

*Nothing to add — Git's reply:*

```
* lesson-01
  main
```

The `*` is you.

> Commit before you switch. Git will let you carry uncommitted changes across a
> switch when the files don't collide, and refuse when they do — both of which
> are more confusing than just committing first. If you're mid-thought and don't
> want a real commit yet, commit anyway with a message like `wip: steering
> doesn't converge`; you can tidy the history later, and on a lesson branch
> nobody's watching.

---

## 3. Merge it back when it runs

The rule for this course: **a lesson goes into `main` when it builds and you've
seen it work** — in sim, on a plot, or on the robot. Not when you've typed the
last code block. That rule is the whole reason `main` stays trustworthy.

**Run:**

```powershell
git switch main
git merge lesson-01
```

*Nothing to add — what you'll see:*

```
Switched to branch 'main'
Updating 3cf14a0..79bf90a
Fast-forward
 Constants.java | 4 +++-
 1 file changed, 3 insertions(+), 1 deletion(-)
```

**Fast-forward** is Git telling you it didn't have to do any thinking. `main`
hadn't moved since you branched, so merging is just sliding the `main` label up
the chain to where `lesson-01` already was. No new commit, no merging of
anything.

**Then look at the history:**

```powershell
git log --oneline --graph
```

*Nothing to add — Git's reply:*

```
* 79bf90a Lesson 1: spin a motor with a button
* 3cf14a0 Project from template
```

Straight line. Exactly as if you'd never branched — which is the point: the
branch was scaffolding, and once the work is merged the scaffolding comes down.

**Delete the branch:**

```powershell
git branch -d lesson-01
```

*Nothing to add — what you'll see:*

```
Deleted branch lesson-01 (was 79bf90a).
```

That deletes the *label*, not the commits — they're in `main` now. The lowercase
`-d` refuses to delete a branch whose work hasn't been merged anywhere, which
makes it a free safety check. (`-D` overrides that. Don't reach for it out of
habit; reach for it when you genuinely mean "throw this experiment away.")

**Then start the next lesson the same way:**

```powershell
git switch -c lesson-02
```

That's the loop: `switch -c` → work → commit → `switch main` → `merge` →
`branch -d`. Four commands you'll run enough times to stop thinking about.

---

## 4. Two lessons at once, and the same file

Here's where branches earn their keep, and it's a situation this course produces
naturally: [Lesson 18](18-elevator.md) adds an elevator, [Lesson 20](20-intake-arm.md)
adds an arm, and if two people on your team split them up, both add a constants
block to `Constants.java`. (Same pairing, same file, same two constants on
[the OpMode track](v3/README.md): [Lesson 18](v3/18-elevator.md) and
[Lesson 20](v3/20-intake-arm.md) add `ElevatorConstants.kElevatorKG = 0.18`
and `ArmConstants.kArmKG = 0.25` there too — the walkthrough below reads
exactly the same either way.)

Say both branched from `main` after Lesson 17. Merge the first one:

**Run:**

```powershell
git switch main
git merge lesson-18
```

*Nothing to add — Git's reply:*

```
Updating 6af60ff..d79e9ea
Fast-forward
 Constants.java | 3 +++
 1 file changed, 3 insertions(+)
```

Fast-forward again — `main` hadn't moved. Now merge the second:

**Run:**

```powershell
git merge lesson-20
```

*Nothing to add — Git's reply:*

```
Auto-merging Constants.java
CONFLICT (content): Merge conflict in Constants.java
Automatic merge failed; fix conflicts and then commit the result.
```

Don't panic, and specifically don't undo anything yet. A conflict is not an
error — it's Git telling you it found two edits close enough together that it
refuses to guess. Both edits are safe; it's holding them for you.

**Check what's actually conflicted:**

```powershell
git status --short
```

*Nothing to add — Git's reply:*

```
UU Constants.java
```

`UU` means "unmerged, both sides modified." Only files listed here need your
attention.

**Open `Constants.java` and you'll find this:**

*Nothing to add — this is what Git wrote into your file:*

```java
public final class Constants {
<<<<<<< HEAD
  public static class ElevatorConstants {
    public static final double kElevatorKG = 0.18;
=======
  public static class ArmConstants {
    public static final double kArmKG = 0.25;
>>>>>>> lesson-20
  }
}
```

Read that carefully, because the shape of it is the lesson. Between `<<<<<<<`
and `=======` is what's on the branch you're standing on — `HEAD`, which is
`main`. Between `=======` and `>>>>>>>` is what's coming in, labelled with where
it came from. Everything outside the markers, including that closing `}`,
matched on both sides and isn't in dispute.

**And now the important part: the answer is not to pick a side.** You want the
elevator *and* the arm. Both constants belong in the finished robot; Git flagged
them only because they landed on adjacent lines. Choosing one would silently
delete a lesson's worth of work, and nothing would tell you — it'd compile fine
and you'd find out when the arm didn't move.

> The instinct "a conflict means two versions and I have to choose" is the single
> most expensive misconception about Git. Most real conflicts in this course are
> two *additions* that arrived near each other, and the resolution is to keep
> both, in whatever order reads better.

**Edit the file until it says what you want, markers and all removed:**

```java
public final class Constants {
  public static class ElevatorConstants {
    public static final double kElevatorKG = 0.18;
  }

  public static class ArmConstants {
    public static final double kArmKG = 0.25;
  }
}
```

**Then tell Git you've resolved it, and finish the merge:**

```powershell
git add Constants.java
git commit
```

`git add` on a conflicted file means "I've dealt with this one" — that's the
whole signal. `git commit` with no `-m` opens an editor pre-filled with
`Merge branch 'lesson-20'`; save and close it.

**Now look at the graph:**

```powershell
git log --oneline --graph
```

*Nothing to add — what you'll see:*

```
*   50c8826 Merge branch 'lesson-20'
|\
| * cd93da0 Lesson 20: intake arm
* | d79e9ea Lesson 18: scoring elevator
|/
* 6af60ff Lesson 17 complete
```

That diamond is history telling the truth: two lines of work happened
independently and came back together. When something breaks next week, that
picture is what lets you say "the arm and the elevator were developed in
parallel and joined here" instead of guessing.

**Before you move on, build it.** A resolved conflict is a file a human edited
by hand while stressed. Compiling is the cheapest possible check that you
didn't leave a stray `=======` in the middle of a class.

**Run:**

```powershell
./gradlew build
```

> Escape hatch worth knowing before you need it: `git merge --abort` puts
> everything back exactly as it was before the merge started, conflict and all
> undone. If you open a conflict and realize you don't understand what you're
> looking at, aborting and asking someone is a completely legitimate move.

---

## 5. Branches on GitHub, and pull requests

Everything so far was local. Pushing a branch is one flag different from what
[the setup aside](aside-setup.md) taught you.

**Run, from your lesson branch:**

```powershell
git push -u origin lesson-20
```

`-u` ("set upstream") links your local branch to the one on GitHub, so from then
on plain `git push` and `git pull` know where to go. You only need it the first
time you push a given branch.

On github.com you'll now see a banner offering to open a **pull request** — a
request to merge this branch into `main`, with a description, a diff anyone can
read, and a comment thread. If you're working alone it's a slightly formal way
to merge. On a team it's the moment someone else reads your code before it lands
in the branch everyone builds from, and that's worth the ceremony.

Merging the pull request on GitHub merges the branch on GitHub. Your laptop
doesn't know yet.

**After a pull request merges, run:**

```powershell
git switch main
git pull
```

Now your `main` matches GitHub's, and the next `git switch -c lesson-21` starts
from the real, current, everybody-agrees-on-it state of the project. Skipping
this is how people end up branching off a two-week-old `main` and then wondering
why they have conflicts with work they already merged.

---

## 6. When `merge` isn't what you want: `rebase`

Here's the situation. You branched `lesson-21` off `main`, and while you were
working, a teammate merged Lesson 17 into `main`. Your branch is now built on a
base that's out of date. You want the current `main` underneath your work before
you merge — partly so you can test against it, partly so the merge is boring.

`git merge main` into your branch would do it, and it works. But it drops a
merge commit into the middle of your lesson branch, and the history of a
one-lesson branch fills up with bookkeeping about a branch you weren't even
working on.

**`git rebase` does it the other way round: it takes your commits, sets them
aside, moves your branch's starting point up to the tip of `main`, and replays
your commits on top.** Same end result in the files; a straight line in the
history instead of a knot.

**Run, from your lesson branch:**

```powershell
git switch lesson-21
git rebase main
```

If both branches touched the same lines, replaying hits the same wall a merge
would:

*Nothing to add — what Git prints when a rebase hits a conflict:*

```
Rebasing (1/1)Auto-merging Constants.java
CONFLICT (content): Merge conflict in Constants.java
error: could not apply 5adaa87... Lesson 21 complete
hint: Resolve all conflicts manually, mark them as resolved with
hint: "git add/rm <conflicted_files>", then run "git rebase --continue".
hint: You can instead skip this commit: run "git rebase --skip".
hint: To abort and get back to the state before "git rebase", run "git rebase --abort".
```

The markers look identical to §4's, with one genuinely confusing twist:

*Nothing to add — this is what a rebase conflict looks like in the file:*

```java
public final class Constants {
  public static class DriveConstants {
    public static final int kFrontLeftDriveId = 1;
<<<<<<< HEAD
    public static final double kTranslationP = 1.0;
=======
    public static final double kHomingVolts = -1.0;
>>>>>>> 5adaa87 (Lesson 21 complete)
  }
}
```

**`HEAD` is `main` here, not you.** That's backwards from a merge, and it trips
up experienced people. It follows from what rebase is doing: it has already
moved you onto `main`, and it's replaying *your* commit as the incoming change.
The bottom half — the half labelled with your commit message — is your work.
Read the labels, not the positions.

The resolution is the same as any other: edit the file so it says what you want,
which here is again both lines. Then:

**Run:**

```powershell
git add Constants.java
git rebase --continue
```

*Nothing to add — Git's reply:*

```
[detached HEAD c7a003a] Lesson 21 complete
Successfully rebased and updated refs/heads/lesson-21.
```

**And the history:**

```powershell
git log --oneline --graph
```

*Nothing to add — what you'll see:*

```
* c7a003a Lesson 21 complete
* 5a9421b Lesson 17 complete
* 15f7610 Lesson 7 complete
```

Straight line. Your lesson now sits cleanly on top of your teammate's, as though
you'd waited and started after them.

Notice the commit hash changed — it was `5adaa87` before the rebase and
`c7a003a` after. That's not cosmetic, and it leads directly to the one rule:

> **Never rebase commits you've already pushed and someone else has pulled.**
> Rebasing rewrites commits, giving them new hashes. Anyone who has the old ones
> now has history that disagrees with yours, and untangling that is a genuinely
> bad afternoon. Rebase your own branch before anyone else has it; merge once
> it's shared.
>
> `git rebase --abort` gets you back to before you started, at any point during
> a rebase, as long as you haven't finished it. Use it freely.

### So which do I use?

Short version: **rebase to update your branch, merge to deliver it.**

Rebasing your own in-progress lesson branch onto a newer `main` keeps your
history readable and is entirely safe, because nobody else has those commits.
Merging your finished branch into `main` records the honest fact that two pieces
of work happened and came together — which is exactly what §4's diamond was
showing you, and worth keeping.

If your team has a strong opinion about this, follow it. Teams argue about this
one endlessly, and both camps ship working robots.

---

## Try it

The point of these is to hit a conflict on purpose, somewhere the stakes are
zero, so that the first one you meet for real isn't your first one.

1. **Cause a conflict deliberately.** Make two branches off `main` that both
   change the *same line* of `Constants.java` to different values. Merge the
   first, then the second. Read the markers before you resolve anything and say
   out loud which half is yours. Resolve it, build, commit.
2. **Then abort one.** Do it again, and this time run `git merge --abort` at the
   conflict instead of resolving. Confirm with `git status` and
   `git log --oneline --graph` that nothing happened at all. Knowing this
   command exists is the difference between "conflicts are scary" and "conflicts
   are a chore."
3. **Rebase the same scenario.** Set it up a third time, but from the second
   branch run `git rebase main` instead of merging. Compare the graph with what
   you got in #1. Same files, different story about how they got there — decide
   which story you'd rather read in a month.
4. **Do the next lesson on a branch, properly.** `switch -c`, work, commit,
   build, `switch main`, `merge`, `branch -d`. Push the branch to GitHub before
   you merge and open a pull request against your own repo, just to see what the
   diff looks like from the outside. Reading your own work as a diff catches a
   surprising amount.

---

## What you learned

A branch turned out to be a much smaller idea than its reputation: a label on a
commit, which Git slides forward as you work and which costs nothing to create.
That's what makes "one branch per lesson" reasonable rather than fussy — you get
a `main` that always builds, and a place to be wrong that isn't it.

The loop is `switch -c` → work → commit → build → `switch main` → `merge` →
`branch -d`, and most of the time `merge` will just say **Fast-forward** and do
no thinking at all. When it does have to think, you get a **conflict**, which is
Git refusing to guess rather than Git breaking. The markers show you `HEAD` on
top and the incoming change below — and the thing most worth carrying out of
this page is that the answer is usually **keep both**, because two lessons adding
two blocks to `Constants.java` aren't actually in disagreement about anything.

**`rebase`** replays your commits onto a newer base and gives you a straight
history instead of a diamond, at the cost of rewriting commits — which is why it
belongs on branches only you have, and why `merge` is what you use once the work
is shared. If the `HEAD`-is-the-other-side reversal during a rebase conflict
still feels backwards, that's fine; read the labels rather than the positions and
you'll get it right anyway.

And keep `git merge --abort` and `git rebase --abort` somewhere near the front
of your mind. Almost nothing in Git is unrecoverable, and knowing that is what
lets you stop treating it carefully and start using it.
