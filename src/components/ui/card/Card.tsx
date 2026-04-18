import { HTMLAttributes, ReactNode } from 'react'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
  className?: string
  hoverEffect?: boolean
  variant?: 'default' | 'ghost' | 'medieval'
  noPadding?: boolean
}

export function Card({ children, className = '', hoverEffect = false, variant = 'default', noPadding = false, ...props }: CardProps) {
  const variantClass = {
    default: 'bg-card medieval-border text-primary',
    ghost: 'bg-transparent border border-theme/20 text-primary',
    medieval: 'medieval-border bg-card text-primary'
  }[variant]

  return (
    <div
      className={`${noPadding ? '' : 'p-4 sm:p-5'} rounded-lg flex flex-col gap-3 transition-all duration-300 ${
        hoverEffect ? 'hover:scale-[1.02] hover:shadow-lg' : ''
      } ${variantClass} ${className}`}
      {...props}
    >
      {children}
    </div>
  )
}
