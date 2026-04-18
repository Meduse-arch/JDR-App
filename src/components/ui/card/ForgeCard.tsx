import { HTMLAttributes, ReactNode } from 'react'
import { Card } from './Card'

interface ForgeCardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
  watermark?: ReactNode     // icône décorative en fond (opacité 5%)
  className?: string
}

export function ForgeCard({ children, watermark, className = '', ...props }: ForgeCardProps) {
  return (
    <Card
      variant="medieval"
      className={`relative overflow-hidden p-8 md:p-12 shadow-2xl ${className}`}
      {...props}
    >
      {watermark && (
        <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none select-none">
          {watermark}
        </div>
      )}
      {children}
    </Card>
  )
}
