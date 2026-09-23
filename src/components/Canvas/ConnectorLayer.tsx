import React from 'react'
import type {
  AnchorPosition,
  ConnectorElement,
  BoardElement,
} from '../../types/whiteboard'
import type { Point } from '../../lib/coordinates'
import {
  getAnchorPosition,
  calculateBezierPath,
} from '../../lib/connector-math'
import { arrowheadsOf } from '../../lib/element-style'

/** The arrow currently being dragged out of an anchor, if any. */
export interface ConnectorDraft {
  from: Point
  to: Point
  fromAnchor: AnchorPosition
  toAnchor: AnchorPosition
  /** True once the pointer is close enough to land on something. */
  isSnapped: boolean
}

interface ConnectorLayerProps {
  connectors: ConnectorElement[]
  elementsById: Map<string, BoardElement>
  selectedIds: Set<string>
  onSelect: (id: string, e: React.MouseEvent) => void
  draft?: ConnectorDraft | null
}

export function ConnectorLayer({
  connectors,
  elementsById,
  selectedIds,
  onSelect,
  draft,
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
          id="arrowhead-start"
          markerWidth="10"
          markerHeight="7"
          refX="0"
          refY="3.5"
          orient="auto"
          markerUnits="strokeWidth"
        >
          <polygon points="10 0, 0 3.5, 10 7" fill="#475569" />
        </marker>
        <marker
          id="arrowhead-start-selected"
          markerWidth="10"
          markerHeight="7"
          refX="0"
          refY="3.5"
          orient="auto"
          markerUnits="strokeWidth"
        >
          <polygon points="10 0, 0 3.5, 10 7" fill="#3b82f6" />
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
        const heads = arrowheadsOf(connector)
        const suffix = isSelected ? '-selected' : ''

        return (
          <g key={connector.id} data-testid={`connector-${connector.id}`}>
            {/* Invisible fat hit area for click targeting */}
            <path
              d={pathData}
              fill="none"
              stroke="transparent"
              strokeWidth={16}
              // `pointer-events-stroke` is not a Tailwind utility and generated no CSS,
        // so this path inherited pointer-events:none from the svg and was unclickable.
        style={{ pointerEvents: 'stroke' }}
        className="cursor-pointer"
              onClick={(e) => onSelect(connector.id, e)}
            />
            {/* Visible connector path */}
            <path
              d={pathData}
              fill="none"
              stroke={isSelected ? '#3b82f6' : connector.strokeColor || '#475569'}
              strokeWidth={connector.strokeWidth || 2}
              strokeLinecap="round"
              markerStart={
                heads === 'start' || heads === 'both'
                  ? `url(#arrowhead-start${suffix})`
                  : undefined
              }
              markerEnd={
                heads === 'end' || heads === 'both'
                  ? `url(#arrowhead${suffix})`
                  : undefined
              }
              className={`transition-colors ${isSelected ? 'filter drop-shadow(0 0 4px rgba(59,130,246,0.5))' : ''}`}
            />
          </g>
        )
      })}

      {draft && (
        <path
          data-testid="draft-arrow"
          d={
            calculateBezierPath(draft.from, draft.to, draft.fromAnchor, draft.toAnchor)
              .pathData
          }
          fill="none"
          stroke={draft.isSnapped ? '#3b82f6' : '#94a3b8'}
          strokeWidth={2}
          strokeLinecap="round"
          {...(draft.isSnapped ? {} : { strokeDasharray: '6 6' })}
          markerEnd={draft.isSnapped ? 'url(#arrowhead-selected)' : 'url(#arrowhead)'}
          pointerEvents="none"
        />
      )}
    </svg>
  )
}
