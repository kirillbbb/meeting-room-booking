import type { ReactNode } from 'react';
import { Button } from './Button';
import { Icon } from './Icon';

type StatusIllustration = 'office' | 'empty' | 'error' | 'bookings';

interface StatusStateProps {
  icon?: ReactNode;
  illustration?: StatusIllustration;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

function StateIllustration({ type }: { type: StatusIllustration }) {
  if (type === 'office') {
    return (
      <div className="state-illustration state-illustration--teal" aria-hidden="true">
        <Icon name="home" size={34} />
      </div>
    );
  }

  if (type === 'empty') {
    return (
      <div className="state-illustration state-illustration--muted" aria-hidden="true">
        <span className="state-search-icon" />
      </div>
    );
  }

  if (type === 'error') {
    return (
      <div className="state-illustration state-illustration--error" aria-hidden="true">
        <Icon name="warning" size={56} />
      </div>
    );
  }

  return (
    <div className="state-illustration state-illustration--teal" aria-hidden="true">
      <Icon name="calendar" size={34} />
    </div>
  );
}

export function StatusState({
  icon,
  illustration,
  title,
  description,
  actionLabel,
  onAction,
}: StatusStateProps) {
  return (
    <section className="status-state" aria-live="polite">
      {illustration ? (
        <StateIllustration type={illustration} />
      ) : (
        icon && <div className="status-state__icon">{icon}</div>
      )}
      <h2>{title}</h2>
      <p>{description}</p>
      {actionLabel && onAction && <Button onClick={onAction}>{actionLabel}</Button>}
    </section>
  );
}
