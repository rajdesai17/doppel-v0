import * as React from 'react'
import { cn } from '@/lib/utils'

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link'
  size?: 'default' | 'sm' | 'lg' | 'icon' | 'icon-sm' | 'icon-lg'
}

const variantStyles: Record<NonNullable<ButtonProps['variant']>, string> = {
  default: 'bg-white text-black hover:bg-white/90',
  destructive: 'bg-red-600 text-white hover:bg-red-600/90',
  outline: 'border border-white/20 bg-transparent text-white hover:bg-white/10',
  secondary: 'bg-white/10 text-white hover:bg-white/20',
  ghost: 'bg-transparent text-white hover:bg-white/10',
  link: 'text-white underline-offset-4 hover:underline bg-transparent',
}

const sizeStyles: Record<NonNullable<ButtonProps['size']>, string> = {
  default: 'h-10 px-5 py-2',
  sm: 'h-8 px-4 text-sm',
  lg: 'h-12 px-8 text-base',
  icon: 'size-10',
  'icon-sm': 'size-8',
  'icon-lg': 'size-12',
}

function Button({
  className,
  variant = 'default',
  size = 'default',
  ...props
}: ButtonProps) {
  return (
    <button
      data-slot="button"
      className={cn(
        'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 outline-none focus-visible:ring-2 focus-visible:ring-white/50',
        variantStyles[variant],
        sizeStyles[size],
        className
      )}
      {...props}
    />
  )
}

export { Button }
