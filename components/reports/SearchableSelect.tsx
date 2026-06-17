'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Search, X, ChevronDown, Loader2 } from 'lucide-react';

type Option = { value: string; label: string };

type SearchableSelectProps = {
  label: string;
  placeholder?: string;
  value: string | null;
  onChange: (value: string | null) => void;
  fetchOptions: (query: string) => Promise<Option[]>;
  emptyMessage?: string;
};

export default function SearchableSelect({
  label,
  placeholder = 'جستجو...',
  value,
  onChange,
  fetchOptions,
  emptyMessage = 'موردی یافت نشد',
}: SearchableSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [options, setOptions] = useState<Option[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedLabel, setSelectedLabel] = useState<string | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null);

  const doFetch = useCallback(async (q: string) => {
    setLoading(true);
    try {
      const result = await fetchOptions(q);
      setOptions(result);
    } finally {
      setLoading(false);
    }
  }, [fetchOptions]);

  useEffect(() => {
    if (open) {
      doFetch('');
    }
  }, [open, doFetch]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!open) return;
    debounceRef.current = setTimeout(() => doFetch(query), 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query, open, doFetch]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectOption = (option: Option) => {
    setSelectedLabel(option.label);
    onChange(option.value);
    setOpen(false);
    setQuery('');
  };

  const clearValue = () => {
    setSelectedLabel(null);
    onChange(null);
    setQuery('');
    setOpen(false);
  };

  const selected = value !== null && value !== '';

  return (
    <div ref={wrapperRef} className="relative">
      <label className="block text-xs text-muted-foreground mb-1">{label}</label>
      <div
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1 h-10 w-full rounded-[var(--radius-input)] border border-input bg-background px-3 py-2 text-sm cursor-pointer"
      >
        {selected ? (
          <span className="flex-1 truncate">{selectedLabel}</span>
        ) : (
          <span className="flex-1 text-muted-foreground/80">{placeholder}</span>
        )}
        {selected && (
          <button onClick={(e) => { e.stopPropagation(); clearValue(); }} className="text-muted-foreground hover:text-foreground">
            <X className="w-3.5 h-3.5" />
          </button>
        )}
        <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`} />
      </div>

      {open && (
        <div className="absolute z-20 mt-1 w-full rounded-xl border border-border bg-card shadow-overlay overflow-hidden">
          <div className="relative border-b border-border">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="جستجو..."
              className="w-full border-0 bg-transparent px-3 pr-9 py-2.5 text-sm outline-none"
              dir="rtl"
            />
          </div>
          <div className="max-h-48 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center gap-2 py-4 text-sm text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" />
                در حال جستجو...
              </div>
            ) : options.length === 0 ? (
              <div className="py-4 text-center text-sm text-muted-foreground">{emptyMessage}</div>
            ) : (
              options.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => selectOption(opt)}
                  className={`w-full text-right px-3 py-2.5 text-sm hover:bg-secondary/40 transition-colors ${value === opt.value ? 'bg-primary/10 text-primary font-medium' : ''}`}
                >
                  {opt.label}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
