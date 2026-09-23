# Shipment integration status

## Current implementation: saved app-created shipments

The local list endpoint now queries MongoDB instead of always returning `SHIPMENT_LIST_SOURCE_REQUIRED`. It returns only shipments created through this app by the current application user, with pagination and `source: "app-created"`. The dashboard explicitly labels that scope. An empty database returns a genuine empty app shipment list; database failures remain errors.

New creation requests persist an order reservation before calling Delhivery, then save the accepted waybill and normalized dashboard record. A unique `(owner, reference)` index prevents duplicate order submissions. Single-shipment requests are supported, matching the app form. Accepted edits, cancellations and e-waybill updates are also persisted and require ownership. Carrier timeouts or post-carrier database failures retain the reservation and tell the user to check the order instead of submitting a duplicate. These uncertain reservations require operator reconciliation; automatic recovery is not implemented.

Deploy the updated backend and frontend. The backend needs its existing `MONGO_URI`, `JWT_SECRET`, `DELHIVERY_BASE_URL` and `DELHIVERY_API_TOKEN`. It must have permission to create the `appshipments` collection and indexes. No new provider credential is needed. No live carrier shipment was created during automated tests; tests use injected repository/carrier doubles. Production creation and persistence must be verified with the next legitimate shipment.

This does not backfill earlier shipments, import Delhivery account history, or automatically refresh delivery statuses. Charts show saved statuses; tracking remains available separately. Existing unauthenticated carrier utility endpoints and registration policy have not been redesigned by this change.

## Historical account import remains blocked

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

## Previous placeholder and local response contract

The previous `GET /api/delhivery/shipments?page=1&limit=100` placeholder returned HTTP 503 with `SHIPMENT_LIST_SOURCE_REQUIRED`. It has been replaced by the app-created database list described above. No provider list endpoint has been invented.

The frontend requests this local route after login, supports cancellation/retry, and hides statistics/charts while unavailable. The backend returns `{ success: true, data: { shipments, page, limit, total, source: "app-created" } }`. Each normalized shipment includes string `id` (waybill), `status`, `date` (creation date, YYYY-MM-DD), and dashboard fields `reference`, `customer`, `destination`, `pincode`, `payment`, with additional detail fields. This is an application contract, not a claimed Delhivery list API response. Results are restricted to the logged-in user.

The client validates and collects all pages before showing totals/charts or a genuine empty state; partial/invalid/changing totals fail visibly. Pagination uses creation time and ID order. Concurrent inserts can require a retry; snapshot pagination is not implemented. A read-only check reached the configured MongoDB and found zero saved app shipments. Real carrier creation and subsequent database persistence have not been exercised; verify with the next legitimate shipment. Historical account import remains blocked pending the source and account mapping above.
