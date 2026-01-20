export type PositionInput = {
  symbol?: string;
  shares?: number;
  avgCost?: number | null;
  costBasis?: number | null;
};

export type NormalizedPosition = {
  symbol: string;
  shares: number;
  avgCost: number | null;
  costBasis: number | null;
};

export type SnapshotMeta = {
  lastRefreshAt?: string | null;
};

export type Snapshot = {
  generatedAt: string;
  lastRefreshAt: string | null;
  totalCostBasis: number;
  totalMarketValue: number;
  totalUnrealizedPnL: number;
  totalUnrealizedPnLPct: number | null;
  positions: Array<NormalizedPosition & {
    lastPrice: number | null;
    marketValue: number | null;
    unrealizedPnL: number | null;
    unrealizedPnLPct: number | null;
  }>;
};

export function normalizePositions(positions: PositionInput[]): NormalizedPosition[] {
  return positions
    .map((position) => {
      const shares = Number(position.shares);
      const avgCost =
        position.avgCost !== null && position.avgCost !== undefined
          ? Number(position.avgCost)
          : null;
      const costBasis =
        position.costBasis !== null && position.costBasis !== undefined
          ? Number(position.costBasis)
          : avgCost !== null
            ? shares * avgCost
            : null;

      return {
        symbol: String(position.symbol || "").toUpperCase().trim(),
        shares,
        avgCost: avgCost !== null && !Number.isNaN(avgCost) ? avgCost : null,
        costBasis: costBasis !== null && !Number.isNaN(costBasis) ? costBasis : null,
      };
    })
    .filter((position) => position.symbol && position.shares > 0 && !Number.isNaN(position.shares));
}

export function buildSnapshot(
  positions: NormalizedPosition[],
  priceMap: Record<string, number | null>,
  meta: SnapshotMeta
): Snapshot {
  const enriched = positions.map((position) => {
    const lastPrice = priceMap[position.symbol] ?? null;
    const costBasis = position.costBasis ?? (position.avgCost ? position.avgCost * position.shares : 0);
    const marketValue = lastPrice ? position.shares * lastPrice : null;
    const unrealizedPnL = lastPrice ? marketValue - costBasis : null;
    const unrealizedPnLPct = costBasis ? (unrealizedPnL / costBasis) * 100 : null;

    return {
      ...position,
      costBasis,
      lastPrice,
      marketValue,
      unrealizedPnL,
      unrealizedPnLPct,
    };
  });

  const totals = enriched.reduce(
    (acc, position) => {
      acc.totalCostBasis += position.costBasis || 0;
      acc.totalMarketValue += position.marketValue || 0;
      acc.totalUnrealizedPnL += position.unrealizedPnL || 0;
      return acc;
    },
    { totalCostBasis: 0, totalMarketValue: 0, totalUnrealizedPnL: 0 }
  );

  const totalUnrealizedPnLPct = totals.totalCostBasis
    ? (totals.totalUnrealizedPnL / totals.totalCostBasis) * 100
    : null;

  return {
    generatedAt: new Date().toISOString(),
    lastRefreshAt: meta?.lastRefreshAt ?? null,
    totalCostBasis: totals.totalCostBasis,
    totalMarketValue: totals.totalMarketValue,
    totalUnrealizedPnL: totals.totalUnrealizedPnL,
    totalUnrealizedPnLPct,
    positions: enriched,
  };
}
