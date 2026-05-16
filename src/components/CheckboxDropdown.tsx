import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';

interface CheckboxDropdownProps {
  options: string[];
  selected: string[];
  onChange: (selected: string[]) => void;
  placeholder: string;
}

export default function CheckboxDropdown({ options, selected, onChange, placeholder }: CheckboxDropdownProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggle = (option: string) => {
    onChange(
      selected.includes(option)
        ? selected.filter(s => s !== option)
        : [...selected, option]
    );
  };

  const selectAll = () => onChange([...options]);
  const clearAll = () => onChange([]);

  const label = selected.length === 0
    ? placeholder
    : selected.length === 1
      ? selected[0]
      : `${selected.length} selected`;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(prev => !prev)}
        className="w-full bg-[var(--c-surface-raised)] border border-[var(--c-border)] py-2.5 px-3 text-sm text-left flex items-center justify-between focus:border-[var(--c-primary)] outline-none transition-colors"
      >
        <span className={selected.length === 0 ? 'text-[var(--c-text-4)]' : 'text-[var(--c-text-1)]'}>{label}</span>
        <ChevronDown size={14} className={`text-[var(--c-text-3)] transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full bg-[var(--c-surface-raised)] border border-[var(--c-border)] shadow-lg max-h-60 overflow-y-auto custom-scrollbar">
          <div className="flex items-center justify-between px-3 py-2 border-b border-[var(--c-border)]">
            <button type="button" onClick={selectAll} className="text-[10px] uppercase tracking-wider text-[var(--c-text-2)] hover:text-[var(--c-text-1)]">
              Select All
            </button>
            <button type="button" onClick={clearAll} className="text-[10px] uppercase tracking-wider text-[var(--c-text-3)] hover:text-[var(--c-text-1)]">
              Clear
            </button>
          </div>
          {options.map(option => {
            const isSelected = selected.includes(option);
            return (
              <button
                key={option}
                type="button"
                onClick={() => toggle(option)}
                className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2 hover:bg-[var(--c-surface)] transition-colors ${
                  isSelected ? 'text-[var(--c-text-1)]' : 'text-[var(--c-text-2)]'
                }`}
              >
                <div className={`w-4 h-4 border flex items-center justify-center shrink-0 ${
                  isSelected ? 'bg-[var(--c-primary)] border-[var(--c-primary)]' : 'border-[var(--c-border)]'
                }`}>
                  {isSelected && <Check size={10} className="text-[var(--c-primary-text)]" />}
                </div>
                {option}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
