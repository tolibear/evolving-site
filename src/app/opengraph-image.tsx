import { ImageResponse } from 'next/og'

export const runtime = 'edge'

export const alt = 'Evolving Site - Suggest features, vote, and watch Claude implement the winners'
export const size = {
  width: 1200,
  height: 630,
}
export const contentType = 'image/png'

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #171717 0%, #262626 50%, #171717 100%)',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        {/* Decorative elements */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'radial-gradient(circle at 20% 80%, rgba(115, 115, 115, 0.15) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(163, 163, 163, 0.1) 0%, transparent 50%)',
            display: 'flex',
          }}
        />

        {/* Main content */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '40px 60px',
            textAlign: 'center',
          }}
        >
          {/* Icon/Logo area */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 80,
              height: 80,
              borderRadius: 20,
              background: 'linear-gradient(135deg, #525252 0%, #404040 100%)',
              marginBottom: 32,
              fontSize: 40,
            }}
          >
            <span style={{ filter: 'grayscale(100%) brightness(1.5)' }}>&#9883;</span>
          </div>

          {/* Title */}
          <h1
            style={{
              fontSize: 72,
              fontWeight: 700,
              color: '#fafafa',
              margin: 0,
              marginBottom: 16,
              letterSpacing: '-0.02em',
            }}
          >
            Evolving Site
          </h1>

          {/* Tagline */}
          <p
            style={{
              fontSize: 28,
              color: '#a3a3a3',
              margin: 0,
              maxWidth: 800,
              lineHeight: 1.4,
            }}
          >
            Suggest features, vote, and watch Claude implement the winners
          </p>

          {/* Footer badge */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              marginTop: 48,
              padding: '12px 24px',
              background: 'rgba(82, 82, 82, 0.3)',
              borderRadius: 100,
              border: '1px solid rgba(163, 163, 163, 0.2)',
            }}
          >
            <span style={{ fontSize: 16, color: '#a3a3a3' }}>
              Powered by Claude + Ralph Wiggum
            </span>
          </div>
        </div>
      </div>
    ),
    {
      ...size,
    }
  )
}
