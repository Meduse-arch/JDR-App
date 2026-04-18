import { useState, useEffect, useRef, ReactNode } from 'react';
import { Button } from './Button';

interface ConfirmButtonProps {
  onConfirm: () => void;
  children: ReactNode;
  confirmText?: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'active';
}

export function ConfirmButton({
  onConfirm,
  children,
  confirmText = 'Confirmer ?',
  className = '',
  size = 'md',
  variant = 'danger',
}: ConfirmButtonProps) {
  const [asking, setAsking] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setAsking(false);
      }
    };
    if (asking) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [asking]);

  if (asking) {
    return (
      <div ref={ref} className={`inline-flex ${className}`}>
        <Button
          size={size}
          variant={variant}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setAsking(false);
            onConfirm();
          }}
          className="animate-in fade-in zoom-in duration-200"
          style={{ boxShadow: '0 0 15px rgba(239, 68, 68, 0.4)' }}
        >
          {confirmText}
        </Button>
      </div>
    );
  }

  return (
    <div ref={ref} className={`inline-flex ${className}`}>
      <Button
        size={size}
        variant={variant}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setAsking(true);
        }}
      >
        {children}
      </Button>
    </div>
  );
}
