import { useEffect, useState } from 'react';
import { Icon } from './Icon';

interface TimeInputProps {
  value: string;
  onChange: (value: string) => void;
  ariaLabel: string;
  disabled?: boolean;
  className?: string;
}

function maskTime(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 4);
  return digits.length <= 2 ? digits : `${digits.slice(0, 2)}:${digits.slice(2)}`;
}

function isValidTime(value: string): boolean {
  if (!/^\d{2}:\d{2}$/.test(value)) return false;
  const hours = Number(value.slice(0, 2));
  const minutes = Number(value.slice(3, 5));
  const totalMinutes = hours * 60 + minutes;
  return minutes % 15 === 0 && totalMinutes >= 9 * 60 && totalMinutes <= 19 * 60 + 45;
}

export function TimeInput({
  value,
  onChange,
  ariaLabel,
  disabled,
  className = '',
}: TimeInputProps) {
  const [draft, setDraft] = useState(value);

  useEffect(() => setDraft(value), [value]);

  return (
    <label className={`time-input control-trigger ${className}`}>
      <Icon name="clock" />
      <input
        type="text"
        value={draft}
        disabled={disabled}
        aria-label={ariaLabel}
        aria-invalid={draft.length === 5 && !isValidTime(draft)}
        inputMode="numeric"
        autoComplete="off"
        placeholder="--:--"
        maxLength={5}
        onFocus={(event) => event.currentTarget.select()}
        onChange={(event) => {
          const nextValue = maskTime(event.target.value);
          setDraft(nextValue);
          if (isValidTime(nextValue)) onChange(nextValue);
        }}
        onBlur={() => {
          if (!isValidTime(draft)) setDraft(value);
        }}
      />
    </label>
  );
}
