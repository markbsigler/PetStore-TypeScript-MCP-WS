import { Registry, collectDefaultMetrics, Counter, Gauge, Histogram } from 'prom-client';
import { WebSocket } from 'ws';
import { loadavg } from 'os';

export const registry = new Registry();

// Enable default Node.js metrics
collectDefaultMetrics({ register: registry });

// WebSocket connection metrics
export const wsConnectionGauge = new Gauge({
  name: 'websocket_connections_current',
  help: 'Number of current WebSocket connections',
  labelNames: ['status'],
  registers: [registry],
});

export const wsConnectionCounter = new Counter({
  name: 'websocket_connections_total',
  help: 'Total number of WebSocket connections',
  labelNames: ['status'],
  registers: [registry],
});

export const wsMessageCounter = new Counter({
  name: 'websocket_messages_total',
  help: 'Total number of WebSocket messages',
  labelNames: ['type', 'status'],
  registers: [registry],
});

export const wsLatencyHistogram = new Histogram({
  name: 'websocket_message_latency_seconds',
  help: 'Latency of WebSocket messages',
  buckets: [0.001, 0.005, 0.015, 0.05, 0.1, 0.5],
  registers: [registry],
});

export const wsErrorCounter = new Counter({
  name: 'websocket_errors_total',
  help: 'Total number of WebSocket errors',
  labelNames: ['type'],
  registers: [registry],
});

// Rate limiting metrics
export const rateLimitCounter = new Counter({
  name: 'rate_limit_total',
  help: 'Total number of rate limit hits',
  labelNames: ['ip', 'endpoint'],
  registers: [registry],
});

// Authentication metrics
export const authCounter = new Counter({
  name: 'auth_attempts_total',
  help: 'Total number of authentication attempts',
  labelNames: ['status'],
  registers: [registry],
});

// Circuit breaker metrics
export const circuitBreakerStateGauge = new Gauge({
  name: 'circuit_breaker_state',
  help: 'Current state of circuit breakers',
  labelNames: ['name', 'state'],
  registers: [registry],
});

// Load balancer metrics
export const loadBalancerNodesGauge = new Gauge({
  name: 'load_balancer_nodes',
  help: 'Number of nodes in load balancer',
  labelNames: ['status'],
  registers: [registry],
});

export const loadBalancerLatencyHistogram = new Histogram({
  name: 'load_balancer_latency_seconds',
  help: 'Latency of load balanced requests',
  buckets: [0.1, 0.5, 1, 2, 5],
  registers: [registry],
});

// Message queue metrics
export const queueSizeGauge = new Gauge({
  name: 'message_queue_size',
  help: 'Current size of message queues',
  labelNames: ['queue', 'priority'],
  registers: [registry],
});

export const queueProcessingHistogram = new Histogram({
  name: 'message_queue_processing_seconds',
  help: 'Message processing time',
  buckets: [0.1, 0.5, 1, 2, 5],
  registers: [registry],
});

// System metrics
export const systemLoadGauge = new Gauge({
  name: 'system_load_average',
  help: 'System load average',
  labelNames: ['interval'],
  registers: [registry],
});

export const memoryUsageGauge = new Gauge({
  name: 'memory_usage_bytes',
  help: 'Memory usage in bytes',
  labelNames: ['type'],
  registers: [registry],
});

// Helper functions for common metric operations
export function updateConnectionMetrics(clients: Set<WebSocket>): void {
  const connected = Array.from(clients).filter(
    client => client.readyState === WebSocket.OPEN
  ).length;
  const connecting = Array.from(clients).filter(
    client => client.readyState === WebSocket.CONNECTING
  ).length;
  const closing = Array.from(clients).filter(
    client => client.readyState === WebSocket.CLOSING
  ).length;
  const closed = Array.from(clients).filter(
    client => client.readyState === WebSocket.CLOSED
  ).length;

  wsConnectionGauge.labels('connected').set(connected);
  wsConnectionGauge.labels('connecting').set(connecting);
  wsConnectionGauge.labels('closing').set(closing);
  wsConnectionGauge.labels('closed').set(closed);
}

export function updateSystemMetrics(): void {
  try {
    const loadAvg = loadavg();
    systemLoadGauge.labels('1m').set(loadAvg[0]);
    systemLoadGauge.labels('5m').set(loadAvg[1]);
    systemLoadGauge.labels('15m').set(loadAvg[2]);
  } catch {
    // ignore errors (e.g., loadavg not available)
  }
  try {
    const memoryUsage = process.memoryUsage();
    memoryUsageGauge.labels('heapTotal').set(memoryUsage.heapTotal);
    memoryUsageGauge.labels('heapUsed').set(memoryUsage.heapUsed);
    memoryUsageGauge.labels('rss').set(memoryUsage.rss);
    memoryUsageGauge.labels('external').set(memoryUsage.external);
  } catch {
    // ignore errors (e.g., restricted environment)
  }
}

// Start periodic system metrics collection
let systemMetricsInterval: NodeJS.Timeout | undefined;
if (typeof global !== 'undefined' && (process.env.NODE_ENV !== 'test')) {
  systemMetricsInterval = setInterval(updateSystemMetrics, 10000); // Every 10 seconds
}

// Helper for test cleanup
export function clearSystemMetricsInterval() {
  if (systemMetricsInterval) {
    clearInterval(systemMetricsInterval);
    systemMetricsInterval = undefined;
  }
}

// Export metrics in Prometheus format
export async function getMetrics(): Promise<string> {
  return registry.metrics();
}