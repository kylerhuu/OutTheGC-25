"use client"

import { useState } from "react"
import { CreateTripModal } from "@/components/tripsync/create-trip-modal"
import { OutTheGCLogo } from "@/components/tripsync/outthegc-logo"
import { TripPreviewCard } from "@/components/tripsync/trip-preview-card"

export default function Home() {
  const [modalOpen, setModalOpen] = useState(false)

  return (
    <main className="min-h-screen bg-background flex flex-col">
      {/* Nav */}
      <header className="w-full flex items-center justify-between px-6 py-5 max-w-5xl mx-auto">
        <OutTheGCLogo markClassName="h-9 w-9" textClassName="h-7" />
        <button
          onClick={() => setModalOpen(true)}
          className="text-sm font-semibold text-primary hover:text-primary/80 transition-colors duration-150"
        >
          Create Trip
        </button>
      </header>

      {/* Hero */}
      <section className="flex-1 flex flex-col items-center justify-center text-center px-6 pt-12 pb-8">
        <div className="inline-flex items-center gap-2 bg-primary/10 text-primary text-xs font-semibold px-3.5 py-1.5 rounded-full mb-7">
          <span className="w-1.5 h-1.5 rounded-full bg-primary inline-block" />
          Finally get your trip out of the gc
        </div>

        <h1 className="text-5xl sm:text-6xl font-bold text-foreground tracking-tight leading-[1.08] text-balance max-w-2xl mb-5">
          Stop planning trips in 67 separate messages
        </h1>

        <p className="text-base text-muted-foreground max-w-md leading-relaxed text-pretty mb-9">
          See everyone&apos;s availability, destination votes, and preferences — all in one place.
        </p>

        <div className="flex flex-col items-center gap-2.5">
          <button
            onClick={() => setModalOpen(true)}
            className="bg-primary text-primary-foreground px-8 py-3.5 rounded-xl text-sm font-semibold hover:bg-primary/90 active:scale-[0.98] transition-all duration-150 shadow-sm shadow-primary/20"
          >
            Create a Trip
          </button>
          <span className="text-xs text-muted-foreground">No login required</span>
        </div>
      </section>

      {/* Preview cards */}
      <section className="flex flex-col items-center px-6 pb-24 pt-6">
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
      <footer className="text-center text-xs text-muted-foreground py-6 border-t border-border">
        © {new Date().getFullYear()} OutTheGC. Finally get your trip out of the gc.
      </footer>

      <CreateTripModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </main>
  )
}
