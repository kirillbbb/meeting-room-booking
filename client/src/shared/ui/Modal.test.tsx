import { fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Modal } from './Modal';

describe('Modal', () => {
  it('traps focus, closes with Escape and restores the trigger focus', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();

    function Harness() {
      const [open, setOpen] = useState(false);
      return (
        <>
          <button type="button" onClick={() => setOpen(true)}>
            Открыть
          </button>
          <Modal
            open={open}
            title="Подтверждение"
            onClose={() => {
              onClose();
              setOpen(false);
            }}
            footer={<button type="button">Последняя кнопка</button>}
          >
            <input aria-label="Первое поле" />
          </Modal>
        </>
      );
    }

    render(<Harness />);
    const trigger = screen.getByRole('button', { name: 'Открыть' });
    await user.click(trigger);

    const first = screen.getByLabelText('Первое поле');
    const last = screen.getByRole('button', { name: 'Последняя кнопка' });
    expect(first).toHaveFocus();

    last.focus();
    await user.tab();
    expect(first).toHaveFocus();

    await user.tab({ shift: true });
    expect(last).toHaveFocus();

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledOnce();
    expect(trigger).toHaveFocus();
  });
});
