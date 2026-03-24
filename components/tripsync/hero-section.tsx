'use client'

import { useState, useEffect } from 'react'
import { ArrowRight } from 'lucide-react'

interface HeroSectionProps {
  onCreateTrip: () => void
}

export function HeroSection({ onCreateTrip }: HeroSectionProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  return (
    <section className="relative min-h-[calc(100vh-80px)] flex items-center justify-center overflow-hidden px-6 py-12">
      {/* Background gradient orbs with subtle animation */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        {/* Top-left teal orb */}
        <div
          className={`absolute -top-40 -left-40 w-80 h-80 rounded-full bg-gradient-to-br from-primary/30 via-primary/15 to-transparent blur-3xl transition-opacity duration-1000 ${
            mounted ? 'opacity-100' : 'opacity-0'
          }`}
          style={{
            animation: mounted ? 'float 8s ease-in-out infinite' : 'none',
          }}
        />
        {/* Bottom-right violet orb */}
        <div
          className={`absolute -bottom-40 -right-40 w-80 h-80 rounded-full bg-gradient-to-tl from-accent/25 via-accent/10 to-transparent blur-3xl transition-opacity duration-1000 ${
            mounted ? 'opacity-100' : 'opacity-0'
          }`}
          style={{
            animation: mounted ? 'float 10s ease-in-out infinite reverse' : 'none',
          }}
        />
        {/* Center subtle glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full bg-gradient-to-r from-primary/5 via-accent/5 to-transparent blur-3xl" />
      </div>

      {/* Grid pattern overlay (subtle) */}
      <div
        className="absolute inset-0 -z-10 opacity-[0.03]"
        style={{
          backgroundImage:
            'linear-gradient(to right, currentColor 1px, transparent 1px), linear-gradient(to bottom, currentColor 1px, transparent 1px)',
          backgroundSize: '50px 50px',
        }}
      />

      <div className="max-w-6xl mx-auto w-full grid lg:grid-cols-2 gap-12 lg:gap-8 items-center">
        {/* Left: Message & CTA */}
        <div className="flex flex-col gap-8 order-2 lg:order-1">
          {/* Badge */}
          <div className="inline-flex w-fit items-center gap-2 bg-primary/12 text-primary text-xs font-semibold px-3.5 py-1.5 rounded-full border border-primary/20 transition-all duration-500"
            style={{
              animation: mounted ? 'slideInLeft 0.8s ease-out' : 'none',
            }}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            Finally get your trip out of the gc
          </div>

          {/* Headline */}
          <div className="flex flex-col gap-3">
            <h1
              className="text-5xl sm:text-6xl lg:text-6xl font-bold text-foreground tracking-tight leading-[1.08] text-balance"
              style={{
                animation: mounted ? 'slideInLeft 0.8s ease-out 0.1s both' : 'none',
              }}
            >
              Turn group chat chaos into{' '}
              <span className="relative inline-block">
                <span className="relative z-10 text-transparent bg-clip-text bg-gradient-to-r from-primary via-primary to-accent">
                  clear decisions
                </span>
                <span
                  className="absolute inset-0 bg-gradient-to-r from-primary via-primary to-accent rounded-lg blur-lg opacity-30 -z-10"
                  style={{
                    animation: mounted ? 'shimmer 4s ease-in-out infinite' : 'none',
                  }}
                />
              </span>
            </h1>

            <p
              className="text-lg text-muted-foreground leading-relaxed text-pretty max-w-md"
              style={{
                animation: mounted ? 'slideInLeft 0.8s ease-out 0.2s both' : 'none',
              }}
            >
              No more endless messages. No scattered ideas. No confusion about dates or destinations. See everyone's availability, votes, and preferences in one beautiful place.
            </p>
          </div>

          {/* CTA Buttons */}
          <div
            className="flex flex-col sm:flex-row gap-3 items-start sm:items-center"
            style={{
              animation: mounted ? 'slideInLeft 0.8s ease-out 0.3s both' : 'none',
            }}
          >
            <button
              onClick={onCreateTrip}
              className="group bg-primary text-primary-foreground px-7 py-3.5 rounded-xl text-sm font-semibold hover:bg-primary/90 active:scale-[0.98] transition-all duration-150 shadow-lg shadow-primary/25 flex items-center gap-2"
            >
              Create a Trip
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-150" />
            </button>
            <span className="text-xs text-muted-foreground">No login required • Takes 30 seconds</span>
          </div>
        </div>

        {/* Right: Visual Element */}
        <div
          className="relative h-96 lg:h-full min-h-96 flex items-center justify-center order-1 lg:order-2"
          style={{
            animation: mounted ? 'slideInRight 0.8s ease-out 0.2s both' : 'none',
          }}
        >
          {/* Layered cards showing the solution */}
          <div className="relative w-full max-w-sm">
            {/* Card 1: Chaos (back) */}
            <div
              className="absolute inset-0 w-full h-64 rounded-2xl border border-border/40 bg-muted/40 backdrop-blur-sm p-4 shadow-xl"
              style={{
                transform: 'translateY(24px) translateX(-16px) rotate(-8deg)',
                animation: mounted ? 'floatSlow 4s ease-in-out infinite' : 'none',
              }}
            >
              <div className="space-y-3 text-xs text-muted-foreground">
                <div className="font-medium text-foreground mb-2">Group Chat (Chaos)</div>
                <div className="p-2 bg-background/50 rounded text-left">
                  {'Maya: is June good?'}
                </div>
                <div className="p-2 bg-background/50 rounded text-right ml-8">
                  {'Alex: or July'}
                </div>
                <div className="p-2 bg-background/50 rounded text-left">
                  {'Jordan: what about Barcelona?'}
                </div>
                <div className="p-2 bg-background/50 rounded text-left">
                  {'Taylor: budget???'}
                </div>
                <div className="text-center text-muted-foreground italic pt-2">
                  ... (infinite scroll)
                </div>
              </div>
            </div>

            {/* Card 2: Solution (front) */}
            <div
              className="relative w-full h-72 rounded-2xl border border-primary/30 bg-card shadow-2xl overflow-hidden group"
              style={{
                animation: mounted ? 'floatFast 3s ease-in-out infinite' : 'none',
              }}
            >
              {/* Glow effect on hover */}
              <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-transparent to-accent/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

              <div className="relative p-6 h-full flex flex-col gap-4 z-10">
                {/* Header */}
                <div className="flex items-center justify-between">
                  <div className="text-xs font-bold text-primary">ORGANIZED</div>
                  <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                </div>

                {/* Best dates highlight */}
                <div className="rounded-lg bg-primary/12 border border-primary/20 px-3 py-2 flex-1 flex flex-col justify-center">
                  <div className="text-xs text-muted-foreground mb-1">Best overlap</div>
                  <div className="text-lg font-bold text-primary">Jun 18–22</div>
                  <div className="text-xs text-muted-foreground mt-1">7/7 people available</div>
                </div>

                {/* Quick stats */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-lg bg-muted/50 p-2 text-center">
                    <div className="text-xs text-muted-foreground">Destination</div>
                    <div className="text-sm font-semibold text-foreground">Barcelona</div>
                  </div>
                  <div className="rounded-lg bg-muted/50 p-2 text-center">
                    <div className="text-xs text-muted-foreground">Budget</div>
                    <div className="text-sm font-semibold text-foreground">$$</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CSS animations */}
      <style jsx>{`
        @keyframes slideInLeft {
          from {
            opacity: 0;
            transform: translateX(-30px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        @keyframes slideInRight {
          from {
            opacity: 0;
            transform: translateX(30px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        @keyframes float {
          0%,
          100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-30px);
          }
        }

        @keyframes floatSlow {
          0%,
          100% {
            transform: translateY(24px) translateX(-16px) rotate(-8deg);
          }
          50% {
            transform: translateY(-6px) translateX(-16px) rotate(-8deg);
          }
        }

        @keyframes floatFast {
          0%,
          100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-20px);
          }
        }

        @keyframes shimmer {
          0%,
          100% {
            filter: blur(8px);
            opacity: 0.3;
          }
          50% {
            filter: blur(12px);
            opacity: 0.5;
          }
        }
      `}</style>
    </section>
  )
}
