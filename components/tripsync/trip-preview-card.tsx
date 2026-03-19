import { CalendarDays, Copy, Users, MapPin } from "lucide-react"

export function TripPreviewCard() {
  return (
    <div className="w-full max-w-sm mx-auto bg-card rounded-2xl shadow-md border border-border overflow-hidden">
      {/* Card header */}
      <div className="bg-primary/8 px-6 pt-6 pb-4 border-b border-border">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-1.5 text-xs font-medium text-primary mb-2">
              <MapPin className="w-3 h-3" />
              <span>Upcoming Trip</span>
            </div>
            <h3 className="text-lg font-semibold text-foreground text-balance">
              Japan with the whole squad
            </h3>
          </div>
          <span className="shrink-0 bg-accent text-accent-foreground text-xs font-semibold px-2.5 py-1 rounded-full">
            4 going
          </span>
        </div>
      </div>

      {/* Card body */}
      <div className="px-6 py-4 flex flex-col gap-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <CalendarDays className="w-4 h-4 shrink-0 text-primary/60" />
          <span>Aug 12 – Aug 22, 2025</span>
        </div>

        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Users className="w-4 h-4 shrink-0 text-primary/60" />
          <span>4 of 6 members responded</span>
        </div>

        {/* Mini progress */}
        <div className="flex flex-col gap-1.5">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Responses collected</span>
            <span className="font-medium text-foreground">67%</span>
          </div>
          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
            <div className="h-full w-2/3 bg-primary rounded-full" />
          </div>
        </div>

        {/* Summary chips */}
        <div className="flex flex-wrap gap-2">
          {["Availability ✓", "Destinations ✓", "Budget pending"].map((tag) => (
            <span
              key={tag}
              className="text-xs px-2.5 py-1 rounded-full bg-muted text-muted-foreground font-medium"
            >
              {tag}
            </span>
          ))}
        </div>

        {/* Copy link */}
        <button className="w-full flex items-center justify-center gap-2 border border-border rounded-xl py-2.5 text-sm font-medium text-foreground hover:bg-muted transition-colors">
          <Copy className="w-3.5 h-3.5" />
          Copy invite link
        </button>
      </div>
    </div>
  )
}
