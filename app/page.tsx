"use client"

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
        <button
          onClick={() => setModalOpen(true)}
          className="text-sm font-semibold text-primary hover:text-primary/80 transition-colors duration-150"
        >
          Create Trip
        </button>
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

      {/* Footer */}
      <footer className="relative z-10 text-center text-xs text-muted-foreground py-6 border-t border-border">
        © {new Date().getFullYear()} OutTheGC. Finally get your trip out of the gc.
      </footer>

      <CreateTripModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </main>
  )
}
