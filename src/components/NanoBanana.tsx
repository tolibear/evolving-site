'use client'

/**
 * NanoBanana - Generates consistent, unique mini icons for each suggestion
 * Uses a deterministic hash of the content to create visually distinct icons
 */

interface NanoBananaProps {
  seed: string
  size?: number
  className?: string
}

// Simple hash function to generate consistent numbers from a string
function hashString(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32bit integer
  }
  return Math.abs(hash)
}

// Generate a seeded random number
function seededRandom(seed: number, index: number): number {
  const x = Math.sin(seed + index * 9999) * 10000
  return x - Math.floor(x)
}

// Color palette - vibrant but harmonious
const COLORS = [
  '#FFD93D', // Yellow (banana!)
  '#6BCB77', // Green
  '#4D96FF', // Blue
  '#FF6B6B', // Coral
  '#C9B1FF', // Lavender
  '#FF9F45', // Orange
  '#00D9FF', // Cyan
  '#FF85B3', // Pink
]

// Shape types
type ShapeType = 'circle' | 'square' | 'triangle' | 'diamond' | 'crescent'

const SHAPES: ShapeType[] = ['circle', 'square', 'triangle', 'diamond', 'crescent']

export default function NanoBanana({ seed, size = 24, className = '' }: NanoBananaProps) {
  const hash = hashString(seed)

  // Generate deterministic properties from hash
  const bgColorIndex = hash % COLORS.length
  const fgColorIndex = (hash * 7) % COLORS.length
  const shapeIndex = (hash * 3) % SHAPES.length
  const rotation = seededRandom(hash, 1) * 360
  const hasSecondShape = seededRandom(hash, 2) > 0.5
  const secondShapeIndex = (hash * 5) % SHAPES.length
  const patternType = hash % 4 // 0: solid, 1: split, 2: corner, 3: center

  const bgColor = COLORS[bgColorIndex]
  const fgColor = COLORS[fgColorIndex === bgColorIndex ? (fgColorIndex + 1) % COLORS.length : fgColorIndex]
  const shape = SHAPES[shapeIndex]
  const secondShape = SHAPES[secondShapeIndex]

  const renderShape = (shapeType: ShapeType, x: number, y: number, shapeSize: number, color: string, rot: number = 0) => {
    const transform = `rotate(${rot} ${x} ${y})`

    switch (shapeType) {
      case 'circle':
        return (
          <circle
            cx={x}
            cy={y}
            r={shapeSize / 2}
            fill={color}
            transform={transform}
          />
        )
      case 'square':
        return (
          <rect
            x={x - shapeSize / 2}
            y={y - shapeSize / 2}
            width={shapeSize}
            height={shapeSize}
            fill={color}
            transform={transform}
          />
        )
      case 'triangle':
        const triPoints = [
          [x, y - shapeSize / 2],
          [x - shapeSize / 2, y + shapeSize / 2],
          [x + shapeSize / 2, y + shapeSize / 2],
        ].map(p => p.join(',')).join(' ')
        return (
          <polygon
            points={triPoints}
            fill={color}
            transform={transform}
          />
        )
      case 'diamond':
        const diamondPoints = [
          [x, y - shapeSize / 2],
          [x + shapeSize / 2, y],
          [x, y + shapeSize / 2],
          [x - shapeSize / 2, y],
        ].map(p => p.join(',')).join(' ')
        return (
          <polygon
            points={diamondPoints}
            fill={color}
            transform={transform}
          />
        )
      case 'crescent':
        // A banana-like crescent shape
        return (
          <g transform={transform}>
            <path
              d={`M ${x - shapeSize/3} ${y - shapeSize/2}
                  Q ${x + shapeSize/2} ${y} ${x - shapeSize/3} ${y + shapeSize/2}
                  Q ${x} ${y} ${x - shapeSize/3} ${y - shapeSize/2}`}
              fill={color}
            />
          </g>
        )
      default:
        return null
    }
  }

  const viewBox = 24
  const center = viewBox / 2

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${viewBox} ${viewBox}`}
      className={`rounded-sm ${className}`}
      style={{ backgroundColor: bgColor }}
    >
      {/* Background pattern */}
      {patternType === 1 && (
        <rect x={0} y={0} width={viewBox / 2} height={viewBox} fill={fgColor} opacity={0.3} />
      )}
      {patternType === 2 && (
        <polygon points={`0,0 ${viewBox},0 0,${viewBox}`} fill={fgColor} opacity={0.3} />
      )}
      {patternType === 3 && (
        <circle cx={center} cy={center} r={viewBox / 3} fill={fgColor} opacity={0.2} />
      )}

      {/* Main shape */}
      {renderShape(shape, center, center, viewBox * 0.5, fgColor, rotation)}

      {/* Secondary shape (if enabled) */}
      {hasSecondShape && secondShape !== shape && (
        renderShape(
          secondShape,
          center,
          center,
          viewBox * 0.25,
          bgColor,
          rotation + 45
        )
      )}
    </svg>
  )
}
