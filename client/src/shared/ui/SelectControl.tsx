import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { Icon } from './Icon';

export interface SelectOption {
  value: string;
  label: string;
  triggerLabel?: string;
}

interface SelectControlProps {
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  ariaLabel: string;
  placeholder?: string;
  icon?: ReactNode;
  disabled?: boolean;
  className?: string;
  menuClassName?: string;
}

export function SelectControl({
  value,
  options,
  onChange,
  ariaLabel,
  placeholder = 'Выберите',
  icon,
  disabled,
  className = '',
  menuClassName = '',
}: SelectControlProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const listboxId = useId();
  const selectedIndex = options.findIndex((option) => option.value === value);
  const selected = selectedIndex >= 0 ? options[selectedIndex] : undefined;

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const openMenu = (focusIndex = Math.max(selectedIndex, 0)) => {
    if (disabled || !options.length) return;
    setOpen(true);
    window.requestAnimationFrame(() => optionRefs.current[focusIndex]?.focus());
  };

  const choose = (nextValue: string) => {
    onChange(nextValue);
    setOpen(false);
    window.requestAnimationFrame(() => triggerRef.current?.focus());
  };

  const moveFocus = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    if ((event.key !== 'ArrowDown' && event.key !== 'ArrowUp') || !options.length) return;
    event.preventDefault();
    const direction = event.key === 'ArrowDown' ? 1 : -1;
    const nextIndex = (index + direction + options.length) % options.length;
    optionRefs.current[nextIndex]?.focus();
  };

  return (
    <div ref={rootRef} className={`custom-select ${className}`}>
      <button
        ref={triggerRef}
        type="button"
        className="control-trigger"
        aria-label={ariaLabel}
        aria-expanded={open}
        aria-controls={open ? listboxId : undefined}
        disabled={disabled}
        onClick={() => (open ? setOpen(false) : openMenu())}
        onKeyDown={(event) => {
          if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            event.preventDefault();
            openMenu(event.key === 'ArrowDown' ? Math.max(selectedIndex, 0) : options.length - 1);
          }
        }}
      >
        {icon}
        <span>{selected?.triggerLabel ?? selected?.label ?? placeholder}</span>
        <Icon className="control-chevron" name="chevron-down" />
      </button>
      {open && (
        <div
          id={listboxId}
          className={`control-popover select-menu ${menuClassName}`}
          role="listbox"
          aria-label={ariaLabel}
        >
          {options.map((option, index) => (
            <button
              key={option.value}
              ref={(node) => {
                optionRefs.current[index] = node;
              }}
              type="button"
              role="option"
              aria-selected={option.value === value}
              className={option.value === value ? 'is-selected' : ''}
              onClick={() => choose(option.value)}
              onKeyDown={(event) => moveFocus(event, index)}
            >
              <span>{option.label}</span>
              {option.value === value && <span aria-hidden="true">✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
