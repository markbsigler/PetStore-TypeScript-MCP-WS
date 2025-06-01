import { EventEmitter } from 'events';
import { performance } from 'perf_hooks';

export interface PerformanceConfig {
  sampleInterval?: number;
  historySize?: number;
  slowThreshold?: number;
  errorThreshold?: number;
}

interface MetricSample {
  timestamp: number;
  value: number;
}

interface LatencyHistogram {
  p50: number;
  p75: number;
  p90: number;
  p95: number;
  p99: number;
}

export class PerformanceMonitor extends EventEmitter {
  private config: Required<PerformanceConfig>;
  private messageLatencies: MetricSample[] = [];
  private errorRates: MetricSample[] = [];
  private throughput: MetricSample[] = [];
  private activeOperations = new Map<string, number>();
  private sampleInterval: NodeJS.Timeout | null = null;

  constructor(config: PerformanceConfig = {}) {
    super();
    this.config = {
      sampleInterval: config.sampleInterval || 1000, // 1 second
      historySize: config.historySize || 3600, // 1 hour of samples at 1s interval
      slowThreshold: config.slowThreshold || 1000, // 1 second
      errorThreshold: config.errorThreshold || 0.05, // 5% error rate
    };

    this.startSampling();
  }

  public startOperation(operationId: string): void {
    this.activeOperations.set(operationId, performance.now());
  }

  public endOperation(operationId: string, error?: Error): void {
    const startTime = this.activeOperations.get(operationId);
    if (startTime) {
      const duration = performance.now() - startTime;
      this.recordLatency(duration);
      this.activeOperations.delete(operationId);

      if (error) {
        this.recordError();
      }

      if (duration > this.config.slowThreshold) {
        this.emit('slow_operation', {
          operationId,
          duration,
          threshold: this.config.slowThreshold,
        });
      }
    }
  }

  private recordLatency(latency: number): void {
    this.messageLatencies.push({
      timestamp: Date.now(),
      value: latency,
    });
    this.trimMetrics(this.messageLatencies);
  }

  private recordError(): void {
    this.errorRates.push({
      timestamp: Date.now(),
      value: 1,
    });
    this.trimMetrics(this.errorRates);
  }

  private recordThroughput(messages: number): void {
    this.throughput.push({
      timestamp: Date.now(),
      value: messages,
    });
    this.trimMetrics(this.throughput);
  }

  private trimMetrics(metrics: MetricSample[]): void {
    const cutoff = Date.now() - this.config.historySize * 1000;
    const startIndex = metrics.findIndex(sample => sample.timestamp > cutoff);
    if (startIndex > 0) {
      metrics.splice(0, startIndex);
    }
  }

  private calculateHistogram(values: number[]): LatencyHistogram {
    if (values.length === 0) {
      return { p50: 0, p75: 0, p90: 0, p95: 0, p99: 0 };
    }

    const sorted = [...values].sort((a, b) => a - b);
    return {
      p50: this.percentile(sorted, 0.5),
      p75: this.percentile(sorted, 0.75),
      p90: this.percentile(sorted, 0.9),
      p95: this.percentile(sorted, 0.95),
      p99: this.percentile(sorted, 0.99),
    };
  }

  private percentile(sorted: number[], p: number): number {
    const index = Math.ceil(sorted.length * p) - 1;
    return sorted[index];
  }

  private startSampling(): void {
    this.sampleInterval = setInterval(() => {
      const now = Date.now();
      const windowStart = now - this.config.sampleInterval;

      // Calculate error rate
      const recentErrors = this.errorRates.filter(
        sample => sample.timestamp > windowStart
      );
      const errorRate = recentErrors.length / (this.config.sampleInterval / 1000);

      if (errorRate > this.config.errorThreshold) {
        this.emit('high_error_rate', {
          rate: errorRate,
          threshold: this.config.errorThreshold,
        });
      }

      // Calculate throughput
      const recentMessages = this.messageLatencies.filter(
        sample => sample.timestamp > windowStart
      );
      this.recordThroughput(recentMessages.length);

      // Calculate latency histogram
      const latencyHistogram = this.calculateHistogram(
        recentMessages.map(sample => sample.value)
      );

      this.emit('metrics', {
        timestamp: now,
        errorRate,
        throughput: recentMessages.length,
        latency: latencyHistogram,
      });
    }, this.config.sampleInterval);
  }

  public getStats(): {
    currentLatency: LatencyHistogram;
    errorRate: number;
    throughputPerSecond: number;
    activeOperations: number;
  } {
    const now = Date.now();
    const windowStart = now - this.config.sampleInterval;

    const recentLatencies = this.messageLatencies
      .filter(sample => sample.timestamp > windowStart)
      .map(sample => sample.value);

    const recentErrors = this.errorRates.filter(
      sample => sample.timestamp > windowStart
    );

    const recentThroughput = this.throughput
      .filter(sample => sample.timestamp > windowStart)
      .reduce((sum, sample) => sum + sample.value, 0);

    return {
      currentLatency: this.calculateHistogram(recentLatencies),
      errorRate: recentErrors.length / (this.config.sampleInterval / 1000),
      throughputPerSecond: recentThroughput / (this.config.sampleInterval / 1000),
      activeOperations: this.activeOperations.size,
    };
  }

  public stop(): void {
    if (this.sampleInterval) {
      clearInterval(this.sampleInterval);
      this.sampleInterval = null;
    }
  }

  public on(event: 'slow_operation', listener: (...args: unknown[]) => void): this;
  public on(event: 'high_error_rate', listener: (...args: unknown[]) => void): this;
  public on(event: 'metrics', listener: (...args: unknown[]) => void): this;
  public on(event: string, listener: (...args: unknown[]) => void): this {
    return super.on(event, listener);
  }
}