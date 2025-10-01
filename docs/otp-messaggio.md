### Messaggio OTP — краткая выжимка и поля конфигурации

Документация: [Messaggio OTP API — sendCode](https://messaggio.com/otp-service-api-documentation/#operation/sendCode)

Концепция:
- Отправка одноразового кода по SMS/мессенджеру на номер телефона.
- API‑ключ передаётся в заголовках (Bearer/Token), эндпоинт — из кабинета.

Базовые параметры (по документации):
- phone / msisdn: номер телефона в международном формате.
- ttl / codeLength / channel: время жизни, длина кода, канал доставки.
- requestId / sessionId: идентификатор запроса (для последующей верификации).

Шаги:
1) sendCode — инициирует отправку OTP → возвращает `requestId`.
2) verifyCode — проверяет введённый код по `requestId` + `code` (эндпоинт в той же секции доков).

Конфигурация окружения:
- MESSAGGIO_API_KEY: ключ API.
- MESSAGGIO_BASE_URL: базовый URL OTP API.
- MESSAGGIO_SENDER: отправитель (если требуется политикой канала).

Примечания:
- Лимиты/анти‑фрод: ограничить частоту sendCode (per phone, per IP).
- Безопасность: не логировать коды; хранить только requestId/sessionId и метаданные.

