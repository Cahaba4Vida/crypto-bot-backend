# Portfolio Dashboard

Netlify-deployed dashboard that lets you manually manage stock positions and pulls live market data from Alpaca for real-time valuation and P/L, backed by Neon Postgres.

## Features

- **Static dashboard** at `/` for viewing and editing positions.
- **Netlify Functions** for storage and price refresh (Postgres-backed).
- **Alpaca enrichment** for live prices, market value, and unrealized P/L metrics.

## Repository Structure

```
index.html
assets/style.css
assets/app.js
netlify/functions
netlify.toml
```

## Environment Variables

Set the following in **Netlify → Site settings → Environment variables**:

- `ADMIN_TOKEN` (required)
- `DATABASE_URL` (optional alias for Neon connection string)
- `NETLIFY_DATABASE_URL` (required with Netlify Neon integration)
- `NETLIFY_DATABASE_URL_UNPOOLED` (optional fallback for unpooled connections)
- `ALPACA_API_KEY` (or `ALPACA_KEY_ID`)
- `ALPACA_API_SECRET` (or `ALPACA_SECRET_KEY`)
- `ALPACA_DATA_BASE_URL` (default `https://data.alpaca.markets`)

## Postgres Storage

The functions use a single `settings` table (created if missing):

```
CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value JSONB NOT NULL);
```

Keys used:

- `positions`
- `snapshot`
- `meta`

## Alpaca Market Data

This project uses the **latest trades** endpoints:

```
GET https://data.alpaca.markets/v2/stocks/trades/latest?symbols=VOO,SPY
GET https://data.alpaca.markets/v1beta3/crypto/us/latest/trades?symbols=SOL/USD,BTC/USD
```

The trade price (`p`) is used as `lastPrice` for market value calculations.

## Deploy to Netlify

1. Connect the repository to Netlify.
2. Build settings:
   - **Build command**: none required (static site + functions)
   - **Publish directory**: `.`
   - **Functions directory**: `netlify/functions`
3. Add environment variables listed above.
4. Deploy.

## Usage

1. Open the dashboard URL.
2. Enter your admin token when prompted (stored in `localStorage`).
3. Add positions in the form at the bottom.
4. Click **Save Portfolio** to persist positions.
5. Click **Download CSV** to export positions (SYMBOL, SHARES, AVGCOST).
6. Click **Refresh Prices** to pull Alpaca data and update the snapshot.

## Troubleshooting

- **Unauthorized responses**: Ensure the `ADMIN_TOKEN` in Netlify matches the token stored in the browser.
- **Alpaca API errors**: Verify `ALPACA_API_KEY` and `ALPACA_API_SECRET` are correct and the data base URL is reachable.
- **No prices returned**: Confirm the symbols are valid US equities or supported crypto tickers (e.g., `SOL` or `SOL/USD`).
