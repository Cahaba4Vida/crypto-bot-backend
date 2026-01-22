const { requireAdmin } = require('./_lib/auth');

const OPENAI_URL = 'https://api.openai.com/v1/responses';

const buildResponse = (statusCode, body) => ({
  statusCode,
  body: JSON.stringify(body),
  headers: {
    'Content-Type': 'application/json',
  },
});

const extractImagePayload = (value) => {
  if (!value || typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  if (trimmed.startsWith('data:')) {
    const match = trimmed.match(/^data:(image\/[a-zA-Z0-9+.-]+);base64,(.*)$/);
    if (!match) {
      return null;
    }
    return { base64: match[2], mimeType: match[1] };
  }
  return { base64: trimmed, mimeType: 'image/png' };
};

const sanitizeSymbol = (value) => {
  if (typeof value !== 'string') {
    return '';
  }
  return value.toUpperCase().replace(/[^A-Z0-9.-]/g, '');
};

const extractJsonPayload = (value) => {
  if (!value || typeof value !== 'string') {
    return null;
  }
  const fencedMatch = value.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fencedMatch) {
    return fencedMatch[1].trim();
  }
  const trimmed = value.trim();
  const firstBrace = trimmed.indexOf('{');
  const lastBrace = trimmed.lastIndexOf('}');
  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
    return null;
  }
  return trimmed.slice(firstBrace, lastBrace + 1);
};

const normalizePositions = (positions) => {
  if (!Array.isArray(positions)) {
    return [];
  }
  return positions.reduce((acc, position) => {
    if (!position || typeof position !== 'object') {
      return acc;
    }
    const symbol = sanitizeSymbol(position.symbol);
    const shares = Number(position.shares);
    const avgCost = Number(position.avgCost);
    if (!symbol || !Number.isFinite(shares) || shares <= 0) {
      return acc;
    }
    if (!Number.isFinite(avgCost) || avgCost <= 0) {
      return acc;
    }
    acc.push({ symbol, shares, avgCost });
    return acc;
  }, []);
};

const extractOpenAiPayload = (responseJson) => {
  if (responseJson && typeof responseJson.output_text === 'string' && responseJson.output_text.trim()) {
    return { type: 'text', value: responseJson.output_text };
  }

  if (!Array.isArray(responseJson?.output)) {
    return null;
  }

  const textParts = [];
  for (const output of responseJson.output) {
    if (!output || !Array.isArray(output.content)) {
      continue;
    }
    for (const content of output.content) {
      if (!content || typeof content !== 'object') {
        continue;
      }
      if (content.type === 'output_json' && content.json) {
        return { type: 'json', value: content.json };
      }
      if (content.type === 'output_text' && typeof content.text === 'string') {
        textParts.push(content.text);
      }
    }
  }

  if (textParts.length > 0) {
    return { type: 'text', value: textParts.join('\n') };
  }

  return null;
};

exports.handler = async (event) => {
  const auth = requireAdmin(event);
  if (!auth.ok) {
    return buildResponse(auth.statusCode, auth.body);
  }

  if (!process.env.OPENAI_API_KEY) {
    return buildResponse(500, { error: 'OPENAI_API_KEY is not configured.' });
  }

  let payload = null;
  try {
    payload = JSON.parse(event.body || 'null');
  } catch (parseError) {
    return buildResponse(400, { error: 'Invalid JSON payload.' });
  }

  const imagePayload = extractImagePayload(payload?.imageBase64);
  if (!imagePayload) {
    return buildResponse(400, { error: 'imageBase64 is required and must be base64-encoded.' });
  }

  const prompt = [
    'Extract positions from the screenshot.',
    'Return JSON only with schema: {"positions":[{"symbol":"STRING","shares":NUMBER,"avgCost":NUMBER}]}',
    'Symbol must be uppercase ticker, allow dot/dash tickers like BRK.B.',
    'shares can be fractional.',
    'avgCost is average cost per share (not cost basis).',
    'If any data is missing, omit the position instead of guessing.',
  ].join(' ');

  const requestBody = {
    model: 'gpt-4.1-mini',
    temperature: 0,
    text: {
      format: {
        type: 'json_schema',
        name: 'positions_schema',
        schema: {
          type: 'object',
          properties: {
            positions: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  symbol: { type: 'string' },
                  shares: { type: 'number' },
                  avgCost: { type: 'number' },
                },
                required: ['symbol', 'shares', 'avgCost'],
                additionalProperties: false,
              },
            },
          },
          required: ['positions'],
          additionalProperties: false,
        },
      },
    },
    input: [
      {
        role: 'system',
        content: 'You are a data extraction assistant. Return JSON only with the required schema.',
      },
      {
        role: 'user',
        content: [
          { type: 'input_text', text: prompt },
          {
            type: 'input_image',
            image_url: `data:${imagePayload.mimeType};base64,${imagePayload.base64}`,
          },
        ],
      },
    ],
  };

  let response = null;
  try {
    response = await fetch(OPENAI_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });
  } catch (error) {
    console.error('Failed to reach OpenAI API.', error);
    return buildResponse(502, { error: 'Failed to reach OpenAI API.' });
  }

  let responseJson = null;
  try {
    responseJson = await response.json();
  } catch (error) {
    return buildResponse(502, { error: 'Invalid response from OpenAI API.' });
  }

  if (!response.ok) {
    return buildResponse(502, {
      error: 'OpenAI API returned an error.',
      status: response.status,
      details: responseJson?.error?.message || 'Unknown error.',
    });
  }

  const openAiPayload = extractOpenAiPayload(responseJson);
  if (!openAiPayload) {
    return buildResponse(502, { error: 'OpenAI response missing output payload.' });
  }

  let parsed = null;
  if (openAiPayload.type === 'json') {
    parsed = openAiPayload.value;
  } else {
    const outputText = openAiPayload.value;
    try {
      parsed = JSON.parse(outputText);
    } catch (error) {
      const extractedJson = extractJsonPayload(outputText);
      if (extractedJson) {
        try {
          parsed = JSON.parse(extractedJson);
        } catch (innerError) {
          const excerpt = outputText.slice(0, 200);
          return buildResponse(502, { error: 'Invalid JSON from OpenAI.', excerpt });
        }
      } else {
        const excerpt = outputText.slice(0, 200);
        return buildResponse(502, { error: 'Invalid JSON from OpenAI.', excerpt });
      }
    }
  }

  const normalizedPositions = normalizePositions(parsed?.positions);
  return buildResponse(200, { positions: normalizedPositions });
};
