# RentFlow Cloud Starter

This starter uses:
- `index.html` — responsive RentFlow UI with registration, login, dashboard, hamburger navigation, tenant/property/bill/payment CRUD, and rental ad cards.
- `Code.gs` — Google Apps Script backend for Google Sheets.
- `api/rentflow.js` — Vercel serverless proxy. Keeps the Apps Script secret out of the browser.

## 1) Create Google Sheet
Create a new Google Spreadsheet. Copy its ID from the URL:
`https://docs.google.com/spreadsheets/d/SPREADSHEET_ID/edit`

In `Code.gs`:
- Replace `PASTE_YOUR_GOOGLE_SHEET_ID_HERE`
- Replace `CHANGE_THIS_TO_A_LONG_RANDOM_SECRET` with a long random secret.
Use the exact same secret as the Vercel environment variable `RENTFLOW_API_SECRET`.

## 2) Setup Apps Script
1. Open Extensions → Apps Script from the spreadsheet.
2. Paste the contents of `Code.gs`.
3. Save.
4. Select and run `setupRentFlow()` once; authorize access. It creates the required tabs.
5. Deploy → New deployment → Web app.
6. Execute as: **Me**. Who has access: **Anyone**.
7. Copy the Web app URL ending in `/exec`.

## 3) Deploy to GitHub + Vercel
1. Put `index.html`, `vercel.json`, `package.json`, and the `api` folder in a GitHub repository.
2. Import the repository in Vercel.
3. Add these Vercel Environment Variables:
   - `GAS_WEB_APP_URL` = Apps Script `/exec` URL
   - `RENTFLOW_API_SECRET` = same long secret used in Code.gs
4. Redeploy after adding variables.
5. Connect your custom domain in Vercel project Settings → Domains.

## 4) Important security and launch notes
- Do not publish `Code.gs` secrets in a public GitHub repository. The Apps Script code contains the secret, so keep the Apps Script project private and rotate the secret if exposed.
- This starter hashes passwords with a per-user salt using SHA-256 and uses 7-day sessions. This is a basic starter, **not a security-audited authentication system**. For real customer financial records, upgrade to a stronger password KDF, add email verification, rate limiting, account recovery, audit logs, and backups before public launch.
- Apps Script / Google Sheets has quotas and concurrency limits. It is suitable for a small initial deployment and low-to-moderate volume, not guaranteed unlimited/free hosting.
- All account-owned records are filtered by account ID in the backend. Do not remove these checks.
- Public registration is enabled in this starter. Disable or add approval controls before opening the site widely if desired.
- Do not store uploaded photos as base64 inside cells. Use a dedicated image host/storage service later and save only image URLs in Sheets.
- Vercel hosting has a free tier with limits; domain registration is usually not free.
- Test with two separate accounts before adding real records: confirm Account A cannot view, edit, or delete Account B's records.

## 5) Included data tabs
Users, Sessions, Tenants, Properties, Bills, Payments, Ads.

This is a starter foundation. Advanced features from the earlier local V2 (meter computations, receipt PNG layout, leases, expenses, monthly billing, exports, backup/restore) still need to be migrated and tested for cloud use.
