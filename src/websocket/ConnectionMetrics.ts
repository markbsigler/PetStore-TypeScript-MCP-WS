export interface ConnectionStats {
  totalConnections: number;
  activeConnections: number;
  totalMessages: number;
  totalBytes: number;
  totalErrors: number;
  avgMessageSize: number;
  messagesPerSecond: number;
  bytesPerSecond: number;
  uptimeSeconds: number;
}

export class ConnectionMetrics {
  private startTime: number;
  private totalConnections: number = 0;
  private activeConnections: number = 0;
  private totalMessages: number = 0;
  private totalBytes: number = 0;
  private totalErrors: number = 0;
  private messageHistory: { timestamp: number; size: number }[] = [];
  private readonly historyWindow: number = 60000; // 1 minute

  constructor() {
    this.startTime = Date.now();
  }

  public onConnection(): void {
    this.totalConnections++;
    this.activeConnections++;
  }

  public onDisconnection(): void {
    this.activeConnections = Math.max(0, this.activeConnections - 1);
  }

  public onMessage(size: number): void {
    this.totalMessages++;
    this.totalBytes += size;
    this.messageHistory.push({
      timestamp: Date.now(),
      size,
    });

    // Clean up old messages from history
    const cutoff = Date.now() - this.historyWindow;
    this.messageHistory = this.messageHistory.filter(
      msg => msg.timestamp > cutoff
    );
  }

  public onError(): void {
    this.totalErrors++;
  }

  public getStats(): ConnectionStats {
    const now = Date.now();
    const uptimeSeconds = (now - this.startTime) / 1000;

    // Calculate messages per second over the last minute
    const recentMessages = this.messageHistory.length;
    const messagesPerSecond = recentMessages / Math.min(uptimeSeconds, 60);

    // Calculate bytes per second over the last minute
    const recentBytes = this.messageHistory.reduce(
      (sum, msg) => sum + msg.size,
      0
    );
    const bytesPerSecond = recentBytes / Math.min(uptimeSeconds, 60);

    return {
      totalConnections: this.totalConnections,
      activeConnections: this.activeConnections,
      totalMessages: this.totalMessages,
      totalBytes: this.totalBytes,
      totalErrors: this.totalErrors,
      avgMessageSize: this.totalMessages > 0
        ? this.totalBytes / this.totalMessages
        : 0,
      messagesPerSecond,
      bytesPerSecond,
      uptimeSeconds,
    };
  }

  public reset(): void {
    this.startTime = Date.now();
    this.totalConnections = 0;
    this.activeConnections = 0;
    this.totalMessages = 0;
    this.totalBytes = 0;
    this.totalErrors = 0;
    this.messageHistory = [];
  }
} 