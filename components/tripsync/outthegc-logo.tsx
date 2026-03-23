'use client'

import { cn } from '@/lib/utils'

interface OutTheGCLogoProps {
  className?: string
  markClassName?: string
  textClassName?: string
  showText?: boolean
}

export function OutTheGCLogo({
  className,
  markClassName,
  textClassName,
  showText = true,
}: OutTheGCLogoProps) {
  return (
    <div className={cn('flex items-center gap-3', className)}>
      <svg
        viewBox="0 0 96 96"
        aria-hidden="true"
        className={cn('h-10 w-10 shrink-0', markClassName)}
      >
        <defs>
          <linearGradient id="outthegc-mark-gradient" x1="24" y1="12" x2="72" y2="84" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#4FE0BC" />
            <stop offset="55%" stopColor="#42B7F5" />
            <stop offset="100%" stopColor="#A43FE1" />
          </linearGradient>
        </defs>
        <path
          fill="url(#outthegc-mark-gradient)"
          d="M48 9C31.1 9 17.25 22.5 17.25 39.7C17.25 55.15 29.5 72.7 43.45 84.5C46.1 86.75 49.9 86.75 52.55 84.5C66.5 72.7 78.75 55.15 78.75 39.7C78.75 22.5 64.9 9 48 9Z"
        />
        <path
          fill="#fff"
          d="M65.12 24.71C63.59 24.68 61.55 25.67 59.1 27.63L50.46 35.02L39.72 33.47C36.68 33.05 34.61 33.92 32.99 36.11L44.61 42.41L31.82 55.08L25.69 54.36C24.87 54.27 24.46 55.31 25.12 55.83L32.03 61.23L32.99 69.11C33.11 69.96 34.17 70.23 34.67 69.53L38.62 63.98L51.46 51.14L53.33 63.76C55.49 62.18 56.49 60.13 56.07 57.12L54.49 46.41L61.91 37.76C65.52 33.3 66.62 30.2 66.47 27.91C66.39 26.03 66.04 24.73 65.12 24.71Z"
        />
        <path
          fill="#fff"
          d="M34.06 56.7C29.86 59.32 24.48 60.1 18.84 58.86C18.18 58.71 17.64 59.47 18.05 60L18.33 60.36C22.74 66.08 31.12 67.18 36.86 62.84L41.49 59.34L34.06 56.7Z"
          opacity="0.96"
        />
      </svg>

      {showText && (
        <svg
          viewBox="0 0 326 72"
          aria-label="OutTheGC"
          role="img"
          className={cn('h-8 w-auto', textClassName)}
        >
          <defs>
            <linearGradient id="outthegc-wordmark-gradient" x1="0" y1="18" x2="326" y2="54" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#2EC6C8" />
              <stop offset="55%" stopColor="#5B82D8" />
              <stop offset="100%" stopColor="#B233E5" />
            </linearGradient>
          </defs>
          <text
            x="0"
            y="54"
            fill="url(#outthegc-wordmark-gradient)"
            fontFamily="Arial, Helvetica, sans-serif"
            fontSize="56"
            fontWeight="700"
            letterSpacing="-3"
          >
            OutTheGC
          </text>
        </svg>
      )}
    </div>
  )
}
