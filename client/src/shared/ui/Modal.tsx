import { useEffect, useId, useRef, type PropsWithChildren, type ReactNode } from 'react';

interface ModalProps {
  open: boolean;
  title: string;
  onClose: () => void;
  footer?: ReactNode;
  subtitle?: ReactNode;
  width?: number;
}

export function Modal({
  open,
  title,
  onClose,
  footer,
  subtitle,
  width = 560,
  children,
}: PropsWithChildren<ModalProps>) {
  const dialogRef = useRef<HTMLElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  const titleId = useId();

  useEffect(() => {
    if (!open) return;
    const previouslyFocused =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const backdrop = backdropRef.current;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialogRef.current?.querySelector<HTMLElement>('input, button, select, textarea')?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== 'Tab') return;

      const focusable = [
        ...(dialogRef.current?.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ) ?? []),
      ].filter((element) => !element.hasAttribute('hidden'));
      const first = focusable[0];
      const last = focusable.at(-1);
      if (!first || !last) {
        event.preventDefault();
        dialogRef.current?.focus();
      } else if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    const onBackdropMouseDown = (event: MouseEvent) => {
      if (event.target === backdrop) onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    backdrop?.addEventListener('mousedown', onBackdropMouseDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      backdrop?.removeEventListener('mousedown', onBackdropMouseDown);
      document.body.style.overflow = previousOverflow;
      previouslyFocused?.focus();
    };
  }, [onClose, open]);

  if (!open) return null;
  return (
    <div ref={backdropRef} className="modal-backdrop">
      <section
        ref={dialogRef}
        aria-modal="true"
        aria-labelledby={titleId}
        className="modal"
        role="dialog"
        tabIndex={-1}
        style={{ maxWidth: width }}
      >
        <header className="modal__header">
          <h2 id={titleId}>{title}</h2>
          {subtitle && <div className="modal__subtitle">{subtitle}</div>}
        </header>
        <div className="modal__body">{children}</div>
        {footer && <footer className="modal__footer">{footer}</footer>}
      </section>
    </div>
  );
}
