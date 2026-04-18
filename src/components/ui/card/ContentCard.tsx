import { HTMLAttributes, ReactNode } from 'react'
import { Card } from './Card'

interface ContentCardProps extends HTMLAttributes<HTMLDivElement> {
  title?: string
  titleIcon?: ReactNode
  subtitle?: string
  actions?: ReactNode
  children: ReactNode
  className?: string
  variant?: 'default' | 'ghost' | 'medieval'
}

export function ContentCard({ title, titleIcon, subtitle, actions, children, className = '', variant = 'medieval', ...props }: ContentCardProps) {
  return (
    <Card variant={variant} className={`flex flex-col gap-6 p-6 md:p-8 ${className}`} {...props}>
      {(title || actions) && (
        <div className="flex items-center justify-between gap-4 border-b border-theme/20 pb-4">
          <div className="flex flex-col gap-1">
            {title && (
              <h3 className="font-cinzel font-black uppercase tracking-[0.2em] text-sm text-theme-main flex items-center gap-2">
                {titleIcon} {title}
              </h3>
            )}
            {subtitle && <p className="font-garamond italic text-xs text-secondary opacity-60">{subtitle}</p>}
          </div>
          {actions && <div className="shrink-0">{actions}</div>}
        </div>
      )}
      {children}
    </Card>
  )
}
