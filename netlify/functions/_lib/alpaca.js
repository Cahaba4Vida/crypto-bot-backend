const fetchLatestPrices = async (symbols) => {
  if (!symbols.length) {
    return {};
  }
  const { ALPACA_API_KEY, ALPACA_API_SECRET, ALPACA_DATA_BASE_URL } = process.env;
  if (!ALPACA_API_KEY || !ALPACA_API_SECRET) {
    throw new Error('Missing Alpaca API credentials.');
  }
  const baseUrl = ALPACA_DATA_BASE_URL || 'https://data.alpaca.markets';
  const url = new URL('/v2/stocks/trades/latest', baseUrl);
  url.searchParams.set('symbols', symbols.join(','));

  const response = await fetch(url.toString(), {
    headers: {
      'APCA-API-KEY-ID': ALPACA_API_KEY,
      'APCA-API-SECRET-KEY': ALPACA_API_SECRET,
    },
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`Alpaca request failed: ${message}`);
  }

  const data = await response.json();
  const trades = data.trades || {};
  return Object.entries(trades).reduce((acc, [symbol, trade]) => {
    acc[symbol] = trade?.p ?? null;
    return acc;
  }, {});
};

module.exports = {
  fetchLatestPrices,
};
