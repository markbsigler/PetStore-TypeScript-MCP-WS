import { WebSocket } from 'ws';

export interface HeartbeatConfig {
  pingInterval?: number;
  pongTimeout?: number;
  maxMissedHeartbeats?: number;
}

export class HeartbeatMonitor {
  private pingInterval: NodeJS.Timeout | null = null;
  private pongTimeouts: Map<WebSocket, NodeJS.Timeout> = new Map();
  private missedHeartbeats: Map<WebSocket, number> = new Map();
  private config: Required<HeartbeatConfig>;

  constructor(config: HeartbeatConfig = {}) {
    this.config = {
      pingInterval: config.pingInterval || 30000, // 30 seconds
      pongTimeout: config.pongTimeout || 10000,   // 10 seconds
      maxMissedHeartbeats: config.maxMissedHeartbeats || 3,
    };
  }

  public start(
    clients: Map<string, { socket: WebSocket }>,
    onTimeout: (socket: WebSocket) => void
  ): void {
    this.stop();

    this.pingInterval = setInterval(() => {
      clients.forEach(({ socket }) => {
        if (socket.readyState === WebSocket.OPEN) {
          // Send ping
          try {
            socket.ping();
            
            // Set pong timeout
            const pongTimeout = setTimeout(() => {
              const missed = (this.missedHeartbeats.get(socket) || 0) + 1;
              this.missedHeartbeats.set(socket, missed);

              if (missed >= this.config.maxMissedHeartbeats) {
                onTimeout(socket);
                this.cleanup(socket);
              }
            }, this.config.pongTimeout);

            // Store timeout reference
            this.pongTimeouts.set(socket, pongTimeout);

            // Setup pong handler
            socket.once('pong', () => {
              const timeout = this.pongTimeouts.get(socket);
              if (timeout) {
                clearTimeout(timeout);
                this.pongTimeouts.delete(socket);
                this.missedHeartbeats.delete(socket);
              }
            });
          } catch (error) {
            // Socket might be closed during ping
            this.cleanup(socket);
          }
        } else {
          this.cleanup(socket);
        }
      });
    }, this.config.pingInterval);
  }

  public stop(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }

    // Clear all timeouts
    this.pongTimeouts.forEach((timeout) => clearTimeout(timeout));
    this.pongTimeouts.clear();
    this.missedHeartbeats.clear();
  }

  public removeClient(socket: WebSocket): void {
    this.cleanup(socket);
  }

  private cleanup(socket: WebSocket): void {
    const timeout = this.pongTimeouts.get(socket);
    if (timeout) {
      clearTimeout(timeout);
      this.pongTimeouts.delete(socket);
    }
    this.missedHeartbeats.delete(socket);
  }

  public getStats(): {
    activePings: number;
    missedHeartbeats: Map<WebSocket, number>;
  } {
    return {
      activePings: this.pongTimeouts.size,
      missedHeartbeats: new Map(this.missedHeartbeats),
    };
  }
} 