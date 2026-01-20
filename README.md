# Portfolio Dashboard

Database-backed dashboard that lets you manually manage stock positions and pulls live market data from Alpaca for real-time valuation and P/L.

## Features

- **Static dashboard** at `/` for viewing and editing positions.
- **Express API** for storage and price refresh (Postgres-backed).
- **Alpaca enrichment** for live prices, market value, and unrealized P/L metrics.

## Repository Structure

```
index.html
assets/style.css
assets/app.js
apps/api/src
apps/worker/src
netlify.toml
```

## Environment Variables

### Frontend

Set the API base URL in the HTML meta tag or via a global injected variable:

- `PORTFOLIO_API_URL` (optional) – the API origin (example: `https://api.example.com`).
- Alternatively, set `<meta name="portfolio-api-base-url" content="https://api.example.com" />` in `index.html`.

If left blank, the UI will call the API on the same origin.

### API Server

Set the following on the API runtime:

- `ADMIN_TOKEN` (required)
- `DATABASE_URL` (required)
- `ALPACA_API_KEY`
- `ALPACA_API_SECRET`
- `ALPACA_DATA_BASE_URL` (default `https://data.alpaca.markets`)

## Alpaca Market Data

This project uses the **latest trades** endpoint:

```
GET https://data.alpaca.markets/v2/stocks/trades/latest?symbols=VOO,SPY
```

The trade price (`p`) is used as `lastPrice` for market value calculations.

## Deploy to Netlify

1. Connect the repository to Netlify.
2. Build settings:
   - **Build command**: none required (static site)
   - **Publish directory**: `.`
3. Configure the frontend API base URL (see **Frontend** env vars).
4. Deploy.

## Usage

1. Open the dashboard URL.
2. Enter your admin token when prompted (stored in `localStorage`).
3. Add positions in the form at the bottom.
4. Click **Save Portfolio** to persist positions.
5. Click **Download CSV** to export positions (SYMBOL, SHARES, AVGCOST).
6. Click **Refresh Prices** to pull Alpaca data and update the snapshot.

## Troubleshooting

- **Unauthorized responses**: Ensure the `ADMIN_TOKEN` in the API matches the token stored in the browser.
- **Alpaca API errors**: Verify `ALPACA_API_KEY` and `ALPACA_API_SECRET` are correct and the data base URL is reachable.
- **No prices returned**: Confirm the symbols are valid US equities supported by Alpaca market data.
