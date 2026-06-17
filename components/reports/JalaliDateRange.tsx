'use client';

import { useState, useRef, useCallback } from 'react';
import { Calendar, X } from 'lucide-react';
import { format } from 'date-fns-jalali';
import JalaliCalendar from './JalaliCalendar';

type JalaliDateRangeProps = {
  startDate: string;
  endDate: string;
  onChange: (start: string, end: string) => void;
};

function formatJalali(isoStr: string): string {
  if (!isoStr) return '';
  try {
    return format(new Date(isoStr), 'yyyy/MM/dd');
  } catch {
    return '';
  }
}

function parseIso(isoStr: string): Date | null {
  if (!isoStr) return null;
  try {
    const d = new Date(isoStr);
    return isNaN(d.getTime()) ? null : d;
  } catch {
    return null;
  }
}

export default function JalaliDateRange({ startDate, endDate, onChange }: JalaliDateRangeProps) {
  const [openField, setOpenField] = useState<'start' | 'end' | null>(null);
  const startRef = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLDivElement>(null);

  const startValue = parseIso(startDate);
  const endValue = parseIso(endDate);
  const startLabel = formatJalali(startDate);
  const endLabel = formatJalali(endDate);

  const handleStartChange = useCallback((date: Date) => {
    onChange(date.toISOString(), endDate);
    setOpenField(null);
  }, [endDate, onChange]);

  const handleEndChange = useCallback((date: Date) => {
    onChange(startDate, date.toISOString());
    setOpenField(null);
  }, [startDate, onChange]);

  const clearStart = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('', endDate);
  };

  const clearEnd = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(startDate, '');
  };

  return (
    <div className="flex flex-col gap-1">
      <label className="block text-xs text-muted-foreground">محدوده تاریخ (شمسی)</label>
      <div className="flex items-center gap-2">
        {/* End date (first in RTL) */}
        <div ref={endRef} className="relative flex-1">
          <div
            role="button"
            tabIndex={0}
            onClick={() => setOpenField(openField === 'end' ? null : 'end')}
            onKeyDown={(e) => { if (e.key === 'Enter') setOpenField(openField === 'end' ? null : 'end'); }}
            className={`flex items-center h-10 w-full rounded-[var(--radius-input)] border bg-background px-3 py-2 text-sm cursor-pointer ${
              endDate ? 'border-input' : 'border-input'
            }`}
          >
            <span className={`flex-1 ${endDate ? '' : 'text-muted-foreground/80'}`}>
              {endLabel || 'تاریخ پایان'}
            </span>
            {endDate && (
              <button
                type="button"
                onClick={clearEnd}
                className="text-muted-foreground hover:text-foreground ml-1"
                aria-label="پاک کردن تاریخ پایان"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
            <Calendar className="w-4 h-4 text-muted-foreground" />
          </div>
          {openField === 'end' && (
            <JalaliCalendar
              value={endValue}
              onChange={handleEndChange}
              onClose={() => setOpenField(null)}
              minDate={startValue}
            />
          )}
        </div>

        <span className="text-muted-foreground text-sm">تا</span>

        {/* Start date */}
        <div ref={startRef} className="relative flex-1">
          <div
            role="button"
            tabIndex={0}
            onClick={() => setOpenField(openField === 'start' ? null : 'start')}
            onKeyDown={(e) => { if (e.key === 'Enter') setOpenField(openField === 'start' ? null : 'start'); }}
            className={`flex items-center h-10 w-full rounded-[var(--radius-input)] border bg-background px-3 py-2 text-sm cursor-pointer ${
              startDate ? 'border-input' : 'border-input'
            }`}
          >
            <span className={`flex-1 ${startDate ? '' : 'text-muted-foreground/80'}`}>
              {startLabel || 'تاریخ شروع'}
            </span>
            {startDate && (
              <button
                type="button"
                onClick={clearStart}
                className="text-muted-foreground hover:text-foreground ml-1"
                aria-label="پاک کردن تاریخ شروع"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
            <Calendar className="w-4 h-4 text-muted-foreground" />
          </div>
          {openField === 'start' && (
            <JalaliCalendar
              value={startValue}
              onChange={handleStartChange}
              onClose={() => setOpenField(null)}
              maxDate={endValue}
            />
          )}
        </div>
      </div>
    </div>
  );
}
