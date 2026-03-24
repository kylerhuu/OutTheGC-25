'use client'

import { useState, useCallback } from 'react'
import { Copy, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface CopyButtonProps {
  textToCopy: string
  className?: string
}

export function CopyButton({ textToCopy, className }: CopyButtonProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = useCallback(async () => {
    try {
      // Primary method: Clipboard API
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(textToCopy)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
        return
      }
      
      // Fallback: textarea + execCommand
      const textarea = document.createElement('textarea')
      textarea.value = textToCopy
      textarea.style.position = 'fixed'
      textarea.style.left = '-9999px'
      textarea.style.top = '-9999px'
      document.body.appendChild(textarea)
      textarea.focus()
      textarea.select()
      
      try {
        document.execCommand('copy')
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      } finally {
        document.body.removeChild(textarea)
      }
    } catch (error) {
      console.error('Failed to copy:', error)
    }
  }, [textToCopy])

  return (
    <Button
      onClick={handleCopy}
      size="sm"
      className={`w-fit gap-2 bg-primary hover:bg-primary/90 active:scale-[0.98] text-primary-foreground font-medium transition-all duration-150 ${className || ''}`}
    >
      {copied ? (
        <>
          <Check className="size-4 animate-in fade-in duration-200" />
          Copied!
        </>
      ) : (
        <>
          <Copy className="size-4" />
          Copy link
        </>
      )}
    </Button>
  )
}
