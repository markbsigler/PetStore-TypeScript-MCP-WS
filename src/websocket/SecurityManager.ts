import { WebSocket } from 'ws';
import { FastifyRequest } from 'fastify';
import { randomBytes } from 'crypto';

export interface SecurityConfig {
  maxConnectionsPerIp?: number;
  tokenExpirationSeconds?: number;
  allowedOrigins?: string[];
  maxTokensPerUser?: number;
}

interface TokenInfo {
  token: string;
  userId: string;
  expiresAt: number;
  roles: string[];
}

interface IpConnection {
  count: number;
  lastConnection: number;
}

export class SecurityManager {
  private readonly tokens: Map<string, TokenInfo> = new Map();
  private readonly ipConnections: Map<string, IpConnection> = new Map();
  private readonly userTokens: Map<string, Set<string>> = new Map();
  private readonly config: Required<SecurityConfig>;

  constructor(config: SecurityConfig = {}) {
    this.config = {
      maxConnectionsPerIp: config.maxConnectionsPerIp ?? 10,
      tokenExpirationSeconds: config.tokenExpirationSeconds ?? 86400, // 24 hours
      allowedOrigins: config.allowedOrigins ?? ['*'],
      maxTokensPerUser: config.maxTokensPerUser ?? 5,
    };
  }

  public generateToken(userId: string, roles: string[] = []): string {
    // Clean up expired tokens for this user
    this.cleanupUserTokens(userId);

    // Check if user has reached max tokens
    const userTokenSet = this.userTokens.get(userId) || new Set();
    if (userTokenSet.size >= this.config.maxTokensPerUser) {
      throw new Error('Maximum tokens per user reached');
    }

    // Generate new token
    const token = randomBytes(32).toString('hex');
    const expiresAt = Date.now() + (this.config.tokenExpirationSeconds * 1000);

    // Store token info
    this.tokens.set(token, { token, userId, expiresAt, roles });
    
    // Update user tokens
    userTokenSet.add(token);
    this.userTokens.set(userId, userTokenSet);

    return token;
  }

  public validateConnection(
    req: FastifyRequest,
    _socket: WebSocket,
    _head: Buffer
  ): { isValid: boolean; error?: string } {
    // Check origin
    const origin = req.headers.origin;
    if (origin && !this.isOriginAllowed(origin)) {
      return { isValid: false, error: 'Origin not allowed' };
    }

    // Check IP rate limiting
    const ip = req.ip;
    const ipConn = this.ipConnections.get(ip) || { count: 0, lastConnection: 0 };
    
    if (ipConn.count >= this.config.maxConnectionsPerIp) {
      const timeSinceLastConn = Date.now() - ipConn.lastConnection;
      if (timeSinceLastConn < 60000) { // 1 minute cooldown
        return { isValid: false, error: 'Too many connections from this IP' };
      }
      ipConn.count = 0;
    }

    // Update IP connection tracking
    ipConn.count++;
    ipConn.lastConnection = Date.now();
    this.ipConnections.set(ip, ipConn);

    // Validate token
    const token = this.extractToken(req);
    if (!token) {
      return { isValid: false, error: 'Missing authentication token' };
    }

    const tokenInfo = this.tokens.get(token);
    if (!tokenInfo || tokenInfo.expiresAt < Date.now()) {
      return { isValid: false, error: 'Invalid or expired token' };
    }

    return { isValid: true };
  }

  public authorizeAction(token: string, requiredRoles: string[]): boolean {
    const tokenInfo = this.tokens.get(token);
    if (!tokenInfo || tokenInfo.expiresAt < Date.now()) {
      return false;
    }

    if (requiredRoles.length === 0) {
      return true;
    }

    return requiredRoles.some(role => tokenInfo.roles.includes(role));
  }

  private isOriginAllowed(origin: string): boolean {
    if (this.config.allowedOrigins.includes('*')) {
      return true;
    }
    return this.config.allowedOrigins.includes(origin);
  }

  private extractToken(req: FastifyRequest): string | null {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return null;
    }
    return authHeader.substring(7);
  }

  private cleanupUserTokens(userId: string): void {
    const userTokenSet = this.userTokens.get(userId);
    if (!userTokenSet) return;

    for (const token of userTokenSet) {
      const tokenInfo = this.tokens.get(token);
      if (!tokenInfo || tokenInfo.expiresAt < Date.now()) {
        userTokenSet.delete(token);
        this.tokens.delete(token);
      }
    }

    if (userTokenSet.size === 0) {
      this.userTokens.delete(userId);
    }
  }

  public cleanupExpiredTokens(): void {
    const now = Date.now();
    for (const [token, info] of this.tokens.entries()) {
      if (info.expiresAt < now) {
        this.tokens.delete(token);
        const userTokens = this.userTokens.get(info.userId);
        if (userTokens) {
          userTokens.delete(token);
          if (userTokens.size === 0) {
            this.userTokens.delete(info.userId);
          }
        }
      }
    }
  }

  public revokeToken(token: string): void {
    const tokenInfo = this.tokens.get(token);
    if (tokenInfo) {
      this.tokens.delete(token);
      const userTokens = this.userTokens.get(tokenInfo.userId);
      if (userTokens) {
        userTokens.delete(token);
        if (userTokens.size === 0) {
          this.userTokens.delete(tokenInfo.userId);
        }
      }
    }
  }

  public revokeUserTokens(userId: string): void {
    const userTokens = this.userTokens.get(userId);
    if (userTokens) {
      for (const token of userTokens) {
        this.tokens.delete(token);
      }
      this.userTokens.delete(userId);
    }
  }

  public getStats(): {
    activeTokens: number;
    activeUsers: number;
    ipConnections: number;
  } {
    return {
      activeTokens: this.tokens.size,
      activeUsers: this.userTokens.size,
      ipConnections: this.ipConnections.size,
    };
  }
} 