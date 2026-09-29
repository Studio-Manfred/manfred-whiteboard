// TODO(STU-979): replace with @studio-manfred/manfred-design-system's ColorPicker
// Tracking: https://linear.app/studio-manfred/issue/STU-979
// Local API mirrors the ticket's proposed shape; swap when DS ships.
//
// This stub is intentionally minimal: it renders a native radio group so
// keyboard navigation and screen-reader support work out of the box, at
// the cost of visual polish. The DS ColorPicker will replace this with
// the Manfred-styled version + optional custom-hex input.

import { useId } from 'react'

const DEFAULT_PALETTE = [
  '#111116', // ink
  '#2c28ec', // brand blue
  '#e11d48', // rose
  '#059669', // emerald
  '#d97706', // amber
  '#7c3aed', // violet
  '#7c7c82', // slate
  '#ffffff', // paper
]

export interface ColorPickerProps {
  value: string
  onChange: (colour: string) => void
  palette?: string[]
  allowCustom?: boolean
  label?: string
  size?: 'sm' | 'md' | 'lg'
  disabled?: boolean
}

export function ColorPicker({
  value,
  onChange,
  palette = DEFAULT_PALETTE,
  allowCustom = false,
  label = 'Colour',
  size = 'md',
  disabled = false,
}: ColorPickerProps) {
  const groupName = useId()
  const sizePx = size === 'sm' ? 20 : size === 'lg' ? 36 : 28

  return (
    <fieldset
      aria-label={label}
      disabled={disabled}
      style={{ border: 0, padding: 0, margin: 0, display: 'flex', gap: 4, alignItems: 'center' }}
    >
      <legend
        style={{
          position: 'absolute',
          width: 1,
          height: 1,
          overflow: 'hidden',
          clip: 'rect(0 0 0 0)',
        }}
      >
        {label}
      </legend>

      {palette.map((colour) => (
        <label
          key={colour}
          style={{
            display: 'inline-block',
            width: sizePx,
            height: sizePx,
            borderRadius: '50%',
            background: colour,
            cursor: disabled ? 'not-allowed' : 'pointer',
            outline: colour === value ? '2px solid #2c28ec' : '1px solid #d1d1d4',
            outlineOffset: 2,
          }}
        >
          <input
            type="radio"
            name={groupName}
            value={colour}
            checked={colour === value}
            onChange={() => onChange(colour)}
            disabled={disabled}
            style={{ position: 'absolute', opacity: 0, pointerEvents: 'none' }}
            aria-label={colour}
          />
        </label>
      ))}

      {allowCustom && (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          pattern="#[0-9a-fA-F]{6}"
          aria-label="Custom colour (hex)"
          disabled={disabled}
          style={{ marginLeft: 8, width: 80 }}
        />
      )}
    </fieldset>
  )
}
