interface IconProps {
  name:
    | 'calendar-check'
    | 'chevron-down'
    | 'chevron-right'
    | 'calendar'
    | 'clock'
    | 'users'
    | 'tv'
    | 'edit'
    | 'video'
    | 'info'
    | 'warning'
    | 'door-open'
    | 'home';
  size?: number;
  className?: string;
}

export function Icon({ name, size = 16, className }: IconProps) {
  return (
    <img
      aria-hidden="true"
      className={className}
      src={`/icons/${name}.svg`}
      width={size}
      height={size}
      alt=""
    />
  );
}
