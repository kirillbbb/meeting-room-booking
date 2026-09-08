# BookRoom

Сервис бронирования переговорных комнат для frontend trainee assignment.

Пользователь может выбрать офис, найти свободную переговорную на нужное время,
посмотреть её расписание, создать обычную или повторяющуюся встречу и управлять
своими бронированиями. Данные синхронизируются между открытыми клиентами через
WebSocket.

## Демо

- [Открыть BookRoom](https://meeting-room-booking-client-five.vercel.app);
- [проверить состояние API](https://meeting-room-booking-backend-production-e0f7.up.railway.app/health).

Frontend опубликован на Vercel, backend — на Railway.

## Возможности

- поиск переговорных по офису, дате, времени, длительности и вместимости;
- проверка доступности комнаты на выбранный интервал;
- расписание отдельной переговорной с 09:00 до 20:00;
- создание и отмена бронирований с обработкой конфликтов;
- еженедельные и двухнедельные серии встреч с выбором дней недели;
- группировка серий и отмена отдельной встречи или всей серии;
- разделение предстоящих и прошедших бронирований;
- экспорт встречи в `.ics`;
- realtime-обновления и восстановление после потери соединения;
- loading, empty, error, offline, no-office и 404-состояния;
- адаптивная вёрстка для desktop и mobile;
- общая шкала занятости переговорных офиса;
- демонстрационный концепт интерактивной карты офиса.

## Стек

### Frontend

- React 19 и TypeScript;
- Vite;
- React Router;
- TanStack Query;
- React Hook Form;
- Zod для проверки API-контрактов во время выполнения;
- Luxon для работы с timezone офисов;
- CSS и Manrope без готовой UI-библиотеки.

### Backend

- Node.js и Fastify;
- REST API и Swagger/OpenAPI;
- WebSocket;
- `MemoryStore` с тестовыми данными.

### Качество

- ESLint и Prettier;
- Vitest и Testing Library;
- Playwright E2E;
- visual regression;
- TypeScript strict mode.

## Запуск

Понадобятся Node.js 20+ и pnpm 10+. Из корневой директории скачанного
репозитория выполните:

```bash
pnpm install
pnpm dev
```

Если репозиторий уже скачан и зависимости установлены, для следующих запусков
достаточно выполнить `pnpm dev` в корне проекта.

После запуска доступны:

- frontend — http://localhost:5173;
- REST API — http://localhost:3000/api/v1;
- проверка состояния API — http://localhost:3000/health;
- Swagger UI — http://localhost:3000/documentation.

Первый экран просит выбрать офис. Это предусмотренное состояние приложения, а
не ошибка загрузки.

### Production-сборка локально

Чтобы одной командой собрать и запустить обе части приложения в production-режиме:

```bash
pnpm start
```

Команда запускает собранный frontend на http://127.0.0.1:4173 и backend на
http://127.0.0.1:3100. Swagger UI и endpoint сброса тестовых данных в этом режиме
отключены. Для остановки обоих процессов нажмите `Ctrl+C`.

## Публикация

Vercel собирает frontend из директории `client`. Для production и preview
нужно указать переменные `VITE_API_URL` и `VITE_WS_URL` с адресами публичного
REST API и WebSocket endpoint.

Railway собирает backend из корня репозитория со следующими настройками:

```text
Build command: pnpm --dir server build
Start command: pnpm --dir server start
Healthcheck Path: /health
```

Backend использует `NODE_ENV=production`, `ENABLE_TEST_RESET=false` и
`CORS_ORIGINS` с точным production origin frontend. Переменную `PORT` задаёт
Railway.

## Основные команды

```bash
pnpm dev                         # frontend и backend
pnpm start                       # production-сборка и локальный запуск
pnpm check                       # форматирование, lint, типы и unit-тесты
pnpm build                       # production-сборка
pnpm test                        # frontend- и backend-тесты
pnpm --dir client test:coverage  # покрытие frontend
pnpm --dir client test:e2e       # desktop и mobile E2E
```

Сбросить изменившиеся тестовые данные можно командой:

```bash
curl -X POST http://localhost:3000/api/v1/test/reset
```

## Архитектура

```text
client/src/
├── app/       router, layout и realtime provider
├── pages/     страницы приложения
├── features/  бронирование, серии и занятость офиса
├── entities/  query hooks и cache keys
└── shared/    API-контракты, утилиты и UI-примитивы

server/src/
├── routes/    REST, OpenAPI и WebSocket endpoints
├── services/  бизнес-правила бронирования
├── store/     хранилище и seed-данные
└── domain/    модели и ошибки предметной области
```

TanStack Query отвечает за server state, URL хранит воспроизводимые фильтры,
React Hook Form — состояние формы. Входящие REST-ответы и WebSocket-события
проверяются Zod на границе приложения.

Время в интерфейсе отображается в timezone выбранного офиса, а в API передаётся
в ISO UTC. Backend использует in-memory хранилище, поэтому созданные данные
сбрасываются при его перезапуске.

## Специальные состояния

В development-режиме состояния из макетов можно открыть напрямую:

```text
/rooms?__state=loading
/rooms?__state=empty
/rooms?__state=error
/rooms?__state=offline
/rooms/room-everest?__state=loading
/rooms/room-everest?__state=error
/bookings?__state=loading
/bookings?__state=empty
/bookings?__state=error
/any-unknown-address
```

В production параметр `__state` игнорируется.

## Материалы задания

- [Техническое задание](./Frontend-trainee-assignment-autumn-2026.md)
- [Макет в Figma](https://www.figma.com/design/VuCFeHjoXSSYSz5jpANMTg/Бронирование-переговорных)
