'use client'

interface LoginPromptProps {
  action: 'submit' | 'vote' | 'comment'
  compact?: boolean
}

const actionText = {
  submit: 'submit a suggestion',
  vote: 'vote',
  comment: 'comment',
}

export default function LoginPrompt({ action, compact = false }: LoginPromptProps) {
  const handleLogin = () => {
    window.location.href = '/api/auth/twitter'
  }

  if (compact) {
    return (
      <button
        onClick={handleLogin}
        className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-foreground transition-colors"
      >
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
        Sign in to {actionText[action]}
      </button>
    )
  }

  return (
    <div className="flex flex-col items-center gap-3 py-4 px-6 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/50">
      <p className="text-sm text-muted text-center">
        Sign in with Twitter to {actionText[action]}
      </p>
      <button
        onClick={handleLogin}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-full
                   bg-neutral-900 dark:bg-white text-white dark:text-neutral-900
                   hover:bg-neutral-800 dark:hover:bg-neutral-100
                   transition-colors font-medium text-sm"
      >
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
        Sign in with Twitter
      </button>
    </div>
  )
}
