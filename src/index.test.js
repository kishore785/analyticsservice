const request = require('supertest');

jest.mock('./db', () => ({
  query: jest.fn(),
}));

const { query } = require('./db');
const app = require('./index');

describe('Analytics API', () => {
  beforeEach(() => {
    query.mockClear();
  });

  test('GET /analytics/user returns 400 when userId is missing', async () => {
    const response = await request(app).get('/analytics/user?startDate=2026-04-01&endDate=2026-04-10');
    expect(response.status).toBe(400);
    expect(response.body.error).toMatch(/Missing required query parameter: userId/);
  });

  test('GET /analytics/user returns 400 for invalid dates', async () => {
    const response = await request(app).get('/analytics/user?userId=123&startDate=bad&endDate=2026-04-10');
    expect(response.status).toBe(400);
    expect(response.body.error).toMatch(/must be valid ISO dates/);
  });

  test('GET /analytics/user returns analytics data with mocked Redshift query', async () => {
    query.mockResolvedValue({ rows: [{ user_id: '123', event_count: '5', first_event_time: '2026-04-01', last_event_time: '2026-04-10', unique_event_types: '3' }] });

    const response = await request(app).get('/analytics/user?userId=123&startDate=2026-04-01&endDate=2026-04-10');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ data: [{ user_id: '123', event_count: '5', first_event_time: '2026-04-01', last_event_time: '2026-04-10', unique_event_types: '3' }] });
    expect(query).toHaveBeenCalledWith(expect.any(String), ['123', '2026-04-01', '2026-04-10']);
  });

  test('GET /analytics/device returns 400 when deviceId is missing', async () => {
    const response = await request(app).get('/analytics/device?startDate=2026-04-01&endDate=2026-04-10');
    expect(response.status).toBe(400);
    expect(response.body.error).toMatch(/Missing required query parameter: deviceId/);
  });

  test('GET /analytics/device returns analytics data with mocked Redshift query', async () => {
    query.mockResolvedValue({ rows: [{ device_id: 'abc-001', event_count: '7', first_event_time: '2026-04-01', last_event_time: '2026-04-10', unique_event_types: '4' }] });

    const response = await request(app).get('/analytics/device?deviceId=abc-001&startDate=2026-04-01&endDate=2026-04-10');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ data: [{ device_id: 'abc-001', event_count: '7', first_event_time: '2026-04-01', last_event_time: '2026-04-10', unique_event_types: '4' }] });
    expect(query).toHaveBeenCalledWith(expect.any(String), ['abc-001', '2026-04-01', '2026-04-10']);
  });
});
