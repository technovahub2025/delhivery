# Account shipment integration status

Existing account shipments are **not connected yet**. A successful token/serviceability check proves authentication for that API, not account-list access. No production shipment data was available to validate a list adapter.

Verified public documentation:

- https://help.delhivery.com/docs/client-developer-portal-1 lists the supported public APIs; account-wide shipment listing is not listed.
- https://one.delhivery.com/developer-portal/document/b2c/detail/order-tracking requires known waybill/order identifiers and supports up to 50 waybills per tracking request. It cannot discover account shipments.
- https://one.delhivery.com/developer-portal/document/b2c/detail/faq directs API questions to lastmile-integration@delhivery.com with the business account POC included.
- https://help.delhivery.com/docs/export-orders documents an order download feature, but does not expose a CSV schema in its public text.

## What is needed to finish

Ask your Delhivery account POC/integration support whether your account has a supported **read-only account shipment-list API**. Obtain its production URL, HTTP method, authentication/scope requirements, pagination and date-filter rules, rate limits, retention/coverage, status definitions and a redacted successful response. Confirm it lists historical shipments created outside this application. Keep the credential in backend configuration only.

Alternatively, download an orders/shipments export from Delhivery One for the required date range and all required statuses. Supply the actual CSV (or its exact headers and redacted sample rows) with AWB/waybill or order ID. For a full dashboard it should also contain creation date, shipment status, order reference, recipient, destination/pincode and payment mode. Include all export pages/date ranges and identify which Delhivery account it belongs to. A CSV is a snapshot; known waybills can subsequently be refreshed through tracking. CSV ingestion, persistence, account ownership and refresh scheduling still need implementation against that real schema.

The application's self-registration is separate from a Delhivery account. Before returning real account data, establish which application users are authorized for the configured Delhivery account; a valid application JWT alone must not grant every self-registered user access to that account.

## Current behavior and future local contract

`GET /api/delhivery/shipments?page=1&limit=100` verifies the application JWT and validates pagination, then returns HTTP 503 with `SHIPMENT_LIST_SOURCE_REQUIRED`. It performs no upstream request and never reports an unavailable source as zero shipments. No provider list endpoint or response mapping has been invented.

The frontend requests this local route after login, supports cancellation/retry, and hides account statistics/charts while unavailable. A future verified backend adapter must return `{ success: true, data: { shipments, page, limit, total } }`. Each normalized shipment needs string `id` (waybill), `status`, `date` (creation date, YYYY-MM-DD), and dashboard fields `reference`, `customer`, `destination`, `pincode`, `payment`; details can additionally provide `history`, `address`, `phone`, etc. This is an application contract, not a claimed Delhivery response format. Return only records authorized for the logged-in account.

The client validates and collects all pages before showing totals/charts or a genuine empty state; partial/invalid/changing totals fail visibly. A real adapter must guarantee stable pagination (or add snapshot support). Production normalization, pagination and real-data end-to-end verification remain blocked pending the source and account mapping above.
