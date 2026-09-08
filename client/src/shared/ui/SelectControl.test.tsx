import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { SelectControl } from './SelectControl';

describe('SelectControl', () => {
  it('opens a custom listbox and selects an option', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <SelectControl
        value="60"
        ariaLabel="Длительность"
        options={[
          { value: '30', label: '30 мин.' },
          { value: '60', label: '1 час' },
        ]}
        onChange={onChange}
      />,
    );

    await user.click(screen.getByLabelText('Длительность'));
    expect(screen.getByRole('listbox', { name: 'Длительность' })).toBeVisible();
    await user.click(screen.getByRole('option', { name: '30 мин.' }));
    expect(onChange).toHaveBeenCalledWith('30');
  });
});
