'use client';

import { useState } from 'react';
import { Calendar } from 'lucide-react';

type JalaliDateRangeProps = {
  startDate: string;   // Gregorian ISO string or ''
  endDate: string;     // Gregorian ISO string or ''
  onChange: (start: string, end: string) => void;
};

function gregorianToJalaliInput(date: Date): string {
  try {
    const { format } = require('date-fns-jalali');
    return format(date, 'yyyy/MM/dd');
  } catch {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}/${m}/${d}`;
  }
}

function jalaliInputToGregorian(input: string): Date | null {
  try {
    const { parse } = require('date-fns-jalali');
    const parsed = parse(input, 'yyyy/MM/dd', new Date());
    if (isNaN(parsed.getTime())) return null;
    return parsed;
  } catch {
    return null;
  }
}

const JALALI_PATTERN = /^\d{4}\/\d{2}\/\d{2}$/;

export default function JalaliDateRange({ startDate, endDate, onChange }: JalaliDateRangeProps) {
  const [startInput, setStartInput] = useState(startDate ? gregorianToJalaliInput(new Date(startDate)) : '');
  const [endInput, setEndInput] = useState(endDate ? gregorianToJalaliInput(new Date(endDate)) : '');
  const [startError, setStartError] = useState(false);
  const [endError, setEndError] = useState(false);

  const handleStartChange = (value: string) => {
    setStartInput(value);
    if (value && !JALALI_PATTERN.test(value)) {
      setStartError(true);
      return;
    }
    setStartError(false);
    if (value) {
      const date = jalaliInputToGregorian(value);
      if (date) {
        onChange(date.toISOString(), endDate);
        return;
      }
    }
    onChange('', endDate);
  };

  const handleEndChange = (value: string) => {
    setEndInput(value);
    if (value && !JALALI_PATTERN.test(value)) {
      setEndError(true);
      return;
    }
    setEndError(false);
    if (value) {
      const date = jalaliInputToGregorian(value);
      if (date) {
        onChange(startDate, date.toISOString());
        return;
      }
    }
    onChange(startDate, '');
  };

  return (
    <div className="flex flex-col gap-1">
      <label className="block text-xs text-muted-foreground">محدوده تاریخ (شمسی)</label>
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <input
            value={endInput}
            onChange={(e) => handleEndChange(e.target.value)}
            placeholder="۱۴۰۴/۱۲/۲۹"
            className={`h-10 w-full rounded-[var(--radius-input)] border px-3 py-2 text-sm bg-background pl-8 ${endError ? 'border-destructive ring-1 ring-destructive/30' : 'border-input'}`}
          />
          <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        </div>
        <span className="text-muted-foreground text-sm">تا</span>
        <div className="relative flex-1">
          <input
            value={startInput}
            onChange={(e) => handleStartChange(e.target.value)}
            placeholder="۱۴۰۴/۰۱/۰۱"
            className={`h-10 w-full rounded-[var(--radius-input)] border px-3 py-2 text-sm bg-background pl-8 ${startError ? 'border-destructive ring-1 ring-destructive/30' : 'border-input'}`}
          />
          <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        </div>
      </div>
      {(startError || endError) && (
        <p className="text-xs text-destructive">فرمت تاریخ باید YYYY/MM/DD باشد</p>
      )}
    </div>
  );
}