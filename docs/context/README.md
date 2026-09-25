# Ticket context files

One file per ticket, `docs/context/STU-NNN.md`, written once the design is
approved and before the first dispatch. Every brief points at it rather than
restating it: *"Read `docs/context/STU-NNN.md` first — it holds the design and
the contract."*

It exists because a brief written from memory repeats the author's mistakes,
and because five briefs restating the same design is five chances to restate it
differently. Reviewing one file is cheaper than reviewing five briefs, and the
Traps section is the only part of a dispatch that compounds.

Delete the file when the ticket ships, or keep it if the design is worth
remembering — but move what is worth remembering to `knowledge/` first, since
nobody reads `docs/context/` for a closed ticket.

## Template

```markdown
# STU-NNN — <title>

## Approved design
<What the human agreed to, in a few sentences. Decisions, not options.
If it was decided in chat, this is the only written record — write it properly.>

## Contract
<The exact API agents code against: signatures, types, sentinel values.
Specs and implementation both build from this, so it has to be unambiguous.>

## Verified repo facts
<Only things you have actually checked, with the file:line you checked.
An unverified fact here is worse than no fact — the agent will trust it.>

- Specs live in `test/`, not colocated — checked `vitest.config.ts`, 45 files
- `sharedValue` filters `undefined` — `src/lib/element-style.ts:82`

## Assumptions
<Things you believe but have not checked. Phrase each so an agent is invited
to correct it: "Verify X; I believe it is Y.">

## Traps
<Append the moment anything bites. Every later brief inherits this section.
This is the part that pays for the file.>

- `[data-testid^="shape-"] rect` also matches the pattern def's background
  rect. Use `svg > rect` for a shape's own body.
- jsdom does no layout and no CSS hit-testing: anything depending on
  pointer-events, z-order, overlap or measurement must be proven in a browser.

## Out of scope
<What a well-meaning agent might helpfully do that you do not want done,
and why. Cheaper to say here than to review out later.>
```

## Rules that earn their keep

1. **Verify before you write.** Every line under *Verified repo facts* names
   where you checked it. Two STU-925 briefs asserted repo facts that were
   false; both were checkable in seconds, and each cost a correction round.
2. **Traps are append-only and never pruned mid-ticket.** STU-925's most
   expensive dispatch — 74 tool calls, 199k tokens — lost about a third of
   them to a trap already written down in `knowledge/ERRORS.md`.
3. **Freeze the contract before parallelising.** Once *Contract* is settled,
   specs for the next stage can be written while the current one is built.
4. **Graduate, then delete.** A trap that will bite again belongs in
   `knowledge/ERRORS.md`, not in a closed ticket's context file.
