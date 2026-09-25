# Text Objects with Auto-Height Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a bare `text` element to the whiteboard whose width the user sets and whose height follows the content, laid out by one module that both the canvas and the export call.

**Architecture:** A pure `src/lib/text-layout.ts` takes an injected measuring function and returns the wrapped lines plus a height. The canvas renders those exact lines instead of free-flowing text, and the export emits one `<tspan>` per line from the same call. Because `boardToSvg` runs in the browser, both callers hand it the same real `measureText`, so they cannot wrap differently. Height is stored on the element so every existing consumer keeps reading `.height` unchanged.

**Tech Stack:** React 19, TypeScript strict, Yjs, Vitest + Testing Library, Playwright, Tailwind v4.

**Spec:** `docs/superpowers/specs/2026-09-25-text-object-design.md`
**Context:** `docs/context/STU-953.md` — contract, verified repo facts, traps. Read it before starting any task.

## Global Constraints

- Ticket is **STU-953**. Every commit message ends with `(STU-953)`.
- Specs live in the top-level `test/` directory and import from `../src/lib/…`. E2E lives in `e2e/`.
- `test/` is outside the typecheck project — `npm run typecheck` will NOT catch a wrong prop name in a spec. Rely on runtime test output.
- The Iron Law: no production logic without a failing test first.
- Accessibility is non-negotiable: semantic HTML, full keyboard operability, `AXE_ENFORCE=1` stays green.
- Touch targets stay at 42px. Do not shrink them to make room.
- Every new optional field must leave existing boards rendering unchanged.
- `LINE_HEIGHT = 1.35` already exists at `board-export.ts:33`. Move it to `text-layout.ts` and re-export; do not define a second one.
- Gates before every commit: `npx vitest run`, `npm run typecheck`, `npm run lint`, `npm run coverage:check`.

## Review Focus

Five conditions the spec implies that no task's happy path exercises. Each has a test added to the task that owns the code.

1. **Whitespace-only text** (`"   "`) is invisible but not empty — it must be treated as empty on blur and delete the element, or the board collects objects nobody can see. *Task 6.*
2. **A single word wider than the box at minimum width** must break mid-word and always make progress — a wrapping loop that cannot fit one character must never spin forever. *Task 1.*
3. **Changing font size or family from the properties bar** must recompute height. If it does not, the stored height goes stale and hit-testing, marquee selection and the export all lie about where the element is. *Task 3.*
4. **A stale height arriving from a peer or an older document** must be corrected on mount, not trusted forever. The height is a cache; the text is the truth. *Task 3.*
5. **Rapid typing must not flood the undo stack.** Patch `height` only when the computed value actually differs from the stored one. *Task 3.*

---

### Task 1: The text layout module

**Files:**
- Create: `src/lib/text-layout.ts`
- Test: `test/text-layout.test.ts`

**Interfaces:**
- Consumes: `FontFamily` from `src/types/whiteboard.ts`, `fontFamilyStack` from `src/lib/element-style.ts`.
- Produces: `Measure`, `TextLayout`, `layoutText`, `cssFont`, `canvasMeasure`, `estimateMeasure`, `LINE_HEIGHT`.

- [ ] **Step 1: Write the failing test**

Create `test/text-layout.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { layoutText, LINE_HEIGHT } from '../src/lib/text-layout'

/** Every character is exactly 10px, so wrapping is arithmetic, not a guess. */
const tenPx = (text: string) => text.length * 10

const opts = { fontSize: 20 }

describe('layoutText', () => {
  it('keeps text that fits on one line', () => {
    expect(layoutText('hello', 100, opts, tenPx).lines).toEqual(['hello'])
  })

  it('wraps at a space when the next word would not fit', () => {
    // 'hello world' is 110px; 100px fits only 'hello'.
    expect(layoutText('hello world', 100, opts, tenPx).lines).toEqual(['hello', 'world'])
  })

  it('treats a newline as a hard break, even mid-line', () => {
    expect(layoutText('a\nb', 1000, opts, tenPx).lines).toEqual(['a', 'b'])
  })

  it('keeps an empty paragraph as an empty line', () => {
    expect(layoutText('a\n\nb', 1000, opts, tenPx).lines).toEqual(['a', '', 'b'])
  })

  it('breaks a word that cannot fit on any line', () => {
    // 'abcdefgh' is 80px in a 30px box: three characters per line.
    expect(layoutText('abcdefgh', 30, opts, tenPx).lines).toEqual(['abc', 'def', 'gh'])
  })

  it('makes progress even when not one character fits', () => {
    // A zero-width box must still terminate, one character per line.
    expect(layoutText('abc', 0, opts, tenPx).lines).toEqual(['a', 'b', 'c'])
  })

  it('is empty for empty text', () => {
    const layout = layoutText('', 100, opts, tenPx)
    expect(layout.lines).toEqual([])
    expect(layout.height).toBe(0)
  })

  it('derives height from the line count', () => {
    const layout = layoutText('hello world', 100, opts, tenPx)
    expect(layout.height).toBe(2 * 20 * LINE_HEIGHT)
  })
})
```

- [ ] **Step 2: Run it and verify it fails**

Run: `npx vitest run test/text-layout.test.ts`
Expected: FAIL — `Failed to resolve import "../src/lib/text-layout"`.

- [ ] **Step 3: Write the module**

Create `src/lib/text-layout.ts`:

```ts
/**
 * Text layout for elements whose height follows their content.
 *
 * The measuring function is injected rather than reached for, because the two
 * callers need different ones: the browser hands in a real `measureText`, a
 * test hands in something deterministic. Both get the same wrapping from the
 * same code, which is what stops the canvas and the export disagreeing about
 * where a line breaks.
 */

import type { FontFamily } from '../types/whiteboard'
import { fontFamilyStack } from './element-style'

/** Width of `text` in pixels, rendered in the CSS font shorthand `font`. */
export type Measure = (text: string, font: string) => number

export interface TextLayout {
  lines: string[]
  height: number
}

/** Line box as a multiple of the font size. */
export const LINE_HEIGHT = 1.35

/** The CSS font shorthand `measureText` expects. */
export function cssFont(fontSize: number, fontFamily?: FontFamily): string {
  return `${fontSize}px ${fontFamilyStack(fontFamily)}`
}

/** Splits one paragraph, breaking a word that cannot fit on a line of its own. */
function wrapParagraph(
  paragraph: string,
  maxWidth: number,
  font: string,
  measure: Measure
): string[] {
  if (paragraph === '') return ['']

  const lines: string[] = []
  let line = ''

  const pushWord = (word: string) => {
    let rest = word
    // A word wider than the box is cut. At least one character always moves,
    // so a box too narrow for any character still terminates.
    while (measure(rest, font) > maxWidth && rest.length > 1) {
      let take = rest.length - 1
      while (take > 1 && measure(rest.slice(0, take), font) > maxWidth) take--
      lines.push(rest.slice(0, take))
      rest = rest.slice(take)
    }
    line = rest
  }

  for (const word of paragraph.split(/\s+/).filter(Boolean)) {
    const candidate = line ? `${line} ${word}` : word

    if (measure(candidate, font) <= maxWidth) {
      line = candidate
      continue
    }

    if (line) lines.push(line)
    pushWord(word)
  }

  if (line) lines.push(line)
  return lines
}

/** Wraps `text` to `maxWidth` and reports the height those lines occupy. */
export function layoutText(
  text: string,
  maxWidth: number,
  opts: { fontSize: number; fontFamily?: FontFamily },
  measure: Measure
): TextLayout {
  if (text === '') return { lines: [], height: 0 }

  const font = cssFont(opts.fontSize, opts.fontFamily)
  const lines = text.split('\n').flatMap((p) => wrapParagraph(p, maxWidth, font, measure))

  return { lines, height: lines.length * opts.fontSize * LINE_HEIGHT }
}

/** Average-glyph estimate, for callers with no canvas — tests, and any
 * non-browser consumer. Never throws, so layout always produces something. */
export function estimateMeasure(): Measure {
  const GLYPH_RATIO = 0.55
  return (text, font) => {
    const size = Number.parseFloat(font) || 16
    return text.length * size * GLYPH_RATIO
  }
}

/** Real browser metrics over one cached 2D context, memoised per font. */
export function canvasMeasure(): Measure {
  if (typeof document === 'undefined') return estimateMeasure()

  const context = document.createElement('canvas').getContext('2d')
  if (!context) return estimateMeasure()

  const cache = new Map<string, number>()

  return (text, font) => {
    const key = `${font}\u0000${text}`
    const hit = cache.get(key)
    if (hit !== undefined) return hit

    context.font = font
    const width = context.measureText(text).width
    cache.set(key, width)
    return width
  }
}
```

- [ ] **Step 4: Run the tests and verify they pass**

Run: `npx vitest run test/text-layout.test.ts`
Expected: PASS, 8 tests.

- [ ] **Step 5: Point the export's LINE_HEIGHT at the new one**

In `src/lib/board-export.ts`, delete the local `const LINE_HEIGHT = 1.35` at line 33 and import it instead:

```ts
import { LINE_HEIGHT } from './text-layout'
```

Run `npx vitest run` — the existing export tests must still pass, proving the value is identical.

- [ ] **Step 6: Commit**

```bash
git add src/lib/text-layout.ts test/text-layout.test.ts src/lib/board-export.ts
git commit -m "feat(text): add a text layout module with an injected measurer (STU-953)"
```

---

### Task 2: The element type and factory

**Files:**
- Modify: `src/types/whiteboard.ts`
- Modify: `src/lib/element-factories.ts`
- Test: `test/element-factories.test.ts`

**Interfaces:**
- Consumes: `FontFamily`, `TextAlign`, `BaseElement`, `FactoryOptions`, `base()`.
- Produces: `TextElement`, `'text'` in `ElementType` and `BoardElement`, `textColor?` on `StickyElement` and `ShapeElement`, `createTextElement(at, options)`, `TEXT_DEFAULT_WIDTH`.

- [ ] **Step 1: Write the failing test**

Add to `test/element-factories.test.ts`:

```ts
describe('createTextElement', () => {
  it('starts empty at the default width, centred on the pointer', () => {
    const el = createTextElement({ x: 100, y: 50 }, { zIndex: 3, id: 't1', now: 7 })

    expect(el.type).toBe('text')
    expect(el.text).toBe('')
    expect(el.width).toBe(TEXT_DEFAULT_WIDTH)
    expect(el.x).toBe(100 - TEXT_DEFAULT_WIDTH / 2)
    expect(el.fontSize).toBe(16)
    expect(el.id).toBe('t1')
  })

  it('takes a width when one is dragged', () => {
    const el = createTextElement({ x: 0, y: 0 }, { zIndex: 1, width: 400 })
    expect(el.width).toBe(400)
  })

  it('has no textColor, so it renders as every label does today', () => {
    const el = createTextElement({ x: 0, y: 0 }, { zIndex: 1 })
    expect(el.textColor).toBeUndefined()
  })
})
```

- [ ] **Step 2: Run it and verify it fails**

Run: `npx vitest run test/element-factories.test.ts`
Expected: FAIL — `createTextElement is not exported`.

- [ ] **Step 3: Add the type**

In `src/types/whiteboard.ts`, extend the union and add the interface:

```ts
export type ElementType = 'sticky' | 'shape' | 'frame' | 'connector' | 'drawing' | 'text'
```

```ts
/**
 * Bare text on the board. `width` is set by the user; `height` is derived from
 * the layout and written back by whichever client is editing, so that every
 * consumer of `.height` keeps working without knowing text can reflow.
 */
export interface TextElement extends BaseElement {
  type: 'text'
  text: string
  fontSize: number
  fontFamily?: FontFamily
  textAlign?: TextAlign
  /** Undefined renders as slate-800, which is what every label does today. */
  textColor?: string
}
```

Add `textColor?: string` to `StickyElement` and to `ShapeElement`, each with the same comment. Add `| TextElement` to `BoardElement`.

- [ ] **Step 4: Add the factory**

In `src/lib/element-factories.ts`:

```ts
export const TEXT_DEFAULT_WIDTH = 240

interface TextOptions extends FactoryOptions {
  width?: number
}

/** An empty text object centred on the pointer. Height is 0 until it has
 * words — the editing client writes the real one once it lays them out. */
export function createTextElement(at: Point, options: TextOptions): TextElement {
  const width = options.width ?? TEXT_DEFAULT_WIDTH

  return {
    ...base(options),
    type: 'text',
    x: at.x - width / 2,
    y: at.y,
    width,
    height: 0,
    text: '',
    fontSize: 16,
  }
}
```

- [ ] **Step 5: Run the tests and verify they pass**

Run: `npx vitest run test/element-factories.test.ts && npm run typecheck`
Expected: PASS. Typecheck will surface every `switch` over `BoardElement` that does not yet handle `'text'` — fix each by falling through to existing behaviour for now; the real branches arrive in Tasks 3 and 4.

- [ ] **Step 6: Commit**

```bash
git add src/types/whiteboard.ts src/lib/element-factories.ts test/element-factories.test.ts
git commit -m "feat(text): add the text element type and factory (STU-953)"
```

---

### Task 3: The TextItem component

**Files:**
- Create: `src/components/Canvas/TextItem.tsx`
- Test: `test/TextItem.test.tsx`
- Modify: `src/lib/element-style.ts` (`textPaddingFor` returns 0 for text; `supportsProperty` gains text cases)
- Modify: `src/lib/resize.ts` (`handlesFor`)
- Modify: `src/components/Canvas/ResizeHandles.tsx` (accept a subset)

**Interfaces:**
- Consumes: `layoutText`, `canvasMeasure`, `cssFont`, `LINE_HEIGHT` from Task 1; `TextElement` from Task 2.
- Produces: `TextItem` component; `handlesFor(element): ResizeHandle[]`.

- [ ] **Step 1: Write the failing test**

Create `test/TextItem.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { TextItem } from '../src/components/Canvas/TextItem'
import type { TextElement } from '../src/types/whiteboard'

const text: TextElement = {
  id: 'x1', type: 'text', x: 0, y: 0, width: 100, height: 27,
  zIndex: 1, createdAt: 0, updatedAt: 0, text: 'hello', fontSize: 20,
}

const props = {
  isSelected: false,
  onSelect: vi.fn(),
  onUpdate: vi.fn(),
  onDragStart: vi.fn(),
}

describe('TextItem', () => {
  it('renders one element per laid-out line', () => {
    render(<TextItem element={{ ...text, text: 'hello world', width: 60 }} {...props} />)
    // jsdom cannot measure, so the estimate measurer runs — assert on the
    // count rather than on where exactly it broke.
    expect(screen.getAllByTestId('text-line').length).toBeGreaterThan(1)
  })

  it('writes the height back when the laid-out height differs', () => {
    const onUpdate = vi.fn()
    render(<TextItem element={{ ...text, height: 999 }} {...props} onUpdate={onUpdate} />)
    expect(onUpdate).toHaveBeenCalledWith(expect.objectContaining({ height: expect.any(Number) }))
    expect(onUpdate.mock.calls[0][0].height).not.toBe(999)
  })

  it('does not write the height back when it already agrees', () => {
    // Review Focus 5: a patch per keystroke would flood the undo stack.
    const onUpdate = vi.fn()
    const { rerender } = render(<TextItem element={text} {...props} onUpdate={onUpdate} />)
    onUpdate.mockClear()
    rerender(<TextItem element={text} {...props} onUpdate={onUpdate} />)
    expect(onUpdate).not.toHaveBeenCalled()
  })

  it('recomputes the height when the font size changes', () => {
    // Review Focus 3: a stale height makes hit-testing lie.
    const onUpdate = vi.fn()
    const { rerender } = render(<TextItem element={text} {...props} onUpdate={onUpdate} />)
    onUpdate.mockClear()
    rerender(<TextItem element={{ ...text, fontSize: 40 }} {...props} onUpdate={onUpdate} />)
    expect(onUpdate).toHaveBeenCalledWith(expect.objectContaining({ height: expect.any(Number) }))
  })

  it('corrects a stale height arriving from a peer', () => {
    // Review Focus 4: the text is the truth, the height is a cache.
    const onUpdate = vi.fn()
    render(<TextItem element={{ ...text, height: 4 }} {...props} onUpdate={onUpdate} />)
    expect(onUpdate).toHaveBeenCalled()
  })

  it('renders textColor when set, and slate-800 when not', () => {
    const { rerender } = render(<TextItem element={text} {...props} />)
    expect(screen.getByTestId('text-body')).toHaveStyle({ color: 'rgb(30, 41, 59)' })

    rerender(<TextItem element={{ ...text, textColor: '#dc2626' }} {...props} />)
    expect(screen.getByTestId('text-body')).toHaveStyle({ color: '#dc2626' })
  })

  it('offers only the east and west resize handles', () => {
    render(<TextItem element={text} {...props} isSelected onResizeStart={vi.fn()} onResizeByKeyboard={vi.fn()} />)
    expect(screen.getByRole('button', { name: /right edge/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /left edge/i })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /bottom edge/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /corner/i })).not.toBeInTheDocument()
  })

  it('opens a textarea on double click and commits on blur', () => {
    const onUpdate = vi.fn()
    render(<TextItem element={text} {...props} onUpdate={onUpdate} />)
    fireEvent.doubleClick(screen.getByTestId('text-body'))

    const box = screen.getByRole('textbox')
    fireEvent.change(box, { target: { value: 'changed' } })
    fireEvent.blur(box)

    expect(onUpdate).toHaveBeenCalledWith(expect.objectContaining({ text: 'changed' }))
  })
})
```

- [ ] **Step 2: Run it and verify it fails**

Run: `npx vitest run test/TextItem.test.tsx`
Expected: FAIL — cannot resolve `TextItem`.

- [ ] **Step 3: Add `handlesFor` to `src/lib/resize.ts`**

```ts
/**
 * Which handles an element offers. Text derives its height from its content,
 * so a vertical handle would be a control that looks live and does nothing.
 */
export function handlesFor(element: BoardElement): ResizeHandle[] {
  return element.type === 'text' ? ['e', 'w'] : RESIZE_HANDLES
}
```

Add its test to `test/resize.test.ts`:

```ts
it('offers text only the horizontal handles', () => {
  expect(handlesFor(textElement)).toEqual(['e', 'w'])
})

it('offers every other element all eight', () => {
  expect(handlesFor(stickyElement)).toHaveLength(8)
})

it('never resizes text below the minimum width', () => {
  // The spec clamps to MIN_ELEMENT_SIZE; resizeRect already does, but nothing
  // asserted it held for an element whose height is not user-controlled.
  const next = resizeRect(textElement, 'w', { x: 10_000, y: 0 })
  expect(next.width).toBeGreaterThanOrEqual(MIN_ELEMENT_SIZE)
})
```

- [ ] **Step 4: Let `ResizeHandles` take a subset**

In `src/components/Canvas/ResizeHandles.tsx`, add to `ResizeHandlesProps`:

```ts
  /** Defaults to all eight. Text passes only the horizontal pair. */
  handles?: ResizeHandle[]
```

and render `(handles ?? RESIZE_HANDLES).map(...)` instead of `RESIZE_HANDLES.map(...)`.

- [ ] **Step 5: Write the component**

Create `src/components/Canvas/TextItem.tsx`:

```tsx
import React, { useState, useRef, useEffect, useMemo } from 'react'
import type { TextElement } from '../../types/whiteboard'
import { ResizeHandles } from './ResizeHandles'
import { handlesFor, type ResizeHandle } from '../../lib/resize'
import type { Point } from '../../lib/coordinates'
import { effectiveTextAlign, fontFamilyStack } from '../../lib/element-style'
import { dropShadowFilter, elevationFor } from '../../lib/elevation'
import { canvasMeasure, layoutText, LINE_HEIGHT } from '../../lib/text-layout'

/** One measurer for the whole app: it caches, and a per-render one would not. */
const measure = canvasMeasure()

interface TextItemProps {
  element: TextElement
  isSelected: boolean
  onSelect: (e: React.PointerEvent) => void
  onUpdate: (updated: Partial<TextElement>) => void
  onDragStart: (e: React.PointerEvent) => void
  onResizeStart?: (handle: ResizeHandle, e: React.PointerEvent) => void
  onResizeByKeyboard?: (handle: ResizeHandle, delta: Point) => void
  isDragging?: boolean
}

export function TextItem({
  element,
  isSelected,
  onSelect,
  onUpdate,
  onDragStart,
  onResizeStart,
  onResizeByKeyboard,
  isDragging = false,
}: TextItemProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [draft, setDraft] = useState(element.text)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => setDraft(element.text), [element.text])

  useEffect(() => {
    if (isEditing) inputRef.current?.focus()
  }, [isEditing])

  const layout = useMemo(
    () => layoutText(element.text, element.width, element, measure),
    [element.text, element.width, element.fontSize, element.fontFamily]
  )

  // The height is a cache and the text is the truth, so a disagreement is
  // corrected here — including one synced from a peer that measured
  // differently. Only on a real difference: a patch per keystroke would
  // flood the undo stack.
  useEffect(() => {
    if (Math.abs(layout.height - element.height) > 0.5) {
      onUpdate({ height: layout.height })
    }
  }, [layout.height, element.height, onUpdate])

  const align = effectiveTextAlign(element) ?? 'left'
  const colour = element.textColor ?? '#1e293b'

  const commit = () => {
    setIsEditing(false)
    if (draft !== element.text) onUpdate({ text: draft })
  }

  return (
    <div
      data-testid={`text-${element.id}`}
      className={`absolute z-10 group pointer-events-auto select-none ${
        isSelected ? 'ring-2 ring-blue-500' : ''
      }`}
      style={{
        left: `${element.x}px`,
        top: `${element.y}px`,
        width: `${element.width}px`,
        height: `${Math.max(layout.height, element.fontSize * LINE_HEIGHT)}px`,
        filter: dropShadowFilter(elevationFor({ isSelected, isDragging })),
      }}
      onPointerDown={(e) => {
        if (!isEditing) {
          onSelect(e)
          onDragStart(e)
        }
      }}
      onDoubleClick={(e) => {
        e.stopPropagation()
        setIsEditing(true)
      }}
    >
      {isEditing ? (
        <textarea
          ref={inputRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Escape') commit()
          }}
          style={{
            fontSize: `${element.fontSize}px`,
            fontFamily: fontFamilyStack(element.fontFamily),
            textAlign: align,
            lineHeight: LINE_HEIGHT,
            color: colour,
          }}
          className="w-full h-full bg-transparent outline-none resize-none"
        />
      ) : (
        <div
          data-testid="text-body"
          style={{
            fontSize: `${element.fontSize}px`,
            fontFamily: fontFamilyStack(element.fontFamily),
            textAlign: align,
            lineHeight: LINE_HEIGHT,
            color: colour,
          }}
        >
          {/* One node per laid-out line: the browser must not re-flow the
              text, or the screen and the export would break differently. */}
          {layout.lines.map((line, i) => (
            <div key={i} data-testid="text-line" style={{ whiteSpace: 'pre' }}>
              {line === '' ? ' ' : line}
            </div>
          ))}
        </div>
      )}

      {isSelected && onResizeStart && onResizeByKeyboard && (
        <ResizeHandles
          handles={handlesFor(element)}
          onResizeStart={onResizeStart}
          onResizeByKeyboard={onResizeByKeyboard}
        />
      )}
    </div>
  )
}
```

- [ ] **Step 6: Make `textPaddingFor` return 0 for text**

In `src/lib/element-style.ts`, add `text: 0` to `TEXT_PADDING` and a case in `supportsProperty`:

```ts
    case 'font':
    case 'align':
      return element.type === 'sticky' || element.type === 'shape' || element.type === 'text'
```

Text opts out of `fill`, `border`, `stroke`, `thickness` and `pattern` — no change needed, they already return false for unlisted types. Add a test to `test/element-style.test.ts` asserting exactly that for each.

- [ ] **Step 7: Run the tests and verify they pass**

Run: `npx vitest run test/TextItem.test.tsx test/resize.test.ts test/element-style.test.ts`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add src/components/Canvas/TextItem.tsx test/TextItem.test.tsx src/lib/resize.ts \
        src/components/Canvas/ResizeHandles.tsx src/lib/element-style.ts \
        test/resize.test.ts test/element-style.test.ts
git commit -m "feat(text): render text objects with a derived height (STU-953)"
```

---

### Task 4: Export, and the anti-divergence test

**Files:**
- Modify: `src/lib/board-export.ts`
- Test: `test/board-export.test.ts`

**Interfaces:**
- Consumes: `layoutText`, `estimateMeasure`, `cssFont`, `LINE_HEIGHT` from Task 1; `TextElement` from Task 2.
- Produces: `textSvg` (private) and a `'text'` branch in `elementSvg`.

- [ ] **Step 1: Write the failing test**

Add to `test/board-export.test.ts`:

```ts
describe('boardToSvg, with text objects', () => {
  const textEl = (over: Partial<TextElement> = {}): TextElement => ({
    id: 't1', type: 'text', x: 10, y: 20, width: 200, height: 54,
    zIndex: 1, createdAt: 0, updatedAt: 0, text: 'hello world', fontSize: 20, ...over,
  })

  it('emits one tspan per laid-out line', () => {
    const el = textEl()
    const expected = layoutText(el.text, el.width, el, estimateMeasure()).lines
    const svg = boardToSvg(board(el))

    expect(countOf(svg, '<tspan')).toBe(expected.length)
  })

  it('breaks exactly where the canvas breaks', () => {
    // The whole point of the design: one module, one measurer, so the
    // exported line breaks cannot drift from the ones on screen.
    const el = textEl({ text: 'the quick brown fox jumps', width: 120 })
    const measure = estimateMeasure()
    const { lines } = layoutText(el.text, el.width, el, measure)
    const svg = boardToSvg(board(el))

    // Plain words, so no XML escaping is involved — assert them directly.
    for (const line of lines) expect(svg).toContain(`>${line}</tspan>`)
    expect(countOf(svg, '<tspan')).toBe(lines.length)
  })

  it('uses textColor when set', () => {
    expect(boardToSvg(board(textEl({ textColor: '#dc2626' })))).toContain('fill="#dc2626"')
  })

  it('falls back to slate-800 when textColor is unset', () => {
    expect(boardToSvg(board(textEl()))).toContain('fill="#1e293b"')
  })

  it('draws no box, no fill and no border around it', () => {
    const svg = withoutDefs(boardToSvg(board(textEl())))
    // Only the page background rect; a text object paints nothing but words.
    expect(countOf(svg, '<rect')).toBe(1)
  })

  it('emits nothing for an empty text object', () => {
    expect(boardToSvg(board(textEl({ text: '' })))).not.toContain('<tspan')
  })
})
```

- [ ] **Step 2: Run it and verify it fails**

Run: `npx vitest run test/board-export.test.ts`
Expected: FAIL — no `<tspan>` emitted for a text element.

- [ ] **Step 3: Implement `textSvg`**

In `src/lib/board-export.ts`:

```ts
import { canvasMeasure, estimateMeasure, layoutText, LINE_HEIGHT } from './text-layout'

/** The export runs in the browser, so it uses the same real metrics the
 * canvas does; the estimate is only reached for outside one. */
const measureForExport =
  typeof document === 'undefined' ? estimateMeasure() : canvasMeasure()

/** Bare words: no card, no border, one tspan per laid-out line. */
function textSvg(el: TextElement): string {
  const { lines } = layoutText(el.text, el.width, el, measureForExport)
  if (lines.length === 0) return ''

  const align = effectiveTextAlign(el) ?? 'left'
  const x = textXFor(align, el.x, el.width, 0)
  const lineHeight = el.fontSize * LINE_HEIGHT

  const tspans = lines
    .map((line, i) => `<tspan x="${x}" y="${el.y + el.fontSize + i * lineHeight}">${escapeXml(line)}</tspan>`)
    .join('')

  return (
    `<text font-family="${escapeXml(fontFamilyStack(el.fontFamily))}" ` +
    `font-size="${el.fontSize}" text-anchor="${textAnchorFor(align)}" ` +
    `fill="${el.textColor ?? '#1e293b'}">${tspans}</text>`
  )
}
```

Add `case 'text': return textSvg(el)` to `elementSvg`.

- [ ] **Step 4: Run the tests and verify they pass**

Run: `npx vitest run test/board-export.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/board-export.ts test/board-export.test.ts
git commit -m "feat(text): export text objects with the canvas's own line breaks (STU-953)"
```

---

### Task 5: Group the shape tools to make room

**Files:**
- Modify: `src/components/UI/Toolbar.tsx`
- Test: `test/Toolbar.test.tsx`
- Modify: `e2e/fill-pattern.spec.ts`, `e2e/stack-order.spec.ts`

**Interfaces:**
- Consumes: `CanvasTool` from `src/types`.
- Produces: a `shape` group button with a flyout containing `rectangle` and `circle`.

**Why:** measured at 393px, the toolbar is 374px wide with 8 tools at 47px each. A ninth overflows by 28px. The buttons are already 42px, just under WCAG 2.5.5's 44px target, so shrinking them is not available.

- [ ] **Step 1: Write the failing test**

Add to `test/Toolbar.test.tsx`:

```tsx
describe('the shape group', () => {
  it('shows one Shape button rather than two shape tools', () => {
    render(<Toolbar activeTool="select" onToolChange={vi.fn()} />)
    expect(screen.getByRole('button', { name: 'Shape' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Rectangle' })).not.toBeInTheDocument()
  })

  it('opens a flyout holding both shapes', () => {
    render(<Toolbar activeTool="select" onToolChange={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: 'Shape' }))

    expect(screen.getByRole('button', { name: 'Rectangle' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Circle' })).toBeInTheDocument()
  })

  it('picks the tool and closes the flyout', () => {
    const onToolChange = vi.fn()
    render(<Toolbar activeTool="select" onToolChange={onToolChange} />)
    fireEvent.click(screen.getByRole('button', { name: 'Shape' }))
    fireEvent.click(screen.getByRole('button', { name: 'Circle' }))

    expect(onToolChange).toHaveBeenCalledWith('circle')
    expect(screen.queryByRole('button', { name: 'Circle' })).not.toBeInTheDocument()
  })

  it('marks the group active while either shape is the tool', () => {
    render(<Toolbar activeTool="circle" onToolChange={vi.fn()} />)
    expect(screen.getByRole('button', { name: 'Shape' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('closes the flyout on Escape and returns focus to the group', () => {
    render(<Toolbar activeTool="select" onToolChange={vi.fn()} />)
    const group = screen.getByRole('button', { name: 'Shape' })
    fireEvent.click(group)
    fireEvent.keyDown(screen.getByRole('button', { name: 'Rectangle' }), { key: 'Escape' })

    expect(screen.queryByRole('button', { name: 'Rectangle' })).not.toBeInTheDocument()
    expect(group).toHaveFocus()
  })

  it('still offers the text tool', () => {
    render(<Toolbar activeTool="select" onToolChange={vi.fn()} />)
    expect(screen.getByRole('button', { name: 'Text' })).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run it and verify it fails**

Run: `npx vitest run test/Toolbar.test.tsx`
Expected: FAIL — no button named `Shape`.

- [ ] **Step 3: Implement the group**

In `src/components/UI/Toolbar.tsx`, remove the `rectangle` and `circle` entries from `TOOLS` and add `{ tool: 'text', icon: Type, label: 'Text', shortcut: 'T' }`. Then add the group, rendered in the toolbar where the shape tools used to sit:

```tsx
const SHAPE_TOOLS: Array<{ tool: CanvasTool; icon: React.ElementType; label: string }> = [
  { tool: 'rectangle', icon: Square, label: 'Rectangle' },
  { tool: 'circle', icon: Circle, label: 'Circle' },
]

function ShapeGroup({
  activeTool,
  onToolChange,
  tabIndex,
}: {
  activeTool: CanvasTool
  onToolChange: (tool: CanvasTool) => void
  tabIndex: number
}) {
  const [isOpen, setIsOpen] = useState(false)
  const groupRef = useRef<HTMLButtonElement>(null)
  const isActive = SHAPE_TOOLS.some(({ tool }) => tool === activeTool)

  // Escape closes and hands focus back, so the flyout is never a keyboard trap.
  const close = () => {
    setIsOpen(false)
    groupRef.current?.focus()
  }

  return (
    <div className="relative">
      {isOpen && (
        <div
          role="group"
          aria-label="Shapes"
          className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 flex gap-1
                     rounded-xl bg-white p-1 shadow-lg ring-1 ring-slate-200"
        >
          {SHAPE_TOOLS.map(({ tool, icon: Icon, label }) => (
            <button
              key={tool}
              type="button"
              aria-label={label}
              aria-pressed={activeTool === tool}
              onClick={() => {
                onToolChange(tool)
                setIsOpen(false)
              }}
              onKeyDown={(e) => {
                if (e.key === 'Escape') close()
              }}
              className="w-10 h-10 grid place-items-center rounded-lg hover:bg-slate-100"
            >
              <Icon className="w-5 h-5" aria-hidden="true" />
            </button>
          ))}
        </div>
      )}

      <button
        ref={groupRef}
        type="button"
        aria-label="Shape"
        aria-pressed={isActive}
        aria-haspopup="true"
        aria-expanded={isOpen}
        tabIndex={tabIndex}
        onClick={() => setIsOpen((open) => !open)}
        onKeyDown={(e) => {
          if (e.key === 'Escape' && isOpen) close()
        }}
        className={`w-[42px] h-[42px] grid place-items-center rounded-xl transition-colors ${
          isActive ? 'bg-blue-500 text-white' : 'text-slate-600 hover:bg-slate-100'
        }`}
      >
        <Shapes className="w-5 h-5" aria-hidden="true" />
      </button>
    </div>
  )
}
```

The toolbar keeps its APG roving-tabindex behaviour: the group button is one stop within it, and the flyout's own buttons are reached by tabbing once it is open.

- [ ] **Step 4: Run the tests and verify they pass**

Run: `npx vitest run test/Toolbar.test.tsx`
Expected: PASS.

- [ ] **Step 5: Fix the two E2E specs that name the old buttons**

`e2e/fill-pattern.spec.ts` and `e2e/stack-order.spec.ts` both click `Rectangle` or `Circle` directly. Add a helper to each and use it:

```ts
async function pickShape(page: Page, name: 'Rectangle' | 'Circle') {
  await page.getByRole('button', { name: 'Shape' }).click()
  await page.getByRole('button', { name, exact: true }).click()
}
```

- [ ] **Step 6: Verify the toolbar still fits at 393px**

Run: `npx playwright test` — both projects must pass. Then confirm the measurement by hand: the toolbar must stay under 393px wide on `chromium-mobile` with the text tool present.

- [ ] **Step 7: Commit**

```bash
git add src/components/UI/Toolbar.tsx test/Toolbar.test.tsx e2e/fill-pattern.spec.ts e2e/stack-order.spec.ts
git commit -m "feat(ui): group the shape tools and add the text tool (STU-953)"
```

---

### Task 6: Wire the text tool into the board

**Files:**
- Modify: `src/lib/board-selectors.ts` — **added by Ruling 10, see below**
- Modify: `src/App.tsx`
- Modify: `src/lib/tool-shortcuts.ts`
- Test: `test/board-selectors.test.ts`, `test/App.test.tsx`, `test/tool-shortcuts.test.ts`

**Ruling 10 — this task owns `board-selectors.ts`.** The original plan named no
owner for it, which would have shipped an invisible feature. `BoardLayers`
declares four typed arrays and `partitionElements` switches over element type
with **no `default` clause**, so a `TextElement` is silently dropped from every
render layer — and since there is no `default`, TypeScript exhaustiveness can
never flag it. `partitionElements` is the sole source of `stackedElements` in
`App.tsx`, so without this the element renders as nothing at all.

Required here, before the App wiring:

```ts
// src/lib/board-selectors.ts
export interface BoardLayers {
  stickies: StickyElement[]
  shapes: ShapeElement[]
  connectors: ConnectorElement[]
  drawings: DrawingElement[]
  texts: TextElement[]
}
```

with a `case 'text': layers.texts.push(el); break` in `partitionElements`, and
a failing test first in `test/board-selectors.test.ts`:

```ts
it('gives text objects a layer of their own', () => {
  const layers = partitionElements(new Map([[textEl.id, textEl]]))
  expect(layers.texts).toEqual([textEl])
})
```

Also confirm `findElementAt` hit-tests a text element — it shares `containsPoint`
with the other types, so it should, but it is untested for text and a text object
that cannot be clicked cannot be selected.

**Interfaces:**
- Consumes: `createTextElement`, `TEXT_DEFAULT_WIDTH` from Task 2; `TextItem` from Task 3.
- Produces: text creation, selection, and deletion of emptied text.

- [ ] **Step 1: Write the failing test**

Add to `test/App.test.tsx`:

```tsx
it('creates a text object where the canvas is clicked', async () => {
  renderApp()
  await pickTool('Text')
  clickCanvasAt(200, 160)

  expect(await screen.findByTestId(/^text-/)).toBeInTheDocument()
})

it('removes a text object whose text is emptied', async () => {
  // Review Focus 1: an invisible object nobody can select is a trap.
  renderApp()
  await pickTool('Text')
  clickCanvasAt(200, 160)

  const el = await screen.findByTestId(/^text-/)
  fireEvent.doubleClick(within(el).getByTestId('text-body'))
  const box = screen.getByRole('textbox')
  fireEvent.change(box, { target: { value: '   ' } })
  fireEvent.blur(box)

  expect(screen.queryByTestId(/^text-/)).not.toBeInTheDocument()
})
```

Add to `test/tool-shortcuts.test.ts`:

```ts
it('maps T to the text tool', () => {
  expect(toolForKey('t')).toBe('text')
})
```

- [ ] **Step 2: Run them and verify they fail**

Run: `npx vitest run test/App.test.tsx test/tool-shortcuts.test.ts`
Expected: FAIL — no text element is created; `toolForKey('t')` returns null.

- [ ] **Step 3: Implement the wiring**

Add `'text'` to `CanvasTool`, and `t: 'text'` to the map in `src/lib/tool-shortcuts.ts`.

In `App.tsx`, create on canvas press, following the `sticky` branch already there:

```tsx
if (activeTool === 'text') {
  const element = createTextElement(pointerWorld(e), { zIndex: nextZIndex() })
  addElement(doc, element)
  setSelectedIds([element.id])
  setActiveTool('select')
  return
}
```

Render it in the element loop beside `StickyNote` and `ShapeItem`:

```tsx
{element.type === 'text' && (
  <TextItem
    key={element.id}
    element={element}
    isSelected={selectedIds.includes(element.id)}
    isDragging={draggingIds.includes(element.id)}
    onSelect={(e) => selectElement(element.id, e)}
    onUpdate={(patch) => updateTextElement(element, patch)}
    onDragStart={(e) => beginDrag(element.id, e)}
    onResizeStart={(handle, e) => beginResize(element.id, handle, e)}
    onResizeByKeyboard={(handle, delta) => resizeByKeyboard(element.id, handle, delta)}
  />
)}
```

And delete rather than patch when the text is emptied:

```tsx
/** An emptied text object leaves nothing to see or select, so it goes. */
function updateTextElement(element: TextElement, patch: Partial<TextElement>) {
  if (patch.text !== undefined && patch.text.trim() === '') {
    removeElements(doc, [element.id])
    return
  }
  patchElement(doc, element.id, patch)
}
```

- [ ] **Step 4: Run the tests and verify they pass**

Run: `npx vitest run`
Expected: PASS, whole suite.

- [ ] **Step 5: Commit**

```bash
git add src/App.tsx src/lib/tool-shortcuts.ts test/App.test.tsx test/tool-shortcuts.test.ts
git commit -m "feat(text): create, select and clean up text objects (STU-953)"
```

---

### Task 7: The text colour control

**Files:**
- Modify: `src/lib/element-colors.ts` (a `TEXT_SWATCHES` palette)
- Modify: `src/components/UI/PropertiesBar.tsx`
- Modify: `src/components/Canvas/StickyNote.tsx`, `src/components/Canvas/ShapeItem.tsx`
- Modify: `src/lib/board-export.ts` (sticky and shape labels honour `textColor`)
- Test: `test/PropertiesBar.test.tsx`, `test/element-colors.test.ts`, `test/board-export.test.ts`

**Interfaces:**
- Consumes: `textColor` from Task 2.
- Produces: `TEXT_SWATCHES`, `onTextColorChange` on `PropertiesBar`.

- [ ] **Step 1: Write the failing test**

Add to `test/PropertiesBar.test.tsx`:

```tsx
describe('text colour', () => {
  it('offers the row for a text object, a note and a shape', () => {
    for (const el of [textElement, stickyElement, shapeElement]) {
      const { unmount } = renderBar([el])
      expect(screen.getByRole('button', { name: 'Text colour' })).toBeInTheDocument()
      unmount()
    }
  })

  it('does not offer it for an arrow', () => {
    renderBar([connectorElement])
    expect(screen.queryByRole('button', { name: 'Text colour' })).not.toBeInTheDocument()
  })

  it('applies the colour that was chosen', () => {
    const handlers = renderBar([textElement])
    fireEvent.click(screen.getByRole('button', { name: 'Text colour' }))
    fireEvent.click(screen.getByRole('button', { name: colorName(TEXT_SWATCHES[1]) }))

    expect(handlers.onTextColorChange).toHaveBeenCalledWith(TEXT_SWATCHES[1])
  })

  it('marks nothing active when two elements disagree', () => {
    renderBar([textElement, { ...textElement, id: 'b', textColor: '#dc2626' }])
    fireEvent.click(screen.getByRole('button', { name: 'Text colour' }))
    const pressed = screen.getAllByRole('button', { pressed: true })
    expect(pressed).toHaveLength(0)
  })
})
```

- [ ] **Step 2: Run it and verify it fails**

Run: `npx vitest run test/PropertiesBar.test.tsx`
Expected: FAIL — no `Text colour` button.

- [ ] **Step 3: Implement**

Add `TEXT_SWATCHES` to `element-colors.ts` (near-black, slate, red, amber, green, blue, violet). Add `'textColor'` to `StyleProperty`, true for `sticky`, `shape` and `text`. Add the row to `PropertiesBar` following the existing `Swatch` pattern with `aria-pressed`, using a sentinel comparison so a mixed selection marks nothing — the same trap as STU-925's `sharedValue`. Render `element.textColor ?? '#1e293b'` in `StickyNote`, `ShapeItem`, and both `stickySvg` and `shapeLabelSvg`.

- [ ] **Step 4: Run the tests and verify they pass**

Run: `npx vitest run`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/element-colors.ts src/lib/element-style.ts src/components/UI/PropertiesBar.tsx \
        src/components/Canvas/StickyNote.tsx src/components/Canvas/ShapeItem.tsx \
        src/lib/board-export.ts test/
git commit -m "feat(ui): add a text colour control for every label (STU-953)"
```

---

### Task 8: E2E, the ugly pass, and documentation

**Files:**
- Create: `e2e/text-object.spec.ts`
- Modify: `CHANGELOG.md`, `MEMORY.md`, `README.md`, `knowledge/ERRORS.md`, `docs/context/STU-953.md`

- [ ] **Step 1: Write the E2E spec**

Create `e2e/text-object.spec.ts` covering: creating a text object with the tool; typing and watching the height grow; resizing the width from the east handle and seeing the height change with the reflow; the absence of vertical handles; emptying the text and seeing the object disappear; the text colour control; and an export carrying the same line breaks. Use a viewport-aware placement helper as `e2e/fill-pattern.spec.ts` does, and pin elements by `data-testid` rather than `.last()`.

- [ ] **Step 2: Run it on both projects**

Run: `npx playwright test e2e/text-object.spec.ts`
Expected: PASS on `chromium-desktop` and `chromium-mobile`.

- [ ] **Step 3: Run the ugly pass**

Screenshot and eyeball, per the STU-952 convention: a 40-character unbroken word in a 120px box; text at the smallest font size; a text object at the left screen edge (STU-927 territory — place it so the panel lands on screen); and the toolbar at 393px with the flyout open. Delete the throwaway spec afterwards.

- [ ] **Step 4: Run the accessibility sweep**

Run: `AXE_ENFORCE=1 npx playwright test`
Expected: PASS. The shape flyout is new interactive markup — if axe flags it, fix it rather than silencing it.

- [ ] **Step 5: Update the docs**

`CHANGELOG.md` — merge into the existing `### Added` heading under `[Unreleased]`; do not prepend a new heading block. `MEMORY.md` — a dated entry. `README.md` — text objects in the feature list. `knowledge/ERRORS.md` — anything the build turned up. `docs/context/STU-953.md` — fill in the dispatch log and append any new traps.

- [ ] **Step 6: Run every gate**

```bash
npx vitest run && npm run typecheck && npm run lint && npm run coverage:check && AXE_ENFORCE=1 npx playwright test
```

- [ ] **Step 7: Commit**

```bash
git add e2e/text-object.spec.ts CHANGELOG.md MEMORY.md README.md knowledge/ERRORS.md docs/context/STU-953.md
git commit -m "test(e2e): cover text objects end to end, and document them (STU-953)"
```
