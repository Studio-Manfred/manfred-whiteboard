import React from 'react'
import type {
  ConnectorElement,
  BoardElement,
} from '../../types/whiteboard'
import {
  getAnchorPosition,
  calculateBezierPath,
} from '../../lib/connector-math'

interface ConnectorLayerProps {
  connectors: ConnectorElement[]
  elementsById: Map<string, BoardElement>
  selectedIds: Set<string>
  onSelect: (id: string, e: React.MouseEvent) => void
}

export function ConnectorLayer({
  connectors,
  elementsById,
  selectedIds,
  onSelect,
}: ConnectorLayerProps) {
  return (
    <svg
      className="absolute inset-0 w-full h-full overflow-visible pointer-events-none"
      style={{ zIndex: 5 }}
    >
      <defs>
        <marker
          id="arrowhead"
          markerWidth="10"
          markerHeight="7"
          refX="10"
          refY="3.5"
          orient="auto"
          markerUnits="strokeWidth"
        >
          <polygon
            points="0 0, 10 3.5, 0 7"
            fill="#475569"
          />
        </marker>
        <marker
          id="arrowhead-selected"
          markerWidth="10"
          markerHeight="7"
          refX="10"
          refY="3.5"
          orient="auto"
          markerUnits="strokeWidth"
        >
          <polygon
            points="0 0, 10 3.5, 0 7"
            fill="#3b82f6"
          />
        </marker>
      </defs>

      {connectors.map((connector) => {
        const fromEl = elementsById.get(connector.fromId)
        const toEl = elementsById.get(connector.toId)
        if (!fromEl || !toEl) return null

        const start = getAnchorPosition(fromEl, connector.fromAnchor)
        const end = getAnchorPosition(toEl, connector.toAnchor)
        const { pathData } = calculateBezierPath(
          start,
          end,
          connector.fromAnchor,
          connector.toAnchor
        )

        const isSelected = selectedIds.has(connector.id)

        return (
          <g key={connector.id} data-testid={`connector-${connector.id}`}>
            {/* Invisible fat hit area for click targeting */}
            <path
              d={pathData}
              fill="none"
              stroke="transparent"
              strokeWidth={16}
              className="pointer-events-stroke cursor-pointer"
              onClick={(e) => onSelect(connector.id, e)}
            />
            {/* Visible connector path */}
            <path
              d={pathData}
              fill="none"
              stroke={isSelected ? '#3b82f6' : connector.strokeColor || '#475569'}
              strokeWidth={connector.strokeWidth || 2}
              strokeLinecap="round"
              markerEnd={isSelected ? 'url(#arrowhead-selected)' : 'url(#arrowhead)'}
              className={`transition-colors ${isSelected ? 'filter drop-shadow(0 0 4px rgba(59,130,246,0.5))' : ''}`}
            />
          </g>
        )
      })}
    </svg>
  )
}
