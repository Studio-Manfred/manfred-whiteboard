# Running a plan through subagents

What STU-953 taught, written down because the feature was cheaper than the
lesson. Eight tasks, ~30 dispatches, eleven fix rounds, one Critical caught at
the very last gate.

Read with `docs/context/README.md` (how to brief) — this file is about what
goes wrong anyway.

## A plan is a hypothesis, not a specification

STU-953's plan had **seven defects**, every one found by an implementer or a
reviewer. It had been self-reviewed first.

- two tests that passed against implementations with the guard deleted
- a "this locks the bug class" test that passed against the bug
- a file no task owned, whose omission would have shipped an invisible feature
- an API name that did not exist (`toolForKey` for `toolForShortcut`)
- a selector matching more than intended (`/^text-/` also matches `text-body`)
- an assertion that throws before it can assert (`getAllByRole` on zero matches)

The `writing-plans` self-review catches placeholders, contradictions and type
drift. It cannot catch *"this test would pass if the bug were present"* or
*"nobody owns this file"*, because both require executing or tracing the code.

**So:** write the plan, then expect it to be wrong. The value is in the
decomposition and the contract, not the code snippets. Every implementer that
corrected a brief on this branch was right to.

### Add an ownership check to the pre-flight scan

Before Task 1, list every file the feature will touch and confirm some task
names it. `board-selectors.ts` was invisible to all eight briefs: it partitions
elements into render layers, switches on element type with **no `default`
clause**, and silently dropped the new type. Tasks 3, 4 and 5 would all have
passed green with the feature rendering nothing.

One grep would have caught it. Nothing else did — not typecheck, because a
missing `default` means no exhaustiveness to fail.

## Ask of every test: what would it do if the bug were present?

Three tests were proven unable to fail. Each looked correct and each was mine.

| Test | Passed against |
|---|---|
| "doesn't write height back when it agrees" | a component with no guard at all |
| "corrects a stale height from a peer" | one ignoring peer heights entirely |
| "breaks exactly where the canvas breaks" | the export using a different algorithm |

The first re-rendered with the *same object*, so React never re-ran the effect —
it asserted React's semantics, not the guard. The third compared `layoutText`
with itself, because the function under test calls it.

**So:** a test guarding a named risk is not a guard until someone has watched it
fail. Make the bug, run the test, restore. It takes a minute and it is the only
thing that distinguishes a guard from decoration. Coverage cannot: all three
were covered lines.

## jsdom cannot see a whole class of bug

Two of the worst findings were invisible to 717 passing tests:

- **A focus race.** Focusing a textarea from the same `pointerdown` that created
  it lost to the browser's native default action, which refocuses the
  `tabIndex=0` canvas region *after* listeners run. Combined with
  delete-on-blank-blur, every creation click deleted its own object. Broken in
  every real browser, green in jsdom — which dispatches no default actions.
- **A 0×0 click target.** An empty text object's inner div has no box, so
  Playwright refuses to click it and `fireEvent` does not care.

**So:** any task touching focus, pointer events, visibility or text measurement
gets a real-browser check, and it belongs to the **implementer** checking its
own fix — not only to a reviewer. Both of these were found that way.

## Cross-task seams are where the expensive bugs live

The Critical that nearly shipped: one peer creating a text object auto-focused a
textarea on *every other peer's* screen, and their next click deleted the
creator's object along with their unsaved text.

It existed because Task 6 fixed a local focus race by deriving edit state from
`element.text === ''`, and a different task added the blank-delete rule. **Each
is correct alone.** No brief mentioned peers, so no task reviewer saw both
halves — and both diffs were individually clean.

**So:** when a feature touches shared state, ask the whole-branch reviewer about
multi-client behaviour by name. And the domain rule this produced, which
generalises well beyond this repo:

> **Local UI state must never derive from shared document data.**
> A creation signal is local. Pass it as a prop from the tab that created the
> thing.

## Two classification traps

**"The diff didn't change it" ≠ "the branch doesn't introduce it."** A reviewer
parked a focus bug as pre-existing because the handler was byte-identical across
the fix diff. True — but the component was new on the branch, so `main` had no
such behaviour. Only the second claim justifies parking.

**A Minor can become an Important when a later task meets it.** An unbounded
measure cache was parked as theoretical. Wiring it to a live editor revealed it
mints mostly-unique keys per keystroke in a singleton living as long as the tab.
Re-read parked findings when a task touches their code.

## The mechanics that actually mattered

- **Restore-after-mutation is not guaranteed.** A reviewer was killed by a rate
  limit between mutating a file and restoring it, leaving the deliberate bug in
  the tree. Six others restored cleanly, which is what makes it dangerous.
  **Check `git status` after every review dispatch**, and have reviewers restore
  in the very next tool call rather than after further analysis.
- **Briefs compound.** The traps file grew each task and later briefs inherited
  it. Task 7 carried the heaviest brief and was the only task to pass its review
  with **zero fix rounds**.
- **Say "commit only — do not push, do not open a PR" in every dispatch.** One
  brief omitted it and its agent pushed the branch and opened a PR unasked.
- **Reports get things wrong.** Several claimed gates they had not really run,
  or described their own behaviour inaccurately (`Escape-to-cancel` for code
  that commits). Verify the claim that matters; let the rest go.

## What this cost, honestly

Roughly 3.5M subagent tokens across the branch. The review seats found more than
the implementer seats, and the whole-branch review alone found the one defect
that would have caused user-visible data loss.

Whether that is worth it depends on what shipping a broken multiplayer delete
would have cost. For a whiteboard people collaborate in: yes.
