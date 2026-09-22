import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ActiveUsers } from '../src/components/UI/ActiveUsers'
import { TopNav } from '../src/components/UI/TopNav'
import type { UserAwareness } from '../src/types/whiteboard'

function peer(id: string, name = `User ${id}`, color = '#3b82f6'): UserAwareness {
  return { user: { id, name, color }, cursor: null, selection: [] }
}

describe('ActiveUsers', () => {
  it('renders nothing when you are alone on the board', () => {
    const { container } = render(<ActiveUsers users={[]} localUserId="me" />)

    expect(container).toBeEmptyDOMElement()
  })

  it('does not count you among the others', () => {
    const { container } = render(<ActiveUsers users={[peer('me')]} localUserId="me" />)

    expect(container).toBeEmptyDOMElement()
  })

  it('announces how many other people are on the board', () => {
    render(<ActiveUsers users={[peer('a'), peer('me')]} localUserId="me" />)

    expect(screen.getByRole('group', { name: '1 other user online' })).toBeInTheDocument()
  })

  it('pluralises the announcement', () => {
    render(<ActiveUsers users={[peer('a'), peer('b')]} localUserId="me" />)

    expect(screen.getByRole('group', { name: '2 other users online' })).toBeInTheDocument()
  })

  it('shows an initial per peer, tinted with their colour', () => {
    render(<ActiveUsers users={[peer('a', 'ada', '#10b981')]} localUserId="me" />)

    const avatar = screen.getByTitle('ada')
    expect(avatar).toHaveTextContent('A')
    expect(avatar).toHaveStyle({ backgroundColor: '#10b981' })
  })

  it('caps the avatars at five and counts the rest', () => {
    const crowd = ['a', 'b', 'c', 'd', 'e', 'f', 'g'].map((id) => peer(id))
    render(<ActiveUsers users={crowd} localUserId="me" />)

    expect(screen.getByText('+2')).toBeInTheDocument()
    expect(screen.getByRole('group', { name: '7 other users online' })).toBeInTheDocument()
  })
})

describe('TopNav', () => {
  it('is a banner naming the product and the current room', () => {
    render(<TopNav roomName="sprint-planning" users={[]} localUserId="me" />)

    const banner = screen.getByRole('banner')
    expect(banner).toHaveTextContent('Manfred Whiteboard')
    expect(banner).toHaveTextContent('sprint-planning')
  })

  it('carries the presence list', () => {
    render(<TopNav roomName="default-room" users={[peer('a')]} localUserId="me" />)

    expect(screen.getByRole('group', { name: '1 other user online' })).toBeInTheDocument()
  })

  it('shows history controls when they are provided', () => {
    const onUndo = vi.fn()
    render(
      <TopNav
        roomName="default-room"
        users={[]}
        localUserId="me"
        history={{ canUndo: true, canRedo: false, onUndo, onRedo: vi.fn() }}
      />
    )

    expect(screen.getByRole('group', { name: 'History' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Undo' }))
    expect(onUndo).toHaveBeenCalledOnce()
  })

  it('renders without history controls when none are given', () => {
    render(<TopNav roomName="default-room" users={[]} localUserId="me" />)

    expect(screen.queryByRole('group', { name: 'History' })).not.toBeInTheDocument()
  })
})
