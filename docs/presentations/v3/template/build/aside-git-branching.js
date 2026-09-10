const path = require('path');
const K = require('../deck-kit');
const { NAVY, NAVY2, TEAL, ORANGE, WHITE, INK, MUTED, CARDBG, FONT_HEAD, FONT_BODY } = K;

function buildDeck() {
  const p = K.newDeck({ title: 'Branches — Working with Git' });

  K.addTitleSlide(p, {
    tag: 'WORKING WITH GIT',
    title: 'Branches',
    subtitle: 'One per lesson, merged into a main that always works',
    versionTag: 'WPILib 2027 Alpha  ·  Commands V3',
  });

  // ============================================================ SLIDE 2 — goal + concepts
  {
    const s = p.addSlide();
    s.background = { color: WHITE };
    K.addHeader(s, { icon: 'bullseye_white.png', eyebrow: 'The Goal', title: 'A place to be wrong that isn\'t main' });

    s.addShape('roundRect', {
      x: 0.7, y: 1.75, w: 11.9, h: 1.6, rectRadius: 0.1,
      fill: { color: CARDBG }, line: { type: 'none' },
    });
    s.addText(
      "Do each lesson on its own branch, merge it into main when it runs, and know exactly what to do the day two branches touch the same file.",
      {
        x: 1.05, y: 1.9, w: 11.2, h: 1.25,
        fontFace: FONT_HEAD, italic: true, fontSize: 22, color: INK, valign: 'middle', margin: 0,
        lineSpacingMultiple: 1.25,
      }
    );

    s.addText('NEW CONCEPTS', {
      x: 0.7, y: 3.6, w: 5, h: 0.4,
      fontFace: FONT_BODY, bold: true, fontSize: 20, color: ORANGE, charSpacing: 1, margin: 0,
    });
    s.addText(
      [
        { text: 'Branch — a movable label on a commit', options: { bullet: true, breakLine: true } },
        { text: 'git switch — creating and moving between branches', options: { bullet: true, breakLine: true } },
        { text: 'Fast-forward vs. a merge commit', options: { bullet: true, breakLine: true } },
        { text: 'Merge conflicts — the markers, and why "pick a side" is wrong', options: { bullet: true, breakLine: true } },
        { text: 'Pull requests on GitHub — a merge with a conversation attached', options: { bullet: true, breakLine: true } },
        { text: 'git rebase — replaying your commits onto a newer base', options: { bullet: true, breakLine: false } },
      ],
      {
        x: 0.75, y: 4.05, w: 11.2, h: 2.75,
        fontFace: FONT_BODY, fontSize: 20, color: INK, valign: 'top', margin: 0, paraSpaceAfter: 8, lineSpacingMultiple: 1.1,
      }
    );

    K.addFooter(s, { pageNum: 2, label: 'Branches' });
  }

  // ============================================================ SLIDE 3 — what a branch actually is
  {
    const s = p.addSlide();
    s.background = { color: WHITE };
    K.addHeader(s, { icon: 'sitemap_white.png', eyebrow: 'Section 1 · The mental model', title: 'A branch is a label, not a copy' });

    K.addCard(s, {
      x: 0.7, y: 1.75, w: 5.85, h: 4.65, bg: CARDBG,
      heading: 'Every commit points back at the one before it — your history is a chain.',
      headingSize: 22,
      body: 'A branch is a sticky note stuck to one commit in that chain. When you commit, Git slides the note forward to the new commit. Creating a branch is instant, no matter how big the project is, because nothing gets copied.',
    });

    K.addCard(s, {
      x: 6.75, y: 1.75, w: 5.85, h: 4.65, bg: NAVY,
      eyebrow: 'The wrong picture',
      eyebrowColor: ORANGE,
      heading: "It isn't a copy of the project sitting in its own folder.",
      headingColor: WHITE, headingSize: 22,
      body: "There's one folder, one set of files. Switching branches rewrites them to match whatever commit the label points at. Kept Robot_v2_FINAL_real.java next to Robot.java before? A branch replaces that habit.",
      bodyColor: 'CADCE8',
    });

    K.addFooter(s, { pageNum: 3, label: 'Branches' });
  }

  // ============================================================ SLIDE 4 — start a lesson on a branch
  {
    const s = p.addSlide();
    s.background = { color: WHITE };
    K.addHeader(s, { icon: 'codebranch_white.png', eyebrow: 'Section 2 · Start a lesson', title: 'One new branch, every lesson' });

    K.addCodeCard(s, {
      x: 0.7, y: 1.65, w: 11.9, h: 3.0, fontSize: 14,
      lines: [
        { text: 'git switch -c lesson-01', color: '9EF01A' },
        { text: "Switched to a new branch 'lesson-01'", color: '7FA8C9' },
        { text: '# do the lesson, commit as you go', color: '7FA8C9' },
        { text: 'git add .', color: 'D7E3F4' },
        { text: 'git commit -m "Lesson 1: spin a motor"', color: 'D7E3F4' },
        { text: 'git branch', color: '9EF01A' },
        { text: '* lesson-01', color: '7FA8C9' },
        { text: '  main', color: '7FA8C9' },
      ],
    });

    K.addCard(s, {
      x: 0.7, y: 4.8, w: 11.9, h: 2.1,
      heading: 'switch -c creates the branch and moves you onto it in one step.',
      headingSize: 21,
      body: 'Nothing changes yet — main and lesson-01 point at the same commit until you commit. The * in git branch\'s output marks the one you\'re standing on.',
      pad: 0.25,
    });

    K.addFooter(s, { pageNum: 4, label: 'Branches' });
  }

  // ============================================================ SLIDE 5 — merge it back
  {
    const s = p.addSlide();
    s.background = { color: WHITE };
    K.addHeader(s, { icon: 'compressarrowsalt_white.png', eyebrow: 'Section 3 · Merge it back', title: 'A lesson joins main once it runs' });

    K.addCodeCard(s, {
      x: 0.7, y: 1.6, w: 11.9, h: 2.9, fontSize: 15,
      lines: [
        { text: 'git switch main', color: 'D7E3F4' },
        { text: 'git merge lesson-01', color: '9EF01A' },
        { text: 'Fast-forward', color: '7FA8C9' },
        { text: ' Constants.java | 4 +++-', color: '7FA8C9' },
        { text: ' 1 file changed, 3 insertions(+), 1 deletion(-)', color: '7FA8C9' },
        { text: 'git branch -d lesson-01', color: '9EF01A' },
        { text: 'Deleted branch lesson-01 (was 79bf90a).', color: '7FA8C9' },
      ],
    });

    K.addCard(s, {
      x: 0.7, y: 4.7, w: 11.9, h: 1.9,
      body: 'main hadn\'t moved, so merging slides its label forward — no new commit needed. Deleting the branch only removes the label; Git refuses if it hasn\'t actually merged, so it\'s a free safety check.',
      pad: 0.3,
    });

    K.addFooter(s, { pageNum: 5, label: 'Branches' });
  }

  // ============================================================ SLIDE 6 — two lessons, same file: conflict
  {
    const s = p.addSlide();
    s.background = { color: WHITE };
    K.addHeader(s, { icon: 'exclamationtriangle_white.png', eyebrow: 'Section 4 · Same file, two branches', title: 'When Git refuses to guess' });

    s.addText(
      "Lesson 18 adds an elevator, Lesson 20 adds an arm — both add a constants block to Constants.java. Merge the first, then the second:",
      {
        x: 0.7, y: 1.55, w: 11.9, h: 0.85,
        fontFace: FONT_BODY, italic: true, fontSize: 21, color: MUTED, valign: 'top', margin: 0, lineSpacingMultiple: 1.2,
      }
    );

    K.addCodeCard(s, {
      x: 0.7, y: 2.5, w: 11.9, h: 2.1, fontSize: 15,
      lines: [
        { text: 'git merge lesson-20', color: '9EF01A' },
        { text: 'Auto-merging Constants.java', color: '7FA8C9' },
        { text: 'CONFLICT (content): Merge conflict in Constants.java', color: 'FF8B8B' },
        { text: 'Automatic merge failed; fix conflicts and then commit the result.', color: 'FF8B8B' },
      ],
    });

    K.addCard(s, {
      x: 0.7, y: 4.85, w: 11.9, h: 1.55,
      heading: "A conflict isn't an error — it's Git flagging two edits close enough together that it won't guess. Both edits are safe; it's holding them for you.",
      headingSize: 21, pad: 0.25,
    });

    K.addFooter(s, { pageNum: 6, label: 'Branches' });
  }

  // ============================================================ SLIDE 7 — resolve it: keep both
  {
    const s = p.addSlide();
    s.background = { color: WHITE };
    K.addHeader(s, { icon: 'checkcircle_white.png', eyebrow: 'Section 4 · Resolving it', title: 'The answer is almost never "pick a side"' });

    K.addCodeCard(s, {
      x: 0.7, y: 1.5, w: 11.9, h: 3.6, fontSize: 12,
      fileLabel: 'Open Constants.java — this is what Git wrote into it',
      example: true,
      lines: [
        { text: 'public final class Constants {', color: 'D7E3F4' },
        { text: '<<<<<<< HEAD', color: 'FF8B8B' },
        { text: '  public static class ElevatorConstants {', color: 'D7E3F4' },
        { text: '    public static final double kElevatorKG = 0.18;', color: 'D7E3F4' },
        { text: '=======', color: 'FF8B8B' },
        { text: '  public static class ArmConstants {', color: 'D7E3F4' },
        { text: '    public static final double kArmKG = 0.25;', color: 'D7E3F4' },
        { text: '>>>>>>> lesson-20', color: 'FF8B8B' },
        { text: '  }', color: 'D7E3F4' },
        { text: '}', color: 'D7E3F4' },
      ],
    });

    K.addCard(s, {
      x: 0.7, y: 5.25, w: 11.9, h: 1.75,
      body: 'You want the elevator and the arm — both belong in the robot. Edit until both blocks remain and the markers are gone. Most conflicts here are two additions landing close together — keep both, don\'t choose.',
      pad: 0.2,
    });

    K.addFooter(s, { pageNum: 7, label: 'Branches' });
  }

  // ============================================================ SLIDE 8 — GitHub + pull requests
  {
    const s = p.addSlide();
    s.background = { color: WHITE };
    K.addHeader(s, { icon: 'github_white.png', eyebrow: 'Section 5 · On GitHub', title: 'A pull request is a merge with a conversation' });

    K.addCodeCard(s, {
      x: 0.7, y: 1.75, w: 5.7, h: 1.35, fontSize: 16,
      lines: [{ text: 'git push -u origin lesson-20', color: '9EF01A' }],
    });
    s.addText('-u links your branch to GitHub, once — after that, plain push and pull know where to go.', {
      x: 0.7, y: 3.3, w: 5.7, h: 1.3,
      fontFace: FONT_BODY, italic: true, fontSize: 20, color: MUTED, valign: 'top', margin: 0, lineSpacingMultiple: 1.25,
    });

    K.addCard(s, {
      x: 6.75, y: 1.75, w: 5.85, h: 4.65,
      heading: 'GitHub offers to open a pull request: a description, a diff, a comment thread.',
      headingSize: 21,
      body: 'Merging the PR merges the branch on GitHub — your laptop doesn\'t know yet.\n\ngit switch main\ngit pull\n\nNow main matches GitHub, so your next branch starts from the current, agreed-on state.',
    });

    K.addFooter(s, { pageNum: 8, label: 'Branches' });
  }

  // ============================================================ SLIDE 9 — rebase
  {
    const s = p.addSlide();
    s.background = { color: NAVY };
    K.addSectionHeader(s, { icon: 'history_white.png', eyebrow: 'Section 6 · When merge isn\'t what you want', title: 'rebase replays your commits on a newer base' });

    K.addCodeCard(s, {
      x: 0.7, y: 1.75, w: 5.9, h: 2.5, fontSize: 13,
      lines: [
        { text: 'git switch lesson-21', color: 'D7E3F4' },
        { text: 'git rebase main', color: '9EF01A' },
        { text: 'Auto-merging Constants.java', color: '7FA8C9' },
        { text: 'CONFLICT (content): Merge conflict', color: 'FF8B8B' },
        { text: 'in Constants.java', color: 'FF8B8B' },
      ],
    });
    s.addShape('roundRect', {
      x: 6.85, y: 1.75, w: 5.75, h: 2.5, rectRadius: 0.12,
      fill: { color: NAVY2 }, line: { type: 'none' },
    });
    s.addText('THE ONE GENUINELY CONFUSING TWIST', {
      x: 7.15, y: 1.98, w: 5.15, h: 0.4,
      fontFace: FONT_BODY, bold: true, fontSize: 20, color: ORANGE, charSpacing: 0.3, margin: 0,
    });
    s.addText('HEAD is main here, not you — rebase already moved you onto main and replays your commit as the incoming side.', {
      x: 7.15, y: 2.5, w: 5.15, h: 1.65,
      fontFace: FONT_BODY, fontSize: 20, color: 'CADCE8', valign: 'top', margin: 0, lineSpacingMultiple: 1.25,
    });

    s.addShape('roundRect', {
      x: 0.7, y: 4.4, w: 11.9, h: 2.55, rectRadius: 0.12,
      fill: { color: NAVY2 }, line: { type: 'none' },
    });
    s.addText(
      'Resolve it the same way — edit, keep both, git add, then git rebase --continue. Notice the commit hash changes when it\'s done.',
      {
        x: 1.0, y: 4.6, w: 11.3, h: 0.9,
        fontFace: FONT_BODY, fontSize: 21, color: 'D7E3F4', valign: 'top', margin: 0, lineSpacingMultiple: 1.25,
      }
    );
    s.addText(
      'Never rebase commits you\'ve already pushed and someone else has pulled — the rewritten hashes leave anyone who has the old ones with a history that disagrees with yours.',
      {
        x: 1.0, y: 5.55, w: 11.3, h: 1.4,
        fontFace: FONT_HEAD, italic: true, fontSize: 21, color: ORANGE, valign: 'top', margin: 0, lineSpacingMultiple: 1.25,
      }
    );

    K.addFooter(s, { pageNum: 9, label: 'Branches', dark: true });
  }

  // ============================================================ SLIDE 10 — which do I use?
  {
    const s = p.addSlide();
    s.background = { color: WHITE };
    K.addHeader(s, { icon: 'lightbulb_white.png', eyebrow: 'Section 6 · So which do I use?', title: 'Rebase to update, merge to deliver' });

    K.addCard(s, {
      x: 0.7, y: 1.75, w: 5.85, h: 4.65, bg: CARDBG,
      eyebrow: 'rebase',
      heading: 'Update your own in-progress branch onto a newer main.',
      headingSize: 22,
      body: 'Safe because nobody else has your commits yet. It keeps your history a straight, readable line instead of a knot of bookkeeping merges.',
    });
    K.addCard(s, {
      x: 6.75, y: 1.75, w: 5.85, h: 4.65, bg: NAVY,
      eyebrow: 'merge',
      eyebrowColor: TEAL,
      heading: 'Deliver a finished branch into main.',
      headingColor: WHITE, headingSize: 22,
      body: 'Records the honest fact that two pieces of work happened independently and came together — exactly the diamond a merged conflict leaves behind.',
      bodyColor: 'CADCE8',
    });

    K.addFooter(s, { pageNum: 10, label: 'Branches' });
  }

  // ============================================================ SLIDE 11 — try it
  {
    const s = p.addSlide();
    s.background = { color: NAVY };
    K.addSectionHeader(s, { icon: 'clipboardcheck_white.png', eyebrow: 'Before you move on', title: 'Try it' });

    K.addTryItGrid(s, {
      y: 1.6, cols: 2,
      cards: [
        { title: 'Cause a conflict on purpose', body: 'Two branches off main change the same line. Merge the first, then the second — read the markers first.' },
        { title: 'Then abort one', body: 'Run git merge --abort at the conflict instead of resolving. Confirm nothing happened.' },
        { title: 'Rebase the same scenario', body: 'Set it up again, but rebase instead of merging. Compare the graph to what merging gave you.' },
        { title: 'Do a real lesson on a branch', body: 'switch -c, work, commit, merge, delete the branch. Push it and open a pull request first.' },
      ],
    });

    K.addFooter(s, { pageNum: 11, label: 'Branches', dark: true });
  }

  // ============================================================ SLIDE 12 — what you learned + next
  {
    const s = p.addSlide();
    s.background = { color: WHITE };
    K.addHeader(s, { icon: 'graduationcap_white.png', eyebrow: 'What you learned', title: 'A label, not a copy' });

    const points = [
      'A branch is a label on a commit — free to create, instant to switch.',
      'The loop: switch -c → work → commit → switch main → merge → branch -d.',
      'A conflict is Git refusing to guess, not Git breaking — read HEAD and the incoming side, and keep both when in doubt.',
    ];
    s.addText(
      points.map((t, i) => ({ text: t, options: { bullet: true, breakLine: i < points.length - 1, paraSpaceAfter: 12 } })),
      {
        x: 0.7, y: 1.75, w: 6.9, h: 3.9,
        fontFace: FONT_BODY, fontSize: 21, color: INK, valign: 'top', margin: 0, lineSpacingMultiple: 1.2,
      }
    );
    s.addText(
      'rebase replays commits onto a newer base; merge records that two lines of work joined. Rebase your own; merge what\'s shared.',
      {
        x: 0.7, y: 5.75, w: 6.9, h: 1.25,
        fontFace: FONT_HEAD, italic: true, fontSize: 20, color: MUTED, valign: 'top', margin: 0, lineSpacingMultiple: 1.25,
      }
    );

    s.addShape('roundRect', {
      x: 7.95, y: 1.75, w: 4.7, h: 4.85, rectRadius: 0.12,
      fill: { color: NAVY }, line: { type: 'none' },
    });
    s.addText('READY TO START', {
      x: 8.3, y: 2.1, w: 4.0, h: 0.4,
      fontFace: FONT_BODY, bold: true, fontSize: 20, color: TEAL, charSpacing: 1.2, margin: 0,
    });
    s.addText('Lesson 0', {
      x: 8.3, y: 2.55, w: 4.0, h: 0.55,
      fontFace: FONT_HEAD, bold: true, fontSize: 26, color: ORANGE, margin: 0,
    });
    s.addText('Orientation', {
      x: 8.3, y: 3.1, w: 4.0, h: 0.6,
      fontFace: FONT_HEAD, bold: true, fontSize: 22, color: WHITE, margin: 0,
    });
    s.addText('Run the robot and print a message.', {
      x: 8.3, y: 3.8, w: 4.0, h: 1.4,
      fontFace: FONT_BODY, italic: true, fontSize: 20, color: 'CADCE8', valign: 'top', margin: 0, lineSpacingMultiple: 1.3,
    });
    s.addShape('ellipse', { x: 8.3, y: 5.6, w: 0.55, h: 0.55, fill: { color: TEAL }, line: { type: 'none' } });
    s.addImage({ path: K.ICON('arrowright_white.png'), x: 8.43, y: 5.73, w: 0.29, h: 0.29 });

    K.addFooter(s, { pageNum: 12, label: 'Branches' });
  }

  return p;
}

const deck = buildDeck();
const outPath = path.join(__dirname, '..', '..', 'aside-git-branching.pptx');
deck.writeFile({ fileName: outPath }).then(() => {
  console.log('Wrote', outPath);
}).catch(e => { console.error(e); process.exit(1); });
