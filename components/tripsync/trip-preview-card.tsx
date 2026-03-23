import { CalendarDays, ArrowUpRight, Users, MapPin, MessageSquare } from "lucide-react"

interface TripPreviewCardProps {
  label: string
  tripName: string
  peopleLabel: string
  dateRange: string
  responseStatus: string
  bestOverlap: string
  topPicks: string
  budget: string
  missing: string
  note: string
  onAction?: () => void
  accent?: "default" | "fun"
}

export function TripPreviewCard({
  label,
  tripName,
  peopleLabel,
  dateRange,
  responseStatus,
  bestOverlap,
  topPicks,
  budget,
  missing,
  note,
  onAction,
  accent = "default",
}: TripPreviewCardProps) {
  const isFun = accent === "fun"

  return (
    <div className={`w-full max-w-sm mx-auto bg-card rounded-2xl shadow-md border overflow-hidden ${isFun ? "border-primary/20 shadow-primary/10" : "border-border"}`}>
      {/* Card header */}
      <div className={`px-6 pt-6 pb-4 border-b ${isFun ? "bg-gradient-to-r from-primary/12 via-primary/6 to-accent/20 border-primary/10" : "bg-primary/8 border-border"}`}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-1.5 text-xs font-medium text-primary mb-2">
              <MapPin className="w-3 h-3" />
              <span>{label}</span>
            </div>
            <h3 className="text-lg font-semibold text-foreground text-balance">
              {tripName}
            </h3>
          </div>
          <span className={`shrink-0 text-xs font-semibold px-2.5 py-1 rounded-full ${isFun ? "bg-primary/10 text-primary" : "bg-accent text-accent-foreground"}`}>
            {peopleLabel}
          </span>
        </div>
      </div>

      {/* Card body */}
      <div className="px-6 py-4 flex flex-col gap-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <CalendarDays className="w-4 h-4 shrink-0 text-primary/60" />
          <span>{dateRange}</span>
        </div>

        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Users className="w-4 h-4 shrink-0 text-primary/60" />
          <span>{responseStatus}</span>
        </div>

        <div className="rounded-xl border border-border/60 bg-muted/30 p-3 flex flex-col gap-1.5">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Best overlap</span>
            <span className="font-medium text-foreground">{bestOverlap}</span>
          </div>
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Top picks</span>
            <span className="font-medium text-foreground">{topPicks}</span>
          </div>
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Budget leaning</span>
            <span className="font-medium text-foreground">{budget}</span>
          </div>
        </div>

        {/* Summary chips */}
        <div className="flex flex-wrap gap-2">
          {[missing, "Best dates found", "Destination split"].map((tag) => (
            <span
              key={tag}
              className="text-xs px-2.5 py-1 rounded-full bg-muted text-muted-foreground font-medium"
            >
              {tag}
            </span>
          ))}
        </div>

        <div className={`rounded-xl border p-3 ${isFun ? "border-primary/15 bg-primary/5" : "border-border/60 bg-background"}`}>
          <div className="flex items-start gap-2 text-sm text-muted-foreground">
            <MessageSquare className="w-4 h-4 shrink-0 text-primary/70 mt-0.5" />
            <span>{note}</span>
          </div>
        </div>

        {/* Copy link */}
        <button
          type="button"
          onClick={onAction}
          className="w-full flex items-center justify-center gap-2 border border-border rounded-xl py-2.5 text-sm font-medium text-foreground hover:bg-muted transition-colors"
          aria-label="Create your own trip from this example"
        >
          <ArrowUpRight className="w-3.5 h-3.5" />
          Build one like this
        </button>
      </div>
    </div>
  )
}
