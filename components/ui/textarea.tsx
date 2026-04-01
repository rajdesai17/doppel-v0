import * as React from 'react'

import { cn } from '@/lib/utils'

function Textarea({ className, ...props }: React.ComponentProps<'textarea'>) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        'min-h-24 w-full rounded-md border border-white/20 bg-white/5 px-4 py-3 text-base text-white placeholder:text-white/40 transition-all outline-none focus:border-white/40 focus:ring-2 focus:ring-white/20 disabled:cursor-not-allowed disabled:opacity-50 resize-none',
        className,
      )}
      {...props}
    />
  )
}

export { Textarea }
