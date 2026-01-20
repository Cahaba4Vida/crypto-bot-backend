# Portfolio Dashboard

Netlify-deployed dashboard that lets you manually manage stock positions and pulls live market data from Alpaca for real-time valuation and P/L.

## Features

- **Static dashboard** at `/` for viewing and editing positions.
- **Netlify Functions** for storage and price refresh.
- **Netlify DB (Postgres)** for persistent storage (`settings` table stores positions, snapshot, and meta).
- **Alpaca enrichment** for live prices, market value, and unrealized P/L metrics.

## Repository Structure

```
index.html
assets/style.css
assets/app.js
netlify/functions/get-health.js
netlify/functions/get-positions.js
netlify/functions/save-positions.js
netlify/functions/refresh-prices.js
netlify/functions/get-snapshot.js
netlify/functions/get-meta.js
netlify/functions/scheduled-refresh-prices.js
netlify/functions/_lib/db.js
netlify/functions/_lib/storage.js
netlify/functions/_lib/alpaca.js
netlify/functions/_lib/compute.js
netlify.toml
sql/001_init.sql
```

## Netlify Environment Variables

Set the following in **Netlify → Site settings → Environment variables**:

- `ADMIN_TOKEN` (required)
- `NETLIFY_DATABASE_URL` (or `DATABASE_URL`) for Netlify DB/Postgres
- `ALPACA_API_KEY`
- `ALPACA_API_SECRET`
- `ALPACA_DATA_BASE_URL` (default `https://data.alpaca.markets`)

## Database Setup (Netlify DB)

1. Create a **Netlify DB** (Neon Postgres) database for your site.
2. Copy the connection string into `NETLIFY_DATABASE_URL`.
3. Initialize the schema using the SQL in `sql/001_init.sql`.
   - You can run it via the Netlify DB console or any Postgres client.

The app stores values in a `settings` table with keys:
- `positions`
- `snapshot`
- `meta`

## Alpaca Market Data

This project uses the **latest trades** endpoint:

```
GET https://data.alpaca.markets/v2/stocks/trades/latest?symbols=VOO,SPY
```

The trade price (`p`) is used as `lastPrice` for market value calculations.

## Deploy to Netlify

1. Connect the repository to Netlify.
2. Build settings:
   - **Build command**: none required (static site + functions)
   - **Publish directory**: `.`
   - **Functions directory**: `netlify/functions`
3. Add environment variables listed above.
4. Deploy. The scheduled function runs daily at **2:00 AM America/Denver** (configured in `netlify.toml`).

## Usage

1. Open the dashboard URL.
2. Enter your admin token when prompted (stored in `localStorage`).
3. Add positions in the form at the bottom.
4. Click **Save Portfolio** to persist positions.
5. Click **Download CSV** to export positions (SYMBOL, SHARES, AVGCOST).
6. Click **Refresh Prices** to pull Alpaca data and update the snapshot.

## Troubleshooting

- **Unauthorized responses**: Ensure the `ADMIN_TOKEN` in Netlify matches the token stored in the browser.
- **Database connection errors**: Confirm `NETLIFY_DATABASE_URL` (or `DATABASE_URL`) is set and reachable.
- **Missing table**: Run `sql/001_init.sql` to create the `settings` table.
- **DB health check**: Call `/.netlify/functions/get-health` to verify the database is reachable.
- **Alpaca API errors**: Verify `ALPACA_API_KEY` and `ALPACA_API_SECRET` are correct and the data base URL is reachable.
- **No prices returned**: Confirm the symbols are valid US equities supported by Alpaca market data.
