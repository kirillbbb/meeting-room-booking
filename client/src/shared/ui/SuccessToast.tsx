import { useCallback, useEffect, useRef, useState } from 'react';

interface SuccessToastProps {
  open: boolean;
  title: string;
  description: string;
  onClose: () => void;
}

const EXIT_DURATION = 260;
const DISPLAY_DURATION = 4600;

export function SuccessToast({ open, title, description, onClose }: SuccessToastProps) {
  const [rendered, setRendered] = useState(open);
  const [visible, setVisible] = useState(false);
  const onCloseRef = useRef(onClose);
  const autoCloseRef = useRef<number>(undefined);
  const exitRef = useRef<number>(undefined);
  onCloseRef.current = onClose;

  const beginClose = useCallback(() => {
    window.clearTimeout(autoCloseRef.current);
    window.clearTimeout(exitRef.current);
    setVisible(false);
    exitRef.current = window.setTimeout(() => {
      setRendered(false);
      onCloseRef.current();
    }, EXIT_DURATION);
  }, []);

  useEffect(() => {
    if (!open) {
      if (rendered) {
        setVisible(false);
        exitRef.current = window.setTimeout(() => setRendered(false), EXIT_DURATION);
      }
      return;
    }

    setRendered(true);
    const frame = window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => setVisible(true));
    });
    autoCloseRef.current = window.setTimeout(beginClose, DISPLAY_DURATION);
    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(autoCloseRef.current);
      window.clearTimeout(exitRef.current);
    };
  }, [beginClose, open, rendered]);

  if (!rendered) return null;
  return (
    <aside className={`success-toast ${visible ? 'is-visible' : ''}`} role="status">
      <span className="success-toast__check">✓</span>
      <div>
        <strong>{title}</strong>
        <p>{description}</p>
      </div>
      <button aria-label="Закрыть уведомление" onClick={beginClose}>
        ×
      </button>
      <span className="success-toast__progress" aria-hidden="true" />
    </aside>
  );
}
