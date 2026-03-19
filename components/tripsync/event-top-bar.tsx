'use client'

import { useState } from 'react'
import { Copy, Check, Calendar } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

interface EventTopBarProps {
  tripName: string
  dateRange: string
  responseCount: number
  shareUrl: string
}

export function EventTopBar({ tripName, dateRange, responseCount, shareUrl }: EventTopBarProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(shareUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between border-b border-border/50 bg-gradient-to-b from-card/80 to-card/40 px-8 py-6 rounded-xl">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold text-foreground text-balance">{tripName}</h1>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Calendar className="size-4" />
            <span className="text-sm">{dateRange}</span>
          </div>
          <Badge variant="secondary" className="text-xs font-medium">
            {responseCount} {responseCount === 1 ? 'response' : 'responses'}
          </Badge>
        </div>
      </div>
      
      <Button
        onClick={handleCopy}
        size="sm"
        className="w-fit gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-medium"
      >
        {copied ? (
          <>
            <Check className="size-4" />
            Copied!
          </>
        ) : (
          <>
            <Copy className="size-4" />
            Copy Link
          </>
        )}
      </Button>
    </header>
  )
}
