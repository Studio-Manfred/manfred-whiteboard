import React, { useLayoutEffect, useRef, useState } from 'react'
import { AlignCenter, AlignLeft, AlignRight, Layers, Minus } from 'lucide-react'
import { useRovingTabindex } from '../../hooks/useRovingTabindex'
import { BarPopover } from './BarPopover'
import {
  BORDER_SWATCHES,
  FILL_SWATCHES,
  TEXT_SWATCHES,
  NO_FILL,
  colorName,
  currentFillOf,
  currentTextColorOf,
} from '../../lib/element-colors'
import {
  effectiveFontSize,
  effectiveTextAlign,
  TEXT_ALIGNS,
  FONT_FAMILIES,
  FONT_SIZES,
  STROKE_WIDTHS,
  arrowheadsOf,
  fontFamilyStack,
  sharedValue,
  supportsProperty,
  type Arrowheads,
  type StyleProperty,
} from '../../lib/element-style'
import {
  FILL_PATTERNS,
  NO_PATTERN,
  currentPatternOf,
  patternLabel,
  patternTile,
  type FillPattern,
} from '../../lib/fill-patterns'
import { contextBarPosition, PANEL_ALLOWANCE } from '../../lib/context-bar'
import { useWindowSize } from '../../hooks/useWindowSize'
import type { Rect } from '../../lib/marquee'
import type { Viewport } from '../../lib/coordinates'
import type { StackCommand } from '../../lib/stacking'
import type {
  BoardElement,
  ConnectorElement,
  FontFamily,
  ShapeElement,
  TextAlign,
} from '../../types/whiteboard'

const ARROWHEAD_OPTIONS: ReadonlyArray<{ value: Arrowheads; label: string; glyph: string }> = [
  { value: 'none', label: 'No arrowheads', glyph: '—' },
  { value: 'start', label: 'Arrowhead at the start', glyph: '←' },
  { value: 'end', label: 'Arrowhead at the end', glyph: '→' },
  { value: 'both', label: 'Arrowheads at both ends', glyph: '↔' },
]

/** Used until the bar has measured itself — one layout pass, before paint. */
const ESTIMATED_SIZE = { width: 220, height: 44 }

const ALIGN_ICONS: Record<TextAlign, typeof AlignLeft> = {
  left: AlignLeft,
  center: AlignCenter,
  right: AlignRight,
}

const STACK_OPTIONS: ReadonlyArray<{ value: StackCommand; label: string }> = [
  { value: 'front', label: 'Bring to front' },
  { value: 'forward', label: 'Bring forward' },
  { value: 'backward', label: 'Send backward' },
  { value: 'back', label: 'Send to back' },
]

export interface PropertiesBarProps {
  selection: BoardElement[]
  /** World-space box the bar should sit beside. */
  bounds: Rect
  viewport: Viewport
  onFillChange: (color: string) => void
  onStrokeColorChange: (color: string) => void
  onThicknessChange: (width: number) => void
  onFontSizeChange: (size: number) => void
  onFontFamilyChange: (family: FontFamily) => void
  onArrowheadsChange: (choice: Arrowheads) => void
  onStackChange: (command: StackCommand) => void
  onTextAlignChange: (align: TextAlign) => void
  onPatternChange: (pattern: FillPattern | undefined) => void
  onTextColorChange: (color: string) => void
}

function Swatch({
  color,
  isCurrent,
  onSelect,
}: {
  color: string
  isCurrent: boolean
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      aria-label={colorName(color)}
      aria-pressed={isCurrent}
      onClick={onSelect}
      style={color === NO_FILL ? undefined : { backgroundColor: color }}
      className={`relative w-6 h-6 rounded-full border transition-transform hover:scale-110 ${
        isCurrent ? 'border-blue-500 ring-2 ring-blue-500/40' : 'border-slate-300'
      } ${color === NO_FILL ? 'bg-white' : ''}`}
    >
      {color === NO_FILL && (
        <span
          aria-hidden="true"
          className="absolute inset-0 m-auto h-px w-5 rotate-45 bg-red-400"
        />
      )}
    </button>
  )
}

function OptionList({
  options,
  current,
  onSelect,
}: {
  options: ReadonlyArray<{ value: string | number; label: string; preview?: React.ReactNode }>
  current: string | number | null
  onSelect: (value: never) => void
}) {
  return (
    <div
      className="flex flex-col gap-0.5 min-w-[9.5rem] overflow-y-auto"
      // PANEL_ALLOWANCE is how much headroom `contextBarPosition` assumes a
      // panel needs before it will let the bar open upward
      // (context-bar.ts:94). Imported, not retyped, so the two cannot drift
      // apart — a longer option list scrolls instead of running off-screen.
      // A computed value can't go through `className`: Tailwind only
      // generates classes from literal strings, not a runtime variable.
      style={{ maxHeight: `${PANEL_ALLOWANCE}px` }}
    >
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-label={option.label}
          aria-pressed={option.value === current}
          onClick={() => onSelect(option.value as never)}
          className={`flex items-center justify-between gap-3 whitespace-nowrap px-2 py-1.5 rounded-lg text-sm text-left transition-colors ${
            option.value === current
              ? 'bg-blue-50 text-blue-700'
              : 'text-slate-700 hover:bg-slate-100'
          }`}
        >
          <span>{option.label}</span>
          {option.preview}
        </button>
      ))}
    </div>
  )
}

/**
 * A fill-pattern option in the picker: a small SVG preview built from the
 * same tile the canvas and the export draw, so a chip can never advertise a
 * pattern the shape won't actually paint.
 */
function PatternChip({
  pattern,
  isCurrent,
  onSelect,
}: {
  pattern: FillPattern | typeof NO_PATTERN
  isCurrent: boolean
  onSelect: () => void
}) {
  const label = pattern === NO_PATTERN ? 'No pattern' : patternLabel(pattern)
  const tile = pattern === NO_PATTERN ? null : patternTile(pattern)

  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={isCurrent}
      onClick={onSelect}
      className={`relative flex items-center justify-center w-7 h-7 rounded-lg border bg-white transition-transform hover:scale-110 ${
        isCurrent ? 'border-blue-500 ring-2 ring-blue-500/40' : 'border-slate-300'
      }`}
    >
      {tile ? (
        // Tiled, not drawn once: a single tile of `checker` is two offset
        // squares and a single tile of `dots` is one dot — true geometry that
        // reads as nothing. One scale for all five keeps their relative
        // densities honest, so a chip looks like the shape will.
        <svg aria-hidden="true" width={20} height={20} viewBox="0 0 20 20">
          <defs>
            <pattern
              id={`chip-${pattern}`}
              width={tile.size}
              height={tile.size}
              patternUnits="userSpaceOnUse"
              patternTransform="scale(0.5)"
            >
              {tile.marks.map((mark, index) => (
                <path
                  key={index}
                  d={mark.d}
                  fill={mark.kind === 'fill' ? '#0f172a' : 'none'}
                  stroke={mark.kind === 'stroke' ? '#0f172a' : 'none'}
                  strokeWidth={tile.strokeWidth}
                />
              ))}
            </pattern>
          </defs>
          <rect width={20} height={20} fill={`url(#chip-${pattern})`} />
        </svg>
      ) : (
        <span
          aria-hidden="true"
          className="absolute inset-0 m-auto h-px w-5 rotate-45 bg-red-400"
        />
      )}
    </button>
  )
}

/**
 * Properties for whatever is selected, floating beside it. Only the controls
 * that apply to the selection are shown, so the bar stays small.
 */
export function PropertiesBar({
  selection,
  bounds,
  viewport,
  onFillChange,
  onStrokeColorChange,
  onThicknessChange,
  onFontSizeChange,
  onFontFamilyChange,
  onArrowheadsChange,
  onStackChange,
  onTextAlignChange,
  onPatternChange,
  onTextColorChange,
}: PropertiesBarProps) {
  // The bar's width depends on how many controls the selection needs, so it
  // has to measure itself to sit centred over that selection.
  const barRef = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState(ESTIMATED_SIZE)
  const windowSize = useWindowSize()

  const has = (property: StyleProperty) =>
    selection.some((el) => supportsProperty(el, property))

  const controls: StyleProperty[] = (
    [
      'fill',
      'border',
      'stroke',
      'thickness',
      'font',
      'textColor',
      'align',
      'arrowheads',
      'stacking',
    ] as StyleProperty[]
  ).filter(has)
  // 'font' contributes two controls: size and family.
  const itemCount = controls.length + (has('font') ? 1 : 0)
  const roving = useRovingTabindex(itemCount)

  let itemIndex = 0
  /** BarPopover forwards the ref to its trigger under a name of its own. */
  const nextItem = () => {
    const { ref, ...rest } = roving.itemProps(itemIndex++)
    return { buttonRef: ref, ...rest }
  }


  const fillTargets = selection.filter((el) => supportsProperty(el, 'fill'))
  const currentFill = fillTargets.length === 1 ? currentFillOf(fillTargets[0]) : null
  const currentStroke = sharedValue<string>(
    selection.filter((el) => supportsProperty(el, 'border') || supportsProperty(el, 'stroke')),
    'strokeColor'
  )
  const currentThickness = sharedValue<number>(selection, 'strokeWidth')
  const fontSizes = selection
    .map(effectiveFontSize)
    .filter((size): size is number => size !== null)
  const currentFontSize =
    fontSizes.length > 0 && fontSizes.every((size) => size === fontSizes[0])
      ? fontSizes[0]
      : null
  const currentFontFamily = sharedValue<FontFamily>(selection, 'fontFamily') ?? 'sans'
  const alignments = selection
    .map(effectiveTextAlign)
    .filter((align): align is TextAlign => align !== null)
  const currentAlign =
    alignments.length > 0 && alignments.every((align) => align === alignments[0])
      ? alignments[0]
      : null
  const arrows = selection.filter(
    (el): el is ConnectorElement => el.type === 'connector'
  )
  const currentArrowheads =
    arrows.length > 0 &&
    arrows.every((a) => arrowheadsOf(a) === arrowheadsOf(arrows[0]))
      ? arrowheadsOf(arrows[0])
      : null
  // Not `sharedValue`: it filters out `undefined`, which would drop a plain
  // shape out of the comparison rather than count it as disagreement (see
  // `currentPatternOf`).
  const patternTargets = selection.filter(
    (el): el is ShapeElement => supportsProperty(el, 'pattern')
  )
  const currentPattern =
    patternTargets.length > 0 &&
    patternTargets.every(
      (el) => currentPatternOf(el) === currentPatternOf(patternTargets[0])
    )
      ? currentPatternOf(patternTargets[0])
      : null
  // Same reasoning as `currentPattern` above, not `sharedValue`: an element
  // with no explicit textColor must not silently drop out of the comparison.
  const textColorTargets = selection.filter((el) => supportsProperty(el, 'textColor'))
  const currentTextColor =
    textColorTargets.length > 0 &&
    textColorTargets.every(
      (el) => currentTextColorOf(el) === currentTextColorOf(textColorTargets[0])
    )
      ? currentTextColorOf(textColorTargets[0])
      : null

  useLayoutEffect(() => {
    const el = barRef.current
    if (!el) return

    const measure = () => {
      const box = el.getBoundingClientRect()
      if (box.width === 0) return
      setSize((previous) =>
        previous.width === box.width && previous.height === box.height
          ? previous
          : { width: box.width, height: box.height }
      )
    }

    measure()

    // The bar changes width as the selection changes which controls it needs.
    // jsdom has no ResizeObserver; there the estimate above stands in.
    if (typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(measure)
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const position =
    contextBarPosition(bounds, viewport, size, windowSize) ?? {
      x: 0,
      y: 0,
      placement: 'above' as const,
    }

  /** Panels open away from the selection so they never cover it. */
  const panelPlacement = position.placement === 'above' ? ('up' as const) : ('down' as const)

  return (
    <div
      ref={barRef}
      role="toolbar"
      aria-label="Selection properties"
      aria-orientation="horizontal"
      data-testid="properties-bar"
      data-placement={position.placement}
      style={{ left: `${position.x}px`, top: `${position.y}px` }}
      // The bar must not disturb the board underneath it.
      onPointerDown={(e) => e.stopPropagation()}
      // Above the top bar, so a panel opening upward is never swallowed by it.
      className="fixed z-50 flex items-center gap-1 px-2 py-1.5 rounded-xl bg-white/95 backdrop-blur-xl border border-slate-200 shadow-xl shadow-slate-900/10"
    >
      {has('fill') && (
        <BarPopover
          label="Fill colour"
          {...nextItem()}
          panelPlacement={panelPlacement}
          renderPanel={(close) => (
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-1.5">
                {FILL_SWATCHES.map((color) => (
                  <Swatch
                    key={color}
                    color={color}
                    isCurrent={color === currentFill}
                    onSelect={() => {
                      onFillChange(color)
                      close()
                    }}
                  />
                ))}
              </div>
              {/* A shape's fill can also carry a retro mono pattern. Notes
                  have no such thing, so the row only shows up when a shape is
                  part of the selection. */}
              {has('pattern') && (
                <div className="flex items-center gap-1.5">
                  <PatternChip
                    pattern={NO_PATTERN}
                    isCurrent={currentPattern === NO_PATTERN}
                    onSelect={() => {
                      onPatternChange(undefined)
                      close()
                    }}
                  />
                  {FILL_PATTERNS.map((pattern) => (
                    <PatternChip
                      key={pattern}
                      pattern={pattern}
                      isCurrent={pattern === currentPattern}
                      onSelect={() => {
                        onPatternChange(pattern)
                        close()
                      }}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        >
          <span
            aria-hidden="true"
            style={currentFill && currentFill !== NO_FILL ? { backgroundColor: currentFill } : undefined}
            className={`w-5 h-5 rounded-full border border-slate-300 ${
              !currentFill || currentFill === NO_FILL ? 'bg-white' : ''
            }`}
          />
        </BarPopover>
      )}

      {(has('border') || has('stroke')) && (
        <BarPopover
          label={has('border') ? 'Border colour' : 'Line colour'}
          {...nextItem()}
          panelPlacement={panelPlacement}
          renderPanel={(close) => (
            <div className="flex items-center gap-1.5">
              {BORDER_SWATCHES.map((color) => (
                <Swatch
                  key={color}
                  color={color}
                  isCurrent={color === currentStroke}
                  onSelect={() => {
                    onStrokeColorChange(color)
                    close()
                  }}
                />
              ))}
            </div>
          )}
        >
          <span
            aria-hidden="true"
            style={{ borderColor: currentStroke ?? '#94a3b8' }}
            className="w-5 h-5 rounded-full border-[3px] bg-white"
          />
        </BarPopover>
      )}

      {(has('thickness') || has('border')) && (
        <BarPopover
          label="Thickness"
          {...nextItem()}
          panelPlacement={panelPlacement}
          renderPanel={(close) => (
            <OptionList
              current={currentThickness}
              options={STROKE_WIDTHS.map((width) => ({
                value: width,
                label: `${width} px`,
                preview: (
                  <span
                    aria-hidden="true"
                    style={{ height: `${width}px` }}
                    className="w-10 rounded-full bg-slate-700"
                  />
                ),
              }))}
              onSelect={(width: number) => {
                onThicknessChange(width)
                close()
              }}
            />
          )}
        >
          <Minus size={16} strokeWidth={Math.min(4, currentThickness ?? 2)} aria-hidden="true" />
        </BarPopover>
      )}

      {has('font') && (
        <>
          <BarPopover
            label="Text size"
            {...nextItem()}
          panelPlacement={panelPlacement}
            renderPanel={(close) => (
              <OptionList
                current={currentFontSize}
                options={FONT_SIZES.map((size) => ({ value: size, label: `${size} px` }))}
                onSelect={(size: number) => {
                  onFontSizeChange(size)
                  close()
                }}
              />
            )}
          >
            <span className="text-xs font-semibold tabular-nums">
              {currentFontSize ?? '\u2014'}
            </span>
          </BarPopover>

          <BarPopover
            label="Font"
            {...nextItem()}
          panelPlacement={panelPlacement}
            renderPanel={(close) => (
              <OptionList
                current={currentFontFamily}
                options={FONT_FAMILIES.map(({ value, label }) => ({
                  value,
                  label,
                  preview: (
                    <span aria-hidden="true" style={{ fontFamily: fontFamilyStack(value) }}>
                      Aa
                    </span>
                  ),
                }))}
                onSelect={(family: FontFamily) => {
                  onFontFamilyChange(family)
                  close()
                }}
              />
            )}
          >
            <span
              className="text-sm font-medium"
              style={{ fontFamily: fontFamilyStack(currentFontFamily) }}
            >
              Aa
            </span>
          </BarPopover>
        </>
      )}

      {has('textColor') && (
        <BarPopover
          label="Text colour"
          {...nextItem()}
          panelPlacement={panelPlacement}
          renderPanel={(close) => (
            <div className="flex items-center gap-1.5">
              {TEXT_SWATCHES.map((color) => (
                <Swatch
                  key={color}
                  color={color}
                  isCurrent={color === currentTextColor}
                  onSelect={() => {
                    onTextColorChange(color)
                    close()
                  }}
                />
              ))}
            </div>
          )}
        >
          <span
            aria-hidden="true"
            style={{ backgroundColor: currentTextColor ?? '#1e293b' }}
            className="w-5 h-5 rounded-full border border-slate-300"
          />
        </BarPopover>
      )}

      {has('stacking') && (
        <BarPopover
          label="Stack order"
          {...nextItem()}
          panelPlacement={panelPlacement}
          renderPanel={(close) => (
            <OptionList
              current={null}
              options={STACK_OPTIONS.map(({ value, label }) => ({ value, label }))}
              onSelect={(command: StackCommand) => {
                onStackChange(command)
                close()
              }}
            />
          )}
        >
          <Layers size={16} strokeWidth={1.8} aria-hidden="true" />
        </BarPopover>
      )}

      {has('align') && (
        <BarPopover
          label="Text alignment"
          {...nextItem()}
          panelPlacement={panelPlacement}
          renderPanel={(close) => (
            <OptionList
              current={currentAlign}
              options={TEXT_ALIGNS.map(({ value, label }) => {
                const Icon = ALIGN_ICONS[value]
                return {
                  value,
                  label,
                  preview: <Icon size={15} strokeWidth={1.8} aria-hidden="true" />,
                }
              })}
              onSelect={(align: TextAlign) => {
                onTextAlignChange(align)
                close()
              }}
            />
          )}
        >
          {(() => {
            const Icon = ALIGN_ICONS[currentAlign ?? 'left']
            return <Icon size={16} strokeWidth={1.8} aria-hidden="true" />
          })()}
        </BarPopover>
      )}

      {has('arrowheads') && (
        <BarPopover
          label="Arrowheads"
          {...nextItem()}
          panelPlacement={panelPlacement}
          renderPanel={(close) => (
            <OptionList
              current={currentArrowheads}
              options={ARROWHEAD_OPTIONS.map(({ value, label, glyph }) => ({
                value,
                label,
                preview: (
                  <span aria-hidden="true" className="text-base leading-none">
                    {glyph}
                  </span>
                ),
              }))}
              onSelect={(choice: Arrowheads) => {
                onArrowheadsChange(choice)
                close()
              }}
            />
          )}
        >
          <span aria-hidden="true" className="text-sm leading-none">
            {ARROWHEAD_OPTIONS.find((o) => o.value === currentArrowheads)?.glyph ?? '\u2192'}
          </span>
        </BarPopover>
      )}
    </div>
  )
}
