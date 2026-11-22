# Quiz fixture one

A page the quiz tests build into a throwaway copy of the site. It never
ships: tools/site-tests/run-quiz-tests.sh copies it in.

<details class="quiz" id="q-fixture-1" markdown="1">
<summary>Check yourself: a command's body has run out. Which hook runs?</summary>

- [ ] `whenCanceled` only. *Nothing cancelled it.*
- [x] `whenExited` only. *It finished, so only the exit hook runs.*
- [ ] Both, `whenExited` first. *That's what a cancel does.*

</details>

Text between the quizzes.

<details class="quiz" id="q-fixture-2" markdown="1">
<summary>Check yourself: is this the second quiz?</summary>

- [x] Yes. *It is.*
- [ ] No. *It isn't the first.*

</details>

A malformed quiz, with no right answer, stays as the plain block:

<details class="quiz" id="q-fixture-broken" markdown="1">
<summary>Check yourself: broken?</summary>

- [ ] One. *a*
- [ ] Two. *b*

</details>
