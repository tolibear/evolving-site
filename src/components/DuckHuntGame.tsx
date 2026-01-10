'use client'

import { useState, useEffect, useCallback, useRef } from 'react'

const GAME_WIDTH = 320
const GAME_HEIGHT = 240
const DUCK_SIZE = 32
const DUCK_SPEED_MIN = 2
const DUCK_SPEED_MAX = 4
const GAME_DURATION = 60 // seconds
const DUCKS_PER_ROUND = 3
const SPAWN_INTERVAL = 2000 // ms

type Duck = {
  id: number
  x: number
  y: number
  vx: number
  vy: number
  state: 'flying' | 'hit' | 'falling'
  frame: number
}

interface DuckHuntGameProps {
  onClose?: () => void
}

export function DuckHuntGame({ onClose }: DuckHuntGameProps) {
  const [gameState, setGameState] = useState<'idle' | 'playing' | 'gameover'>('idle')
  const [score, setScore] = useState(0)
  const [highScore, setHighScore] = useState(0)
  const [ducks, setDucks] = useState<Duck[]>([])
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION)
  const [shots, setShots] = useState(3)
  const [ducksHit, setDucksHit] = useState(0)
  const [ducksEscaped, setDucksEscaped] = useState(0)
  const [cellSize, setCellSize] = useState(1)
  const [showFlash, setShowFlash] = useState(false)

  const containerRef = useRef<HTMLDivElement>(null)
  const gameLoopRef = useRef<number | null>(null)
  const spawnTimerRef = useRef<NodeJS.Timeout | null>(null)
  const duckIdRef = useRef(0)
  const lastTimeRef = useRef(0)

  // Load high score from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('duckhunt-high-score')
    if (saved) {
      setHighScore(parseInt(saved, 10))
    }
  }, [])

  // Save high score to localStorage
  useEffect(() => {
    if (highScore > 0) {
      localStorage.setItem('duckhunt-high-score', highScore.toString())
    }
  }, [highScore])

  // Calculate responsive scale
  useEffect(() => {
    const updateScale = () => {
      const maxWidth = Math.min(window.innerWidth - 32, 400)
      const scale = maxWidth / GAME_WIDTH
      setCellSize(Math.max(0.8, Math.min(scale, 1.25)))
    }
    updateScale()
    window.addEventListener('resize', updateScale)
    return () => window.removeEventListener('resize', updateScale)
  }, [])

  const spawnDuck = useCallback(() => {
    const side = Math.random() < 0.5 ? 'left' : 'right'
    const speed = DUCK_SPEED_MIN + Math.random() * (DUCK_SPEED_MAX - DUCK_SPEED_MIN)

    const newDuck: Duck = {
      id: duckIdRef.current++,
      x: side === 'left' ? -DUCK_SIZE : GAME_WIDTH,
      y: GAME_HEIGHT * 0.3 + Math.random() * (GAME_HEIGHT * 0.4),
      vx: side === 'left' ? speed : -speed,
      vy: -speed * 0.5 + Math.random() * speed,
      state: 'flying',
      frame: 0,
    }

    setDucks(prev => [...prev, newDuck])
  }, [])

  const resetGame = useCallback(() => {
    setScore(0)
    setDucks([])
    setTimeLeft(GAME_DURATION)
    setShots(3)
    setDucksHit(0)
    setDucksEscaped(0)
    duckIdRef.current = 0
    lastTimeRef.current = performance.now()
    setGameState('playing')
    containerRef.current?.focus()
  }, [])

  // Game loop
  useEffect(() => {
    if (gameState !== 'playing') return

    const animate = (currentTime: number) => {
      if (lastTimeRef.current === 0) {
        lastTimeRef.current = currentTime
      }

      setDucks(prevDucks => {
        return prevDucks.map(duck => {
          if (duck.state === 'hit') {
            return { ...duck, state: 'falling' as const, vy: 0 }
          }

          if (duck.state === 'falling') {
            const newY = duck.y + 5
            if (newY > GAME_HEIGHT + DUCK_SIZE) {
              return null as unknown as Duck
            }
            return { ...duck, y: newY }
          }

          // Flying duck logic
          let newX = duck.x + duck.vx
          let newY = duck.y + duck.vy
          let newVx = duck.vx
          let newVy = duck.vy

          // Bounce off top and bottom
          if (newY < 0 || newY > GAME_HEIGHT * 0.7) {
            newVy = -newVy
            newY = Math.max(0, Math.min(newY, GAME_HEIGHT * 0.7))
          }

          // Random direction changes
          if (Math.random() < 0.02) {
            newVy = -DUCK_SPEED_MAX * 0.5 + Math.random() * DUCK_SPEED_MAX
          }

          // Update frame for animation
          const newFrame = (duck.frame + 1) % 3

          return { ...duck, x: newX, y: newY, vx: newVx, vy: newVy, frame: newFrame }
        }).filter((duck): duck is Duck => duck !== null)
      })

      gameLoopRef.current = requestAnimationFrame(animate)
    }

    gameLoopRef.current = requestAnimationFrame(animate)

    return () => {
      if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current)
      }
    }
  }, [gameState])

  // Spawn ducks periodically
  useEffect(() => {
    if (gameState !== 'playing') return

    // Initial spawn
    spawnDuck()

    spawnTimerRef.current = setInterval(() => {
      setDucks(prev => {
        const flyingDucks = prev.filter(d => d.state === 'flying')
        if (flyingDucks.length < DUCKS_PER_ROUND) {
          spawnDuck()
        }
        return prev
      })
    }, SPAWN_INTERVAL)

    return () => {
      if (spawnTimerRef.current) {
        clearInterval(spawnTimerRef.current)
      }
    }
  }, [gameState, spawnDuck])

  // Timer
  useEffect(() => {
    if (gameState !== 'playing') return

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          setGameState('gameover')
          setHighScore(current => Math.max(current, score))
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [gameState, score])

  // Check for escaped ducks
  useEffect(() => {
    if (gameState !== 'playing') return

    setDucks(prev => {
      const escaped = prev.filter(
        d => d.state === 'flying' && (d.x < -DUCK_SIZE * 2 || d.x > GAME_WIDTH + DUCK_SIZE)
      )
      if (escaped.length > 0) {
        setDucksEscaped(e => e + escaped.length)
      }
      return prev.filter(
        d => !(d.state === 'flying' && (d.x < -DUCK_SIZE * 2 || d.x > GAME_WIDTH + DUCK_SIZE))
      )
    })
  }, [ducks, gameState])

  const handleShoot = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (gameState !== 'playing') return
    if (shots <= 0) return

    // Trigger flash effect
    setShowFlash(true)
    setTimeout(() => setShowFlash(false), 50)

    setShots(prev => prev - 1)

    const rect = e.currentTarget.getBoundingClientRect()
    const clickX = (e.clientX - rect.left) / cellSize
    const clickY = (e.clientY - rect.top) / cellSize

    setDucks(prev => {
      let hitAny = false
      const updated = prev.map(duck => {
        if (duck.state !== 'flying') return duck

        // Check if click is within duck bounds
        const duckCenterX = duck.x + DUCK_SIZE / 2
        const duckCenterY = duck.y + DUCK_SIZE / 2
        const distance = Math.sqrt(
          Math.pow(clickX - duckCenterX, 2) + Math.pow(clickY - duckCenterY, 2)
        )

        if (distance < DUCK_SIZE * 0.75) {
          hitAny = true
          return { ...duck, state: 'hit' as const }
        }
        return duck
      })

      if (hitAny) {
        setScore(s => s + 100)
        setDucksHit(h => h + 1)
        setShots(3) // Reload on hit
      }

      return updated
    })
  }, [gameState, shots, cellSize])

  // Reload shots when all are used
  useEffect(() => {
    if (shots <= 0 && gameState === 'playing') {
      const timer = setTimeout(() => setShots(3), 1000)
      return () => clearTimeout(timer)
    }
  }, [shots, gameState])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault()
      if (gameState !== 'playing') {
        resetGame()
      }
    }
  }, [gameState, resetGame])

  // Duck SVG renderer
  const renderDuck = (duck: Duck) => {
    const isFlipped = duck.vx < 0
    const wingOffset = duck.state === 'flying' ? [0, -4, -8][duck.frame] : 0

    if (duck.state === 'hit') {
      return (
        <div
          key={duck.id}
          className="absolute text-2xl"
          style={{
            left: duck.x * cellSize,
            top: duck.y * cellSize,
            transform: `scale(${cellSize})`,
            transformOrigin: 'top left',
          }}
        >
          💥
        </div>
      )
    }

    if (duck.state === 'falling') {
      return (
        <div
          key={duck.id}
          className="absolute text-2xl"
          style={{
            left: duck.x * cellSize,
            top: duck.y * cellSize,
            transform: `scale(${cellSize}) rotate(180deg)`,
            transformOrigin: 'center',
          }}
        >
          🦆
        </div>
      )
    }

    return (
      <div
        key={duck.id}
        className="absolute pointer-events-none"
        style={{
          left: duck.x * cellSize,
          top: duck.y * cellSize,
          width: DUCK_SIZE * cellSize,
          height: DUCK_SIZE * cellSize,
        }}
      >
        <svg
          viewBox="0 0 32 32"
          className="w-full h-full"
          style={{ transform: isFlipped ? 'scaleX(-1)' : undefined }}
        >
          {/* Duck body */}
          <ellipse cx="16" cy="18" rx="10" ry="7" fill="#8B4513" />
          {/* Duck head */}
          <circle cx="24" cy="12" r="6" fill="#2E8B57" />
          {/* Duck eye */}
          <circle cx="26" cy="10" r="1.5" fill="white" />
          <circle cx="26.5" cy="10" r="0.75" fill="black" />
          {/* Duck beak */}
          <polygon points="30,12 34,14 30,16" fill="#FFA500" />
          {/* Duck wing */}
          <ellipse
            cx="14"
            cy={14 + wingOffset}
            rx="6"
            ry="3"
            fill="#654321"
            style={{ transition: 'cy 0.05s' }}
          />
        </svg>
      </div>
    )
  }

  const accuracy = ducksHit + ducksEscaped > 0
    ? Math.round((ducksHit / (ducksHit + ducksEscaped)) * 100)
    : 0

  return (
    <div
      ref={containerRef}
      tabIndex={0}
      onKeyDown={handleKeyDown}
      className="win96-window max-w-fit mx-auto outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
      onClick={() => containerRef.current?.focus()}
    >
      {/* Title bar */}
      <div className="win96-titlebar">
        <span className="text-xs font-bold flex items-center gap-1">
          <span>🦆</span> DuckHunt.exe
        </span>
        <div className="flex items-center gap-2">
          <span className="text-xs">Score: {score}</span>
          {onClose && (
            <button
              onClick={(e) => { e.stopPropagation(); onClose(); }}
              className="w-4 h-4 flex items-center justify-center text-xs font-bold hover:bg-red-500 hover:text-white transition-colors"
              aria-label="Close"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Menu bar */}
      <div className="win96-menubar">
        <span className="win96-menu-item" onClick={resetGame}>Game</span>
        <span className="win96-menu-item text-[10px] opacity-70">High Score: {highScore}</span>
      </div>

      {/* Game area */}
      <div className="win96-content relative" style={{ padding: 0 }}>
        <div
          className="relative overflow-hidden select-none"
          style={{
            width: GAME_WIDTH * cellSize,
            height: GAME_HEIGHT * cellSize,
            cursor: gameState === 'playing' ? 'crosshair' : 'default',
            background: 'linear-gradient(to bottom, #87CEEB 0%, #87CEEB 60%, #228B22 60%, #228B22 100%)',
          }}
          onClick={handleShoot}
        >
          {/* Sun */}
          <div
            className="absolute rounded-full"
            style={{
              width: 30 * cellSize,
              height: 30 * cellSize,
              top: 10 * cellSize,
              right: 20 * cellSize,
              background: 'radial-gradient(circle, #FFD700, #FFA500)',
              boxShadow: '0 0 20px #FFD700',
            }}
          />

          {/* Clouds */}
          <div
            className="absolute opacity-80"
            style={{
              left: 20 * cellSize,
              top: 30 * cellSize,
              fontSize: 24 * cellSize,
            }}
          >
            ☁️
          </div>
          <div
            className="absolute opacity-60"
            style={{
              left: 180 * cellSize,
              top: 50 * cellSize,
              fontSize: 20 * cellSize,
            }}
          >
            ☁️
          </div>

          {/* Trees in background */}
          <div
            className="absolute"
            style={{
              left: 40 * cellSize,
              bottom: 30 * cellSize,
              fontSize: 40 * cellSize,
            }}
          >
            🌲
          </div>
          <div
            className="absolute"
            style={{
              left: 140 * cellSize,
              bottom: 35 * cellSize,
              fontSize: 35 * cellSize,
            }}
          >
            🌳
          </div>
          <div
            className="absolute"
            style={{
              right: 50 * cellSize,
              bottom: 32 * cellSize,
              fontSize: 38 * cellSize,
            }}
          >
            🌲
          </div>

          {/* Dog (static, peeking from grass) */}
          <div
            className="absolute"
            style={{
              left: 130 * cellSize,
              bottom: 5 * cellSize,
              fontSize: 28 * cellSize,
            }}
          >
            🐕
          </div>

          {/* Ducks */}
          {ducks.map(renderDuck)}

          {/* Flash effect on shoot */}
          {showFlash && (
            <div className="absolute inset-0 bg-white/30 pointer-events-none" />
          )}

          {/* HUD */}
          {gameState === 'playing' && (
            <div
              className="absolute top-2 left-2 flex gap-2 items-center"
              style={{ fontSize: 12 * cellSize }}
            >
              <div className="bg-black/50 text-white px-2 py-1 rounded font-mono">
                ⏱️ {timeLeft}s
              </div>
              <div className="bg-black/50 text-white px-2 py-1 rounded font-mono">
                {Array(3).fill(0).map((_, i) => (
                  <span key={i} style={{ opacity: i < shots ? 1 : 0.3 }}>🔴</span>
                ))}
              </div>
            </div>
          )}

          {/* Start/Game Over overlay */}
          {gameState !== 'playing' && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/70">
              <div className="text-center">
                <div className="text-yellow-400 font-bold text-lg mb-2 font-mono drop-shadow-lg">
                  {gameState === 'idle' ? '🦆 DUCK HUNT' : '🎯 GAME OVER'}
                </div>
                {gameState === 'gameover' && (
                  <div className="text-white text-sm mb-2 font-mono space-y-1">
                    <div>Score: {score}</div>
                    <div>Ducks Hit: {ducksHit}</div>
                    <div>Accuracy: {accuracy}%</div>
                  </div>
                )}
                <button
                  onClick={resetGame}
                  className="win96-btn text-xs px-4 py-1"
                >
                  {gameState === 'idle' ? 'Start Hunting' : 'Play Again'}
                </button>
                <div className="text-yellow-200 text-[10px] mt-2 font-mono">
                  <span className="hidden sm:inline">Press SPACE or ENTER</span>
                  <span className="sm:hidden">Tap to start</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Status bar */}
      <div className="win96-statusbar flex justify-between text-[10px]">
        <span>Click/Tap to shoot the ducks!</span>
        <span>🦆 {ducksHit} hit</span>
      </div>
    </div>
  )
}
