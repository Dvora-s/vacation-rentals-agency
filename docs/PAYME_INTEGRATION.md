# PayMe integration (iFrame / Hosted Fields — Option 2)

PayMe secrets live **only** on the server (`PAYME_API_KEY`). Never put them in the React app or `VITE_*` variables.

## Required npm packages

All dependencies are already in the project:

| Package | Where | Purpose |
|---------|-------|---------|
| `express` | `server/` | HTTP API |
| `cors` | `server/` | CORS |
| `dotenv` | `server/` | Load `server/.env` |
| `mysql2` | `server/` | Persist payments |

No extra packages are needed for PayMe HTTP calls (Node 18+ `fetch`).

## Environment variables (server)

| Variable | Required | Description |
|----------|----------|-------------|
| `PAYME_API_KEY` | **Yes** | Sent as `payme_key` in Generate Payment body |
| `PAYME_BASE_URL` | No | Default: `https://sandbox.payme.io/api` |
| `PAYME_MERCHANT_ID` | No | `seller_payme_id` if PayMe requires it |
| `API_PUBLIC_URL` | Recommended | Public backend URL for IPN (`notify_url`), e.g. `https://your-api.railway.app` |
| `APP_URL` | Recommended | Frontend URL for buyer return links |

Configure PayMe dashboard **notify URL**:

`https://YOUR_API_DOMAIN/api/payments/callback`

## API endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/api/payments/create-session` | JWT | Calls PayMe `generate-payment`, returns `payme_sale_id` |
| `POST` | `/api/payments/create` | JWT | Alias of `create-session` |
| `POST` | `/api/payments/callback` | PayMe IPN | `x-www-form-urlencoded` — updates `payments` table |
| `GET` | `/api/payments/:id/status` | JWT | Read payment status from DB |

## Frontend flow

1. Load `https://gateway.payme.io/js/payme-fields.js`
2. `POST /api/payments/create-session` with `{ price: 10000, currency: "ILS", product_name: "..." }` (price in **agorot**)
3. `new PayMeFields({ saleId: payme_sale_id, container: '#payme-iframe-container' })`
4. On success → poll `GET /api/payments/:id/status` until `paid` (IPN also updates server)

## Key files

```text
server/src/config/payme.js
server/src/services/paymeService.js
server/src/controllers/paymentController.js
server/src/routes/payments.js
client/src/integrations/payme/PayMeHostedFields.jsx
client/src/services/paymentService.js
```

## Health check

`GET /api/health` includes non-secret `payme` configuration summary.
