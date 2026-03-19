"use client"

import { useState } from "react"
import { Plane } from "lucide-react"
import { CreateTripModal } from "@/components/tripsync/create-trip-modal"
import { TripPreviewCard } from "@/components/tripsync/trip-preview-card"

export default function Home() {
  const [modalOpen, setModalOpen] = useState(false)

  return (
    <main className="min-h-screen bg-background flex flex-col">
      {/* Nav */}
      <header className="w-full flex items-center justify-between px-6 py-5 max-w-5xl mx-auto">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
            <Plane className="w-3.5 h-3.5 text-primary-foreground" />
          </div>
          <span className="text-base font-semibold text-foreground tracking-tight">OutTheGC</span>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="text-sm font-medium text-primary hover:opacity-80 transition-opacity"
        >
          Create Trip
        </button>
      </header>

      {/* Hero */}
      <section className="flex-1 flex flex-col items-center justify-center text-center px-6 pt-16 pb-8">
        <div className="inline-flex items-center gap-2 bg-accent/40 text-accent-foreground text-xs font-semibold px-3.5 py-1.5 rounded-full mb-8">
          <span className="w-1.5 h-1.5 rounded-full bg-primary inline-block" />
          Finally get your trip out of the gc
        </div>

        <h1 className="text-5xl sm:text-6xl font-bold text-foreground tracking-tight leading-tight text-balance max-w-2xl mb-5">
          Stop arguing in the group chat
        </h1>

        <p className="text-lg text-muted-foreground max-w-md leading-relaxed text-pretty mb-10">
          Collect availability, ideas, and preferences in one shared link.
        </p>

        <div className="flex flex-col items-center gap-3">
          <button
            onClick={() => setModalOpen(true)}
            className="bg-primary text-primary-foreground px-8 py-3.5 rounded-xl text-base font-semibold hover:opacity-90 active:scale-[0.98] transition-all shadow-md shadow-primary/20"
          >
            Create Trip
          </button>
          <span className="text-xs text-muted-foreground">No login required</span>
        </div>
      </section>

      {/* Preview card */}
      <section className="flex flex-col items-center px-6 pb-24 pt-8">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest mb-6">
          Example trip
        </p>
        <TripPreviewCard />
      </section>

      {/* Footer */}
      <footer className="text-center text-xs text-muted-foreground py-6 border-t border-border">
        © {new Date().getFullYear()} OutTheGC. Finally get your trip out of the gc.
      </footer>

      <CreateTripModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </main>
  )
}
