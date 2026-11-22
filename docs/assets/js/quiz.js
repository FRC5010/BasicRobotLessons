// Pop-up quizzes for the Concepts Study Guide (docs/study-guide/).
//
// A quiz is written in the page as plain Markdown inside a <details> block,
// so on GitHub, or with scripts off, it shows as a collapsed "Check yourself"
// with the answer hidden until it's opened:
//
//   <details class="quiz" id="q-commands-1" markdown="1">
//   <summary>Check yourself: the question?</summary>
//
//   - [ ] A wrong answer. *Why it's wrong.*
//   - [x] The right answer. *Why it's right.*
//
//   </details>
//
// The site renders the list as checkboxes, the right one checked. This script
// turns each block into a "Check yourself" button that opens the question in
// a dialog, and remembers in the browser which quizzes the reader has got
// right. Nothing leaves the browser.
//
// The list of every guide page and its quiz ids comes from
// _plugins/study_guide.rb, through a JSON block that _includes/head_custom.html
// writes into each guide page. It's what lets the guide's home page show a
// total.
(function () {
  "use strict";

  // Every FRC5010 site shares frc5010.github.io's storage, hence the prefix.
  var PREFIX = "BasicRobotLessons.quiz.";

  // Storage can be off, full, or throw in a private window. The quizzes still
  // work then; they just don't remember.
  function load(id) {
    try {
      return localStorage.getItem(PREFIX + id);
    } catch (e) {
      return null;
    }
  }

  function save(id, value) {
    try {
      if (value === null) localStorage.removeItem(PREFIX + id);
      else localStorage.setItem(PREFIX + id, value);
    } catch (e) {
      /* not remembered */
    }
  }

  function isRight(id) {
    return load(id) === "right";
  }

  function readIndex() {
    var el = document.getElementById("study-guide-quizzes");
    if (!el) return [];
    try {
      var data = JSON.parse(el.textContent);
      if (!Array.isArray(data)) return [];
      // The plugin knows each page's url within the site; the site itself
      // lives under a base path (/BasicRobotLessons on GitHub Pages).
      var base = (el.getAttribute("data-baseurl") || "").replace(/\/$/, "");
      return data.map(function (page) {
        return { url: base + page.url, title: page.title, ids: page.ids || [] };
      });
    } catch (e) {
      return [];
    }
  }

  // One quiz, read from its <details> block. Returns null if the block
  // doesn't look like a quiz, so a malformed one stays as the plain fallback.
  function parse(details) {
    var summary = details.querySelector("summary");
    var items = details.querySelectorAll("li");
    if (!summary || items.length < 2 || !details.id) return null;
    var options = [];
    var correct = -1;
    for (var i = 0; i < items.length; i++) {
      var li = items[i].cloneNode(true);
      var box = li.querySelector("input[type=checkbox]");
      if (!box) return null;
      if (box.checked || box.hasAttribute("checked")) correct = i;
      box.remove();
      var ems = li.querySelectorAll("em");
      var why = ems.length ? ems[ems.length - 1] : null;
      var explanation = why ? why.innerHTML : "";
      if (why) why.remove();
      options.push({ html: li.innerHTML.trim(), explanation: explanation });
    }
    if (correct < 0) return null;
    var question = summary.innerHTML.replace(/^\s*Check yourself:\s*/i, "");
    // "Check yourself: which hook runs?" reads as a sentence; on its own in
    // the dialog the question needs its capital back.
    question = question.replace(/^[a-z]/, function (c) {
      return c.toUpperCase();
    });
    return { id: details.id, question: question, options: options, correct: correct };
  }

  var dialog = null;

  function makeDialog() {
    var d = document.createElement("dialog");
    d.className = "quiz-dialog";
    d.setAttribute("aria-labelledby", "quiz-dialog-question");
    d.innerHTML =
      '<p class="quiz-dialog-label">Check yourself</p>' +
      '<p class="quiz-dialog-question" id="quiz-dialog-question"></p>' +
      '<div class="quiz-dialog-options" role="group" aria-label="Answers"></div>' +
      '<p class="quiz-dialog-feedback" aria-live="polite"></p>' +
      '<div class="quiz-dialog-actions">' +
      '<button type="button" class="quiz-dialog-retry" hidden>Try again</button>' +
      '<button type="button" class="quiz-dialog-close">Close</button>' +
      "</div>";
    // A click on the backdrop lands on the dialog element itself.
    d.addEventListener("click", function (event) {
      if (event.target === d) d.close();
    });
    d.querySelector(".quiz-dialog-close").addEventListener("click", function () {
      d.close();
    });
    document.body.appendChild(d);
    return d;
  }

  function open(quiz, opener, onAnswer) {
    if (!dialog) dialog = makeDialog();
    var d = dialog;
    d.querySelector(".quiz-dialog-question").innerHTML = quiz.question;
    var box = d.querySelector(".quiz-dialog-options");
    var feedback = d.querySelector(".quiz-dialog-feedback");
    var retry = d.querySelector(".quiz-dialog-retry");

    function reset() {
      box.innerHTML = "";
      feedback.innerHTML = "";
      feedback.className = "quiz-dialog-feedback";
      retry.hidden = true;
      quiz.options.forEach(function (option, index) {
        var b = document.createElement("button");
        b.type = "button";
        b.className = "quiz-option";
        b.innerHTML = option.html;
        b.addEventListener("click", function () {
          choose(index);
        });
        box.appendChild(b);
      });
    }

    function choose(index) {
      var right = index === quiz.correct;
      var buttons = box.querySelectorAll(".quiz-option");
      for (var i = 0; i < buttons.length; i++) {
        buttons[i].disabled = true;
        if (i === quiz.correct && right) buttons[i].classList.add("is-correct");
      }
      buttons[index].classList.add(right ? "is-correct" : "is-wrong");
      buttons[index].setAttribute("aria-label", (right ? "Right: " : "Not this one: ") + buttons[index].textContent);
      var chosen = quiz.options[index];
      feedback.className = "quiz-dialog-feedback " + (right ? "is-correct" : "is-wrong");
      feedback.innerHTML =
        "<strong>" + (right ? "Right." : "Not quite.") + "</strong> " + chosen.explanation;
      retry.hidden = right;
      onAnswer(right);
      (right ? d.querySelector(".quiz-dialog-close") : retry).focus();
    }

    retry.onclick = function () {
      reset();
      var first = box.querySelector(".quiz-option");
      if (first) first.focus();
    };
    d.onclose = function () {
      if (opener && document.contains(opener)) opener.focus();
    };
    reset();
    d.showModal();
    var first = box.querySelector(".quiz-option");
    if (first) first.focus();
  }

  function statusText(id) {
    var state = load(id);
    if (state === "right") return "✓ answered right";
    if (state === "wrong") return "tried, not yet right";
    return "";
  }

  function pageProgress(ids, el) {
    var right = ids.filter(isRight).length;
    el.querySelector(".quiz-progress-count").textContent =
      right + " of " + ids.length + (ids.length === 1 ? " quiz" : " quizzes") + " on this page answered right";
  }

  function totals(index, el) {
    var pages = 0;
    var right = 0;
    var all = 0;
    var rows = index.map(function (page) {
      var n = page.ids.filter(isRight).length;
      all += page.ids.length;
      right += n;
      if (n > 0) pages++;
      return { page: page, right: n };
    });
    el.innerHTML = "";
    var summary = document.createElement("p");
    summary.className = "quiz-total-summary";
    summary.textContent = all === 0
      ? "No quizzes yet."
      : "You've answered " + right + " of " + all + " quizzes right, on " + pages + " of " + index.length +
        (index.length === 1 ? " page." : " pages.");
    el.appendChild(summary);
    if (all === 0) return;
    var list = document.createElement("ul");
    list.className = "quiz-total-list";
    rows.forEach(function (row) {
      var li = document.createElement("li");
      var a = document.createElement("a");
      a.href = row.page.url;
      a.textContent = row.page.title;
      li.appendChild(a);
      li.appendChild(document.createTextNode(": " + row.right + " of " + row.page.ids.length));
      list.appendChild(li);
    });
    el.appendChild(list);
    var resetAll = document.createElement("button");
    resetAll.type = "button";
    resetAll.className = "quiz-reset";
    resetAll.textContent = "Forget every answer";
    resetAll.addEventListener("click", function () {
      index.forEach(function (page) {
        page.ids.forEach(function (id) {
          save(id, null);
        });
      });
      totals(index, el);
    });
    el.appendChild(resetAll);
  }

  function start() {
    var supported = typeof window.HTMLDialogElement === "function";
    var blocks = Array.prototype.slice.call(document.querySelectorAll("details.quiz"));
    var ids = [];
    var refreshers = [];
    if (supported) {
      blocks.forEach(function (details) {
        var quiz = parse(details);
        if (!quiz) return; // leave the plain fallback in place
        ids.push(quiz.id);
        var card = document.createElement("div");
        card.className = "quiz-card";
        card.id = quiz.id;
        details.removeAttribute("id");
        var button = document.createElement("button");
        button.type = "button";
        button.className = "quiz-open";
        button.textContent = "Check yourself";
        var status = document.createElement("span");
        status.className = "quiz-status";
        function refresh() {
          status.textContent = statusText(quiz.id);
          card.classList.toggle("is-right", isRight(quiz.id));
        }
        refreshers.push(refresh);
        button.addEventListener("click", function () {
          open(quiz, button, function (right) {
            // Once right, stays right: a later slip doesn't undo it.
            if (right || !isRight(quiz.id)) save(quiz.id, right ? "right" : "wrong");
            refreshers.forEach(function (f) {
              f();
            });
          });
        });
        card.appendChild(button);
        card.appendChild(status);
        details.replaceWith(card);
        refresh();
      });
    }

    if (ids.length > 0) {
      var main = document.querySelector("#main-content") || document.body;
      var heading = main.querySelector("h1");
      var progress = document.createElement("p");
      progress.className = "quiz-progress";
      progress.innerHTML =
        '<span class="quiz-progress-count"></span> <button type="button" class="quiz-reset">Forget this page\'s answers</button>';
      progress.querySelector(".quiz-reset").addEventListener("click", function () {
        ids.forEach(function (id) {
          save(id, null);
        });
        refreshers.forEach(function (f) {
          f();
        });
      });
      refreshers.push(function () {
        pageProgress(ids, progress);
      });
      if (heading && heading.parentNode) heading.parentNode.insertBefore(progress, heading.nextSibling);
      else main.insertBefore(progress, main.firstChild);
      pageProgress(ids, progress);
    }

    var total = document.querySelector("[data-quiz-total]");
    if (total) totals(readIndex(), total);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})();
