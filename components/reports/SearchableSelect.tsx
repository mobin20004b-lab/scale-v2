'use client';

import { useState, useRef, useEffect, useCallback, useId } from 'react';
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
  const [activeIndex, setActiveIndex] = useState(-1);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const optionsRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null);
  const abortRef = useRef<AbortController | null>(null);
  const comboboxId = useId();

  const doFetch = useCallback(async (q: string) => {
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    try {
      const result = await fetchOptions(q);
      if (!controller.signal.aborted) {
        setOptions(result);
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      console.error('Fetch options failed:', err);
    } finally {
      if (!controller.signal.aborted) {
        setLoading(false);
      }
    }
  }, [fetchOptions]);

  useEffect(() => {
    if (open) {
      setActiveIndex(-1);
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
    if (open && inputRef.current) {
      inputRef.current.focus();
    }
  }, [open]);

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
    setActiveIndex(-1);
  };

  const clearValue = () => {
    setSelectedLabel(null);
    onChange(null);
    setQuery('');
    setOpen(false);
    setActiveIndex(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
        e.preventDefault();
        setOpen(true);
      }
      return;
    }

    switch (e.key) {
      case 'Escape':
        e.preventDefault();
        setOpen(false);
        break;
      case 'ArrowDown':
        e.preventDefault();
        setActiveIndex((prev) => Math.min(prev + 1, options.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setActiveIndex((prev) => Math.max(prev - 1, 0));
        break;
      case 'Enter':
        if (activeIndex >= 0 && options[activeIndex]) {
          e.preventDefault();
          selectOption(options[activeIndex]);
        }
        break;
      case 'Tab':
        setOpen(false);
        break;
    }
  };

  const selected = value !== null && value !== '';

  return (
    <div ref={wrapperRef} className="relative" onKeyDown={handleKeyDown}>
      <label className="block text-xs text-muted-foreground mb-1">{label}</label>
      <div
        role="combobox"
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-controls={`${comboboxId}-listbox`}
        aria-label={label}
        tabIndex={0}
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1 h-10 w-full rounded-[var(--radius-input)] border border-input bg-background px-3 py-2 text-sm cursor-pointer"
      >
        {selected ? (
          <span className="flex-1 truncate">{selectedLabel}</span>
        ) : (
          <span className="flex-1 text-muted-foreground/80">{placeholder}</span>
        )}
        {selected && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); clearValue(); }}
            className="text-muted-foreground hover:text-foreground"
            aria-label="پاک کردن"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
        <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`} />
      </div>

      {open && (
        <div
          ref={optionsRef}
          id={`${comboboxId}-listbox`}
          role="listbox"
          aria-live="polite"
          className="absolute z-20 mt-1 w-full rounded-xl border border-border bg-card shadow-overlay overflow-hidden"
        >
          <div className="relative border-b border-border">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => { setQuery(e.target.value); setActiveIndex(-1); }}
              placeholder="جستجو..."
              className="w-full border-0 bg-transparent px-3 pl-9 py-2.5 text-sm outline-none"
              dir="rtl"
              autoComplete="off"
            />
          </div>
          <div className="max-h-48 overflow-y-auto" role="listbox">
            {loading ? (
              <div className="flex items-center justify-center gap-2 py-4 text-sm text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" />
                در حال جستجو...
              </div>
            ) : options.length === 0 ? (
              <div className="py-4 text-center text-sm text-muted-foreground">{emptyMessage}</div>
            ) : (
              options.map((opt, idx) => (
                <button
                  key={opt.value}
                  role="option"
                  aria-selected={value === opt.value}
                  id={`${comboboxId}-option-${idx}`}
                  onClick={() => selectOption(opt)}
                  onMouseEnter={() => setActiveIndex(idx)}
                  className={`w-full text-right px-3 py-2.5 text-sm hover:bg-secondary/40 transition-colors ${value === opt.value ? 'bg-primary text-primary-foreground font-medium' : ''} ${activeIndex === idx ? 'bg-secondary/40' : ''}`}
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