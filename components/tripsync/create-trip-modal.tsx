"use client"

import { useEffect, useMemo, useState } from "react"
import { ExternalLink, RotateCcw, X } from "lucide-react"
import { CopyButton } from "@/components/tripsync/copy-button"
import { OutTheGCLogo } from "@/components/tripsync/outthegc-logo"
import type { TripRecord } from "@/lib/trip-types"
import { storeTripOwnerToken } from "@/lib/trip-owner"

interface CreateTripModalProps {
  open: boolean
  onClose: () => void
}

interface TripDraft {
  tripName: string
  startDate: string
  endDate: string
  description: string
}

interface RecentTripLink {
  tripName: string
  link: string
}

const TRIP_DRAFT_KEY = "outthegc:create-trip-draft"
const RECENT_TRIP_KEY = "outthegc:recent-trip-link"

export function CreateTripModal({ open, onClose }: CreateTripModalProps) {
  const [tripName, setTripName] = useState("")
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [description, setDescription] = useState("")
  const [generated, setGenerated] = useState(false)
  const [link, setLink] = useState("")
  const [isGenerating, setIsGenerating] = useState(false)
  const [errorMessage, setErrorMessage] = useState("")
  const [restorableDraft, setRestorableDraft] = useState<TripDraft | null>(null)
  const [recentTrip, setRecentTrip] = useState<RecentTripLink | null>(null)

  const today = useMemo(() => new Date().toISOString().split("T")[0], [])

  const hasDraftContent = Boolean(tripName || startDate || endDate || description)

  useEffect(() => {
    if (!open || typeof window === "undefined") return

    const savedDraftRaw = window.localStorage.getItem(TRIP_DRAFT_KEY)
    if (savedDraftRaw && !hasDraftContent && !generated) {
      try {
        setRestorableDraft(JSON.parse(savedDraftRaw) as TripDraft)
      } catch {
        window.localStorage.removeItem(TRIP_DRAFT_KEY)
      }
    }

    const recentTripRaw = window.localStorage.getItem(RECENT_TRIP_KEY)
    if (recentTripRaw) {
      try {
        setRecentTrip(JSON.parse(recentTripRaw) as RecentTripLink)
      } catch {
        window.localStorage.removeItem(RECENT_TRIP_KEY)
      }
    }
  }, [generated, hasDraftContent, open])

  useEffect(() => {
    if (typeof window === "undefined" || !open || generated) return

    if (!hasDraftContent) {
      window.localStorage.removeItem(TRIP_DRAFT_KEY)
      return
    }

    const draft: TripDraft = {
      tripName,
      startDate,
      endDate,
      description,
    }

    window.localStorage.setItem(TRIP_DRAFT_KEY, JSON.stringify(draft))
  }, [description, endDate, generated, hasDraftContent, open, startDate, tripName])

  if (!open) return null

  function clearDraftState() {
    setTripName("")
    setStartDate("")
    setEndDate("")
    setDescription("")
    setRestorableDraft(null)
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(TRIP_DRAFT_KEY)
    }
  }

  function restoreDraft() {
    if (!restorableDraft) return
    setTripName(restorableDraft.tripName)
    setStartDate(restorableDraft.startDate)
    setEndDate(restorableDraft.endDate)
    setDescription(restorableDraft.description)
    setRestorableDraft(null)
  }

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault()
    setIsGenerating(true)
    setErrorMessage("")

    if (startDate && endDate && startDate > endDate) {
      setErrorMessage("End date must be the same day or after the start date.")
      setIsGenerating(false)
      return
    }

    try {
      const response = await fetch("/api/trips", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: tripName,
          description,
          startDate,
          endDate,
        }),
      })

      const data = (await response.json()) as { trip?: TripRecord; ownerToken?: string; error?: string }

      if (!response.ok || !data.trip || !data.ownerToken) {
        throw new Error(data.error || "Unable to create trip.")
      }

      const origin = window.location.origin
      const nextLink = `${origin}/event/${data.trip.id}`
      setLink(nextLink)
      setGenerated(true)
      setRecentTrip({ tripName: data.trip.name, link: nextLink })
      storeTripOwnerToken(data.trip.id, data.ownerToken)
      window.localStorage.removeItem(TRIP_DRAFT_KEY)
      window.localStorage.setItem(
        RECENT_TRIP_KEY,
        JSON.stringify({
          tripName: data.trip.name,
          link: nextLink,
        }),
      )
      setRestorableDraft(null)
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to create trip.")
    } finally {
      setIsGenerating(false)
    }
  }

  function handleClose() {
    setErrorMessage("")
    setIsGenerating(false)
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
              <OutTheGCLogo showText={false} markClassName="h-10 w-10" />
              <div>
                <h2 id="modal-title" className="text-lg font-semibold text-foreground">
                  New Trip
                </h2>
                <p className="text-sm text-muted-foreground">Takes 30 seconds</p>
              </div>
            </div>

            {restorableDraft && (
              <div className="mb-5 rounded-xl border border-primary/15 bg-primary/5 p-4">
                <p className="text-sm font-semibold text-foreground">Restore your draft?</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  We saved your trip details so you don&apos;t lose them if the modal closes.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={restoreDraft}
                    className="rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground"
                  >
                    Restore draft
                  </button>
                  <button
                    type="button"
                    onClick={clearDraftState}
                    className="rounded-lg border border-border px-3 py-2 text-xs font-semibold text-foreground"
                  >
                    Start fresh
                  </button>
                </div>
              </div>
            )}

            {!restorableDraft && recentTrip && !hasDraftContent && (
              <div className="mb-5 rounded-xl border border-border/60 bg-muted/30 p-4">
                <p className="text-sm font-semibold text-foreground">Recent trip link</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {recentTrip.tripName || "Your last trip"} is still ready if you need to copy or reopen it.
                </p>
                <div className="mt-3 flex items-center gap-2 rounded-lg bg-background px-3 py-2">
                  <span className="min-w-0 flex-1 truncate font-mono text-xs text-foreground">{recentTrip.link}</span>
                  <CopyButton textToCopy={recentTrip.link} className="h-8 px-3 py-0 text-xs" />
                  <button
                    type="button"
                    onClick={() => window.open(recentTrip.link, "_self")}
                    className="inline-flex h-8 items-center gap-1 rounded-lg border border-border px-3 text-xs font-semibold text-foreground"
                  >
                    <ExternalLink className="size-3.5" />
                    Open
                  </button>
                </div>
              </div>
            )}

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
                    min={today}
                    className="flex-1 border border-border rounded-xl px-4 py-2.5 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition"
                  />
                  <input
                    type="date"
                    required
                    aria-label="End date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    min={startDate || today}
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
                disabled={isGenerating}
                className="w-full bg-primary text-primary-foreground rounded-xl py-3 text-sm font-semibold hover:opacity-90 active:scale-[0.98] transition-all"
              >
                {isGenerating ? "Creating..." : "Generate Link"}
              </button>

              {errorMessage && (
                <p className="text-sm text-destructive">{errorMessage}</p>
              )}
            </form>
          </>
        ) : (
          <div className="flex flex-col items-center text-center gap-5 py-2">
            <OutTheGCLogo showText={false} markClassName="h-16 w-16" />
            <div>
              <h2 className="text-xl font-semibold text-foreground mb-1">Your link is ready!</h2>
              <p className="text-sm text-muted-foreground">
                Share it with your group to start collecting responses.
              </p>
            </div>
            <div className="w-full bg-muted rounded-xl px-4 py-3 flex items-center justify-between gap-3">
              <span className="text-sm text-foreground font-mono truncate">{link}</span>
              <CopyButton textToCopy={link} className="h-8 px-3 py-0 text-xs" />
            </div>
            <div className="grid w-full gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => window.open(link, "_self")}
                className="w-full bg-primary text-primary-foreground rounded-xl py-3 text-sm font-semibold hover:opacity-90 active:scale-[0.98] transition-all"
              >
                Open trip page
              </button>
              <button
                type="button"
                onClick={() => {
                  setGenerated(false)
                  setLink("")
                  clearDraftState()
                }}
                className="w-full rounded-xl border border-border py-3 text-sm font-semibold text-foreground hover:bg-muted transition-colors"
              >
                Create another
              </button>
            </div>
            <button
              type="button"
              onClick={handleClose}
              className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              <RotateCcw className="size-4" />
              Close and reopen later
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
