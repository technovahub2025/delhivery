# Powered by Technovahub

React shipment management frontend connected to the existing Delhivery backend.

## Local setup

Keep the backend running on **http://localhost:3000**. Run the frontend from this folder:

```sh
npm install
npm start
```

You can also use `npm run dev` to start the frontend.

Vite handles development and production builds using `vite.config.mjs`. Run `npm run preview` to preview the production build locally. The existing Jest tests continue to use `react-scripts`.

For Vercel, import this repository and set `REACT_APP_API_BASE_URL` to your public backend API URL (including `/api`) in the project environment variables before deploying. `vercel.json` configures the Vite build, the `build` output directory, and SPA route fallback. The backend must allow requests from your deployed frontend origin.

The frontend opens at **http://localhost:3001**. On PowerShell use `npm.cmd` if script execution policy blocks `npm`.

`.env.development` configures port 3001 and `REACT_APP_API_BASE_URL=http://localhost:3000/api`. Use `.env.development.local` to override local settings. For deployment set `REACT_APP_API_BASE_URL` to the public backend API URL before building. Never put the Delhivery API token in a frontend environment variable; the backend supplies it.

## Deploy to /test_delhivery/

Set `REACT_APP_API_BASE_URL` to the public backend API URL before building, then run:

```sh
npm run build
```

Upload the **contents** of `build/` into the server directory served at `/test_delhivery/`. The deployed layout must include `/test_delhivery/index.html`, `/test_delhivery/assets/`, and the other files from `build/`. Do not upload the source `index.html` or nest the output inside `/test_delhivery/build/`.

Deploy `index.html` and its matching assets together. Upload new assets before replacing `index.html`, and retain previous assets while cached pages may still reference them. The generated HTML references `/test_delhivery/assets/index-*.js` and `/test_delhivery/assets/index-*.css`. Requests for `main.*.js` or `main.*.css` indicate an older Create React App page: replace the deployed HTML with the freshly generated file and clear any server/CDN HTML cache, then hard-refresh the browser.

Verify the script and stylesheet URLs in the deployed HTML return HTTP 200 with JavaScript and CSS content respectively. An HTML fallback response for a missing asset is not a successful deployment.

### Main website appears instead of Delhivery

If `/test_delhivery/` shows the TechnovaHub marketing website and the console says `No routes matched location "/test_delhivery/"`, the browser is running the main website's app. This frontend does not use React Router; adding a route to this project will not fix that warning.

1. Upload the contents of `build/` to the hosting document root's `test_delhivery/` directory (for example, `public_html/test_delhivery/` on hosts using that document root).
2. Open `/test_delhivery/index.html` directly. Its page source should contain the title `Delhivery-Every delivery, one workspace` and scripts under `/test_delhivery/assets/`. If it contains the marketing site's title or scripts, check the upload location and the host's rewrite/proxy rules.
3. Configure the host to serve `/test_delhivery/` from that directory, using its own `index.html`, before applying the main website's SPA fallback. On Apache, inspect the document root's `.htaccess`; on Nginx, inspect the site's location and fallback rules. These hosting rules are outside this frontend repository. Preserve the main website's other routes.
4. Clear any hosting/CDN HTML cache and reload. Confirm the directory URL and the direct `index.html` URL both load the Delhivery login page, and that its JavaScript and CSS requests return the correct files.

For Apache 2.4 hosting with `.htaccess` overrides enabled, the build includes a `.htaccess` file that selects this app's `index.html` and handles its fallback. Include this hidden file when uploading.

If the main site's document-root `.htaccess` rewrites all requests to its own app, insert this rule **immediately after `RewriteEngine On` and before its existing fallback rules** in that document-root file:

```apache
# Let the deployed Delhivery directory handle its own requests.
RewriteRule ^test_delhivery(?:/|$) - [L]
```

This parent rule belongs in the hosting document root, not inside `test_delhivery/`. The directory-level file cannot prevent an earlier parent rewrite. These Apache rules do not apply to Nginx or reverse-proxy hosting.

## Connected features

- Registration and login call the backend. The application JWT is kept in memory, sent as a Bearer token, and cleared on logout. Remember me retains the email during the current page session; it does not persist the password or JWT.
- Standard/heavy pincode lookup, delivery estimates, shipping charges, tracking by waybill/reference, and waybill allocation use the documented GET routes. Allocation only runs after clicking Generate waybills.
- Shipment creation, editing, cancellation and e-waybill updates, warehouse creation/editing and pickup requests use the documented POST routes. Local records update only after an accepted response. Requests are not automatically retried.
- Shipment weights entered in kilograms are converted to grams. Order references and registered warehouse names are supplied by the user. Warehouse return addresses use the entered warehouse address.
- Labels and documents are retrieved by waybill. Returned HTTP(S) document links can be opened for viewing, printing or saving. Provider response text is rendered as text, never injected as HTML; a JSON envelope is not treated as a PDF.
- Both HTTP failures and nested provider failures are displayed. Provider response fields are preserved because the backend passes through varying result formats.

## Backend limitations

The supplied backend has no GET routes for shipment, warehouse or pickup lists. These lists and dashboard counts show records created in the current session and clear on refresh/logout. Existing shipments can still be tracked and their documents retrieved by waybill/reference. Enter an existing registered warehouse name directly when creating a shipment or requesting pickup.

The webhook POST route is for carrier callbacks. The frontend does not send synthetic callbacks; event history remains unavailable until the backend exposes a read endpoint. There is no password reset endpoint.

POST payloads follow the supplied route contract and templates. Account-specific carrier validation can require additional fields; the frontend displays those provider errors. Local backend connectivity was checked without creating accounts, shipments, pickups or waybill allocations. Live provider transactions require a valid account and have not been exercised by the automated tests.

## Validation

```sh
npm test -- --watchAll=false --runInBand
npm run build
```

Tests mock network responses to verify requests, error handling, authentication, session state and user workflows without submitting real shipping operations.

API transport and payload mapping live in `src/services/api.js`. Shared session records live in `src/hooks/useDemoWorkspace.js`. Pages compose the reusable components under `src/components/`.
