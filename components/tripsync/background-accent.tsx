'use client'

interface BackgroundAccentProps {
  variant?: 'primary' | 'accent'
}

export function BackgroundAccent({ variant = 'primary' }: BackgroundAccentProps) {
  return (
    <div className="absolute inset-0 -z-10 overflow-hidden rounded-2xl pointer-events-none">
      {/* Subtle gradient glow behind the card */}
      <div
        className={`absolute inset-0 rounded-2xl ${
          variant === 'primary'
            ? 'bg-gradient-to-br from-primary/10 via-primary/4 to-transparent'
            : 'bg-gradient-to-br from-accent/8 via-accent/3 to-transparent'
        }`}
      />

      {/* Corner accent dot */}
      <div
        className={`absolute -top-12 -right-12 w-24 h-24 rounded-full blur-2xl ${
          variant === 'primary'
            ? 'bg-primary/15'
            : 'bg-accent/12'
        }`}
      />
    </div>
  )
}
