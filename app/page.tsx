"use client"

import Link from "next/link"
import { useState } from "react"
import { CreateTripModal } from "@/components/tripsync/create-trip-modal"
import { OutTheGCLogo } from "@/components/tripsync/outthegc-logo"
import { HeroSection } from "@/components/tripsync/hero-section"
import { TripPreviewCard } from "@/components/tripsync/trip-preview-card"
import { AnimatedBackground } from "@/components/tripsync/animated-background"

export default function Home() {
  const [modalOpen, setModalOpen] = useState(false)

  return (
    <main className="min-h-screen bg-background flex flex-col relative">
      {/* Override the layout's subpage background with hero variant on homepage */}
      <div className="fixed inset-0 -z-20">
        <AnimatedBackground variant="hero" />
      </div>

      {/* Nav */}
      <header className="relative z-10 w-full flex items-center justify-between px-6 py-5 max-w-5xl mx-auto">
        <OutTheGCLogo markClassName="h-9 w-9" textClassName="h-7" />
        <div className="flex items-center gap-4">
          <Link
            href="/pricing"
            className="text-sm font-semibold text-foreground hover:text-primary transition-colors duration-150"
          >
            Pricing
          </Link>
          <button
            onClick={() => setModalOpen(true)}
            className="text-sm font-semibold text-primary hover:text-primary/80 transition-colors duration-150"
          >
            Create Trip
          </button>
        </div>
      </header>

      {/* Hero */}
      <HeroSection onCreateTrip={() => setModalOpen(true)} />

      {/* Preview cards */}
      <section className="relative z-10 flex flex-col items-center px-6 pb-24 pt-12">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-6">
          Two ways this goes
        </p>
        <div className="grid w-full max-w-5xl gap-5 md:grid-cols-2">
          <TripPreviewCard
            label="Polished example"
            tripName="Summer Senior Trip"
            peopleLabel="7 people"
            dateRange="Jun 18 – Jun 22, 2026"
            responseStatus="5 responses in"
            bestOverlap="Jun 18–22"
            topPicks="Barcelona, Lisbon"
            budget="$$"
            missing="2 people still haven't answered"
            note="Maya: free after graduation weekend"
            onAction={() => setModalOpen(true)}
          />
          <TripPreviewCard
            label="A little too aspirational"
            tripName="Rich Baddie Escape"
            peopleLabel="4 people"
            dateRange="Jan 18 – Jan 22, 2027"
            responseStatus="3 responses in"
            bestOverlap="Jan 18–22"
            topPicks="Maldives, St. Barts"
            budget="$$$$"
            missing="1 person is still pretending budget matters"
            note="Ava: if the villa doesn't have a private pool I'm staying home"
            onAction={() => setModalOpen(true)}
            accent="fun"
          />
        </div>
      </section>

      <section className="relative z-10 px-6 pb-24">
        <div className="mx-auto grid max-w-5xl gap-5 md:grid-cols-2">
          <div className="rounded-[28px] border border-border/60 bg-card/90 p-6 shadow-sm backdrop-blur">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Free</p>
            <h2 className="mt-3 text-2xl font-semibold text-foreground">Shared planning doc</h2>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              Create a trip, collect responses, lock dates and destination, and use the planning page like a group Google Doc.
            </p>
          </div>
          <div className="rounded-[28px] border border-primary/30 bg-primary/10 p-6 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">OutTheGC+</p>
            <h2 className="mt-3 text-2xl font-semibold text-foreground">$5 one-time for AI planning</h2>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              Unlock AI cleanup for messy notes and one-click final-doc organization so the subscription covers API costs.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 text-center text-xs text-muted-foreground py-6 border-t border-border">
        © {new Date().getFullYear()} OutTheGC. Finally get your trip out of the gc.
      </footer>

      <CreateTripModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </main>
  )
}
