# DeutschMind architecture

## Runtime modes

- `DATABASE_URL` отсутствует: legacy MVP использует локальный JSON.
- `DATABASE_URL` задан: production mode использует PostgreSQL API `/api/v2/*`, JWT и изолированные пользовательские данные.
- Старый API в production выключен. Для временной миграции его можно включить через `ENABLE_LEGACY_API=true`, но публично так делать нельзя.

## Modules

- `modules/users` — аккаунты и предпочтения.
- `modules/graph` — паутины, узлы, связи и ленивые выборки.
- `modules/knowledge` — четыре измерения знания и интервальные повторения.
- `modules/materials` — приватные фотографии, тексты и результаты анализа.
- `modules/ai-generation` — валидированная пакетная генерация.
- `modules/jobs` — Redis/BullMQ, кэш и идемпотентные фоновые задачи.

## Data isolation

Каждая пользовательская таблица содержит `user_id`. Все repository-запросы принимают `userId` из проверенного JWT, а не из body или query string.

## Graph loading

- `GET /api/v2/webs`
- `GET /api/v2/webs/:id?limit=100&offset=0`
- `GET /api/v2/nodes/:id/neighbors?depth=1`
- `POST /api/v2/nodes/:id/expand`
- `GET /api/v2/jobs/:id`

Frontend загружает список паутин и только одну выбранную паутину. Соседи ограничены глубиной `1–2`.

## Knowledge model

`knowledge` хранит:

- recognition score;
- recall score;
- context score;
- production score;
- aggregate score;
- историю ошибок;
- дату следующего повторения;
- интервал, ease factor и число повторений.

`review_events` хранит неизменяемую историю каждого ответа.

## AI lifecycle

1. API создаёт запись `ai_jobs` с уникальным idempotency key.
2. BullMQ помещает задачу в Redis.
3. Worker вызывает OpenAI Structured Outputs.
4. Обычный код проверяет пользователя, дубликаты и сохраняет результат.
5. Результат кэшируется по слову и настройкам.
6. Временная фотография удаляется после обработки.

## Scaling path

SVG остаётся для небольших выбранных паутин. При сотнях одновременно видимых узлов слой рендера можно заменить на Canvas/WebGL, не меняя API и модель данных.
