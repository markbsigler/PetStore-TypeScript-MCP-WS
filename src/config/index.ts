import { z } from 'zod';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Environment variable schema
const envSchema = z.object({
  // Server
  PORT: z.string().default('3000'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  // JWT
  JWT_SECRET: z.string().min(32),
  JWT_EXPIRATION: z.string().default('1h'),

  // OAuth
  OAUTH_CLIENT_ID: z.string(),
  OAUTH_CLIENT_SECRET: z.string(),
  OAUTH_CALLBACK_URL: z.string().url(),

  // Rate Limiting
  RATE_LIMIT_WINDOW: z.string().default('15'),
  RATE_LIMIT_MAX: z.string().default('100'),

  // WebSocket
  WS_HEARTBEAT_INTERVAL: z.string().default('30000'),
  WS_PATH: z.string().default('/ws'),

  // Logging
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),

  // CORS
  CORS_ORIGIN: z.string().default('http://localhost:3000'),
  CORS_METHODS: z.string().default('GET,POST,PUT,DELETE,PATCH'),

  // API Documentation
  SWAGGER_PATH: z.string().default('/api-docs'),
});

// Parse and validate environment variables
const env = envSchema.parse(process.env);

// Configuration object
const config = {
  server: {
    port: parseInt(env.PORT, 10),
    nodeEnv: env.NODE_ENV,
  },
  jwt: {
    secret: env.JWT_SECRET,
    expiration: env.JWT_EXPIRATION,
  },
  oauth: {
    clientId: env.OAUTH_CLIENT_ID,
    clientSecret: env.OAUTH_CLIENT_SECRET,
    callbackUrl: env.OAUTH_CALLBACK_URL,
  },
  rateLimit: {
    window: parseInt(env.RATE_LIMIT_WINDOW, 10),
    max: parseInt(env.RATE_LIMIT_MAX, 10),
  },
  websocket: {
    heartbeatInterval: parseInt(env.WS_HEARTBEAT_INTERVAL, 10),
    path: env.WS_PATH,
  },
  logging: {
    level: env.LOG_LEVEL,
  },
  cors: {
    origin: env.CORS_ORIGIN,
    methods: env.CORS_METHODS.split(','),
  },
  swagger: {
    path: env.SWAGGER_PATH,
  },
  isDevelopment: env.NODE_ENV === 'development',
  isProduction: env.NODE_ENV === 'production',
  isTest: env.NODE_ENV === 'test',
} as const;

export default config; 