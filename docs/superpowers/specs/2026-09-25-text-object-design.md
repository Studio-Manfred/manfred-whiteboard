# Text objects with auto-height — design

**Ticket:** STU-953 · **Date:** 2026-09-25 · **Path:** architectural

## The problem

The board can only hold words inside something: a sticky note's card, or a
shape's centred label. There is no way to put a title, a caption or a paragraph
directly on the canvas.

## What we are building

A `text` element — bare text with no fill and no border. The user drags a
width; the height follows the content as they type. One style per object, so a
heading and a body are two objects.

Plus a text-colour control in the properties bar that reaches text objects,
sticky-note text and shape labels alike. All three are locked to `slate-800`
today.

## The decision that shapes everything else

**The canvas and the export already disagree about where text wraps.**

`wrapText` at `board-export.ts:76` is private to the export and estimates from
an average glyph width — its own comment says "an average glyph width is close
enough for an export". The canvas does not use it at all; it lets the browser
free-flow text in a div. Sticky labels are short enough that nobody has
noticed.

A paragraph would make it obvious: a different line count is a different
height, so the exported object would be a different size from the one on
screen. This is the same failure as the fill-pattern phase mismatch in
STU-925, and the third time this repo has had a canvas/export divergence.

So the design is **one measurer, two renderers**:

```
                    layoutText(text, width, opts, measure) → { lines, height }
                                                    ↑
                              injected: real canvas measureText in the browser,
                                        a deterministic fake in tests
        canvas ──┐
                 ├──→ identical lines, identical metrics
        export ──┘
```

`boardToSvg` runs in the browser (`App.tsx:530`), so both callers get the same
real font metrics from the same function. They cannot diverge, because there is
only one implementation and one source of measurements.

This mirrors the pattern the repo already uses twice: `fill-patterns.ts` and
`ink.ts` each own a geometry, and the canvas and the export both build their own
markup from it.

## Data model

```ts
export interface TextElement extends BaseElement {
  type: 'text'
  text: string
  fontSize: number
  fontFamily?: FontFamily
  textAlign?: TextAlign
  textColor?: string
}
```

`width` is user-set. `height` is **derived**: computed from the layout and
written back by whichever client is editing. It is stored rather than recomputed
on demand so that every existing consumer — `boardBounds`, `findElementAt`,
`elementsInMarquee`, `connector-math`, `stacking` — keeps reading `.height` and
needs no change at all.

`textColor?: string` is added to `StickyElement` and `ShapeElement` too. It is
`textColor` and not `color` because `StickyElement.color` already means the
card's background. Optional on all three: undefined means `slate-800`, which is exactly what all
three render today, so existing boards are unchanged.

`'text'` joins the `ElementType` union and `TextElement` joins `BoardElement`.

## The layout module

`src/lib/text-layout.ts`:

```ts
export type Measure = (text: string, font: string) => number

export interface TextLayout {
  lines: string[]
  height: number
}

export function layoutText(
  text: string,
  maxWidth: number,
  opts: { fontSize: number; fontFamily?: FontFamily },
  measure: Measure
): TextLayout

/** A CSS font shorthand, the form `measureText` wants. */
export function cssFont(fontSize: number, fontFamily?: FontFamily): string

/** Browser measurer over a cached 2D context. Memoised per font. */
export function canvasMeasure(): Measure

/** Average-glyph fallback, for when no real measurer is available. */
export function estimateMeasure(): Measure

export const LINE_HEIGHT = 1.35
```

Pure apart from the measurer handed to it. It must handle:

- explicit `\n` as a hard break
- word wrapping at whitespace
- a single word wider than `maxWidth` — broken mid-word rather than overflowing
- empty text — zero lines, minimum height
- `maxWidth` smaller than one character — never loops forever, always makes
  progress

`height` is exactly `lines.length * fontSize * LINE_HEIGHT`. **A text object has
no padding.** STU-868 gave every other element padding so its text does not lean
on a border, but a text object has no border to lean on — padding would only
push the words away from bounds nobody can see, and make the selection outline
sit oddly wide of the text. `textPaddingFor` therefore returns 0 for `text`.

## Rendering

**`TextItem`** renders the computed lines. Display is one line per computed
line, not free-flowing text, so what is on screen is exactly what `layoutText`
decided and exactly what the export will draw.

Editing keeps the double-click idiom the sticky note already uses, with a
`<textarea>` overlay so multi-line entry and `Enter` behave normally. On blur it
commits.

When `text`, `width`, `fontSize` or `fontFamily` changes, the component
recomputes the layout and patches `height`. `measureText` is memoised per
`(text, font)` so typing does not measure on every keystroke.

**Export** gains `textSvg(el)`, emitting one `<tspan>` per line from the same
`layoutText` call, positioned the way `stickySvg` already positions its tspans.

## Wiring

- A `text` tool, shortcut `T` — but see **The toolbar has no room** below. It
  is not simply a ninth button.
- `createTextElement(at, options)` in `element-factories.ts`. Defaults:
  `width` 240, `fontSize` 16, `textAlign` left, no `textColor` (which renders
  as today's `slate-800`). Clicking with the tool creates one at the default
  width, already in edit mode so you can type immediately. Width is then set
  with the east/west resize handles.

  **Drag-to-size creation is out of scope** (Ruling 32). The spec originally
  said dragging sets the width at creation; no task implemented it, and
  `createTextElement`'s `width` option has no production caller as a result.
  The capability exists in two steps — create, then drag a handle — so adding
  a second creation interaction late and untested is worse than deferring it.
  Filed separately.
- `supportsProperty`: text objects get `font`, `align`, `stacking` and the new
  `textColor`; they opt out of `fill`, `border`, `pattern` and `thickness`.
  `textColor` is also true for `sticky` and `shape`.
- **Resize offers the east and west handles only.** Height is derived, so a
  vertical handle would be a control that looks live and does nothing.

## Edge cases

| Case | Behaviour |
| --- | --- |
| Text emptied, then blur | The element is deleted. An invisible zero-height object that cannot be found or selected is a trap. |
| A word wider than the box | Broken mid-word. Overflow would escape the element's own bounds and break hit-testing. |
| No measurer available (tests, any non-browser caller) | Falls back to `estimateMeasure`. Never throws. |
| A peer on a newer version syncs an unknown field | Ignored, as with every other optional field. |
| Zero-width or absurd width | Clamped to `MIN_ELEMENT_SIZE`, as resize already does. |

## Testing

**`text-layout.test.ts`** is the centre of it. With an injected measurer where
every character is exactly 10px, wrapping becomes fully predictable, so the
tests assert exact line arrays rather than approximations. Cover: hard breaks,
word wrap, the over-long word, empty text, the degenerate width, and height
arithmetic.

**The anti-divergence test** asserts that for the same element the canvas path
and the export path produce identical `lines`. This locks the bug class that
motivated the design, rather than trusting that it stays fixed.

**Component tests** for `TextItem`: growth on typing, deletion on empty blur,
and that only east/west handles render.

**E2E**: create, type, watch the height grow, resize the width, export and
confirm the line breaks match.

**Ugly pass** — run before implementation, per the STU-952 convention. It
already found the toolbar overflow below. Still to check during the build: one
unbroken 40-character word; the smallest font size; and a text object at the
left screen edge, where STU-927's panel clipping is known to bite.

## The toolbar has no room

Measured on the `chromium-mobile` project (Pixel 5, 393px):

```
8 tools    374px wide    47px per tool (42px button + gap)
9 tools    421px         28px past the viewport
```

A ninth button does not fit. Shrinking the buttons is the obvious fix and the
wrong one — at 42px they are already just under WCAG 2.5.5's 44px target size,
and this repo treats accessibility as non-negotiable.

**Rectangle and circle collapse into one Shape button with a flyout.** The tool
count stays at eight with `text` added, touch targets are untouched, and there
is room for a tenth tool later. This is the standard whiteboard idiom.

It does change an interaction that works today, so it carries its own cost:
the flyout needs the same APG keyboard treatment as the toolbar itself (the
toolbar is one tab stop with arrow-key navigation), its own component tests,
its own E2E, and a screenshot pass at both viewports. Every existing E2E that
clicks `Rectangle` or `Circle` by accessible name will need updating — there
are several.

## Not in this ticket

- **Rich text.** Bold or italic within one object means `Y.Text` with marks, a
  new editing surface, and an export that walks ranges. Roughly triples the
  work.
- **Routing sticky and shape labels through `layoutText`.** That fixes the
  *existing* divergence and is worth doing, but it changes how every current
  board renders its labels and deserves its own ticket and its own screenshots.
- **The dead `frame` type.** `ElementType` includes `'frame'` and
  `FrameElement` is fully declared at `whiteboard.ts:51`, but nothing creates,
  renders or exports it. Separate cleanup.

## Risks

**Measurement cost while typing.** Every keystroke relayouts. Mitigated by
memoising per `(text, font)` and by the fact that `measureText` on a cached
context is cheap, but it should be watched in the E2E.

**Height write-back is a document write per keystroke-ish change.** It should
patch `height` only when the computed value actually changes, not on every
render, or it will flood the undo stack. The undo manager already coalesces, but
this needs checking against `useUndoRedo` rather than assumed.

**A peer with different fonts** could compute a different height for the same
text. The repo uses system font stacks only, with no webfont download
(`fontFamilyStack`), so the risk is small — but two clients on different
platforms will not agree exactly. The last writer wins, which is the same rule
every other field follows.
