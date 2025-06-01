import { registry, wsConnectionGauge, wsConnectionCounter, wsMessageCounter, wsLatencyHistogram, wsErrorCounter, rateLimitCounter, authCounter } from '../../monitoring/metrics.ts';

describe('metrics module', () => {
  beforeEach(() => {
    registry.resetMetrics();
  });

  it('should register all metrics in the registry', () => {
    const metrics = registry.getMetricsAsArray().map((m: { name: string }) => m.name);
    expect(metrics).toEqual(
      expect.arrayContaining([
        'websocket_connections_current',
        'websocket_connections_total',
        'websocket_messages_total',
        'websocket_message_latency_seconds',
        'websocket_errors_total',
        'rate_limit_total',
        'auth_attempts_total',
      ])
    );
  });

  it('should increment WebSocket connection metrics', async () => {
    wsConnectionGauge.inc({ status: 'open' });
    wsConnectionCounter.inc({ status: 'open' });
    const gauge = await wsConnectionGauge.get();
    const counter = await wsConnectionCounter.get();
    expect(gauge.values[0].value).toBeGreaterThanOrEqual(1);
    expect(counter.values[0].value).toBeGreaterThanOrEqual(1);
  });

  it('should increment message and error counters', async () => {
    wsMessageCounter.inc({ type: 'text', status: 'success' });
    wsErrorCounter.inc({ type: 'fatal' });
    const msg = await wsMessageCounter.get();
    const err = await wsErrorCounter.get();
    expect(msg.values[0].value).toBeGreaterThanOrEqual(1);
    expect(err.values[0].value).toBeGreaterThanOrEqual(1);
  });

  it('should observe latency histogram', async () => {
    wsLatencyHistogram.observe(0.01);
    const hist = await wsLatencyHistogram.get();
    // Find the value with the 'sum' metric
    const sumValue = hist.values.find(v => v.metricName === 'websocket_message_latency_seconds_sum');
    expect(sumValue && sumValue.value).toBeGreaterThan(0);
  });

  it('should increment rate limit and auth counters', async () => {
    rateLimitCounter.inc({ ip: '127.0.0.1', endpoint: '/ws' });
    authCounter.inc({ status: 'success' });
    const rl = await rateLimitCounter.get();
    const auth = await authCounter.get();
    expect(rl.values[0].value).toBeGreaterThanOrEqual(1);
    expect(auth.values[0].value).toBeGreaterThanOrEqual(1);
  });
});
