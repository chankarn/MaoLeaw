// File: apps/admin/src/components/ui/checkbox.tsx
'use client';
import * as React from 'react';
import { Check, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  indeterminate?: boolean;
}

export const Checkbox = React.forwardRef<HTMLInputElement, Props>(
  ({ className, checked, indeterminate, onChange, ...props }, ref) => {
    const innerRef = React.useRef<HTMLInputElement | null>(null);
    React.useImperativeHandle(ref, () => innerRef.current!);

    React.useEffect(() => {
      if (innerRef.current) innerRef.current.indeterminate = !!indeterminate;
    }, [indeterminate]);

    return (
      <label className={cn('relative inline-flex h-4 w-4 cursor-pointer items-center justify-center', className)}>
        <input
          ref={innerRef}
          type="checkbox"
          checked={checked}
          onChange={onChange}
          className="peer absolute h-4 w-4 cursor-pointer opacity-0"
          {...props}
        />
        <div
          className={cn(
            'flex h-4 w-4 items-center justify-center rounded border transition-colors',
            checked || indeterminate
              ? 'border-primary bg-primary text-white'
              : 'border-stone-300 bg-white hover:border-primary/60',
          )}
        >
          {indeterminate ? <Minus className="h-3 w-3" /> : checked ? <Check className="h-3 w-3" /> : null}
        </div>
      </label>
    );
  },
);
Checkbox.displayName = 'Checkbox';
