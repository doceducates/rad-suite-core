import * as React from 'react';
import { cn } from '@/lib/utils';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'success';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', isLoading, children, disabled, ...props }, ref) => {
    const variants = {
      primary: 'bg-primary hover:bg-primary/90 text-on-primary font-medium shadow-xs shadow-primary/20',
      secondary: 'bg-surface-container-high hover:bg-surface-variant text-on-surface border border-outline-variant/60 shadow-2xs',
      outline: 'bg-transparent border border-outline-variant hover:bg-surface-container text-on-surface',
      ghost: 'bg-transparent hover:bg-surface-container text-on-surface-variant hover:text-on-surface',
      danger: 'bg-error hover:bg-error/90 text-white font-medium shadow-xs shadow-error/30',
      success: 'bg-primary-container hover:bg-primary text-on-primary font-medium shadow-xs',
    };

    const sizes = {
      sm: 'px-2.5 py-1.5 text-xs rounded-md gap-1.5',
      md: 'px-3.5 py-2 text-sm rounded-lg gap-2',
      lg: 'px-4.5 py-2.5 text-base rounded-lg gap-2.5',
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(
          'inline-flex items-center justify-center font-medium transition-colors cursor-pointer select-none disabled:opacity-50 disabled:cursor-not-allowed',
          variants[variant],
          sizes[size],
          className
        )}
        {...props}
      >
        {isLoading ? (
          <>
            <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
            <span>Loading...</span>
          </>
        ) : (
          children
        )}
      </button>
    );
  }
);
Button.displayName = 'Button';
