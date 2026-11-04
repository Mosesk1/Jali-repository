# jali-workspace

Payment callback API (NestJS) + MoMo simulator (Laravel) + MySQL.

## Setup

Create DB from `deploy/mysql/init.sql`.

NestJS:
```
cd system-a-nestjs
cp .env.example .env
npm i
npm run start:dev
```

Laravel:
```
cd system-b-laraval
cp .env.example .env
composer install
php artisan key:generate
php artisan serve --port=8000
```

Make sure both use the same `SHARED_SECRET` in .env.

Docker (optional):
```
cp .env.example .env
docker compose up --build
```

## Testing

```
curl -X POST http://127.0.0.1:3000/payments/initiate -H "Content-Type: application/json" -d "{\"provider\":\"MTN\",\"amount\":100000,\"currency\":\"RWF\",\"transaction_id\":\"MTN001\"}"
```

Callback goes to `/webhooks/momo-callback` with header `X-JaKo-Signature`.

```
curl http://127.0.0.1:3000/payments/MTN001
```

## Notes

- payments are stored in `payment_transactions`
- duplicate `transaction_id` is rejected / ignored on callback
- signature is checked with hmac sha256
- if the provider call fails the row can stay PENDING
- secrets are in .env, not hardcoded for deploy
