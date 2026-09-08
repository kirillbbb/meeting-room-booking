import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { DateControl } from './DateControl';

describe('DateControl', () => {
  it('shows a placeholder without rendering a second date when value is empty', () => {
    render(
      <DateControl
        value=""
        timezone="Europe/Moscow"
        ariaLabel="Дата"
        placeholder="Выберите дату"
        disabled
        onChange={vi.fn()}
      />,
    );

    expect(screen.getByText('Выберите дату')).toBeInTheDocument();
    expect(screen.getByLabelText('Дата')).toBeDisabled();
  });

  it('opens a calendar and returns the selected ISO date', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <DateControl
        value="2026-09-08"
        timezone="Europe/Moscow"
        ariaLabel="Дата"
        min="2026-09-01"
        max="2026-09-30"
        onChange={onChange}
      />,
    );

    await user.click(screen.getByLabelText('Дата'));
    expect(screen.getByRole('dialog', { name: 'Календарь: Дата' })).toBeVisible();
    await user.click(screen.getByRole('button', { name: '9 сентября 2026' }));
    expect(onChange).toHaveBeenCalledWith('2026-09-09');
  });
});
