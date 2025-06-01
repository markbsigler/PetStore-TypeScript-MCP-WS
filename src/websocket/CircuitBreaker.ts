import { EventEmitter } from 'events';
import { Counter, Histogram, Registry } from 'prom-client';

export enum CircuitState {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN',
  HALF_OPEN = 'HALF_OPEN',
}

interface CircuitBreakerConfig {
  failureThreshold: number;
  resetTimeout: number;
  halfOpenMaxCalls: number;
  monitorInterval: number;
}

interface CircuitStats {
  state: CircuitState;
  failures: number;
  halfOpenCalls: number;
  lastStateChange: number;
  metrics: {
    totalCalls: number;
    successfulCalls: number;
    failedCalls: number;
    latency: number[];
  };
}

export class CircuitBreaker extends EventEmitter {
  private state: CircuitState = CircuitState.CLOSED;
  private failures: number = 0;
  private halfOpenCalls: number = 0;
  private lastStateChange: number = Date.now();
  private resetTimer: NodeJS.Timeout | null = null;
  private monitorTimer: NodeJS.Timeout | null = null;
  private readonly metrics: {
    totalCalls: number;
    successfulCalls: number;
    failedCalls: number;
    latency: number[];
  } = {
    totalCalls: 0,
    successfulCalls: 0,
    failedCalls: 0,
    latency: [],
  };

  // Prometheus metrics with instance-specific registry
  private readonly registry: Registry;
  private readonly callCounter: Counter;
  private readonly latencyHistogram: Histogram;

  constructor(private readonly config: CircuitBreakerConfig) {
    super();
    this.registry = new Registry();
    
    this.callCounter = new Counter({
      name: 'circuit_breaker_calls_total',
      help: 'Total number of circuit breaker calls',
      labelNames: ['state', 'result'],
      registers: [this.registry],
    });

    this.latencyHistogram = new Histogram({
      name: 'circuit_breaker_latency_seconds',
      help: 'Latency of circuit breaker calls',
      buckets: [0.1, 0.5, 1, 2, 5],
      registers: [this.registry],
    });

    this.startMonitoring();
  }

  private startMonitoring() {
    this.monitorTimer = setInterval(() => {
      const stats = this.getStats();
      this.emit('stats', stats);
    }, this.config.monitorInterval).unref();
  }

  public async execute<T>(
    operation: () => Promise<T>,
    fallback?: () => Promise<T>
  ): Promise<T> {
    const startTime = Date.now();

    try {
      if (this.state === CircuitState.OPEN) {
        throw new Error('Circuit breaker is OPEN');
      }

      if (this.state === CircuitState.HALF_OPEN) {
        if (this.halfOpenCalls >= this.config.halfOpenMaxCalls) {
          throw new Error('Circuit breaker is HALF_OPEN and at capacity');
        }
        this.halfOpenCalls++;
      }

      const result = await operation();
      await this.onSuccess();
      this.recordMetrics('success', startTime);
      return result;
    } catch (error) {
      if (this.state === CircuitState.HALF_OPEN && this.halfOpenCalls > 0) {
        this.halfOpenCalls--;
      }
      await this.onFailure();
      this.recordMetrics('failure', startTime);

      if (fallback) {
        return fallback();
      }
      throw error;
    }
  }

  private async onSuccess() {
    if (this.state === CircuitState.HALF_OPEN) {
      this.setState(CircuitState.CLOSED);
      this.failures = 0;
      this.halfOpenCalls = 0;
    }
    this.metrics.successfulCalls++;
  }

  private async onFailure() {
    this.failures++;
    this.metrics.failedCalls++;

    if (
      (this.state === CircuitState.CLOSED && this.failures >= this.config.failureThreshold) ||
      this.state === CircuitState.HALF_OPEN
    ) {
      this.setState(CircuitState.OPEN);
      this.scheduleReset();
    }
  }

  private setState(newState: CircuitState) {
    const oldState = this.state;
    this.state = newState;
    this.lastStateChange = Date.now();
    this.emit(newState.toLowerCase(), { from: oldState, to: newState });
  }

  private scheduleReset() {
    if (this.resetTimer) {
      clearTimeout(this.resetTimer);
    }

    this.resetTimer = setTimeout(() => {
      if (this.state === CircuitState.OPEN) {
        this.setState(CircuitState.HALF_OPEN);
        this.halfOpenCalls = 0;
      }
    }, this.config.resetTimeout).unref();
  }

  private recordMetrics(result: 'success' | 'failure', startTime: number) {
    const duration = (Date.now() - startTime) / 1000;
    this.callCounter.inc({ state: this.state, result });
    this.latencyHistogram.observe(duration);
    this.metrics.totalCalls++;
    this.metrics.latency.push(duration);
  }

  public getState(): CircuitState {
    return this.state;
  }

  public getStats(): CircuitStats {
    return {
      state: this.state,
      failures: this.failures,
      halfOpenCalls: this.halfOpenCalls,
      lastStateChange: this.lastStateChange,
      metrics: { ...this.metrics },
    };
  }

  public stop() {
    if (this.resetTimer) {
      clearTimeout(this.resetTimer);
    }
    if (this.monitorTimer) {
      clearInterval(this.monitorTimer);
    }
    this.registry.clear();
  }
}