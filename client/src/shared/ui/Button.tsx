import type { ButtonHTMLAttributes, PropsWithChildren } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  fullWidth?: boolean;
}

export function Button({
  variant = 'primary',
  fullWidth,
  className = '',
  children,
  ...props
}: PropsWithChildren<ButtonProps>) {
  return (
    <button
      className={`button button--${variant}${fullWidth ? ' button--full' : ''} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
