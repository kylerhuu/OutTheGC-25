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
    <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-border bg-card px-6 py-4 rounded-xl shadow-sm">
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-semibold text-foreground text-balance">{tripName}</h1>
          <Badge variant="secondary" className="text-xs">
            {responseCount} {responseCount === 1 ? 'response' : 'responses'}
          </Badge>
        </div>
        <div className="flex items-center gap-2 text-muted-foreground text-sm">
          <Calendar className="size-4" />
          <span>{dateRange}</span>
        </div>
      </div>
      
      <Button
        variant="outline"
        size="sm"
        onClick={handleCopy}
        className="w-fit gap-2"
      >
        {copied ? (
          <>
            <Check className="size-4" />
            Copied
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
