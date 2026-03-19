"use client"

import { useState } from "react"
import { X, Plane } from "lucide-react"

interface CreateTripModalProps {
  open: boolean
  onClose: () => void
}

export function CreateTripModal({ open, onClose }: CreateTripModalProps) {
  const [tripName, setTripName] = useState("")
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [description, setDescription] = useState("")
  const [generated, setGenerated] = useState(false)
  const [link, setLink] = useState("")

  if (!open) return null

  function handleGenerate(e: React.FormEvent) {
    e.preventDefault()
    const id = Math.random().toString(36).slice(2, 12)
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://outthegc.app'
    setLink(`${baseUrl}/event/${id}`)
    setGenerated(true)
  }

  function handleClose() {
    setGenerated(false)
    setTripName("")
    setStartDate("")
    setEndDate("")
    setDescription("")
    setLink("")
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/20 backdrop-blur-sm"
      onClick={handleClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div
        className="relative bg-card rounded-2xl shadow-2xl w-full max-w-md mx-4 p-8"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={handleClose}
          className="absolute top-5 right-5 text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Close modal"
        >
          <X className="w-5 h-5" />
        </button>

        {!generated ? (
          <>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                <Plane className="w-4 h-4 text-primary" />
              </div>
              <div>
                <h2 id="modal-title" className="text-lg font-semibold text-foreground">
                  New Trip
                </h2>
                <p className="text-sm text-muted-foreground">Takes 30 seconds</p>
              </div>
            </div>

            <form onSubmit={handleGenerate} className="flex flex-col gap-5">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="trip-name" className="text-sm font-medium text-foreground">
                  Trip Name
                </label>
                <input
                  id="trip-name"
                  type="text"
                  required
                  placeholder="e.g. Barcelona with the crew"
                  value={tripName}
                  onChange={(e) => setTripName(e.target.value)}
                  className="w-full border border-border rounded-xl px-4 py-2.5 text-sm bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-foreground">Date Range</label>
                <div className="flex gap-3">
                  <input
                    type="date"
                    required
                    aria-label="Start date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="flex-1 border border-border rounded-xl px-4 py-2.5 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition"
                  />
                  <input
                    type="date"
                    required
                    aria-label="End date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="flex-1 border border-border rounded-xl px-4 py-2.5 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="description" className="text-sm font-medium text-foreground">
                  Description{" "}
                  <span className="text-muted-foreground font-normal">(optional)</span>
                </label>
                <textarea
                  id="description"
                  rows={3}
                  placeholder="Any details to share with your group..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full border border-border rounded-xl px-4 py-2.5 text-sm bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition resize-none"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-primary text-primary-foreground rounded-xl py-3 text-sm font-semibold hover:opacity-90 active:scale-[0.98] transition-all"
              >
                Generate Link
              </button>
            </form>
          </>
        ) : (
          <div className="flex flex-col items-center text-center gap-5 py-2">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
              <Plane className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-foreground mb-1">Your link is ready!</h2>
              <p className="text-sm text-muted-foreground">
                Share it with your group to start collecting responses.
              </p>
            </div>
            <div className="w-full bg-muted rounded-xl px-4 py-3 flex items-center justify-between gap-3">
              <span className="text-sm text-foreground font-mono truncate">{link}</span>
              <button
                onClick={() => navigator.clipboard.writeText(link)}
                className="text-xs font-semibold text-primary whitespace-nowrap hover:opacity-80 transition"
              >
                Copy
              </button>
            </div>
            <button
              onClick={handleClose}
              className="w-full bg-primary text-primary-foreground rounded-xl py-3 text-sm font-semibold hover:opacity-90 active:scale-[0.98] transition-all"
            >
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
