import { registry, wsConnectionGauge, wsConnectionCounter, wsMessageCounter, wsLatencyHistogram, wsErrorCounter, rateLimitCounter, authCounter, clearSystemMetricsInterval } from '../../monitoring/metrics.ts';

describe('metrics module', () => {
  beforeEach(() => {
    registry.resetMetrics();
    clearSystemMetricsInterval();
  });

  afterAll(() => {
    clearSystemMetricsInterval();
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

  it('should increment and decrement WebSocket connection metrics', async () => {
    wsConnectionGauge.inc({ status: 'open' });
    wsConnectionGauge.dec({ status: 'open' });
    wsConnectionCounter.inc({ status: 'open' });
    const gauge = await wsConnectionGauge.get();
    const counter = await wsConnectionCounter.get();
    expect(gauge.values[0].value).toBe(0); // inc then dec
    expect(counter.values[0].value).toBeGreaterThanOrEqual(1);
  });

  it('should increment WebSocket connection metrics for all statuses', async () => {
    wsConnectionGauge.inc({ status: 'open' });
    wsConnectionGauge.inc({ status: 'closed' });
    wsConnectionCounter.inc({ status: 'open' });
    wsConnectionCounter.inc({ status: 'closed' });
    const gauge = await wsConnectionGauge.get();
    const counter = await wsConnectionCounter.get();
    const openGauge = gauge.values.find(v => v.labels.status === 'open');
    const closedGauge = gauge.values.find(v => v.labels.status === 'closed');
    const openCounter = counter.values.find(v => v.labels.status === 'open');
    const closedCounter = counter.values.find(v => v.labels.status === 'closed');
    expect(openGauge?.value).toBeGreaterThanOrEqual(1);
    expect(closedGauge?.value).toBeGreaterThanOrEqual(1);
    expect(openCounter?.value).toBeGreaterThanOrEqual(1);
    expect(closedCounter?.value).toBeGreaterThanOrEqual(1);
  });

  it('should increment message and error counters', async () => {
    wsMessageCounter.inc({ type: 'text', status: 'success' });
    wsErrorCounter.inc({ type: 'fatal' });
    const msg = await wsMessageCounter.get();
    const err = await wsErrorCounter.get();
    expect(msg.values[0].value).toBeGreaterThanOrEqual(1);
    expect(err.values[0].value).toBeGreaterThanOrEqual(1);
  });

  it('should increment message and error counters with different labels', async () => {
    wsMessageCounter.inc({ type: 'text', status: 'success' });
    wsMessageCounter.inc({ type: 'binary', status: 'error' });
    wsErrorCounter.inc({ type: 'fatal' });
    wsErrorCounter.inc({ type: 'validation' });
    const msg = await wsMessageCounter.get();
    const err = await wsErrorCounter.get();
    const textMsg = msg.values.find(v => v.labels.type === 'text');
    const binaryMsg = msg.values.find(v => v.labels.type === 'binary');
    const fatalErr = err.values.find(v => v.labels.type === 'fatal');
    const validationErr = err.values.find(v => v.labels.type === 'validation');
    expect(textMsg?.value).toBeGreaterThanOrEqual(1);
    expect(binaryMsg?.value).toBeGreaterThanOrEqual(1);
    expect(fatalErr?.value).toBeGreaterThanOrEqual(1);
    expect(validationErr?.value).toBeGreaterThanOrEqual(1);
  });

  it('should increment message and error counters for all label combinations', async () => {
    wsMessageCounter.inc({ type: 'text', status: 'success' });
    wsMessageCounter.inc({ type: 'binary', status: 'error' });
    wsErrorCounter.inc({ type: 'fatal' });
    wsErrorCounter.inc({ type: 'recoverable' });
    const msg = await wsMessageCounter.get();
    const err = await wsErrorCounter.get();
    const textSuccess = msg.values.find(v => v.labels.type === 'text' && v.labels.status === 'success');
    const binaryError = msg.values.find(v => v.labels.type === 'binary' && v.labels.status === 'error');
    const fatal = err.values.find(v => v.labels.type === 'fatal');
    const recoverable = err.values.find(v => v.labels.type === 'recoverable');
    expect(textSuccess?.value).toBeGreaterThanOrEqual(1);
    expect(binaryError?.value).toBeGreaterThanOrEqual(1);
    expect(fatal?.value).toBeGreaterThanOrEqual(1);
    expect(recoverable?.value).toBeGreaterThanOrEqual(1);
  });

  it('should observe latency histogram', async () => {
    wsLatencyHistogram.observe(0.01);
    const hist = await wsLatencyHistogram.get();
    // Find the value with the 'sum' metric
    const sumValue = hist.values.find(v => v.metricName === 'websocket_message_latency_seconds_sum');
    expect(sumValue && sumValue.value).toBeGreaterThan(0);
  });

  it('should observe multiple latency histogram values and check buckets', async () => {
    wsLatencyHistogram.observe(0.001);
    wsLatencyHistogram.observe(0.02);
    wsLatencyHistogram.observe(0.2);
    const hist = await wsLatencyHistogram.get();
    const sumValue = hist.values.find(v => v.metricName === 'websocket_message_latency_seconds_sum');
    const countValue = hist.values.find(v => v.metricName === 'websocket_message_latency_seconds_count');
    expect(sumValue && sumValue.value).toBeGreaterThan(0);
    expect(countValue && countValue.value).toBe(3);
    // Check at least one bucket has a count
    const bucket = hist.values.find(v => v.metricName === 'websocket_message_latency_seconds_bucket' && (v.labels.le === 0.05 || v.labels.le === '0.05'));
    expect(bucket && bucket.value).toBeGreaterThan(0);
  });

  it('should observe latency histogram for multiple buckets', async () => {
    wsLatencyHistogram.observe(0.001); // should go in first bucket
    wsLatencyHistogram.observe(0.1);   // should go in a higher bucket
    wsLatencyHistogram.observe(1.5);   // should go in the highest bucket
    const hist = await wsLatencyHistogram.get();
    // TEMP: Log histogram values for debugging
    // eslint-disable-next-line no-console
    console.log('HISTOGRAM VALUES:', JSON.stringify(hist.values, null, 2));
    // Check that at least 3 buckets have nonzero counts
    const nonZeroBuckets = hist.values.filter(v => v.metricName?.endsWith('_bucket') && v.value > 0);
    expect(nonZeroBuckets.length).toBeGreaterThanOrEqual(3);
    // Check sum and count
    const sumValue = hist.values.find(v => v.metricName?.endsWith('_sum'));
    const countValue = hist.values.find(v => v.metricName?.endsWith('_count'));
    expect(sumValue && sumValue.value).toBeGreaterThan(0);
    expect(countValue && countValue.value).toBeGreaterThanOrEqual(3);
  });

  it('should increment rate limit and auth counters', async () => {
    rateLimitCounter.inc({ ip: '127.0.0.1', endpoint: '/ws' });
    authCounter.inc({ status: 'success' });
    const rl = await rateLimitCounter.get();
    const auth = await authCounter.get();
    expect(rl.values[0].value).toBeGreaterThanOrEqual(1);
    expect(auth.values[0].value).toBeGreaterThanOrEqual(1);
  });

  it('should increment rate limit and auth counters with different labels', async () => {
    rateLimitCounter.inc({ ip: '127.0.0.1', endpoint: '/ws' });
    rateLimitCounter.inc({ ip: '10.0.0.1', endpoint: '/api' });
    authCounter.inc({ status: 'success' });
    authCounter.inc({ status: 'fail' });
    const rl = await rateLimitCounter.get();
    const auth = await authCounter.get();
    const wsLimit = rl.values.find(v => v.labels.endpoint === '/ws');
    const apiLimit = rl.values.find(v => v.labels.endpoint === '/api');
    const successAuth = auth.values.find(v => v.labels.status === 'success');
    const failAuth = auth.values.find(v => v.labels.status === 'fail');
    expect(wsLimit?.value).toBeGreaterThanOrEqual(1);
    expect(apiLimit?.value).toBeGreaterThanOrEqual(1);
    expect(successAuth?.value).toBeGreaterThanOrEqual(1);
    expect(failAuth?.value).toBeGreaterThanOrEqual(1);
  });

  it('should increment rate limit and auth counters for all label combinations', async () => {
    rateLimitCounter.inc({ ip: '127.0.0.1', endpoint: '/ws' });
    rateLimitCounter.inc({ ip: '10.0.0.1', endpoint: '/api' });
    authCounter.inc({ status: 'success' });
    authCounter.inc({ status: 'failure' });
    const rl = await rateLimitCounter.get();
    const auth = await authCounter.get();
    const wsLimit = rl.values.find(v => v.labels.ip === '127.0.0.1' && v.labels.endpoint === '/ws');
    const apiLimit = rl.values.find(v => v.labels.ip === '10.0.0.1' && v.labels.endpoint === '/api');
    const success = auth.values.find(v => v.labels.status === 'success');
    const failure = auth.values.find(v => v.labels.status === 'failure');
    expect(wsLimit?.value).toBeGreaterThanOrEqual(1);
    expect(apiLimit?.value).toBeGreaterThanOrEqual(1);
    expect(success?.value).toBeGreaterThanOrEqual(1);
    expect(failure?.value).toBeGreaterThanOrEqual(1);
  });
});
