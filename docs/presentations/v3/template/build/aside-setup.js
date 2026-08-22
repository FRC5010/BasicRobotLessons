const path = require('path');
const K = require('../deck-kit');
const { NAVY, NAVY2, TEAL, ORANGE, WHITE, INK, MUTED, CARDBG, FONT_HEAD, FONT_BODY, FONT_CODE } = K;

function buildDeck() {
  const p = K.newDeck({ title: 'Setup — Getting Started' });

  K.addTitleSlide(p, {
    tag: 'GETTING STARTED',
    title: 'Setup',
    subtitle: 'From a bare machine to your own robot project on GitHub',
    versionTag: 'WPILib 2027 Alpha  ·  Commands V3',
  });

  // ============================================================ SLIDE 2 — goal + concepts
  {
    const s = p.addSlide();
    s.background = { color: WHITE };
    K.addHeader(s, { icon: 'bullseye_white.png', eyebrow: 'The Goal', title: 'One-time setup, then you never think about it again' });

    s.addShape('roundRect', {
      x: 0.7, y: 1.75, w: 11.9, h: 1.6, rectRadius: 0.1,
      fill: { color: CARDBG }, line: { type: 'none' },
    });
    s.addText(
      "Get Git, a Java 25 toolchain, your own robot project, and GitHub all working together — once, before Lesson 0.",
      {
        x: 1.05, y: 1.9, w: 11.2, h: 1.25,
        fontFace: FONT_HEAD, italic: true, fontSize: 22, color: INK, valign: 'middle', margin: 0,
        lineSpacingMultiple: 1.25,
      }
    );

    const colY = 3.6;
    s.addShape('ellipse', { x: 0.7, y: colY, w: 0.5, h: 0.5, fill: { color: TEAL }, line: { type: 'none' } });
    s.addImage({ path: K.ICON('terminal_white.png'), x: 0.82, y: colY + 0.12, w: 0.26, h: 0.26 });
    s.addText('TOOLS YOU\'LL INSTALL', {
      x: 1.35, y: colY + 0.03, w: 5, h: 0.4,
      fontFace: FONT_BODY, bold: true, fontSize: 20, color: INK, charSpacing: 0.5, margin: 0,
    });
    s.addText(
      [
        { text: 'Git — tracks snapshots of your project', options: { bullet: true, breakLine: true } },
        { text: 'A JDK 25 — the Java toolchain this course builds against', options: { bullet: true, breakLine: true } },
        { text: 'GitHub CLI (gh) — the friction-free way to log in', options: { bullet: true, breakLine: false } },
      ],
      {
        x: 0.75, y: colY + 0.62, w: 5.75, h: 2.7,
        fontFace: FONT_BODY, fontSize: 20, color: INK, valign: 'top', margin: 0, paraSpaceAfter: 10, lineSpacingMultiple: 1.15,
      }
    );

    s.addShape('ellipse', { x: 6.9, y: colY, w: 0.5, h: 0.5, fill: { color: ORANGE }, line: { type: 'none' } });
    s.addImage({ path: K.ICON('github_white.png'), x: 7.02, y: colY + 0.12, w: 0.26, h: 0.26 });
    s.addText("WHAT YOU'LL WALK AWAY WITH", {
      x: 7.55, y: colY + 0.03, w: 5, h: 0.4,
      fontFace: FONT_BODY, bold: true, fontSize: 20, color: INK, charSpacing: 0.5, margin: 0,
    });
    s.addText(
      [
        { text: 'A robot project that builds and runs in simulation', options: { bullet: true, breakLine: true } },
        { text: 'That project backed up on GitHub, under your account', options: { bullet: true, breakLine: true } },
        { text: 'The daily rhythm: pull → edit → add → commit → push', options: { bullet: true, breakLine: false } },
      ],
      {
        x: 6.95, y: colY + 0.62, w: 5.75, h: 2.7,
        fontFace: FONT_BODY, fontSize: 20, color: INK, valign: 'top', margin: 0, paraSpaceAfter: 10, lineSpacingMultiple: 1.15,
      }
    );

    K.addFooter(s, { pageNum: 2, label: 'Setup' });
  }

  // ============================================================ SLIDE 3 — install WPILib's tools (VS Code)
  {
    const s = p.addSlide();
    s.background = { color: WHITE };
    K.addHeader(s, { icon: 'code_white.png', eyebrow: "Section 1 · Install WPILib's Tools", title: 'One installer sets up VS Code and everything else' });

    K.addNumberedSteps(s, {
      startY: 1.75, rowH: 1.0,
      steps: [
        { title: 'Get the installer for this season', detail: 'wpilibsuite/allwpilib releases → v2027.0.0-alpha-6 for your OS.' },
        { title: 'Run it, and choose "Everything"', detail: 'Not "Tools Only" — this pulls in VS Code, the JDK, and Gradle too.' },
        { title: 'Pick "Download for this computer only"', detail: "VS Code isn't bundled — licensing — so the installer fetches it." },
        { title: 'Finish, then launch WPILib VS Code', detail: 'A separate copy for this year, not any VS Code already installed.' },
        { title: 'Look for the WPILib icon in the sidebar', detail: "That confirms the extension installed — you'll use it all course." },
      ],
    });

    K.addFooter(s, { pageNum: 3, label: 'Setup' });
  }

  // ============================================================ SLIDE 4 — install Git
  {
    const s = p.addSlide();
    s.background = { color: WHITE };
    K.addHeader(s, { icon: 'download_white.png', eyebrow: 'Section 2 · Install Git', title: 'Get Git, and tell it who you are' });

    K.addCodeCard(s, {
      x: 0.7, y: 1.75, w: 11.9, h: 1.15, fontSize: 20,
      lines: [{ text: 'winget install --id Git.Git', color: '7FD1D9' }],
    });

    K.addCodeCard(s, {
      x: 0.7, y: 3.2, w: 11.9, h: 1.75, fontSize: 20,
      lines: [
        { text: 'git config --global user.name  "Your Name"', color: 'D7E3F4' },
        { text: 'git config --global user.email "you@example.com"', color: 'D7E3F4' },
      ],
    });

    K.addCard(s, {
      x: 0.7, y: 5.2, w: 11.9, h: 1.2,
      heading: 'Use the same email you\'ll sign up for GitHub with — that\'s how GitHub matches a commit to your account.',
      headingSize: 21, pad: 0.25,
    });

    K.addFooter(s, { pageNum: 4, label: 'Setup' });
  }

  // ============================================================ SLIDE 5 — get a JDK
  {
    const s = p.addSlide();
    s.background = { color: WHITE };
    K.addHeader(s, { icon: 'coffee_white.png', eyebrow: 'Section 3 · Confirm your JDK', title: 'This course builds against Java 25' });

    K.addCodeCard(s, {
      x: 0.7, y: 1.75, w: 5.7, h: 1.35, fontSize: 20,
      lines: [{ text: 'java -version', color: '7FD1D9' }],
    });
    s.addText('Look for 25 somewhere in what it prints.', {
      x: 0.7, y: 3.3, w: 5.7, h: 0.9,
      fontFace: FONT_BODY, italic: true, fontSize: 20, color: MUTED, valign: 'top', margin: 0, lineSpacingMultiple: 1.25,
    });

    K.addCard(s, {
      x: 6.75, y: 1.75, w: 5.85, h: 4.65,
      eyebrow: 'Pointing Gradle at it',
      heading: "This alpha's installer already gave you one.",
      headingSize: 22,
      body: "Section 1's installer bundles JDK 25 — no need to install your own. A different JDK on PATH (say, Java 17 from the classic track) just means pointing Gradle at this one with JAVA_HOME or ORG_GRADLE_JAVA_HOME.",
    });

    K.addFooter(s, { pageNum: 5, label: 'Setup' });
  }

  // ============================================================ SLIDE 6 — get your starting project
  {
    const s = p.addSlide();
    s.background = { color: WHITE };
    K.addHeader(s, { icon: 'folderopen_white.png', eyebrow: 'Section 4 · Your starting project', title: 'Pull your project from the course repo' });

    K.addCodeCard(s, {
      x: 0.7, y: 1.7, w: 11.9, h: 2.15, fontSize: 18,
      lines: [
        { text: 'git clone https://github.com/FRC5010/BasicRobotLessons.git', color: 'D7E3F4' },
        { text: 'cd BasicRobotLessons', color: 'D7E3F4' },
        { text: './tools/verify-lessons-v3.sh -1 --sandbox ~/dev/MyOpModeRobot', color: '9EF01A' },
      ],
    });

    s.addShape('roundRect', {
      x: 0.7, y: 4.1, w: 5.85, h: 2.3, rectRadius: 0.1,
      fill: { color: CARDBG }, line: { type: 'none' },
    });
    s.addText('--sandbox names where your project lands. -1 means "just the starting template, no lessons applied yet."', {
      x: 1.0, y: 4.35, w: 5.35, h: 1.9,
      fontFace: FONT_BODY, fontSize: 20, color: INK, valign: 'top', margin: 0, lineSpacingMultiple: 1.25,
    });

    s.addShape('roundRect', {
      x: 6.75, y: 4.1, w: 5.85, h: 2.5, rectRadius: 0.1,
      fill: { color: ORANGE }, line: { type: 'none' },
    });
    s.addText('RUN THIS ONE IN GIT BASH, NOT POWERSHELL', {
      x: 7.05, y: 4.3, w: 5.25, h: 0.8,
      fontFace: FONT_BODY, bold: true, fontSize: 20, color: WHITE, charSpacing: 0.3, margin: 0, valign: 'top', lineSpacingMultiple: 1.15,
    });
    s.addText('The script needs bash, curl, and python3. Git Bash — installed alongside Git — is in your Start menu.', {
      x: 7.05, y: 5.15, w: 5.25, h: 1.35,
      fontFace: FONT_BODY, fontSize: 20, color: WHITE, valign: 'top', margin: 0, lineSpacingMultiple: 1.2,
    });

    K.addFooter(s, { pageNum: 6, label: 'Setup' });
  }

  // ============================================================ SLIDE 7 — two folders + verify it builds
  {
    const s = p.addSlide();
    s.background = { color: WHITE };
    K.addHeader(s, { icon: 'sitemap_white.png', eyebrow: 'Section 4 · Two folders now exist', title: "Don't confuse them" });

    K.addCard(s, {
      x: 0.7, y: 1.75, w: 5.85, h: 4.65, bg: CARDBG,
      eyebrow: 'BasicRobotLessons',
      heading: 'The course repo you cloned.',
      headingSize: 22,
      body: 'Its own history, not yours. Come back to it when a lesson is unclear — but you never commit your own work into it.',
    });
    K.addCard(s, {
      x: 6.75, y: 1.75, w: 5.85, h: 4.65, bg: NAVY,
      eyebrow: '~/dev/MyOpModeRobot',
      eyebrowColor: TEAL,
      heading: 'Your project.',
      headingColor: WHITE,
      headingSize: 22,
      body: 'A clean, ordinary, git-less folder — .git, build, and .gradle were stripped on the way out. This is what every lesson from here on is talking about.',
      bodyColor: 'CADCE8',
    });

    K.addFooter(s, { pageNum: 7, label: 'Setup' });
  }

  // ============================================================ SLIDE 8 — verify it builds + make it a repo
  {
    const s = p.addSlide();
    s.background = { color: WHITE };
    K.addHeader(s, { icon: 'checkcircle_white.png', eyebrow: 'Section 5 · Make it your own repo', title: 'Build it, then start tracking it' });

    K.addCodeCard(s, {
      x: 0.7, y: 1.7, w: 5.7, h: 2.05, fontSize: 17,
      lines: [
        { text: 'cd ~/dev/MyOpModeRobot', color: 'D7E3F4' },
        { text: './gradlew build', color: '9EF01A' },
        { text: './gradlew simulateJava', color: '9EF01A' },
      ],
    });
    K.addCodeCard(s, {
      x: 0.7, y: 3.95, w: 5.7, h: 2.45, fontSize: 17,
      lines: [
        { text: 'git init', color: 'D7E3F4' },
        { text: 'git branch -M main', color: 'D7E3F4' },
        { text: 'git add .', color: 'D7E3F4' },
        { text: 'git commit -m "Initial commit"', color: '9EF01A' },
      ],
    });

    K.addCard(s, {
      x: 6.75, y: 1.75, w: 5.85, h: 4.65,
      heading: 'The template already ships a .gitignore that excludes build/ and .gradle/ — trust it.',
      headingSize: 21,
      body: 'Confirm with git status that every untracked file belongs in the repo. That first commit is your recovery point — if your laptop died right now, you could rebuild from it, as long as it lives on GitHub too.',
    });

    K.addFooter(s, { pageNum: 8, label: 'Setup' });
  }

  // ============================================================ SLIDE 9 — GitHub + gh
  {
    const s = p.addSlide();
    s.background = { color: WHITE };
    K.addHeader(s, { icon: 'key_white.png', eyebrow: 'Section 6 · GitHub', title: 'An account, and a login that never nags you' });

    K.addCodeCard(s, {
      x: 0.7, y: 1.75, w: 5.7, h: 1.35, fontSize: 18,
      lines: [{ text: 'winget install --id GitHub.cli', color: '7FD1D9' }],
    });
    s.addText('Sign up at github.com with the same email as before.', {
      x: 0.7, y: 3.3, w: 5.7, h: 0.9,
      fontFace: FONT_BODY, italic: true, fontSize: 20, color: MUTED, valign: 'top', margin: 0, lineSpacingMultiple: 1.25,
    });

    K.addCard(s, {
      x: 6.75, y: 1.75, w: 5.85, h: 4.65, bg: NAVY,
      eyebrow: 'gh auth login',
      eyebrowColor: TEAL,
      heading: 'GitHub.com → HTTPS → authenticate Git with your GitHub credentials → log in with a web browser.',
      headingColor: WHITE, headingSize: 21,
      body: 'It gives you a one-time code, opens your browser, you paste the code — done. From now on, git push and git pull just work, no password prompt, ever.',
      bodyColor: 'CADCE8',
    });

    K.addFooter(s, { pageNum: 9, label: 'Setup' });
  }

  // ============================================================ SLIDE 10 — create the remote & push
  {
    const s = p.addSlide();
    s.background = { color: WHITE };
    K.addHeader(s, { icon: 'clouduploadalt_white.png', eyebrow: 'Section 7 · Push it', title: 'One command makes the remote and sends your code' });

    K.addCodeCard(s, {
      x: 0.7, y: 1.75, w: 11.9, h: 1.35, fontSize: 16,
      lines: [{ text: 'gh repo create MyOpModeRobot --private --source=. --remote=origin --push', color: '9EF01A' }],
    });

    K.addCard(s, {
      x: 0.7, y: 3.35, w: 11.9, h: 3.05,
      heading: 'That one line creates a private GitHub repo, wires it up as origin, and pushes your first commit.',
      headingSize: 22,
      body: 'Check it landed right: gh repo view --web opens the repo in your browser. You should see every file from your project — and nothing from BasicRobotLessons. If the whole course shows up instead, you ran it from the wrong folder.',
    });

    K.addFooter(s, { pageNum: 10, label: 'Setup' });
  }

  // ============================================================ SLIDE 11 — the everyday loop
  {
    const s = p.addSlide();
    s.background = { color: NAVY };
    K.addSectionHeader(s, { icon: 'syncalt_white.png', eyebrow: 'Section 8 · The everyday loop', title: 'The one cycle you\'ll run constantly' });

    K.addCodeCard(s, {
      x: 0.7, y: 1.75, w: 6.7, h: 3.1, fontSize: 18,
      lines: [
        { text: 'git status', color: '7FA8C9' },
        { text: 'git add .', color: 'D7E3F4' },
        { text: 'git commit -m "Finish Lesson 3"', color: 'D7E3F4' },
        { text: 'git push', color: '9EF01A' },
        { text: '', color: 'D7E3F4' },
        { text: 'git pull', color: '9EF01A' },
      ],
    });

    s.addShape('roundRect', {
      x: 7.6, y: 1.75, w: 5.0, h: 3.1, rectRadius: 0.12,
      fill: { color: NAVY2 }, line: { type: 'none' },
    });
    s.addText('PULL → EDIT → ADD → COMMIT → PUSH', {
      x: 7.9, y: 2.0, w: 4.4, h: 1.0,
      fontFace: FONT_HEAD, bold: true, fontSize: 22, color: ORANGE, valign: 'top', margin: 0, lineSpacingMultiple: 1.15,
    });
    s.addText('Do it once a day, or every time something works that didn\'t before. Write commit messages that say what changed and why.', {
      x: 7.9, y: 3.1, w: 4.4, h: 1.65,
      fontFace: FONT_BODY, fontSize: 20, color: 'CADCE8', valign: 'top', margin: 0, lineSpacingMultiple: 1.25,
    });

    s.addShape('roundRect', {
      x: 0.7, y: 5.15, w: 11.9, h: 1.5, rectRadius: 0.12,
      fill: { color: NAVY2 }, line: { type: 'none' },
    });
    s.addText(
      'A push that reports a merge conflict isn\'t an error — Git found two edits close together and won\'t guess which wins. Mark the file resolved with git add, then git commit to finish.',
      {
        x: 1.0, y: 5.15, w: 11.3, h: 1.5,
        fontFace: FONT_BODY, italic: true, fontSize: 21, color: 'CADCE8', valign: 'middle', margin: 0, lineSpacingMultiple: 1.25,
      }
    );

    K.addFooter(s, { pageNum: 11, label: 'Setup', dark: true });
  }

  // ============================================================ SLIDE 12 — try it
  {
    const s = p.addSlide();
    s.background = { color: NAVY };
    K.addSectionHeader(s, { icon: 'clipboardcheck_white.png', eyebrow: 'Before you move on', title: 'Try it' });

    K.addTryItGrid(s, {
      y: 1.6, cols: 2,
      cards: [
        { title: 'Prove the round trip', body: 'Add a line to README.md, then add → commit → push. Confirm the change shows up on github.com.' },
        { title: 'Simulate a dead laptop', body: 'Clone your own repo into a fresh folder and build it. If it builds, GitHub really is a full backup.' },
        { title: '.gitignore sanity check', body: "Run a build, then git status. build/ and .gradle/ shouldn't show up as untracked." },
        { title: 'Regenerate and compare', body: 'Run the setup command again into a new folder. It should match your real project exactly.' },
      ],
    });

    K.addFooter(s, { pageNum: 12, label: 'Setup', dark: true });
  }

  // ============================================================ SLIDE 13 — what you learned + ready
  {
    const s = p.addSlide();
    s.background = { color: WHITE };
    K.addHeader(s, { icon: 'graduationcap_white.png', eyebrow: 'What you learned', title: 'Your machine is ready' });

    const points = [
      'Git tracks snapshots of your project locally, with add and commit.',
      'GitHub holds the remote copy — push sends commits up, pull brings them down.',
      'gh auth login means neither will ever ask you for a password again.',
    ];
    s.addText(
      points.map((t, i) => ({ text: t, options: { bullet: true, breakLine: i < points.length - 1, paraSpaceAfter: 14 } })),
      {
        x: 0.7, y: 1.75, w: 6.9, h: 3.5,
        fontFace: FONT_BODY, fontSize: 21, color: INK, valign: 'top', margin: 0, lineSpacingMultiple: 1.2,
      }
    );
    s.addText(
      'The rhythm to carry forward: pull → edit → add → commit → push.',
      {
        x: 0.7, y: 5.4, w: 6.9, h: 1.2,
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

    K.addFooter(s, { pageNum: 13, label: 'Setup' });
  }

  return p;
}

const deck = buildDeck();
const outPath = path.join(__dirname, '..', '..', 'aside-setup.pptx');
deck.writeFile({ fileName: outPath }).then(() => {
  console.log('Wrote', outPath);
}).catch(e => { console.error(e); process.exit(1); });
