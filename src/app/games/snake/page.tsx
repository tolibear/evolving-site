import { Metadata } from 'next'
import { SnakeGame } from '@/components/SnakeGame'

export const metadata: Metadata = {
  title: 'Snake Game',
  description: 'Classic retro Snake game - eat food, grow, and avoid collisions!',
}

export default function SnakePage() {
  return (
    <div className="min-h-[calc(100vh-10rem)] flex flex-col items-center justify-center gap-6">
      <SnakeGame />
      <div className="text-center text-muted text-sm">
        <p>A classic retro Snake game</p>
        <p className="text-xs opacity-60 mt-1">
          Suggested by the community
        </p>
      </div>
    </div>
  )
}
