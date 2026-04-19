import * as React from 'react';

import { cn } from '@/lib/utils';

export type SelectProps = React.ComponentProps<'select'> & {
  invalid?: boolean;
};

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, invalid, ...props }, ref) => {
    return (
      <select
        ref={ref}
        data-invalid={invalid ? 'true' : 'false'}
        className={cn(
          'flex h-10 w-full rounded-[var(--radius-input)] border border-input bg-background px-3 py-2 text-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50 data-[invalid=true]:border-destructive data-[invalid=true]:ring-destructive/30',
          className,
        )}
        {...props}
      />
    );
  },
);
Select.displayName = 'Select';

export { Select };
