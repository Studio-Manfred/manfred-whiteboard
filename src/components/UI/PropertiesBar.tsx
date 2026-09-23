import React, { useLayoutEffect, useRef, useState } from 'react'
import { Minus } from 'lucide-react'
import { useRovingTabindex } from '../../hooks/useRovingTabindex'
import { BarPopover } from './BarPopover'
import {
  BORDER_SWATCHES,
  FILL_SWATCHES,
  NO_FILL,
  colorName,
  currentFillOf,
} from '../../lib/element-colors'
import {
  effectiveFontSize,
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
import { contextBarPosition } from '../../lib/context-bar'
import { useWindowSize } from '../../hooks/useWindowSize'
import type { Rect } from '../../lib/marquee'
import type { Viewport } from '../../lib/coordinates'
import type { BoardElement, ConnectorElement, FontFamily } from '../../types/whiteboard'

const ARROWHEAD_OPTIONS: ReadonlyArray<{ value: Arrowheads; label: string; glyph: string }> = [
  { value: 'none', label: 'No arrowheads', glyph: '—' },
  { value: 'start', label: 'Arrowhead at the start', glyph: '←' },
  { value: 'end', label: 'Arrowhead at the end', glyph: '→' },
  { value: 'both', label: 'Arrowheads at both ends', glyph: '↔' },
]

/** Used until the bar has measured itself — one layout pass, before paint. */
const ESTIMATED_SIZE = { width: 220, height: 44 }

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
    <div className="flex flex-col gap-0.5 min-w-[7rem]">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-label={option.label}
          aria-pressed={option.value === current}
          onClick={() => onSelect(option.value as never)}
          className={`flex items-center justify-between gap-3 px-2 py-1.5 rounded-lg text-sm text-left transition-colors ${
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
}: PropertiesBarProps) {
  // The bar's width depends on how many controls the selection needs, so it
  // has to measure itself to sit centred over that selection.
  const barRef = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState(ESTIMATED_SIZE)
  const windowSize = useWindowSize()

  const has = (property: StyleProperty) =>
    selection.some((el) => supportsProperty(el, property))

  const controls: StyleProperty[] = (
    ['fill', 'border', 'stroke', 'thickness', 'font', 'arrowheads'] as StyleProperty[]
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
  const arrows = selection.filter(
    (el): el is ConnectorElement => el.type === 'connector'
  )
  const currentArrowheads =
    arrows.length > 0 &&
    arrows.every((a) => arrowheadsOf(a) === arrowheadsOf(arrows[0]))
      ? arrowheadsOf(arrows[0])
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
      className="fixed z-40 flex items-center gap-1 px-2 py-1.5 rounded-xl bg-white/95 backdrop-blur-xl border border-slate-200 shadow-xl shadow-slate-900/10"
    >
      {has('fill') && (
        <BarPopover
          label="Fill colour"
          {...nextItem()}
          panelPlacement={panelPlacement}
          renderPanel={(close) => (
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
