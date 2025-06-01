import { Counter, Gauge } from 'prom-client';
import { EventEmitter } from 'events';

export enum DistributionStrategy {
  ROUND_ROBIN = 'ROUND_ROBIN',
  LEAST_CONNECTIONS = 'LEAST_CONNECTIONS',
  WEIGHTED = 'WEIGHTED',
}

export interface Node {
  id: string;
  url: string;
  weight?: number;
  active: boolean;
  connections: number;
  lastHealthCheck: number;
  failureCount: number;
}

interface LoadBalancerConfig {
  strategy: DistributionStrategy;
  healthCheckInterval: number;
  maxFailures: number;
  recoveryInterval: number;
}

export class LoadBalancer extends EventEmitter {
  private nodes: Map<string, Node> = new Map();
  private currentIndex: number = 0;
  private healthCheckTimer: NodeJS.Timeout | null = null;
  private recoveryTimer: NodeJS.Timeout | null = null;

  // Prometheus metrics
  private readonly nodeGauge: Gauge;
  private readonly connectionGauge: Gauge;
  private readonly healthCheckCounter: Counter;

  constructor(private config: LoadBalancerConfig) {
    super();
    this.nodeGauge = new Gauge({
      name: 'load_balancer_nodes',
      help: 'Number of nodes in the load balancer',
      labelNames: ['status'],
    });
    this.connectionGauge = new Gauge({
      name: 'load_balancer_connections',
      help: 'Number of active connections per node',
      labelNames: ['node_id'],
    });
    this.healthCheckCounter = new Counter({
      name: 'load_balancer_health_checks_total',
      help: 'Total number of health checks performed',
      labelNames: ['node_id', 'status'],
    });
    this.startHealthChecks();
    this.startRecoveryChecks();
  }

  public addNode(node: Omit<Node, 'connections' | 'lastHealthCheck' | 'failureCount'>): void {
    const fullNode: Node = {
      ...node,
      connections: 0,
      lastHealthCheck: Date.now(),
      failureCount: 0,
    };
    this.nodes.set(node.id, fullNode);
    this.updateNodeMetrics();
  }

  public removeNode(nodeId: string): void {
    this.nodes.delete(nodeId);
    this.updateNodeMetrics();
  }

  public getNextNode(): Node | null {
    const activeNodes = Array.from(this.nodes.values()).filter(node => node.active);
    if (activeNodes.length === 0) return null;

    switch (this.config.strategy) {
      case DistributionStrategy.ROUND_ROBIN:
        return this.getRoundRobinNode(activeNodes);
      case DistributionStrategy.LEAST_CONNECTIONS:
        return this.getLeastConnectionsNode(activeNodes);
      case DistributionStrategy.WEIGHTED:
        return this.getWeightedNode(activeNodes);
      default:
        return this.getRoundRobinNode(activeNodes);
    }
  }

  public incrementConnections(nodeId: string): void {
    const node = this.nodes.get(nodeId);
    if (node) {
      node.connections++;
      this.connectionGauge.labels(nodeId).set(node.connections);
    }
  }

  public decrementConnections(nodeId: string): void {
    const node = this.nodes.get(nodeId);
    if (node) {
      node.connections = Math.max(0, node.connections - 1);
      this.connectionGauge.labels(nodeId).set(node.connections);
    }
  }

  public markNodeUnhealthy(nodeId: string): void {
    const node = this.nodes.get(nodeId);
    if (node) {
      node.failureCount++;
      if (node.failureCount >= this.config.maxFailures) {
        node.active = false;
        this.emit('node_down', node);
        this.updateNodeMetrics();
      }
    }
  }

  public getStats(): { nodes: Node[]; totalConnections: number } {
    const nodes = Array.from(this.nodes.values());
    const totalConnections = nodes.reduce((sum, node) => sum + node.connections, 0);
    return { nodes, totalConnections };
  }

  private getRoundRobinNode(activeNodes: Node[]): Node {
    this.currentIndex = (this.currentIndex + 1) % activeNodes.length;
    return activeNodes[this.currentIndex];
  }

  private getLeastConnectionsNode(activeNodes: Node[]): Node {
    return activeNodes.reduce((min, node) =>
      node.connections < min.connections ? node : min
    );
  }

  private getWeightedNode(activeNodes: Node[]): Node {
    const totalWeight = activeNodes.reduce((sum, node) => sum + (node.weight || 1), 0);
    let random = Math.random() * totalWeight;
    
    for (const node of activeNodes) {
      random -= (node.weight || 1);
      if (random <= 0) return node;
    }
    
    return activeNodes[0];
  }

  private async checkNodeHealth(node: Node): Promise<boolean> {
    try {
      const response = await fetch(`${node.url}/health`);
      const isHealthy = response.ok;
      this.healthCheckCounter
        .labels(node.id, isHealthy ? 'success' : 'failure')
        .inc();
      return isHealthy;
    } catch (error) {
      this.healthCheckCounter.labels(node.id, 'failure').inc();
      return false;
    }
  }

  private startHealthChecks(): void {
    this.healthCheckTimer = setInterval(async () => {
      for (const node of this.nodes.values()) {
        const wasActive = node.active;
        const isHealthy = await this.checkNodeHealth(node);
        
        node.lastHealthCheck = Date.now();
        
        if (!isHealthy) {
          node.failureCount++;
          if (node.failureCount >= this.config.maxFailures && wasActive) {
            node.active = false;
            this.emit('node_down', node);
            this.updateNodeMetrics();
          }
        } else {
          node.failureCount = 0;
          if (!wasActive) {
            node.active = true;
            this.emit('node_up', node);
            this.updateNodeMetrics();
          }
        }
      }
    }, this.config.healthCheckInterval);
  }

  private startRecoveryChecks(): void {
    this.recoveryTimer = setInterval(async () => {
      const inactiveNodes = Array.from(this.nodes.values()).filter(node => !node.active);
      
      for (const node of inactiveNodes) {
        const isHealthy = await this.checkNodeHealth(node);
        if (isHealthy) {
          node.failureCount = 0;
          node.active = true;
          this.emit('node_recovered', node);
          this.updateNodeMetrics();
        }
      }
    }, this.config.recoveryInterval);
  }

  private updateNodeMetrics(): void {
    const activeNodes = Array.from(this.nodes.values()).filter(node => node.active);
    const inactiveNodes = Array.from(this.nodes.values()).filter(node => !node.active);
    
    this.nodeGauge.labels('active').set(activeNodes.length);
    this.nodeGauge.labels('inactive').set(inactiveNodes.length);
  }

  public stop(): void {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
    }
    if (this.recoveryTimer) {
      clearInterval(this.recoveryTimer);
    }
  }
} 