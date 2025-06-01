import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().default('3000'),
  HOST: z.string().default('0.0.0.0'),
  JWT_SECRET: z.string().default('your-secret-key'),
  CORS_ORIGIN: z.string().default('*'),
  RATE_LIMIT_MAX: z.string().default('100'),
  RATE_LIMIT_WINDOW: z.string().default('15'),
  LOG_LEVEL: z.string().default('info'),
  LOG_REDACTION_PATHS: z.string().default('password,token'),
  LOG_REDACTION_REMOVE: z.boolean().default(true),
  WEBSOCKET_PATH: z.string().default('/ws'),
  WEBSOCKET_PING_TIMEOUT: z.number().default(5000),
  WEBSOCKET_PING_INTERVAL: z.number().default(25000),
  WEBSOCKET_TRANSPORTS: z.string().default('websocket,polling'),
});

const env = envSchema.parse(process.env);

export interface Config {
  isDevelopment: boolean;
  env: string;
  server: {
    port: number;
    host: string;
  };
  cors: {
    origin: string[];
    methods: string[];
  };
  jwt: {
    secret: string;
  };
  rateLimit: {
    max: number;
    window: number;
  };
  logger: {
    level: string;
    redaction: {
      paths: string[];
      remove: boolean;
    };
  };
  websocket: {
    path: string;
    pingTimeout: number;
    pingInterval: number;
    transports: string[];
    cors: {
      origin: string[];
      methods: string[];
    };
  };
}

const config = {
  isDevelopment: env.NODE_ENV === 'development',
  env: env.NODE_ENV,
  server: {
    port: parseInt(env.PORT, 10),
    host: env.HOST,
  },
  cors: {
    origin: env.CORS_ORIGIN.split(','),
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  },
  jwt: {
    secret: env.JWT_SECRET,
  },
  rateLimit: {
    max: parseInt(env.RATE_LIMIT_MAX, 10),
    timeWindow: `${env.RATE_LIMIT_WINDOW} minutes`,
  },
  logger: {
    level: env.LOG_LEVEL,
    redaction: {
      paths: env.LOG_REDACTION_PATHS.split(','),
      remove: env.LOG_REDACTION_REMOVE,
    },
  },
  websocket: {
    path: env.WEBSOCKET_PATH,
    pingTimeout: env.WEBSOCKET_PING_TIMEOUT,
    pingInterval: env.WEBSOCKET_PING_INTERVAL,
    transports: env.WEBSOCKET_TRANSPORTS.split(','),
    cors: {
      origin: env.CORS_ORIGIN.split(','),
      methods: ['GET', 'POST'],
    },
  },
};

export { config };
export default config;
