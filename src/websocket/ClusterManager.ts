import { EventEmitter } from 'events';
import { createClient } from 'redis';

export interface ClusterConfig {
  redisUrl?: string;
  nodeId?: string;
  channelPrefix?: string;
  heartbeatInterval?: number;
  nodeTimeout?: number;
}

interface NodeInfo {
  nodeId: string;
  connections: number;
  lastHeartbeat: number;
  metrics: {
    cpu: number;
    memory: number;
    load: number;
  };
}

export class ClusterManager extends EventEmitter {
  private publisher;
  private subscriber;
  private nodeId: string;
  private nodes: Map<string, NodeInfo> = new Map();
  private localConnections: Set<string> = new Set();
  private config: Required<ClusterConfig>;
  private heartbeatInterval: NodeJS.Timeout | null = null;

  constructor(config: ClusterConfig = {}) {
    super();
    this.config = {
      redisUrl: config.redisUrl || 'redis://localhost:6379',
      nodeId: config.nodeId || `node-${Math.random().toString(36).substr(2, 9)}`,
      channelPrefix: config.channelPrefix || 'ws-cluster',
      heartbeatInterval: config.heartbeatInterval || 5000,
      nodeTimeout: config.nodeTimeout || 15000,
    };
    this.nodeId = this.config.nodeId;
    this.publisher = createClient({ url: this.config.redisUrl });
    this.subscriber = this.publisher.duplicate();
  }

  public async start(): Promise<void> {
    await this.publisher.connect();
    await this.subscriber.connect();

    // Subscribe to cluster messages
    await this.subscriber.subscribe(
      `${this.config.channelPrefix}:broadcast`,
      this.handleBroadcastMessage.bind(this)
    );

    await this.subscriber.subscribe(
      `${this.config.channelPrefix}:heartbeat`,
      this.handleHeartbeat.bind(this)
    );

    // Start sending heartbeats
    this.heartbeatInterval = setInterval(
      this.sendHeartbeat.bind(this),
      this.config.heartbeatInterval
    );

    // Initial heartbeat
    await this.sendHeartbeat();
  }

  public async stop(): Promise<void> {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    // Notify other nodes that we're leaving
    await this.publisher.publish(
      `${this.config.channelPrefix}:heartbeat`,
      JSON.stringify({
        type: 'node_leave',
        nodeId: this.nodeId,
      })
    );

    await this.publisher.quit();
    await this.subscriber.quit();
  }

  public addConnection(clientId: string): void {
    this.localConnections.add(clientId);
    this.sendHeartbeat();
  }

  public removeConnection(clientId: string): void {
    this.localConnections.delete(clientId);
    this.sendHeartbeat();
  }

  public async broadcast(
    channel: string,
    message: unknown,
    excludeNodeId?: string
  ): Promise<void> {
    await this.publisher.publish(
      `${this.config.channelPrefix}:broadcast`,
      JSON.stringify({
        type: 'broadcast',
        nodeId: this.nodeId,
        excludeNodeId,
        channel,
        message,
      })
    );
  }

  private async sendHeartbeat(): Promise<void> {
    const metrics = await this.getNodeMetrics();
    const heartbeat = {
      type: 'heartbeat',
      nodeId: this.nodeId,
      timestamp: Date.now(),
      connections: this.localConnections.size,
      metrics,
    };

    await this.publisher.publish(
      `${this.config.channelPrefix}:heartbeat`,
      JSON.stringify(heartbeat)
    );
  }

  private handleHeartbeat(message: string): void {
    const data = JSON.parse(message);

    if (data.type === 'node_leave') {
      this.nodes.delete(data.nodeId);
      this.emit('node_leave', data.nodeId);
      return;
    }

    if (data.nodeId === this.nodeId) return;

    this.nodes.set(data.nodeId, {
      nodeId: data.nodeId,
      connections: data.connections,
      lastHeartbeat: Date.now(),
      metrics: data.metrics,
    });

    // Check for dead nodes
    const now = Date.now();
    for (const [nodeId, info] of this.nodes.entries()) {
      if (now - info.lastHeartbeat > this.config.nodeTimeout) {
        this.nodes.delete(nodeId);
        this.emit('node_timeout', nodeId);
      }
    }
  }

  private handleBroadcastMessage(message: string): void {
    const data = JSON.parse(message);
    if (data.nodeId === this.nodeId) return;
    if (data.excludeNodeId === this.nodeId) return;

    this.emit('broadcast', {
      channel: data.channel,
      message: data.message,
    });
  }

  private async getNodeMetrics(): Promise<{
    cpu: number;
    memory: number;
    load: number;
  }> {
    // This is a placeholder. In a real implementation,
    // you would get actual system metrics here.
    return {
      cpu: Math.random() * 100,
      memory: Math.random() * 100,
      load: this.localConnections.size,
    };
  }

  public getClusterStats(): {
    nodes: number;
    totalConnections: number;
    localConnections: number;
    nodeInfo: Map<string, NodeInfo>;
  } {
    let totalConnections = this.localConnections.size;
    for (const node of this.nodes.values()) {
      totalConnections += node.connections;
    }

    return {
      nodes: this.nodes.size + 1, // +1 for this node
      totalConnections,
      localConnections: this.localConnections.size,
      nodeInfo: new Map(this.nodes),
    };
  }

  public on(event: 'node_leave', listener: (...args: unknown[]) => void): this;
  public on(event: 'node_timeout', listener: (...args: unknown[]) => void): this;
  public on(event: 'broadcast', listener: (...args: unknown[]) => void): this;
  public on(event: string, listener: (...args: unknown[]) => void): this {
    return super.on(event, listener);
  }
}