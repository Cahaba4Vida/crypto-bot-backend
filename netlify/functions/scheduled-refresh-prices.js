const { refreshPrices } = require('./refresh-prices');

exports.handler = async () => {
  try {
    const snapshot = await refreshPrices();
    return {
      statusCode: 200,
      body: JSON.stringify({ status: 'ok', generatedAt: snapshot.generatedAt }),
      headers: {
        'Content-Type': 'application/json',
      },
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ status: 'error', message: error.message }),
      headers: {
        'Content-Type': 'application/json',
      },
    };
  }
};
