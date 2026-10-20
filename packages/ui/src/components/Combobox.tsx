'use client';

import { useId, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';

import { cx } from './cx.ts';
import { FieldShell } from './Field.tsx';

/**
 * Combobox nach ARIA 1.2 (Eingabe + Listbox). Für lange Listen wie Facharzttitel
 * oder Gemeinden; bei wenigen Optionen ist das native Select die bessere Wahl.
 */
export function Combobox({
  label,
  options,
  value,
  onChange,
  name,
  hint,
  error,
  placeholder,
  emptyLabel = 'Keine Treffer',
}: {
  label: ReactNode;
  options: { value: string; label: string }[];
  value: string | null;
  onChange: (value: string | null) => void;
  name?: string;
  hint?: ReactNode;
  error?: ReactNode;
  placeholder?: string;
  emptyLabel?: string;
}) {
  const id = useId();
  const listId = `${id}-list`;
  const selected = options.find((o) => o.value === value) ?? null;
  const [query, setQuery] = useState(selected?.label ?? '');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q || q === selected?.label.toLowerCase()) return options.slice(0, 50);
    return options.filter((o) => o.label.toLowerCase().includes(q)).slice(0, 50);
  }, [options, query, selected]);

  const choose = (opt: { value: string; label: string }) => {
    onChange(opt.value);
    setQuery(opt.label);
    setOpen(false);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setOpen(true);
      setActive((a) => Math.min(a + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === 'Enter' && open) {
      const opt = filtered[active];
      if (opt) {
        e.preventDefault();
        choose(opt);
      }
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  return (
    <FieldShell id={id} label={label} hint={hint} error={error}>
      <div className="relative">
        <input
          ref={inputRef}
          id={id}
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={open && filtered[active] ? `${id}-opt-${active}` : undefined}
          aria-invalid={error ? true : undefined}
          value={query}
          placeholder={placeholder}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
            setActive(0);
            if (e.target.value === '') onChange(null);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 120)}
          onKeyDown={onKeyDown}
          className="h-control-m w-full rounded-control border border-line-300 bg-surface-0 px-3 text-body-s text-ink-900 placeholder:text-ink-500 hover:border-ink-500 aria-invalid:border-critical-600"
        />
        {name ? <input type="hidden" name={name} value={value ?? ''} /> : null}
        {open ? (
          <ul
            id={listId}
            role="listbox"
            className="absolute z-30 mt-1 max-h-64 w-full overflow-y-auto rounded-card border border-line-300 bg-surface-0 py-1"
          >
            {filtered.length === 0 ? (
              <li className="px-3 py-2 text-body-s text-ink-500">{emptyLabel}</li>
            ) : (
              filtered.map((o, i) => (
                <li
                  key={o.value}
                  id={`${id}-opt-${i}`}
                  role="option"
                  aria-selected={o.value === value}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    choose(o);
                  }}
                  className={cx(
                    'flex h-row cursor-default items-center px-3 text-body-s',
                    i === active ? 'bg-surface-100 text-ink-900' : 'text-ink-900',
                    o.value === value && 'font-medium',
                  )}
                >
                  {o.label}
                </li>
              ))
            )}
          </ul>
        ) : null}
      </div>
    </FieldShell>
  );
}
