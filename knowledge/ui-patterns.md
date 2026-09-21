# UI Patterns — manfred-whiteboard

Proven UI construction patterns, seeded from downstream projects (manfred-workshops,
2026-07-13). Reach for these before inventing a variant; extend the file as new patterns
prove themselves.

---

## Clickable card (stretched link)

Make the whole card a hit area without adding any new interactive element:

- `relative` on the Card; `after:absolute after:inset-0` on the **existing** title link.
- Card action buttons sit above the stretched link via `relative z-10`.

Keyboard and assistive-tech semantics are unchanged by construction — there is still
exactly one link, it just paints a bigger hit area.

```tsx
<Card className="relative">
  <a href={href} className="after:absolute after:inset-0">{title}</a>
  <Button className="relative z-10">Action</Button>
</Card>
```

---

## Card footer with actions

Don't put meta info and actions in one flex row — five items in a single row wraps into
a jumble as soon as two actions land. Instead, stack two rows behind a `border-t`:

1. **Meta row:** badges/counts left, right-aligned truncated attribution.
2. **Action bar:** right-aligned, below the meta row.

---

## Design-system icon gaps (stopgap)

When the design system's curated `IconName` set lacks a glyph, do **not** reach for a raw
emoji or an off-system icon library. Ship a local SVG drawn to the DS Icon conventions:

- Heroicons Outline path, `24` viewBox, `1.5` stroke, `currentColor`.
- Add a swap-later comment referencing the ticket that requests the icon upstream in
  `manfred-design-system` (`iconPaths.ts`).

Swap to the DS icon and delete the local SVG once the upstream icon ships.

---

## ARIA toolbar: one tab stop, not N

A row of icon buttons is not a `nav` landmark, and `role="toolbar"` on a `<nav>` trips
`jsx-a11y/no-noninteractive-element-to-interactive-role`. Use a `div` with
`role="toolbar"` and implement the APG pattern:

- **Roving tabindex:** the active item is `tabIndex={0}`, every other item `-1`, so the
  whole toolbar is a single tab stop.
- **Arrow keys** move focus with wrap-around; **Home/End** jump to the ends.
- **Focus never activates.** Moving focus must not change the selected tool — otherwise
  a keyboard user changes state just by exploring.

Keep refs in a `useRef<Array<HTMLButtonElement | null>>` and `.focus()` the target.

---

## Focusable canvas regions (and the lint rules that fight you)

A pannable/zoomable canvas must take focus and respond to keys (WCAG 2.1.1), but
`role="region"` is non-interactive, so `jsx-a11y` rejects both `tabIndex` and
`onKeyDown` on it. Two rules fire, and they report on *different* lines — the element
for `no-noninteractive-element-interactions`, the attribute for
`no-noninteractive-tabindex`, so one disable comment above the tag will not cover both.

Prefer **scoped, commented disables on that one element** over relaxing the rules in
`eslint.config.js`: the exemption is only legitimate while the region really does
handle keys, and a project-wide `roles: ['region']` silently blesses every future dead
tab stop. State the dependency in the comment.

Keep the key mapping itself out of the component — a pure
`viewportFromKey(viewport, key, opts)` is testable without rendering the canvas — and
announce the shortcuts in the region's `aria-label`.

