'use client'

/**
 * FeatureIcon - Simple themed icons that are relevant to the feature text
 * Uses currentColor to adapt to light/dark/themed modes
 * Picks relevant icons based on keywords in the content
 */

interface FeatureIconProps {
  content: string
  size?: number
  className?: string
}

// Keywords mapped to icon types
const KEYWORD_MAP: Record<string, string[]> = {
  // UI/Visual
  theme: ['dark', 'light', 'mode', 'theme', 'color', 'colour'],
  layout: ['layout', 'grid', 'flex', 'column', 'row', 'responsive'],
  image: ['image', 'photo', 'picture', 'icon', 'logo', 'avatar', 'banner'],
  button: ['button', 'click', 'tap', 'press', 'toggle'],
  form: ['form', 'input', 'field', 'text', 'textarea', 'submit'],

  // Features
  search: ['search', 'find', 'filter', 'query'],
  notification: ['notification', 'alert', 'bell', 'notify', 'toast'],
  settings: ['setting', 'config', 'preference', 'option'],
  user: ['user', 'profile', 'account', 'avatar', 'auth', 'login'],
  chat: ['chat', 'message', 'comment', 'reply', 'discussion'],

  // Data/Content
  list: ['list', 'item', 'changelog', 'log', 'history'],
  chart: ['chart', 'graph', 'stats', 'analytics', 'metric'],
  file: ['file', 'document', 'upload', 'download', 'attachment'],
  link: ['link', 'url', 'redirect', 'navigation', 'nav'],
  code: ['code', 'api', 'endpoint', 'function', 'script'],

  // Actions
  add: ['add', 'create', 'new', 'plus', 'insert'],
  edit: ['edit', 'modify', 'update', 'change'],
  delete: ['delete', 'remove', 'trash', 'clear'],
  share: ['share', 'export', 'send', 'distribute'],
  vote: ['vote', 'upvote', 'downvote', 'like', 'rate'],

  // System
  security: ['security', 'lock', 'password', 'encrypt', 'secure'],
  speed: ['speed', 'fast', 'performance', 'optimize', 'cache'],
  mobile: ['mobile', 'phone', 'responsive', 'touch'],
  terminal: ['terminal', 'console', 'cli', 'command'],
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

  // Default fallback based on hash
  const hash = hashString(content)
  const fallbacks = ['star', 'sparkle', 'dot', 'diamond']
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

export default function FeatureIcon({ content, size = 24, className = '' }: FeatureIconProps) {
  const iconType = getIconType(content)

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

      // Fallback icons
      case 'star':
        return (
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        )
      case 'sparkle':
        return (
          <>
            <path d="M12 3v4M12 17v4M5.636 5.636l2.828 2.828M15.536 15.536l2.828 2.828M3 12h4M17 12h4M5.636 18.364l2.828-2.828M15.536 8.464l2.828-2.828" />
          </>
        )
      case 'dot':
        return (
          <circle cx="12" cy="12" r="6" />
        )
      case 'diamond':
        return (
          <polygon points="12 2 22 12 12 22 2 12" />
        )
      default:
        return (
          <circle cx="12" cy="12" r="6" />
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
