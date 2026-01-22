const statusMessage = document.getElementById('statusMessage');
const refreshButton = document.getElementById('refreshButton');
const savePortfolioButton = document.getElementById('savePortfolioButton');
const downloadCsvButton = document.getElementById('downloadCsvButton');
const positionsBody = document.getElementById('positionsBody');
const addPositionForm = document.getElementById('addPositionForm');
const importImageInput = document.getElementById('importImageInput');
const pasteImageButton = document.getElementById('pasteImageButton');
const parseImageButton = document.getElementById('parseImageButton');
const importPreviewBody = document.getElementById('importPreviewBody');
const applyImportButton = document.getElementById('applyImportButton');
const importStatus = document.getElementById('importStatus');
const importTextInput = document.getElementById('importTextInput');
const parseTextButton = document.getElementById('parseTextButton');
const bondForm = document.getElementById('bondForm');
const bondTotalCostInput = document.getElementById('bondTotalCostInput');
const bondCouponRateInput = document.getElementById('bondCouponRateInput');
const bondStatus = document.getElementById('bondStatus');

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
const BOND_STORAGE_KEY = 'portfolioDashboardBondInfo';

let positions = [];
let snapshot = null;
let importImageData = null;
let importPreviewPositions = [];
const collapsedPositions = new Set();

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

const setImportStatus = (message, isError = false) => {
  importStatus.textContent = message;
  importStatus.classList.toggle('error', isError);
};

const setBondStatus = (message, isError = false) => {
  bondStatus.textContent = message;
  bondStatus.classList.toggle('error', isError);
};

const renderImportPreview = () => {
  importPreviewBody.innerHTML = '';
  if (!importPreviewPositions.length) {
    importPreviewBody.innerHTML = '<tr><td class="empty" colspan="3">No import preview yet.</td></tr>';
    applyImportButton.disabled = true;
    return;
  }
  importPreviewPositions.forEach((position, index) => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>
        <input type="text" value="${position.symbol ?? ''}" data-field="symbol" data-index="${index}" />
      </td>
      <td>
        <input type="number" step="0.0001" value="${position.shares ?? ''}" data-field="shares" data-index="${index}" />
      </td>
      <td>
        <input type="number" step="0.01" value="${position.avgCost ?? ''}" data-field="avgCost" data-index="${index}" />
      </td>
    `;
    importPreviewBody.appendChild(row);
  });
  applyImportButton.disabled = false;
};

const readBlobAsDataUrl = (blob) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('Unable to read image data.'));
    reader.readAsDataURL(blob);
  });

const setImportImage = (dataUrl, sourceLabel) => {
  importImageData = dataUrl;
  parseImageButton.disabled = false;
  setImportStatus(`Screenshot loaded${sourceLabel ? ` from ${sourceLabel}` : ''}.`);
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
    const baseMessage = payload?.error || `Request failed with status ${response.status}.`;
    const details = payload?.details ? ` ${payload.details}` : '';
    throw new Error(`${baseMessage}${details}`.trim());
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
    const computed = snapshot?.positions?.find((item) => item.symbol === position.symbol);
    const isCollapsed = collapsedPositions.has(position.symbol);
    const summaryRow = document.createElement('tr');
    summaryRow.classList.add('position-summary');
    summaryRow.innerHTML = `
      <td>${position.symbol}</td>
      <td>${formatNumber(position.shares)}</td>
      <td>${formatCurrency(position.avgCost)}</td>
      <td>${formatCurrency(computed?.costBasis ?? position.costBasis)}</td>
      <td>${formatCurrency(computed?.lastPrice)}</td>
      <td>${formatCurrency(computed?.marketValue)}</td>
      <td>${formatCurrency(computed?.unrealizedPnL)}</td>
      <td>${formatPercent(computed?.unrealizedPnLPct)}</td>
      <td>
        <button class="action-btn toggle-btn" data-action="toggle" data-symbol="${position.symbol}" data-index="${index}" aria-expanded="${!isCollapsed}">
          ${isCollapsed ? 'Expand' : 'Collapse'}
        </button>
      </td>
    `;
    const detailRow = document.createElement('tr');
    detailRow.classList.add('position-details');
    detailRow.hidden = isCollapsed;
    detailRow.innerHTML = `
      <td colspan="9">
        <div class="position-details-grid">
          <label>
            Shares
            <input type="number" step="0.0001" value="${position.shares}" data-field="shares" data-index="${index}" />
          </label>
          <label>
            Avg Cost
            <input type="number" step="0.01" value="${position.avgCost ?? ''}" data-field="avgCost" data-index="${index}" />
          </label>
          <button class="action-btn danger" data-action="delete" data-index="${index}">Delete Position</button>
        </div>
      </td>
    `;
    positionsBody.appendChild(summaryRow);
    positionsBody.appendChild(detailRow);
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
  if (target.dataset.action === 'toggle') {
    const symbol = target.dataset.symbol;
    if (symbol) {
      if (collapsedPositions.has(symbol)) {
        collapsedPositions.delete(symbol);
      } else {
        collapsedPositions.add(symbol);
      }
      renderPositions();
    }
  }
  if (target.dataset.action === 'delete') {
    const index = Number(target.dataset.index);
    const symbol = positions[index]?.symbol;
    if (symbol) {
      collapsedPositions.delete(symbol);
    }
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

const openChatGptPrompt = () => {
  if (!positions.length) {
    setStatus('No positions available to share.', true);
    return;
  }
  const header = 'SYMBOL,SHARES,AVGCOST';
  const rows = positions.map((position) => {
    const avgCost = position.avgCost ?? '';
    return `${position.symbol},${position.shares},${avgCost}`;
  });
  const csvContent = [header, ...rows].join('\n');
  const prompt = `Here are my portfolio positions in CSV format. Please import and analyze them:\n\n${csvContent}`;
  const chatGptUrl = `https://chat.openai.com/?model=gpt-4o&prompt=${encodeURIComponent(prompt)}`;
  window.open(chatGptUrl, '_blank', 'noopener');
};

const parseImportImage = async () => {
  if (!importImageData) {
    setImportStatus('Add a screenshot file or paste an image first.', true);
    return;
  }
  setImportStatus('Parsing screenshot...');
  parseImageButton.disabled = true;
  try {
    const parsed = await fetchWithToken('/.netlify/functions/parse-positions-from-image', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imageBase64: importImageData }),
    });
    importPreviewPositions = Array.isArray(parsed?.positions) ? parsed.positions : [];
    renderImportPreview();
    if (importPreviewPositions.length) {
      setImportStatus(`Parsed ${importPreviewPositions.length} position(s). Review and apply.`);
    } else {
      setImportStatus('No valid positions detected. Try a clearer screenshot.', true);
    }
  } catch (error) {
    console.error('Failed to parse screenshot.', error);
    const message = error instanceof Error && error.message
      ? error.message
      : 'Unable to parse screenshot. Please try again.';
    setImportStatus(message, true);
  } finally {
    parseImageButton.disabled = false;
  }
};

const parseImportText = async () => {
  const text = importTextInput.value.trim();
  if (!text) {
    setImportStatus('Paste text to import first.', true);
    return;
  }
  setImportStatus('Parsing text import...');
  parseTextButton.disabled = true;
  try {
    const parsed = await fetchWithToken('/.netlify/functions/parse-positions-from-text', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    });
    importPreviewPositions = Array.isArray(parsed?.positions) ? parsed.positions : [];
    renderImportPreview();
    if (importPreviewPositions.length) {
      setImportStatus(`Parsed ${importPreviewPositions.length} position(s). Review and apply.`);
    } else {
      setImportStatus('No valid positions detected from the text.', true);
    }
  } catch (error) {
    console.error('Failed to parse text import.', error);
    const message = error instanceof Error && error.message
      ? error.message
      : 'Unable to parse text import. Please try again.';
    setImportStatus(message, true);
  } finally {
    parseTextButton.disabled = false;
  }
};

const applyImport = () => {
  if (!importPreviewPositions.length) {
    setImportStatus('No imported positions to apply.', true);
    return;
  }
  positions = normalizePositionsArray(positions);
  importPreviewPositions.forEach((incoming) => {
    positions.push({ ...incoming });
  });
  renderPositions();
  importPreviewPositions = [];
  importImageData = null;
  importImageInput.value = '';
  importTextInput.value = '';
  parseImageButton.disabled = true;
  renderImportPreview();
  setImportStatus('Import applied to the positions list. Remember to save.', false);
};

const updateImportPreviewField = (index, field, value) => {
  const updated = { ...importPreviewPositions[index] };
  if (field === 'symbol') {
    updated.symbol = value.trim().toUpperCase();
  } else {
    updated[field] = value === '' ? null : Number(value);
  }
  importPreviewPositions[index] = updated;
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

importPreviewBody.addEventListener('input', (event) => {
  const target = event.target;
  if (!(target instanceof HTMLInputElement)) return;
  const index = Number(target.dataset.index);
  const field = target.dataset.field;
  if (!Number.isNaN(index) && field) {
    updateImportPreviewField(index, field, target.value);
    if (field === 'symbol') {
      target.value = importPreviewPositions[index].symbol || '';
    }
  }
});

importImageInput.addEventListener('change', async (event) => {
  const file = event.target.files?.[0];
  if (!file) {
    return;
  }
  try {
    const dataUrl = await readBlobAsDataUrl(file);
    setImportImage(dataUrl, 'file upload');
  } catch (error) {
    console.error('Failed to read image file.', error);
    setImportStatus('Unable to read the image file.', true);
  }
});

pasteImageButton.addEventListener('click', async () => {
  if (!navigator.clipboard?.read) {
    setImportStatus('Clipboard image access is not supported in this browser.', true);
    return;
  }
  try {
    const items = await navigator.clipboard.read();
    for (const item of items) {
      const imageType = item.types.find((type) => type.startsWith('image/'));
      if (imageType) {
        const blob = await item.getType(imageType);
        const dataUrl = await readBlobAsDataUrl(blob);
        setImportImage(dataUrl, 'clipboard');
        return;
      }
    }
    setImportStatus('No image found in clipboard.', true);
  } catch (error) {
    console.error('Failed to read clipboard image.', error);
    setImportStatus('Unable to read clipboard image.', true);
  }
});

document.addEventListener('paste', async (event) => {
  const items = event.clipboardData?.items || [];
  for (const item of items) {
    if (item.type.startsWith('image/')) {
      const file = item.getAsFile();
      if (file) {
        try {
          const dataUrl = await readBlobAsDataUrl(file);
          setImportImage(dataUrl, 'paste');
        } catch (error) {
          console.error('Failed to read pasted image.', error);
          setImportStatus('Unable to read pasted image.', true);
        }
        break;
      }
    }
  }
});

parseImageButton.addEventListener('click', parseImportImage);
parseTextButton.addEventListener('click', parseImportText);
applyImportButton.addEventListener('click', applyImport);
savePortfolioButton.addEventListener('click', savePositions);
downloadCsvButton.addEventListener('click', openChatGptPrompt);
refreshButton.addEventListener('click', refreshPrices);

bondForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const totalCost = Number(bondTotalCostInput.value);
  const couponRate = Number(bondCouponRateInput.value);
  if (Number.isNaN(totalCost) || totalCost <= 0) {
    setBondStatus('Enter a valid total cost for the bond.', true);
    return;
  }
  if (Number.isNaN(couponRate) || couponRate < 0) {
    setBondStatus('Enter a valid coupon rate (0 or greater).', true);
    return;
  }
  const payload = {
    totalCost,
    couponRate,
    updatedAt: new Date().toISOString(),
  };
  localStorage.setItem(BOND_STORAGE_KEY, JSON.stringify(payload));
  setBondStatus('Bond details saved locally.', false);
});

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

const loadBondInfo = () => {
  const stored = localStorage.getItem(BOND_STORAGE_KEY);
  if (!stored) {
    return;
  }
  try {
    const parsed = JSON.parse(stored);
    if (typeof parsed?.totalCost === 'number') {
      bondTotalCostInput.value = parsed.totalCost;
    }
    if (typeof parsed?.couponRate === 'number') {
      bondCouponRateInput.value = parsed.couponRate;
    }
    setBondStatus('Loaded saved bond details.', false);
  } catch (error) {
    console.error('Failed to load bond info.', error);
    setBondStatus('Unable to load saved bond details.', true);
  }
};

if (!getToken()) {
  showTokenModal();
} else {
  loadInitialData();
}

renderImportPreview();
loadBondInfo();
