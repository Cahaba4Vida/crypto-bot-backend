type AlpacaTrade = {
  p?: number;
  t?: string;
};

type AlpacaTradesResponse = {
  trades?: Record<string, AlpacaTrade | undefined>;
};

export type AlpacaPriceResponse = {
  prices: Record<string, number | null>;
  asOf: string | null;
};

const cryptoTickers = new Set([
  "BTC",
  "ETH",
  "SOL",
  "USDC",
  "USDT",
  "AVAX",
  "ADA",
  "DOGE",
  "LTC",
  "XRP",
  "BNB",
  "DOT",
  "MATIC",
  "LINK",
  "ATOM",
  "UNI",
]);

const isCryptoSymbol = (symbol: string) => symbol.includes("/") || cryptoTickers.has(symbol);

const normalizeCryptoPair = (symbol: string) => (symbol.includes("/") ? symbol : `${symbol}/USD`);

export function getAlpacaCredentials() {
  const key = process.env.ALPACA_API_KEY ?? process.env.ALPACA_KEY_ID ?? "";
  const secret = process.env.ALPACA_API_SECRET ?? process.env.ALPACA_SECRET_KEY ?? "";
  const missing: string[] = [];
  if (!key) {
    missing.push("ALPACA_API_KEY");
  }
  if (!secret) {
    missing.push("ALPACA_API_SECRET");
  }
  return {
    key,
    secret,
    missing,
    baseUrl: process.env.ALPACA_DATA_BASE_URL || process.env.ALPACA_DATA_URL || "https://data.alpaca.markets",
  };
}

const fetchTrades = async (
  baseUrl: string,
  path: string,
  symbols: string[],
  key: string,
  secret: string
) => {
  if (!symbols.length) {
    return { prices: {}, asOf: null };
  }
  const url = new URL(path, baseUrl);
  url.searchParams.set("symbols", symbols.join(","));

  const response = await fetch(url.toString(), {
    headers: {
      "APCA-API-KEY-ID": key,
      "APCA-API-SECRET-KEY": secret,
    },
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`Alpaca request failed: ${message}`);
  }

  const data = (await response.json()) as AlpacaTradesResponse;
  const trades = data.trades || {};
  const asOf = Object.values(trades)
    .map((trade) => trade?.t)
    .filter(Boolean)
    .sort()
    .pop() ?? null;

  const prices = Object.entries(trades).reduce<Record<string, number | null>>((acc, [symbol, trade]) => {
    acc[symbol] = trade?.p ?? null;
    return acc;
  }, {});

  return { prices, asOf };
};

export async function fetchLatestPrices(symbols: string[]): Promise<AlpacaPriceResponse> {
  if (!symbols.length) {
    return { prices: {}, asOf: null };
  }
  const { key, secret, baseUrl } = getAlpacaCredentials();
  const cryptoSymbols: string[] = [];
  const stockSymbols: string[] = [];

  symbols.forEach((symbol) => {
    if (isCryptoSymbol(symbol)) {
      cryptoSymbols.push(symbol);
    } else {
      stockSymbols.push(symbol);
    }
  });

  const cryptoPairs = cryptoSymbols.map(normalizeCryptoPair);

  const [stockResponse, cryptoResponse] = await Promise.all([
    fetchTrades(baseUrl, "/v2/stocks/trades/latest", stockSymbols, key, secret),
    fetchTrades(baseUrl, "/v1beta3/crypto/us/latest/trades", cryptoPairs, key, secret),
  ]);

  const prices: Record<string, number | null> = {
    ...stockResponse.prices,
  };
  cryptoSymbols.forEach((symbol, index) => {
    const pair = cryptoPairs[index];
    const price = cryptoResponse.prices[pair] ?? null;
    prices[symbol] = price;
  });

  const asOf = [stockResponse.asOf, cryptoResponse.asOf].filter(Boolean).sort().pop() ?? null;

  return { prices, asOf };
}
