import { InputHTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: string;
  label?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, error, label, id, name, ...props }, ref) => {
    const fieldId = id ?? name;

    return (
      <div className="w-full">
        {label && (
          <label htmlFor={fieldId} className="mb-2 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={fieldId}
          name={name}
          className={cn(
            'h-10 w-full rounded-md border border-border bg-input px-3',
            'text-sm text-foreground shadow-sm',
            'placeholder:text-muted-foreground',
            'focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/25',
            'transition-all duration-200 ease-out',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            error && 'border-status-error focus:border-status-error focus:ring-status-error/25',
            className
          )}
          {...props}
        />
        {error && (
          <p className="mt-2 text-xs font-medium text-status-error">{error}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
