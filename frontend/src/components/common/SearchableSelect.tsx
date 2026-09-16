import { useEffect, useMemo, useRef, useState } from 'react';
import { controlClassName } from './controlStyles';

export interface SearchableSelectOption {
  value: string;
  label: string;
}

interface SearchableSelectProps {
  id?: string;
  options: SearchableSelectOption[];
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  emptyText?: string;
  ariaInvalid?: boolean;
  disabled?: boolean;
  className?: string;
  // Lets a parent render its own "can't find it?" affordance below this
  // field without it visually colliding with the dropdown: the dropdown
  // is absolutely positioned and reserves no layout space, so anything
  // rendered right after this component in the parent's markup would
  // otherwise sit underneath/behind it while open.
  onOpenChange?: (isOpen: boolean) => void;
  // When given, replaces the plain "no matches" text with a clickable
  // "Can't find it? Add ..." row, inside the same dropdown panel — never
  // a separate element outside it, so it can't end up visually
  // overlapping the list itself (an absolutely-positioned dropdown
  // doesn't reserve layout space, so a sibling below it would).
  onCreateNew?: (query: string) => void;
  createNewLabel?: (query: string) => string;
}

/**
 * A text-input combobox over a fixed option list: type to filter, click
 * (or Enter) to select. Used in place of a plain <select> for lists long
 * enough that scrolling to find an entry is painful (universities,
 * fields of study).
 */
export function SearchableSelect({
  id,
  options,
  value,
  onChange,
  onBlur,
  placeholder = 'Type to search…',
  emptyText = 'No matches.',
  ariaInvalid,
  disabled,
  className = '',
  onOpenChange,
  onCreateNew,
  createNewLabel = (query) => (query ? `Can't find it? Add "${query}"` : "Can't find it? Add it"),
}: SearchableSelectProps) {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpenState] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const listboxId = `${id ?? 'searchable-select'}-listbox`;

  const setIsOpen = (next: boolean) => {
    setIsOpenState(next);
    onOpenChange?.(next);
  };

  const selectedLabel = useMemo(() => options.find((o) => o.value === value)?.label ?? '', [options, value]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => o.label.toLowerCase().includes(q));
  }, [options, query]);

  useEffect(() => {
    if (!isOpen) setQuery('');
  }, [isOpen]);

  useEffect(() => {
    setHighlightedIndex(0);
  }, [query, isOpen]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        onBlur?.();
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onBlur]);

  const selectOption = (option: SearchableSelectOption) => {
    onChange(option.value);
    setIsOpen(false);
    setQuery('');
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setIsOpen(true);
      setHighlightedIndex((i) => Math.min(i + 1, filtered.length - 1));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setHighlightedIndex((i) => Math.max(i - 1, 0));
    } else if (event.key === 'Enter') {
      event.preventDefault();
      if (isOpen && filtered[highlightedIndex]) selectOption(filtered[highlightedIndex]);
    } else if (event.key === 'Escape') {
      setIsOpen(false);
    }
  };

  return (
    <div ref={containerRef} className="relative min-w-0">
      <input
        id={id}
        type="text"
        role="combobox"
        aria-expanded={isOpen}
        aria-controls={isOpen ? listboxId : undefined}
        aria-activedescendant={isOpen && filtered[highlightedIndex] ? `${listboxId}-${highlightedIndex}` : undefined}
        aria-invalid={ariaInvalid}
        aria-autocomplete="list"
        autoComplete="off"
        disabled={disabled}
        className={controlClassName(Boolean(ariaInvalid), `mt-grid-1 ${className}`)}
        placeholder={placeholder}
        value={isOpen ? query : selectedLabel}
        onFocus={() => setIsOpen(true)}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={handleKeyDown}
      />
      {isOpen && (
        <ul id={listboxId} role="listbox" className="absolute z-10 mt-grid-1 max-h-60 w-full overflow-auto rounded-control border border-border bg-surface-raised py-grid-1 shadow-popover motion-safe:animate-panel-enter">
          {filtered.length === 0 ? (
            onCreateNew ? (
              <li>
                <button
                  type="button"
                  className="block w-full px-3 py-2 text-left text-sm font-semibold text-brand-primary hover:bg-brand-primary-soft"
                  onClick={() => {
                    const typed = query.trim();
                    setIsOpen(false);
                    setQuery('');
                    onCreateNew(typed);
                  }}
                >
                  {createNewLabel(query.trim())}
                </button>
              </li>
            ) : (
              <li className="px-3 py-2 text-sm text-content-muted">{emptyText}</li>
            )
          ) : (
            filtered.map((option, index) => (
              <li key={option.value} id={`${listboxId}-${index}`} role="option" aria-selected={option.value === value}>
                <button
                  type="button"
                  className={`block w-full px-3 py-2 text-left text-sm ${
                    index === highlightedIndex ? 'bg-brand-primary-soft text-brand-primary' : 'text-content-secondary'
                  } ${option.value === value ? 'font-medium' : ''}`}
                  onMouseEnter={() => setHighlightedIndex(index)}
                  onClick={() => selectOption(option)}
                >
                  {option.label}
                </button>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
