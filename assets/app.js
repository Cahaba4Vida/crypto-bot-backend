const statusMessage = document.getElementById('statusMessage');
const refreshButton = document.getElementById('refreshButton');
const savePortfolioButton = document.getElementById('savePortfolioButton');
const downloadCsvButton = document.getElementById('downloadCsvButton');
const positionsBody = document.getElementById('positionsBody');
const addPositionForm = document.getElementById('addPositionForm');

const totalMarketValue = document.getElementById('totalMarketValue');
const totalCostBasis = document.getElementById('totalCostBasis');
const totalUnrealizedPnL = document.getElementById('totalUnrealizedPnL');
const totalUnrealizedPnLPct = document.getElementById('totalUnrealizedPnLPct');
const lastRefreshAt = document.getElementById('lastRefreshAt');

const tokenModal = document.getElementById('tokenModal');
const tokenInput = document.getElementById('tokenInput');
const saveTokenButton = document.getElementById('saveTokenButton');

const symbolInput = document.getElementById('symbolInput');
const sharesInput = document.getElementById('sharesInput');
const avgCostInput = document.getElementById('avgCostInput');

const TOKEN_KEY = 'portfolioDashboardAdminToken';

let positions = [];
let snapshot = null;

const formatCurrency = (value) => {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return '--';
  }
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  }).format(value);
};

const formatPercent = (value) => {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return '--';
  }
  return `${value.toFixed(2)}%`;
};

const formatNumber = (value) => {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return '--';
  }
  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 4,
  }).format(value);
};

const normalizePositionsArray = (value) => {
  if (Array.isArray(value)) {
    return value;
  }
  if (Array.isArray(value?.positions)) {
    return value.positions;
  }
  return [];
};

const resolvePrice = (symbol, prices) => {
  if (!symbol) {
    return null;
  }
  const normalized = symbol.toUpperCase();
  if (normalized in prices) {
    return prices[normalized];
  }
  if (!normalized.includes('/') && `${normalized}/USD` in prices) {
    return prices[`${normalized}/USD`];
  }
  if (normalized.includes('/')) {
    const [base] = normalized.split('/');
    if (base && base in prices) {
      return prices[base];
    }
  }
  return null;
};

const buildSnapshotFromPrices = (positionsList, prices, asOf) => {
  const enriched = positionsList.map((position) => {
    const lastPrice = resolvePrice(position.symbol, prices);
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
    lastRefreshAt: asOf || null,
    totalCostBasis: totals.totalCostBasis,
    totalMarketValue: totals.totalMarketValue,
    totalUnrealizedPnL: totals.totalUnrealizedPnL,
    totalUnrealizedPnLPct,
    positions: enriched,
  };
};

const setStatus = (message, isError = false) => {
  statusMessage.textContent = message;
  statusMessage.classList.toggle('error', isError);
};

const getToken = () => localStorage.getItem(TOKEN_KEY);
const setToken = (token) => localStorage.setItem(TOKEN_KEY, token);

const showTokenModal = () => {
  tokenModal.classList.remove('hidden');
  tokenInput.focus();
};

const hideTokenModal = () => {
  tokenModal.classList.add('hidden');
};

const fetchWithToken = async (url, options = {}) => {
  const token = getToken();
  if (!token) {
    setStatus('Admin token required. Please enter it to continue.', true);
    showTokenModal();
    throw new Error('Missing admin token.');
  }
  const headers = {
    ...(options.headers || {}),
    Authorization: `Bearer ${token}`,
  };
  const response = await fetch(url, {
    ...options,
    headers,
  });
  let payload = null;
  try {
    payload = await response.json();
  } catch (jsonError) {
    payload = null;
  }
  if (!response.ok) {
    const message = payload?.error || `Request failed with status ${response.status}.`;
    throw new Error(message);
  }
  return payload;
};

const renderSummary = () => {
  if (!snapshot) {
    totalMarketValue.textContent = '--';
    totalCostBasis.textContent = '--';
    totalUnrealizedPnL.textContent = '--';
    totalUnrealizedPnLPct.textContent = '--';
    lastRefreshAt.textContent = '--';
    return;
  }
  totalMarketValue.textContent = formatCurrency(snapshot.totalMarketValue);
  totalCostBasis.textContent = formatCurrency(snapshot.totalCostBasis);
  totalUnrealizedPnL.textContent = formatCurrency(snapshot.totalUnrealizedPnL);
  totalUnrealizedPnLPct.textContent = formatPercent(snapshot.totalUnrealizedPnLPct);
  lastRefreshAt.textContent = snapshot.lastRefreshAt
    ? new Date(snapshot.lastRefreshAt).toLocaleString()
    : '--';
};

const renderPositions = () => {
  positions = normalizePositionsArray(positions);
  positionsBody.innerHTML = '';
  if (!positions.length) {
    positionsBody.innerHTML = '<tr><td class="empty" colspan="9">No positions yet.</td></tr>';
    return;
  }
  positions.forEach((position, index) => {
    const row = document.createElement('tr');
    const computed = snapshot?.positions?.find((item) => item.symbol === position.symbol);
    row.innerHTML = `
      <td>${position.symbol}</td>
      <td><input type="number" step="0.0001" value="${position.shares}" data-field="shares" data-index="${index}" /></td>
      <td><input type="number" step="0.01" value="${position.avgCost ?? ''}" data-field="avgCost" data-index="${index}" /></td>
      <td>${formatCurrency(computed?.costBasis ?? position.costBasis)}</td>
      <td>${formatCurrency(computed?.lastPrice)}</td>
      <td>${formatCurrency(computed?.marketValue)}</td>
      <td>${formatCurrency(computed?.unrealizedPnL)}</td>
      <td>${formatPercent(computed?.unrealizedPnLPct)}</td>
      <td><button class="action-btn" data-action="delete" data-index="${index}">Delete</button></td>
    `;
    positionsBody.appendChild(row);
  });
};

const updatePositionField = (index, field, value) => {
  const updated = { ...positions[index] };
  updated[field] = value === '' ? null : Number(value);
  positions[index] = updated;
  renderPositions();
};

positionsBody.addEventListener('input', (event) => {
  const target = event.target;
  if (!(target instanceof HTMLInputElement)) return;
  const index = Number(target.dataset.index);
  const field = target.dataset.field;
  if (!Number.isNaN(index) && field) {
    updatePositionField(index, field, target.value);
  }
});

positionsBody.addEventListener('click', (event) => {
  const target = event.target;
  if (!(target instanceof HTMLButtonElement)) return;
  if (target.dataset.action === 'delete') {
    const index = Number(target.dataset.index);
    positions.splice(index, 1);
    renderPositions();
  }
});

const loadInitialData = async () => {
  setStatus('Loading portfolio...');
  try {
    const [positionsResponse, snapshotResponse] = await Promise.all([
      fetchWithToken('/.netlify/functions/get-positions'),
      fetchWithToken('/.netlify/functions/get-snapshot'),
    ]);
    positions = normalizePositionsArray(positionsResponse?.positions);
    snapshot = snapshotResponse;
    renderPositions();
    renderSummary();
    setStatus('Portfolio loaded.');
  } catch (error) {
    console.error('Failed to load portfolio data.', error);
    setStatus('Unable to load portfolio data. Please try again.', true);
  }
};

const savePositions = async () => {
  setStatus('Saving positions...');
  try {
    const saved = await fetchWithToken('/.netlify/functions/save-positions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(positions),
    });
    positions = normalizePositionsArray(saved?.positions);
    snapshot = saved.snapshot;
    renderPositions();
    renderSummary();
    setStatus('Positions saved.');
  } catch (error) {
    console.error('Failed to save positions.', error);
    setStatus('Unable to save portfolio data. Please try again.', true);
  }
};

const refreshPrices = async () => {
  setStatus('Refreshing prices...');
  refreshButton.disabled = true;
  try {
    const refreshed = await fetchWithToken('/.netlify/functions/refresh-prices', {
      method: 'POST',
    });
    positions = normalizePositionsArray(positions);
    snapshot = buildSnapshotFromPrices(positions, refreshed.prices || {}, refreshed.asOf);
    renderSummary();
    renderPositions();
    setStatus('Prices refreshed.');
  } catch (error) {
    console.error('Failed to refresh prices.', error);
    setStatus('Unable to refresh prices. Please try again.', true);
  } finally {
    refreshButton.disabled = false;
  }
};

const downloadCsv = () => {
  if (!positions.length) {
    setStatus('No positions available to export.', true);
    return;
  }
  const header = 'SYMBOL,SHARES,AVGCOST';
  const rows = positions.map((position) => {
    const avgCost = position.avgCost ?? '';
    return `${position.symbol},${position.shares},${avgCost}`;
  });
  const csvContent = [header, ...rows].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'portfolio-positions.csv';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

addPositionForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const symbol = symbolInput.value.trim().toUpperCase();
  const shares = Number(sharesInput.value);
  const avgCost = avgCostInput.value ? Number(avgCostInput.value) : null;

  if (!symbol || Number.isNaN(shares) || shares <= 0) {
    setStatus('Please provide a valid symbol and shares value.', true);
    return;
  }

  positions = normalizePositionsArray(positions);
  positions.push({
    symbol,
    shares,
    avgCost,
  });

  symbolInput.value = '';
  sharesInput.value = '';
  avgCostInput.value = '';
  renderPositions();
});

savePortfolioButton.addEventListener('click', savePositions);
downloadCsvButton.addEventListener('click', downloadCsv);
refreshButton.addEventListener('click', refreshPrices);

saveTokenButton.addEventListener('click', () => {
  const token = tokenInput.value.trim();
  if (!token) {
    setStatus('Token is required.', true);
    return;
  }
  setToken(token);
  hideTokenModal();
  loadInitialData();
});

if (!getToken()) {
  showTokenModal();
} else {
  loadInitialData();
}
