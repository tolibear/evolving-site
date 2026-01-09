'use client'

import { useState, useEffect, useCallback, useRef } from 'react'

const GRID_SIZE = 20
const CELL_SIZE = 16
const INITIAL_SPEED = 150

type Position = { x: number; y: number }
type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT'

export function SnakeGame() {
  const [snake, setSnake] = useState<Position[]>([{ x: 10, y: 10 }])
  const [food, setFood] = useState<Position>({ x: 15, y: 15 })
  const [direction, setDirection] = useState<Direction>('RIGHT')
  const [gameState, setGameState] = useState<'idle' | 'playing' | 'gameover'>('idle')
  const [score, setScore] = useState(0)
  const [highScore, setHighScore] = useState(0)
  const directionRef = useRef<Direction>('RIGHT')
  const gameLoopRef = useRef<NodeJS.Timeout | null>(null)

  const generateFood = useCallback((currentSnake: Position[]): Position => {
    let newFood: Position
    do {
      newFood = {
        x: Math.floor(Math.random() * GRID_SIZE),
        y: Math.floor(Math.random() * GRID_SIZE),
      }
    } while (currentSnake.some(seg => seg.x === newFood.x && seg.y === newFood.y))
    return newFood
  }, [])

  const resetGame = useCallback(() => {
    const initialSnake = [{ x: 10, y: 10 }]
    setSnake(initialSnake)
    setFood(generateFood(initialSnake))
    setDirection('RIGHT')
    directionRef.current = 'RIGHT'
    setScore(0)
    setGameState('playing')
  }, [generateFood])

  const checkCollision = useCallback((head: Position, body: Position[]): boolean => {
    // Wall collision
    if (head.x < 0 || head.x >= GRID_SIZE || head.y < 0 || head.y >= GRID_SIZE) {
      return true
    }
    // Self collision (check against body, not including the tail that will move)
    for (let i = 0; i < body.length - 1; i++) {
      if (body[i].x === head.x && body[i].y === head.y) {
        return true
      }
    }
    return false
  }, [])

  const moveSnake = useCallback(() => {
    setSnake(prevSnake => {
      const head = { ...prevSnake[0] }
      const currentDirection = directionRef.current

      switch (currentDirection) {
        case 'UP':
          head.y -= 1
          break
        case 'DOWN':
          head.y += 1
          break
        case 'LEFT':
          head.x -= 1
          break
        case 'RIGHT':
          head.x += 1
          break
      }

      if (checkCollision(head, prevSnake)) {
        setGameState('gameover')
        setHighScore(prev => Math.max(prev, score))
        return prevSnake
      }

      const newSnake = [head, ...prevSnake]

      // Check if eating food
      setFood(currentFood => {
        if (head.x === currentFood.x && head.y === currentFood.y) {
          setScore(prev => prev + 10)
          return generateFood(newSnake)
        }
        return currentFood
      })

      // If not eating, remove tail
      if (head.x !== food.x || head.y !== food.y) {
        newSnake.pop()
      }

      return newSnake
    })
  }, [checkCollision, generateFood, food, score])

  useEffect(() => {
    if (gameState === 'playing') {
      gameLoopRef.current = setInterval(moveSnake, INITIAL_SPEED)
      return () => {
        if (gameLoopRef.current) {
          clearInterval(gameLoopRef.current)
        }
      }
    }
  }, [gameState, moveSnake])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameState !== 'playing') {
        if (e.key === ' ' || e.key === 'Enter') {
          resetGame()
        }
        return
      }

      const currentDir = directionRef.current
      switch (e.key) {
        case 'ArrowUp':
        case 'w':
        case 'W':
          if (currentDir !== 'DOWN') {
            directionRef.current = 'UP'
            setDirection('UP')
          }
          break
        case 'ArrowDown':
        case 's':
        case 'S':
          if (currentDir !== 'UP') {
            directionRef.current = 'DOWN'
            setDirection('DOWN')
          }
          break
        case 'ArrowLeft':
        case 'a':
        case 'A':
          if (currentDir !== 'RIGHT') {
            directionRef.current = 'LEFT'
            setDirection('LEFT')
          }
          break
        case 'ArrowRight':
        case 'd':
        case 'D':
          if (currentDir !== 'LEFT') {
            directionRef.current = 'RIGHT'
            setDirection('RIGHT')
          }
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [gameState, resetGame])

  // Load high score from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('snake-high-score')
    if (saved) {
      setHighScore(parseInt(saved, 10))
    }
  }, [])

  // Save high score to localStorage
  useEffect(() => {
    if (highScore > 0) {
      localStorage.setItem('snake-high-score', highScore.toString())
    }
  }, [highScore])

  return (
    <div className="win96-window max-w-fit mx-auto">
      {/* Title bar */}
      <div className="win96-titlebar">
        <span className="text-xs font-bold flex items-center gap-1">
          <span>🐍</span> Snake.exe
        </span>
        <span className="text-xs">Score: {score}</span>
      </div>

      {/* Menu bar */}
      <div className="win96-menubar">
        <span className="win96-menu-item" onClick={resetGame}>Game</span>
        <span className="win96-menu-item text-[10px] opacity-70">High Score: {highScore}</span>
      </div>

      {/* Game area */}
      <div className="win96-content relative" style={{ padding: 0 }}>
        <div
          className="relative bg-black"
          style={{
            width: GRID_SIZE * CELL_SIZE,
            height: GRID_SIZE * CELL_SIZE,
          }}
        >
          {/* Grid lines for retro effect */}
          <div
            className="absolute inset-0 pointer-events-none opacity-10"
            style={{
              backgroundImage: `
                linear-gradient(to right, #00ff00 1px, transparent 1px),
                linear-gradient(to bottom, #00ff00 1px, transparent 1px)
              `,
              backgroundSize: `${CELL_SIZE}px ${CELL_SIZE}px`,
            }}
          />

          {/* Snake */}
          {snake.map((segment, index) => (
            <div
              key={index}
              className="absolute transition-all duration-75"
              style={{
                left: segment.x * CELL_SIZE,
                top: segment.y * CELL_SIZE,
                width: CELL_SIZE - 1,
                height: CELL_SIZE - 1,
                backgroundColor: index === 0 ? '#00ff00' : '#00cc00',
                boxShadow: index === 0 ? '0 0 4px #00ff00' : 'none',
              }}
            />
          ))}

          {/* Food */}
          <div
            className="absolute animate-pulse"
            style={{
              left: food.x * CELL_SIZE,
              top: food.y * CELL_SIZE,
              width: CELL_SIZE - 1,
              height: CELL_SIZE - 1,
              backgroundColor: '#ff0000',
              boxShadow: '0 0 6px #ff0000',
            }}
          />

          {/* Start/Game Over overlay */}
          {gameState !== 'playing' && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/80">
              <div className="text-center">
                <div className="text-green-500 font-bold text-lg mb-2 font-mono">
                  {gameState === 'idle' ? '🐍 SNAKE' : '💀 GAME OVER'}
                </div>
                {gameState === 'gameover' && (
                  <div className="text-green-400 text-sm mb-2 font-mono">
                    Score: {score}
                  </div>
                )}
                <button
                  onClick={resetGame}
                  className="win96-btn text-xs px-4 py-1"
                >
                  {gameState === 'idle' ? 'Start Game' : 'Play Again'}
                </button>
                <div className="text-green-600 text-[10px] mt-2 font-mono">
                  Press SPACE or ENTER
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Status bar */}
      <div className="win96-statusbar flex justify-between text-[10px]">
        <span>Use Arrow Keys or WASD to move</span>
        <span>{snake.length} segments</span>
      </div>
    </div>
  )
}
