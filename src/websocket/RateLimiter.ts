interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
}

interface ClientState {
  requests: number;
  windowStart: number;
}

export class RateLimiter {
  private clients: Map<string, ClientState>;
  private config: RateLimitConfig;

  constructor(config: Partial<RateLimitConfig> = {}) {
    this.clients = new Map();
    this.config = {
      windowMs: config.windowMs || 60000, // 1 minute
      maxRequests: config.maxRequests || 100,
    };
  }

  public isRateLimited(clientId: string): boolean {
    const now = Date.now();
    let state = this.clients.get(clientId);

    if (!state) {
      state = { requests: 0, windowStart: now };
      this.clients.set(clientId, state);
    }

    // Reset window if expired
    if (now - state.windowStart >= this.config.windowMs) {
      state.requests = 0;
      state.windowStart = now;
    }

    // Check if rate limited
    if (state.requests >= this.config.maxRequests) {
      return true;
    }

    // Increment request count
    state.requests++;
    return false;
  }

  public getRemainingRequests(clientId: string): number {
    const state = this.clients.get(clientId);
    if (!state) return this.config.maxRequests;

    const now = Date.now();
    if (now - state.windowStart >= this.config.windowMs) {
      return this.config.maxRequests;
    }

    return Math.max(0, this.config.maxRequests - state.requests);
  }

  public getResetTime(clientId: string): number {
    const state = this.clients.get(clientId);
    if (!state) return 0;

    const now = Date.now();
    const timeElapsed = now - state.windowStart;
    if (timeElapsed >= this.config.windowMs) {
      return 0;
    }

    return this.config.windowMs - timeElapsed;
  }

  public removeClient(clientId: string): void {
    this.clients.delete(clientId);
  }

  public clear(): void {
    this.clients.clear();
  }
} 