import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ConnectorLayer } from '../src/components/Canvas/ConnectorLayer'
import type { BoardElement, ConnectorElement, StickyElement } from '../src/types/whiteboard'

function sticky(id: string, x: number, y: number): StickyElement {
  return {
    id,
    type: 'sticky',
    x,
    y,
    width: 200,
    height: 200,
    zIndex: 1,
    text: '',
    color: '#FFF9B1',
    fontSize: 16,
    createdAt: 0,
    updatedAt: 0,
  }
}

function connector(overrides: Partial<ConnectorElement> = {}): ConnectorElement {
  return {
    id: 'c1',
    type: 'connector',
    fromId: 'a',
    toId: 'b',
    fromAnchor: 'right',
    toAnchor: 'left',
    x: 0,
    y: 0,
    width: 0,
    height: 0,
    zIndex: 1,
    strokeColor: '#475569',
    strokeWidth: 2,
    style: 'curved',
    createdAt: 0,
    updatedAt: 0,
    ...overrides,
  }
}

const elements = new Map<string, BoardElement>([
  ['a', sticky('a', 0, 0)],
  ['b', sticky('b', 400, 0)],
])

function renderLayer(connectors: ConnectorElement[], selected: string[] = []) {
  const onSelect = vi.fn()
  const view = render(
    <ConnectorLayer
      connectors={connectors}
      elementsById={elements}
      selectedIds={new Set(selected)}
      onSelect={onSelect}
    />
  )
  return { onSelect, ...view }
}

describe('ConnectorLayer', () => {
  it('draws a connector between two elements', () => {
    renderLayer([connector()])

    expect(screen.getByTestId('connector-c1')).toBeInTheDocument()
  })

  it('derives the path from where the endpoints sit', () => {
    const { container } = renderLayer([connector()])
    const path = container.querySelectorAll('path')[1]

    // Starts at a's right anchor (200, 100) and ends at b's left anchor (400, 100).
    expect(path.getAttribute('d')).toMatch(/^M\s*200[,\s]/)
    expect(path.getAttribute('d')).toContain('400')
  })

  it('skips connectors whose endpoints are no longer on the board', () => {
    renderLayer([connector({ id: 'dangling', toId: 'deleted' })])

    expect(screen.queryByTestId('connector-dangling')).not.toBeInTheDocument()
  })

  it('renders one group per connector', () => {
    renderLayer([connector(), connector({ id: 'c2', fromAnchor: 'top', toAnchor: 'bottom' })])

    expect(screen.getByTestId('connector-c1')).toBeInTheDocument()
    expect(screen.getByTestId('connector-c2')).toBeInTheDocument()
  })

  it('highlights the selected connector', () => {
    const { container } = renderLayer([connector()], ['c1'])
    const visible = container.querySelectorAll('path')[1]

    expect(visible.getAttribute('stroke')).toBe('#3b82f6')
    expect(visible.getAttribute('marker-end')).toBe('url(#arrowhead-selected)')
  })

  it('uses its own stroke colour when unselected', () => {
    const { container } = renderLayer([connector({ strokeColor: '#111827' })])
    const visible = container.querySelectorAll('path')[1]

    expect(visible.getAttribute('stroke')).toBe('#111827')
    expect(visible.getAttribute('marker-end')).toBe('url(#arrowhead)')
  })

  it('selects the connector when its hit area is clicked', () => {
    const { onSelect, container } = renderLayer([connector()])

    fireEvent.click(container.querySelectorAll('path')[0])

    expect(onSelect).toHaveBeenCalledWith('c1', expect.anything())
  })

  it('lets pointer events through everywhere except the connectors themselves', () => {
    const { container } = renderLayer([connector()])

    expect((container.firstChild as SVGElement).getAttribute('class')).toContain(
      'pointer-events-none'
    )
  })
})

describe('arrowheads', () => {
  function renderWith(overrides: Partial<ConnectorElement>) {
    render(
      <ConnectorLayer
        connectors={[connector(overrides)]}
        elementsById={elements}
        selectedIds={new Set()}
        onSelect={vi.fn()}
      />
    )
    return screen.getByTestId('connector-c1').querySelectorAll('path')[1]
  }

  it('puts a head at the end for an arrow saved before the fields existed', () => {
    const path = renderWith({})

    expect(path.getAttribute('marker-end')).toBe('url(#arrowhead)')
    expect(path.getAttribute('marker-start')).toBeNull()
  })

  it('draws a head at the start when asked', () => {
    const path = renderWith({ startArrow: true, endArrow: false })

    expect(path.getAttribute('marker-start')).toBe('url(#arrowhead-start)')
    expect(path.getAttribute('marker-end')).toBeNull()
  })

  it('draws both heads', () => {
    const path = renderWith({ startArrow: true, endArrow: true })

    expect(path.getAttribute('marker-start')).toBe('url(#arrowhead-start)')
    expect(path.getAttribute('marker-end')).toBe('url(#arrowhead)')
  })

  it('draws a plain line with neither', () => {
    const path = renderWith({ startArrow: false, endArrow: false })

    expect(path.getAttribute('marker-start')).toBeNull()
    expect(path.getAttribute('marker-end')).toBeNull()
  })

  it('uses the highlighted markers when the arrow is selected', () => {
    render(
      <ConnectorLayer
        connectors={[connector({ startArrow: true, endArrow: true })]}
        elementsById={elements}
        selectedIds={new Set(['c1'])}
        onSelect={vi.fn()}
      />
    )
    const path = screen.getByTestId('connector-c1').querySelectorAll('path')[1]

    expect(path.getAttribute('marker-start')).toBe('url(#arrowhead-start-selected)')
    expect(path.getAttribute('marker-end')).toBe('url(#arrowhead-selected)')
  })
})

describe('the arrow being dragged', () => {
  const draft = {
    from: { x: 200, y: 100 },
    to: { x: 420, y: 160 },
    fromAnchor: 'right' as const,
    toAnchor: 'left' as const,
    isSnapped: false,
  }

  function renderDraft(overrides: Partial<typeof draft> | null) {
    render(
      <ConnectorLayer
        connectors={[]}
        elementsById={elements}
        selectedIds={new Set()}
        onSelect={vi.fn()}
        draft={overrides === null ? null : { ...draft, ...overrides }}
      />
    )
  }

  it('draws nothing when no arrow is being dragged', () => {
    renderDraft(null)

    expect(screen.queryByTestId('draft-arrow')).not.toBeInTheDocument()
  })

  it('previews the arrow from the anchor to the pointer', () => {
    renderDraft({})
    const path = screen.getByTestId('draft-arrow')

    expect(path.getAttribute('d')).toMatch(/^M\s*200[,\s]/)
    expect(path.getAttribute('d')).toContain('420')
  })

  it('is dashed while it has nowhere to land', () => {
    renderDraft({ isSnapped: false })

    expect(screen.getByTestId('draft-arrow')).toHaveAttribute('stroke-dasharray')
  })

  it('goes solid and blue the moment it snaps', () => {
    renderDraft({ isSnapped: true })
    const path = screen.getByTestId('draft-arrow')

    expect(path).not.toHaveAttribute('stroke-dasharray')
    expect(path.getAttribute('stroke')).toBe('#3b82f6')
  })

  it('never swallows pointer events — the drag is happening on the canvas', () => {
    renderDraft({})

    expect(screen.getByTestId('draft-arrow').getAttribute('pointer-events')).toBe('none')
  })
})
