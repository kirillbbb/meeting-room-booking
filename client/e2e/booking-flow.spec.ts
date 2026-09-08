import { expect, test } from '@playwright/test';
import { DateTime } from 'luxon';

test.beforeEach(async ({ request }) => {
  await request.post('http://127.0.0.1:3000/api/v1/test/reset');
});

test('finds a room, opens its schedule and creates a booking', async ({ page }) => {
  await page.goto('/rooms');
  await page.getByLabel('Офис').click();
  await page.getByRole('option', { name: 'Офис Москва', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Доступные переговорные в этом офисе' }),
  ).toBeVisible();

  const everest = page.getByRole('article').filter({ hasText: 'Эверест' });
  await expect(everest).toContainText('Вместимость: до 12 человек');
  await everest.getByRole('link', { name: 'Подробнее' }).click();
  await expect(page).toHaveURL(/\/rooms\/room-everest/);
  await expect(page.getByRole('heading', { name: 'Расписание' })).toBeVisible();

  await page.getByRole('button', { name: 'Забронировать' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Название встречи').fill('E2E проверка');
  const tomorrow = DateTime.now().setZone('Europe/Moscow').plus({ days: 1 }).setLocale('ru');
  await dialog.getByLabel('Дата', { exact: true }).click();
  await dialog.getByRole('button', { name: tomorrow.toFormat('d MMMM yyyy'), exact: true }).click();
  await dialog.getByLabel('Время начала').click();
  await dialog.getByRole('option', { name: '12:00', exact: true }).click();
  const submit = dialog.getByRole('button', { name: 'Забронировать' });
  await submit.click();

  await expect(page.getByText('Бронирование создано', { exact: true })).toBeVisible();
});

test('books a free room from the office availability board', async ({ page }) => {
  await page.goto('/rooms');
  await page.getByLabel('Офис').click();
  await page.getByRole('option', { name: 'Офис Москва', exact: true }).click();
  await page.getByRole('button', { name: 'Расписание офиса' }).click();

  await expect(page.getByRole('heading', { name: 'Занятость переговорных' })).toBeVisible();
  await expect(page.getByText('Занята на', { exact: false }).first()).toBeVisible();
  await page.getByRole('button', { name: 'Выбрать свободное время в переговорной Казбек' }).click();

  const dialog = page.getByRole('dialog', { name: 'Новое бронирование' });
  await expect(dialog).toContainText('Переговорная: Казбек');
  await expect(dialog.getByLabel('Время начала')).not.toContainText('09:00');
});

test('opens the office map concept and returns to the availability board', async ({ page }) => {
  await page.goto('/rooms');
  await page.getByLabel('Офис').click();
  await page.getByRole('option', { name: 'Офис Москва', exact: true }).click();
  await page.getByRole('link', { name: /Карта офиса/ }).click();

  await expect(page.getByRole('heading', { name: 'Карта офиса' })).toBeVisible();
  await expect(
    page.getByText('Чтобы разблокировать эту функцию, пригласите меня в команду'),
  ).toBeVisible();
  await page.getByRole('link', { name: 'Открыть расписание' }).click();

  await expect(page.getByRole('heading', { name: 'Занятость переговорных' })).toBeVisible();
});

test('keeps the office between routes and clears it after a full reload', async ({ page }) => {
  await page.goto('/rooms');
  await page.getByLabel('Офис').click();
  await page.getByRole('option', { name: 'Офис Москва', exact: true }).click();

  await page.getByRole('link', { name: 'Мои бронирования' }).click();
  await expect(page.getByLabel('Фильтр по офису')).toContainText('Офис Москва');

  await page.getByRole('link', { name: 'Переговорные', exact: true }).click();
  await expect(page.getByLabel('Офис')).toContainText('Офис Москва');
  await page.reload();

  await expect(page.getByLabel('Офис')).toContainText('Выберите офис');
  await expect(page.getByRole('heading', { name: 'Выберите офис' })).toBeVisible();
});

test('shows the not-found page for an unknown route', async ({ page }) => {
  await page.goto('/unknown');
  await expect(page.getByText('404', { exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Страница не найдена' })).toBeVisible();
});

test('exposes design states through development-only preview URLs', async ({ page }) => {
  await page.goto('/rooms?__state=loading');
  await expect(page.getByRole('heading', { name: 'Загрузка переговорных...' })).toBeVisible();

  await page.goto('/rooms?__state=empty');
  await expect(page.getByRole('heading', { name: 'Нет доступных переговорных' })).toBeVisible();

  await page.goto('/rooms?__state=error');
  await expect(page.getByRole('heading', { name: 'Не удалось загрузить данные' })).toBeVisible();

  await page.goto('/rooms?__state=offline');
  await expect(page.getByRole('status')).toContainText('Соединение потеряно');
  await expect(page.getByRole('heading', { name: 'Не удалось загрузить данные' })).toBeVisible();

  await page.goto('/rooms/room-everest?__state=loading');
  await expect(page.locator('.detail-info-skeleton')).toBeVisible();

  await page.goto('/rooms/room-everest?__state=error');
  await expect(
    page.getByRole('heading', { name: 'Не удалось загрузить расписание' }),
  ).toBeVisible();

  await page.goto('/bookings?__state=loading');
  await expect(page.locator('.booking-card-skeleton')).toHaveCount(2);

  await page.goto('/bookings?__state=empty');
  await expect(page.getByRole('heading', { name: 'Нет бронирований' })).toBeVisible();

  await page.goto('/bookings?__state=error');
  await expect(page.getByRole('heading', { name: 'Не удалось загрузить данные' })).toBeVisible();
});

test('groups a recurring series and expands its occurrences', async ({ page }) => {
  await page.goto('/bookings');

  const series = page.getByRole('article').filter({ hasText: 'Еженедельная встреча команды' });
  await expect(series).toContainText('Серия · 3 встречи');
  await expect(page.getByRole('button', { name: 'Предстоящие (2)' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Прошедшие (1)' })).toBeVisible();

  await page.getByRole('button', { name: 'Прошедшие (1)' }).click();
  await expect(page.getByRole('button', { name: 'Предстоящие (2)' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Прошедшие (1)' })).toBeVisible();
  await page.getByRole('button', { name: 'Предстоящие (2)' }).click();

  await series.getByRole('button', { name: 'Показать встречи' }).click();
  await expect(series.getByRole('button', { name: 'Отменить встречу' })).toHaveCount(3);

  await series.getByRole('button', { name: 'Отменить серию' }).click();
  const dialog = page.getByRole('dialog', { name: 'Отменить серию встреч?' });
  await expect(dialog).toContainText('3 встречи');
  await dialog.getByRole('button', { name: 'Нет, оставить' }).click();
});

test('shows a conflict dialog for a real 409 response', async ({ page }) => {
  await page.route('**/api/v1/bookings', async (route) => {
    if (route.request().method() !== 'POST') return route.continue();
    await route.fulfill({
      status: 409,
      contentType: 'application/json',
      body: JSON.stringify({
        error: { code: 'BOOKING_CONFLICT', message: 'Выбранное время уже занято' },
      }),
    });
  });

  await page.goto('/rooms/room-everest');
  await page.getByRole('button', { name: 'Забронировать' }).click();
  const dialog = page.getByRole('dialog', { name: 'Новое бронирование' });
  await dialog.getByLabel('Название встречи').fill('Проверка конфликта');
  const tomorrow = DateTime.now().setZone('Europe/Moscow').plus({ days: 1 }).setLocale('ru');
  await dialog.getByLabel('Дата', { exact: true }).click();
  await dialog.getByRole('button', { name: tomorrow.toFormat('d MMMM yyyy'), exact: true }).click();
  await dialog.getByLabel('Время начала').click();
  await dialog.getByRole('option', { name: '12:00', exact: true }).click();
  await dialog.getByRole('button', { name: 'Забронировать' }).click();

  await expect(page.getByRole('dialog', { name: 'Время уже занято' })).toBeVisible();
});

test('rolls an optimistically cancelled booking back after a server error', async ({ page }) => {
  await page.route('**/api/v1/bookings/*', async (route) => {
    if (route.request().method() !== 'DELETE') return route.continue();
    await route.fulfill({
      status: 500,
      contentType: 'application/json',
      body: JSON.stringify({
        error: { code: 'INTERNAL_ERROR', message: 'Не удалось отменить бронирование' },
      }),
    });
  });

  await page.goto('/bookings');
  const booking = page.getByRole('article').filter({ hasText: 'Собеседование с разработчиком' });
  await booking.getByRole('button', { name: 'Отменить', exact: true }).click();
  await page
    .getByRole('dialog', { name: 'Отменить бронирование?' })
    .getByRole('button', { name: 'Да, отменить' })
    .click();

  await expect(page.getByRole('dialog', { name: 'Не удалось отменить' })).toBeVisible();
  await expect(booking).toBeVisible();
});

test('shows and clears the connection banner during a real offline transition', async ({
  page,
  context,
}) => {
  await page.goto('/rooms');
  await expect(page.getByLabel('Офис')).toBeVisible();

  await context.setOffline(true);
  await page.evaluate("window.dispatchEvent(new Event('offline'))");
  await expect(page.getByRole('status')).toContainText('Соединение потеряно', { timeout: 10_000 });

  await context.setOffline(false);
  await page.evaluate("window.dispatchEvent(new Event('online'))");
  await expect(page.getByRole('status')).toBeHidden({ timeout: 15_000 });
});

test('updates an open schedule when another client creates a booking', async ({
  page,
  request,
}) => {
  const timezone = 'Europe/Moscow';
  const day = DateTime.now().setZone(timezone).plus({ days: 1 }).startOf('day');
  const startsAt = day.set({ hour: 18 }).toUTC();
  const endsAt = startsAt.plus({ minutes: 60 });

  await page.goto(`/rooms/room-altai?date=${day.toISODate()}`);
  await expect(page.getByRole('heading', { name: 'Расписание' })).toBeVisible();
  await expect(page.getByText('Realtime из второй вкладки')).toHaveCount(0);

  const response = await request.post('http://127.0.0.1:3000/api/v1/bookings', {
    data: {
      roomId: 'room-altai',
      title: 'Realtime из второй вкладки',
      comment: null,
      startsAt: startsAt.toISO(),
      endsAt: endsAt.toISO(),
    },
  });
  expect(response.status()).toBe(201);

  const realtimeEvent = page.locator('.timeline-event').filter({
    hasText: 'Realtime из второй вкладки',
  });
  await expect(realtimeEvent).toBeVisible({ timeout: 10_000 });
  await expect(realtimeEvent).toContainText('18:00–19:00');
});
