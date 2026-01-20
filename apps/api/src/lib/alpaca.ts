type AlpacaTrade = {
  p?: number;
};

type AlpacaTradesResponse = {
  trades?: Record<string, AlpacaTrade | undefined>;
};

export async function fetchLatestPrices(symbols: string[]): Promise<Record<string, number | null>> {
  if (!symbols.length) {
    return {};
  }
  const { ALPACA_API_KEY, ALPACA_API_SECRET, ALPACA_DATA_BASE_URL } = process.env;
  if (!ALPACA_API_KEY || !ALPACA_API_SECRET) {
    throw new Error("Missing Alpaca API credentials.");
  }
  const baseUrl = ALPACA_DATA_BASE_URL || "https://data.alpaca.markets";
  const url = new URL("/v2/stocks/trades/latest", baseUrl);
  url.searchParams.set("symbols", symbols.join(","));

  const response = await fetch(url.toString(), {
    headers: {
      "APCA-API-KEY-ID": ALPACA_API_KEY,
      "APCA-API-SECRET-KEY": ALPACA_API_SECRET,
    },
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`Alpaca request failed: ${message}`);
  }

  const data = (await response.json()) as AlpacaTradesResponse;
  const trades = data.trades || {};
  return Object.entries(trades).reduce<Record<string, number | null>>((acc, [symbol, trade]) => {
    acc[symbol] = trade?.p ?? null;
    return acc;
  }, {});
}
