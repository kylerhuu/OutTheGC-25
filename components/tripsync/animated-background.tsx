'use client'

import { useEffect, useState } from 'react'

interface AnimatedBackgroundProps {
  variant?: 'hero' | 'subpage' | 'minimal'
}

export function AnimatedBackground({ variant = 'subpage' }: AnimatedBackgroundProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (variant === 'hero') {
    return (
      <div className="absolute inset-0 -z-10 overflow-hidden">
        {/* Animated gradient orbs */}
        <div
          className="absolute -top-40 -left-40 w-80 h-80 rounded-full bg-gradient-to-br from-primary/25 via-primary/10 to-transparent blur-3xl"
          style={{
            animation: mounted ? 'float 8s ease-in-out infinite' : 'none',
            opacity: mounted ? 1 : 0,
            transition: 'opacity 1s ease-out',
          }}
        />
        <div
          className="absolute -bottom-40 -right-40 w-80 h-80 rounded-full bg-gradient-to-tl from-accent/20 via-accent/8 to-transparent blur-3xl"
          style={{
            animation: mounted ? 'float 10s ease-in-out infinite reverse' : 'none',
            opacity: mounted ? 1 : 0,
            transition: 'opacity 1s ease-out',
          }}
        />
        {/* Subtle center glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full bg-gradient-to-r from-primary/4 via-accent/4 to-transparent blur-3xl" />

        {/* Subtle grid overlay */}
        <div
          className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage:
              'linear-gradient(to right, currentColor 1px, transparent 1px), linear-gradient(to bottom, currentColor 1px, transparent 1px)',
            backgroundSize: '50px 50px',
          }}
        />

        <style jsx>{`
          @keyframes float {
            0%, 100% { transform: translateY(0px); }
            50% { transform: translateY(-30px); }
          }
        `}</style>
      </div>
    )
  }

  if (variant === 'subpage') {
    return (
      <div className="fixed inset-0 -z-20 overflow-hidden pointer-events-none">
        {/* Top-left corner glow */}
        <div
          className="absolute -top-32 -left-32 w-72 h-72 rounded-full bg-gradient-to-br from-primary/12 via-primary/5 to-transparent blur-3xl"
          style={{
            animation: mounted ? 'float-slow 12s ease-in-out infinite' : 'none',
            opacity: mounted ? 1 : 0,
            transition: 'opacity 0.8s ease-out',
          }}
        />

        {/* Bottom-right corner glow */}
        <div
          className="absolute -bottom-32 -right-32 w-72 h-72 rounded-full bg-gradient-to-tl from-accent/10 via-accent/4 to-transparent blur-3xl"
          style={{
            animation: mounted ? 'float-slow 14s ease-in-out infinite reverse' : 'none',
            opacity: mounted ? 1 : 0,
            transition: 'opacity 0.8s ease-out',
          }}
        />

        {/* Animated path lines */}
        <svg
          className="absolute inset-0 w-full h-full opacity-[0.08]"
          style={{
            animation: mounted ? 'pan 20s ease-in-out infinite' : 'none',
          }}
          viewBox="0 0 1200 800"
          preserveAspectRatio="none"
        >
          {/* Curved path 1 */}
          <path
            d="M 0,200 Q 300,150 600,200 T 1200,200"
            stroke="currentColor"
            strokeWidth="2"
            fill="none"
            vectorEffect="non-scaling-stroke"
          />
          {/* Curved path 2 */}
          <path
            d="M 1200,600 Q 900,650 600,600 T 0,600"
            stroke="currentColor"
            strokeWidth="2"
            fill="none"
            vectorEffect="non-scaling-stroke"
          />
          {/* Connecting curves */}
          <path
            d="M 300,200 Q 400,400 300,600"
            stroke="currentColor"
            strokeWidth="1.5"
            fill="none"
            opacity="0.6"
            vectorEffect="non-scaling-stroke"
          />
          <path
            d="M 900,200 Q 800,400 900,600"
            stroke="currentColor"
            strokeWidth="1.5"
            fill="none"
            opacity="0.6"
            vectorEffect="non-scaling-stroke"
          />
        </svg>

        {/* Moving dots animation */}
        <svg className="absolute inset-0 w-full h-full overflow-visible" viewBox="0 0 1200 800">
          {/* Dot 1 traveling */}
          <circle
            cx="0"
            cy="200"
            r="3"
            fill="url(#dotGradient)"
            style={{
              animation: mounted ? 'travelPath1 15s ease-in-out infinite' : 'none',
              filter: 'drop-shadow(0 0 8px rgba(84, 145, 201, 0.4))',
            }}
          />
          {/* Dot 2 traveling */}
          <circle
            cx="0"
            cy="600"
            r="3"
            fill="url(#dotGradient2)"
            style={{
              animation: mounted ? 'travelPath2 18s ease-in-out infinite' : 'none',
              filter: 'drop-shadow(0 0 8px rgba(132, 94, 194, 0.4))',
            }}
          />
          {/* Gradient defs */}
          <defs>
            <radialGradient id="dotGradient">
              <stop offset="0%" stopColor="rgb(84, 145, 201)" stopOpacity="1" />
              <stop offset="100%" stopColor="rgb(84, 145, 201)" stopOpacity="0" />
            </radialGradient>
            <radialGradient id="dotGradient2">
              <stop offset="0%" stopColor="rgb(132, 94, 194)" stopOpacity="1" />
              <stop offset="100%" stopColor="rgb(132, 94, 194)" stopOpacity="0" />
            </radialGradient>
          </defs>
        </svg>

        <style jsx>{`
          @keyframes float-slow {
            0%, 100% { transform: translateY(0px); }
            50% { transform: translateY(-20px); }
          }

          @keyframes pan {
            0%, 100% { transform: translateX(0px); }
            50% { transform: translateX(20px); }
          }

          @keyframes travelPath1 {
            0% { cx: 0; cy: 200; }
            25% { cx: 300; cy: 150; }
            50% { cx: 600; cy: 200; }
            75% { cx: 900; cy: 150; }
            100% { cx: 1200; cy: 200; }
          }

          @keyframes travelPath2 {
            0% { cx: 1200; cy: 600; }
            25% { cx: 900; cy: 650; }
            50% { cx: 600; cy: 600; }
            75% { cx: 300; cy: 650; }
            100% { cx: 0; cy: 600; }
          }
        `}</style>
      </div>
    )
  }

  // Minimal variant for less prominent backgrounds
  return (
    <div className="absolute inset-0 -z-10 overflow-hidden">
      {/* Single subtle corner glow */}
      <div
        className="absolute -top-48 -right-48 w-96 h-96 rounded-full bg-gradient-to-bl from-primary/8 via-primary/3 to-transparent blur-3xl"
        style={{
          animation: mounted ? 'float-subtle 16s ease-in-out infinite' : 'none',
          opacity: mounted ? 1 : 0,
          transition: 'opacity 0.8s ease-out',
        }}
      />

      <style jsx>{`
        @keyframes float-subtle {
          0%, 100% { transform: translateY(0px) translateX(0px); }
          50% { transform: translateY(-15px) translateX(-10px); }
        }
      `}</style>
    </div>
  )
}
