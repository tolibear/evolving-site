// UI Sound Effects - synthesized using Web Audio API
// Respects user preferences for reduced motion and provides mute controls

type SoundType = 'click' | 'success' | 'error' | 'vote' | 'notification' | 'hover' | 'submit'

interface SoundConfig {
  enabled: boolean
  volume: number
}

class SoundManager {
  private audioContext: AudioContext | null = null
  private config: SoundConfig = { enabled: true, volume: 0.3 }
  private initialized = false

  constructor() {
    if (typeof window !== 'undefined') {
      this.loadConfig()
    }
  }

  private loadConfig(): void {
    try {
      const stored = localStorage.getItem('sound-config')
      if (stored) {
        this.config = JSON.parse(stored)
      }
      // Respect prefers-reduced-motion
      const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      if (prefersReducedMotion) {
        this.config.enabled = false
      }
    } catch {
      // Use defaults
    }
  }

  private saveConfig(): void {
    try {
      localStorage.setItem('sound-config', JSON.stringify(this.config))
    } catch {
      // Ignore storage errors
    }
  }

  private getContext(): AudioContext | null {
    if (typeof window === 'undefined') return null

    if (!this.audioContext) {
      try {
        this.audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
      } catch {
        return null
      }
    }

    // Resume if suspended (browser autoplay policy)
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume().catch(() => {})
    }

    return this.audioContext
  }

  private playTone(
    frequency: number,
    duration: number,
    type: OscillatorType = 'sine',
    attack = 0.01,
    decay = 0.1
  ): void {
    const ctx = this.getContext()
    if (!ctx || !this.config.enabled) return

    const oscillator = ctx.createOscillator()
    const gainNode = ctx.createGain()

    oscillator.connect(gainNode)
    gainNode.connect(ctx.destination)

    oscillator.type = type
    oscillator.frequency.setValueAtTime(frequency, ctx.currentTime)

    // ADSR envelope
    const now = ctx.currentTime
    gainNode.gain.setValueAtTime(0, now)
    gainNode.gain.linearRampToValueAtTime(this.config.volume, now + attack)
    gainNode.gain.exponentialRampToValueAtTime(0.01, now + attack + decay)

    oscillator.start(now)
    oscillator.stop(now + duration)
  }

  private playChord(frequencies: number[], duration: number, type: OscillatorType = 'sine'): void {
    frequencies.forEach((freq, i) => {
      setTimeout(() => this.playTone(freq, duration, type, 0.01, duration * 0.8), i * 30)
    })
  }

  play(sound: SoundType): void {
    if (!this.config.enabled) return

    // Initialize on first user interaction
    if (!this.initialized) {
      this.initialized = true
      this.getContext()
    }

    switch (sound) {
      case 'click':
        // Short, snappy click
        this.playTone(800, 0.05, 'square', 0.001, 0.04)
        break

      case 'hover':
        // Subtle hover blip
        this.playTone(600, 0.03, 'sine', 0.001, 0.02)
        break

      case 'success':
        // Ascending triumphant chord
        this.playChord([523.25, 659.25, 783.99], 0.3, 'sine') // C5, E5, G5
        break

      case 'error':
        // Descending warning tone
        this.playTone(400, 0.15, 'sawtooth', 0.01, 0.14)
        setTimeout(() => this.playTone(300, 0.2, 'sawtooth', 0.01, 0.18), 100)
        break

      case 'vote':
        // Satisfying pop with harmonics
        this.playTone(880, 0.1, 'sine', 0.005, 0.08)
        this.playTone(1760, 0.08, 'sine', 0.005, 0.06)
        break

      case 'notification':
        // Attention-grabbing two-tone
        this.playTone(880, 0.1, 'sine', 0.01, 0.08)
        setTimeout(() => this.playTone(1174.66, 0.15, 'sine', 0.01, 0.12), 120) // D6
        break

      case 'submit':
        // Whoosh + confirmation
        this.playTone(200, 0.1, 'sine', 0.01, 0.08)
        this.playTone(400, 0.15, 'sine', 0.02, 0.12)
        setTimeout(() => this.playTone(800, 0.2, 'sine', 0.01, 0.15), 100)
        break
    }
  }

  setEnabled(enabled: boolean): void {
    this.config.enabled = enabled
    this.saveConfig()
  }

  isEnabled(): boolean {
    return this.config.enabled
  }

  setVolume(volume: number): void {
    this.config.volume = Math.max(0, Math.min(1, volume))
    this.saveConfig()
  }

  getVolume(): number {
    return this.config.volume
  }

  toggle(): boolean {
    this.config.enabled = !this.config.enabled
    this.saveConfig()
    return this.config.enabled
  }
}

// Singleton instance
export const soundManager = typeof window !== 'undefined' ? new SoundManager() : null

// Convenience function
export function playSound(sound: SoundType): void {
  soundManager?.play(sound)
}

// Hook for React components
export function useSounds() {
  return {
    play: (sound: SoundType) => soundManager?.play(sound),
    toggle: () => soundManager?.toggle() ?? false,
    isEnabled: () => soundManager?.isEnabled() ?? false,
    setVolume: (v: number) => soundManager?.setVolume(v),
    getVolume: () => soundManager?.getVolume() ?? 0.3,
  }
}
