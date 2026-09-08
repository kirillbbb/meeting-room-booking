import { Icon } from './Icon';
import { SelectControl } from './SelectControl';

interface TimeControlProps {
  value: string;
  onChange: (value: string) => void;
  ariaLabel: string;
  disabled?: boolean;
  className?: string;
  minHour?: number;
  maxHour?: number;
}

export function TimeControl({
  value,
  onChange,
  ariaLabel,
  disabled,
  className = '',
  minHour = 9,
  maxHour = 20,
}: TimeControlProps) {
  const slots = (maxHour - minHour) * 4;
  const options = Array.from({ length: slots }, (_, index) => {
    const minutesFromMidnight = minHour * 60 + index * 15;
    const hour = Math.floor(minutesFromMidnight / 60);
    const minute = minutesFromMidnight % 60;
    const label = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
    return { value: label, label };
  });

  return (
    <SelectControl
      value={value}
      options={options}
      onChange={onChange}
      ariaLabel={ariaLabel}
      placeholder="--:--"
      icon={<Icon name="clock" />}
      disabled={Boolean(disabled)}
      className={`time-control ${className}`}
      menuClassName="time-menu"
    />
  );
}
