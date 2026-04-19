import * as React from 'react';
import { CheckCircle2, AlertTriangle } from 'lucide-react';

import { cn } from '@/lib/utils';

type ToastProps = React.ComponentProps<'div'> & {
  tone?: 'success' | 'destructive' | 'neutral';
};

const toneClasses: Record<NonNullable<ToastProps['tone']>, string> = {
  success: 'border-emerald-300/60 bg-emerald-500/10 text-emerald-700',
  destructive: 'border-destructive/30 bg-destructive/10 text-destructive',
  neutral: 'border-border bg-secondary/30 text-foreground',
};

export function Toast({ className, tone = 'neutral', children, ...props }: ToastProps) {
  return (
    <div
      role="status"
      className={cn(
        'flex items-center gap-2 rounded-[var(--radius-card)] border px-4 py-3 text-sm font-medium',
        toneClasses[tone],
        className,
      )}
      {...props}
    >
      {tone === 'success' ? <CheckCircle2 className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
      {children}
    </div>
  );
}
