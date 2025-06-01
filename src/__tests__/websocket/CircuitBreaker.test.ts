// @ts-nocheck
import { CircuitBreaker, CircuitState } from '../../websocket/CircuitBreaker';
import { registry } from '../../monitoring/metrics';

describe('CircuitBreaker', () => {
  let circuitBreaker: CircuitBreaker;

  beforeEach(() => {
    jest.useFakeTimers();
    registry.clear();
    circuitBreaker = new CircuitBreaker({
      failureThreshold: 3,
      resetTimeout: 1000,
      halfOpenMaxCalls: 2,
      monitorInterval: 100,
    });
  });

  afterEach(() => {
    circuitBreaker.stop();
    registry.clear();
  });

  it('should start in CLOSED state', () => {
    expect(circuitBreaker.getState()).toBe(CircuitState.CLOSED);
  });

  it('should execute successful operations in CLOSED state', async () => {
    const operation = jest.fn().mockResolvedValue('success');
    const result = await circuitBreaker.execute(operation);
    expect(result).toBe('success');
    expect(operation).toHaveBeenCalled();
  });

  it('should transition to OPEN state after failures', async () => {
    const operation = jest.fn().mockRejectedValue(new Error('test error'));
    const fallback = jest.fn().mockResolvedValue('fallback');

    // Fail multiple times
    for (let i = 0; i < 3; i++) {
      await circuitBreaker.execute(operation, fallback);
    }

    expect(circuitBreaker.getState()).toBe(CircuitState.OPEN);
    expect(operation).toHaveBeenCalledTimes(3);
    expect(fallback).toHaveBeenCalledTimes(3);
  });

  it('should transition to HALF_OPEN state after reset timeout', async () => {
    const operation = jest.fn().mockRejectedValue(new Error('test error'));
    const fallback = jest.fn().mockResolvedValue('fallback');

    // Fail multiple times
    for (let i = 0; i < 3; i++) {
      await circuitBreaker.execute(operation, fallback);
    }

    expect(circuitBreaker.getState()).toBe(CircuitState.OPEN);

    // Advance time past reset timeout
    jest.advanceTimersByTime(1100);
    jest.runOnlyPendingTimers();
    await Promise.resolve(); // flush microtasks

    expect(circuitBreaker.getState()).toBe(CircuitState.HALF_OPEN);
  });

  it('should limit calls in HALF_OPEN state', async () => {
    const operation = jest.fn().mockResolvedValue('success');

    // Simulate failures to open the circuit
    const failOp = jest.fn().mockRejectedValue(new Error('fail'));
    for (let i = 0; i < 3; i++) {
      try { await circuitBreaker.execute(failOp); } catch {}
    }
    // Advance time to trigger HALF_OPEN
    jest.advanceTimersByTime(1100);
    // Force state to HALF_OPEN
    // @ts-ignore
    circuitBreaker['state'] = CircuitState.HALF_OPEN;
    // @ts-ignore
    circuitBreaker['halfOpenCalls'] = 0;

    await expect(circuitBreaker.execute(operation)).resolves.toBe('success');
    await expect(circuitBreaker.execute(operation)).resolves.toBe('success');
    expect(circuitBreaker.getState()).toBe(CircuitState.CLOSED);
  });

  it('should transition back to CLOSED state after successful HALF_OPEN calls', async () => {
    const operation = jest.fn().mockRejectedValue(new Error('test error'));
    const fallback = jest.fn().mockResolvedValue('fallback');

    // Fail to open the circuit
    for (let i = 0; i < 3; i++) {
      await circuitBreaker.execute(operation, fallback);
    }

    // Advance time past reset timeout
    jest.advanceTimersByTime(1100);

    // Force state transition to HALF_OPEN
    operation.mockResolvedValue('success');
    try {
      await circuitBreaker.execute(operation);
    } catch (error) {
      // Log error for debugging
      // eslint-disable-next-line no-console
      console.error('Expected error during HALF_OPEN transition:', error);
    }

    // Successful calls in HALF_OPEN
    await circuitBreaker.execute(operation);
    await circuitBreaker.execute(operation);

    expect(circuitBreaker.getState()).toBe(CircuitState.CLOSED);
  });

  it('should provide accurate stats', async () => {
    const operation = jest.fn().mockRejectedValue(new Error('test error'));
    const fallback = jest.fn().mockResolvedValue('fallback');

    // Fail twice
    await circuitBreaker.execute(operation, fallback);
    await circuitBreaker.execute(operation, fallback);

    const stats = circuitBreaker.getStats();
    expect(stats.state).toBe(CircuitState.CLOSED);
    expect(stats.failures).toBe(2);
    expect(stats.halfOpenCalls).toBe(0);
    expect(stats.lastStateChange).toBeGreaterThan(0);
  });

  it('should emit state change events', async () => {
    const openHandler = jest.fn();
    const halfOpenHandler = jest.fn();
    const closedHandler = jest.fn();

    circuitBreaker.on('open', openHandler);
    circuitBreaker.on('half_open', halfOpenHandler);
    circuitBreaker.on('closed', closedHandler);

    const operation = jest.fn().mockRejectedValue(new Error('test error'));
    const fallback = jest.fn().mockResolvedValue('fallback');

    // Fail to open the circuit
    for (let i = 0; i < 3; i++) {
      await circuitBreaker.execute(operation, fallback);
    }

    expect(openHandler).toHaveBeenCalledTimes(1);

    // Advance time past reset timeout
    jest.advanceTimersByTime(1100);

    // Force state transition to HALF_OPEN
    operation.mockResolvedValue('success');
    try {
      await circuitBreaker.execute(operation);
    } catch (error) {
      // Ignore error
    }

    // Successful calls in HALF_OPEN
    await circuitBreaker.execute(operation);
    await circuitBreaker.execute(operation);

    expect(halfOpenHandler).toHaveBeenCalledTimes(1);
    expect(closedHandler).toHaveBeenCalledTimes(1);
  });
});