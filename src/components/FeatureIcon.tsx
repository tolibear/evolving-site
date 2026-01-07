'use client'

/**
 * FeatureIcon - Creative symbolic icons that represent feature meanings
 * Uses currentColor to adapt to light/dark/themed modes
 * Picks contextually meaningful icons based on content analysis
 */

interface FeatureIconProps {
  content: string
  size?: number
  className?: string
  iconOverride?: string | null // Explicit icon type to use instead of auto-detection
}

// All available icon types - can be used as iconOverride values
export const AVAILABLE_ICON_TYPES = [
  // UI/Visual
  'theme', 'layout', 'image', 'button', 'form',
  // Features
  'search', 'notification', 'settings', 'user', 'chat',
  // Data/Content
  'list', 'chart', 'file', 'link', 'code',
  // Actions
  'add', 'edit', 'delete', 'share', 'vote',
  // System
  'security', 'speed', 'mobile', 'terminal',
  // Creative
  'animation', 'sound', 'time', 'magic', 'globe', 'bookmark', 'eye', 'puzzle',
  'trophy', 'heart', 'rocket', 'palette', 'brain', 'shield', 'compass', 'zap',
  'tag', 'cursor', 'refresh', 'icon',
  // Fallbacks
  'star', 'sparkle', 'dot', 'diamond', 'hexagon', 'flower',
] as const

export type IconType = typeof AVAILABLE_ICON_TYPES[number]

// Keywords mapped to icon types - expanded for more creative symbolism
const KEYWORD_MAP: Record<string, string[]> = {
  // UI/Visual - aesthetic icons
  theme: ['dark', 'light', 'mode', 'theme', 'color', 'colour', 'palette', 'appearance'],
  layout: ['layout', 'grid', 'flex', 'column', 'row', 'arrange', 'organize'],
  image: ['image', 'photo', 'picture', 'logo', 'banner', 'graphic', 'visual'],
  button: ['button', 'click', 'tap', 'press', 'toggle', 'switch'],
  form: ['form', 'input', 'field', 'textarea', 'submit', 'entry'],

  // Features - distinctive icons
  search: ['search', 'find', 'filter', 'query', 'lookup', 'discover'],
  notification: ['notification', 'alert', 'bell', 'notify', 'toast', 'remind'],
  settings: ['setting', 'config', 'preference', 'option', 'customize', 'adjust'],
  user: ['user', 'profile', 'account', 'avatar', 'auth', 'login', 'member', 'person'],
  chat: ['chat', 'message', 'comment', 'reply', 'discussion', 'conversation', 'talk'],

  // Data/Content - creative representations
  list: ['list', 'item', 'changelog', 'log', 'history', 'catalog'],
  chart: ['chart', 'graph', 'stats', 'analytics', 'metric', 'data', 'insight'],
  file: ['file', 'document', 'upload', 'download', 'attachment', 'doc'],
  link: ['link', 'url', 'redirect', 'navigation', 'nav', 'goto', 'route'],
  code: ['code', 'api', 'endpoint', 'function', 'script', 'program', 'dev'],

  // Actions - expressive icons
  add: ['add', 'create', 'new', 'plus', 'insert', 'generate'],
  edit: ['edit', 'modify', 'update', 'change', 'revise', 'alter'],
  delete: ['delete', 'remove', 'trash', 'clear', 'erase'],
  share: ['share', 'export', 'send', 'distribute', 'spread'],
  vote: ['vote', 'upvote', 'downvote', 'like', 'rate', 'rank', 'score'],

  // System - technical icons
  security: ['security', 'lock', 'password', 'encrypt', 'secure', 'protect', 'safe'],
  speed: ['speed', 'fast', 'performance', 'optimize', 'cache', 'quick', 'efficient'],
  mobile: ['mobile', 'phone', 'responsive', 'touch', 'device', 'tablet'],
  terminal: ['terminal', 'console', 'cli', 'command', 'shell', 'bash'],

  // New creative categories
  animation: ['animation', 'animate', 'motion', 'transition', 'move', 'smooth', 'dynamic'],
  sound: ['sound', 'audio', 'music', 'volume', 'speaker', 'noise'],
  time: ['time', 'clock', 'schedule', 'timer', 'countdown', 'date', 'calendar'],
  magic: ['magic', 'ai', 'auto', 'smart', 'intelligent', 'clever', 'wizard'],
  globe: ['global', 'world', 'international', 'language', 'translate', 'i18n'],
  bookmark: ['bookmark', 'save', 'favorite', 'star', 'pin', 'keep'],
  eye: ['view', 'see', 'watch', 'preview', 'visibility', 'show', 'display', 'hide'],
  puzzle: ['plugin', 'extension', 'addon', 'module', 'integrate', 'component'],
  trophy: ['achievement', 'badge', 'reward', 'gamif', 'point', 'level', 'progress'],
  heart: ['love', 'favorite', 'heart', 'appreciate', 'thanks', 'grateful'],
  rocket: ['launch', 'deploy', 'ship', 'release', 'publish', 'live', 'production'],
  palette: ['design', 'style', 'css', 'beautiful', 'pretty', 'aesthetic', 'ui'],
  brain: ['learn', 'smart', 'think', 'suggest', 'recommend', 'predict'],
  shield: ['protect', 'guard', 'defend', 'verify', 'validate', 'check'],
  compass: ['guide', 'help', 'tour', 'onboard', 'intro', 'welcome', 'tutorial'],
  zap: ['instant', 'realtime', 'live', 'sync', 'websocket', 'stream'],
  tag: ['tag', 'label', 'category', 'badge', 'meta', 'keyword'],
  cursor: ['cursor', 'pointer', 'mouse', 'hover', 'interact', 'ux'],
  refresh: ['refresh', 'reload', 'retry', 'again', 'repeat', 'redo'],
  icon: ['icon', 'emoji', 'symbol', 'glyph', 'creative'],
}

function getIconType(content: string): string {
  const lowerContent = content.toLowerCase()

  for (const [iconType, keywords] of Object.entries(KEYWORD_MAP)) {
    for (const keyword of keywords) {
      if (lowerContent.includes(keyword)) {
        return iconType
      }
    }
  }

  // Default fallback based on hash - more creative variety
  const hash = hashString(content)
  const fallbacks = ['star', 'sparkle', 'dot', 'diamond', 'hexagon', 'flower']
  return fallbacks[hash % fallbacks.length]
}

function hashString(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash
  }
  return Math.abs(hash)
}

export default function FeatureIcon({ content, size = 24, className = '', iconOverride }: FeatureIconProps) {
  // Use explicit override if provided, otherwise auto-detect from content
  const iconType = iconOverride || getIconType(content)

  const renderIcon = () => {
    switch (iconType) {
      // UI/Visual icons
      case 'theme':
        return (
          <>
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
          </>
        )
      case 'layout':
        return (
          <>
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <path d="M3 9h18M9 21V9" />
          </>
        )
      case 'image':
        return (
          <>
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <path d="m21 15-5-5L5 21" />
          </>
        )
      case 'button':
        return (
          <>
            <rect x="4" y="8" width="16" height="8" rx="2" />
            <path d="M8 12h8" />
          </>
        )
      case 'form':
        return (
          <>
            <rect x="3" y="5" width="18" height="4" rx="1" />
            <rect x="3" y="11" width="18" height="4" rx="1" />
            <rect x="3" y="17" width="8" height="2" rx="1" />
          </>
        )

      // Feature icons
      case 'search':
        return (
          <>
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </>
        )
      case 'notification':
        return (
          <>
            <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
            <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
          </>
        )
      case 'settings':
        return (
          <>
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </>
        )
      case 'user':
        return (
          <>
            <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </>
        )
      case 'chat':
        return (
          <>
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </>
        )

      // Data/Content icons
      case 'list':
        return (
          <>
            <line x1="8" y1="6" x2="21" y2="6" />
            <line x1="8" y1="12" x2="21" y2="12" />
            <line x1="8" y1="18" x2="21" y2="18" />
            <line x1="3" y1="6" x2="3.01" y2="6" />
            <line x1="3" y1="12" x2="3.01" y2="12" />
            <line x1="3" y1="18" x2="3.01" y2="18" />
          </>
        )
      case 'chart':
        return (
          <>
            <line x1="18" y1="20" x2="18" y2="10" />
            <line x1="12" y1="20" x2="12" y2="4" />
            <line x1="6" y1="20" x2="6" y2="14" />
          </>
        )
      case 'file':
        return (
          <>
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
          </>
        )
      case 'link':
        return (
          <>
            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
          </>
        )
      case 'code':
        return (
          <>
            <polyline points="16 18 22 12 16 6" />
            <polyline points="8 6 2 12 8 18" />
          </>
        )

      // Action icons
      case 'add':
        return (
          <>
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </>
        )
      case 'edit':
        return (
          <>
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
          </>
        )
      case 'delete':
        return (
          <>
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
          </>
        )
      case 'share':
        return (
          <>
            <circle cx="18" cy="5" r="3" />
            <circle cx="6" cy="12" r="3" />
            <circle cx="18" cy="19" r="3" />
            <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
            <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
          </>
        )
      case 'vote':
        return (
          <>
            <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" />
          </>
        )

      // System icons
      case 'security':
        return (
          <>
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </>
        )
      case 'speed':
        return (
          <>
            <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
          </>
        )
      case 'mobile':
        return (
          <>
            <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
            <line x1="12" y1="18" x2="12.01" y2="18" />
          </>
        )
      case 'terminal':
        return (
          <>
            <polyline points="4 17 10 11 4 5" />
            <line x1="12" y1="19" x2="20" y2="19" />
          </>
        )

      // New creative icons
      case 'animation':
        // Bouncing motion lines - suggests movement
        return (
          <>
            <path d="M5 9c0-3.5 2.5-6 6-6 3.5 0 6 2.5 6 6" />
            <path d="M5 15c0 3.5 2.5 6 6 6 3.5 0 6-2.5 6-6" />
            <circle cx="11" cy="12" r="2" />
            <path d="M17 12h4" />
            <path d="M3 12h4" />
          </>
        )
      case 'sound':
        // Speaker with sound waves
        return (
          <>
            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
            <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
            <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
          </>
        )
      case 'time':
        // Clock face
        return (
          <>
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </>
        )
      case 'magic':
        // Magic wand with sparkles
        return (
          <>
            <path d="M15 4V2" />
            <path d="M15 16v-2" />
            <path d="M8 9h2" />
            <path d="M20 9h2" />
            <path d="M17.8 11.8L19 13" />
            <path d="M15 9h.01" />
            <path d="M17.8 6.2L19 5" />
            <path d="m3 21 9-9" />
            <path d="M12.2 6.2L11 5" />
          </>
        )
      case 'globe':
        // Earth globe
        return (
          <>
            <circle cx="12" cy="12" r="10" />
            <line x1="2" y1="12" x2="22" y2="12" />
            <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
          </>
        )
      case 'bookmark':
        // Bookmark ribbon
        return (
          <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
        )
      case 'eye':
        // Eye with pupil
        return (
          <>
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
            <circle cx="12" cy="12" r="3" />
          </>
        )
      case 'puzzle':
        // Puzzle piece
        return (
          <>
            <path d="M19.439 7.85c-.049.322.059.648.289.878l1.568 1.568c.47.47.706 1.087.706 1.704s-.235 1.233-.706 1.704l-1.611 1.611a.98.98 0 0 1-.837.276c-.47-.07-.802-.48-.968-.925a2.501 2.501 0 1 0-3.214 3.214c.446.166.855.497.925.968a.979.979 0 0 1-.276.837l-1.61 1.611a2.404 2.404 0 0 1-1.705.706 2.402 2.402 0 0 1-1.704-.706l-1.568-1.568a1.026 1.026 0 0 0-.877-.29c-.493.074-.84.504-1.02.968a2.5 2.5 0 1 1-3.237-3.237c.464-.18.894-.527.967-1.02a1.026 1.026 0 0 0-.289-.877l-1.568-1.568A2.402 2.402 0 0 1 2 11.5c0-.617.236-1.234.706-1.704L4.317 8.19a.979.979 0 0 1 .837-.276c.47.07.802.48.968.925a2.501 2.501 0 1 0 3.214-3.214c-.446-.166-.855-.497-.925-.968a.98.98 0 0 1 .276-.837l1.61-1.611a2.404 2.404 0 0 1 1.705-.706c.617 0 1.233.236 1.704.706l1.568 1.568c.23.23.556.338.877.29.493-.074.84-.504 1.02-.968a2.5 2.5 0 1 1 3.237 3.237c-.464.18-.894.527-.967 1.02z" />
          </>
        )
      case 'trophy':
        // Trophy cup
        return (
          <>
            <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
            <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
            <path d="M4 22h16" />
            <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
            <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
            <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
          </>
        )
      case 'heart':
        // Heart shape
        return (
          <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
        )
      case 'rocket':
        // Rocket ship
        return (
          <>
            <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z" />
            <path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z" />
            <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0" />
            <path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5" />
          </>
        )
      case 'palette':
        // Artist palette
        return (
          <>
            <circle cx="13.5" cy="6.5" r=".5" />
            <circle cx="17.5" cy="10.5" r=".5" />
            <circle cx="8.5" cy="7.5" r=".5" />
            <circle cx="6.5" cy="12.5" r=".5" />
            <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.555C21.965 6.012 17.461 2 12 2z" />
          </>
        )
      case 'brain':
        // Brain/thinking
        return (
          <>
            <path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96.44 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 1.98-3A2.5 2.5 0 0 1 9.5 2Z" />
            <path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96.44 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-1.98-3A2.5 2.5 0 0 0 14.5 2Z" />
          </>
        )
      case 'shield':
        // Shield with check
        return (
          <>
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            <path d="m9 12 2 2 4-4" />
          </>
        )
      case 'compass':
        // Compass for navigation/guidance
        return (
          <>
            <circle cx="12" cy="12" r="10" />
            <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
          </>
        )
      case 'zap':
        // Lightning bolt for instant/realtime
        return (
          <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
        )
      case 'tag':
        // Tag/label
        return (
          <>
            <path d="M12 2H2v10l9.29 9.29c.94.94 2.48.94 3.42 0l6.58-6.58c.94-.94.94-2.48 0-3.42L12 2Z" />
            <path d="M7 7h.01" />
          </>
        )
      case 'cursor':
        // Mouse cursor
        return (
          <>
            <path d="m3 3 7.07 16.97 2.51-7.39 7.39-2.51L3 3z" />
            <path d="m13 13 6 6" />
          </>
        )
      case 'refresh':
        // Refresh arrows
        return (
          <>
            <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
            <path d="M3 3v5h5" />
            <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
            <path d="M16 21h5v-5" />
          </>
        )
      case 'icon':
        // Creative star burst for icon/creative features
        return (
          <>
            <path d="M12 3l1.912 5.813a1 1 0 0 0 .95.687h6.138l-4.97 3.612a1 1 0 0 0-.364 1.118l1.9 5.77-4.97-3.612a1 1 0 0 0-1.176 0l-4.97 3.612 1.9-5.77a1 1 0 0 0-.364-1.118L3 9.5h6.138a1 1 0 0 0 .95-.687L12 3z" />
          </>
        )

      // Fallback icons - more creative variety
      case 'star':
        return (
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        )
      case 'sparkle':
        // Four-point sparkle
        return (
          <>
            <path d="M12 3v4" />
            <path d="M12 17v4" />
            <path d="M3 12h4" />
            <path d="M17 12h4" />
            <path d="m5.6 5.6 2.8 2.8" />
            <path d="m15.6 15.6 2.8 2.8" />
            <path d="m5.6 18.4 2.8-2.8" />
            <path d="m15.6 8.4 2.8-2.8" />
          </>
        )
      case 'dot':
        // Concentric circles - more interesting
        return (
          <>
            <circle cx="12" cy="12" r="8" />
            <circle cx="12" cy="12" r="4" />
            <circle cx="12" cy="12" r="1" />
          </>
        )
      case 'diamond':
        // Gem diamond
        return (
          <>
            <path d="M6 3h12l4 6-10 13L2 9Z" />
            <path d="M11 3 8 9l4 13 4-13-3-6" />
            <path d="M2 9h20" />
          </>
        )
      case 'hexagon':
        // Honeycomb hex
        return (
          <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
        )
      case 'flower':
        // Flower petals
        return (
          <>
            <path d="M12 7.5a4.5 4.5 0 1 1 4.5 4.5M12 7.5A4.5 4.5 0 1 0 7.5 12M12 7.5V9m-4.5 3a4.5 4.5 0 1 0 4.5 4.5M7.5 12H9m7.5 0a4.5 4.5 0 1 1-4.5 4.5m4.5-4.5H15m-3 4.5V15" />
            <circle cx="12" cy="12" r="3" />
          </>
        )
      default:
        // Abstract geometric default
        return (
          <>
            <circle cx="12" cy="12" r="8" />
            <path d="M12 4v16M4 12h16" />
          </>
        )
    }
  }

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {renderIcon()}
    </svg>
  )
}
