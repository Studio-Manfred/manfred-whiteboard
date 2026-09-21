import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MultiplayerCursors } from '../src/components/Canvas/MultiplayerCursors'
import type { UserAwareness } from '../src/types/whiteboard'

function peer(id: string, overrides: Partial<UserAwareness> = {}): UserAwareness {
  return {
    user: { id, name: `User ${id}`, color: '#3b82f6' },
    cursor: { x: 120, y: 240 },
    selection: [],
    ...overrides,
  }
}

describe('MultiplayerCursors', () => {
  it('renders nothing when nobody else is on the board', () => {
    const { container } = render(<MultiplayerCursors remoteUsers={[]} />)

    expect(container).toBeEmptyDOMElement()
  })

  it('places each peer cursor at its world position', () => {
    render(<MultiplayerCursors remoteUsers={[peer('a')]} />)

    expect(screen.getByTestId('cursor-a')).toHaveStyle({ left: '120px', top: '240px' })
  })

  it('labels each cursor with the peer name', () => {
    render(<MultiplayerCursors remoteUsers={[peer('a'), peer('b')]} />)

    expect(screen.getByText('User a')).toBeInTheDocument()
    expect(screen.getByText('User b')).toBeInTheDocument()
  })

  it('skips peers who have no cursor on the board', () => {
    render(<MultiplayerCursors remoteUsers={[peer('a', { cursor: null }), peer('b')]} />)

    expect(screen.queryByTestId('cursor-a')).not.toBeInTheDocument()
    expect(screen.getByTestId('cursor-b')).toBeInTheDocument()
  })

  it('tints the cursor and its label with the peer colour', () => {
    const green = peer('a', { user: { id: 'a', name: 'Ada', color: '#10b981' } })
    render(<MultiplayerCursors remoteUsers={[green]} />)

    expect(screen.getByText('Ada')).toHaveStyle({ backgroundColor: '#10b981' })
  })

  it('never intercepts pointer events on the canvas', () => {
    render(<MultiplayerCursors remoteUsers={[peer('a')]} />)

    expect(screen.getByTestId('cursor-a').className).toContain('pointer-events-none')
  })
})
