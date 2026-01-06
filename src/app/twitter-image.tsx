import { ImageResponse } from 'next/og'

export const runtime = 'edge'

export const alt = 'Evolving Site - Suggest features, vote, and watch Claude implement the winners'
export const size = {
  width: 1200,
  height: 630,
}
export const contentType = 'image/png'

export default async function Image() {
  const ralphImageData = await fetch(
    new URL('/ralph.png', 'https://evolving-site.vercel.app')
  ).then((res) => res.arrayBuffer())

  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 50%, #fef3c7 100%)',
          fontFamily: 'system-ui, sans-serif',
          position: 'relative',
        }}
      >
        {/* Left side - Ralph with speech bubble */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'flex-end',
            width: '40%',
            paddingBottom: 0,
            position: 'relative',
          }}
        >
          {/* Speech bubble */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              position: 'absolute',
              top: 60,
              right: 20,
              background: 'white',
              borderRadius: 24,
              padding: '20px 28px',
              maxWidth: 280,
              boxShadow: '0 4px 24px rgba(0,0,0,0.15)',
            }}
          >
            <span style={{ fontSize: 22, color: '#171717', fontStyle: 'italic', lineHeight: 1.4 }}>
              &ldquo;I&apos;m helping!&rdquo;
            </span>
            {/* Bubble tail */}
            <div
              style={{
                position: 'absolute',
                bottom: -20,
                left: 40,
                width: 0,
                height: 0,
                borderLeft: '12px solid transparent',
                borderRight: '12px solid transparent',
                borderTop: '24px solid white',
              }}
            />
          </div>

          {/* Ralph image */}
          <img
            src={`data:image/png;base64,${Buffer.from(ralphImageData).toString('base64')}`}
            alt="Ralph Wiggum"
            width={320}
            height={400}
            style={{
              objectFit: 'contain',
              objectPosition: 'bottom',
              marginBottom: -10,
            }}
          />
        </div>

        {/* Right side - Content */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-start',
            justifyContent: 'center',
            width: '60%',
            padding: '40px 60px 40px 20px',
          }}
        >
          {/* Title */}
          <h1
            style={{
              fontSize: 64,
              fontWeight: 800,
              color: '#171717',
              margin: 0,
              marginBottom: 16,
              letterSpacing: '-0.02em',
              lineHeight: 1.1,
            }}
          >
            Evolving Site
          </h1>

          {/* Tagline */}
          <p
            style={{
              fontSize: 26,
              color: '#525252',
              margin: 0,
              marginBottom: 32,
              lineHeight: 1.5,
              maxWidth: 500,
            }}
          >
            Suggest features, vote on them, and watch Claude implement the winners live
          </p>

          {/* Features */}
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                padding: '10px 20px',
                background: 'rgba(255,255,255,0.7)',
                borderRadius: 100,
                fontSize: 18,
                color: '#374151',
              }}
            >
              💡 Submit Ideas
            </div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                padding: '10px 20px',
                background: 'rgba(255,255,255,0.7)',
                borderRadius: 100,
                fontSize: 18,
                color: '#374151',
              }}
            >
              🗳️ Vote
            </div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                padding: '10px 20px',
                background: 'rgba(255,255,255,0.7)',
                borderRadius: 100,
                fontSize: 18,
                color: '#374151',
              }}
            >
              🤖 Auto-implemented
            </div>
          </div>

          {/* Powered by */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              marginTop: 40,
              fontSize: 16,
              color: '#6b7280',
            }}
          >
            Powered by Claude AI + Ralph Wiggum
          </div>
        </div>
      </div>
    ),
    {
      ...size,
    }
  )
}
