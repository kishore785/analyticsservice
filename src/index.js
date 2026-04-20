const express = require('express');
const { query } = require('./db');

const app = express();
const port = process.env.PORT || 3000;

function parseDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString().slice(0, 10);
}

function validateDateRange(startDate, endDate) {
  const start = parseDate(startDate);
  const end = parseDate(endDate);
  if (!start || !end) {
    return { valid: false, message: 'startDate and endDate must be valid ISO dates (YYYY-MM-DD).' };
  }
  if (start > end) {
    return { valid: false, message: 'startDate must be before or equal to endDate.' };
  }
  return { valid: true, start, end };
}

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.get('/analytics/user', async (req, res) => {
  const { userId, startDate, endDate } = req.query;

  if (!userId) {
    return res.status(400).json({ error: 'Missing required query parameter: userId' });
  }

  const range = validateDateRange(startDate, endDate);
  if (!range.valid) {
    return res.status(400).json({ error: range.message });
  }

  const sql = `
    SELECT
      user_id,
      COUNT(*) AS event_count,
      MIN(event_time) AS first_event_time,
      MAX(event_time) AS last_event_time,
      COUNT(DISTINCT event_type) AS unique_event_types
    FROM analytics_events
    WHERE user_id = $1
      AND event_time >= $2
      AND event_time <= $3
    GROUP BY user_id
  `;

  try {
    const result = await query(sql, [userId, range.start, range.end]);
    return res.json({ data: result.rows });
  } catch (error) {
    console.error('Redshift query error:', error);
    return res.status(500).json({ error: 'Unable to fetch user analytics data.' });
  }
});

app.get('/analytics/device', async (req, res) => {
  const { deviceId, startDate, endDate } = req.query;

  if (!deviceId) {
    return res.status(400).json({ error: 'Missing required query parameter: deviceId' });
  }

  const range = validateDateRange(startDate, endDate);
  if (!range.valid) {
    return res.status(400).json({ error: range.message });
  }

  const sql = `
    SELECT
      device_id,
      COUNT(*) AS event_count,
      MIN(event_time) AS first_event_time,
      MAX(event_time) AS last_event_time,
      COUNT(DISTINCT event_type) AS unique_event_types
    FROM analytics_events
    WHERE device_id = $1
      AND event_time >= $2
      AND event_time <= $3
    GROUP BY device_id
  `;

  try {
    const result = await query(sql, [deviceId, range.start, range.end]);
    return res.json({ data: result.rows });
  } catch (error) {
    console.error('Redshift query error:', error);
    return res.status(500).json({ error: 'Unable to fetch device analytics data.' });
  }
});

app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

if (require.main === module) {
  app.listen(port, () => {
    console.log(`Analytics service listening on port ${port}`);
  });
}

module.exports = app;
