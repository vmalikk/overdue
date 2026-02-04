'use client'

import { useEffect, useState } from 'react'

interface Snowflake {
  id: number
  left: number
  animationDuration: number
  animationDelay: number
  opacity: number
  size: number
}

export function Snow({ enabled = true }: { enabled?: boolean }) {
  const [snowflakes, setSnowflakes] = useState<Snowflake[]>([])

  useEffect(() => {
    if (!enabled) {
      setSnowflakes([])
      return
    }

    // Generate snowflakes
    const flakes: Snowflake[] = []
    const count = 150

    for (let i = 0; i < count; i++) {
      flakes.push({
        id: i,
        left: Math.random() * 100,
        animationDuration: 5 + Math.random() * 10,
        animationDelay: Math.random() * 5,
        opacity: 0.3 + Math.random() * 0.7,
        size: 4 + Math.random() * 8,
      })
    }

    setSnowflakes(flakes)
  }, [enabled])

  if (!enabled || snowflakes.length === 0) return null

  return (
    <>
      <style jsx global>{`
        @keyframes snowfall {
          0% {
            transform: translateY(-10vh) rotate(0deg);
          }
          100% {
            transform: translateY(110vh) rotate(360deg);
          }
        }

        @keyframes sway {
          0%, 100% {
            transform: translateX(0);
          }
          50% {
            transform: translateX(20px);
          }
        }
      `}</style>
      <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
        {snowflakes.map((flake) => (
          <div
            key={flake.id}
            className="absolute text-white"
            style={{
              left: `${flake.left}%`,
              top: '-20px',
              opacity: flake.opacity,
              fontSize: `${flake.size}px`,
              animation: `snowfall ${flake.animationDuration}s linear infinite`,
              animationDelay: `${flake.animationDelay}s`,
            }}
          >
            ❄
          </div>
        ))}
      </div>
    </>
  )
}
