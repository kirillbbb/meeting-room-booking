import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { TimeInput } from './TimeInput';

describe('TimeInput', () => {
  it('commits a complete valid quarter-hour value', () => {
    const onChange = vi.fn();
    render(<TimeInput value="13:30" ariaLabel="Время начала" onChange={onChange} />);

    fireEvent.change(screen.getByRole('textbox', { name: 'Время начала' }), {
      target: { value: '1500' },
    });

    expect(screen.getByRole('textbox', { name: 'Время начала' })).toHaveValue('15:00');
    expect(onChange).toHaveBeenCalledWith('15:00');
  });

  it('keeps only four digits while applying the mask', () => {
    render(<TimeInput value="" ariaLabel="Время начала" onChange={vi.fn()} />);
    const input = screen.getByRole('textbox', { name: 'Время начала' });

    fireEvent.change(input, { target: { value: '1a3:45x' } });

    expect(input).toHaveValue('13:45');
  });

  it('restores the previous value when input is incomplete', () => {
    render(<TimeInput value="13:30" ariaLabel="Время начала" onChange={vi.fn()} />);
    const input = screen.getByRole('textbox', { name: 'Время начала' });

    fireEvent.change(input, { target: { value: '14' } });
    fireEvent.blur(input);

    expect(input).toHaveValue('13:30');
  });
});
