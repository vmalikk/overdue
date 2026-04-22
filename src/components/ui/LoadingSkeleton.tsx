'use client'

function Shimmer({ width, height, borderRadius = 6 }: { width: string | number; height: number; borderRadius?: number }) {
  return (
    <div className="shimmer" style={{
      width,
      height,
      borderRadius,
    }} />
  )
}

export function LoadingSkeleton() {
  return (
    <div style={{
      display: 'flex',
      height: '100vh',
      overflow: 'hidden',
      background: 'var(--bg)',
    }}>
      {/* Sidebar shimmer */}
      <div style={{
        width: 168,
        minWidth: 168,
        background: 'var(--bg2)',
        borderRight: '1px solid var(--border)',
        padding: '20px 16px',
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
      }}>
        <Shimmer width={90} height={22} borderRadius={4} />
        <div style={{ height: 16 }} />
        {[1, 2, 3, 4, 5].map(i => (
          <Shimmer key={i} width="100%" height={36} borderRadius={8} />
        ))}
      </div>

      {/* Main content shimmer */}
      <div style={{ flex: 1, padding: '24px 28px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 22 }}>
          <div>
            <Shimmer width={220} height={28} borderRadius={4} />
            <div style={{ marginTop: 8 }}>
              <Shimmer width={160} height={16} borderRadius={4} />
            </div>
          </div>
          <Shimmer width={120} height={36} borderRadius={4} />
        </div>

        <Shimmer width="100%" height={48} borderRadius={10} />
        <div style={{ height: 20 }} />

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 20 }}>
          {[1, 2, 3].map(i => <Shimmer key={i} width="100%" height={72} borderRadius={10} />)}
        </div>

        <Shimmer width="100%" height={40} borderRadius={8} />
        <div style={{ height: 12 }} />

        <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
          {[1, 2, 3, 4].map(i => (
            <div key={i} style={{
              display: 'flex',
              gap: 12,
              padding: '12px 16px',
              borderBottom: i < 4 ? '1px solid var(--border)' : 'none',
              alignItems: 'center',
            }}>
              <Shimmer width={9} height={9} borderRadius={99} />
              <div style={{ flex: 1 }}>
                <Shimmer width={`${40 + Math.random() * 40}%`} height={13} borderRadius={3} />
                <div style={{ marginTop: 5, display: 'flex', gap: 6 }}>
                  <Shimmer width={60} height={11} borderRadius={99} />
                  <Shimmer width={50} height={11} borderRadius={99} />
                </div>
              </div>
              <Shimmer width={70} height={32} borderRadius={6} />
              <Shimmer width={24} height={24} borderRadius={99} />
            </div>
          ))}
        </div>
      </div>

      {/* Right sidebar shimmer */}
      <div style={{
        width: 252,
        minWidth: 252,
        background: 'var(--bg2)',
        borderLeft: '1px solid var(--border)',
        padding: '20px 16px',
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
      }}>
        <Shimmer width={70} height={10} borderRadius={3} />
        <Shimmer width="100%" height={200} borderRadius={8} />
        <Shimmer width={80} height={10} borderRadius={3} />
        <Shimmer width="100%" height={80} borderRadius={8} />
        <Shimmer width={70} height={10} borderRadius={3} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[1, 2, 3].map(i => <Shimmer key={i} width="100%" height={28} borderRadius={4} />)}
        </div>
      </div>

      {/* Loading dots */}
      <div style={{
        position: 'fixed',
        bottom: 24,
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        gap: 6,
      }}>
        {[0, 1, 2].map(i => (
          <div key={i} style={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            background: 'var(--accent)',
            animation: `dotPulse 1.2s ease-in-out ${i * 0.2}s infinite`,
          }} />
        ))}
      </div>
    </div>
  )
}
