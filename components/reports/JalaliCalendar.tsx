'use client';

import { useState, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { format, parse, startOfMonth, endOfMonth, addMonths, subMonths, startOfWeek, addDays, getDay, getDaysInMonth, isSameMonth, isSameDay, isBefore } from 'date-fns-jalali';

const DAY_HEADERS = ['ش', 'ی', 'د', 'س', 'چ', 'پ', 'ج'];

type JalaliCalendarProps = {
  value: Date | null;
  onChange: (date: Date) => void;
  onClose: () => void;
  minDate?: Date | null;
  maxDate?: Date | null;
};

export default function JalaliCalendar({ value, onChange, onClose, minDate, maxDate }: JalaliCalendarProps) {
  const today = new Date();
  const [viewDate, setViewDate] = useState(value ?? today);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  const monthStart = startOfMonth(viewDate);
  const monthEnd = endOfMonth(viewDate);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 6 });
  const jalaliMonth = format(viewDate, 'LLLL');
  const jalaliYear = format(viewDate, 'yyyy');

  const days: Date[] = [];
  for (let i = 0; i < 42; i++) {
    days.push(addDays(calendarStart, i));
  }

  const handlePrev = () => setViewDate(subMonths(viewDate, 1));
  const handleNext = () => setViewDate(addMonths(viewDate, 1));

  const canSelect = (day: Date) => {
    if (minDate && isBefore(day, minDate)) return false;
    if (maxDate && isBefore(maxDate, day)) return false;
    return true;
  };

  return (
    <div
      ref={wrapperRef}
      className="absolute z-50 mt-1 w-[280px] rounded-xl border border-border bg-card shadow-xl p-3"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <button onClick={handlePrev} className="p-1 hover:bg-secondary/40 rounded-lg transition-colors" aria-label="ماه قبل">
          <ChevronRight className="w-4 h-4" />
        </button>
        <span className="text-sm font-medium">{jalaliMonth} {jalaliYear}</span>
        <button onClick={handleNext} className="p-1 hover:bg-secondary/40 rounded-lg transition-colors" aria-label="ماه بعد">
          <ChevronLeft className="w-4 h-4" />
        </button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 mb-1">
        {DAY_HEADERS.map((h) => (
          <div key={h} className="text-center text-xs text-muted-foreground py-1">{h}</div>
        ))}
      </div>

      {/* Day grid */}
      <div className="grid grid-cols-7">
        {days.map((day, idx) => {
          const inMonth = isSameMonth(day, viewDate);
          const selected = value && isSameDay(day, value);
          const isToday = isSameDay(day, today);
          const selectable = canSelect(day);

          return (
            <button
              key={idx}
              disabled={!inMonth || !selectable}
              onClick={() => { onChange(day); onClose(); }}
              className={`text-center text-sm py-1.5 rounded-lg transition-colors ${
                selected
                  ? 'bg-primary text-primary-foreground font-medium'
                  : isToday && inMonth
                  ? 'border border-border font-medium'
                  : ''
              } ${
                inMonth && !selected
                  ? 'hover:bg-secondary/40 cursor-pointer text-foreground'
                  : ''
              } ${
                !inMonth
                  ? 'text-muted-foreground/30 cursor-default'
                  : ''
              } ${
                !selectable && inMonth
                  ? 'opacity-40 cursor-not-allowed'
                  : ''
              }`}
            >
              {format(day, 'd')}
            </button>
          );
        })}
      </div>
    </div>
  );
}
