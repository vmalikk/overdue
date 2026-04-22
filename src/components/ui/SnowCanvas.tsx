'use client'

import { useEffect, useRef } from 'react'

interface Flake {
  x: number
  y: number
  radius: number
  speed: number
  drift: number
  opacity: number
  wobble: number
  wobbleSpeed: number
}

export function SnowCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rafRef = useRef<number>()
  const flakesRef = useRef<Flake[]>([])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const resize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    resize()
    window.addEventListener('resize', resize)

    const initFlakes = () => {
      flakesRef.current = Array.from({ length: 110 }, () => ({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        radius: 0.5 + Math.random() * 2.5,
        speed: 0.4 + Math.random() * 1.2,
        drift: (Math.random() - 0.5) * 0.5,
        opacity: 0.3 + Math.random() * 0.7,
        wobble: Math.random() * Math.PI * 2,
        wobbleSpeed: 0.01 + Math.random() * 0.02,
      }))
    }
    initFlakes()

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      flakesRef.current.forEach(f => {
        f.wobble += f.wobbleSpeed
        f.y += f.speed
        f.x += f.drift + Math.sin(f.wobble) * 0.4

        if (f.y > canvas.height + 5) {
          f.y = -5
          f.x = Math.random() * canvas.width
        }
        if (f.x > canvas.width + 5) f.x = -5
        if (f.x < -5) f.x = canvas.width + 5

        ctx.beginPath()
        ctx.arc(f.x, f.y, f.radius, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(255, 255, 255, ${f.opacity})`
        ctx.fill()
      })
      rafRef.current = requestAnimationFrame(animate)
    }
    animate()

    return () => {
      cancelAnimationFrame(rafRef.current!)
      window.removeEventListener('resize', resize)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 9997,
      }}
    />
  )
}
